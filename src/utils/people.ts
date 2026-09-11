import type { Viewer } from '../types';
import { initialsFrom } from './initials';

/**
 * Parses the host's collaborator list.
 *
 * Format is `id|name|photoUrl`, one person per entry, because Bubble's list-of-texts field
 * is the only list shape a plugin property can take — there is no object list. Anything
 * malformed is skipped rather than thrown on: a bad row in the host's expression should
 * cost one avatar, not the whole board.
 */
export function parsePeople(entries: string[] | undefined): Map<string, Viewer> {
  const people = new Map<string, Viewer>();
  for (const entry of entries ?? []) {
    const [id, name = '', photoUrl = ''] = String(entry).split('|');
    if (!id) continue;
    people.set(id, {
      id,
      name: name.trim() || 'Someone',
      initials: initialsFrom(name),
      // Bubble hands back protocol-relative //s3… URLs in some places.
      photoUrl: photoUrl ? (photoUrl.startsWith('//') ? `https:${photoUrl}` : photoUrl) : undefined,
    });
  }
  return people;
}
