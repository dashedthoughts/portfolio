import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import GameCanvas from '../components/GameCanvas.jsx';
import GlitchText from '../components/GlitchText.jsx';
import Ticker from '../components/Ticker.jsx';
import HudHeader from '../components/HudHeader.jsx';
import CaseCard from '../components/CaseCard.jsx';
import PhotoStrip from '../components/PhotoStrip.jsx';
import useReveal from '../lib/useReveal.js';
import { getDecrypted } from '../lib/store.js';
import {
  projects, categories, stats, tickerA, tickerB, memes, EMAIL, REDDIT, LINKEDIN, NOTION_HOME,
} from '../data/content.js';

export default function Home() {
  const { hash } = useLocation();
  const [tele, setTele] = useState({ kmh: 0, heat: 0 });
  const [decrypted, setDecrypted] = useState(getDecrypted());
  useReveal();

  useEffect(() => {
    const on = () => setDecrypted(getDecrypted());
    window.addEventListener('nc2:decrypted', on);
    return () => window.removeEventListener('nc2:decrypted', on);
  }, []);
  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 50);
  }, [hash]);

  const fileNo = (slug) => projects.findIndex((p) => p.slug === slug) + 1;

  return (
    <main className="home">
      <Nav />

      <header className="hero">
        <GameCanvas
          mode="attract"
          className="hero__canvas"
          lite
          onTick={setTele}
          label="Animated backdrop: a courier car on autopilot down a neon night highway"
        />
        <div className="hero__shade" aria-hidden="true" />

        <div className="hero__panel">
          <p className="hud-label hero__hi">
            <span className="caret-mark">&gt;</span> HELLO THERE, I&apos;M<span className="caret">_</span>
          </p>
          <h1 className="hero__name" aria-label="Anuraag Dash">
            {'ANURAAG DASH'.split(' ').map((w, wi) => (
              <span className="hero__word" key={wi}>
                {w.split('').map((c, ci) => (
                  <span className="hero__ch" key={ci} style={{ '--d': `${(wi * 7 + ci) * 45}ms` }} aria-hidden="true">
                    {c}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="hero__sub">
            Marketer, math-head, and resident Ferrari wonk. Brand wiz and traveling salesman (pun intended) at{' '}
            <b>
              <img
                className="inline-brand"
                src="https://cdn.simpleicons.org/unilever/00A0DF"
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />{' '}
              Unilever
            </b>
            . Powered Reddit&apos;s <b>r/memes</b> into one of the largest communities for meme-aficionados.{' '}
            <b>ISB</b> MBA grad and recovering engineer.
          </p>
          <div className="btn-row">
            <a className="btn btn--signal" href={`mailto:${EMAIL}`}>
              PING ME <span className="btn__k">↗</span>
            </a>
            <a
              className="btn btn--ghost"
              href="#work"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              OPEN CASE FILES ↓
            </a>
            <Link className="btn btn--data" to="/play">
              PLAY REDLINE ▸
            </Link>
          </div>
          <blockquote className="hero__quote">
            &ldquo;Aut viam inveniam aut faciam.&rdquo;
            <cite>~ Hannibal // find a way, or make one</cite>
          </blockquote>
        </div>

        <aside className="hero__tele" aria-label="Backdrop telemetry">
          <span>AUTOPILOT</span>
          <b>{tele.kmh} KM/H</b>
          <span className="heatbar heatbar--sm">
            <i style={{ width: `${tele.heat}%` }} />
          </span>
          <Link to="/play">TAKE THE WHEEL ›</Link>
        </aside>
      </header>

      <Ticker items={tickerA} label="What I do" />

      <section className="stats" aria-label="Numbers">
        {stats.map((s, i) => (
          <div className="stat reveal" key={s.n} style={{ '--i': i }}>
            <span className="stat__k">STAT_{String(i + 1).padStart(2, '0')}</span>
            <span className="stat__n">{s.n}</span>
            <span className="stat__l">{s.l}</span>
          </div>
        ))}
      </section>

      <Ticker items={tickerB} reverse label="Credentials" />

      <section id="work" className="section work">
        <HudHeader
          index={1}
          title="CASE FILES"
          meta={`${decrypted.size}/${projects.length} DECRYPTED IN REDLINE · ALL OPEN TO READ`}
        />
        {categories.map((cat) => {
          const list = projects.filter((p) => p.category === cat);
          if (!list.length) return null;
          return (
            <div className="cat" key={cat}>
              <p className="cat__label reveal">
                <span>[{cat.toUpperCase()}]</span>
                <span className="cat__count">{String(list.length).padStart(2, '0')} FILES</span>
              </p>
              <div className="grid">
                {list.map((p) => (
                  <CaseCard key={p.slug} p={p} fileNo={fileNo(p.slug)} decrypted={decrypted.has(p.slug)} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section id="memes" className="section memes">
        <HudHeader index={2} title="CERTIFIED MEMELORE" meta="SOURCE: u/dashedthoughts" />
        <div className="memes__body reveal">
          <p className="lede">
            Community Architect &amp; Creator Partner at Reddit since 2020. Scaled r/memes +123% in 3 years. Multiple
            Top-25 global posts. The memes speak for themselves · go see the source.
          </p>
          <div className="meme-wall">
            {memes.map((m, i) => (
              <a className="meme" key={m.title} href={REDDIT} target="_blank" rel="noreferrer" style={{ '--i': i }}>
                <img src={m.src} alt={m.title} loading="lazy" />
                <span className="meme__cap">{m.title}</span>
              </a>
            ))}
          </div>
          <div className="btn-row">
            <a className="btn btn--signal" href={REDDIT} target="_blank" rel="noreferrer">
              u/dashedthoughts ↗
            </a>
            <a className="btn btn--ghost" href="https://www.reddit.com/r/memes/" target="_blank" rel="noreferrer">
              r/memes ↗
            </a>
          </div>
        </div>
      </section>

      <section id="photos" className="section">
        <HudHeader index={3} title="FRAMES I SHOT" meta="LIVE FEED // /photos" />
        <p className="lede reveal">
          When I&apos;m not mapping user journeys I&apos;m chasing light. Fresh shots land here straight from the camera
          roll.
        </p>
        <PhotoStrip />
      </section>

      <footer id="contact" className="section footer">
        <HudHeader index={4} title="LET'S CHAT" meta="CHANNEL OPEN" />
        <div className="terminal reveal">
          <p>
            <span className="caret-mark">&gt;</span> topic: anything product, Ferrari, or memelore
          </p>
          <p>
            <span className="caret-mark">&gt;</span> say hello<span className="caret">_</span>
          </p>
          <a className="terminal__mail" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
          <div className="terminal__links">
            <a href={LINKEDIN} target="_blank" rel="noreferrer">LinkedIn ↗</a>
            <a href={NOTION_HOME} target="_blank" rel="noreferrer">Notion Portfolio ↗</a>
            <a href={REDDIT} target="_blank" rel="noreferrer">Reddit ↗</a>
            <Link to="/system">Design system ›</Link>
          </div>
        </div>
        <p className="footer__quote">
          &ldquo;Where lies the beauty in an answer found on the first try, when it is in the making of mistakes,
          <br />
          the mending of them, and the learning they leave behind?&rdquo; <span>~ GS</span>
        </p>
        <p className="footer__build">NIGHT CITY v2 // DESIGN LAB BUILD · <a href="./baseline/">compare with v8 baseline</a></p>
      </footer>
    </main>
  );
}
