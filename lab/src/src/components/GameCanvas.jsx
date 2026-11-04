import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createRedline, webglAvailable } from '../game/engine.js';

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// React shell around the REDLINE engine.
// mode="attract" → autopilot backdrop (lite: cheaper settings). mode="play" → driven by the Play page.
const GameCanvas = forwardRef(function GameCanvas(
  { mode = 'attract', view = 'chase', config, lite = false, onTick, onEvent, className = '', label, autoPause = true },
  ref,
) {
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const cbs = useRef({ onTick, onEvent });
  cbs.current = { onTick, onEvent };
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    get engine() {
      return engine.current;
    },
  }));

  useEffect(() => {
    if (!webglAvailable()) {
      setFailed(true);
      return undefined;
    }
    let g;
    try {
      g = createRedline(canvasRef.current, {
        mode,
        view,
        lite,
        config,
        reducedMotion: reduced(),
        onTick: (s) => cbs.current.onTick?.(s),
        onEvent: (e) => cbs.current.onEvent?.(e),
      });
    } catch (err) {
      console.error(err);
      setFailed(true);
      return undefined;
    }
    engine.current = g;
    // debug/test handle (read-only use): window.__redline.pause() etc.
    window.__redline = g;
    g.start();
    if (!autoPause) {
      return () => {
        g.destroy();
        engine.current = null;
      };
    }
    // hero backdrop: pause when hidden or scrolled away
    let visible = true;
    const sync = () => (document.hidden || !visible ? g.pause() : g.resume());
    document.addEventListener('visibilitychange', sync);
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        sync();
      });
      io.observe(canvasRef.current);
    }
    return () => {
      document.removeEventListener('visibilitychange', sync);
      io?.disconnect();
      g.destroy();
      engine.current = null;
    };
    // engine is created once; later changes go through engine.configure / setMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed)
    return (
      <div className={`game-canvas game-canvas--fallback ${className}`} role="img" aria-label="Night highway (static)">
        <span>WEBGL OFFLINE · the city is still here, the game needs a WebGL2 browser.</span>
      </div>
    );
  return <canvas ref={canvasRef} className={`game-canvas ${className}`} role="img" aria-label={label || 'REDLINE game'} />;
});

export default GameCanvas;
