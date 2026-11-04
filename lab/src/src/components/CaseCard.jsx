import { Link } from 'react-router-dom';

// Case-file card: cut corners, HUD header row, price-tag skill tags.
export default function CaseCard({ p, fileNo, decrypted }) {
  return (
    <Link to={`/p/${p.slug}`} className={`case reveal ${decrypted ? 'is-decrypted' : ''}`} style={{ '--i': fileNo % 4 }}>
      <span className="case__frame">
        <span className="case__hud">
          <span>FILE {String(fileNo).padStart(2, '0')}</span>
          <span>{p.sticker}</span>
          <span className={decrypted ? 'case__state ok' : 'case__state'}>{decrypted ? '● DECRYPTED' : '○ SEALED'}</span>
        </span>
        {(p.brand || p.brandUrl) && (
          <img
            className="case__brand"
            src={p.brandUrl || `https://cdn.simpleicons.org/${p.brand}`}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <h3 className="case__title">{p.title}</h3>
        <p className="case__tagline">{p.tagline}</p>
        <span className="tags">
          {p.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </span>
        <span className="case__open" aria-hidden="true">
          OPEN ›
        </span>
      </span>
    </Link>
  );
}
