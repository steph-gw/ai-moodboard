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
