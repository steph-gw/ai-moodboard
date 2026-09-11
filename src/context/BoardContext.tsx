import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  Board,
  BoardImage,
  CanvasElement,
  Comment,
  CommentPin,
  ImageVote,
  Section,
  SectionStatus,
  Slide,
  UserRole,
  ShapeKind,
} from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { mockBoard, AI_VISION_BRIEF } from '../data/mockData';
import { defaultImageElement, defaultShapeElement, defaultTextElement } from '../data/slideHelpers';
import {
  findPinInBoard,
  removePinComment,
  updatePinComments,
  markResolved,
  withLivePins,
} from '../utils/commentHelpers';
import { inferSectionIcon } from '../utils/sectionIcons';
import { loadFontsFor } from '../utils/loadFont';
import { useHost } from '../embed/HostProvider';
import { useSlideSaver } from '../embed/useSlideSaver';
import { useExportPdf } from '../embed/useExportPdf';
import type { SlideVersions } from '../embed/boardRepo';

const HISTORY_LIMIT = 60;
/** Offset a pasted element so it does not land exactly on top of the original. */
const PASTE_OFFSET = 16;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    document.activeElement?.getAttribute('contenteditable') === 'true'
  );
}

interface BoardContextValue {
  board: Board;
  role: UserRole;
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  activeSlideId: string;
  setActiveSlideId: (id: string) => void;
  activeSlide: Slide | null;
  /** The element being edited: the last one picked, or null unless exactly one is selected. */
  selectedElementId: string | null;
  selectedElementIds: readonly string[];
  deleteSelection: () => void;
  moveSelectionBy: (slideId: string, dx: number, dy: number) => void;
  selectedCommentPinId: string | null;
  selectedCommentPin: CommentPin | null;
  selectElement: (elementId: string | null, additive?: boolean) => void;
  selectElements: (ids: readonly string[]) => void;
  collapseSelectionTo: (elementId: string) => void;
  isSlideSelected: boolean;
  selectSlide: () => void;
  selectCommentPin: (pinId: string | null) => void;
  isPlacingComment: boolean;
  setPlacingComment: (value: boolean) => void;
  placeCommentPin: (x: number, y: number) => void;
  /** Drags a pin to a new spot on its slide. Board coordinates, not screen. */
  moveCommentPin: (pinId: string, x: number, y: number) => void;
  /** Brings a thread on another slide into view and selects its pin. */
  goToPin: (sectionId: string, slideId: string, pinId: string) => void;
  /** The section whose editor should be open, and the way to ask for it. */
  editingSectionId: string | null;
  requestEditSection: (sectionId: string | null) => void;
  voteImage: (imageId: string, vote: ImageVote) => void;
  visionBrief: string;
  updateVisionBrief: (text: string) => void;
  setPalette: (colors: string[]) => void;
  summarizeVision: () => void;
  isSummarizing: boolean;
  isCommentsOpen: boolean;
  setCommentsOpen: (open: boolean) => void;
  isPresenting: boolean;
  setPresenting: (value: boolean) => void;
  goToNextSlide: () => void;
  goToPrevSlide: () => void;
  /** Resolution is a property of the thread; every comment in it flips together. */
  resolveComment: (pinId: string) => void;
  addComment: (pinId: string, text: string) => void;
  editComment: (pinId: string, commentId: string, text: string) => void;
  reopenComment: (pinId: string) => void;
  deleteComment: (pinId: string, commentId: string) => void;
  currentUserId: string;
  undo: () => void;
  isLoading: boolean;
  exportPdf: () => Promise<void>;
  isExporting: boolean;
  exportTarget: HTMLElement | null;
  isDirty: boolean;
  saveNow: () => Promise<void>;
  saveState: import('../embed/useSlideSaver').SaveState;
  lockedSlideIds: ReadonlySet<string>;
  /** False for a client, or when the planner has locked this slide. */
  canEdit: boolean;
  toggleSlideLock: (slideId: string) => void;
  /** False for a client. Structure — sections, slides, status, vision brief. */
  canManage: boolean;
  beginInteraction: () => void;
  endInteraction: () => void;
  canUndo: boolean;
  pinSuggestion: (suggestionId: string) => void;
  refreshSuggestions: () => void;
  activeSectionName: string;
  updateElement: (slideId: string, elementId: string, patch: Partial<CanvasElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  bringToFront: (slideId: string, elementId: string) => void;
  sendToBack: (slideId: string, elementId: string) => void;
  addTextElement: (content?: string) => void;
  addShapeElement: (shape: ShapeKind) => void;
  setSlideBackground: (slideId: string, background: string | undefined) => void;
  addSection: (name: string, visionBrief: string, icon?: string) => void;
  updateSection: (
    sectionId: string,
    patch: {
      name?: string;
      icon?: string;
      visionBrief?: string;
      status?: SectionStatus;
      approvedDate?: string;
    }
  ) => void;
  deleteSection: (sectionId: string) => void;
  addSlide: () => void;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  showSuggestionsPanel: boolean;
  setShowSuggestionsPanel: (show: boolean) => void;
  getImageById: (imageId: string) => BoardImage | undefined;
  addUploadedImage: (url: string, tags?: string[], id?: string) => void;
  /** Uploads a file to the host's storage and places it on the active slide. */
  uploadAndAddImage: (file: File, tags?: string[]) => Promise<void>;
  isUploading: boolean;
}

const BoardContext = createContext<BoardContextValue | null>(null);

function getActiveSectionSlides(board: Board, sectionId: string): Slide[] {
  return board.sections.find((s) => s.id === sectionId)?.slides ?? [];
}

function updateSlidePins(
  board: Board,
  slideId: string,
  updater: (pins: CommentPin[]) => CommentPin[]
): Board {
  return {
    ...board,
    sections: board.sections.map((section) => ({
      ...section,
      slides: section.slides.map((slide) => {
        if (slide.id !== slideId) return slide;
        return { ...slide, commentPins: updater(slide.commentPins) };
      }),
    })),
  };
}

const EMPTY_BOARD: Board = {
  weddingName: '',
  weddingDate: '',
  visionBrief: '',
  palette: [],
  sections: [],
  images: [],
  suggestions: [],
  viewers: [],
};

export function BoardProvider({ children }: { children: ReactNode }) {
  const {
    role,
    readOnly,
    currentUserId,
    currentUserName,
    currentUserInitials,
    rootEl,
    repo,
    identity,
    onError,
    uploadFile,
    onStateChange,
    onLoaded,
  } = useHost();
  // With no moodboard to open, run on the seed board so the dev harness and a bare
  // element still show something rather than an empty shell.
  const [board, setBoard] = useState<Board>(repo ? EMPTY_BOARD : mockBoard);
  const [isLoading, setIsLoading] = useState(!!repo);
  const [past, setPast] = useState<Board[]>([]);
  const interactionRef = useRef(false);
  const gestureSnapshotRef = useRef(false);
  const [activeSectionId, setActiveSectionIdState] = useState(() => mockBoard.sections[0]?.id ?? '');
  const [activeSlideId, setActiveSlideId] = useState(() => mockBoard.sections[0]?.slides[0]?.id ?? '');
  /**
   * Everything selected, in the order it was picked.
   *
   * An array rather than a Set because order is what makes "the one being edited" well
   * defined — the last thing clicked is what the drag handles and the text cursor belong
   * to, even when five things are selected.
   */
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  // Read by beginInteraction, which is stable and must not re-create on every selection.
  const selectedIdsRef = useRef<readonly string[]>(selectedElementIds);
  selectedIdsRef.current = selectedElementIds;
  const [selectedCommentPinId, setSelectedCommentPinId] = useState<string | null>(null);
  /**
   * The slide itself is selected — clicked on, with nothing on it selected.
   *
   * Distinct from "nothing is selected", which is also the state on first load and after a
   * reload. Slide controls appear because someone asked for them, not because they
   * happened not to have clicked anything yet.
   */
  const [isSlideSelected, setSlideSelected] = useState(false);
  const [isPlacingComment, setPlacingComment] = useState(false);
  const [isCommentsOpen, setCommentsOpenState] = useState(false);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [isPresenting, setPresenting] = useState(false);

  // boardRef keeps the latest board readable outside a state updater so commit()
  // can snapshot it for undo without running side effects inside setBoard.
  const boardRef = useRef(board);
  boardRef.current = board;

  // What Cmd/Ctrl+X removed, kept so Cmd/Ctrl+V can put it back intact.
  const cutRef = useRef<{ element: CanvasElement; clipboardText: string } | null>(null);
  const lastCutAtRef = useRef(0);

  const versionsRef = useRef<SlideVersions>(new Map());
  /** This viewer's vote row per image, so changing a vote patches rather than duplicates. */
  const voteRowsRef = useRef<Map<string, string>>(new Map());
  const [lockedSlideIds, setLockedSlideIds] = useState<ReadonlySet<string>>(new Set());
  const pdf = useExportPdf(onError);

  // Declared before the saver, which closes over it to reload after a conflict.
  const loadBoardRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  /**
   * Async writes that have already started but whose result isn't on the server yet.
   * A background refresh during one would read a board that is missing the very thing
   * being added, and overwrite it.
   */
  const inFlightWritesRef = useRef(0);

  const saver = useSlideSaver({
    repo,
    boardRef,
    versionsRef,
    onError,
    onConflict: useCallback(() => {
      onError('Someone else edited this slide. Reloading so their changes are not lost.');
      void loadBoardRef.current?.();
    }, [onError]),
  });

  // The saver is a fresh object each render. Reading it through a ref keeps commit(),
  // undo() and loadBoard() stable — otherwise the load effect re-fires every render and
  // the board never finishes loading.
  const saverRef = useRef(saver);
  saverRef.current = saver;

  /**
   * `silent` refreshes in place, without the loading state.
   *
   * The board re-reads itself whenever the tab regains focus, so it is never stale. Showing
   * "Loading moodboard…" for that makes coming back from another tab feel like the board
   * was thrown away and fetched again — when in almost every case nothing has changed and
   * the same board is about to be redrawn. The spinner belongs to the first load only.
   */
  const loadBoard = useCallback(async (silent = false) => {
    if (!repo || !identity) return;
    if (!silent) setIsLoading(true);
    try {
      const {
        board: loaded,
        versions,
        lockedSlideIds: locked,
        voteRowIds,
      } = await repo.load(identity, currentUserId);
      versionsRef.current = versions;
      setLockedSlideIds(locked);
      voteRowsRef.current = voteRowIds;
      boardRef.current = loaded;
      setBoard(loaded);
      setPast([]);
      saverRef.current.adopt(loaded);
      const first = loaded.sections[0];
      setActiveSectionIdState((id) => (loaded.sections.some((s) => s.id === id) ? id : first?.id ?? ''));
      setActiveSlideId((id) =>
        loaded.sections.some((s) => s.slides.some((sl) => sl.id === id)) ? id : first?.slides[0]?.id ?? ''
      );
      // Anything the board already uses has to arrive with it, or stored text renders in
      // a fallback until someone happens to reopen the font menu.
      loadFontsFor(
        loaded.sections.flatMap((section) =>
          section.slides.flatMap((slide) =>
            slide.elements.flatMap((el) => (el.type === 'text' ? [el.fontFamily] : []))
          )
        )
      );
      // A refresh keeps whatever the person had selected; only a first load clears it.
      if (!silent) setSelectedElementIds([]);
      onLoaded?.();
    } catch (err) {
      // A background refresh that fails is not worth interrupting anyone over: the board
      // on screen is still the last thing the server confirmed.
      if (!silent) onError(err instanceof Error ? err.message : 'Could not load the moodboard.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [repo, identity, currentUserId, onError, onLoaded]);
  loadBoardRef.current = loadBoard;

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  // Without a repo the board is seed data, which is ready immediately. Still announce it:
  // a host that hides a loading overlay on board_loaded would otherwise wait forever when
  // the moodboard id binding is momentarily empty.
  const seedAnnouncedRef = useRef(false);
  useEffect(() => {
    if (repo || seedAnnouncedRef.current) return;
    seedAnnouncedRef.current = true;
    onLoaded?.();
  }, [repo, onLoaded]);

  // Mirrors the state Bubble can bind to. Kept in an effect so the host is told once per
  // settled render rather than once per intermediate state during a load.
  useEffect(() => {
    onStateChange?.({
      activeSectionId,
      activeSlideId,
      isDirty: saver.isDirty,
      isSaving: saver.state === 'saving',
      isLoading,
    });
  }, [onStateChange, activeSectionId, activeSlideId, saver.isDirty, saver.state, isLoading]);

  /**
   * Re-reads the board when the tab regains focus, so what's on screen is always current.
   *
   * The workflow is a handoff: the planner does a pass, the client reviews days later. A tab
   * left open across that handoff would otherwise still be showing Monday's board.
   *
   * Unsaved edits are written first rather than skipped. Saving happens at boundaries, so
   * returning to a tab with work still only in the browser is normal — reloading over it
   * would throw that work away, but refusing to reload would leave the board stale. Writing
   * first resolves both, and costs nothing extra: it's the same save the next boundary would
   * have made, just sooner.
   */
  useEffect(() => {
    if (!repo) return;
    let running = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || running) return;
      // An upload holds the window's focus in a native file picker, so picking a file
      // fires this the moment the picker closes — while the upload is still running.
      // Reloading then reads a board without the new image and throws the local one away.
      if (inFlightWritesRef.current > 0) return;
      running = true;
      try {
        // Waits for any in-flight save too, so a reload can't land on top of one.
        await saverRef.current.flush();
        await loadBoardRef.current?.(true);
      } finally {
        running = false;
      }
    };
    const onEvent = () => void refresh();
    document.addEventListener('visibilitychange', onEvent);
    window.addEventListener('focus', onEvent);
    return () => {
      document.removeEventListener('visibilitychange', onEvent);
      window.removeEventListener('focus', onEvent);
    };
  }, [repo]);

  /**
   * Wraps a structural change — adding, renaming or removing a section or slide.
   *
   * Unlike canvas edits these are rare and deliberate, so they write immediately rather
   * than waiting for the idle timer. Pending canvas edits are flushed first, or moving away
   * from a slide as part of the change could strand them.
   *
   * Clearing the undo stack is applyStructural's job, not this one's — doing it here would
   * be undone by the local commit that follows.
   */
  const runStructural = useCallback(
    async (write: () => Promise<void>): Promise<boolean> => {
      if (!canEditRef.current) return false;
      await saverRef.current.flush();
      try {
        await write();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Could not save that change.');
        // Local state and the database have diverged; the database wins.
        await loadBoardRef.current?.();
        return false;
      }
      return true;
    },
    [onError]
  );

  /**
   * Applies a structural change to local state without recording it for undo.
   *
   * Undo only rewinds the client. A section or slide that has already been written to
   * Bubble can't be taken back by rewinding local state — you'd see a board that no longer
   * matches the database, and the next reload would silently undo your undo. So these
   * changes don't enter the history, and they clear what's behind them: undo can never
   * cross one.
   *
   * `commit()` can't do this itself — it runs after the write, so clearing the stack inside
   * runStructural just gets a fresh entry pushed on top a moment later.
   */
  const applyStructural = useCallback(
    (updater: (prev: Board) => Board) => {
      if (!canEditRef.current) return;
      const prev = boardRef.current;
      const next = updater(prev);
      if (next === prev) return;
      boardRef.current = next;
      setBoard(next);
      // Only when there's a database to diverge from; in seed mode undo stays useful.
      if (repo) setPast([]);
      saverRef.current.noteChange();
    },
    [repo]
  );

  /**
   * Applies a change that isn't a board edit — a comment, a pin, a vote — to local state.
   *
   * Comments are written the moment they are made, so they must not enter the undo stack:
   * rewinding local state can't take back a row that is already in Bubble, and the next
   * reload would silently undo the undo. Undo carries the live pins forward instead, which
   * keeps the two independent — see `withLivePins`. Unlike a board edit this doesn't mark
   * the slide dirty either: comments live in their own rows, not in the slide's elements.
   */
  const applyComments = useCallback((updater: (prev: Board) => Board) => {
    const prev = boardRef.current;
    const next = updater(prev);
    if (next === prev) return;
    boardRef.current = next;
    setBoard(next);
  }, []);

  /**
   * Writes first, then updates the screen with what the database actually returned.
   *
   * The alternative — draw it immediately and reconcile the id afterwards — buys a few
   * hundred milliseconds and pays for it with a whole class of bug where a comment or vote
   * is changed again before it has a real id. Both are deliberate, one-at-a-time actions,
   * so the wait lands where a person already expects one.
   */
  const writeThrough = useCallback(
    async <T,>(write: () => Promise<T>, apply: (result: T) => void, failure: string) => {
      try {
        apply(await write());
      } catch (err) {
        onError(err instanceof Error ? err.message : failure);
        // Local state and the database have diverged; the database wins.
        await loadBoardRef.current?.();
      }
    },
    [onError]
  );

  /**
   * Two permissions, because locking is per slide.
   *
   * `canManage` is whether this viewer may shape the board at all — add sections and
   * slides, set a status, write the vision brief. A client can't; they review.
   * `canEdit` is that plus the active slide being unlocked, and covers the canvas itself.
   * Locking one slide freezes its contents without taking away the ability to add another.
   *
   * Comments and votes sit outside both. They are how a client takes part, and a locked
   * slide is closed for redesign, not for discussion.
   */
  const canManage = !readOnly && role === 'planner';
  const canEdit = canManage && !lockedSlideIds.has(activeSlideId);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const canManageRef = useRef(canManage);
  canManageRef.current = canManage;
  const lockedSlideIdsRef = useRef(lockedSlideIds);
  lockedSlideIdsRef.current = lockedSlideIds;

  const commit = useCallback((updater: (prev: Board) => Board) => {
    // Every board mutation funnels through here, applyStructural or runStructural. Gating
    // the three of them beats gating twenty callers, because a mutation added later can't
    // forget to ask.
    if (!canEditRef.current) return;
    const prev = boardRef.current;
    const next = updater(prev);
    if (next === prev) return;
    boardRef.current = next;
    // A drag calls this on every pointermove. Snapshot once per gesture, or a single
    // drag fills the whole 60-deep history and undo becomes useless — and, once saving
    // is wired, every frame would queue a write.
    if (!interactionRef.current || !gestureSnapshotRef.current) {
      setPast((stack) => [...stack, prev].slice(-HISTORY_LIMIT));
      if (interactionRef.current) gestureSnapshotRef.current = true;
    }
    setBoard(next);
    // Works out for itself which slides changed, so no mutation has to declare it.
    saverRef.current.noteChange();
  }, []);

  /** Marks the start of a pointer gesture: everything until endInteraction is one undo step. */
  /** Where each selected element stood when the current gesture began. */
  const moveOriginRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(
    new Map()
  );

  const beginInteraction = useCallback(() => {
    interactionRef.current = true;
    gestureSnapshotRef.current = false;
    // Snapshot now: a group move is applied as a delta from these, so reading live
    // positions each frame would compound the movement instead of tracking the pointer.
    const origins = new Map<string, { x: number; y: number; width: number; height: number }>();
    const selected = new Set(selectedIdsRef.current);
    for (const section of boardRef.current.sections) {
      for (const slide of section.slides) {
        for (const el of slide.elements) {
          if (selected.has(el.id)) {
            origins.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
          }
        }
      }
    }
    moveOriginRef.current = origins;
  }, []);

  /**
   * Moves everything selected by one pointer delta.
   *
   * The whole group is clamped as a unit — the offset is trimmed so no member crosses an
   * edge, rather than each element stopping on its own. Otherwise dragging a group into a
   * corner squashes it, as the ones that hit the wall first pile up against the ones still
   * moving, and nothing puts them back.
   */
  const moveSelectionBy = useCallback(
    (slideId: string, dx: number, dy: number) => {
      const origins = moveOriginRef.current;
      if (origins.size < 2) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;
      for (const o of origins.values()) {
        minX = Math.min(minX, o.x);
        minY = Math.min(minY, o.y);
        maxRight = Math.max(maxRight, o.x + o.width);
        maxBottom = Math.max(maxBottom, o.y + o.height);
      }
      const clampedDx = Math.max(-minX, Math.min(dx, SLIDE_WIDTH - maxRight));
      const clampedDy = Math.max(-minY, Math.min(dy, SLIDE_HEIGHT - maxBottom));

      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            if (slide.id !== slideId) return slide;
            return {
              ...slide,
              elements: slide.elements.map((el) => {
                const origin = origins.get(el.id);
                if (!origin) return el;
                return { ...el, x: origin.x + clampedDx, y: origin.y + clampedDy };
              }),
            };
          }),
        })),
      }));
    },
    [commit]
  );

  const endInteraction = useCallback(() => {
    interactionRef.current = false;
    gestureSnapshotRef.current = false;
  }, []);

  const undo = useCallback(() => {
    setPast((stack) => {
      if (stack.length === 0) return stack;
      // Undo rewinds the canvas, not the conversation. Comments are written the moment
      // they're made, so a snapshot from before one was posted must not take it off the
      // screen — it would still be in Bubble, and reappear on the next load.
      const restored = withLivePins(stack[stack.length - 1], boardRef.current);
      boardRef.current = restored;
      setBoard(restored);
      saverRef.current.noteChange();
      return stack.slice(0, -1);
    });
  }, []);

  /**
   * The element the single-element controls act on: the last one picked.
   *
   * Null while several are selected, so nothing that only makes sense for one thing —
   * the text cursor, the rotate handle — appears for a group.
   */
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  const activeSlide = activeSection?.slides.find((s) => s.id === activeSlideId) ?? null;
  const activeSectionName = activeSection?.name ?? '';
  const visionBrief = activeSection?.visionBrief ?? board.visionBrief;

  const selectedCommentPin = useMemo(() => {
    if (!selectedCommentPinId) return null;
    return findPinInBoard(board.sections, selectedCommentPinId)?.pin ?? null;
  }, [board.sections, selectedCommentPinId]);

  const getImageById = useCallback(
    (imageId: string) => board.images.find((img) => img.id === imageId),
    [board.images]
  );

  const setActiveSectionId = useCallback((id: string) => {
    // Leaving a section is a natural boundary — write now rather than waiting out the idle
    // timer, so navigating away can never strand an edit.
    void saverRef.current.flush();
    setActiveSectionIdState(id);
    const slides = getActiveSectionSlides(board, id);
    if (slides.length > 0) {
      setActiveSlideId(slides[0].id);
      const firstImageEl = slides[0].elements.find((el) => el.type === 'image');
      if (firstImageEl && firstImageEl.type === 'image') {
        setSelectedElementIds([firstImageEl.id]);
      } else {
        setSelectedElementIds([]);
      }
    }
    setSelectedCommentPinId(null);
    setPlacingComment(false);
  }, [board]);

  /**
   * Selects one element, or adds and removes it from the selection with Cmd/Ctrl held.
   *
   * Toggling on re-click is what makes an additive click undoable without a modifier of
   * its own — the same gesture that added the fifth element takes it back out.
   */
  const selectElement = useCallback((elementId: string | null, additive = false) => {
    if (!elementId) {
      setSelectedElementIds([]);
      return;
    }
    setSlideSelected(false);
    setSelectedElementIds((prev) => {
      if (additive) {
        return prev.includes(elementId)
          ? prev.filter((id) => id !== elementId)
          : [...prev, elementId];
      }
      // Pressing something already in the selection keeps the group, because that press is
      // usually the start of dragging all of it. Collapsing to one happens on release, if
      // the press turned out to be a click — see collapseSelectionTo.
      if (prev.includes(elementId)) return prev;
      return prev.length === 1 && prev[0] === elementId ? prev : [elementId];
    });
  }, []);

  /** A click that did not become a drag: reduce a group to the one that was clicked. */
  const collapseSelectionTo = useCallback((elementId: string) => {
    setSelectedElementIds((prev) =>
      prev.length > 1 && prev.includes(elementId) ? [elementId] : prev
    );
  }, []);

  /** Replaces the selection outright — used by the marquee, which decides it wholesale. */
  const selectElements = useCallback((ids: readonly string[]) => {
    setSelectedElementIds([...ids]);
    if (ids.length) setSlideSelected(false);
  }, []);

  const selectSlide = useCallback(() => {
    setSelectedElementIds([]);
    setSelectedCommentPinId(null);
    setSlideSelected(true);
  }, []);

  // Only one right-hand drawer at a time: opening one closes the other.
  const selectCommentPinExclusive = useCallback((pinId: string | null) => {
    setSelectedCommentPinId(pinId);
    if (pinId) {
      setCommentsOpenState(true);
      setPlacingComment(false);
      setShowSuggestionsPanel(false);
    }
  }, []);

  const setCommentsOpen = useCallback((open: boolean) => {
    setCommentsOpenState(open);
    if (open) setShowSuggestionsPanel(false);
    else setSelectedCommentPinId(null);
  }, []);

  const showSuggestionsPanelExclusive = useCallback((show: boolean) => {
    setShowSuggestionsPanel(show);
    if (show) {
      setSelectedCommentPinId(null);
      setCommentsOpenState(false);
    }
  }, []);

  const placeCommentPin = useCallback(
    (x: number, y: number) => {
      if (!activeSlideId) return;
      const pinId = `pin-${Date.now()}`;
      const newPin: CommentPin = { id: pinId, x, y, comments: [] };

      // Local only: the thread row is written with the first comment, not on pin-drop.
      applyComments((prev) =>
        updateSlidePins(prev, activeSlideId, (pins) => [...pins, newPin])
      );
      setSelectedCommentPinId(pinId);
      setPlacingComment(false);
    },
    [activeSlideId, applyComments]
  );

  const moveCommentPin = useCallback(
    (pinId: string, x: number, y: number) => {
      const found = findPinInBoard(boardRef.current.sections, pinId);
      if (!found) return;
      const clampedX = Math.min(Math.max(x, 0), SLIDE_WIDTH);
      const clampedY = Math.min(Math.max(y, 0), SLIDE_HEIGHT);

      applyComments((prev) =>
        updateSlidePins(prev, found.slideId, (pins) =>
          pins.map((pin) => (pin.id === pinId ? { ...pin, x: clampedX, y: clampedY } : pin))
        )
      );

      // A pin with no comments has no thread row yet — placeCommentPin leaves that until
      // the first comment — so there is nothing to patch and the local move is the move.
      if (!repo || found.pin.comments.length === 0) return;
      void repo.moveThread(pinId, clampedX, clampedY).catch(() => {
        onError('Could not move that comment pin.');
      });
    },
    [applyComments, repo, onError]
  );

  const goToPin = useCallback(
    (sectionId: string, slideId: string, pinId: string) => {
      setActiveSectionIdState(sectionId);
      setActiveSlideId(slideId);
      setSelectedCommentPinId(pinId);
    },
    []
  );

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const requestEditSection = useCallback((sectionId: string | null) => {
    setEditingSectionId(sectionId);
  }, []);

  /**
   * Voting is not a board edit. A client is read-only over the canvas and still votes —
   * that is what they are there to do — so this goes around `commit` rather than through it.
   */
  const voteImage = useCallback(
    (imageId: string, vote: ImageVote) => {
      const current = boardRef.current.images.find((img) => img.id === imageId)?.clientVote;
      // Clicking the active vote again clears it.
      const next = current === vote ? undefined : vote;

      const apply = () =>
        applyComments((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === imageId ? { ...img, clientVote: next } : img
          ),
        }));

      if (!repo) {
        apply();
        return;
      }

      const existing = voteRowsRef.current.get(imageId);
      void writeThrough(
        async () => {
          if (!next) {
            if (existing) await repo.clearVote(existing);
            return undefined;
          }
          if (existing) {
            await repo.changeVote(existing, next);
            return existing;
          }
          return repo.castVote(imageId, next);
        },
        (rowId) => {
          if (rowId) voteRowsRef.current.set(imageId, rowId);
          else voteRowsRef.current.delete(imageId);
          apply();
        },
        'Could not record that vote.'
      );
    },
    [repo, applyComments, writeThrough]
  );

  const updateElement = useCallback(
    (slideId: string, elementId: string, patch: Partial<CanvasElement>) => {
      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            if (slide.id !== slideId) return slide;
            return {
              ...slide,
              elements: slide.elements.map((el) =>
                el.id === elementId ? ({ ...el, ...patch } as CanvasElement) : el
              ),
            };
          }),
        })),
      }));
    },
    [commit]
  );

  /**
   * Removes elements from a slide in one step.
   *
   * Takes a list rather than one id so deleting a selection is a single commit — looping a
   * single delete would push an undo entry per element, and undoing a group deletion would
   * bring them back one at a time.
   */
  const deleteElements = useCallback((slideId: string, elementIds: readonly string[]) => {
    if (!elementIds.length) return;
    const doomed = new Set(elementIds);
    const removed = (boardRef.current.sections
      .flatMap((s) => s.slides)
      .find((s) => s.id === slideId)
      ?.elements ?? []).filter((el) => doomed.has(el.id));

    commit((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        slides: section.slides.map((slide) => {
          if (slide.id !== slideId) return slide;
          return {
            ...slide,
            elements: slide.elements.filter((el) => !doomed.has(el.id)),
          };
        }),
      })),
    }));
    setSelectedElementIds([]);

    // Mark the image unused once nothing places it any more. The file itself is never
    // deleted — undo reaches back 60 steps, and it would resurrect an element pointing at
    // something that no longer exists.
    for (const gone of removed) {
      if (!repo || gone.type !== 'image') continue;
      const stillPlaced = boardRef.current.sections
        .flatMap((s) => s.slides)
        .flatMap((s) => s.elements)
        .some((el) => el.type === 'image' && el.imageId === gone.imageId);
      if (!stillPlaced) {
        void repo.retireImage(gone.imageId).catch(() => {
          // Cosmetic bookkeeping — a board that shows a removed image in its library is
          // not worth interrupting the user for.
        });
      }
    }
  }, [commit, repo]);

  const deleteElement = useCallback(
    (slideId: string, elementId: string) => deleteElements(slideId, [elementId]),
    [deleteElements]
  );

  const restack = useCallback(
    (slideId: string, elementId: string, edge: 'front' | 'back') => {
      commit((prev) => {
        // Rebuilding the section tree unconditionally would defeat commit's identity
        // check — every click would look like an edit and cost an undo entry, even
        // when the element is already at that edge. So decide first, build second.
        let changed = false;
        const sections = prev.sections.map((section) => {
          const idx = section.slides.findIndex((s) => s.id === slideId);
          if (idx === -1) return section;

          const slide = section.slides[idx];
          const current = slide.elements.find((el) => el.id === elementId);
          if (!current) return section;

          const zs = slide.elements.map((el) => el.zIndex);
          const extreme = edge === 'front' ? Math.max(...zs) : Math.min(...zs);
          // Already alone at that edge: nothing to do.
          if (current.zIndex === extreme && zs.filter((z) => z === extreme).length === 1) {
            return section;
          }

          const target = edge === 'front' ? Math.max(...zs, 0) + 1 : Math.min(...zs, 0) - 1;
          const slides = [...section.slides];
          slides[idx] = {
            ...slide,
            elements: slide.elements.map((el) =>
              el.id === elementId ? { ...el, zIndex: target } : el
            ),
          };
          changed = true;
          return { ...section, slides };
        });

        return changed ? { ...prev, sections } : prev;
      });
    },
    [commit]
  );

  const bringToFront = useCallback(
    (slideId: string, elementId: string) => restack(slideId, elementId, 'front'),
    [restack]
  );

  const sendToBack = useCallback(
    (slideId: string, elementId: string) => restack(slideId, elementId, 'back'),
    [restack]
  );

  const addTextElement = useCallback((content?: string) => {
    if (!activeSlide) return;
    const el = defaultTextElement();
    if (content) el.content = content;
    const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    el.zIndex = maxZ + 1;

    commit((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== activeSectionId) return section;
        return {
          ...section,
          slides: section.slides.map((slide) => {
            if (slide.id !== activeSlideId) return slide;
            return { ...slide, elements: [...slide.elements, el] };
          }),
        };
      }),
    }));
    setSelectedElementIds([el.id]);
  }, [activeSlide, activeSectionId, activeSlideId, commit]);

  const setSlideBackground = useCallback(
    (slideId: string, background: string | undefined) => {
      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) =>
            slide.id === slideId ? { ...slide, background } : slide
          ),
        })),
      }));
    },
    [commit]
  );

  const addShapeElement = useCallback(
    (shape: ShapeKind) => {
      if (!activeSlide) return;
      const el = defaultShapeElement(shape);
      el.zIndex = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1;

      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          return {
            ...section,
            slides: section.slides.map((slide) =>
              slide.id === activeSlideId
                ? { ...slide, elements: [...slide.elements, el] }
                : slide
            ),
          };
        }),
      }));
      setSelectedElementIds([el.id]);
    },
    [activeSlide, activeSectionId, activeSlideId, commit]
  );

  const addSection = useCallback(
    async (name: string, brief: string, icon?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const resolvedIcon = icon ?? inferSectionIcon(trimmed);
      let newId = `section-${Date.now()}`;
      let firstSlideId = `slide-${newId}-1`;

      if (repo && identity) {
        // Bubble mints the ids, so this has to round-trip before the section can be shown —
        // inventing a local id and swapping it later would leave every reference to fix up.
        const ok = await runStructural(async () => {
          const order = boardRef.current.sections.length;
          newId = await repo.createSection(identity.moodboardId, trimmed, resolvedIcon, order);
          if (brief.trim()) await repo.updateSection(newId, { visionBrief: brief.trim() });
          firstSlideId = await repo.createSlide(newId, 'Slide 1', 0);
        });
        // A failed create already triggered a reload; don't also add a phantom section.
        if (!ok) return;
      }

      const newSection: Section = {
        id: newId,
        name: trimmed,
        icon: resolvedIcon,
        status: 'none',
        visionBrief: brief.trim() || undefined,
        imageCount: 0,
        slides: [
          {
            id: firstSlideId,
            sectionId: newId,
            name: 'Slide 1',
            elements: [],
            commentPins: [],
          },
        ],
      };
      applyStructural((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
      setActiveSectionIdState(newId);
      setActiveSlideId(firstSlideId);
      setSelectedElementIds([]);
      setSelectedCommentPinId(null);
      setSlideSelected(false);
      setPlacingComment(false);
    },
    [applyStructural, repo, identity, runStructural]
  );

  const updateSection = useCallback(
    (
      sectionId: string,
      patch: {
        name?: string;
        icon?: string;
        visionBrief?: string;
        status?: SectionStatus;
        approvedDate?: string;
      }
    ) => {
      applyStructural((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
                ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
                ...(patch.visionBrief !== undefined
                  ? { visionBrief: patch.visionBrief.trim() || undefined }
                  : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                ...(patch.approvedDate !== undefined
                  ? { approvedDate: patch.approvedDate }
                  : {}),
              }
            : section
        ),
      }));

      // Optimistic: these are single-field edits, and showing a rename instantly matters
      // more than the small chance the write fails (which reloads and puts it right).
      if (repo) {
        void runStructural(() =>
          repo.updateSection(sectionId, {
            ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
            ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
            ...(patch.visionBrief !== undefined ? { visionBrief: patch.visionBrief.trim() } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.approvedDate !== undefined ? { approvedDate: patch.approvedDate } : {}),
          })
        );
      }
    },
    [applyStructural, repo, runStructural]
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      const remaining = boardRef.current.sections.filter((s) => s.id !== sectionId);
      if (remaining.length === 0) return;
      applyStructural((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
        images: prev.images.filter((img) => img.sectionId !== sectionId),
      }));
      // Archived, not deleted — its slides and their comments stay recoverable.
      if (repo) void runStructural(() => repo.archiveSection(sectionId));
      if (activeSectionId === sectionId) {
        const next = remaining[0];
        setActiveSectionIdState(next.id);
        setActiveSlideId(next.slides[0]?.id ?? '');
        setSelectedElementIds([]);
        setSelectedCommentPinId(null);
        setPlacingComment(false);
      }
    },
    [activeSectionId, applyStructural, repo, runStructural]
  );

  const addSlide = useCallback(async () => {
    let newId = `slide-${activeSectionId}-${Date.now()}`;
    const slideName = `Slide ${(activeSection?.slides.length ?? 0) + 1}`;

    if (repo) {
      const ok = await runStructural(async () => {
        newId = await repo.createSlide(activeSectionId, slideName, activeSection?.slides.length ?? 0);
      });
      if (!ok) return;
    }

    const newSlide: Slide = {
      id: newId,
      sectionId: activeSectionId,
      name: slideName,
      elements: [],
      commentPins: [],
    };
    applyStructural((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== activeSectionId) return section;
        return { ...section, slides: [...section.slides, newSlide] };
      }),
    }));
    setActiveSlideId(newId);
    setSelectedElementIds([]);
    setSelectedCommentPinId(null);
  }, [activeSectionId, activeSection?.slides.length, applyStructural, repo, runStructural]);

  const deleteSlide = useCallback(
    (slideId: string) => {
      if (!activeSection || activeSection.slides.length <= 1) return;
      applyStructural((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          const slides = section.slides.filter((s) => s.id !== slideId);
          return { ...section, slides };
        }),
      }));
      if (repo) void runStructural(() => repo.deleteSlide(slideId));
      if (activeSlideId === slideId) {
        const remaining = activeSection.slides.filter((s) => s.id !== slideId);
        setActiveSlideId(remaining[0]?.id ?? '');
        setSelectedElementIds([]);
        setSelectedCommentPinId(null);
      }
    },
    [activeSection, activeSectionId, activeSlideId, applyStructural, repo, runStructural]
  );

  /**
   * Freezes one slide's canvas. Comments and votes carry on — a locked slide is closed for
   * redesign, not for discussion.
   *
   * Deliberately not routed through `canEdit`: locking a slide is what makes canEdit false,
   * so gating it there would make a lock impossible to undo.
   */
  const toggleSlideLock = useCallback(
    (slideId: string) => {
      if (!canManageRef.current) return;
      const next = new Set(lockedSlideIdsRef.current);
      if (next.has(slideId)) next.delete(slideId);
      else next.add(slideId);

      const section = boardRef.current.sections.find((sec) =>
        sec.slides.some((sl) => sl.id === slideId)
      );
      if (!section) return;

      setLockedSlideIds(next);
      if (!repo) return;

      // Only this section's ids: the field lives on the section, and writing every
      // section's locks into one of them would be nonsense.
      const forSection = section.slides.filter((sl) => next.has(sl.id)).map((sl) => sl.id);
      void repo.setLockedSlides(section.id, forSection).catch((err: unknown) => {
        setLockedSlideIds(lockedSlideIdsRef.current);
        onError(err instanceof Error ? err.message : 'Could not change the lock.');
      });
    },
    [repo, onError]
  );

  const duplicateSlide = useCallback(
    async (slideId: string) => {
      const slide = activeSection?.slides.find((s) => s.id === slideId);
      if (!slide) return;
      let newId = `slide-${activeSectionId}-${Date.now()}`;

      if (repo) {
        const idx = activeSection?.slides.findIndex((s) => s.id === slideId) ?? 0;
        const ok = await runStructural(async () => {
          newId = await repo.createSlide(activeSectionId, `${slide.name} (copy)`, idx + 1);
          // The copy's canvas is written here rather than left to the autosave, so a
          // duplicate is complete the moment it appears.
          await repo.saveSlide(newId, slide.elements);
        });
        if (!ok) return;
      }

      const duplicated: Slide = {
        ...slide,
        id: newId,
        name: `${slide.name} (copy)`,
        elements: slide.elements.map((el) => ({
          ...el,
          id: `${el.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
        commentPins: slide.commentPins.map((pin) => ({
          ...pin,
          id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      };
      applyStructural((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          const idx = section.slides.findIndex((s) => s.id === slideId);
          const slides = [...section.slides];
          slides.splice(idx + 1, 0, duplicated);
          return { ...section, slides };
        }),
      }));
      setActiveSlideId(newId);
    },
    [activeSection, activeSectionId, applyStructural, repo, runStructural]
  );

  const setSectionBrief = useCallback(
    (sectionId: string, text: string) => {
      applyStructural((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId ? { ...section, visionBrief: text } : section
        ),
      }));
      // The brief commits on blur, so this is once per edit rather than once per keystroke.
      if (repo) void runStructural(() => repo.updateSection(sectionId, { visionBrief: text }));
    },
    [applyStructural, repo, runStructural]
  );

  const summarizeVision = useCallback(() => {
    const sectionId = activeSectionId;
    setIsSummarizing(true);
    setTimeout(() => {
      setSectionBrief(sectionId, AI_VISION_BRIEF);
      setIsSummarizing(false);
    }, 1200);
  }, [activeSectionId, setSectionBrief]);

  const updateVisionBrief = useCallback(
    (text: string) => {
      setSectionBrief(activeSectionId, text.trim());
    },
    [activeSectionId, setSectionBrief]
  );

  /**
   * The board's working colors, shared by every color control on the canvas.
   *
   * Written immediately rather than left to the autosave: it belongs to the moodboard row,
   * not to a slide's canvas, so the slide saver never looks at it.
   */
  const setPalette = useCallback(
    (colors: string[]) => {
      if (!canManageRef.current) return;
      applyStructural((prev) => ({ ...prev, palette: colors }));
      if (!repo || !identity) return;
      void repo.setPalette(identity.moodboardId, colors).catch((err: unknown) => {
        onError(err instanceof Error ? err.message : 'Could not save the palette.');
        void loadBoardRef.current?.(true);
      });
    },
    [repo, identity, applyStructural, onError]
  );


  /**
   * Every slide on the board in order, flattened across sections.
   *
   * Presenting walks the whole deck rather than stopping at the end of a section — a
   * moodboard is shown to a client start to finish, and the section boundaries are an
   * editing concept, not something the audience should hit a wall at.
   */
  const slideSequence = useMemo(
    () => board.sections.flatMap((section) => section.slides.map((slide) => ({ sectionId: section.id, slideId: slide.id }))),
    [board.sections]
  );

  const stepSlide = useCallback(
    (delta: number) => {
      const idx = slideSequence.findIndex((s) => s.slideId === activeSlideId);
      const next = slideSequence[idx + delta];
      if (idx === -1 || !next) return;
      // Crossing into another section changes it without the usual side effects of
      // setActiveSectionId, which would jump to that section's first slide.
      if (next.sectionId !== activeSectionId) setActiveSectionIdState(next.sectionId);
      setActiveSlideId(next.slideId);
      setSelectedElementIds([]);
      setSelectedCommentPinId(null);
    },
    [slideSequence, activeSlideId, activeSectionId]
  );

  const goToNextSlide = useCallback(() => stepSlide(1), [stepSlide]);

  const goToPrevSlide = useCallback(() => stepSlide(-1), [stepSlide]);



  /**
   * Resolution belongs to the thread, not to one comment inside it.
   *
   * The drawer only offers resolve on a thread's first comment and treats a pin as resolved
   * when every comment in it is, so thread-level is what the interface has always meant.
   * Marking them all keeps `isPinResolved` working untouched.
   */
  const setThreadResolved = useCallback(
    (pinId: string, resolved: boolean) => {
      const apply = () =>
        applyComments((prev) => {
          const found = findPinInBoard(prev.sections, pinId);
          if (!found) return prev;
          return updateSlidePins(prev, found.slideId, (pins) =>
            pins.map((pin) =>
              pin.id === pinId
                ? {
                    ...pin,
                    comments: markResolved(pin.comments, resolved, currentUserName),
                  }
                : pin
            )
          );
        });

      if (!repo) {
        apply();
        return;
      }
      void writeThrough(
        () => repo.setThreadResolved(pinId, resolved, currentUserId),
        apply,
        resolved ? 'Could not resolve that thread.' : 'Could not reopen that thread.'
      );
    },
    [repo, applyComments, writeThrough, currentUserId, currentUserName]
  );

  const resolveComment = useCallback(
    (pinId: string) => setThreadResolved(pinId, true),
    [setThreadResolved]
  );

  const addComment = useCallback(
    (pinId: string, text: string) => {
      const body = text.trim();
      if (!body) return;

      const makeComment = (id: string): Comment => ({
        id,
        authorId: currentUserId,
        authorName: currentUserName,
        authorInitials: currentUserInitials,
        text: body,
        // Real rows carry Created Date; this is what the drawer shows until the next load.
        timestamp: new Date().toISOString(),
      });

      const appendTo = (targetPinId: string, comment: Comment, threadId?: string) =>
        applyComments((prev) => {
          const found = findPinInBoard(prev.sections, targetPinId);
          if (!found) return prev;
          return updateSlidePins(prev, found.slideId, (pins) =>
            pins.map((pin) =>
              pin.id === targetPinId
                ? { ...pin, id: threadId ?? pin.id, comments: [...pin.comments, comment] }
                : pin
            )
          );
        });

      if (!repo || !identity) {
        appendTo(pinId, makeComment(`c-${Date.now()}`));
        return;
      }

      const found = findPinInBoard(boardRef.current.sections, pinId);
      if (!found) return;
      const isPending = found.pin.comments.length === 0;

      void writeThrough(
        async () => {
          // The thread row is created with its first comment, so an abandoned pin never
          // becomes a permanent empty thread that everyone afterwards has to look at.
          const threadId = isPending
            ? await repo.createThread(identity.moodboardId, found.slideId, found.pin.x, found.pin.y)
            : pinId;
          const commentId = await repo.createComment(threadId, body, currentUserName);
          return { threadId, commentId };
        },
        ({ threadId, commentId }) => {
          appendTo(pinId, makeComment(commentId), isPending ? threadId : undefined);
          // The pin's id becomes the thread's, so the open drawer keeps pointing at it.
          if (isPending) setSelectedCommentPinId(threadId);
        },
        'Could not post that comment.'
      );
    },
    [
      repo,
      identity,
      applyComments,
      writeThrough,
      currentUserId,
      currentUserName,
      currentUserInitials,
    ]
  );

  const editComment = useCallback(
    (pinId: string, commentId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const apply = () =>
        applyComments((prev) => {
          const found = findPinInBoard(prev.sections, pinId);
          if (!found) return prev;
          return updateSlidePins(prev, found.slideId, (pins) =>
            pins.map((pin) =>
              pin.id === pinId
                ? {
                    ...pin,
                    comments: updatePinComments(pin.comments, commentId, (c) => ({
                      ...c,
                      text: trimmed,
                      edited: true,
                    })),
                  }
                : pin
            )
          );
        });

      if (!repo) {
        apply();
        return;
      }
      void writeThrough(
        () => repo.updateComment(commentId, trimmed),
        apply,
        'Could not save that edit.'
      );
    },
    [repo, applyComments, writeThrough]
  );

  const reopenComment = useCallback(
    (pinId: string) => setThreadResolved(pinId, false),
    [setThreadResolved]
  );

  const deleteComment = useCallback(
    (pinId: string, commentId: string) => {
      const found = findPinInBoard(boardRef.current.sections, pinId);
      // Deleting the only comment takes the pin with it — an empty thread is a pin that
      // opens onto nothing.
      const isLast =
        !!found && found.pin.comments.length === 1 && found.pin.comments[0].id === commentId;

      const apply = () =>
        applyComments((prev) => {
          const at = findPinInBoard(prev.sections, pinId);
          if (!at) return prev;
          return updateSlidePins(prev, at.slideId, (pins) =>
            pins
              .map((pin) =>
                pin.id === pinId
                  ? { ...pin, comments: removePinComment(pin.comments, commentId) }
                  : pin
              )
              .filter((pin) => pin.id !== pinId || pin.comments.length > 0)
          );
        });

      if (!repo) {
        apply();
        return;
      }
      void writeThrough(
        async () => {
          await repo.deleteComment(commentId);
          if (isLast) await repo.deleteThread(pinId);
        },
        () => {
          apply();
          if (isLast) setSelectedCommentPinId(null);
        },
        'Could not delete that comment.'
      );
    },
    [repo, applyComments, writeThrough]
  );

  const pinSuggestion = useCallback(
    (suggestionId: string) => {
      const suggestion = board.suggestions.find((s) => s.id === suggestionId);
      if (!suggestion || !activeSlide) return;

      const imageId = `img-${Date.now()}`;
      const newImage: BoardImage = {
        id: imageId,
        sectionId: activeSectionId,
        url: suggestion.url,
        tags: ['Suggested', 'Pinned'],
      };

      const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const el = defaultImageElement(imageId, maxZ + 1);

      commit((prev) => ({
        ...prev,
        images: [...prev.images, newImage],
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          return {
            ...section,
            imageCount: section.imageCount + 1,
            slides: section.slides.map((slide) => {
              if (slide.id !== activeSlideId) return slide;
              return { ...slide, elements: [...slide.elements, el] };
            }),
          };
        }),
        suggestions: prev.suggestions.filter((s) => s.id !== suggestionId),
      }));

      setSelectedElementIds([el.id]);
    },
    [board.suggestions, activeSectionId, activeSlide, activeSlideId, commit]
  );

  const refreshSuggestions = useCallback(() => {
    const extras = [
      {
        id: `s-${Date.now()}-1`,
        url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=300&h=220&fit=crop',
        alt: 'Newlywed couple outdoors',
      },
      {
        id: `s-${Date.now()}-2`,
        url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=300&h=220&fit=crop',
        alt: 'Outdoor ceremony chairs',
      },
      {
        id: `s-${Date.now()}-3`,
        url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=220&fit=crop',
        alt: 'Reception table setting',
      },
      {
        id: `s-${Date.now()}-4`,
        url: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=300&h=220&fit=crop',
        alt: 'Bridal bouquet close-up',
      },
    ];
    commit((prev) => ({ ...prev, suggestions: extras }));
  }, [commit]);

  const addUploadedImage = useCallback(
    (url: string, tags: string[] = ['Uploaded'], id?: string) => {
      if (!activeSlide || !activeSlideId) return;

      const imageId = id ?? `img-${Date.now()}`;
      const newImage: BoardImage = {
        id: imageId,
        sectionId: activeSectionId,
        url,
        tags,
      };

      const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const el = defaultImageElement(imageId, maxZ + 1);

      commit((prev) => ({
        ...prev,
        images: [...prev.images, newImage],
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          return {
            ...section,
            imageCount: section.imageCount + 1,
            slides: section.slides.map((slide) => {
              if (slide.id !== activeSlideId) return slide;
              return { ...slide, elements: [...slide.elements, el] };
            }),
          };
        }),
      }));

      setSelectedElementIds([el.id]);
    },
    [activeSlide, activeSlideId, activeSectionId, commit]
  );

  const [isUploading, setIsUploading] = useState(false);

  /**
   * Uploads a file to Bubble's storage and places it on the active slide.
   *
   * The file has to reach real storage before anything is added to the board. The old code
   * put a `URL.createObjectURL` blob straight into board state — fine on screen, but the
   * moment that got saved the board held a URL that dies with the page, and the image was
   * gone for good on the next reload.
   */
  const uploadAndAddImage = useCallback(
    async (file: File, tags: string[] = ['Uploaded']) => {
      // Checked before the upload, not after: the file and the Moodboard Image row are
      // created first, so a refusal at the end would leave both behind with no element
      // pointing at them, and say nothing.
      if (!canEditRef.current) return;
      setIsUploading(true);
      inFlightWritesRef.current += 1;
      try {
        const url = await uploadFile(file);
        const id = repo && identity ? await repo.createImage(identity.moodboardId, url) : undefined;
        addUploadedImage(url, tags, id);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Could not upload that image.');
      } finally {
        inFlightWritesRef.current -= 1;
        setIsUploading(false);
      }
    },
    [uploadFile, repo, identity, addUploadedImage, onError]
  );


  const deleteSelection = useCallback(() => {
    if (!activeSlideId) return;
    deleteElements(activeSlideId, selectedElementIds);
  }, [activeSlideId, selectedElementIds, deleteElements]);

  const cutSelection = useCallback(
    (writeClipboard: (text: string) => void): boolean => {
      // Cut carries one element, because paste puts one back. Several selected is a
      // delete, and Cmd+X on a group would quietly lose all but one of them.
      if (!selectedElementId || !activeSlideId) return false;
      const element = activeSlide?.elements.find((el) => el.id === selectedElementId);
      if (!element) return false;
      // Chrome can deliver both keydown and the native cut event for one
      // gesture; only the first should actually remove anything.
      if (Date.now() - lastCutAtRef.current < 300) return false;
      lastCutAtRef.current = Date.now();

      const clipboardText = element.type === 'text' ? element.content : '';
      cutRef.current = { element, clipboardText };
      writeClipboard(clipboardText);
      deleteElement(activeSlideId, selectedElementId);
      return true;
    },
    [activeSlide, activeSlideId, selectedElementId, deleteElement]
  );

  // The native cut event: the reliable hook for the gesture, and the only place
  // the system clipboard can be set synchronously.
  useEffect(() => {
    const onCut = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const did = cutSelection((text) => e.clipboardData?.setData('text/plain', text));
      if (did) e.preventDefault();
    };
    const onCutScoped = (e: ClipboardEvent) => {
      if (!rootEl.contains(document.activeElement)) return;
      onCut(e);
    };
    document.addEventListener('cut', onCutScoped);
    return () => document.removeEventListener('cut', onCutScoped);
  }, [cutSelection, rootEl]);

  const insertElement = useCallback(
    (element: CanvasElement) => {
      if (!activeSlide || !activeSlideId) return;
      const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const copy = {
        ...element,
        id: `el-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: Math.min(element.x + PASTE_OFFSET, SLIDE_WIDTH - element.width),
        y: Math.min(element.y + PASTE_OFFSET, SLIDE_HEIGHT - element.height),
        zIndex: maxZ + 1,
      } as CanvasElement;

      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) =>
            slide.id === activeSlideId
              ? { ...slide, elements: [...slide.elements, copy] }
              : slide
          ),
        })),
      }));
      setSelectedElementIds([copy.id]);
    },
    [activeSlide, activeSlideId, commit]
  );

  // Paste: an image on the clipboard lands as an image element, text as a text
  // box, and an element cut from the canvas comes back with its own styling.
  // Ignored while typing in a field.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const data = e.clipboardData;
      if (!data) return;

      const imageItem = Array.from(data.items).find(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          cutRef.current = null;
          void uploadAndAddImage(file, ['Pasted']);
          return;
        }
      }

      const text = data.getData('text/plain').trim();
      const cut = cutRef.current;

      // Our own cut still owns the clipboard, so restore the real element.
      if (cut && text === cut.clipboardText) {
        e.preventDefault();
        insertElement(cut.element);
        return;
      }

      if (text) {
        e.preventDefault();
        cutRef.current = null;
        addTextElement(text);
      }
    };
    const onPasteScoped = (e: ClipboardEvent) => {
      if (!rootEl.contains(document.activeElement)) return;
      onPaste(e);
    };
    document.addEventListener('paste', onPasteScoped);
    return () => document.removeEventListener('paste', onPasteScoped);
  }, [uploadAndAddImage, addTextElement, insertElement, rootEl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        // The browser's Save Page dialog is never what someone wants here.
        e.preventDefault();
        void saverRef.current.flush();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        undo();
        return;
      }

      // Cut: take the selection off the canvas and onto the clipboard.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        if (typing) return;
        const did = cutSelection((text) => {
          // Best effort here — claiming the clipboard is what makes a later
          // paste recognisable as ours, but it is fine if the browser blocks it.
          void navigator.clipboard?.writeText(text).catch(() => {});
        });
        if (did) e.preventDefault();
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedElementIds.length &&
        activeSlideId &&
        !typing
      ) {
        e.preventDefault();
        deleteSelection();
      }
    };
    rootEl.addEventListener('keydown', handleKeyDown);
    return () => rootEl.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, activeSlideId, deleteSelection, undo, cutSelection, rootEl]);

  return (
    <BoardContext.Provider
      value={{
        board,
        role,
        activeSectionId,
        setActiveSectionId,
        activeSlideId,
        setActiveSlideId: (id: string) => {
          void saverRef.current.flush();
          setActiveSlideId(id);
        },
        activeSlide,
        selectedElementId,
        selectedElementIds,
        deleteSelection,
        moveSelectionBy,
        selectedCommentPinId,
        selectedCommentPin,
        selectElement,
        selectElements,
        collapseSelectionTo,
        isSlideSelected,
        selectSlide,
        selectCommentPin: selectCommentPinExclusive,
        isPlacingComment,
        setPlacingComment,
        placeCommentPin,
        moveCommentPin,
        goToPin,
        editingSectionId,
        requestEditSection,
        voteImage,
        visionBrief,
        updateVisionBrief,
        setPalette,
        summarizeVision,
        isSummarizing,
        isCommentsOpen,
        setCommentsOpen,
        isPresenting,
        setPresenting,
        goToNextSlide,
        goToPrevSlide,
        resolveComment,
        addComment,
        editComment,
        reopenComment,
        deleteComment,
        currentUserId,
        undo,
        isLoading,
        exportPdf: pdf.exportPdf,
        isExporting: pdf.isExporting,
        exportTarget: pdf.target,
        saveState: saver.state,
        isDirty: saver.isDirty,
        saveNow: saver.flush,
        lockedSlideIds,
        canEdit,
        canManage,
        toggleSlideLock,
        beginInteraction,
        endInteraction,
        canUndo: past.length > 0,
        pinSuggestion,
        refreshSuggestions,
        activeSectionName,
        updateElement,
        deleteElement,
        bringToFront,
        sendToBack,
        addTextElement,
        addShapeElement,
        setSlideBackground,
        addSection,
        updateSection,
        deleteSection,
        addSlide,
        deleteSlide,
        duplicateSlide,
        showSuggestionsPanel,
        setShowSuggestionsPanel: showSuggestionsPanelExclusive,
        getImageById,
        addUploadedImage,
        uploadAndAddImage,
        isUploading,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
