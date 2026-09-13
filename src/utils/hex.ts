/**
 * Reads text as a color, or returns null.
 *
 * Someone pasting a hex passes through "#", "#F", "#F6" on the way to "#F6EFE0", and a
 * field that rejected or rewrote those would fight the typing. Callers keep the text and
 * use this to decide whether it means anything yet.
 */
export function readHex(text: string): string | null {
  const t = text.trim().replace(/^#*/, '');
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  // Shorthand, as pasted from most design tools: #abc means #aabbcc.
  if (/^[0-9a-f]{3}$/i.test(t)) {
    return `#${t
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  return null;
}
