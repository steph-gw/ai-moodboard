import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * PDF export: print the page itself, with a print stylesheet that hides everything except
 * the export sheet.
 *
 * This is the original approach, restored. It was briefly replaced with a printed iframe
 * because `body > *:not(...) { display: none }` looked like it would blank Bubble's own
 * page — but that rule lives inside `@media print`, so it only applies while printing,
 * which is precisely when everything but the slides *should* be hidden. The iframe version
 * also silently lost the page size: Chrome takes `@page` from the top-level document, so
 * every slide came out on portrait Letter with its right-hand side clipped.
 *
 * The print rules live in embed.css, which is concatenated unprefixed — `body > *` must not
 * be rewritten to `.gw-mb body > *` by the scoping pass.
 */

const RENDER_TIMEOUT_MS = 15_000;
/** Marks the one body child the print stylesheet keeps visible. */
export const EXPORT_ROOT_CLASS = 'gw-mb-export';

export interface PdfExport {
  /** Where the export sheet should portal to, or null when not exporting. */
  target: HTMLElement | null;
  isExporting: boolean;
  exportPdf: () => Promise<void>;
}

export function useExportPdf(onError: (message: string) => void): PdfExport {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const hostRef = useRef<HTMLElement | null>(null);

  const cleanup = useCallback(() => {
    setTarget(null);
    setIsExporting(false);
    hostRef.current?.remove();
    hostRef.current = null;
  }, []);

  // afterprint fires on the window, and print() blocks, so the listener has to be in place
  // before the dialog opens rather than registered around the call.
  useEffect(() => {
    const onAfterPrint = () => {
      if (hostRef.current) cleanup();
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, [cleanup]);

  const exportPdf = useCallback(async () => {
    if (hostRef.current) return;
    setIsExporting(true);

    try {
      // A direct child of body, so the print stylesheet's `body > *` rule can single it
      // out. It carries .gw-mb too, or none of the app's styles would match inside it.
      const host = document.createElement('div');
      host.className = `gw-mb ${EXPORT_ROOT_CLASS}`;
      document.body.appendChild(host);
      hostRef.current = host;

      setTarget(host);
      await nextPaint();
      await Promise.all([waitForImages(document), document.fonts?.ready].filter(Boolean));
      // Loaded is not the same as ready to draw. decode() forces the work that the print
      // renderer would otherwise do while capturing the page, and waits for it — which is
      // what keeps a large photograph from printing as an empty frame. It only settles for
      // a rendered image, which is why the sheet is parked on screen at almost no opacity
      // rather than display: none.
      await decodeImages(host);

      window.print();
      // Some browsers never fire afterprint; don't leave the sheet in the DOM if so.
      setTimeout(() => {
        if (hostRef.current) cleanup();
      }, 1000);
    } catch (err) {
      cleanup();
      onError(err instanceof Error ? err.message : 'Could not prepare the PDF.');
    }
  }, [cleanup, onError]);

  return { target, isExporting, exportPdf };
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    // A background tab never paints, so don't wait on a frame alone.
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 150);
  });
}

/**
 * Printing before the images have loaded is the commonest cause of a PDF full of blank
 * frames. Deliberately does not use `img.decode()` — it reads like the right API, but
 * Chrome never settles that promise for an offscreen document.
 */
function waitForImages(doc: Document): Promise<void> {
  const settled = [...doc.images].map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      })
  );
  return Promise.race([
    Promise.all(settled).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, RENDER_TIMEOUT_MS)),
  ]);
}

/**
 * Decode every image in the export sheet before printing.
 *
 * Raced against the same timeout as loading: one picture that will not decode is not worth
 * a PDF nobody gets. An image that rejects is skipped rather than failing the export — it
 * would have printed blank either way, and the other slides are still worth having.
 */
function decodeImages(root: HTMLElement): Promise<void> {
  const decoded = [...root.querySelectorAll('img')].map((img) =>
    img.decode ? img.decode().catch(() => undefined) : Promise.resolve()
  );
  return Promise.race([
    Promise.all(decoded).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, RENDER_TIMEOUT_MS)),
  ]);
}
