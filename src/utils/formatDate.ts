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
 * Formats a section's approval date as "Jul 7, 2026" — the same shape as formatEventDate,
 * because both are dates read in a sentence.
 *
 * The value arrives in one of three shapes: a full ISO timestamp from Bubble (the normal
 * case — the field is a date), a plain ISO date, or a bare label written by an older build.
 * A date with no time is parsed by hand rather than through Date, which would read it as
 * UTC midnight and show the day before to anyone west of Greenwich. A timestamp is read in
 * the viewer's own timezone, which is the day they mean.
 */
export function formatApprovalDate(value: string): string {
  const text = value.trim();
  if (!text) return '';

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) return formatEventDate(text);

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const label = MONTHS[parsed.getMonth()];
    if (label) return `${label} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  }

  // Something we do not recognise — show it as it is rather than mangle it.
  return text;
}
