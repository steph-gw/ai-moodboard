import { useSyncExternalStore } from 'react';
import { readHex } from './hex';

const MAX = 20;

/**
 * The colors chosen during this visit, newest first.
 *
 * Module scope on purpose: it is one list for every picker on the page — text color,
 * slide background, shape fill, palette rows — because "the color I just used" means the
 * same thing in all of them, and a per-component list would forget the moment a toolbar
 * closed.
 *
 * Deliberately not stored anywhere. It is a convenience for the next few minutes of work,
 * not a record of the board, and writing it would mean a database row per color picked.
 * Reloading starts a clean list, which is the right amount of memory for a scratch list.
 */
let recent: string[] = [];
const listeners = new Set<() => void>();

export function rememberColor(color: string): void {
  const hex = readHex(color);
  if (!hex) return;
  // Re-picking a color moves it to the front rather than adding it twice: the list is
  // "what I have been using", and repetition is what makes a color important, not noise.
  const next = [hex, ...recent.filter((c) => c !== hex)].slice(0, MAX);
  if (next.length === recent.length && next.every((c, i) => c === recent[i])) return;
  recent = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable between changes, so components re-render only when the list actually moves. */
function snapshot(): string[] {
  return recent;
}

export function useRecentColors(): string[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
