# /lab: Night City v2 (design-iteration copy)

| Path | What |
|---|---|
| `lab/index.html` | built site (single file, CSS + JS inlined, same deploy model as the root) |
| `lab/baseline/` | frozen copy of the live v8 site, for side-by-side comparison |
| `lab/src/` | **readable source** (React 18 + Three.js), build tooling, tests |
| `lab/DESIGN.md` | point of view, principles, tokens, what's next |

Routes: `#/` home · `#/p/<slug>` case file · `#/play` REDLINE · `#/system` living design system.

## Build
```bash
cd lab/src && npm install && npm run build   # writes lab/index.html
npm test                                     # headless simulation checks (traffic fairness, difficulty, rain, cars)
```

## REDLINE architecture (`lab/src/src/game/`)
- `sim.js`: pure simulation in track space (metres). Handling with grip and inertia, guardrail scraping, traffic with signalled lane changes and gap-keeping (never builds a three-lane wall), near-miss, slipstream, heat/glitch, shards → case files. No DOM, so it's unit-tested.
- `render/`: Three.js world. The road is straight geometry bent in the vertex shader (`uCurve·d²`, `uHill·d²`), so curves and hills are free and endless. Procedural buildings (windows in the shader, no textures), wet-road light pools and reflection streaks, tail-light trails, searchlights, blade signs, elevated expressway, bloom + lens pass (speed blur, chromatic aberration, anime speed lines, film grade).
- `audio.js`: everything synthesized with WebAudio (engine, SFX, an original synth loop).
- `config.js`: garage data: 3 original cars, 6 liveries, 5 underglows, 4 times of day, rain, 3 difficulties, quality presets.
- `engine.js`: fixed-step loop (120 Hz), dynamic resolution, gamepad, events → particles and sound.

Test hook: `window.__redline` exposes `pause()`, `advance(sec)`, `state()` for screenshots and debugging.
