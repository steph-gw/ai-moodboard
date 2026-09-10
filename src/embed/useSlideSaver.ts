import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, CanvasElement } from '../types';
import type { BoardRepo, SlideVersions } from './boardRepo';

/**
 * How long the board must sit still before an idle save. Deliberately long: saving on every
 * gesture turns a normal editing session into hundreds of Bubble writes, and the cost there
 * is the number of save cycles, not what each one does. Real work is captured by the
 * boundary flushes instead — switching slide or section, hiding the tab, closing, ⌘S.
 */
const IDLE_MS = 25_000;

export type SaveState = 'idle' | 'saving' | 'error' | 'conflict';

interface Options {
  repo: BoardRepo | null;
  /** Always the current board — read at save time, not at schedule time. */
  boardRef: { current: Board };
  /**
   * A ref, not the map itself: a reload swaps in a fresh version map, and a saver holding
   * the original would keep comparing against versions that are no longer current — every
   * subsequent write would look like a conflict, forever.
   */
  versionsRef: { current: SlideVersions };
  onError: (message: string) => void;
  /** Called when someone else changed a slide we were about to write. */
  onConflict: (slideId: string) => void;
}

export interface SlideSaver {
  /** Call after every board mutation. Works out which slides actually changed. */
  noteChange: () => void;
  /** Resets the saved-state baseline after a load, so a fresh board isn't seen as all-dirty. */
  adopt: (board: Board) => void;
  /** Writes anything outstanding now. Awaitable, for teardown. */
  flush: () => Promise<void>;
  /** True when there are edits the server hasn't got yet. */
  isDirty: boolean;
  state: SaveState;
  lastSavedAt: number | null;
}

/**
 * Persists slide canvases, one `Elements JSON` write per changed slide.
 *
 * Which slides changed is worked out by comparing element-array identity against the last
 * saved value. Every mutation in BoardContext is immutable, so an untouched slide keeps its
 * exact array reference — which means no mutation has to remember to declare itself, and a
 * new one can't forget to.
 */
export function useSlideSaver({ repo, boardRef, versionsRef, onError, onConflict }: Options): SlideSaver {
  const [state, setState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  /** Element arrays as last written. Absent means "not seen yet", not "empty". */
  const savedRef = useRef(new Map<string, readonly CanvasElement[]>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  /** Set while a conflict reload is pending, so we don't retry against a version we know is stale. */
  const awaitingReloadRef = useRef(false);

  /** Seeds the baseline after a load, so a fresh board isn't seen as entirely dirty. */
  const adopt = useCallback((board: Board) => {
    awaitingReloadRef.current = false;
    setIsDirty(false);
    const map = new Map<string, readonly CanvasElement[]>();
    for (const section of board.sections) {
      for (const slide of section.slides) map.set(slide.id, slide.elements);
    }
    savedRef.current = map;
  }, []);

  const collectDirty = useCallback((): { id: string; elements: readonly CanvasElement[] }[] => {
    const dirty: { id: string; elements: readonly CanvasElement[] }[] = [];
    for (const section of boardRef.current.sections) {
      for (const slide of section.slides) {
        if (savedRef.current.get(slide.id) !== slide.elements) {
          dirty.push({ id: slide.id, elements: slide.elements });
        }
      }
    }
    return dirty;
  }, [boardRef]);

  const writeNow = useCallback(async () => {
    if (!repo || awaitingReloadRef.current) return;
    // One save at a time: overlapping writes to the same slide would race, and the second
    // would be checking a version the first has already superseded.
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const dirty = collectDirty();
    if (!dirty.length) return;

    const run = (async () => {
      setState('saving');
      try {
        const ids = dirty.map((d) => d.id);
        // One query for every dirty slide's version, rather than one per slide.
        const current = await repo.versionsOf(ids);
        const stale = ids.find((id) => {
          const known = versionsRef.current.get(id);
          return known !== undefined && current.get(id) !== known;
        });
        if (stale) {
          // Stop scheduling until adopt() confirms the reload landed, or every queued
          // change re-reports the same conflict against the same stale version.
          awaitingReloadRef.current = true;
          setState('conflict');
          onConflict(stale);
          return;
        }

        for (const { id, elements } of dirty) {
          await repo.saveSlide(id, elements as CanvasElement[]);
          savedRef.current.set(id, elements);
        }

        // Refresh all the versions we just invalidated, again in one query.
        for (const [id, modified] of await repo.versionsOf(ids)) versionsRef.current.set(id, modified);
        setState('idle');
        setIsDirty(false);
        setLastSavedAt(Date.now());
      } catch (err) {
        setState('error');
        onError(err instanceof Error ? err.message : 'Could not save the board.');
      }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [repo, collectDirty, versionsRef, onError, onConflict]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await writeNow();
  }, [writeNow]);

  const noteChange = useCallback(() => {
    if (!repo || awaitingReloadRef.current) return;
    // Ask rather than assume. Mutations that touch only comments, votes or selection leave
    // every element array identical, and a chip reading "Unsaved changes" when nothing is
    // unsaved teaches people to ignore the one time it matters.
    if (!collectDirty().length) return;
    // Each change pushes the idle save further out. Anything the user would notice losing is
    // captured by a boundary flush long before this fires.
    setIsDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void writeNow();
    }, IDLE_MS);
  }, [repo, collectDirty, writeNow]);

  // Leaving the page or hiding the tab has to take unsaved work with it. beforeunload can't
  // await, so that one is best-effort.
  //
  // The listeners are registered once and reach flush through a ref. Depending on `flush`
  // directly would re-run this effect whenever its identity changed, and the cleanup would
  // fire a save on every render — which is exactly the write storm the idle timer exists to
  // prevent.
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushRef.current();
    };
    const onUnload = () => void flushRef.current();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      void flushRef.current();
    };
  }, []);

  return { noteChange, adopt, flush, state, lastSavedAt, isDirty };
}
