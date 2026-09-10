/**
 * Relative time for comment timestamps.
 *
 * The seed data carries pre-written strings like "2 days ago", and real rows carry an ISO
 * `Created Date`. Anything that doesn't parse is passed through unchanged, so both work
 * without the drawer needing to know which it has.
 */
export function formatTimestamp(value: string): string {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return value;

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Past a week the exact day is more use than the count of weeks.
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
