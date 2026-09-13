import type { TextFontFamily } from '../types';

/**
 * The fonts a text element can use.
 *
 * `sans` and `display` are the board's own two and are named for their role, so a board
 * that later changes its brand typefaces re-renders without touching stored elements. The
 * rest are stored by name, since they mean nothing but themselves.
 *
 * Every family here has to be in the stylesheet the host page loads — see
 * bubble/element_headers.html and dev/index.html. A family listed but not loaded silently
 * falls back to the stack's last resort, which looks like a bug in the picker.
 */
export const TEXT_FONT_OPTIONS: { value: TextFontFamily; label: string; css: string }[] = [
  { value: 'sans', label: 'DM Sans', css: 'var(--font-sans)' },
  { value: 'display', label: 'Playfair Display', css: 'var(--font-display)' },
  { value: 'inter', label: 'Inter', css: "'Inter', system-ui, sans-serif" },
  { value: 'roboto', label: 'Roboto', css: "'Roboto', system-ui, sans-serif" },
  { value: 'openSans', label: 'Open Sans', css: "'Open Sans', system-ui, sans-serif" },
  { value: 'montserrat', label: 'Montserrat', css: "'Montserrat', system-ui, sans-serif" },
  { value: 'poppins', label: 'Poppins', css: "'Poppins', system-ui, sans-serif" },
  { value: 'lato', label: 'Lato', css: "'Lato', system-ui, sans-serif" },
  { value: 'lora', label: 'Lora', css: "'Lora', Georgia, serif" },
];

export function textFontCss(family: TextFontFamily): string {
  return TEXT_FONT_OPTIONS.find((o) => o.value === family)?.css ?? TEXT_FONT_OPTIONS[0].css;
}

/**
 * Letter spacing as CSS, in em.
 *
 * em rather than px so it scales with the type: the artboard is drawn at whatever size
 * fits the window, and spacing set in px would tighten as the slide shrank. Undefined and
 * zero both come back as `normal`, which is the font's own spacing rather than a flat 0.
 */
export function letterSpacingCss(em?: number): string | undefined {
  return em ? `${em}em` : undefined;
}
