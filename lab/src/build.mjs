// Builds the site: index.html (CSS inlined) + assets/app-*.js, with the 3D game split into its own chunk
// so phones paint the page before downloading the engine.
//   npm run build   → ../index.html + ../assets/
import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const OUT = join(ROOT, 'assets');
const CSS = ['src/styles/tokens.css', 'src/styles/site.css', 'src/styles/play.css', 'src/styles/comic.css'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const result = await build({
  entryPoints: { app: join(here, 'src/main.jsx') },
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: OUT,
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  minify: true,
  jsx: 'automatic', // REQUIRED: classic transform → "React is not defined"
  define: { 'process.env.NODE_ENV': '"production"' },
  target: ['es2020'],
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
});
const entry = Object.keys(result.metafile.outputs).find((f) => basename(f).startsWith('app-') && f.endsWith('.js'));
const css = CSS.map((f) => readFileSync(join(here, f), 'utf8')).join('\n');
const tpl = readFileSync(join(here, 'template.html'), 'utf8');
if (!tpl.includes('/*__CSS__*/') || !tpl.includes('__ENTRY__')) throw new Error('template placeholders missing');
const html = tpl.split('/*__CSS__*/').join(css).split('__ENTRY__').join('./assets/' + basename(entry));
writeFileSync(join(ROOT, 'index.html'), html);
for (const [f, o] of Object.entries(result.metafile.outputs)) console.log(`${basename(f).padEnd(28)} ${(o.bytes / 1024).toFixed(0).padStart(5)} KB`);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB (CSS inlined)`);
