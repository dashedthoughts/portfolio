# Night City v2: design notes

The design-iteration copy of the portfolio. Live at `/portfolio/lab/` once merged; the frozen v8 baseline sits at `/portfolio/lab/baseline/` for side-by-side comparison.

## Point of view
Who it's for: recruiters, founders and brand people deciding in 30 seconds whether Anuraag thinks differently.
What they care about: proof of craft and taste, then the case files.
Who we want to be to them: the marketer who builds things. Not a template, not a game skin.

The site uses the genre's grammar (hard neon on black, HUD chrome, glitch), but the subject stays personal: case files, memelore, a courier run that decrypts his actual projects.

## Principles
Sources: Katie Dill's Power, Craft, Beauty framework (via the `intentional-design` skill, which summarises her Lenny's Podcast talk "How to scale intent, quality, and artistry with AI" and the Stripe Developers interview). The two YouTube links could not be opened from the build environment (network policy), so the skill's summary is the source, not a transcript.

1. **Power first.** The game exists to send people to the work. Every five shards decrypts a real case file; the results screen links straight to them; cards on the home page show DECRYPTED once found. Nothing is ever locked: all files stay readable.
2. **Craft: same meaning, same treatment.** Yellow `--signal` is the one loud colour per view (CTAs, focus, the logo). Cyan `--data` is information. Red `--alert` is impact and hard shadow, never small text. These roles hold on the site and in the game HUD.
3. **Beauty that serves use.** Effects live in display type, frames and the canvas; body copy sits on calm surfaces. Every animation has a reduced-motion path, and the game has a Reduced Effects toggle (no shake, flashes, tearing or speed blur).
4. **Encode intent in tokens.** Components read role tokens only (`lab/src/src/styles/tokens.css`). The MOOD toggle swaps roles, never components. The `/system` page reads the values live.
5. **Be the editor.** Built is not done. Examples from this pass: window static traced to a float-precision hash and fixed; traffic walls removed so every hit is the player's fault; the showroom stops showing speed blur on a parked car.
6. **Raise the ceiling with one bespoke thing.** REDLINE.
7. **House rules.** No em-dashes in UI copy. Stats only from the CV.

## The world (REDLINE)
Art direction: an 80s cel-anime megacity at 2am, inspired by the *look* of films like Akira (tail-light trails smeared behind the car, dense lit windows, blade signs, searchlights, an elevated expressway, a film grade with red halation). No assets, characters, vehicles, logos or named places from any film or game are used. All cars, signage and music are original; signage uses generic Japanese words (高速 expressway, 出口 exit, 未来 future…).

Default world: **Midnight Tokyo**. Others: Dusk, Neon Blue, Dawn; Clear or Rain.

## What could not be researched
These references were blocked by the environment's network policy, so nothing here claims to describe them:
- r/cyberpunkred "Cyberpunk art collection (revised)"
- cyberpunk.net/en/edgerunners
- both YouTube videos (titles confirmed only via search snippets)

Allow `reddit.com`, `youtube.com` and `cyberpunk.net` in the environment's network settings to finish that research.

## Next iterations
- Hand-inked layer with [p5.brush](https://github.com/acamposuribe/p5.brush): pre-render brush-stroke frames, speed lines and section dividers to static images (p5 + p5.brush are ~1 MB, too heavy to ship live). Check its licence before vendoring.
- Minimalist twin (from the backlog) for an A/B.
- Real case-study decks: 9 of 10 PDFs are still "upload in progress".
