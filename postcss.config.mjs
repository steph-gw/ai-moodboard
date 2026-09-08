import postcssImport from 'postcss-import';
import cssnano from 'cssnano';

// Namespacing under .gw-mb lands in phase 3; for now this only inlines the
// @import of tokens.css and minifies, so the bundled CSS is byte-equivalent
// in behaviour to what Next was serving.
export default {
  plugins: [postcssImport(), cssnano({ preset: 'default' })],
};
