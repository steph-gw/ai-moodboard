/**
 * Emits the built-in sample board as plain rows, for seeding the Gatherwise system
 * template in Bubble.
 *
 * Generated from the same `mockBoard` the dev harness renders, rather than typed out by
 * hand: the point of the system template is that a new moodboard opens looking like the
 * default view, and two hand-maintained copies of that would drift the first time either
 * changed.
 *
 * Ids here are local keys only, used to wire slides to their images. Whoever imports it
 * mints real Bubble ids and rewrites the references.
 */
import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

const bundled = await esbuild.build({
  stdin: {
    contents: `import { mockBoard } from './src/data/mockData';\nexport { mockBoard };`,
    resolveDir: '.',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  jsx: 'automatic',
  target: 'es2022',
});

const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);
const board = mod.mockBoard;

const images = board.images.map((img) => ({ key: img.id, url: img.url }));

const sections = board.sections.map((section, i) => ({
  name: section.name,
  icon: section.icon,
  order: i,
  visionBrief: section.visionBrief ?? '',
  slides: section.slides.map((slide, j) => ({
    name: slide.name,
    order: j,
    // Comment pins are deliberately dropped: a template carries what the board looked
    // like, never what was said about it.
    content: { elements: slide.elements, background: slide.background },
  })),
}));

mkdirSync('dist', { recursive: true });
const payload = {
  name: 'Gatherwise starter',
  visionBrief: board.visionBrief,
  palette: board.palette,
  images,
  sections,
};
writeFileSync('dist/system-template.json', JSON.stringify(payload));

const slides = sections.reduce((n, s) => n + s.slides.length, 0);
console.log(`sections ${sections.length}  slides ${slides}  images ${images.length}  bytes ${JSON.stringify(payload).length}`);
