import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import postcssConfig from './postcss.config.mjs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const dev = process.argv.includes('--dev');
const outDir = dev ? 'dev' : 'dist';

/**
 * The bundle is loaded by a <script> tag in a Bubble page header, so it has to be a
 * self-contained IIFE with React inlined — Bubble gives us no module loader.
 */
const options = {
  entryPoints: [dev ? 'src/embed/dev.tsx' : 'src/embed/index.ts'],
  outfile: `${outDir}/gw-moodboard.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2019'],
  jsx: 'automatic',
  minify: !dev,
  sourcemap: dev ? 'inline' : 'external',
  legalComments: 'none',
  loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  define: {
    // Without this React ships its dev build and throws "process is not defined" in Bubble.
    'process.env.NODE_ENV': dev ? '"development"' : '"production"',
    __GW_VERSION__: JSON.stringify(pkg.version),
  },
  // The 'use client' directives are Next-only leftovers and mean nothing here.
  logOverride: { 'ignored-directive': 'silent' },
};

async function buildCss() {
  const src = readFileSync('src/styles/app.css', 'utf8');
  const result = await postcss(postcssConfig.plugins).process(src, {
    from: 'src/styles/app.css',
    to: `${outDir}/gw-moodboard.css`,
  });

  // Guard against the prefixer silently mangling :root — if the tokens stop landing
  // on .gw-mb, every colour in the app falls back to a browser default and the build
  // looks catastrophically wrong at runtime rather than failing here.
  if (!/\.gw-mb\{[^}]*--content-bg:/.test(result.css)) {
    throw new Error('CSS build: design tokens are not scoped to .gw-mb — check the prefixer transform');
  }

  // embed.css is prepended unprefixed: its selectors already carry .gw-mb, and running
  // it through the prefixer would double them up (.gw-mb .gw-mb).
  const wrapper = readFileSync('src/styles/embed.css', 'utf8');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/gw-moodboard.css`, `${wrapper}\n${result.css}\n`);
}

if (dev) {
  await buildCss();
  const ctx = await esbuild.context({
    ...options,
    plugins: [
      {
        name: 'rebuild-css',
        setup(build) {
          build.onEnd(async () => {
            await buildCss().catch((err) => console.error(String(err)));
          });
        },
      },
    ],
  });
  await ctx.watch();
  // CSS isn't in esbuild's graph, so watch it ourselves.
  const { watch } = await import('node:fs');
  let pending;
  watch('src/styles', { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => buildCss().catch((err) => console.error(String(err))), 50);
  });
  const { hosts, port } = await ctx.serve({ servedir: 'dev', port: 8000 });
  console.log(`gw-moodboard dev → http://${hosts[0]}:${port}`);
} else {
  await buildCss();
  await esbuild.build(options);
  console.log('built dist/gw-moodboard.js + dist/gw-moodboard.css');
}
