import type { Viewer } from '../types';
import { initialsFrom } from './initials';

/**
 * A host list that isn't an array.
 *
 * Bubble hands a list property over as an object with `.length()` and `.get(from, count)`,
 * not as a JS array. The plugin's update code converts it, but the bundle accepts both
 * rather than trusting it to: the failure mode when it doesn't is the whole board dying on
 * the first array method, and the dev harness — which passes this shape on purpose —
 * would otherwise be testing a path production doesn't take.
 */
interface HostList {
  length: () => number;
  get: (from: number, count: number) => unknown[];
}

function isHostList(value: unknown): value is HostList {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<HostList>;
  return typeof candidate.length === 'function' && typeof candidate.get === 'function';
}

/** Normalises whatever the host sent into a plain array of strings. */
export function toStringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : isHostList(value) ? value.get(0, value.length()) : [];
  return raw.map((entry) => String(entry ?? ''));
}

/**
 * Zips the host's three parallel collaborator lists into people.
 *
 * Bubble can produce `:each item's User's unique id` and the same for name and photo, but
 * it cannot join them per item — so they arrive as three lists that line up by index.
 * Names and photos are optional and may be shorter than the ids; an id with nothing
 * alongside it still yields a person, because a comment by them still has to render.
 */
export function parsePeople(ids: unknown, names: unknown, photos: unknown): Map<string, Viewer> {
  const people = new Map<string, Viewer>();
  const idList = toStringList(ids);
  const nameList = toStringList(names);
  const photoList = toStringList(photos);

  idList.forEach((rawId, i) => {
    const id = rawId.trim();
    if (!id) return;
    const name = (nameList[i] ?? '').trim();
    const photo = (photoList[i] ?? '').trim();
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
