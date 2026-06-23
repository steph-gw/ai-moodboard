import {
  createContext,
  useContext,
  useState,
  useCallback,
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
  Slide,
  UserRole,
} from '../types';
import { mockBoard, AI_VISION_BRIEF } from '../data/mockData';
import { defaultImageElement, defaultTextElement } from '../data/slideHelpers';
import { findPinInBoard, updatePinComments } from '../utils/commentHelpers';

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
  isPresenting: boolean;
  setPresenting: (value: boolean) => void;
  goToNextSlide: () => void;
  goToPrevSlide: () => void;
  resolveComment: (pinId: string, commentId: string) => void;
  addComment: (pinId: string, text: string) => void;
  pinSuggestion: (suggestionId: string) => void;
  refreshSuggestions: () => void;
  activeSectionName: string;
  updateElement: (slideId: string, elementId: string, patch: Partial<CanvasElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  addTextElement: () => void;
  addSlide: () => void;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  showSuggestionsPanel: boolean;
  setShowSuggestionsPanel: (show: boolean) => void;
  getImageById: (imageId: string) => BoardImage | undefined;
  addUploadedImage: (url: string) => void;
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
  const [role, setRole] = useState<UserRole>('planner');
  const [activeSectionId, setActiveSectionIdState] = useState('ceremony');
  const [activeSlideId, setActiveSlideId] = useState('slide-ceremony-1');
  const [selectedElementId, setSelectedElementId] = useState<string | null>('el-img-1');
  const [selectedCommentPinId, setSelectedCommentPinId] = useState<string | null>(null);
  const [isPlacingComment, setPlacingComment] = useState(false);
  const [visionBrief, setVisionBrief] = useState(board.visionBrief);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [isPresenting, setPresenting] = useState(false);

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  const activeSlide = activeSection?.slides.find((s) => s.id === activeSlideId) ?? null;
  const activeSectionName = activeSection?.name ?? '';

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

  const selectElement = useCallback(
    (elementId: string | null) => {
      setSelectedElementId(elementId);
    },
    []
  );

  const selectCommentPin = useCallback((pinId: string | null) => {
    setSelectedCommentPinId(pinId);
    if (pinId) setPlacingComment(false);
  }, []);

  const placeCommentPin = useCallback(
    (x: number, y: number) => {
      if (!activeSlideId) return;
      const pinId = `pin-${Date.now()}`;
      const newPin: CommentPin = { id: pinId, x, y, comments: [] };

      setBoard((prev) =>
        updateSlidePins(prev, activeSlideId, (pins) => [...pins, newPin])
      );
      setSelectedCommentPinId(pinId);
      setPlacingComment(false);
    },
    [activeSlideId]
  );

  const voteImage = useCallback((imageId: string, vote: ImageVote) => {
    setBoard((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === imageId ? { ...img, clientVote: vote } : img
      ),
    }));
  }, []);

  const updateElement = useCallback(
    (slideId: string, elementId: string, patch: Partial<CanvasElement>) => {
      setBoard((prev) => ({
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
    []
  );

  const deleteElement = useCallback((slideId: string, elementId: string) => {
    setBoard((prev) => ({
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
  }, []);

  const addTextElement = useCallback(() => {
    if (!activeSlide) return;
    const el = defaultTextElement();
    const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    el.zIndex = maxZ + 1;

    setBoard((prev) => ({
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
  }, [activeSlide, activeSectionId, activeSlideId]);

  const addSlide = useCallback(() => {
    const newId = `slide-${activeSectionId}-${Date.now()}`;
    const newSlide: Slide = {
      id: newId,
      sectionId: activeSectionId,
      name: `Slide ${(activeSection?.slides.length ?? 0) + 1}`,
      elements: [],
      commentPins: [],
    };
    setBoard((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== activeSectionId) return section;
        return { ...section, slides: [...section.slides, newSlide] };
      }),
    }));
    setActiveSlideId(newId);
    setSelectedElementId(null);
    setSelectedCommentPinId(null);
  }, [activeSectionId, activeSection?.slides.length]);

  const deleteSlide = useCallback(
    (slideId: string) => {
      if (!activeSection || activeSection.slides.length <= 1) return;
      setBoard((prev) => ({
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
    [activeSection, activeSectionId, activeSlideId]
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
      setBoard((prev) => ({
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
    [activeSection, activeSectionId]
  );

  const summarizeVision = useCallback(() => {
    setIsSummarizing(true);
    setTimeout(() => {
      setVisionBrief(AI_VISION_BRIEF);
      setIsSummarizing(false);
    }, 1200);
  }, []);

  const updateVisionBrief = useCallback((text: string) => {
    setVisionBrief(text.trim());
  }, []);

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
    setBoard((prev) => {
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
              resolvedBy: 'Sophie Clarke',
            })),
          };
        })
      );
    });
  }, []);

  const addComment = useCallback(
    (pinId: string, text: string) => {
      const newComment: Comment = {
        id: `c-${Date.now()}`,
        authorId: role === 'planner' ? '1' : '2',
        authorName: role === 'planner' ? 'Sophie Clarke' : 'Anna Linden',
        authorInitials: role === 'planner' ? 'SC' : 'AL',
        text,
        timestamp: 'Just now',
      };

      setBoard((prev) => {
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
    [role]
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

      setBoard((prev) => ({
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
    [board.suggestions, activeSectionId, activeSlide, activeSlideId]
  );

  const refreshSuggestions = useCallback(() => {
    const extras = [
      {
        id: `s-${Date.now()}-1`,
        url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=300&h=220&fit=crop',
        alt: 'Elegant table setting',
      },
      {
        id: `s-${Date.now()}-2`,
        url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300&h=220&fit=crop',
        alt: 'Outdoor ceremony chairs',
      },
      {
        id: `s-${Date.now()}-3`,
        url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=220&fit=crop',
        alt: 'Reception lighting',
      },
      {
        id: `s-${Date.now()}-4`,
        url: 'https://images.unsplash.com/photo-1529636798458-921d0896c4ca?w=300&h=220&fit=crop',
        alt: 'Bridal bouquet close-up',
      },
    ];
    setBoard((prev) => ({ ...prev, suggestions: extras }));
  }, []);

  const addUploadedImage = useCallback(
    (url: string) => {
      if (!activeSlide || !activeSlideId) return;

      const imageId = `img-${Date.now()}`;
      const newImage: BoardImage = {
        id: imageId,
        sectionId: activeSectionId,
        url,
        tags: ['Uploaded'],
      };

      const maxZ = activeSlide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const el = defaultImageElement(imageId, maxZ + 1);

      setBoard((prev) => ({
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
    [activeSlide, activeSlideId, activeSectionId]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedElementId &&
        activeSlideId &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLInputElement) &&
        !(document.activeElement?.getAttribute('contenteditable') === 'true')
      ) {
        e.preventDefault();
        deleteElement(activeSlideId, selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, activeSlideId, deleteElement]);

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
        selectCommentPin,
        isPlacingComment,
        setPlacingComment,
        placeCommentPin,
        voteImage,
        visionBrief,
        updateVisionBrief,
        summarizeVision,
        isSummarizing,
        isPresenting,
        setPresenting,
        goToNextSlide,
        goToPrevSlide,
        resolveComment,
        addComment,
        pinSuggestion,
        refreshSuggestions,
        activeSectionName,
        updateElement,
        deleteElement,
        addTextElement,
        addSlide,
        deleteSlide,
        duplicateSlide,
        showSuggestionsPanel,
        setShowSuggestionsPanel,
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
