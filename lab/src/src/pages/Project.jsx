import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import GlitchText from '../components/GlitchText.jsx';
import { projects, caseStudies, ROOT } from '../data/content.js';
import { getDecrypted } from '../lib/store.js';

function Deck({ path, label }) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let live = true;
    fetch(path, { method: 'HEAD' })
      .then((r) => live && setOk(r.ok))
      .catch(() => live && setOk(false));
    return () => {
      live = false;
    };
  }, [path]);
  if (ok === false)
    return <p className="cs__missing">// {label}: deck upload in progress · see the Notion original below meanwhile.</p>;
  return (
    <div className="cs__pdf">
      <object data={path} type="application/pdf" aria-label={label}>
        <p className="cs__p">PDF preview unavailable in this browser.</p>
      </object>
      <a className="btn btn--signal" href={path} target="_blank" rel="noreferrer">
        {(label || 'OPEN DECK').toUpperCase()} ↗
      </a>
    </div>
  );
}

export default function Project() {
  const { slug } = useParams();
  const idx = projects.findIndex((p) => p.slug === slug);
  const p = projects[idx];

  if (!p)
    return (
      <main className="project">
        <Nav />
        <p className="hud-label">// ERROR 404</p>
        <GlitchText as="h1" text="NO FILE HERE" className="project__title" />
        <Link className="btn btn--signal" to="/">
          ← GO HOME
        </Link>
      </main>
    );

  const body = caseStudies[slug] || [];
  const decrypted = getDecrypted().has(slug);
  const next = projects[(idx + 1) % projects.length];

  return (
    <main className="project">
      <Nav />
      <Link className="project__back" to="/#work">
        ← ALL CASE FILES
      </Link>
      <p className="hud-label">
        FILE {String(idx + 1).padStart(2, '0')} // {p.category.toUpperCase()} // {decrypted ? '● DECRYPTED IN REDLINE' : '○ SEALED (STILL READABLE)'}
      </p>
      <GlitchText as="h1" text={p.title.toUpperCase()} className="project__title" />
      <p className="project__tagline">{p.tagline}</p>
      {p.collaborators.length > 0 && <p className="project__collab">Built with {p.collaborators.join(', ')}</p>}
      <span className="tags">
        {p.tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </span>

      <div className="cs">
        {body.map((b, i) => {
          if (b[0] === 'h') return <h2 className="cs__h" key={i}>{b[1]}</h2>;
          if (b[0] === 'p') return <p className="cs__p" key={i}>{b[1]}</p>;
          if (b[0] === 'embed')
            return (
              <div className="cs__embed" key={i}>
                <div className="cs__screen">
                  <iframe src={b[1]} title={`${p.title} live embed ${i}`} loading="lazy" allow="fullscreen" />
                </div>
                <a className="btn btn--ghost" href={b[1]} target="_blank" rel="noreferrer">
                  OPEN LIVE ↗
                </a>
              </div>
            );
          if (b[0] === 'pdf') return <Deck key={i} path={ROOT + b[1]} label={b[2]} />;
          return null;
        })}
      </div>

      <p className="project__note">
        Prefer the original?{' '}
        <a href={p.notion} target="_blank" rel="noreferrer">
          View this case study on Notion ↗
        </a>
      </p>
      <Link className="project__next" to={`/p/${next.slug}`}>
        <span className="hud-label">NEXT FILE ›</span>
        <b>{next.title}</b>
      </Link>
    </main>
  );
}
