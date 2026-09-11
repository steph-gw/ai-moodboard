import type { Comment, CommentPin, Slide } from '../types';

export function countPinComments(pin: CommentPin): number {
  return pin.comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  );
}

export function countOpenPinThreads(slides: Slide[]): number {
  let count = 0;
  for (const slide of slides) {
    for (const pin of slide.commentPins) {
      const hasOpen = pin.comments.some((c) => !c.resolved);
      if (hasOpen) count += 1;
    }
  }
  return count;
}

export function isPinResolved(pin: CommentPin): boolean {
  if (pin.comments.length === 0) return false;
  return pin.comments.every((c) => c.resolved);
}

export function findPinInBoard(
  sections: { slides: Slide[] }[],
  pinId: string
): { slideId: string; pin: CommentPin } | null {
  for (const section of sections) {
    for (const slide of section.slides) {
      const pin = slide.commentPins.find((p) => p.id === pinId);
      if (pin) return { slideId: slide.id, pin };
    }
  }
  return null;
}

export function updatePinComments(
  comments: Comment[],
  commentId: string,
  updater: (c: Comment) => Comment
): Comment[] {
  return comments.map((c) => {
    if (c.id === commentId) return updater(c);
    if (c.replies) {
      return { ...c, replies: updatePinComments(c.replies, commentId, updater) };
    }
    return c;
  });
}

/** Removes a comment (or reply) anywhere in a thread. */
export function removePinComment(comments: Comment[], commentId: string): Comment[] {
  return comments
    .filter((c) => c.id !== commentId)
    .map((c) =>
      c.replies ? { ...c, replies: removePinComment(c.replies, commentId) } : c
    );
}

/**
 * Sets resolution on every comment in a thread.
 *
 * Bubble stores `Resolved?` once, on the thread. The local model stores it per comment, and
 * `isPinResolved` asks whether they all are — so the two agree as long as a thread's
 * comments are only ever flipped together.
 */
export function markResolved(
  comments: Comment[],
  resolved: boolean,
  resolvedBy: string
): Comment[] {
  return comments.map((c) => ({
    ...c,
    resolved,
    resolvedBy: resolved ? resolvedBy : undefined,
    replies: c.replies ? markResolved(c.replies, resolved, resolvedBy) : c.replies,
  }));
}

/**
 * Puts the current comment pins onto a board restored from an undo snapshot.
 *
 * Undo rewinds the canvas; comments are their own rows in Bubble and were written the
 * moment they were made. Without this, undoing past a comment would take it off the screen
 * while it sat in the database, and the next load would put it back — an undo that undoes
 * itself. Slides that no longer exist are simply not visited.
 */
export function withLivePins<T extends { sections: { slides: Slide[] }[] }>(
  restored: T,
  live: T
): T {
  const pins = new Map<string, Slide['commentPins']>();
  for (const section of live.sections) {
    for (const slide of section.slides) pins.set(slide.id, slide.commentPins);
  }
  return {
    ...restored,
    sections: restored.sections.map((section) => ({
      ...section,
      slides: section.slides.map((slide) => {
        const current = pins.get(slide.id);
        return current && current !== slide.commentPins
          ? { ...slide, commentPins: current }
          : slide;
      }),
    })),
  };
}

/**
 * One running number per pin across the whole board, in the order the pins were made.
 *
 * Numbering by position — section, then slide, then pin — meant adding a pin to an early
 * slide renumbered everything after it, so a pin you had been calling 7 silently became 8.
 * Creation order is stable against that: a new pin is always the highest number there is,
 * wherever on the board it lands.
 */
export function buildPinNumbers(board: {
  sections: { slides: { commentPins: { id: string; createdAt?: string }[] }[] }[];
}): Map<string, number> {
  const all = board.sections.flatMap((section) =>
    section.slides.flatMap((slide) => slide.commentPins)
  );
  all.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const numbers = new Map<string, number>();
  all.forEach((pin, i) => numbers.set(pin.id, i + 1));
  return numbers;
}
