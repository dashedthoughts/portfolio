import GlitchText from './GlitchText.jsx';

// "// 02 · TITLE ───────◣ meta"
export default function HudHeader({ index, title, meta, as = 'h2', id }) {
  return (
    <header className="hud-head reveal" id={id}>
      <span className="hud-head__idx">// {String(index).padStart(2, '0')}</span>
      <GlitchText as={as} text={title} className="hud-head__title" />
      <span className="hud-head__rule" aria-hidden="true" />
      {meta && <span className="hud-head__meta">{meta}</span>}
    </header>
  );
}
