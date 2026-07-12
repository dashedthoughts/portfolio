# Portfolio — Agent Field Guide

Live site: **https://dashedthoughts.github.io/portfolio/**
Owner: Anuraag Dash (u/dashedthoughts, anur.dash@gmail.com)

## Repos & where things live
- `dashedthoughts/portfolio` (GitHub) — **deployment repo**. GitHub Pages serves `main` branch root. Contains only: `index.html` (the entire built site in ONE file), `photos/` (user-uploaded photography, read at runtime), this file.
- `dashedthoughts/portfolio-backup` — snapshots: built site + source zip + git bundle.
- **Source of truth**: full Vite+React project with git history lives on the owner's machine at `Desktop/Dumpster/portfolio/` (and is mirrored into the backup repo's `portfolio-source.zip`/`.bundle`).

## Architecture
- Vite + React 18, `HashRouter` (works on Pages under any path). `vite.config.js` uses `base: './'`.
- `src/data/projects.js` — ALL portfolio content: 10 projects, Notion case-study URLs, contact email. Edit content here.
- `src/components/`:
  - `PixelGalaxy.jsx` — hero canvas: dusk pixel city + single-lane endless runner ("Rooftop Run": bounties +1, hazards −3, autopilot when idle; ↑/click/tap jump ×2, ↓ slam, → boost, ← brake).
  - `KineticName.jsx` — hero name, letter spans with `data-ch`, staggered entrance.
  - `Nav.jsx`, `DistortText.jsx` (hover scramble + always-on slice glitch), `Marquee`, `ProjectCard`, `PhotoCarousel` (lists `photos/` via GitHub API at runtime — uploading an image to that folder is all it takes), `F1Car` (comic racer strip), `useReveal.js` (IntersectionObserver reveals).
- `src/styles.css` — the whole theme. Night City palette: `--pop:#fcee0a --zap:#00f0ff --loud:#ff003c`. Fonts: NEMESYS (name), Rajdhani (headings/UI), Chakra Petch (body), Share Tech Mono (mono). NEMESYS is declared via manual `@font-face` → `https://fonts.cdnfonts.com/s/125590/NEMESYS-Regular.woff` (cdnfonts' CSS endpoint is flaky — always declare font-faces yourself).

## Build & deploy (the important part)
The deployed artifact is a SINGLE `index.html` with JS+CSS inlined:
1. `npm install` (once), `npm run build` (sanity check — must pass).
2. Bundle: `npx esbuild src/main.jsx --bundle --format=iife --minify --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=bundle.js`
   ⚠️ `--jsx=automatic` is REQUIRED (classic transform → "React is not defined" blank page).
3. Inline into HTML template: `<style>{styles.css}</style>` + `<script>{bundle}</script>`; escape `</script>` inside the JS as `<\/script>`. Include the Google Fonts `<link>` (Archivo 800/900, Rajdhani 500-700, Chakra Petch, Share Tech Mono).
4. Deploy: commit the new `index.html` to `main` (git push, or GitHub web "Add file → Upload files"). Pages rebuilds in ~40s. CDN caches aggressively — verify with a cache-buster query param + hard refresh.

## Testing
`sitetest.cjs` (jsdom harness, lives next to the build). Run 3 passes; it checks nav, anchors, all 10 project routes, 404, external link shapes, game canvas mount. Mocks required: canvas 2D context (Proxy), `matchMedia`, `IntersectionObserver`, `fetch`.

## Hard-won gotchas
- **Never chain `str.replace` on CSS blindly** — a missed match is silent and caused a days-stale font bug. Verify with grep after every patch.
- `.hero > *:not(.gravity-canvas)` sets `position: relative` on hero children — absolutely-positioned children need higher specificity (`.hero > .hero-stickers`).
- `.card` has a corner-cut `clip-path` — children that protrude outside get clipped (keep stickers inside).
- Git on the mounted Dumpster folder corrupts `.git/config` (null bytes) — init/commit in a home dir, then copy `.git` over.
- Reduced-motion: every animation must have a `prefers-reduced-motion` kill switch (pattern at bottom of styles.css).

## Content rules
- Memes: ONLY from u/dashedthoughts. Stats: only CV-verified numbers. Contact: anur.dash@gmail.com.
- Trademarks: official brand marks only via `cdn.simpleicons.org`, unmodified, referential. The F1 car is an ORIGINAL comic drawing (generic livery, no official logos) — keep it that way.

## Backlog
- Embed Notion case-study content into project detail pages (best path: owner exports Notion → HTML/MD zip → rebuild pages self-contained).
- Minimalist "twin" version of the site (program.studio / studiofreight energy) for A/B.
