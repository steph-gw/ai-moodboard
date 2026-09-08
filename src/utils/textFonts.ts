import type { TextFontFamily } from '../types';

export const TEXT_FONT_OPTIONS: { value: TextFontFamily; label: string; css: string }[] = [
  {
    value: 'sans',
    label: 'Body — DM Sans',
    css: 'var(--font-sans)',
  },
  {
    value: 'display',
    label: 'Title — Playfair',
    css: 'var(--font-display)',
  },
];

export function textFontCss(family: TextFontFamily): string {
  return TEXT_FONT_OPTIONS.find((o) => o.value === family)?.css ?? TEXT_FONT_OPTIONS[0].css;
}
