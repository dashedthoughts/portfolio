// REDLINE simulation · pure logic, no rendering, no DOM. Units: metres, seconds.
// Track space: z = distance travelled along the road, x = lateral offset from the centre line.

import { CARS, DIFFICULTY, WEATHER } from './config.js';

export const LANE_W = 3.6;
export const LANES = [-LANE_W, 0, LANE_W];
export const ROAD_HALF = 5.4;
export const RAIL = 6.05;          // guardrail (player centre can't pass this)
export const MAX = 70;             // m/s ≈ 252 km/h at car.top = 1
export const OC_TOP = 1.38;        // overclock top-speed multiplier
export const SLIP_TOP = 1.12;
const CAR_LEN = 4.4, CAR_W = 1.95;
const GLITCH_TIME = 3.0;
const SHARDS_PER_FILE = 5;
const TOTAL_FILES = 10;
export const SECTOR = 1500;        // a junction every 1.5 km
export const TUNNEL = 260;         // the tunnel right after each junction
export const ROUTES = {
  expressway: { name: 'EXPRESSWAY', traffic: 1.0, speed: 1.0, density: 1.0, shard: 1.0 },
  backstreets: { name: 'BACKSTREETS', traffic: 1.25, speed: 0.78, density: 1.0, shard: 1.5 },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);

export function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(opts = {}) {
  const emit = opts.onEvent || (() => {});
  let mode = opts.mode || 'attract';
  let cfg = { car: 'wedge', difficulty: 'street', weather: 'clear', assist: false, ...(opts.config || {}) };
  const input = { left: false, right: false, boost: false, brake: false, axis: 0 };
  const S = {};
  let rnd = Math.random;

  // ---------- track: curvature & hills as smooth sections, generated lazily ----------
  let sections = [];
  function extendTrack(toZ) {
    while (!sections.length || sections[sections.length - 1].end < toZ) {
      const prev = sections[sections.length - 1];
      const start = prev ? prev.end : 0;
      const len = 180 + rnd() * 320;
      const straight = !prev || rnd() < 0.28;
      const c = straight ? 0 : (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.65);
      const h = rnd() < 0.45 ? 0 : (rnd() * 2 - 1);
      sections.push({ start, end: start + len, c, h, c0: prev ? prev.c : 0, h0: prev ? prev.h : 0 });
    }
    // drop sections far behind
    while (sections.length > 4 && sections[1].end < S.z - 400) sections.shift();
  }
  function sectionAt(z) {
    for (let i = sections.length - 1; i >= 0; i--) if (sections[i].start <= z) return sections[i];
    return sections[0];
  }
  function curveAt(z) {
    const s = sectionAt(z);
    const t = smooth(clamp((z - s.start) / Math.min(140, (s.end - s.start) * 0.45), 0, 1));
    return s.c0 + (s.c - s.c0) * t;
  }
  function hillAt(z) {
    const s = sectionAt(z);
    const t = smooth(clamp((z - s.start) / ((s.end - s.start) * 0.6), 0, 1));
    return s.h0 + (s.h - s.h0) * t;
  }

  function routeAt(z) {
    const rs = S.routes || [];
    for (let i = rs.length - 1; i >= 0; i--) if (rs[i].z0 <= z) return rs[i].route;
    return 'expressway';
  }

  // ---------- spawning ----------
  function spawnShards() {
    while (S.nextShardZ < S.z + 520) {
      if (S.finale) return;
      const z0 = S.nextShardZ;
      const inSector = ((z0 % SECTOR) + SECTOR) % SECTOR;
      if (inSector > SECTOR - 120 || inSector < TUNNEL + 40) { S.nextShardZ += 60; continue; } // keep junctions & tunnels clean
      const p = rnd();
      const lane = (rnd() * 3) | 0;
      const n = 6;
      for (let k = 0; k < n; k++) {
        let x = LANES[lane];
        if (p > 0.66) x = Math.sin((k / (n - 1)) * Math.PI * 2) * LANE_W; // weave
        else if (p > 0.38) x = LANES[lane] + (k / (n - 1)) * (lane === 2 ? -1 : 1) * LANE_W; // lane change
        S.shardList.push({ z: z0 + k * 9, x, taken: false, missed: false, id: S.uid++ });
      }
      S.nextShardZ += 170 + rnd() * 170;
    }
  }

  function laneFree(lane, z, gap) {
    for (const c of S.cars) if ((c.lane === lane || c.target === lane) && Math.abs(c.z - z) < gap) return false;
    return true;
  }

  // would putting a car in `lane` at z leave no free lane within ±win? (never build walls)
  function wouldWall(lane, z, self, win = 34) {
    let blocked = 0;
    for (let l = 0; l < 3; l++) {
      if (l === lane) continue;
      if (S.cars.some((c) => c !== self && (c.lane === l || c.target === l) && Math.abs(c.z - z) < win)) blocked++;
    }
    return blocked >= 2;
  }

  function spawnTraffic() {
    const diff = DIFFICULTY[cfg.difficulty] || DIFFICULTY.street;
    if (S.finale) return;
    const R = ROUTES[routeAt(S.z + 300)] || ROUTES.expressway;
    const want = Math.round((mode === 'attract' ? 9 : 13) * diff.density * R.traffic);
    let guard = 0;
    while (S.cars.length < want && guard++ < 20) {
      const z = S.z + 220 + rnd() * 260 + (S.cars.length === 0 ? -140 : 0);
      const lane = (rnd() * 3) | 0;
      if (!laneFree(lane, z, 28) || wouldWall(lane, z, null)) continue;
      const kind = rnd() < 0.16 ? 'hauler' : rnd() < 0.5 ? 'sedan' : 'hatch';
      const speed = (24 + rnd() * 18) * diff.trafficSpeed * R.speed * (kind === 'hauler' ? 0.85 : 1);
      S.cars.push({
        id: S.uid++, z, lane, target: lane, x: LANES[lane], speed, cruise: speed, kind,
        paint: (rnd() * 8) | 0, blink: 0, brake: false, prevDz: z - S.z, hit: 0, think: rnd() * 2,
      });
    }
  }

  // ---------- reset ----------
  function reset(seed) {
    rnd = seed != null ? mulberry(seed) : Math.random;
    const car = CARS[cfg.car] || CARS.wedge;
    const diff = DIFFICULTY[cfg.difficulty] || DIFFICULTY.street;
    Object.assign(S, {
      z: 0, x: 0, vx: 0, steer: 0, speed: mode === 'attract' ? MAX * 0.8 : 0,
      heat: 0, glitch: 0, slip: 0, draft: 0, invuln: 0, hitstop: 0,
      lives: diff.lives, maxLives: diff.lives, score: 0, shards: 0, files: 0, chain: 0,
      nearMisses: 0, topSpeed: 0, dist: 0, time: 0, over: false, overT: 0,
      count: mode === 'play' ? 3.6 : 0, lastCount: 4,
      overclock: false, onKerb: false, scrape: 0, shake: 0, flash: 0,
      cars: [], shardList: [], nextShardZ: mode === 'play' ? 140 : 60, uid: 1,
      car, ai: { target: 0, think: 0 },
      route: 'expressway', routes: [{ z0: -1e9, route: 'expressway' }], nextJunction: SECTOR, sector: 1,
      finale: false, finaleT: 0, done: false,
    });
    sections = [];
    extendTrack(1200);
    spawnTraffic();
    spawnShards();
  }

  // ---------- autopilot (attract mode) ----------
  function autopilot(dt) {
    const ai = S.ai;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = 0.2;
      let best = 0, bestScore = -1e9;
      LANES.forEach((lx, li) => {
        let sc = -Math.abs(lx - S.x) * 0.3 - (li === 1 ? 0 : 0.2);
        for (const c of S.cars) {
          const dz = c.z - S.z;
          if (dz > -4 && dz < 90 && Math.abs(c.x - lx) < 2.4) sc -= (90 - dz) * 0.5;
        }
        for (const s of S.shardList) {
          const dz = s.z - S.z;
          if (!s.taken && dz > 0 && dz < 70 && Math.abs(s.x - lx) < 1.6) sc += (70 - dz) * 0.08;
        }
        if (sc > bestScore) { bestScore = sc; best = lx; }
      });
      ai.target = best;
    }
    const d = ai.target - S.x - S.vx * 0.35;
    input.axis = clamp(d * 0.9, -1, 1);
    input.left = input.right = false;
    input.boost = S.heat < 62 && Math.abs(curveAt(S.z + 30)) < 0.45;
    input.brake = false;
  }

  // ---------- step ----------
  function step(dt) {
    S.time += dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake -= dt;
    if (S.hitstop > 0) { S.hitstop -= dt; return; }

    const car = S.car;
    const weather = WEATHER[cfg.weather] || WEATHER.clear;
    const grip = car.grip * weather.grip;

    // countdown
    if (S.count > 0) {
      S.count -= dt;
      const n = Math.ceil(S.count);
      if (n !== S.lastCount && n >= 1 && n <= 3) emit({ type: 'count', n });
      S.lastCount = n;
      if (S.count <= 0) emit({ type: 'go' });
    }
    const racing = S.count <= 0 && !S.over && !S.done;

    if (mode === 'attract') autopilot(dt);

    // ---- steering (digital keys + analog axis), with glitch inversion ----
    let target = clamp((input.right ? 1 : 0) - (input.left ? 1 : 0) + input.axis, -1, 1);
    if (S.glitch > 0) target = -target;
    if (!racing) target = 0;
    S.steer += (target - S.steer) * Math.min(1, dt * 11);

    // ---- longitudinal ----
    const overclock = racing && input.boost && S.glitch <= 0;
    const top = MAX * car.top * (overclock ? OC_TOP : 1) * (S.slip > 0 ? SLIP_TOP : 1);
    if (S.over) S.speed = Math.max(0, S.speed - 22 * dt);
    else if (!racing) S.speed = mode === 'attract' ? S.speed : 0;
    else if (S.finale) { /* coasting handled below */ }
    else if (input.brake) S.speed = Math.max(0, S.speed - 34 * dt);
    else if (S.speed < top) S.speed += 21 * car.accel * (overclock ? 1.25 : 1) * Math.max(0.12, 1 - (S.speed / top) ** 2) * dt;
    else S.speed = Math.max(top, S.speed - 9 * dt);
    S.onKerb = Math.abs(S.x) > ROAD_HALF - 0.95;
    if (S.onKerb && S.speed > MAX * 0.45) S.speed -= 7 * dt;

    const prevZ = S.z;
    S.z += S.speed * dt;
    S.dist += S.speed * dt;
    S.topSpeed = Math.max(S.topSpeed, S.speed);
    const sp = S.speed / MAX;

    // ---- lateral: grip-limited steering, centrifugal push, damping ----
    const steerPow = 34 * grip * clamp(S.speed / 16, 0, 1);
    S.vx += S.steer * steerPow * dt;
    const curve = curveAt(S.z);
    S.vx -= curve * sp * sp * 15 * dt;
    if (cfg.assist && Math.abs(target) < 0.15 && racing) {
      const lane = LANES.reduce((a, b) => (Math.abs(b - S.x) < Math.abs(a - S.x) ? b : a));
      S.vx += (lane - S.x) * 5 * dt;
    }
    S.vx *= Math.exp(-dt * 6.5 * grip);
    S.x += S.vx * dt;

    // guardrail: scrape along it, lose speed, get pushed back in
    S.scrape = Math.max(0, S.scrape - dt);
    if (Math.abs(S.x) > RAIL) {
      const side = Math.sign(S.x);
      S.x = side * RAIL;
      if (Math.abs(S.vx) > 2 || S.speed > 20) {
        if (S.scrape <= 0) emit({ type: 'scrape', side });
        S.scrape = 0.12;
      }
      S.vx = -side * Math.max(2.5, Math.abs(S.vx) * 0.4);
      S.speed *= Math.exp(-dt * 1.6);
      if (cfg.effects !== 'reduced') S.shake = Math.max(S.shake, 0.08);
    }

    // ---- heat / glitch ----
    if (S.glitch > 0) {
      S.glitch -= dt;
      if (S.glitch <= 0) { S.heat = 40; emit({ type: 'glitch-end' }); }
    } else if (overclock && S.speed > MAX * 0.5) {
      S.heat += (21 / car.cool) * dt;
      if (S.heat >= 100) {
        S.heat = 100;
        S.glitch = GLITCH_TIME;
        S.chain = 0;
        emit({ type: 'glitch' });
      }
    } else S.heat = Math.max(0, S.heat - 15 * car.cool * dt);
    S.overclock = overclock;
    if (S.slip > 0) S.slip -= dt;

    // ---- junctions: the lane you're in under the sign picks the next route ----
    if (S.z >= S.nextJunction && !S.finale) {
      const route = S.x > LANE_W * 0.5 ? 'backstreets' : 'expressway';
      S.routes.push({ z0: S.nextJunction, route });
      if (S.routes.length > 6) S.routes.shift();
      S.route = route;
      S.sector += 1;
      S.nextJunction += SECTOR;
      if (mode === 'play') emit({ type: 'junction', route, sector: S.sector });
    }

    // ---- finale: traffic clears, the car rolls to a stop at the lookout ----
    if (S.finale) {
      S.finaleT += dt;
      input.boost = false;
      S.cars = S.cars.filter((c) => Math.abs(c.z - S.z) > 60 || S.finaleT < 0.5);
      if (S.finaleT > 1.2) S.speed = Math.max(0, S.speed - 14 * dt);
      if (S.speed <= 0.5 && !S.done && S.finaleT > 2) {
        S.done = true;
        emit({ type: 'complete', score: Math.round(S.score), files: S.files, dist: S.dist, top: S.topSpeed, nearMisses: S.nearMisses, shards: S.shards, sectors: S.sector });
      }
    }

    // ---- traffic ----
    extendTrack(S.z + 1300);
    if (S.invuln > 0) S.invuln -= dt;
    const diff = DIFFICULTY[cfg.difficulty] || DIFFICULTY.street;
    let draftCar = null;
    for (const c of S.cars) {
      // car-following: slow behind a slower car in the same lane
      let lead = null;
      for (const o of S.cars) {
        if (o === c) continue;
        const gap = o.z - c.z;
        if (gap > 0 && gap < 32 && Math.abs(o.x - c.x) < 2.2 && (!lead || gap < lead.z - c.z)) lead = o;
      }
      let want = c.cruise;
      if (lead) want = Math.min(c.cruise, lead.speed - 1.5);
      // never be the car that closes the last gap: if both other lanes are occupied just ahead/abreast, hang back
      let blockers = 0, slowest = 1e9;
      for (let l = 0; l < 3; l++) {
        if (l === c.lane) continue;
        const o = S.cars.find((o) => o !== c && o.lane === l && o.z - c.z > -3 && o.z - c.z < 18);
        if (o) { blockers++; slowest = Math.min(slowest, o.speed); }
      }
      if (blockers === 2) want = Math.min(want, slowest - 4);
      // traffic brakes for the player too (no cheap rear-endings from behind)
      const pg = S.z - c.z;
      if (pg > 0 && pg < 30 && Math.abs(S.x - c.x) < 2.3) want = Math.min(want, S.speed - 2);
      c.brake = want < c.speed - 0.5;
      c.speed += clamp(want - c.speed, -14 * dt, 6 * dt);

      // occasional lane change (signalled), never into the player's flank
      c.think -= dt;
      if (c.blink === 0 && c.think <= 0) {
        c.think = 1.5 + rnd() * 3;
        if (lead || rnd() < 0.18 * diff.density) {
          const opts = [c.lane - 1, c.lane + 1].filter((l) => l >= 0 && l <= 2 && laneFree(l, c.z, 20) && !wouldWall(l, c.z, c));
          const pick = opts.filter((l) => !(Math.abs(LANES[l] - S.x) < 2.2 && Math.abs(c.z - S.z) < 16));
          if (pick.length) { c.target = pick[(rnd() * pick.length) | 0]; c.blink = 1.1; }
        }
      }
      if (c.blink > 0) {
        c.blink -= dt;
        if (c.blink <= 0.45) c.lane = c.target;
        if (c.blink <= 0) c.blink = 0;
      }
      const tx = LANES[c.lane];
      c.x += clamp(tx - c.x, -2.4 * dt, 2.4 * dt);
      c.z += c.speed * dt;

      // interactions with the player
      const dz = c.z - S.z;
      const dx = c.x - S.x;
      const hitW = car.bike ? 1.45 : CAR_W;
      if (racing && Math.abs(dz) < CAR_LEN && Math.abs(dx) < hitW) {
        if (mode === 'play' && S.invuln <= 0) {
          S.lives -= 1;
          S.invuln = 1.6;
          S.hitstop = 0.085;
          c.hit = 1;
          const side = dx > 0 ? -1 : 1;
          S.vx = side * 7;
          S.x += side * 0.5;
          if (dz > 0) { S.speed = Math.min(S.speed, c.speed * 0.6); c.speed += 5; }
          else S.speed *= 0.8;
          S.chain = 0;
          if (cfg.effects !== 'reduced') { S.shake = 0.45; S.flash = 0.35; }
          emit({ type: 'hit', lives: S.lives });
          if (S.lives <= 0) {
            S.over = true;
            emit({
              type: 'over', score: Math.round(S.score), files: S.files, dist: S.dist,
              top: S.topSpeed, nearMisses: S.nearMisses, shards: S.shards,
            });
          }
        }
      } else if (racing && c.prevDz > 0 && dz <= 0 && Math.abs(dx) < 3.2 && !c.hit && mode === 'play') {
        const pts = 250 * (overclock ? 2 : 1);
        S.score += pts;
        S.nearMisses += 1;
        S.heat = Math.max(0, S.heat - 8);
        emit({ type: 'nearmiss', pts });
      }
      if (dz > 5 && dz < 38 && Math.abs(dx) < 1.3) draftCar = c;
      c.prevDz = dz;
    }
    S.cars = S.cars.filter((c) => c.z > S.z - 45 && c.z < S.z + 700);
    spawnTraffic();

    // slipstream: hang behind a car to charge a boost
    if (racing && draftCar && S.speed > MAX * 0.45) {
      S.draft += dt * 0.6;
      if (S.draft >= 1) {
        S.draft = 0;
        S.slip = 2.2;
        S.heat = Math.max(0, S.heat - 18);
        if (mode === 'play') emit({ type: 'slipstream' });
      }
    } else S.draft = Math.max(0, S.draft - dt * 0.9);

    // ---- shards ----
    for (const s of S.shardList) {
      if (s.taken || s.missed) continue;
      if (s.z <= S.z + 1.6 && s.z >= prevZ - 1.6 && Math.abs(s.x - S.x) < 1.55) {
        s.taken = true;
        S.chain += 1;
        S.shards += 1;
        const mult = (1 + Math.min(4, Math.floor(S.chain / 6))) * (overclock ? 2 : 1);
        S.score += Math.round(100 * mult * (ROUTES[S.route] || ROUTES.expressway).shard);
        if (mode === 'play') {
          emit({ type: 'shard', mult, chain: S.chain, x: s.x });
          if (S.shards % SHARDS_PER_FILE === 0 && S.files < TOTAL_FILES) {
            S.files += 1;
            emit({ type: 'casefile', n: S.files });
            if (S.files === TOTAL_FILES && !S.finale) { S.finale = true; S.finaleT = 0; emit({ type: 'finale' }); }
          }
        }
      } else if (s.z < S.z - 3) {
        s.missed = true;
        if (mode === 'play' && S.chain > 0) { S.chain = 0; emit({ type: 'chain-break' }); }
      }
    }
    S.shardList = S.shardList.filter((s) => s.z > S.z - 20);
    spawnShards();

    if (racing) S.score += S.speed * dt * 0.12 * (overclock ? 2 : 1);
    if (S.over) S.overT += dt;
  }

  reset(opts.seed);

  return {
    S,
    input,
    step,
    reset,
    curveAt,
    hillAt,
    routeAt,
    get mode() { return mode; },
    setMode(m) { mode = m; },
    configure(c) {
      const carChanged = c.car && c.car !== cfg.car;
      cfg = { ...cfg, ...c };
      if (carChanged) S.car = CARS[cfg.car] || CARS.wedge;
    },
    get config() { return cfg; },
  };
}
