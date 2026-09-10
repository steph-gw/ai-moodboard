/**
 * Initials for an avatar, from a display name.
 *
 * Takes the first letter of the first and last words, so "Mary-Jane van der Berg" gives MB
 * rather than MV — the particles in the middle are not what anyone would write down. Falls
 * back to the first two characters of a single word, and to nothing at all when the name is
 * empty: a blank avatar reads better than a stray "?".
 */
export function initialsFrom(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return [...words[0]].slice(0, 2).join('').toUpperCase();
  return ([...words[0]][0] + [...words[words.length - 1]][0]).toUpperCase();
}
