const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats an ISO date (YYYY-MM-DD) as "Jun 14, 2025". Parsed by hand rather
 * than via Date so the result never shifts with the viewer's timezone or
 * differs between the server and client render.
 */
export function formatEventDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  const label = MONTHS[Number(month) - 1];
  if (!label) return iso;
  return `${label} ${Number(day)}, ${year}`;
}

/**
 * Formats whatever ended up in a section's approval date as "8 Sep 2025".
 *
 * It has three possible shapes: a short label the app wrote itself ("8 Sep"), a plain ISO
 * date, or a full ISO timestamp coming back from Bubble. The timestamp is the one that
 * matters — printed raw it reads as machine output in the middle of a sentence.
 */
export function formatApprovalDate(value: string): string {
  const text = value.trim();
  if (!text) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    const [, year, month, day] = iso;
    const label = MONTHS[Number(month) - 1];
    if (label) return `${Number(day)} ${label} ${year}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getDate()} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }
  // Already a human label like "8 Sep" — leave it alone rather than mangle it.
  return text;
}
