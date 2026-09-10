import type { TextFontFamily } from '../types';

/**
 * Fetches an optional web font the first time something on the board asks for it.
 *
 * The board's own two are in the host page's stylesheet because every board uses them. The
 * other seven are a menu: loading all of them up front costs every viewer a few hundred
 * kilobytes to render type they will mostly never see, and inside Bubble that lands on the
 * same page load as the app itself.
 *
 * Requests are made once per family per page, and a failure is left alone — a font that
 * doesn't arrive falls back through its stack, which is exactly what should happen.
 */
const GOOGLE: Partial<Record<TextFontFamily, string>> = {
  inter: 'Inter:wght@300..700',
  roboto: 'Roboto:ital,wght@0,300..700;1,300..700',
  openSans: 'Open+Sans:ital,wght@0,300..700;1,300..700',
  montserrat: 'Montserrat:ital,wght@0,300..700;1,300..700',
  poppins: 'Poppins:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500',
  lato: 'Lato:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700',
  lora: 'Lora:ital,wght@0,400..700;1,400..700',
};

const requested = new Set<TextFontFamily>();

export function loadFont(family: TextFontFamily): void {
  const spec = GOOGLE[family];
  if (!spec || requested.has(family)) return;
  requested.add(family);

  // Appended to the host document, not the mount root: a stylesheet has to be in a
  // document's head to apply, and @font-face is document-wide anyway.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

/** Loads every family a board already uses, so stored text renders correctly on arrival. */
export function loadFontsFor(families: Iterable<TextFontFamily>): void {
  for (const family of families) loadFont(family);
}
