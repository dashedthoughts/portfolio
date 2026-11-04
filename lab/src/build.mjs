// Builds lab/index.html: ONE self-contained file (CSS + JS inlined), same deploy model as the live site.
//   npm run build          → ../index.html
//   npm run dev            → rebuild on change (open ../index.html via any static server)
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'index.html');
const CSS = ['src/styles/tokens.css', 'src/styles/site.css', 'src/styles/play.css'];

const opts = {
  entryPoints: [join(here, 'src/main.jsx')],
  bundle: true,
  format: 'iife',
  minify: true,
  jsx: 'automatic', // REQUIRED: classic transform → "React is not defined"
  define: { 'process.env.NODE_ENV': '"production"' },
  write: false,
  target: ['es2020'],
  legalComments: 'none',
  logLevel: 'warning',
};

function emit(result) {
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = CSS.map((f) => readFileSync(join(here, f), 'utf8')).join('\n');
  const tpl = readFileSync(join(here, 'template.html'), 'utf8');
  if (!tpl.includes('/*__CSS__*/') || !tpl.includes('/*__JS__*/')) throw new Error('template placeholders missing');
  // split/join instead of replace(): replacement strings would interpret `$&` etc. inside the bundle
  const html = tpl.split('/*__CSS__*/').join(css).split('/*__JS__*/').join(js);
  writeFileSync(OUT, html);
  console.log(`built ${OUT} — ${(html.length / 1024).toFixed(1)} KB`);
}

if (process.argv.includes('--watch')) {
  const ctx = await context({
    ...opts,
    plugins: [{ name: 'emit', setup: (b) => b.onEnd((r) => r.errors.length || emit(r)) }],
  });
  await ctx.watch();
  console.log('watching…');
} else {
  emit(await build(opts));
}
