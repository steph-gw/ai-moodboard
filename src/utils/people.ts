import type { Viewer } from '../types';
import { initialsFrom } from './initials';

/**
 * Zips the host's three parallel collaborator lists into people.
 *
 * Bubble can produce `:each item's User's unique id` and the same for name and photo, but
 * it cannot join them per item — so they arrive as three lists that line up by index.
 * Names and photos are optional and may be shorter than the ids; an id with nothing
 * alongside it still yields a person, because a comment by them still has to render.
 */
export function parsePeople(
  ids: string[] | undefined,
  names: string[] | undefined,
  photos: string[] | undefined
): Map<string, Viewer> {
  const people = new Map<string, Viewer>();
  (ids ?? []).forEach((rawId, i) => {
    const id = String(rawId).trim();
    if (!id) return;
    const name = String(names?.[i] ?? '').trim();
    const photo = String(photos?.[i] ?? '').trim();
    people.set(id, {
      id,
      name: name || 'Someone',
      initials: initialsFrom(name),
      // Bubble hands back protocol-relative //s3… URLs from file fields.
      photoUrl: photo ? (photo.startsWith('//') ? `https:${photo}` : photo) : undefined,
    });
  });
  return people;
}
