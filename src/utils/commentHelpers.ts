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
