/**
 * Shrinks an oversized image in the browser before it is uploaded.
 *
 * A photo straight off a phone is routinely 4000px wide and several megabytes; on a slide
 * it is drawn at a few hundred pixels. Uploading the original costs the planner's
 * bandwidth, Bubble's storage, and every future viewer's load time, to show detail no
 * screen in this app can display.
 *
 * Anything already small enough is returned untouched — re-encoding a small image only
 * loses quality. So are formats where a re-encode would be wrong: a GIF would lose its
 * animation, and an SVG has no pixels to resample.
 */
const MAX_EDGE = 2400;
const MAX_BYTES = 1_500_000;
const QUALITY = 0.85;
/** Never re-encode these, whatever their size. */
const PASSTHROUGH = ['image/gif', 'image/svg+xml'];

export async function compressImage(file: File): Promise<File> {
  if (PASSTHROUGH.includes(file.type)) return file;
  if (file.size <= MAX_BYTES) return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ('close' in bitmap) bitmap.close();

    // Format is chosen by what the image actually contains, not by what it arrived as. A
    // photo saved as PNG is the common oversized upload and is many times smaller as JPEG
    // — but JPEG has no alpha channel, so anything transparent would come back with a
    // black background. Ask the pixels.
    const type = hasTransparency(ctx, width, height) ? 'image/png' : 'image/jpeg';
    const blob = await toBlob(canvas, type, QUALITY);
    // Flat-colour images can come out bigger after a re-encode; keep whichever wins.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], renameFor(file.name, type), { type, lastModified: Date.now() });
  } catch {
    // Compression is an optimisation. If anything about it fails — a corrupt file, a
    // browser without createImageBitmap — upload what the user actually chose.
    return file;
  }
}

/**
 * Every pixel's alpha, not a sample: a logo with one transparent corner is exactly the
 * case that a sampled check misses and that JPEG ruins. One pass over the already
 * downscaled canvas costs a few milliseconds.
 */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renameFor(name: string, type: string): string {
  const ext = type === 'image/png' ? 'png' : 'jpg';
  const stem = name.replace(/\.[^.]+$/, '') || 'image';
  return `${stem}.${ext}`;
}
