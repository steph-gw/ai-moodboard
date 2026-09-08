/**
 * Thin wrappers around the Fullscreen API. Requests can be rejected (embedded
 * frames without `allowfullscreen`, or a stale user gesture), so every call
 * resolves quietly and callers fall back to the in-page overlay.
 */
export function isFullscreen(): boolean {
  return document.fullscreenElement !== null;
}

export async function requestFullscreen(): Promise<boolean> {
  const el = document.documentElement;
  if (!el.requestFullscreen || isFullscreen()) return isFullscreen();
  try {
    await el.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen() || !document.exitFullscreen) return;
  try {
    await document.exitFullscreen();
  } catch {
    /* already left fullscreen */
  }
}
