// Thin status ticker. Pauses on hover; static under reduced motion (CSS).
export default function Ticker({ items, reverse = false, label }) {
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className={`ticker ${reverse ? 'ticker--rev' : ''}`} aria-label={label} role="marquee">
      <div className="ticker__track">
        {loop.map((t, i) => (
          <span className="ticker__item" key={i} aria-hidden={i >= items.length ? 'true' : undefined}>
            {t}
            <em aria-hidden="true">//</em>
          </span>
        ))}
      </div>
    </div>
  );
}
