# home: Anuraag Dash, the night build

Live: https://dashedthoughts.github.io/home/ · The classic site stays at https://dashedthoughts.github.io/portfolio/

| Path | What |
|---|---|
| `index.html` | the built site: one file, CSS + JS inlined |
| `cases/` | case-study media: decks rendered to page images (800/1600 px), original PDFs, demo video |
| `resume.pdf` | résumé |
| `src/` | readable source (React 18 + Three.js), build, tests |
| `DESIGN.md` | point of view, principles, tokens |

Routes: `#/` home · `#/p/<slug>` case study · `#/play` REDLINE · `#/system` design system.

```bash
cd src && npm install && npm run build   # writes ../index.html
npm test                                 # simulation checks: fairness over 5 seeds, routes, finale, cars, rain
```

## REDLINE
A night drive through an original Midnight-Tokyo-style megacity. Five data shards decrypt one case file; ten files end the run at the lookout above the city. Junctions every 1.5 km let you hold a lane to pick Expressway or Backstreets (tighter, shards ×1.5); a tunnel follows each one. Garage: three cars and the Tsubame bike (lean, power-slide on hard braking), liveries, underglow, four times of day, rain, three difficulties, steering assist, reduced effects, synthesized sound and music. Keyboard, touch and gamepad.

Art direction borrows the language of 80s cel-anime cities and light-cycle films; no vehicles, logos, characters or places from any film or game are used.

`window.__redline` exposes `pause()`, `advance(sec)`, `state()` for screenshots and debugging.
