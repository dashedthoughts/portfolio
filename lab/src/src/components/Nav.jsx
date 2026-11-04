import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RESUME, LINKEDIN } from '../data/content.js';
import { getMood, setMood } from '../lib/store.js';

const LINKS = [
  { href: '#work', label: 'CASE FILES' },
  { href: '#memes', label: 'MEMES' },
  { href: '#photos', label: 'PHOTOS' },
  { href: '#contact', label: 'CONTACT' },
];

export default function Nav() {
  const { pathname } = useLocation();
  const home = pathname === '/';
  const [mood, setM] = useState(getMood());

  const jump = (e, id) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const toggleMood = () => {
    const next = mood === 'street' ? 'anime' : 'street';
    document.documentElement.dataset.mood = next;
    setMood(next);
    setM(next);
  };

  return (
    <nav className="nav" aria-label="Main">
      <Link to="/" className="nav__brand" aria-label="Anuraag Dash, home">
        <span className="nav__badge">AD</span>
        <span className="nav__id">ID:AD-0417 <i>// ONLINE</i></span>
      </Link>
      <div className="nav__links">
        {home ? (
          LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => jump(e, l.href)}>
              {l.label}
            </a>
          ))
        ) : (
          <Link to="/">← HOME</Link>
        )}
        <Link to="/play" className="nav__play">
          REDLINE ▸
        </Link>
        <a href={RESUME} target="_blank" rel="noreferrer" className="nav__ext">
          RESUME
        </a>
        <a href={LINKEDIN} target="_blank" rel="noreferrer" className="nav__ext">
          LINKEDIN
        </a>
        <button
          type="button"
          className="nav__mood"
          onClick={toggleMood}
          aria-pressed={mood === 'anime'}
          title="Swap the colour roles (street ↔ anime)"
        >
          MOOD: {mood.toUpperCase()}
        </button>
      </div>
    </nav>
  );
}
