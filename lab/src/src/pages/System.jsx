import { useEffect, useState } from 'react';
import Nav from '../components/Nav.jsx';
import HudHeader from '../components/HudHeader.jsx';
import GlitchText from '../components/GlitchText.jsx';
import CaseCard from '../components/CaseCard.jsx';
import Ticker from '../components/Ticker.jsx';
import useReveal from '../lib/useReveal.js';
import { projects } from '../data/content.js';

// Living style guide: reads the tokens straight from CSS so it can't drift from the build.
const ROLES = [
  ['--bg', 'void · page'],
  ['--bg-panel', 'panel'],
  ['--bg-raised', 'raised'],
  ['--ink', 'body text'],
  ['--ink-muted', 'meta'],
  ['--signal', 'the ONE loud colour'],
  ['--data', 'links · HUD'],
  ['--alert', 'shadows · hits (no small text)'],
  ['--alert-text', 'readable red'],
  ['--hype', 'secondary accent'],
  ['--success', 'pickups · decrypted'],
  ['--fill-deep', 'large flat fills'],
];
const TYPE = [
  ['--fs-hero', 'var(--f-name)', 'ANURAAG'],
  ['--fs-h1', 'var(--f-display)', 'CASE FILES'],
  ['--fs-h2', 'var(--f-display)', 'Section heading'],
  ['--fs-h3', 'var(--f-display)', 'Card title'],
  ['--fs-body', 'var(--f-body)', 'Body copy sits on calm surfaces at 7:1 or better.'],
  ['--fs-hud', 'var(--f-mono)', '// 02 · HUD LABEL'],
];
const MOTION = ['--t-instant', '--t-snap', '--t-move', '--t-scene'];

const PRINCIPLES = [
  ['Point of view over pastiche', 'Anuraag’s Night City, not a game skin. Genre grammar, personal subject: case files, shelves, memelore.'],
  ['One loud colour per view', '--signal carries the shout. Everything else is accent. Moods swap who shouts.'],
  ['Flat colour, hard edges', 'Solid fills, cut corners, hard offset shadows. Glow only on thin lines and display type.'],
  ['Done is not good', 'Every component gets hover, focus, pressed and reduced-motion states before it ships.'],
  ['Beauty serves use', 'Effects never cost legibility. Loud lives in display type and frames; body copy stays calm.'],
  ['Encode intent in tokens', 'Components read role tokens only. Iterations inherit intent instead of copying effects.'],
  ['Motion as punctuation', 'Short, stepped, once. Nothing loops behind reading text.'],
  ['Diegetic chrome', 'Nav, labels and meta read as in-world HUD: IDs, file numbers, status lines.'],
  ['Raise the ceiling', 'One bespoke, hand-made thing per site. Here: REDLINE.'],
];

export default function System() {
  const [vals, setVals] = useState({});
  useReveal();
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = {};
      [...ROLES.map((r) => r[0]), ...TYPE.map((t) => t[0]), ...MOTION, '--cut-sm', '--cut', '--cut-lg'].forEach(
        (k) => (v[k] = cs.getPropertyValue(k).trim()),
      );
      setVals(v);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mood'] });
    return () => mo.disconnect();
  }, []);

  return (
    <main className="system">
      <Nav />
      <section className="section">
        <p className="hud-label">// NIGHT CITY v2 · DESIGN SYSTEM</p>
        <GlitchText as="h1" text="THE SYSTEM" className="project__title" />
        <p className="lede">
          Tokens, components and the rules behind them. Values below are read live from the CSS, so toggle MOOD in the
          nav and watch the roles swap. Source: <code>lab/src/src/styles/tokens.css</code> · rationale:{' '}
          <code>lab/DESIGN.md</code>.
        </p>
      </section>

      <section className="section">
        <HudHeader index={1} title="PRINCIPLES" />
        <ol className="principles">
          {PRINCIPLES.map(([h, d], i) => (
            <li key={h} className="reveal" style={{ '--i': i % 3 }}>
              <span className="hud-label">P{String(i + 1).padStart(2, '0')}</span>
              <b>{h}</b>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <HudHeader index={2} title="COLOUR ROLES" meta="components read roles, never raw hex" />
        <div className="swatches">
          {ROLES.map(([k, d]) => (
            <figure className="swatch reveal" key={k}>
              <span className="swatch__chip" style={{ background: `var(${k})` }} />
              <figcaption>
                <code>{k}</code>
                <span>{vals[k]}</span>
                <small>{d}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section">
        <HudHeader index={3} title="TYPE" meta="NEMESYS · Rajdhani · Chakra Petch · Share Tech Mono" />
        <div className="type-specimen">
          {TYPE.map(([k, f, s]) => (
            <div className="type-row reveal" key={k}>
              <code>
                {k} <small>{vals[k]}</small>
              </code>
              <span style={{ fontSize: `var(${k})`, fontFamily: f, lineHeight: 1.05 }}>{s}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <HudHeader index={4} title="COMPONENTS" />
        <p className="hud-label">BUTTONS</p>
        <div className="btn-row">
          <button type="button" className="btn btn--signal">
            SIGNAL <span className="btn__k">ENTER</span>
          </button>
          <button type="button" className="btn btn--data">DATA ▸</button>
          <button type="button" className="btn btn--ghost">GHOST</button>
        </div>
        <p className="hud-label">TAGS (SHELF STRIPS)</p>
        <span className="tags">
          {['MVP', 'User Research', 'Brand Research', 'PRD'].map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </span>
        <p className="hud-label">CASE FILE · SEALED / DECRYPTED</p>
        <div className="grid grid--2">
          <CaseCard p={projects[0]} fileNo={1} decrypted={false} />
          <CaseCard p={projects[3]} fileNo={4} decrypted />
        </div>
        <p className="hud-label">TICKER</p>
        <Ticker items={['ONE LOUD COLOUR', 'HARD EDGES', 'MOTION AS PUNCTUATION', 'DONE IS NOT GOOD']} label="Principles ticker" />
        <p className="hud-label">CORNER CUTS · {vals['--cut-sm']} / {vals['--cut']} / {vals['--cut-lg']}</p>
        <div className="cuts">
          <span className="cut-demo cut-demo--sm">SM</span>
          <span className="cut-demo">MD</span>
          <span className="cut-demo cut-demo--lg">LG</span>
        </div>
      </section>

      <section className="section">
        <HudHeader index={5} title="MOTION" meta="short · stepped · once" />
        <div className="motion-demo">
          {MOTION.map((k) => (
            <div className="motion-row" key={k}>
              <code>
                {k} <small>{vals[k]}</small>
              </code>
              <span className="motion-track">
                <i style={{ animationDuration: `calc(var(${k}) * 4)` }} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
