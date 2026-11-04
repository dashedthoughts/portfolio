import { useRef, useState } from 'react';

const GLYPHS = '!<>-_/[]{}=+*^?#';

// Display text that scrambles once on hover/focus (motion as punctuation, never a loop).
// data-text feeds the CSS slice layers (.glitch::before/::after) used on entry.
export default function GlitchText({ text, as: Tag = 'span', className = '' }) {
  const [shown, setShown] = useState(text);
  const raf = useRef(0);

  const scramble = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let f = 0;
    const total = text.length * 2;
    cancelAnimationFrame(raf.current);
    const step = () => {
      f++;
      const done = (f / total) * text.length;
      setShown(
        text
          .split('')
          .map((c, i) => (c === ' ' ? ' ' : i < done ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(''),
      );
      if (f < total) raf.current = requestAnimationFrame(step);
      else setShown(text);
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <Tag className={`glitch ${className}`} data-text={text} aria-label={text} onMouseEnter={scramble}>
      <span aria-hidden="true">{shown}</span>
    </Tag>
  );
}
