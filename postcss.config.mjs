import postcssImport from 'postcss-import';
import prefixSelector from 'postcss-prefix-selector';
import cssnano from 'cssnano';

const PREFIX = '.gw-mb';

/**
 * The app's stylesheet is global and unnamespaced (`.app`, `.canvas`, `.modal-overlay`),
 * so dropped into a Bubble page as-is it would collide with the host's styles in both
 * directions. Every selector gets scoped under .gw-mb at build time.
 *
 * src/styles/embed.css is deliberately NOT part of this pipeline — build.mjs concatenates
 * it ahead of the output, because its selectors already carry the prefix.
 */
export default {
  plugins: [
    postcssImport(),
    prefixSelector({
      prefix: PREFIX,
      transform(prefix, selector, prefixedSelector) {
        // `:root` holds every design token. Prefixing rather than replacing would
        // produce `.gw-mb :root`, which matches nothing — and every colour in the
        // app would silently fall back to browser defaults.
        if (selector === ':root' || selector === 'html' || selector === 'body') return prefix;
        if (selector.startsWith(':root')) return selector.replace(':root', prefix);
        return prefixedSelector;
      },
    }),
    cssnano({ preset: 'default' }),
  ],
};
