import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, CanvasElement } from '../types';
import type { BoardRepo, SlideVersions } from './boardRepo';

const DEBOUNCE_MS = 900;
/** Continuous editing would otherwise defer the save indefinitely. */
const MAX_WAIT_MS = 4000;

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

  /** Element arrays as last written. Absent means "not seen yet", not "empty". */
  const savedRef = useRef(new Map<string, readonly CanvasElement[]>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstDirtyAtRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  /** Set while a conflict reload is pending, so we don't retry against a version we know is stale. */
  const awaitingReloadRef = useRef(false);

  /** Seeds the baseline after a load, so a fresh board isn't seen as entirely dirty. */
  const adopt = useCallback((board: Board) => {
    awaitingReloadRef.current = false;
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
        for (const { id, elements } of dirty) {
          if (await repo.hasMovedOn(id, versionsRef.current.get(id))) {
            // Stop scheduling until adopt() confirms the reload landed, or every queued
            // change re-reports the same conflict against the same stale version.
            awaitingReloadRef.current = true;
            setState('conflict');
            onConflict(id);
            return;
          }
          const modified = await repo.saveSlide(id, elements as CanvasElement[]);
          versionsRef.current.set(id, modified);
          savedRef.current.set(id, elements);
        }
        setState('idle');
        setLastSavedAt(Date.now());
      } catch (err) {
        setState('error');
        onError(err instanceof Error ? err.message : 'Could not save the board.');
      } finally {
        firstDirtyAtRef.current = null;
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
    const now = Date.now();
    if (firstDirtyAtRef.current === null) firstDirtyAtRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);
    // Cap the deferral, or a long uninterrupted drag never reaches a quiet moment to save in.
    const wait = Math.min(DEBOUNCE_MS, Math.max(0, firstDirtyAtRef.current + MAX_WAIT_MS - now));
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void writeNow();
    }, wait);
  }, [repo, writeNow]);

  // Leaving the page or hiding the tab has to take unsaved work with it. beforeunload can't
  // await, so this is best-effort — the debounce is short enough that it rarely matters.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onUnload = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      void flush();
    };
  }, [flush]);

  return { noteChange, adopt, flush, state, lastSavedAt };
}
