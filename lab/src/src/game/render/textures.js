// Procedural canvas textures + a neon environment map for reflections. No image files anywhere.
import * as THREE from 'three';
import { mulberry } from '../sim.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};

// Asphalt: 10.8 m wide × 24 m long tile. Edge lines + two dashed lane lines + grime + puddle mask (alpha → roughness).
export function roadTextures() {
  const W = 512, H = 1024;
  const [c, g] = canvas(W, H);
  const r = mulberry(4);
  g.fillStyle = '#17151d';
  g.fillRect(0, 0, W, H);
  // aggregate speckle
  for (let i = 0; i < 26000; i++) {
    const v = 18 + r() * 26;
    g.fillStyle = `rgb(${v},${v - 2},${v + 6})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // tyre tracks (darker, polished) in each lane
  const lane = W / 3;
  g.globalAlpha = 0.18;
  g.fillStyle = '#05040a';
  for (let l = 0; l < 3; l++) for (const o of [0.28, 0.72]) g.fillRect(l * lane + lane * o - 14, 0, 28, H);
  g.globalAlpha = 1;
  // edge lines
  g.fillStyle = '#d9d6ce';
  g.fillRect(10, 0, 9, H);
  g.fillRect(W - 19, 0, 9, H);
  // dashed lane lines: 6 m dash, 6 m gap (tile = 24 m → 2 dashes)
  for (let l = 1; l < 3; l++) {
    for (let k = 0; k < 2; k++) {
      g.fillStyle = '#e8e2c8';
      g.fillRect(l * lane - 4, k * (H / 2), 8, H / 4);
    }
  }
  // cracks / patches
  g.strokeStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 18; i++) {
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath();
    let x = r() * W, y = r() * H;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 40; y += r() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  // roughness: wet puddles (dark = glossy). Painted lines are rougher.
  const [rc, rg] = canvas(256, 512);
  rg.fillStyle = '#9a9a9a';
  rg.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 256, y = r() * 512, rx = 10 + r() * 50, ry = 20 + r() * 90;
    const grd = rg.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    grd.addColorStop(0, 'rgba(10,10,10,0.95)');
    grd.addColorStop(1, 'rgba(10,10,10,0)');
    rg.fillStyle = grd;
    rg.beginPath();
    rg.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    rg.fill();
  }
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [map, rough]) {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, rough };
}

// Kerb: alternating 3 m neon blocks (emissive map).
export function kerbTexture(a, b) {
  const [c, g] = canvas(16, 128);
  g.fillStyle = a;
  g.fillRect(0, 0, 16, 64);
  g.fillStyle = b;
  g.fillRect(0, 64, 16, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

// Ground beside the road: faint neon survey grid.
export function gridTexture(color) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = color;
  g.globalAlpha = 0.5;
  g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 256);
  g.globalAlpha = 0.15;
  g.lineWidth = 1;
  for (let i = 64; i < 256; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Billboard panel with a slogan. The house shape: cut corner + HUD ticks.
export function billboardTexture(text, color, sub = '') {
  const [c, g] = canvas(1024, 384);
  g.fillStyle = '#07060b';
  g.fillRect(0, 0, 1024, 384);
  // halftone dots
  g.fillStyle = color;
  g.globalAlpha = 0.12;
  for (let y = 10; y < 384; y += 14) for (let x = 10 + ((y / 14) % 2) * 7; x < 1024; x += 14) {
    const s = 1 + 3 * (x / 1024);
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = color;
  g.lineWidth = 14;
  g.strokeRect(18, 18, 988, 348);
  g.beginPath(); g.moveTo(1006, 300); g.lineTo(940, 366); g.lineTo(1006, 366); g.closePath(); g.fill();
  g.font = '700 150px Rajdhani, "Chakra Petch", Arial Narrow, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 150;
  while (g.measureText(text).width > 900 && size > 60) { size -= 6; g.font = `700 ${size}px Rajdhani, "Chakra Petch", Arial Narrow, sans-serif`; }
  g.fillStyle = color;
  g.fillText(text, 512, sub ? 172 : 196);
  if (sub) {
    g.font = '400 34px "Share Tech Mono", monospace';
    g.globalAlpha = 0.8;
    g.fillText(sub, 512, 300);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function plateTexture(text = 'AD·0417') {
  const [c, g] = canvas(256, 64);
  g.fillStyle = '#e9e4d8';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#0d0d0d';
  g.fillRect(4, 4, 248, 56);
  g.fillStyle = '#e9e4d8';
  g.font = '400 40px "Share Tech Mono", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Neon "room" rendered once into a PMREM env map: what the car paint and wet road reflect.
export function neonEnvironment(renderer, colors) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05040a');
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (color, intensity, pos, scale) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity * 0.55) }));
    m.position.set(...pos);
    m.scale.set(...scale);
    scene.add(m);
  };
  // sky strip, horizon glow, long neon tubes on both sides, a few window blocks
  add(colors.horizon, 1.6, [0, 10, -30], [120, 6, 1]);
  add(colors.zenith, 1.0, [0, 30, 0], [120, 1, 120]);
  add(colors.a, 4, [-14, 4, 0], [0.4, 0.4, 80]);
  add(colors.b, 4, [14, 4, 0], [0.4, 0.4, 80]);
  add(colors.c, 2.5, [-20, 9, -10], [0.3, 12, 6]);
  add(colors.a, 2.5, [22, 7, 8], [0.3, 8, 5]);
  add(colors.glow, 2.0, [0, 6, 30], [60, 4, 1]);
  add('#ffffff', 3, [0, 18, -6], [10, 0.3, 0.3]);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02);
  pm.dispose();
  scene.traverse((o) => o.material && o.material.dispose());
  box.dispose();
  return rt;
}
