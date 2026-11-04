import GlitchText from './GlitchText.jsx';

// "// 02 · TITLE ───────◣ meta"
export default function HudHeader({ index, title, meta, as = 'h2', id }) {
  return (
    <header className="hud-head reveal" id={id}>
      <span className="hud-head__idx">// {String(index).padStart(2, '0')}</span>
      <GlitchText as={as} text={title} className="hud-head__title" />
      <span className="hud-head__rule" aria-hidden="true" />
      {meta && <span className="hud-head__meta">{meta}</span>}
      <svg className="ink-rule" viewBox="0 0 420 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 C 60 3, 120 12, 190 7 S 330 4, 418 8" /></svg>
    </header>
  );
}
