// The REDLINE world: everything you see except post-processing.
import * as THREE from 'three';
import { U, std, basic, buildingMaterial, glowMaterial, decalMaterial, skyMaterial, celestialMaterial, particleMaterial, underglowMaterial } from './materials.js';
import { roadTextures, kerbTexture, gridTexture, billboardTexture, neonEnvironment } from './textures.js';
import { buildPlayerCar, createTrafficKit } from './cars.js';
import { TIMES, WEATHER, LIVERIES, GLOWS, SLOGANS } from '../config.js';
import { LANES, MAX, mulberry, SECTOR, TUNNEL } from '../sim.js';
import { createPlayerTrails, createTrafficTrails, createSearchlights, signTextures, createViaduct, createTower, createTunnel, createCityCarpet } from './megacity.js';

const ROAD_LEN = 760;     // visible road strip (m)
const NEAR = 14;          // strip starts this far behind the player
const SPAN = 760;         // recycling span for props
const HDR = (c, k) => new THREE.Color(c).multiplyScalar(k);
const CURVE_K = 0.00045;  // visual bend per unit of sim curvature
const HILL_K = 0.00016;

function stripGeo(w, h, d, segs) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, segs);
  g.translate(0, 0, NEAR - d / 2);
  return g;
}

export function createWorld(renderer, initialCfg) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  camera.position.set(0, 2.1, 6);
  const rnd = mulberry(77);
  let cfg = { ...initialCfg };
  let envRT = null;
  let base = 0;        // floating origin for recycled props
  let heading = 0;     // accumulated turn → rotates the far city & sky
  let camRoll = 0, fov = 60;
  const camPos = new THREE.Vector3(0, 2.1, 6);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight('#ff5aa0', '#120a1e', 0.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ff9a7a', 0.35);
  key.position.set(-60, 90, -120);
  scene.add(key);
  const head = new THREE.SpotLight('#fff1dc', 140, 75, 0.42, 0.6, 1.4);
  const headTarget = new THREE.Object3D();
  scene.add(head, headTarget);
  head.target = headTarget;
  scene.fog = new THREE.FogExp2('#5a1650', 0.004);

  // ---------------------------------------------------------------- sky & far city
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 48, 24), skyMaterial());
  sky.renderOrder = -10;
  scene.add(sky);
  const far = new THREE.Group();
  scene.add(far);
  const celestial = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), celestialMaterial());
  far.add(celestial);

  const farCount = 260;
  const farGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const farSeed = new Float32Array(farCount);
  const farMat = buildingMaterial({ far: true });
  const farCity = new THREE.InstancedMesh(farGeo, farMat, farCount);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < farCount; i++) {
      const a = (rnd() * 2 - 1) * Math.PI * 0.62 + Math.PI; // mostly ahead (−z)
      const r = 900 + rnd() * 600;
      p.set(Math.sin(a) * r, -40, Math.cos(a) * r);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const h = 60 + Math.pow(rnd(), 1.6) * 380;
      s.set(30 + rnd() * 60, h, 30 + rnd() * 60);
      m.compose(p, q, s);
      farCity.setMatrixAt(i, m);
      farSeed[i] = rnd();
    }
    farGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(farSeed, 1));
  }
  farCity.frustumCulled = false;
  far.add(farCity);
  // aircraft beacons on the tallest far towers
  const beaconGeo = new THREE.PlaneGeometry(1, 1);
  const beacons = new THREE.InstancedMesh(beaconGeo, glowMaterial({ gain: 3, fog: false, bent: false }), 40);
  {
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < 40; i++) {
      farCity.getMatrixAt(i * 6, m);
      p.setFromMatrixPosition(m);
      const sy = new THREE.Vector3().setFromMatrixColumn(m, 1).length();
      beacons.setMatrixAt(i, new THREE.Matrix4().compose(p.add(new THREE.Vector3(0, sy + 4, 0)), new THREE.Quaternion(), new THREE.Vector3(14, 14, 14)));
      beacons.setColorAt(i, new THREE.Color('#ff1a3c'));
    }
  }
  beacons.frustumCulled = false;
  far.add(beacons);

  // ---------------------------------------------------------------- road
  const roadTex = roadTextures();
  const roadMat = std({ map: roadTex.map, roughnessMap: roadTex.rough, roughness: 1, metalness: 0.05, envMapIntensity: 0.9 });
  const roadGeo = new THREE.PlaneGeometry(10.8, ROAD_LEN, 1, 380).rotateX(-Math.PI / 2).translate(0, 0, NEAR - ROAD_LEN / 2);
  roadTex.map.repeat.set(1, ROAD_LEN / 24);
  roadTex.rough.repeat.set(1, ROAD_LEN / 24);
  const road = new THREE.Mesh(roadGeo, roadMat);
  scene.add(road);

  const kerbMats = [];
  const kerbs = [-1, 1].map((side) => {
    const tex = kerbTexture(side < 0 ? '#00f0ff' : '#ff2bd6', '#f2efe6');
    tex.repeat.set(1, ROAD_LEN / 6);
    const mat = std({ color: '#222', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.5 });
    kerbMats.push(mat);
    const k = new THREE.Mesh(new THREE.PlaneGeometry(0.7, ROAD_LEN, 1, 380).rotateX(-Math.PI / 2).translate(0, 0, NEAR - ROAD_LEN / 2), mat);
    k.position.set(side * 5.75, 0.01, 0);
    scene.add(k);
    return k;
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, ROAD_LEN, 26, 380).rotateX(-Math.PI / 2).translate(0, -0.02, NEAR - ROAD_LEN / 2),
    std({ color: '#0b0910', roughness: 0.75, metalness: 0.1, emissive: '#ffffff', emissiveMap: gridTexture('#ff2bd6'), emissiveIntensity: 0.25 }),
  );
  ground.material.emissiveMap.repeat.set(260 / 16, ROAD_LEN / 16);
  scene.add(ground);

  // guardrails: brushed metal beam + a neon tube that runs to the horizon
  const railMat = std({ color: '#4a4a58', metalness: 0.85, roughness: 0.3 });
  const tubeMats = [basic({ color: HDR('#00f0ff', 2.4) }), basic({ color: HDR('#ff2bd6', 2.4) })];
  [-1, 1].forEach((side, i) => {
    const beam = new THREE.Mesh(stripGeo(0.16, 0.4, ROAD_LEN, 380), railMat);
    beam.position.set(side * 6.6, 0.72, 0);
    scene.add(beam);
    const tube = new THREE.Mesh(stripGeo(0.07, 0.07, ROAD_LEN, 380), tubeMats[i]);
    tube.position.set(side * 6.6, 0.98, 0);
    scene.add(tube);
  });
  const POST_GAP = 4;
  const postCount = Math.ceil(ROAD_LEN / POST_GAP) * 2;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.85, 0.14), std({ color: '#2a2a33', metalness: 0.6, roughness: 0.5 }), postCount);
  {
    const m = new THREE.Matrix4();
    let i = 0;
    for (let k = 0; k < postCount / 2; k++) for (const side of [-1, 1]) {
      m.makeTranslation(side * 6.66, 0.42, NEAR - k * POST_GAP);
      posts.setMatrixAt(i++, m);
    }
  }
  posts.frustumCulled = false;
  scene.add(posts);

  // ---------------------------------------------------------------- street lamps (periodic: shift by z mod period)
  const LAMP_GAP = 34;
  const lampN = Math.ceil(ROAD_LEN / LAMP_GAP) + 1;
  const lampPeriod = LAMP_GAP * 2;
  const lampGroup = new THREE.Group();
  scene.add(lampGroup);
  const poleMat = std({ color: '#1c1b24', metalness: 0.7, roughness: 0.4 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.16, 9, 10).translate(0, 4.5, 0), poleMat, lampN * 2);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.14, 0.18), poleMat, lampN * 2);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.12, 0.42), basic({ color: '#ffffff' }), lampN * 2);
  const lampGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial({ gain: 0.7 }), lampN * 2);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), decalMaterial({ shape: 'pool', gain: 0.35 }), lampN * 2);
  const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), decalMaterial({ shape: 'streak', gain: 0.9 }), lampN * 2);
  const lampColors = [new THREE.Color(), new THREE.Color()];
  function layoutLamps() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let i = 0;
    for (let k = 0; k < lampN; k++) {
      for (const side of [-1, 1]) {
        // stagger sides by half a gap
        const z = NEAR - k * LAMP_GAP - (side > 0 ? LAMP_GAP / 2 : 0);
        const px = side * 7.3;
        poles.setMatrixAt(i, m.makeTranslation(px, 0, z));
        arms.setMatrixAt(i, m.makeTranslation(px - side * 1.35, 8.9, z));
        heads.setMatrixAt(i, m.makeTranslation(px - side * 2.4, 8.8, z));
        const col = lampColors[side < 0 ? 0 : 1];
        heads.setColorAt(i, col.clone().multiplyScalar(4.5));
        lampGlow.setMatrixAt(i, m.compose(p.set(px - side * 2.4, 8.75, z), q, s.set(5, 5, 5)));
        lampGlow.setColorAt(i, col);
        pools.setMatrixAt(i, m.compose(p.set(px - side * 2.9, 0.02, z), q, s.set(9, 1, 11)));
        pools.setColorAt(i, col);
        streaks.setMatrixAt(i, m.compose(p.set(px - side * 2.4, 0.025, z + 7), q, s.set(1.1, 1, 15)));
        streaks.setColorAt(i, col);
        i++;
      }
    }
    for (const im of [poles, arms, heads, lampGlow, pools, streaks]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false;
    }
  }
  lampGroup.add(poles, arms, heads, lampGlow, pools, streaks);

  // ---------------------------------------------------------------- city blocks (recycled)
  const B_COUNT = 170;
  const bGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bSeed = new Float32Array(B_COUNT);
  bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(bSeed, 1));
  const bMat = buildingMaterial();
  const buildings = new THREE.InstancedMesh(bGeo, bMat, B_COUNT);
  buildings.frustumCulled = false;
  const signTex = signTextures();
  const signGeo = new THREE.PlaneGeometry(1, 1);
  const signMeshes = signTex.map((t) => {
    const im = new THREE.InstancedMesh(signGeo, basic({ map: t, color: HDR('#ffffff', 2.2), side: THREE.DoubleSide }), B_COUNT);
    im.frustumCulled = false;
    return im;
  });
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const cityGroup = new THREE.Group();
  cityGroup.add(buildings, ...signMeshes);
  scene.add(cityGroup);
  const B = [];
  const tmpM = new THREE.Matrix4();
  let routeAt = () => 'expressway';
  function rollBuilding(b, z) {
    const row = b.row;
    b.z = z;
    const back = routeAt(z) === 'backstreets';
    b.w = row === 0 ? 10 + rnd() * 14 : 16 + rnd() * 28;
    b.d = 10 + rnd() * 16;
    b.h = row === 0 ? 8 + Math.pow(rnd(), 1.8) * 50 : 30 + Math.pow(rnd(), 1.3) * 160;
    b.x = b.side * (row === 0 ? (back ? 9.6 + rnd() * 1.5 : 16 + rnd() * 10) + b.w / 2 : (back ? 28 : 38) + rnd() * 45 + b.w / 2);
    if (back && row === 0) b.h = 14 + Math.pow(rnd(), 1.4) * 60; // backstreets: a canyon of signs
    // gaps in the street wall: some lots are empty plazas
    if (row === 0 && rnd() < (back ? 0.05 : 0.22)) b.h = 0.01;
    b.seed = rnd();
    b.sign = row === 0 && b.h > 6 && rnd() < (back ? 0.97 : 0.7);
    b.signH = 4 + rnd() * 8;
    b.signY = 4 + rnd() * Math.max(1, b.h - b.signH - 6);
    b.signC = (rnd() * signTex.length) | 0;
  }
  function writeBuilding(i) {
    const b = B[i];
    const zw = -(b.z - base);
    tmpM.compose(new THREE.Vector3(b.x, 0, zw), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    buildings.setMatrixAt(i, tmpM);
    bSeed[i] = b.seed;
    // blade sign: sticks out from the facade toward the street, faces down the road
    for (const sm of signMeshes) sm.setMatrixAt(i, ZERO);
    if (b.sign) {
      const h = Math.min(b.signH, b.h - 2);
      const fx = b.x - b.side * (b.w / 2 + 1.3);
      tmpM.compose(new THREE.Vector3(fx, Math.max(3, b.signY) + h / 2, zw + b.d / 2 - 1), new THREE.Quaternion(), new THREE.Vector3(h * 0.286, h, 1));
      signMeshes[b.signC].setMatrixAt(i, tmpM);
    }
  }
  for (let i = 0; i < B_COUNT; i++) {
    const side = i % 2 ? 1 : -1;
    const row = i % 4 < 2 ? 0 : 1;
    B.push({ side, row });
    rollBuilding(B[i], -NEAR + rnd() * SPAN);
  }

  // ---------------------------------------------------------------- billboards & gantries
  const boardTex = SLOGANS.map((t, i) => billboardTexture(t, ['#fcee0a', '#00f0ff', '#ff2bd6', '#b8ff2e'][i % 4], i % 3 === 0 ? '// SAID BY THE CITY' : ''));
  const boardMats = boardTex.map((t) => basic({ map: t, color: HDR('#ffffff', 1.7) }));
  if (document.fonts?.ready) Promise.all([document.fonts.load('900 40px "Noto Sans JP"', '高速'), document.fonts.load('700 40px Rajdhani'), document.fonts.load('400 20px "Share Tech Mono"')]).catch(() => {}).then(() => SLOGANS.forEach((t, i) => {
    const fresh = billboardTexture(t, ['#fcee0a', '#00f0ff', '#ff2bd6', '#b8ff2e'][i % 4], i % 3 === 0 ? '// SAID BY THE CITY' : '');
    boardTex[i].image = fresh.image;
    boardTex[i].needsUpdate = true;
  }));
  const boardGeo = new THREE.PlaneGeometry(10, 3.75);
  const backGeo = new THREE.BoxGeometry(10.4, 4.1, 0.3);
  const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 7, 8).translate(0, 3.5, 0);
  const darkMat = std({ color: '#111018', metalness: 0.5, roughness: 0.5 });
  const boards = [];
  let boardIdx = 0;
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(boardGeo, boardMats[0]);
    panel.position.set(0, 9, 0.17);
    const back = new THREE.Mesh(backGeo, darkMat);
    back.position.set(0, 9, 0);
    g.add(panel, back);
    for (const lx of [-3, 3]) { const l = new THREE.Mesh(legGeo, darkMat); l.position.x = lx; g.add(l); }
    scene.add(g);
    boards.push({ g, panel, z: 0, side: 1 });
  }
  function rollBoard(b, z) {
    b.z = z;
    b.side = rnd() < 0.5 ? -1 : 1;
    b.x = b.side * (12 + rnd() * 3);
    b.panel.material = boardMats[boardIdx++ % boardMats.length];
    b.g.rotation.y = -b.side * 0.38;
  }
  boards.forEach((b, i) => rollBoard(b, 120 + i * (SPAN / 6)));

  const gantryTex = [billboardTexture('◀ EXPRESSWAY   BACKSTREETS ▶', '#fcee0a', '高速 ・ 路地 // THE LANE YOU HOLD PICKS THE ROUTE'), billboardTexture('RING ROAD · KEEP LEFT FOR THE EXPRESSWAY', '#00f0ff')];
  const gantries = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.2, 0.6).translate(0, 4.1, 0), darkMat);
      p.position.x = sx * 7.6;
      g.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.9, 0.7), darkMat);
    beam.position.y = 7.9;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), basic({ map: gantryTex[i], color: HDR('#ffffff', 1.6) }));
    sign.position.set(0, 9.75, 0.2);
    const signBack = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.0, 0.3), darkMat);
    signBack.position.set(0, 9.75, 0);
    g.add(beam, sign, signBack);
    // lane-control lights hanging over each lane
    LANES.forEach((lx, li) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), basic({ color: HDR(li === 1 ? '#b8ff2e' : '#00f0ff', 4) }));
      l.position.set(lx, 7.15, 0.38);
      g.add(l);
    });
    const tube = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.08), basic({ color: HDR('#ff2bd6', 5) }));
    tube.position.set(0, 8.4, 0.38);
    g.add(tube);
    scene.add(g);
    gantries.push({ g, z: i === 0 ? SECTOR : SECTOR - 700 });
  }

  // ---------------------------------------------------------------- shards
  const SHARD_MAX = 72;
  const shardMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.5, 0), basic({ color: HDR('#b8ff2e', 3.2) }), SHARD_MAX);
  const shardCore = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.62, 0), basic({ color: HDR('#ffffff', 0.4), wireframe: true }), SHARD_MAX);
  const shardGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial({ gain: 1.4 }), SHARD_MAX);
  for (const m of [shardMesh, shardCore, shardGlow]) { m.frustumCulled = false; scene.add(m); }
  for (let i = 0; i < SHARD_MAX; i++) shardGlow.setColorAt(i, new THREE.Color('#b8ff2e'));

  // ---------------------------------------------------------------- traffic
  const kit = createTrafficKit();
  const pool = { sedan: [], hatch: [], hauler: [] };
  const live = new Map();
  const tailStreaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), decalMaterial({ shape: 'streak', gain: 1.1 }), 64);
  tailStreaks.frustumCulled = false;
  for (let i = 0; i < 64; i++) tailStreaks.setColorAt(i, new THREE.Color('#ff1a3c'));
  scene.add(tailStreaks);
  function getCar(c) {
    let v = live.get(c.id);
    if (v) return v;
    v = pool[c.kind].pop() || kit.make(c.kind, c.paint);
    scene.add(v.group);
    v.group.visible = true;
    live.set(c.id, v);
    return v;
  }

  // ---------------------------------------------------------------- player
  let player = null;
  const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), underglowMaterial());
  glowPlane.position.y = 0.03;
  function buildPlayer() {
    if (player) {
      scene.remove(player.group);
      player.group.traverse((o) => { if (o.isMesh && o !== glowPlane) { o.geometry.dispose(); } });
    }
    const liv = LIVERIES[cfg.livery] || LIVERIES[0];
    const glow = (GLOWS[cfg.glow] || GLOWS[0]).color;
    player = buildPlayerCar(cfg.car, liv, glow);
    glowPlane.scale.set(player.bike ? 2.2 : player.width + 2.4, 1, player.length + (player.bike ? 1.6 : 2.6));
    glowPlane.rotation.set(0, 0, 0);
    glowPlane.material.uniforms.uColor.value.set(glow || '#000000');
    glowPlane.visible = !!glow;
    player.group.add(glowPlane);
    scene.add(player.group);
  }

  // ---------------------------------------------------------------- particles
  const P_MAX = 600;
  const pPos = new Float32Array(P_MAX * 3), pCol = new Float32Array(P_MAX * 3), pSize = new Float32Array(P_MAX);
  const pVel = new Float32Array(P_MAX * 3), pLife = new Float32Array(P_MAX), pMaxLife = new Float32Array(P_MAX), pBase = new Float32Array(P_MAX * 3);
  const pGrav = new Float32Array(P_MAX);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  const pMat = particleMaterial();
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  scene.add(particles);
  let pNext = 0;
  function emit(n, at, opt) {
    const col = new THREE.Color(opt.color);
    for (let k = 0; k < n; k++) {
      const i = pNext++ % P_MAX;
      pPos[i * 3] = at.x + (Math.random() - 0.5) * (opt.spread || 0.3);
      pPos[i * 3 + 1] = at.y + Math.random() * (opt.spreadY || 0.2);
      pPos[i * 3 + 2] = at.z + (Math.random() - 0.5) * (opt.spread || 0.3);
      const sp = opt.speed * (0.4 + Math.random() * 0.8);
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.2) * Math.PI * 0.6;
      pVel[i * 3] = Math.cos(a) * Math.cos(e) * sp + (opt.vx || 0);
      pVel[i * 3 + 1] = Math.abs(Math.sin(e)) * sp + (opt.vy || 0);
      pVel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * sp + (opt.vz || 0);
      pLife[i] = pMaxLife[i] = opt.life * (0.6 + Math.random() * 0.6);
      pBase[i * 3] = col.r * opt.gain; pBase[i * 3 + 1] = col.g * opt.gain; pBase[i * 3 + 2] = col.b * opt.gain;
      pSize[i] = opt.size * (0.6 + Math.random() * 0.8);
      pGrav[i] = opt.gravity || 0;
    }
  }
  function updateParticles(dt, worldDz) {
    for (let i = 0; i < P_MAX; i++) {
      if (pLife[i] <= 0) { pSize[i] = 0; continue; }
      pLife[i] -= dt;
      const t = Math.max(0, pLife[i] / pMaxLife[i]);
      pVel[i * 3 + 1] -= pGrav[i] * dt;
      pPos[i * 3] += pVel[i * 3] * dt;
      pPos[i * 3 + 1] = Math.max(0.02, pPos[i * 3 + 1] + pVel[i * 3 + 1] * dt);
      pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt + worldDz;
      pCol[i * 3] = pBase[i * 3] * t; pCol[i * 3 + 1] = pBase[i * 3 + 1] * t; pCol[i * 3 + 2] = pBase[i * 3 + 2] * t;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aColor.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
  }

  // ---------------------------------------------------------------- rain
  const RAIN_N = 1400;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainSeed = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { rainSeed[i * 3] = (Math.random() - 0.5) * 50; rainSeed[i * 3 + 1] = Math.random() * 22; rainSeed[i * 3 + 2] = -Math.random() * 70 + 6; }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: HDR('#bcd6ff', 0.9), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  rain.frustumCulled = false;
  scene.add(rain);

  // ---------------------------------------------------------------- megacity layer
  const trails = createPlayerTrails(scene);
  const tTrails = createTrafficTrails(scene, 64);
  const searchlights = createSearchlights(far);
  const viaduct = createViaduct(scene, ROAD_LEN, NEAR);
  const tower = createTower(far);
  createCityCarpet(far);
  const tunnel = createTunnel(scene, TUNNEL);
  let lastReroute = -1;

  // ---------------------------------------------------------------- config
  function applyConfig(next) {
    const prev = cfg;
    cfg = { ...cfg, ...next };
    const T = TIMES[cfg.time] || TIMES.dusk;
    const Wt = WEATHER[cfg.weather] || WEATHER.clear;
    if (!prev._applied || prev.time !== cfg.time) {
      const sm = sky.material.uniforms;
      sm.uZenith.value.set(T.zenith);
      sm.uHorizon.value.set(T.horizon);
      sm.uGlow.value.set(T.glow);
      sm.uFogC.value.set(T.fog);
      sm.uStars.value = T.stars;
      scene.fog.color.set(T.fog);
      U.uFogColor.value.set(T.fog);
      hemi.color.set(T.hemi[0]);
      hemi.groundColor.set(T.hemi[1]);
      hemi.intensity = T.hemi[2] * 0.3;
      key.color.set(T.key[0]);
      key.intensity = T.key[1] * 0.6;
      const cu = celestial.material.uniforms;
      cu.uColor.value.set(T.body.color);
      cu.uGlowC.value.set(T.glow).multiplyScalar(0.8);
      cu.uSun.value = T.body.kind === 'sun' ? 1 : 0;
      celestial.scale.setScalar(T.body.size * 3);
      celestial.position.set(-140, T.body.y + 40, -1500);
      celestial.lookAt(0, T.body.y * 0.4, 0);
      T.windows.forEach((c, i) => { bMat.uniforms.uWin.value[i].set(c); farMat.uniforms.uWin.value[i].set(c); });
      lampColors[0].set(T.windows[1]).lerp(new THREE.Color('#ffffff'), 0.35);
      lampColors[1].set(T.windows[2]).lerp(new THREE.Color('#ffffff'), 0.35);
      layoutLamps();
      if (envRT) envRT.dispose();
      envRT = neonEnvironment(renderer, { horizon: T.horizon, zenith: T.zenith, glow: T.glow, a: '#00f0ff', b: '#ff2bd6', c: T.windows[0] });
      scene.environment = envRT.texture;
    }
    U.uFogDensity.value = T.fogDensity * (Wt.rain ? 1.25 : 1);
    scene.fog.density = U.uFogDensity.value;
    // wet road: glossier, stronger reflection streaks
    roadMat.roughness = Wt.rain ? 0.55 : 0.85;
    roadMat.envMapIntensity = Wt.rain ? 0.9 : 0.45;
    streaks.material.uniforms.uGain.value = 0.55 + Wt.wet * 0.9;
    tailStreaks.material.uniforms.uGain.value = 0.5 + Wt.wet * 1.0;
    pools.material.uniforms.uGain.value = 0.25 + Wt.wet * 0.2;
    rain.visible = !!Wt.rain;
    searchlights.visible = !!T.searchlights;
    if (!prev._applied || prev.car !== cfg.car || prev.livery !== cfg.livery || prev.glow !== cfg.glow) buildPlayer();
    cfg._applied = true;
  }

  // initial building matrices
  for (let i = 0; i < B_COUNT; i++) writeBuilding(i);
  buildings.instanceMatrix.needsUpdate = true;
  for (const sm of signMeshes) sm.instanceMatrix.needsUpdate = true;
  bGeo.attributes.aSeed.needsUpdate = true;
  applyConfig(cfg);

  // ---------------------------------------------------------------- per-frame
  const v3 = new THREE.Vector3();
  const look = new THREE.Vector3();
  let lastZ = 0;
  let blinkClock = 0;

  function update(sim, dt, fx) {
    const S = sim.S;
    const dz = S.z - lastZ;
    lastZ = S.z;
    const sp = S.speed / MAX;
    U.uTime.value += dt;
    blinkClock += dt;
    const curveAhead = sim.curveAt(S.z + 70);
    const hillAhead = sim.hillAt(S.z + 90);
    U.uCurve.value += (curveAhead * CURVE_K - U.uCurve.value) * Math.min(1, dt * 2.5);
    U.uHill.value += (hillAhead * HILL_K - U.uHill.value) * Math.min(1, dt * 2.0);
    heading += sim.curveAt(S.z) * dz * 0.0016;
    far.rotation.y = heading;
    sky.rotation.y = heading;
    far.position.y = -U.uHill.value / HILL_K * 18;

    // floating origin for props
    if (S.z - base > 4000) {
      base += 4000;
      for (let i = 0; i < B_COUNT; i++) writeBuilding(i);
      buildings.instanceMatrix.needsUpdate = true;
      for (const sm of signMeshes) sm.instanceMatrix.needsUpdate = true;
    }

    // scrolling surfaces
    const tz = S.z / 24;
    roadTex.map.offset.y = tz % 1;
    roadTex.rough.offset.y = tz % 1;
    for (const m of kerbMats) m.emissiveMap.offset.y = (S.z / 6) % 1;
    ground.material.emissiveMap.offset.y = (S.z / 16) % 1;
    posts.position.z = S.z % POST_GAP;
    lampGroup.position.z = S.z % lampPeriod;

    // city
    cityGroup.position.z = S.z - base;
    let dirty = false;
    for (let i = 0; i < B_COUNT; i++) {
      if (B[i].z < S.z - NEAR - 30) {
        rollBuilding(B[i], B[i].z + SPAN);
        writeBuilding(i);
        dirty = true;
      }
    }
    if (dirty) {
      buildings.instanceMatrix.needsUpdate = true;
      for (const sm of signMeshes) sm.instanceMatrix.needsUpdate = true;
      bGeo.attributes.aSeed.needsUpdate = true;
    }
    for (const b of boards) {
      if (b.z < S.z - 30) rollBoard(b, b.z + SPAN + rnd() * 80);
      b.g.position.set(b.x, 0, -(b.z - S.z));
    }
    routeAt = sim.routeAt;
    gantries[0].z = S.nextJunction;
    gantries[1].z = S.nextJunction - 700 > S.z - 30 ? S.nextJunction - 700 : S.nextJunction + SECTOR - 700;
    for (const g of gantries) g.g.position.set(0, 0, -(g.z - S.z));
    // the tunnel sits right after the most recent junction (or the upcoming one)
    const lastJ = S.nextJunction - SECTOR;
    const tunZ = S.z < lastJ + TUNNEL + 40 && lastJ > 0 ? lastJ : S.nextJunction;
    tunnel.position.set(0, 0, -(tunZ - S.z));
    tunnel.visible = !S.finale;
    // inside the tunnel, rebuild the city ahead for the route just chosen (hidden by the walls)
    if (lastJ > 0 && S.z > lastJ + 25 && S.z < lastJ + TUNNEL && lastReroute !== lastJ) {
      lastReroute = lastJ;
      for (let i = 0; i < B_COUNT; i++) if (B[i].z > lastJ + TUNNEL - 10) { rollBuilding(B[i], B[i].z); writeBuilding(i); }
      for (const b of B) if (b.z > S.z - 40 && b.z < lastJ + TUNNEL - 10) b.h = Math.min(b.h, 0.01);
      for (let i = 0; i < B_COUNT; i++) writeBuilding(i);
      buildings.instanceMatrix.needsUpdate = true;
      for (const sm of signMeshes) sm.instanceMatrix.needsUpdate = true;
      bGeo.attributes.aSeed.needsUpdate = true;
      viaduct.setVisible(sim.routeAt(S.z + 300) === 'expressway');
    }

    // shards
    let si = 0;
    const m = tmpM, q = new THREE.Quaternion();
    for (const s of S.shardList) {
      if (si >= SHARD_MAX) break;
      const zw = -(s.z - S.z);
      if (s.taken || zw < -700) continue;
      const bob = 1.1 + Math.sin(U.uTime.value * 3 + s.id) * 0.18;
      q.setFromEuler(new THREE.Euler(0, U.uTime.value * 2.2 + s.id, 0));
      m.compose(v3.set(s.x, bob, zw), q, new THREE.Vector3(1, 1.25, 1));
      shardMesh.setMatrixAt(si, m);
      shardCore.setMatrixAt(si, m);
      m.compose(v3.set(s.x, bob, zw), new THREE.Quaternion(), new THREE.Vector3(4.2, 4.2, 4.2));
      shardGlow.setMatrixAt(si, m);
      si++;
    }
    for (const mesh of [shardMesh, shardCore, shardGlow]) { mesh.count = si; mesh.instanceMatrix.needsUpdate = true; }
    shardGlow.instanceColor.needsUpdate = true;

    searchlights.update(U.uTime.value);
    viaduct.update(S, U.uTime.value);

    // traffic
    tTrails.begin();
    const seen = new Set();
    let ti = 0;
    for (const c of S.cars) {
      const zw = -(c.z - S.z);
      if (zw < -720) continue;
      seen.add(c.id);
      const v = getCar(c);
      const prevX = v.group.position.x;
      v.group.position.set(c.x, 0, zw);
      const lat = dt > 0 ? (c.x - prevX) / dt : 0;
      v.group.rotation.y = -lat * 0.035;
      const blinkOn = c.blink > 0 && Math.floor(blinkClock * 3.2) % 2 === 0;
      const dir = Math.sign(LANES[c.target] - c.x);
      v.blinkers[0].visible = blinkOn && dir < 0;
      v.blinkers[1].visible = blinkOn && dir > 0;
      v.tail.color.setRGB(1, 0.1, 0.23).multiplyScalar(c.brake ? 9 : 3.2);
      {
        const rz = zw + v.len / 2;
        const tw = c.kind === 'hauler' ? 1.05 : c.kind === 'hatch' ? 0.76 : 0.6;
        const ty = c.kind === 'hauler' ? 0.62 : c.kind === 'hatch' ? 0.86 : 0.66;
        const len = 1 + c.speed * 0.11;
        tTrails.add(c.x - tw, ty, rz, len);
        tTrails.add(c.x + tw, ty, rz, len);
      }
      if (ti < 31) {
        const rearZ = zw + v.len / 2;
        const w = c.kind === 'hauler' ? 1.05 : 0.65;
        for (const sx of [-1, 1]) {
          m.compose(v3.set(c.x + sx * w, 0.025, rearZ + 5.5), new THREE.Quaternion(), new THREE.Vector3(0.7, 1, c.brake ? 13 : 10));
          tailStreaks.setMatrixAt(ti * 2 + (sx > 0 ? 1 : 0), m);
        }
        ti++;
      }
    }
    tTrails.end();
    tailStreaks.count = ti * 2;
    tailStreaks.instanceMatrix.needsUpdate = true;
    for (const [id, v] of live) {
      if (!seen.has(id)) {
        scene.remove(v.group);
        live.delete(id);
        const kind = v.len > 8 ? 'hauler' : v.len > 4.2 ? 'sedan' : 'hatch';
        pool[kind].push(v);
      }
    }

    // player
    const P = player;
    const pg = P.group;
    pg.position.set(S.x, 0, 0);
    const pitch = -Math.min(0.03, Math.max(-0.03, (S.speed - (P.lastSpeed || 0)) * 0.01));
    if (P.bike) {
      const sliding = sim.input.brake && S.speed > 22 && sim.mode === 'play';
      const dir = S.steer < -0.05 ? 1 : -1;
      P.slide = (P.slide || 0) + ((sliding ? dir * 0.95 : 0) - (P.slide || 0)) * Math.min(1, dt * (sliding ? 5 : 3));
      if (Math.abs(P.slide) > 0.3) {
        const side = Math.sign(P.slide);
        emit(4, { x: S.x + side * 0.9, y: 0.05, z: 1.0 }, { color: '#b8ff8a', gain: 7, speed: 4, life: 0.4, size: 0.07, gravity: 10, vz: 9, vx: side * 3 });
        emit(1, { x: S.x + side * 0.6, y: 0.1, z: 1.2 }, { color: '#fff4d0', gain: 4, speed: 2, life: 0.25, size: 0.05, vz: 7 });
      }
      pg.rotation.set(pitch, -S.vx * 0.02 + P.slide, -S.steer * 0.42 - S.vx * 0.035 - P.slide * 0.55);
      glowPlane.rotation.z = -pg.rotation.z; // keep the pool flat on the road while the bike leans
    }
    else pg.rotation.set(pitch, -S.vx * 0.032 - S.steer * 0.04, S.vx * 0.012);
    P.lastSpeed = S.speed;
    const spin = (S.speed * dt) / P.wheelR;
    P.wheels.forEach((w, i) => {
      w.rotation.x -= spin;
      if (P.bike ? i === 0 : i < 2) w.rotation.y = -S.steer * (P.bike ? 0.12 : 0.32);
    });
    for (const f of P.flames) {
      f.visible = S.overclock || S.slip > 0;
      f.scale.set(1, 0.7 + Math.random() * 0.8 + (S.slip > 0 ? 0.6 : 0), 1);
    }
    pg.visible = !(S.invuln > 0 && Math.floor(S.time * 16) % 2 === 0 && sim.mode === 'play');
    if (P.glowLight) P.glowLight.intensity = 26 * (0.85 + 0.15 * Math.sin(U.uTime.value * 9));
    trails.update(S, P.rearZ, P.tailHalfW, P.tailY, fx.view === 'showroom' ? 0 : 0.38);
    head.position.set(S.x, 0.75, -2.3);
    headTarget.position.set(S.x - S.vx * 0.3, 0, -26);

    // particles: sparks while scraping, embers on overclock, spray in rain
    if (S.scrape > 0) emit(5, { x: S.x + Math.sign(S.x) * 1.0, y: 0.4, z: 0.6 }, { color: '#ffd27a', gain: 6, speed: 5, life: 0.45, size: 0.09, gravity: 14, vz: 6, vx: -Math.sign(S.x) * 2 });
    if (S.overclock && fx.full) emit(1, { x: S.x + (Math.random() < 0.5 ? -0.34 : 0.34), y: 0.3, z: P.length / 2 + 0.6 }, { color: '#4fd8ff', gain: 4, speed: 1.5, life: 0.35, size: 0.06, vz: 4 });
    if (rain.visible && S.speed > 12) emit(2, { x: S.x, y: 0.15, z: P.length / 2 + 0.4 }, { color: '#9fb6d9', gain: 0.5, speed: 3, life: 0.5, size: 0.22, spread: 1.6, vz: 6, vy: 1, gravity: 6 });
    updateParticles(dt, 0);

    // rain streaks move with the camera
    if (rain.visible) {
      const fall = 30 * dt, slide = S.speed * dt * 0.75;
      const tilt = Math.min(1.2, S.speed * 0.016);
      for (let i = 0; i < RAIN_N; i++) {
        let y = rainSeed[i * 3 + 1] - fall, z = rainSeed[i * 3 + 2] + slide;
        if (y < 0) y += 22;
        if (z > 8) z -= 76;
        rainSeed[i * 3 + 1] = y; rainSeed[i * 3 + 2] = z;
        const x = rainSeed[i * 3] + camera.position.x;
        rainPos.set([x, y, z, x, y + 0.55, z - tilt], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    if (fx.view === 'showroom') {
      // slow orbit around the parked car
      const a = U.uTime.value * 0.16 + 0.6;
      const r = (6.4 + Math.sin(U.uTime.value * 0.1) * 0.6) * (camera.aspect < 1 ? 1.9 : 1);
      fov += (42 - fov) * Math.min(1, dt * 2);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.set(S.x + Math.sin(a) * r, 1.35 + Math.sin(U.uTime.value * 0.13) * 0.25, Math.cos(a) * r);
      camera.lookAt(S.x, 0.55, 0);
      camPos.copy(camera.position);
      camRoll = 0;
      return;
    }
    if (S.finale && S.finaleT > 1.2) {
      // the lookout: rise above the road and turn to the tower
      const k = Math.min(1, (S.finaleT - 1.2) / 6);
      const e = k * k * (3 - 2 * k);
      const tw = tower.getWorldPosition(v3);
      fov += (50 - fov) * Math.min(1, dt * 1.5);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.set(S.x * (1 - e), 2.1 + e * 165, 6.2 + e * 60);
      const lookAt = new THREE.Vector3(S.x * 0.9, 0.95, -16).lerp(tw.clone().setY(tw.y + 150), e);
      camera.lookAt(lookAt);
      camPos.copy(camera.position);
      return;
    }
    // camera: chase, FOV breathes with speed, roll into the drift, shake on impact
    const targetFov = 58 + sp * 13 + (S.overclock ? 5 : 0) + (S.slip > 0 ? 4 : 0);
    fov += (targetFov - fov) * Math.min(1, dt * 3);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camPos.x += (S.x * 0.84 - camPos.x) * Math.min(1, dt * 5);
    camPos.y = (P.bike ? 1.55 : 2.05) + sp * 0.12;
    camPos.z = (P.bike ? 4.4 : 6.2) - sp * 0.5;
    camera.position.copy(camPos);
    if (fx.full && S.shake > 0) {
      const k = S.shake * 0.5;
      camera.position.x += (Math.random() - 0.5) * k;
      camera.position.y += (Math.random() - 0.5) * k;
    }
    look.set(S.x * 0.92, P.bike ? 0.85 : 0.95, -16);
    look.x += U.uCurve.value * 16 * 16 * 0.6;
    look.y += U.uHill.value * 16 * 16;
    camera.lookAt(look);
    const targetRoll = fx.full ? -S.vx * 0.009 + sim.curveAt(S.z) * sp * 0.035 : 0;
    camRoll += (targetRoll - camRoll) * Math.min(1, dt * 4);
    camera.rotateZ(camRoll);
  }

  function burst(kind, x) {
    if (kind === 'shard') emit(26, { x, y: 1.1, z: -0.5 }, { color: '#b8ff2e', gain: 5, speed: 7, life: 0.55, size: 0.12, vz: 8 });
    if (kind === 'hit') emit(60, { x, y: 0.6, z: -2 }, { color: '#ffd27a', gain: 7, speed: 9, life: 0.7, size: 0.1, gravity: 12, vz: 4 });
    if (kind === 'slip') emit(40, { x, y: 0.5, z: 2.5 }, { color: '#00f0ff', gain: 5, speed: 4, life: 0.6, size: 0.1, vz: 14, spread: 1.4 });
    if (kind === 'file') emit(70, { x, y: 1.4, z: -1 }, { color: '#fcee0a', gain: 6, speed: 9, life: 0.9, size: 0.14, vz: 6 });
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = h * 0.9;
  }

  function dispose() {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => { for (const k in mm) if (mm[k] && mm[k].isTexture) mm[k].dispose(); mm.dispose(); });
    });
    if (envRT) envRT.dispose();
  }

  return { scene, camera, update, applyConfig, resize, burst, dispose, get config() { return cfg; } };
}
