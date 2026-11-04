// REDLINE engine: binds the simulation, the WebGL world, post-processing, audio and input.
//   createRedline(canvas, { mode: 'attract' | 'play', config, lite, reducedMotion, onTick, onEvent })
import * as THREE from 'three';
import { createSim, MAX } from './sim.js';
import { createWorld } from './render/world.js';
import { createPost } from './render/post.js';
import { createAudio } from './audio.js';
import { DEFAULT_CONFIG, QUALITY } from './config.js';

let audioSingleton = null;
export const getAudio = () => (audioSingleton ||= createAudio());

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

const STEP = 1 / 120;

export function createRedline(canvas, opts = {}) {
  const onTick = opts.onTick || (() => {});
  const onEvent = opts.onEvent || (() => {});
  const lite = !!opts.lite; // hero backdrop: cheaper settings
  const reduced = !!opts.reducedMotion;
  let cfg = { ...DEFAULT_CONFIG, ...(opts.config || {}) };
  if (reduced) cfg.effects = 'reduced';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const audio = lite ? null : getAudio();
  const sim = createSim({ mode: opts.mode || 'attract', config: cfg, onEvent: handle });
  const world = createWorld(renderer, cfg);

  // ---- resolution: device ratio capped by quality, then adapted to hold frame rate ----
  const q = () => QUALITY[cfg.quality] || QUALITY.balanced;
  let scale = 1; // dynamic resolution multiplier (0.55..1)
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, lite ? 0.85 : q().pixelRatio) * scale;
  renderer.setPixelRatio(pixelRatio());
  let post = createPost(renderer, world.scene, world.camera, { samples: lite ? 0 : 4, bloom: q().bloom });

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    world.resize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- events: game feel lives here (sound + particles), then forwarded to the UI ----
  function handle(e) {
    const S = sim.S;
    switch (e.type) {
      case 'shard': world.burst('shard', e.x); audio?.sfx('shard', e.chain); break;
      case 'casefile': world.burst('file', S.x); audio?.sfx('file'); break;
      case 'nearmiss': audio?.sfx('nearmiss'); break;
      case 'slipstream': world.burst('slip', S.x); audio?.sfx('slip'); break;
      case 'hit': world.burst('hit', S.x); audio?.sfx('hit'); break;
      case 'scrape': audio?.sfx('scrape'); break;
      case 'glitch': audio?.sfx('glitch'); break;
      case 'count': audio?.sfx('count'); break;
      case 'go': audio?.sfx('go'); break;
      case 'over': audio?.sfx('over'); audio?.musicStop(); break;
      case 'junction': audio?.sfx('slip'); break;
      case 'finale': audio?.sfx('file'); break;
      case 'complete': audio?.engine(false, 0, false); audio?.musicStop(); break;
      default:
    }
    onEvent(e);
  }

  // ---- gamepad ----
  let padStart = false;
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find((x) => x && x.connected);
    if (!p) return null;
    const ax = Math.abs(p.axes[0]) > 0.15 ? p.axes[0] : 0;
    const b = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.3));
    const start = b(9);
    if (start && !padStart) onEvent({ type: 'pad-start' });
    padStart = start;
    return { axis: ax + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), boost: b(0) || b(7) || b(5), brake: b(1) || b(6) || b(4) };
  }

  // ---- loop ----
  let raf = 0, running = false, paused = false, last = 0, acc = 0, tick = 0;
  let frameAvg = 16, slowFor = 0, fastFor = 0;
  const fx = { full: cfg.effects !== 'reduced', view: opts.view || 'chase' };
  const keyInput = { left: false, right: false, boost: false, brake: false };

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dtRaw = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    if (paused) return;

    // input merge (keys + touch + pad); attract mode drives itself
    if (sim.mode === 'play') {
      const pad = pollPad();
      sim.input.left = keyInput.left;
      sim.input.right = keyInput.right;
      sim.input.boost = keyInput.boost || !!pad?.boost;
      sim.input.brake = keyInput.brake || !!pad?.brake;
      sim.input.axis = pad ? pad.axis : 0;
    }

    acc += Math.min(dtRaw, 0.05);
    if (fx.view === 'showroom') acc = 0; // parked: the world holds still, only the camera moves
    while (acc >= STEP) { sim.step(STEP); acc -= STEP; }
    const dt = Math.min(dtRaw, 0.05);
    const S = sim.S;
    fx.full = cfg.effects !== 'reduced';
    world.update(sim, dt, fx);

    const L = post.lens;
    const sp = S.speed / MAX;
    L.uTime.value += dt;
    L.uSpeed.value = fx.full ? sp : 0;
    L.uGlitch.value = S.glitch > 0 ? (fx.full ? 0.6 + 0.4 * Math.random() : 0) : 0;
    L.uFlash.value = fx.full && S.flash > 0 ? S.flash * 2 : 0;
    L.uBoost.value = S.slip > 0 ? Math.min(1, S.slip) : 0;
    const linesT = !lite && fx.full && fx.view !== 'showroom' && (S.overclock || S.slip > 0) ? Math.min(1, (sp - 0.7) * 2.5) : 0;
    if (lite) L.uSpeed.value *= 0.55;
    L.uLines.value += (Math.max(0, linesT) - L.uLines.value) * Math.min(1, dt * 6);
    if (fx.view === 'showroom') L.uSpeed.value = 0;
    post.render(dt);

    if (audio && sim.mode === 'play') audio.engine(S.count <= 0 && !S.over, sp, S.overclock);

    // dynamic resolution: keep ~60fps, recover when there's headroom
    frameAvg += (dtRaw * 1000 - frameAvg) * 0.05;
    if (frameAvg > 22) { slowFor += dtRaw; fastFor = 0; } else if (frameAvg < 14) { fastFor += dtRaw; slowFor = 0; }
    if (slowFor > 1.5 && scale > 0.55) { scale = Math.max(0.55, scale - 0.15); slowFor = 0; resize(); }
    if (fastFor > 4 && scale < 1) { scale = Math.min(1, scale + 0.1); fastFor = 0; resize(); }

    if (++tick % 6 === 0) emitTick();
  }

  function emitTick() {
    const S = sim.S;
    onTick({
      score: Math.round(S.score),
      kmh: Math.round(S.speed * 3.6),
      heat: Math.round(S.heat),
      glitch: S.glitch > 0,
      overclock: !!S.overclock,
      slip: S.slip > 0,
      draft: S.draft,
      lives: S.lives,
      maxLives: S.maxLives,
      shards: S.shards,
      files: S.files,
      chain: S.chain,
      mult: 1 + Math.min(4, Math.floor(S.chain / 6)),
      nearMisses: S.nearMisses,
      count: S.count,
      over: S.over,
      km: (S.dist / 1000).toFixed(1),
      route: S.route,
      sector: S.sector,
      toJunction: Math.max(0, Math.round(S.nextJunction - S.z)),
      finale: S.finale,
    });
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // reduced motion on the hero: render one still frame and stop
  if (reduced && sim.mode === 'attract') {
    for (let i = 0; i < 30; i++) sim.step(STEP);
    world.update(sim, 0.016, { full: false });
    post.render(0.016);
  }

  const api = {
    input: keyInput,
    start() {
      if (reduced && sim.mode === 'attract') return;
      start();
    },
    pause() { paused = true; audio?.engine(false, 0, false); },
    resume() { if (!running) start(); paused = false; last = performance.now(); },
    isPaused: () => paused,
    restart() {
      Object.keys(keyInput).forEach((k) => (keyInput[k] = false));
      sim.reset();
      paused = false;
      if (!running) start();
      emitTick();
    },
    setView(v) {
      fx.view = v;
      if (v === 'showroom') {
        sim.S.speed = 0;
        sim.S.x = 0;
        sim.S.vx = 0;
        sim.S.overclock = false;
        sim.S.slip = 0;
        sim.S.cars.length = 0;
        sim.S.shardList.length = 0;
      }
    },
    setMode(m) {
      sim.setMode(m);
      if (m === 'play' && audio) {
        audio.unlock();
        audio.configure({ sound: cfg.sound, music: cfg.music, volume: cfg.volume });
        if (cfg.music) audio.musicStart();
      }
      if (m !== 'play') { audio?.engine(false, 0, false); audio?.musicStop(); }
    },
    configure(next) {
      const prevQ = cfg.quality;
      cfg = { ...cfg, ...next };
      if (reduced) cfg.effects = 'reduced';
      sim.configure(cfg);
      world.applyConfig(cfg);
      if (audio) {
        audio.configure({ sound: cfg.sound, music: cfg.music, volume: cfg.volume });
        if (sim.mode === 'play' && !sim.S.over) cfg.music ? audio.musicStart() : audio.musicStop();
      }
      if (prevQ !== cfg.quality) {
        post.dispose();
        renderer.setPixelRatio(pixelRatio());
        post = createPost(renderer, world.scene, world.camera, { samples: lite ? 0 : 4, bloom: q().bloom });
        resize();
      }
      if (!running || paused) { world.update(sim, 0, fx); post.render(0); }
    },
    // test hook: advance the simulation by `sec` seconds, then draw one frame
    advance(sec) {
      if (fx.view === 'showroom') sec = 0;
      Object.assign(sim.input, { left: keyInput.left, right: keyInput.right, boost: keyInput.boost, brake: keyInput.brake });
      const n = Math.round(sec / STEP);
      for (let i = 0; i < n; i++) {
        sim.step(STEP);
        if (i % 12 === 0) world.update(sim, STEP * 12, fx);
      }
      world.update(sim, 0.016, fx);
      post.render(0.016);
    },
    uiSound(name) { audio?.unlock(); audio?.sfx(name); },
    state: () => sim.S,
    get lens() { return post.lens; },
    get mode() { return sim.mode; },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      audio?.engine(false, 0, false);
      audio?.musicStop();
      post.dispose();
      world.dispose();
      renderer.dispose();
    },
  };
  if (fx.view === 'showroom') api.setView('showroom');
  return api;
}
