// Vehicles. All original designs, modelled from extruded side profiles + primitives.
// Convention: origin on the ground at the car's centre, nose pointing −z (the direction of travel).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { std, basic } from './materials.js';
import { plateTexture } from './textures.js';

const HDR = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// Extrude a side profile (x: 0 = rear … L = nose, y: height) across the car's width, smooth-shaded.
function profile(draw, L, width, bevel = 0.07) {
  const s = new THREE.Shape();
  draw(s);
  const depth = Math.max(0.01, width - bevel * 2);
  let g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 4, curveSegments: 14, steps: 1,
  });
  g.translate(-L / 2, 0, -depth / 2);
  g.rotateY(Math.PI / 2); // +x (nose) → −z
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function wheels(group, { r = 0.34, x, zs, trimMat, tireMat }) {
  const tire = new THREE.CylinderGeometry(r, r, 0.27, 28);
  tire.rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.28, 20);
  rim.rotateZ(Math.PI / 2);
  const list = [];
  for (const z of zs) for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(tire, tireMat));
    const rm = new THREE.Mesh(rim, trimMat);
    w.add(rm);
    // spokes so the spin reads
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(box(0.29, 0.05, r * 1.15), trimMat);
      sp.rotation.x = (i / 5) * Math.PI;
      w.add(sp);
    }
    w.position.set(sx * x, r, z);
    group.add(w);
    list.push(w);
  }
  return list;
}

// ------------------------------------------------------------------ player cars
const CHASSIS = {
  wedge: {
    L: 4.55, W: 1.96, wheelR: 0.35, wheelZ: [-1.45, 1.42],
    body: (s) => {
      s.moveTo(0.05, 0.3);
      s.lineTo(0.0, 0.64);
      s.quadraticCurveTo(0.02, 0.84, 0.3, 0.87);
      s.lineTo(1.35, 0.91);
      s.lineTo(2.9, 0.82);
      s.quadraticCurveTo(3.9, 0.66, 4.45, 0.47);
      s.quadraticCurveTo(4.62, 0.37, 4.5, 0.26);
      s.lineTo(4.15, 0.2);
      s.lineTo(0.4, 0.2);
      s.quadraticCurveTo(0.08, 0.2, 0.05, 0.3);
    },
    cabin: (s) => {
      s.moveTo(1.0, 0.86);
      s.quadraticCurveTo(1.35, 1.17, 2.0, 1.2);
      s.lineTo(2.7, 1.18);
      s.quadraticCurveTo(3.2, 1.1, 3.6, 0.8);
      s.lineTo(1.0, 0.86);
    },
    cabinW: 1.46,
    rear(g, M, W, RZ) {
      // full-width light blade + corner fangs
      const bar = new THREE.Mesh(box(W * 0.84, 0.06, 0.05), M.tail);
      bar.position.set(0, 0.72, RZ - 0.01);
      g.add(bar);
      for (const sx of [-1, 1]) {
        const f = new THREE.Mesh(box(0.07, 0.2, 0.05), M.tail);
        f.position.set(sx * (W * 0.42), 0.64, RZ - 0.02);
        g.add(f);
      }
      // wing
      const wing = new THREE.Mesh(box(W * 0.96, 0.045, 0.34), M.trim);
      wing.position.set(0, 1.13, RZ - 0.38);
      wing.rotation.x = -0.08;
      g.add(wing);
      for (const sx of [-1, 1]) {
        const st = new THREE.Mesh(box(0.05, 0.25, 0.12), M.trim);
        st.position.set(sx * 0.48, 0.99, RZ - 0.34);
        g.add(st);
        const ep = new THREE.Mesh(box(0.03, 0.17, 0.38), M.trim);
        ep.position.set(sx * W * 0.48, 1.12, RZ - 0.38);
        g.add(ep);
      }
    },
  },
  coupe: {
    L: 4.8, W: 1.94, wheelR: 0.35, wheelZ: [-1.55, 1.5],
    body: (s) => {
      s.moveTo(0.06, 0.32);
      s.quadraticCurveTo(-0.03, 0.6, 0.14, 0.75);
      s.quadraticCurveTo(0.6, 0.85, 1.45, 0.87);
      s.lineTo(3.2, 0.79);
      s.quadraticCurveTo(4.3, 0.67, 4.75, 0.45);
      s.quadraticCurveTo(4.86, 0.31, 4.7, 0.24);
      s.lineTo(0.42, 0.22);
      s.quadraticCurveTo(0.1, 0.22, 0.06, 0.32);
    },
    cabin: (s) => {
      s.moveTo(0.45, 0.84);
      s.quadraticCurveTo(1.55, 1.2, 2.55, 1.18);
      s.quadraticCurveTo(3.3, 1.13, 3.78, 0.8);
      s.lineTo(0.45, 0.84);
    },
    cabinW: 1.5,
    rear(g, M, W, RZ) {
      // twin round lamps per side + a thin dim connector
      const disc = new THREE.CircleGeometry(0.1, 24);
      for (const sx of [-1, 1]) for (const o of [0.36, 0.62]) {
        const d = new THREE.Mesh(disc, M.tail);
        d.position.set(sx * W * o * 0.75, 0.6, RZ + 0.005);
        g.add(d);
      }
      const con = new THREE.Mesh(box(W * 0.5, 0.02, 0.02), M.tailDim);
      con.position.set(0, 0.6, RZ);
      g.add(con);
      const duck = new THREE.Mesh(box(W * 0.8, 0.05, 0.16), M.trim);
      duck.position.set(0, 0.86, RZ - 0.12);
      duck.rotation.x = -0.25;
      g.add(duck);
    },
  },
  kei: {
    L: 3.5, W: 1.6, wheelR: 0.3, wheelZ: [-1.12, 1.1],
    body: (s) => {
      s.moveTo(0.0, 0.28);
      s.lineTo(0.0, 1.0);
      s.quadraticCurveTo(0.0, 1.43, 0.24, 1.46);
      s.lineTo(2.35, 1.46);
      s.quadraticCurveTo(2.72, 1.43, 2.88, 1.06);
      s.lineTo(3.38, 0.84);
      s.quadraticCurveTo(3.56, 0.76, 3.5, 0.42);
      s.lineTo(3.3, 0.24);
      s.lineTo(0.25, 0.22);
      s.quadraticCurveTo(0.0, 0.22, 0.0, 0.28);
    },
    cabin: (s) => {
      // window band, wraps the sides
      s.moveTo(0.14, 0.95);
      s.lineTo(0.14, 1.3);
      s.lineTo(2.33, 1.33);
      s.lineTo(2.74, 1.06);
      s.lineTo(2.6, 0.95);
      s.lineTo(0.14, 0.95);
    },
    cabinW: 1.63,
    rear(g, M, W, RZ) {
      for (const sx of [-1, 1]) {
        const strip = new THREE.Mesh(box(0.11, 0.46, 0.05), M.tail);
        strip.position.set(sx * (W / 2 - 0.12), 0.82, RZ);
        g.add(strip);
      }
      const win = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, 0.34), M.glass);
      win.position.set(0, 1.15, RZ + 0.005);
      g.add(win);
      // roof rack
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(box(0.05, 0.05, 2.0), M.trim);
        rail.position.set(sx * 0.62, 1.55, 0.05);
        g.add(rail);
      }
      for (const z of [-0.6, 0.0, 0.6]) {
        const bar = new THREE.Mesh(box(1.3, 0.04, 0.05), M.trim);
        bar.position.set(0, 1.58, z);
        g.add(bar);
      }
      const spoiler = new THREE.Mesh(box(W * 0.86, 0.05, 0.2), M.trim);
      spoiler.position.set(0, 1.47, RZ - 0.08);
      g.add(spoiler);
    },
  },
};

export function buildPlayerCar(kind, livery, glowHex) {
  const C = CHASSIS[kind] || CHASSIS.wedge;
  const g = new THREE.Group();
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: livery.body, metalness: 0.25, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 }),
    stripe: new THREE.MeshPhysicalMaterial({ color: livery.stripe, metalness: 0.3, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1, polygonOffset: true, polygonOffsetFactor: -1 }),
    trim: new THREE.MeshStandardMaterial({ color: livery.trim, metalness: 0.7, roughness: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#05050a', metalness: 0.9, roughness: 0.04, envMapIntensity: 2.2 }),
    tire: new THREE.MeshStandardMaterial({ color: '#0b0b0e', roughness: 0.85 }),
    tail: new THREE.MeshBasicMaterial({ color: HDR('#ff1a3c', 6) }),
    tailDim: new THREE.MeshBasicMaterial({ color: HDR('#ff1a3c', 1.4) }),
    under: new THREE.MeshStandardMaterial({ color: '#08080c', roughness: 0.6, metalness: 0.4 }),
  };
  const body = new THREE.Mesh(profile(C.body, C.L, C.W, 0.08), M.paint);
  g.add(body);
  body.geometry.computeBoundingBox();
  const RZ = body.geometry.boundingBox.max.z; // true rear face (bevel included)
  const stripe = new THREE.Mesh(profile(C.body, C.L, 0.36, 0), M.stripe);
  stripe.scale.set(1, 1.008, 1.006);
  g.add(stripe);
  const cabin = new THREE.Mesh(profile(C.cabin, C.L, C.cabinW, 0.06), M.glass);
  g.add(cabin);

  // undertray / diffuser
  const tray = new THREE.Mesh(box(C.W * 0.86, 0.12, C.L * 0.9), M.under);
  tray.position.set(0, 0.2, 0);
  g.add(tray);
  const rearZ = RZ;
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(box(0.025, 0.14, 0.32), M.under);
    fin.position.set(i * 0.22, 0.24, rearZ - 0.12);
    g.add(fin);
  }
  // exhausts (glow brightens on overclock)
  const exGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 16);
  exGeo.rotateX(Math.PI / 2);
  const exGlow = new THREE.MeshBasicMaterial({ color: HDR('#ff6a00', 0.6) });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(exGeo, M.trim);
    e.position.set(sx * 0.34, 0.3, rearZ - 0.03);
    g.add(e);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), exGlow);
    inner.position.set(sx * 0.34, 0.3, rearZ + 0.035);
    g.add(inner);
  }
  // flames: additive cones, scaled by the engine on overclock
  const flameMat = new THREE.MeshBasicMaterial({ color: HDR('#4fd8ff', 3), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 12, 1, true), flameMat);
    f.rotation.x = Math.PI / 2;
    f.position.set(sx * 0.34, 0.3, rearZ + 0.36);
    f.visible = false;
    g.add(f);
    flames.push(f);
  }
  // plate
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: plateTexture(), color: HDR('#ffffff', 0.9) }));
  plate.position.set(0, 0.42, rearZ + 0.012);
  g.add(plate);
  // mirrors
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(box(0.16, 0.08, 0.12), M.paint);
    m.position.set(sx * (C.W / 2 + 0.04), kind === 'kei' ? 1.0 : 0.92, -C.L * 0.12);
    g.add(m);
  }
  C.rear(g, M, C.W, RZ);
  const wheelList = wheels(g, { r: C.wheelR, x: C.W / 2 - 0.1, zs: C.wheelZ, trimMat: M.trim, tireMat: M.tire });

  // underglow + its light
  let glowLight = null;
  if (glowHex) {
    glowLight = new THREE.PointLight(new THREE.Color(glowHex), 26, 9, 1.6);
    glowLight.position.set(0, 0.3, 0);
    g.add(glowLight);
  }
  // lights the road behind the car, not the bumper
  const tailLight = new THREE.PointLight(new THREE.Color('#ff1a3c'), 1.2, 6, 2);
  tailLight.position.set(0, 0.25, rearZ + 1.8);
  // dark rear fascia so the light signature reads against the paint
  const fascia = new THREE.Mesh(new THREE.PlaneGeometry(C.W * 0.72, 0.26), M.glass);
  fascia.position.set(0, 0.47, rearZ + 0.006);
  g.add(fascia);
  g.add(tailLight);

  const tail = { wedge: [0.72, C.W * 0.42], coupe: [0.6, C.W * 0.4], kei: [0.82, C.W / 2 - 0.12] }[kind] || [0.7, 0.8];
  return { group: g, wheels: wheelList, flames, M, glowLight, tailLight, length: C.L, width: C.W, wheelR: C.wheelR, rearZ: RZ, tailY: tail[0], tailHalfW: tail[1] };
}

// ------------------------------------------------------------------ traffic
const PAINTS = ['#2a2d3a', '#3b1f4a', '#1d3a4a', '#55555e', '#6b0f1a', '#bdb8ac', '#0f4f4a', '#2b2b2b'];

export function createTrafficKit() {
  const paints = PAINTS.map((c) => std({ color: c, metalness: 0.6, roughness: 0.32, envMapIntensity: 1.1 }));
  const glass = std({ color: '#06060b', metalness: 0.9, roughness: 0.06, envMapIntensity: 1.8 });
  const dark = std({ color: '#0a0a0d', roughness: 0.7 });
  const cargo = std({ color: '#c9c6bd', metalness: 0.2, roughness: 0.55 });
  const amber = basic({ color: HDR('#ffa000', 5) });
  const marker = basic({ color: HDR('#ffa000', 3) });
  const stripeCols = ['#00f0ff', '#ff2bd6', '#b8ff2e', '#fcee0a'].map((c) => basic({ color: HDR(c, 3) }));
  const G = {
    sedanBody: new RoundedBoxGeometry(1.86, 0.62, 4.5, 3, 0.2),
    sedanCabin: new RoundedBoxGeometry(1.58, 0.54, 2.25, 3, 0.2),
    hatchBody: new RoundedBoxGeometry(1.8, 0.72, 4.0, 3, 0.2),
    hatchCabin: new RoundedBoxGeometry(1.62, 0.62, 2.5, 3, 0.2),
    cab: new RoundedBoxGeometry(2.3, 2.0, 2.2, 3, 0.2),
    box: new RoundedBoxGeometry(2.5, 2.9, 6.6, 2, 0.08),
    tire: new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18).rotateZ(Math.PI / 2),
    lamp: box(0.42, 0.1, 0.05),
    vlamp: box(0.12, 0.3, 0.05),
    blink: box(0.14, 0.08, 0.05),
    tiny: box(0.12, 0.06, 0.04),
    strip: box(0.03, 0.08, 6.4),
    rstrip: box(2.3, 0.08, 0.03),
  };
  let n = 0;

  function make(kind, paintIdx) {
    const g = new THREE.Group();
    const tail = basic({ color: HDR('#ff1a3c', 3) });
    const blinkers = [];
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    const paint = paints[paintIdx % paints.length];
    if (kind === 'hauler') {
      add(G.cab, paint, 0, 1.25, -3.3);
      add(G.box, cargo, 0, 1.85, 0.9);
      const sc = stripeCols[n++ % stripeCols.length];
      add(G.strip, sc, -1.26, 1.2, 0.9);
      add(G.strip, sc, 1.26, 1.2, 0.9);
      add(G.rstrip, sc, 0, 1.2, 4.21);
      for (const sx of [-1, 1]) {
        add(G.vlamp, tail, sx * 1.05, 0.62, 4.22);
        blinkers.push(add(G.blink, amber, sx * 1.05, 0.88, 4.22));
      }
      for (let i = -2; i <= 2; i++) add(G.tiny, marker, i * 0.45, 3.25, 4.22);
      for (const z of [-3.3, 1.6, 3.0]) for (const sx of [-1, 1]) add(G.tire, dark, sx * 1.05, 0.34, z);
      return { group: g, tail, blinkers, len: 8.8 };
    }
    const hatch = kind === 'hatch';
    add(hatch ? G.hatchBody : G.sedanBody, paint, 0, hatch ? 0.58 : 0.54, 0);
    add(hatch ? G.hatchCabin : G.sedanCabin, glass, 0, hatch ? 1.12 : 1.04, hatch ? 0.55 : 0.25);
    const rearZ = hatch ? 2.02 : 2.27;
    for (const sx of [-1, 1]) {
      if (hatch) add(G.vlamp, tail, sx * 0.76, 0.86, rearZ);
      else add(G.lamp, tail, sx * 0.6, 0.66, rearZ);
      blinkers.push(add(G.blink, amber, sx * (hatch ? 0.76 : 0.88), hatch ? 0.62 : 0.66, rearZ));
    }
    for (const z of hatch ? [-1.3, 1.25] : [-1.45, 1.45]) for (const sx of [-1, 1]) add(G.tire, dark, sx * 0.82, 0.34, z);
    return { group: g, tail, blinkers, len: hatch ? 4.0 : 4.5 };
  }

  return { make };
}
