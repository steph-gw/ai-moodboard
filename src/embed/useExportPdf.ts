import { useCallback, useRef, useState } from 'react';

/**
 * PDF export, by printing an offscreen same-origin iframe.
 *
 * The app used to do this with a `@media print` block that hid every sibling of the export
 * sheet — fine when the app owned the page, fatal inside Bubble, where it would blank the
 * host's own chrome. An iframe owns its document outright, so nothing on the host page is
 * touched and no print stylesheet has to reach across into it.
 *
 * Deliberately not html2canvas + jsPDF: board images are cross-origin (S3, Unsplash), and
 * html2canvas silently renders blanks or taints the canvas without correct CORS headers on
 * every single one. The browser's own print engine has no such restriction, keeps text
 * vector and selectable, and adds no runtime dependencies.
 */

const RENDER_TIMEOUT_MS = 15_000;

export interface PdfExport {
  /** Where the export sheet should portal to, or null when not exporting. */
  target: HTMLElement | null;
  isExporting: boolean;
  exportPdf: () => Promise<void>;
}

export function useExportPdf(onError: (message: string) => void): PdfExport {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const cleanup = useCallback(() => {
    setTarget(null);
    setIsExporting(false);
    frameRef.current?.remove();
    frameRef.current = null;
  }, []);

  const exportPdf = useCallback(async () => {
    if (frameRef.current) return;
    setIsExporting(true);

    try {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;height:540px;border:0;';
      document.body.appendChild(frame);
      frameRef.current = frame;

      const doc = frame.contentDocument;
      if (!doc) throw new Error('Could not open a document to print into.');

      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8">${headTags()}</head><body class="gw-mb"></body></html>`);
      doc.close();

      // Handing React the iframe's body makes it a portal destination inside the existing
      // component tree, so the export sheet still sees board state and host context. A
      // separate React root would see neither.
      setTarget(doc.body);
      await nextPaint();

      await Promise.all([waitForImages(doc), doc.fonts?.ready].filter(Boolean));

      const win = frame.contentWindow;
      if (!win) throw new Error('The print window went away.');
      win.addEventListener('afterprint', cleanup, { once: true });
      // Some browsers never fire afterprint; don't leak the iframe if so.
      setTimeout(cleanup, 60_000);
      win.focus();
      win.print();
    } catch (err) {
      cleanup();
      onError(err instanceof Error ? err.message : 'Could not prepare the PDF.');
    }
  }, [cleanup, onError]);

  return { target, isExporting, exportPdf };
}

/**
 * Reuses the stylesheet the page already loaded rather than duplicating the export rules,
 * so a change to the canvas styling can't silently stop applying to the printed version.
 */
function headTags(): string {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
    .map((l) => `<link rel="stylesheet" href="${escapeAttr(l.href)}">`)
    .join('');

  return `${links}<style>
    /* 960x540 at 96dpi. Chrome ignores px page sizes on some platforms; inches it doesn't. */
    @page { size: 10in 5.625in; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; height: auto; overflow: visible; }
    /* The sheet is display:none in the app stylesheet, where it's only a hidden staging area. */
    .export-sheet { display: block !important; }
    .export-page { break-after: page; page-break-after: always; overflow: hidden; }
    .export-page:last-child { break-after: auto; page-break-after: auto; }
  </style>`;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}

/**
 * Waits for React to have rendered into the iframe.
 *
 * Races a frame against a timer rather than trusting rAF alone: a background tab never
 * paints, so an export started and then tab-switched would wait forever with the button
 * stuck on "Preparing…".
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 150);
  });
}

/**
 * Printing before the images have loaded is the commonest cause of a PDF full of blank
 * frames, so this waits for every one — but never forever.
 *
 * Deliberately does not call `img.decode()`. It reads like the right API, but in an
 * offscreen or hidden document Chrome never settles that promise, so the export hangs until
 * the timeout below rescues it. `complete && naturalWidth > 0` is the reliable signal.
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
        // A broken image shouldn't hold up the whole export.
        img.addEventListener('error', () => resolve(), { once: true });
      })
  );
  return Promise.race([
    Promise.all(settled).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, RENDER_TIMEOUT_MS)),
  ]);
}
