// Mixed-media layer: inked panels, halftone, misregistered print plates, starbursts, action lines.
// Animated "on twos" (stepped 12fps) so it reads drawn, not tweened. Original artwork, all procedural.

// One-time SVG defs: the ink roughness filter used by panels and underlines.
export function InkDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-fine" x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="1" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// Starburst sticker with inked outline. Points are deterministic per label so it never "jumps" between renders.
export function Burst({ label, size = 132, tilt = -8 }) {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const N = 14, pts = [];
  for (let i = 0; i < N * 2; i++) {
    const a = (i / (N * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.62 + rnd() * 0.06 : 0.92 + rnd() * 0.08;
    pts.push(`${(50 + Math.cos(a) * 50 * r).toFixed(1)},${(50 + Math.sin(a) * 50 * r).toFixed(1)}`);
  }
  return (
    <span className="burst" style={{ '--size': `${size}px`, '--tilt': `${tilt}deg`, '--len': Math.max(5, label.length) }} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <polygon points={pts.join(' ')} className="burst__shadow" transform="translate(4 4)" />
        <polygon points={pts.join(' ')} className="burst__fill" />
        <polygon points={pts.join(' ')} className="burst__dots" />
      </svg>
      <b>{label}</b>
    </span>
  );
}

// Radial action lines, redrawn on twos.
export function ActionLines() {
  const lines = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (i % 3) * 0.02;
    const r0 = 30 + (i * 7) % 14;
    lines.push(<line key={i} x1={50 + Math.cos(a) * r0} y1={50 + Math.sin(a) * r0 * 0.6} x2={50 + Math.cos(a) * 80} y2={50 + Math.sin(a) * 48} strokeWidth={0.25 + ((i * 13) % 5) * 0.12} />);
  }
  return (
    <svg className="action-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {lines}
    </svg>
  );
}

// Comic caption box (the yellow narration box).
export function Caption({ children }) {
  return <span className="caption">{children}</span>;
}
