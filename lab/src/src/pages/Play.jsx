import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas.jsx';
import { projects, rankFor } from '../data/content.js';
import { CARS, LIVERIES, GLOWS, TIMES, WEATHER, DIFFICULTY, QUALITY } from '../game/config.js';
import { addDecrypted, getRaceConfig, setRaceConfig, getBestBy, setBestBy } from '../lib/store.js';

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'boost', KeyW: 'boost', Space: 'boost', ShiftLeft: 'boost',
  ArrowDown: 'brake', KeyS: 'brake',
};
const STAT_MAX = { top: 1.1, accel: 1.3, grip: 1.3, cool: 1.35 };
const pad2 = (n) => String(n).padStart(2, '0');

function Seg({ label, value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      <span className="seg__label">{label}</span>
      <div className="seg__opts">
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__ui" aria-hidden="true" />
      <span className="toggle__text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function StatBar({ k, v }) {
  return (
    <div className="statbar">
      <span>{k}</span>
      <i>
        <b style={{ width: `${Math.round((v / STAT_MAX[k.toLowerCase()] || v) * 100)}%` }} />
      </i>
    </div>
  );
}

export default function Play() {
  const game = useRef(null);
  const [phase, setPhase] = useState('title'); // title | run | paused | over
  const [tab, setTab] = useState('run');
  const [cfg, setCfg] = useState(getRaceConfig);
  const [hud, setHud] = useState({ score: 0, kmh: 0, heat: 0, lives: 3, maxLives: 3, files: 0, chain: 0, mult: 1, draft: 0, count: 0 });
  const [pops, setPops] = useState([]);
  const [runFiles, setRunFiles] = useState([]);
  const [final, setFinal] = useState(null);
  const [best, setBestState] = useState(() => getBestBy(getRaceConfig().difficulty));
  const [newBest, setNewBest] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const eng = () => game.current?.engine;

  // ---------- config ----------
  const update = useCallback((patch) => {
    setCfg((c) => {
      const next = { ...c, ...patch };
      setRaceConfig(next);
      eng()?.configure(next);
      return next;
    });
    eng()?.uiSound('ui');
  }, []);
  useEffect(() => setBestState(getBestBy(cfg.difficulty)), [cfg.difficulty]);

  // ---------- callouts ----------
  const pop = useCallback((text, tone = 'data', sub = '') => {
    const id = Math.random();
    setPops((p) => [...p.slice(-3), { id, text, tone, sub }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1500);
  }, []);

  const onEvent = useCallback(
    (e) => {
      if (e.type === 'pad-start') {
        if (phaseRef.current === 'title' || phaseRef.current === 'over') start();
        else togglePause();
        return;
      }
      if (phaseRef.current !== 'run') return;
      switch (e.type) {
        case 'go': pop('GO', 'signal'); break;
        case 'nearmiss': pop('NEAR MISS', 'data', `+${e.pts}`); break;
        case 'slipstream': pop('SLIPSTREAM', 'data', 'BOOST · HEAT VENTED'); break;
        case 'chain-break': pop('CHAIN LOST', 'dim'); break;
        case 'glitch': pop('SIGNAL GLITCH', 'alert', 'STEERING INVERTED'); break;
        case 'glitch-end': pop('SIGNAL RESTORED', 'data'); break;
        case 'hit': pop('IMPACT', 'alert', `INTEGRITY ${Math.max(0, e.lives)}`); break;
        case 'casefile': {
          const p = projects[(e.n - 1) % projects.length];
          addDecrypted(p.slug);
          setRunFiles((f) => (f.some((x) => x.slug === p.slug) ? f : [...f, p]));
          pop(`FILE ${pad2(e.n)} DECRYPTED`, 'ok', p.title.toUpperCase());
          break;
        }
        case 'over': {
          const d = cfgRef.current.difficulty;
          const prev = getBestBy(d);
          setNewBest(e.score > prev);
          if (e.score > prev) setBestBy(d, e.score);
          setBestState(Math.max(prev, e.score));
          setFinal(e);
          setTimeout(() => setPhase('over'), 1400);
          break;
        }
        default:
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pop],
  );

  // ---------- flow ----------
  const start = useCallback(() => {
    const g = eng();
    if (!g) return;
    setRunFiles([]);
    setFinal(null);
    setPops([]);
    g.configure(cfgRef.current);
    g.setView('chase');
    g.setMode('play');
    g.restart();
    setPhase('run');
  }, []);

  const toGarage = useCallback(() => {
    const g = eng();
    if (!g) return;
    g.setMode('attract');
    g.restart();
    g.setView('showroom');
    g.resume();
    setPhase('title');
    setTab('garage');
  }, []);

  const togglePause = useCallback(() => {
    const g = eng();
    if (!g) return;
    if (phaseRef.current === 'run') { g.pause(); setPhase('paused'); }
    else if (phaseRef.current === 'paused') { g.resume(); setPhase('run'); }
  }, []);

  // ---------- keyboard ----------
  useEffect(() => {
    const down = (e) => {
      const g = eng();
      if (!g) return;
      const ph = phaseRef.current;
      if (e.code === 'Enter' && (ph === 'title' || ph === 'over') && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        start();
        return;
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && (ph === 'run' || ph === 'paused')) { e.preventDefault(); togglePause(); return; }
      const k = KEYS[e.code];
      if (k && ph === 'run') { e.preventDefault(); g.input[k] = true; }
    };
    const up = (e) => {
      const k = KEYS[e.code];
      if (k && eng()) eng().input[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [start, togglePause]);

  useEffect(() => {
    const onVis = () => document.hidden && phaseRef.current === 'run' && togglePause();
    const onBlur = () => phaseRef.current === 'run' && togglePause();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); };
  }, [togglePause]);

  const hold = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); if (eng()) eng().input[k] = true; },
    onPointerUp: () => { if (eng()) eng().input[k] = false; },
    onPointerCancel: () => { if (eng()) eng().input[k] = false; },
    onContextMenu: (e) => e.preventDefault(),
  });

  const car = CARS[cfg.car];
  const counting = phase === 'run' && hud.count > 0;
  const status = hud.glitch ? ['GLITCH', 'alert'] : hud.slip ? ['SLIPSTREAM', 'data'] : hud.overclock ? ['OVERCLOCK', 'signal'] : hud.heat > 70 ? ['RUNNING HOT', 'signal'] : ['CRUISE', 'dim'];

  return (
    <main className={`play play--${phase}`}>
      <GameCanvas
        ref={game}
        mode="attract"
        view="showroom"
        config={cfg}
        autoPause={false}
        onTick={setHud}
        onEvent={onEvent}
        className="play__canvas"
        label="REDLINE: a neon night highway seen from behind a courier car"
      />
      <div className="play__fx" aria-hidden="true" />

      {/* ------------------------------------------------ HUD */}
      {(phase === 'run' || phase === 'paused') && !counting && (
        <div className="hud2" aria-hidden="true">
          <div className="hud2__score">
            <span className="hud-k">SCORE</span>
            <b>{hud.score.toLocaleString('en-IN')}</b>
            <span className={`mult ${hud.mult > 1 ? 'on' : ''}`}>×{hud.mult * (hud.overclock ? 2 : 1)}</span>
            <span className="chain">
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} className={i < hud.chain % 6 || (hud.chain > 0 && hud.chain % 6 === 0) ? 'on' : ''} />
              ))}
            </span>
          </div>
          <div className="hud2__right">
            <div>
              <span className="hud-k">CASE FILES</span>
              <b>
                {pad2(hud.files)}
                <small>/{projects.length}</small>
              </b>
            </div>
            <div>
              <span className="hud-k">INTEGRITY</span>
              <span className="pips">
                {Array.from({ length: hud.maxLives }, (_, i) => (
                  <i key={i} className={i < hud.lives ? 'on' : ''} />
                ))}
              </span>
            </div>
            <button type="button" className="hud2__pause" onClick={togglePause} aria-label="Pause">❚❚</button>
          </div>
          <div className="hud2__dash">
            <span className={`dash-status tone-${status[1]}`}>{status[0]}</span>
            <b className="dash-speed">{hud.kmh}</b>
            <span className="hud-k">KM/H</span>
            <div className="dash-bars">
              <label>
                <span>HEAT</span>
                <span className={`heatbar ${hud.heat > 70 ? 'hot' : ''}`}><i style={{ width: `${hud.heat}%` }} /></span>
              </label>
              <label>
                <span>DRAFT</span>
                <span className="draftbar"><i style={{ width: `${Math.round((hud.draft || 0) * 100)}%` }} /></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {counting && (
        <div className="countdown" aria-live="assertive">
          <b key={Math.ceil(hud.count)}>{Math.ceil(hud.count)}</b>
        </div>
      )}

      <div className="pops" aria-live="polite">
        {pops.map((p) => (
          <p key={p.id} className={`pop pop--${p.tone}`}>
            <b>{p.text}</b>
            {p.sub && <span>{p.sub}</span>}
          </p>
        ))}
      </div>

      {phase === 'run' && !counting && (
        <div className="pad" aria-hidden="true">
          <div className="pad__steer">
            <button type="button" {...hold('left')}>◀</button>
            <button type="button" {...hold('right')}>▶</button>
          </div>
          <div className="pad__act">
            <button type="button" className="pad__brake" {...hold('brake')}>BRAKE</button>
            <button type="button" className="pad__oc" {...hold('boost')}>OVERCLOCK</button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ TITLE / GARAGE */}
      {phase === 'title' && (
        <section className="garage" aria-labelledby="rl-title">
          <header className="garage__head">
            <p className="hud-label">// SIDE JOB · NIGHT COURIER</p>
            <h1 id="rl-title" className="rl-logo">REDLINE</h1>
            <nav className="garage__tabs" role="tablist" aria-label="Menu">
              {[['run', 'RUN'], ['garage', 'GARAGE'], ['world', 'WORLD & SETTINGS']].map(([k, t]) => (
                <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); eng()?.uiSound('ui'); }}>
                  {t}
                </button>
              ))}
            </nav>
          </header>

          <div className="garage__body">
            {tab === 'run' && (
              <div className="tabpane">
                <p className="garage__lede">
                  Ten case files are scattered across the ring road as data shards. Five shards decrypt one. Chain
                  them for a multiplier, thread traffic for near-misses, sit in a slipstream to vent heat.
                </p>
                <Seg
                  label="TRAFFIC"
                  value={cfg.difficulty}
                  options={Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name])}
                  onChange={(v) => update({ difficulty: v })}
                />
                <p className="garage__note">{DIFFICULTY[cfg.difficulty].blurb} Best on {DIFFICULTY[cfg.difficulty].name}: <b>{best.toLocaleString('en-IN')}</b></p>
                <dl className="controls">
                  <div><dt>◀ ▶ · A D</dt><dd>steer</dd></div>
                  <div><dt>▲ · W · SPACE</dt><dd>overclock: ×2 score, heat builds</dd></div>
                  <div><dt>▼ · S</dt><dd>brake</dd></div>
                  <div><dt>ESC · P</dt><dd>pause</dd></div>
                  <div><dt>GAMEPAD</dt><dd>stick · A/RT boost · B/LT brake</dd></div>
                </dl>
                <p className="garage__warn">Max heat = signal glitch. Steering inverts until you cool off.</p>
              </div>
            )}

            {tab === 'garage' && (
              <div className="tabpane">
                <div className="cars" role="radiogroup" aria-label="Car">
                  {Object.entries(CARS).map(([k, c]) => (
                    <button key={k} type="button" role="radio" aria-checked={cfg.car === k} className={`carcard ${cfg.car === k ? 'on' : ''}`} onClick={() => update({ car: k })}>
                      <b>{c.name}</b>
                      <StatBar k="TOP" v={c.top} />
                      <StatBar k="ACCEL" v={c.accel} />
                      <StatBar k="GRIP" v={c.grip} />
                      <StatBar k="COOL" v={c.cool} />
                    </button>
                  ))}
                </div>
                <p className="garage__note">{car.blurb}</p>
                <div className="swatches-row" role="radiogroup" aria-label="Livery">
                  <span className="seg__label">LIVERY · {LIVERIES[cfg.livery].name}</span>
                  <div>
                    {LIVERIES.map((l, i) => (
                      <button key={l.name} type="button" role="radio" aria-checked={cfg.livery === i} aria-label={l.name} className={`liv ${cfg.livery === i ? 'on' : ''}`} onClick={() => update({ livery: i })} style={{ '--a': l.body, '--b': l.stripe }} />
                    ))}
                  </div>
                </div>
                <div className="swatches-row" role="radiogroup" aria-label="Underglow">
                  <span className="seg__label">UNDERGLOW · {GLOWS[cfg.glow].name}</span>
                  <div>
                    {GLOWS.map((g, i) => (
                      <button key={g.name} type="button" role="radio" aria-checked={cfg.glow === i} aria-label={g.name} className={`glw ${cfg.glow === i ? 'on' : ''} ${g.color ? '' : 'off'}`} onClick={() => update({ glow: i })} style={{ '--a': g.color || 'transparent' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'world' && (
              <div className="tabpane">
                <Seg label="TIME" value={cfg.time} options={Object.entries(TIMES).map(([k, t]) => [k, t.name])} onChange={(v) => update({ time: v })} />
                <Seg label="WEATHER" value={cfg.weather} options={Object.entries(WEATHER).map(([k, t]) => [k, t.name])} onChange={(v) => update({ weather: v })} />
                {cfg.weather === 'rain' && <p className="garage__note">Wet road: less grip, longer reflections. Brake earlier.</p>}
                <Seg label="GRAPHICS" value={cfg.quality} options={Object.entries(QUALITY).map(([k, t]) => [k, t.name])} onChange={(v) => update({ quality: v })} />
                <Toggle label="Steering assist" hint="Gently settles you into the nearest lane." checked={cfg.assist} onChange={(v) => update({ assist: v })} />
                <Toggle label="Reduced effects" hint="No shake, flashes, tearing or speed blur." checked={cfg.effects === 'reduced'} onChange={(v) => update({ effects: v ? 'reduced' : 'full' })} />
                <Toggle label="Sound effects" checked={cfg.sound} onChange={(v) => update({ sound: v })} />
                <Toggle label="Music" hint="An original synth loop." checked={cfg.music} onChange={(v) => update({ music: v })} />
                <label className="slider">
                  <span className="seg__label">VOLUME</span>
                  <input type="range" min="0" max="1" step="0.05" value={cfg.volume} onChange={(e) => update({ volume: +e.target.value })} />
                </label>
              </div>
            )}
          </div>

          <footer className="garage__foot">
            <button type="button" className="btn btn--signal" onClick={start} autoFocus>
              JACK IN <span className="btn__k">ENTER</span>
            </button>
            <Link to="/" className="btn btn--ghost">PORTFOLIO</Link>
          </footer>
        </section>
      )}

      {phase === 'title' && (
        <aside className="showroom-tag" aria-hidden="true">
          <span className="hud-label">IN THE BAY</span>
          <b>{car.name}</b>
          <span>{LIVERIES[cfg.livery].name} · {GLOWS[cfg.glow].name} GLOW · {TIMES[cfg.time].name} · {WEATHER[cfg.weather].name}</span>
        </aside>
      )}

      {/* ------------------------------------------------ PAUSE */}
      {phase === 'paused' && (
        <section className="panel panel--pause" aria-label="Paused">
          <p className="hud-label">// LINK HELD</p>
          <h2 className="panel__h">PAUSED</h2>
          <div className="pause-toggles">
            <Toggle label="Sound effects" checked={cfg.sound} onChange={(v) => update({ sound: v })} />
            <Toggle label="Music" checked={cfg.music} onChange={(v) => update({ music: v })} />
            <Toggle label="Reduced effects" checked={cfg.effects === 'reduced'} onChange={(v) => update({ effects: v ? 'reduced' : 'full' })} />
            <Toggle label="Steering assist" checked={cfg.assist} onChange={(v) => update({ assist: v })} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--signal" onClick={togglePause} autoFocus>
              RESUME <span className="btn__k">ESC</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={start}>RESTART</button>
            <button type="button" className="btn btn--ghost" onClick={toGarage}>GARAGE</button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ RESULTS */}
      {phase === 'over' && final && (
        <section className="panel panel--over" aria-labelledby="rl-over">
          <p className="hud-label">// CONNECTION LOST · {DIFFICULTY[cfg.difficulty].name}</p>
          <h2 id="rl-over" className="panel__h glitch-once" data-text="FLATLINED">FLATLINED</h2>
          <div className="result-hero">
            <span className="hud-k">FINAL SCORE</span>
            <b>{final.score.toLocaleString('en-IN')}</b>
            {newBest ? <span className="badge">NEW BEST</span> : <span className="hud-k">BEST {best.toLocaleString('en-IN')}</span>}
          </div>
          <div className="result">
            <div><span>RANK</span><b>{rankFor(final.files)}</b></div>
            <div><span>DISTANCE</span><b>{(final.dist / 1000).toFixed(2)} KM</b></div>
            <div><span>TOP SPEED</span><b>{Math.round(final.top * 3.6)} KM/H</b></div>
            <div><span>NEAR MISSES</span><b>{final.nearMisses}</b></div>
            <div><span>SHARDS</span><b>{final.shards}</b></div>
            <div><span>FILES</span><b>{final.files}/{projects.length}</b></div>
          </div>
          {runFiles.length > 0 ? (
            <>
              <p className="hud-label">DECRYPTED THIS RUN · READ THEM</p>
              <ul className="loot">
                {runFiles.map((p) => (
                  <li key={p.slug}><Link to={`/p/${p.slug}`}>{p.title} ›</Link></li>
                ))}
              </ul>
            </>
          ) : (
            <p className="garage__note">No files cracked. Chain five shards and one opens.</p>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--signal" onClick={start} autoFocus>
              RUN IT BACK <span className="btn__k">ENTER</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={toGarage}>GARAGE</button>
            <Link to="/#work" className="btn btn--ghost">ALL CASE FILES</Link>
          </div>
        </section>
      )}
    </main>
  );
}
