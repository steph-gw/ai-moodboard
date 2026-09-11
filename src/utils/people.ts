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
  // Not `?? []`: a host that sends something other than an array sends an object, which
  // survives ?? and then fails on the first array method. Bubble does exactly this — a
  // list property is a list object, not an array — and the board died on it.
  const idList = Array.isArray(ids) ? ids : [];
  const nameList = Array.isArray(names) ? names : [];
  const photoList = Array.isArray(photos) ? photos : [];
  idList.forEach((rawId, i) => {
    const id = String(rawId).trim();
    if (!id) return;
    const name = String(nameList[i] ?? '').trim();
    const photo = String(photoList[i] ?? '').trim();
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
