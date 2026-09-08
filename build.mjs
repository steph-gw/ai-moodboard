import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const dev = process.argv.includes('--dev');

/**
 * The bundle is loaded by a <script> tag in a Bubble page header, so it has to be a
 * self-contained IIFE with React inlined — Bubble gives us no module loader.
 */
const options = {
  entryPoints: [dev ? 'src/embed/dev.tsx' : 'src/embed/index.ts'],
  outfile: dev ? 'dev/gw-moodboard.js' : 'dist/gw-moodboard.js',
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

if (dev) {
  // Keep the stylesheet rebuilding alongside the JS.
  spawn('npx', ['postcss', 'src/styles/app.css', '-o', 'dev/gw-moodboard.css', '--watch'], {
    stdio: 'inherit',
    shell: false,
  });

  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: 'dev', port: 8000 });
  console.log(`gw-moodboard dev → http://${hosts[0]}:${port}`);
} else {
  await esbuild.build(options);
  console.log('built dist/gw-moodboard.js');
}
