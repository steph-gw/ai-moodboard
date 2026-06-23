import type { TextFontFamily } from '../types';

export const TEXT_FONT_OPTIONS: { value: TextFontFamily; label: string; css: string }[] = [
  {
    value: 'sans',
    label: 'Sans',
    css: "var(--font-sans), 'DM Sans', sans-serif",
  },
  {
    value: 'serif',
    label: 'Serif',
    css: "var(--font-body-serif), 'Spectral', serif",
  },
  {
    value: 'display',
    label: 'Display',
    css: "var(--font-serif), 'Playfair Display', serif",
  },
];

export function textFontCss(family: TextFontFamily): string {
  return TEXT_FONT_OPTIONS.find((o) => o.value === family)?.css ?? TEXT_FONT_OPTIONS[0].css;
}
