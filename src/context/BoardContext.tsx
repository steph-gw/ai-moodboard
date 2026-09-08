'use client';

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
} from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { mockBoard, AI_VISION_BRIEF } from '../data/mockData';
import { defaultImageElement, defaultTextElement } from '../data/slideHelpers';
import {
  findPinInBoard,
  removePinComment,
  updatePinComments,
} from '../utils/commentHelpers';
import { inferSectionIcon } from '../utils/sectionIcons';

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
  setRole: (role: UserRole) => void;
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  activeSlideId: string;
  setActiveSlideId: (id: string) => void;
  activeSlide: Slide | null;
  selectedElementId: string | null;
  selectedCommentPinId: string | null;
  selectedCommentPin: CommentPin | null;
  selectElement: (elementId: string | null) => void;
  selectCommentPin: (pinId: string | null) => void;
  isPlacingComment: boolean;
  setPlacingComment: (value: boolean) => void;
  placeCommentPin: (x: number, y: number) => void;
  voteImage: (imageId: string, vote: ImageVote) => void;
  visionBrief: string;
  updateVisionBrief: (text: string) => void;
  summarizeVision: () => void;
  isSummarizing: boolean;
  isCommentsOpen: boolean;
  setCommentsOpen: (open: boolean) => void;
  isPresenting: boolean;
  setPresenting: (value: boolean) => void;
  goToNextSlide: () => void;
  goToPrevSlide: () => void;
  resolveComment: (pinId: string, commentId: string) => void;
  addComment: (pinId: string, text: string) => void;
  editComment: (pinId: string, commentId: string, text: string) => void;
  reopenComment: (pinId: string, commentId: string) => void;
  deleteComment: (pinId: string, commentId: string) => void;
  currentUserId: string;
  undo: () => void;
  canUndo: boolean;
  pinSuggestion: (suggestionId: string) => void;
  refreshSuggestions: () => void;
  activeSectionName: string;
  updateElement: (slideId: string, elementId: string, patch: Partial<CanvasElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  bringToFront: (slideId: string, elementId: string) => void;
  sendToBack: (slideId: string, elementId: string) => void;
  addTextElement: (content?: string) => void;
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
  addUploadedImage: (url: string, tags?: string[]) => void;
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

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board>(mockBoard);
  const [past, setPast] = useState<Board[]>([]);
  const [role, setRole] = useState<UserRole>('planner');
  const [activeSectionId, setActiveSectionIdState] = useState('ceremony');
  const [activeSlideId, setActiveSlideId] = useState('slide-ceremony-1');
  const [selectedElementId, setSelectedElementId] = useState<string | null>('el-img-1');
  const [selectedCommentPinId, setSelectedCommentPinId] = useState<string | null>(null);
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

  const commit = useCallback((updater: (prev: Board) => Board) => {
    const prev = boardRef.current;
    const next = updater(prev);
    if (next === prev) return;
    boardRef.current = next;
    setPast((stack) => [...stack, prev].slice(-HISTORY_LIMIT));
    setBoard(next);
  }, []);

  const undo = useCallback(() => {
    setPast((stack) => {
      if (stack.length === 0) return stack;
      const restored = stack[stack.length - 1];
      boardRef.current = restored;
      setBoard(restored);
      return stack.slice(0, -1);
    });
  }, []);

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  const activeSlide = activeSection?.slides.find((s) => s.id === activeSlideId) ?? null;
  const activeSectionName = activeSection?.name ?? '';
  const visionBrief = activeSection?.visionBrief ?? board.visionBrief;
  const currentUserId = role === 'planner' ? '1' : '2';

  const selectedCommentPin = useMemo(() => {
    if (!selectedCommentPinId) return null;
    return findPinInBoard(board.sections, selectedCommentPinId)?.pin ?? null;
  }, [board.sections, selectedCommentPinId]);

  const getImageById = useCallback(
    (imageId: string) => board.images.find((img) => img.id === imageId),
    [board.images]
  );

  const setActiveSectionId = useCallback((id: string) => {
    setActiveSectionIdState(id);
    const slides = getActiveSectionSlides(board, id);
    if (slides.length > 0) {
      setActiveSlideId(slides[0].id);
      const firstImageEl = slides[0].elements.find((el) => el.type === 'image');
      if (firstImageEl && firstImageEl.type === 'image') {
        setSelectedElementId(firstImageEl.id);
      } else {
        setSelectedElementId(null);
      }
    }
    setSelectedCommentPinId(null);
    setPlacingComment(false);
  }, [board]);

  const selectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
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

      commit((prev) =>
        updateSlidePins(prev, activeSlideId, (pins) => [...pins, newPin])
      );
      setSelectedCommentPinId(pinId);
      setPlacingComment(false);
    },
    [activeSlideId, commit]
  );

  const voteImage = useCallback((imageId: string, vote: ImageVote) => {
    commit((prev) => ({
      ...prev,
      images: prev.images.map((img) => {
        if (img.id !== imageId) return img;
        // Clicking the active vote again clears it
        const nextVote = img.clientVote === vote ? undefined : vote;
        return { ...img, clientVote: nextVote };
      }),
    }));
  }, [commit]);

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

  const deleteElement = useCallback((slideId: string, elementId: string) => {
    commit((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        slides: section.slides.map((slide) => {
          if (slide.id !== slideId) return slide;
          return {
            ...slide,
            elements: slide.elements.filter((el) => el.id !== elementId),
          };
        }),
      })),
    }));
    setSelectedElementId(null);
  }, [commit]);

  const restack = useCallback(
    (slideId: string, elementId: string, edge: 'front' | 'back') => {
      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            if (slide.id !== slideId) return slide;
            const zs = slide.elements.map((el) => el.zIndex);
            const target =
              edge === 'front' ? Math.max(...zs, 0) + 1 : Math.min(...zs, 0) - 1;
            return {
              ...slide,
              elements: slide.elements.map((el) =>
                el.id === elementId ? { ...el, zIndex: target } : el
              ),
            };
          }),
        })),
      }));
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
    setSelectedElementId(el.id);
  }, [activeSlide, activeSectionId, activeSlideId, commit]);

  const addSection = useCallback(
    (name: string, brief: string, icon?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newId = `section-${Date.now()}`;
      const firstSlideId = `slide-${newId}-1`;
      const newSection: Section = {
        id: newId,
        name: trimmed,
        icon: icon ?? inferSectionIcon(trimmed),
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
      commit((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
      setActiveSectionIdState(newId);
      setActiveSlideId(firstSlideId);
      setSelectedElementId(null);
      setSelectedCommentPinId(null);
      setPlacingComment(false);
    },
    [commit]
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
      commit((prev) => ({
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
    },
    [commit]
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      const remaining = boardRef.current.sections.filter((s) => s.id !== sectionId);
      if (remaining.length === 0) return;
      commit((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
        images: prev.images.filter((img) => img.sectionId !== sectionId),
      }));
      if (activeSectionId === sectionId) {
        const next = remaining[0];
        setActiveSectionIdState(next.id);
        setActiveSlideId(next.slides[0]?.id ?? '');
        setSelectedElementId(null);
        setSelectedCommentPinId(null);
        setPlacingComment(false);
      }
    },
    [activeSectionId, commit]
  );

  const addSlide = useCallback(() => {
    const newId = `slide-${activeSectionId}-${Date.now()}`;
    const newSlide: Slide = {
      id: newId,
      sectionId: activeSectionId,
      name: `Slide ${(activeSection?.slides.length ?? 0) + 1}`,
      elements: [],
      commentPins: [],
    };
    commit((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== activeSectionId) return section;
        return { ...section, slides: [...section.slides, newSlide] };
      }),
    }));
    setActiveSlideId(newId);
    setSelectedElementId(null);
    setSelectedCommentPinId(null);
  }, [activeSectionId, activeSection?.slides.length, commit]);

  const deleteSlide = useCallback(
    (slideId: string) => {
      if (!activeSection || activeSection.slides.length <= 1) return;
      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== activeSectionId) return section;
          const slides = section.slides.filter((s) => s.id !== slideId);
          return { ...section, slides };
        }),
      }));
      if (activeSlideId === slideId) {
        const remaining = activeSection.slides.filter((s) => s.id !== slideId);
        setActiveSlideId(remaining[0]?.id ?? '');
        setSelectedElementId(null);
        setSelectedCommentPinId(null);
      }
    },
    [activeSection, activeSectionId, activeSlideId, commit]
  );

  const duplicateSlide = useCallback(
    (slideId: string) => {
      const slide = activeSection?.slides.find((s) => s.id === slideId);
      if (!slide) return;
      const newId = `slide-${activeSectionId}-${Date.now()}`;
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
      commit((prev) => ({
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
    [activeSection, activeSectionId, commit]
  );

  const setSectionBrief = useCallback(
    (sectionId: string, text: string) => {
      commit((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId ? { ...section, visionBrief: text } : section
        ),
      }));
    },
    [commit]
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

  const selectSlideAtIndex = useCallback(
    (index: number) => {
      const slides = activeSection?.slides ?? [];
      const slide = slides[index];
      if (!slide) return;
      setActiveSlideId(slide.id);
      const imgEl = slide.elements.find((el) => el.type === 'image');
      if (imgEl && imgEl.type === 'image') {
        setSelectedElementId(imgEl.id);
      } else {
        setSelectedElementId(null);
      }
      setSelectedCommentPinId(null);
    },
    [activeSection]
  );

  const goToNextSlide = useCallback(() => {
    const slides = activeSection?.slides ?? [];
    const idx = slides.findIndex((s) => s.id === activeSlideId);
    if (idx < slides.length - 1) selectSlideAtIndex(idx + 1);
  }, [activeSection, activeSlideId, selectSlideAtIndex]);

  const goToPrevSlide = useCallback(() => {
    const slides = activeSection?.slides ?? [];
    const idx = slides.findIndex((s) => s.id === activeSlideId);
    if (idx > 0) selectSlideAtIndex(idx - 1);
  }, [activeSection, activeSlideId, selectSlideAtIndex]);

  const resolveComment = useCallback((pinId: string, commentId: string) => {
    commit((prev) => {
      const found = findPinInBoard(prev.sections, pinId);
      if (!found) return prev;
      return updateSlidePins(prev, found.slideId, (pins) =>
        pins.map((pin) => {
          if (pin.id !== pinId) return pin;
          return {
            ...pin,
            comments: updatePinComments(pin.comments, commentId, (c) => ({
              ...c,
              resolved: true,
              resolvedBy: 'Stephanie Chang',
            })),
          };
        })
      );
    });
  }, [commit]);

  const addComment = useCallback(
    (pinId: string, text: string) => {
      const newComment: Comment = {
        id: `c-${Date.now()}`,
        authorId: role === 'planner' ? '1' : '2',
        authorName: role === 'planner' ? 'Stephanie Chang' : 'Alexander Lee',
        authorInitials: role === 'planner' ? 'SC' : 'AL',
        text,
        timestamp: 'Just now',
      };

      commit((prev) => {
        const found = findPinInBoard(prev.sections, pinId);
        if (!found) return prev;
        return updateSlidePins(prev, found.slideId, (pins) =>
          pins.map((pin) =>
            pin.id === pinId
              ? { ...pin, comments: [...pin.comments, newComment] }
              : pin
          )
        );
      });
    },
    [role, commit]
  );

  const editComment = useCallback((pinId: string, commentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    commit((prev) => {
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
  }, [commit]);

  const reopenComment = useCallback(
    (pinId: string, commentId: string) => {
      commit((prev) => {
        const found = findPinInBoard(prev.sections, pinId);
        if (!found) return prev;
        return updateSlidePins(prev, found.slideId, (pins) =>
          pins.map((pin) =>
            pin.id === pinId
              ? {
                  ...pin,
                  comments: updatePinComments(pin.comments, commentId, (c) => ({
                    ...c,
                    resolved: false,
                    resolvedBy: undefined,
                  })),
                }
              : pin
          )
        );
      });
    },
    [commit]
  );

  const deleteComment = useCallback((pinId: string, commentId: string) => {
    commit((prev) => {
      const found = findPinInBoard(prev.sections, pinId);
      if (!found) return prev;
      return updateSlidePins(prev, found.slideId, (pins) =>
        pins
          .map((pin) =>
            pin.id === pinId
              ? { ...pin, comments: removePinComment(pin.comments, commentId) }
              : pin
          )
          // A thread with nothing left in it loses its pin too.
          .filter((pin) => pin.id !== pinId || pin.comments.length > 0)
      );
    });
  }, [commit]);

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

      setSelectedElementId(el.id);
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
    (url: string, tags: string[] = ['Uploaded']) => {
      if (!activeSlide || !activeSlideId) return;

      const imageId = `img-${Date.now()}`;
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

      setSelectedElementId(el.id);
    },
    [activeSlide, activeSlideId, activeSectionId, commit]
  );

  const cutSelection = useCallback(
    (writeClipboard: (text: string) => void): boolean => {
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
    window.addEventListener('cut', onCut);
    return () => window.removeEventListener('cut', onCut);
  }, [cutSelection]);

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
      setSelectedElementId(copy.id);
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
          addUploadedImage(URL.createObjectURL(file), ['Pasted']);
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
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addUploadedImage, addTextElement, insertElement]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);

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
        selectedElementId &&
        activeSlideId &&
        !typing
      ) {
        e.preventDefault();
        deleteElement(activeSlideId, selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, activeSlideId, deleteElement, undo, cutSelection]);

  return (
    <BoardContext.Provider
      value={{
        board,
        role,
        setRole,
        activeSectionId,
        setActiveSectionId,
        activeSlideId,
        setActiveSlideId,
        activeSlide,
        selectedElementId,
        selectedCommentPinId,
        selectedCommentPin,
        selectElement,
        selectCommentPin: selectCommentPinExclusive,
        isPlacingComment,
        setPlacingComment,
        placeCommentPin,
        voteImage,
        visionBrief,
        updateVisionBrief,
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
        canUndo: past.length > 0,
        pinSuggestion,
        refreshSuggestions,
        activeSectionName,
        updateElement,
        deleteElement,
        bringToFront,
        sendToBack,
        addTextElement,
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
