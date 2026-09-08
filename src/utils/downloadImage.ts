/**
 * Saves a canvas image to the user's machine. Fetches the bytes so the file
 * lands in Downloads rather than just navigating; if the host blocks the
 * cross-origin read, falls back to opening the image in a new tab.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Builds a readable filename from an image URL and the section it belongs to. */
export function imageFilename(url: string, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ext = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.exec(url)?.[1] ?? 'jpg';
  return `${slug || 'image'}.${ext.toLowerCase()}`;
}
