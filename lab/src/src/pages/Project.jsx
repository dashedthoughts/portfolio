import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import GlitchText from '../components/GlitchText.jsx';
import useReveal from '../lib/useReveal.js';
import { projects, caseStudies, ROOT } from '../data/content.js';
import { getDecrypted } from '../lib/store.js';
import { Burst, ActionLines, Caption } from '../components/Comic.jsx';

const PREVIEW = 6; // long decks open collapsed

function Rich({ segs }) {
  return segs.map((s, i) => {
    const node = s.b ? <b>{s.t}</b> : s.t;
    return s.a ? (
      <a key={i} href={s.a} target="_blank" rel="noreferrer">{node}</a>
    ) : (
      <span key={i}>{node}</span>
    );
  });
}

function Deck({ d, n, titled }) {
  const [all, setAll] = useState(d.pages <= PREVIEW + 2);
  const shown = all ? d.files : d.files.slice(0, PREVIEW);
  const src = (f, w) => `${ROOT}${d.dir}/${f}${w === 800 ? '-800' : ''}.jpg`;
  return (
    <figure className="deck reveal">
      <figcaption className="deck__head">
        <span className="hud-label">DECK {String(n).padStart(2, '0')} · {d.pages} {d.pages === 1 ? 'PAGE' : 'PAGES'}</span>
        {!titled && <b>{d.label}</b>}
        <a className="deck__pdf" href={ROOT + d.pdf} target="_blank" rel="noreferrer" download>
          PDF · {d.mb} MB ↓
        </a>
      </figcaption>
      <ol className="deck__pages">
        {shown.map((f, i) => (
          <li key={f} className="deck__page" style={{ aspectRatio: String(d.ratio) }}>
            <a href={src(f, 1600)} target="_blank" rel="noreferrer" aria-label={`${d.label}, page ${i + 1} of ${d.pages}, full size`}>
              <img
                src={src(f, 800)}
                srcSet={`${src(f, 800)} 800w, ${src(f, 1600)} 1600w`}
                sizes="(max-width: 960px) 100vw, 920px"
                alt={`${d.label}, page ${i + 1}`}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </a>
            <span className="deck__no" aria-hidden="true">{String(i + 1).padStart(2, '0')} / {String(d.pages).padStart(2, '0')}</span>
          </li>
        ))}
      </ol>
      {!all && (
        <button type="button" className="btn btn--ghost deck__more" onClick={() => setAll(true)}>
          SHOW ALL {d.pages} PAGES ↓
        </button>
      )}
    </figure>
  );
}

function Video({ v }) {
  const m = Math.floor(v.dur / 60), s = String(v.dur % 60).padStart(2, '0');
  return (
    <figure className="cs__video reveal">
      <div className="cs__screen" style={{ aspectRatio: `${v.w} / ${v.h}` }}>
        <video src={ROOT + v.src} poster={ROOT + v.poster} controls playsInline preload="none" />
      </div>
      <figcaption className="hud-label">DEMO · {m}:{s}</figcaption>
    </figure>
  );
}

export default function Project() {
  const { slug } = useParams();
  const idx = projects.findIndex((p) => p.slug === slug);
  const p = projects[idx];
  useReveal(slug);

  if (!p)
    return (
      <main className="project">
        <Nav />
        <p className="hud-label">// ERROR 404</p>
        <GlitchText as="h1" text="NO FILE HERE" className="project__title" />
        <Link className="btn btn--signal" to="/">← GO HOME</Link>
      </main>
    );

  const body = caseStudies[slug] || [];
  const decrypted = getDecrypted().has(slug);
  const next = projects[(idx + 1) % projects.length];
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  let deckN = 0;
  const contents = body.filter((b) => b[0] === 'deck' || b[0] === 'embed' || b[0] === 'video');

  return (
    <main className="project" key={slug}>
      <Nav />
      <Link className="project__back" to="/#work">← ALL CASE FILES</Link>
      <header className="project__head panel-hero">
        <ActionLines />
        <Burst label={`${p.sticker}!`} />
        <Caption>FILE {String(idx + 1).padStart(2, '0')} · {p.category}</Caption>
        <p className="hud-label">{decrypted ? '● DECRYPTED IN REDLINE' : '○ SEALED, STILL READABLE'}</p>
        <h1 className="project__title plates" key={slug}>{p.title.toUpperCase()}</h1>
        <p className="project__tagline">{p.tagline}</p>
        {p.collaborators.length > 0 && <p className="project__collab">Built with {p.collaborators.join(', ')}</p>}
        <span className="tags">
          {p.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
        </span>
        <p className="project__inside">
          INSIDE:{' '}
          {contents.map((b, i) => (
            <span key={i}>{b[0] === 'deck' ? `${b[1].pages}-page deck` : b[0] === 'video' ? 'demo video' : 'live prototype'}{i < contents.length - 1 ? ' · ' : ''}</span>
          ))}
        </p>
      </header>

      <div className="cs">
        {body.map((b, i) => {
          if (b[0] === 'h') return <h2 className="cs__h reveal" key={i}>{b[1]}</h2>;
          if (b[0] === 'p') return <p className="cs__p reveal" key={i}><Rich segs={b[1]} /></p>;
          if (b[0] === 'embed')
            return (
              <div className="cs__embed reveal" key={i}>
                <div className="cs__screen cs__screen--live">
                  <span className="cs__chrome" aria-hidden="true"><i /><i /><i /><em>{b[1].replace(/^https?:\/\//, '').replace(/\/$/, '')}</em></span>
                  <iframe src={b[1]} title={`${p.title}: live prototype`} loading="lazy" allow="fullscreen" />
                </div>
                <a className="btn btn--ghost" href={b[1]} target="_blank" rel="noreferrer">OPEN THE LIVE PROTOTYPE ↗</a>
              </div>
            );
          if (b[0] === 'deck') return <Deck key={i} d={b[1]} n={++deckN} titled={i > 0 && body[i - 1][0] === 'h'} />;
          if (b[0] === 'video') return <Video key={i} v={b[1]} />;
          return null;
        })}
      </div>

      <nav className="project__pager" aria-label="More case files">
        <Link to={`/p/${prev.slug}`} className="project__next project__next--prev">
          <span className="hud-label">‹ PREVIOUS FILE</span>
          <b>{prev.title}</b>
        </Link>
        <Link to={`/p/${next.slug}`} className="project__next">
          <span className="hud-label">NEXT FILE ›</span>
          <b>{next.title}</b>
        </Link>
      </nav>
    </main>
  );
}
