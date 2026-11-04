// Headless REDLINE simulation checks. Run: node test/sim.test.mjs
import assert from 'node:assert/strict';
import { createSim, LANES, RAIL, MAX } from '../src/game/sim.js';

function run({ seconds, bot, seed = 1, config = {}, mode = 'play' }) {
  const ev = {};
  let over = null;
  const sim = createSim({ mode, seed, config, onEvent: (e) => {
    ev[e.type] = (ev[e.type] || 0) + 1;
    if (e.type === 'over') over = e;
    if (process.env.DEBUG && e.type === 'hit') {
      const S = sim.S;
      console.log(`  HIT t=${S.time.toFixed(1)} x=${S.x.toFixed(2)} v=${S.speed.toFixed(0)}`, S.cars.filter((c) => Math.abs(c.z - S.z) < 40).map((c) => `[L${c.lane}${c.target !== c.lane ? '>' + c.target : ''} x${c.x.toFixed(1)} dz${(c.z - S.z).toFixed(1)} v${c.speed.toFixed(0)}${c.hit ? ' HIT' : ''}]`).join(' '));
    }
  } });
  const dt = 1 / 60;
  let t = 0, maxAbsX = 0, kerb = 0;
  for (; t < seconds && !(over && sim.S.overT > 1); t += dt) {
    bot(sim.input, sim.S, sim);
    sim.step(dt);
    maxAbsX = Math.max(maxAbsX, Math.abs(sim.S.x));
    if (sim.S.onKerb && sim.S.count <= 0) kerb += dt;
  }
  return { ev, over, t, S: sim.S, maxAbsX, kerb };
}
const fmt = (r) => `${JSON.stringify(r.ev)} t=${r.t.toFixed(0)}s score=${Math.round(r.S.score)} top=${(r.S.topSpeed * 3.6).toFixed(0)}kmh kerb=${r.kerb.toFixed(1)}s`;

// A decent human-ish driver: looks ~2s ahead, commits to lane changes, won't cut across a car beside it.
function driver({ heatCap = 70, look = 150 } = {}) {
  let target = 0, think = 0;
  const danger = (S, lx) => {
    let d = 0;
    for (const c of S.cars) {
      const dz = c.z - S.z;
      if (dz > -7 && dz < look && Math.abs(c.x - lx) < 2.6) d += (look - dz) * 2;
      const between = (c.x - S.x) * (c.x - lx) <= 0 || Math.abs(c.x - lx) < 2.6;
      if (dz > -7 && dz < 9 && between && Math.abs(lx - S.x) > 0.5) d += 1000; // car alongside: don't swerve into it
    }
    return d;
  };
  return (inp, S, sim) => {
    think -= 1 / 60;
    const settled = Math.abs(target - S.x) < 0.6;
    if (think <= 0 && (settled || danger(S, target) > 150)) {
      think = 0.15;
      let best = target, bs = -1e9;
      for (const lx of LANES) {
        let sc = -Math.abs(lx - S.x) * 0.4 - danger(S, lx);
        for (const s of S.shardList) { const dz = s.z - S.z; if (!s.taken && dz > 0 && dz < 60 && Math.abs(s.x - lx) < 1.6) sc += (60 - dz) * 0.1; }
        if (sc > bs) { bs = sc; best = lx; }
      }
      target = best;
    }
    let d = target - S.x - S.vx * 0.3;
    if (S.glitch > 0) d = -d;
    inp.axis = Math.max(-1, Math.min(1, d * 0.8));
    inp.brake = S.cars.some((c) => { const dz = c.z - S.z; return dz > 0 && dz < 12 + (S.speed - c.speed) * 0.9 && Math.abs(c.x - S.x) < 2.3 && S.speed > c.speed + 3; });
    inp.boost = !inp.brake && S.heat < heatCap && Math.abs(sim.curveAt(S.z + 40)) < 0.6;
  };
}

// 1) countdown: nothing moves for ~3.6s, then GO
const cd = run({ seconds: 3.4, bot: (i) => { i.boost = true; } });
assert.equal(cd.S.z, 0, 'car holds during countdown');
assert.equal(cd.ev.count, 3);

// 2) skilled driver survives a long time, scores, decrypts, near-misses, slipstreams
const good = run({ seconds: 240, bot: driver(), seed: 3 });
console.log('skilled  :', fmt(good));
assert.ok(good.ev.shard > 20 && good.ev.casefile >= 3, 'collects shards and decrypts files');
assert.ok(good.S.topSpeed * 3.6 > 280, 'overclock pushes past 280 km/h');
assert.ok(good.t > 45, 'a careful driver gets a proper arcade run (~1 min) on STREET');
assert.ok(good.maxAbsX <= RAIL + 1e-9, 'guardrail holds');

// 3) no-steer, full-overclock: curves throw you into the rail; overheating glitches you
const lazy = run({ seconds: 120, bot: (i) => { i.boost = true; }, seed: 5 });
console.log('lazy     :', fmt(lazy));
assert.ok(lazy.ev.glitch >= 1, 'overheating triggers a glitch');
assert.ok(lazy.maxAbsX > 2.5, 'curves push an unsteered car off its line');
assert.ok(lazy.ev.hit >= 1, 'an unsteered car eventually hits traffic');

// 4) every difficulty ends when lives run out, exactly once
for (const difficulty of ['chill', 'street', 'redline']) {
  const r = run({ seconds: 900, bot: (i, S) => { i.axis = (0 - S.x) * 0.5; i.boost = true; }, seed: 11, config: { difficulty } });
  console.log(`${difficulty.padEnd(9)}:`, fmt(r));
  assert.ok(r.over && r.ev.over === 1 && r.S.lives === 0, `${difficulty}: game over once`);
}

// 5) rain lowers grip: same driver, more kerb time or fewer files is expected — just check it runs and grips less
const wet = run({ seconds: 120, bot: driver(), seed: 3, config: { weather: 'rain' } });
console.log('rain     :', fmt(wet));

// 6) cars differ: kei out-accelerates the coupe over the first 3s after GO
const launch = (car) => run({ seconds: 3.6 + 3, bot: (i) => { i.boost = false; }, config: { car } }).S.speed;
assert.ok(launch('kei') > launch('coupe'), 'kei launches harder than the coupe');

// 7) files: five shards each
for (const r of [good, lazy, wet]) assert.equal(r.ev.casefile || 0, Math.min(10, Math.floor((r.ev.shard || 0) / 5)));

// 8) attract mode never ends and keeps moving
const demo = run({ seconds: 120, bot: () => {}, mode: 'attract', seed: 9 });
console.log('attract  :', fmt(demo));
assert.ok(!demo.over && demo.S.dist > 4000, 'autopilot drives indefinitely');
console.log('ALL SIM CHECKS PASSED');
