import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// phones on data saver or with little memory keep the still frame on the hero (the game itself still runs)
const frugal = () => !!(navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4));
const webgl2 = () => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } };

// React shell around the REDLINE engine, which is loaded on demand (its own chunk).
// mode="attract" → autopilot backdrop. mode="play" → driven by the Play page.
const GameCanvas = forwardRef(function GameCanvas(
  { mode = 'attract', view = 'chase', config, lite = false, onTick, onEvent, onReady, className = '', label, autoPause = true },
  ref,
) {
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const cbs = useRef({ onTick, onEvent, onReady });
  cbs.current = { onTick, onEvent, onReady };
  const [state, setState] = useState('loading'); // loading | live | still | failed

  useImperativeHandle(ref, () => ({ get engine() { return engine.current; } }));

  useEffect(() => {
    if (!webgl2()) { setState('failed'); return undefined; }
    if (lite && (frugal() || reduced())) { setState('still'); return undefined; }
    let g = null, dead = false, io = null;
    const sync = () => g && (document.hidden || !sync.visible ? g.pause() : g.resume());
    sync.visible = true;
    import('../game/engine.js')
      .then(({ createRedline }) => {
        if (dead) return;
        g = createRedline(canvasRef.current, {
          mode, view, lite, config,
          reducedMotion: reduced(),
          onTick: (s) => cbs.current.onTick?.(s),
          onEvent: (e) => cbs.current.onEvent?.(e),
        });
        engine.current = g;
        window.__redline = g; // debug/test handle
        g.start();
        requestAnimationFrame(() => requestAnimationFrame(() => { if (!dead) { setState('live'); cbs.current.onReady?.(g); } }));
        if (autoPause) {
          document.addEventListener('visibilitychange', sync);
          if ('IntersectionObserver' in window) {
            io = new IntersectionObserver(([e]) => { sync.visible = e.isIntersecting; sync(); });
            io.observe(canvasRef.current);
          }
        }
      })
      .catch((err) => { console.error(err); if (!dead) setState('failed'); });
    return () => {
      dead = true;
      document.removeEventListener('visibilitychange', sync);
      io?.disconnect();
      g?.destroy();
      engine.current = null;
    };
    // the engine is created once; later changes go through engine.configure / setMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`game-canvas game-canvas--${state} ${className}`}>
      <div className="game-poster" aria-hidden="true" />
      {state !== 'failed' && state !== 'still' && <canvas ref={canvasRef} role="img" aria-label={label || 'REDLINE game'} />}
      {state === 'failed' && <span className="game-note">WebGL2 is off in this browser, so the city is a still tonight.</span>}
    </div>
  );
});

export default GameCanvas;
