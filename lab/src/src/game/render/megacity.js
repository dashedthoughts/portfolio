// Megacity layer: the 80s cel-anime city details. Light trails, searchlights, blade signs, the elevated expressway.
// Everything is original geometry and generic signage words; no film assets, logos or places.
import * as THREE from 'three';
import { U, BEND_GLSL, std, basic, glowMaterial } from './materials.js';

const HDR = (c, k) => new THREE.Color(c).multiplyScalar(k);

// ---------------------------------------------------------------- tail-light trails (player)
// A ribbon per tail light, built from the car's recent lateral history, so every swerve is drawn in light.
export function createPlayerTrails(scene) {
  const N = 56;
  const hist = []; // { x, z, t }
  const ribbons = [-1, 1].map(() => {
    const pos = new Float32Array(N * 2 * 3);
    const fade = new Float32Array(N * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: HDR('#ff1a2c', 5) } },
      vertexShader: 'attribute float aFade; varying float vF; void main(){ vF = aFade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vF; void main(){ gl_FragColor = vec4(uColor * vF * vF, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    m.frustumCulled = false;
    scene.add(m);
    return { m, pos, fade, g };
  });

  return {
    update(S, rearZ, halfW, y, life = 0.38) {
      hist.unshift({ x: S.x, z: S.z, t: S.time });
      while (hist.length > N) hist.pop();
      const w = 0.045;
      ribbons.forEach((r, ri) => {
        const side = ri ? 1 : -1;
        for (let i = 0; i < N; i++) {
          const h = hist[Math.min(i, hist.length - 1)];
          const age = S.time - h.t;
          const f = Math.max(0, 1 - age / life) * (S.speed > 8 ? 1 : 0);
          const x = h.x + side * halfW;
          const z = rearZ + (S.z - h.z);
          r.pos.set([x, y + w, z, x, y - w, z], i * 6);
          r.fade[i * 2] = r.fade[i * 2 + 1] = f;
        }
        r.g.attributes.position.needsUpdate = true;
        r.g.attributes.aFade.needsUpdate = true;
      });
    },
    setColor(c) { ribbons.forEach((r) => r.m.material.uniforms.uColor.value.copy(c)); },
  };
}

// ---------------------------------------------------------------- trails for traffic (instanced, bent)
export function createTrafficTrails(scene, max = 64) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uColor: { value: HDR('#ff1a2c', 3.2) } },
    vertexShader: `${BEND_GLSL}
      varying vec2 vUv;
      void main(){ vUv = uv; vec4 wp = bendW(modelMatrix * instanceMatrix * vec4(position, 1.0)); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
      void main(){ float x = (vUv.x - 0.5) * 2.0; float a = exp(-x * x * 5.0) * pow(vUv.y, 1.6); gl_FragColor = vec4(uColor * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  // plane lying flat, uv.y = 1 at the lamp, 0 at the tail end
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let n = 0;
  return {
    begin() { n = 0; },
    add(x, y, z, len) {
      if (n >= max) return;
      mesh.setMatrixAt(n++, m.compose(p.set(x, y, z), q, s.set(0.16, 1, len)));
    },
    end() { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; },
  };
}

// ---------------------------------------------------------------- searchlights
export function createSearchlights(parent) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: HDR('#fff1d6', 0.22) } },
    vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ vH = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ float core = pow(abs(dot(vN, vV)), 3.0); float a = core * pow(vH, 1.6) * (1.0 - smoothstep(0.97, 1.0, vH)); gl_FragColor = vec4(uColor * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  // tip at the base, opening upward
  const geo = new THREE.ConeGeometry(42, 900, 24, 1, true).rotateX(Math.PI).translate(0, 450, 0);
  const beams = [];
  const spots = [[-420, -1100], [260, -1250], [-120, -1400], [520, -900]];
  for (const [x, z] of spots) {
    const b = new THREE.Mesh(geo, mat);
    b.position.set(x, -20, z);
    parent.add(b);
    beams.push({ b, phase: Math.random() * 10, speed: 0.12 + Math.random() * 0.15 });
  }
  return {
    set visible(v) { beams.forEach((x) => (x.b.visible = v)); },
    update(t) {
      for (const x of beams) {
        x.b.rotation.z = Math.sin(t * x.speed + x.phase) * 0.45;
        x.b.rotation.x = Math.cos(t * x.speed * 0.7 + x.phase) * 0.2 - 0.1;
      }
    },
  };
}

// ---------------------------------------------------------------- blade signs (vertical neon lettering)
const SIGN_WORDS = ['高速', '出口', '電気', '夜行', '未来', '珈琲', '薬局', '酒場', 'ホテル', '駐車場', '自由', '中央', '整備', '情報'];
const SIGN_COLORS = ['#ff2a3a', '#ffd9a0', '#00f0ff', '#ff8a2a', '#ff2bd6', '#fff4e0', '#b8ff2e'];
const CJK_FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", sans-serif';

export function signTextures() {
  const list = SIGN_WORDS.map((word, i) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 448;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = () => {
      const g = c.getContext('2d');
      const col = SIGN_COLORS[i % SIGN_COLORS.length];
      g.fillStyle = '#0a0709';
      g.fillRect(0, 0, 128, 448);
      g.strokeStyle = col;
      g.lineWidth = 6;
      g.strokeRect(6, 6, 116, 436);
      g.fillStyle = col;
      const chars = [...word];
      const step = Math.min(118, 400 / chars.length);
      g.font = `900 ${Math.round(step * 0.82)}px ${CJK_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      chars.forEach((ch, k) => g.fillText(ch, 64, 24 + step * (k + 0.5) + (400 - step * chars.length) / 2));
      // little latin sub-label like real signage
      g.font = '400 14px "Share Tech Mono", monospace';
      g.globalAlpha = 0.7;
      g.fillText(String(100 + i * 7), 64, 432);
      g.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    draw();
    return { tex, draw };
  });
  if (document.fonts?.ready) Promise.all([document.fonts.load('900 40px "Noto Sans JP"', '高速'), document.fonts.load('700 40px Rajdhani'), document.fonts.load('400 20px "Share Tech Mono"')]).catch(() => {}).then(() => list.forEach((t) => t.draw()));
  return list.map((t) => t.tex);
}

// ---------------------------------------------------------------- elevated expressway (right side, overhead)
export function createViaduct(scene, roadLen, near) {
  const X = 15.5, Y = 13, W = 8.5;
  const group = new THREE.Group();
  scene.add(group);
  const strip = (w, h, d) => new THREE.BoxGeometry(w, h, d, 1, 1, 380).translate(0, 0, near - d / 2);
  const concrete = std({ color: '#17141c', roughness: 0.85, metalness: 0.1 });
  const deck = new THREE.Mesh(strip(W, 1.4, roadLen), concrete);
  deck.position.set(X, Y, 0);
  const parapetL = new THREE.Mesh(strip(0.3, 1.1, roadLen), concrete);
  parapetL.position.set(X - W / 2 + 0.15, Y + 1.25, 0);
  const parapetR = parapetL.clone();
  parapetR.position.x = X + W / 2 - 0.15;
  const sodium = basic({ color: HDR('#ff8a2a', 3.2) });
  const tubeL = new THREE.Mesh(strip(0.1, 0.1, roadLen), sodium);
  tubeL.position.set(X - W / 2 - 0.02, Y - 0.5, 0);
  const tubeT = new THREE.Mesh(strip(0.08, 0.08, roadLen), basic({ color: HDR('#ff2a3a', 2.4) }));
  tubeT.position.set(X - W / 2 + 0.15, Y + 1.85, 0);
  scene.add(deck, parapetL, parapetR, tubeL, tubeT);

  // periodic: pillars + under-deck sodium lamps (shifted by z mod period, like the street lamps)
  const GAP = 32;
  const n = Math.ceil(roadLen / GAP) + 1;
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, Y, 1.8).translate(0, Y / 2, 0), concrete, n);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(W + 1, 1.2, 2.4), concrete, n);
  const under = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial({ gain: 1.0 }), n * 2);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const z = near - k * GAP;
    pillars.setMatrixAt(k, m.makeTranslation(X + 1.5, 0, z));
    caps.setMatrixAt(k, m.makeTranslation(X, Y - 1.1, z));
    under.setMatrixAt(k * 2, m.compose(p.set(X - 2, Y - 0.9, z - GAP / 2), q, s.set(4, 4, 4)));
    under.setMatrixAt(k * 2 + 1, m.compose(p.set(X + 2.5, Y - 0.9, z - GAP / 2), q, s.set(4, 4, 4)));
    under.setColorAt(k * 2, new THREE.Color('#ff8a2a'));
    under.setColorAt(k * 2 + 1, new THREE.Color('#ff8a2a'));
  }
  for (const im of [pillars, caps, under]) { im.frustumCulled = false; group.add(im); }

  // traffic on the deck: pairs of lights flowing both ways
  const FLOW = 40;
  const flow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial({ gain: 1.6 }), FLOW * 2);
  flow.frustumCulled = false;
  scene.add(flow);
  const cars = Array.from({ length: FLOW }, (_, i) => ({
    dir: i % 2 ? 1 : -1, lane: i % 2 ? X + 2 : X - 2, off: Math.random() * roadLen, v: 25 + Math.random() * 20,
  }));
  cars.forEach((c, i) => {
    const col = c.dir > 0 ? new THREE.Color('#fff4e0') : new THREE.Color('#ff1a2c');
    flow.setColorAt(i * 2, col);
    flow.setColorAt(i * 2 + 1, col);
  });

  return {
    update(S, t) {
      group.position.z = S.z % GAP;
      for (let i = 0; i < FLOW; i++) {
        const c = cars[i];
        // world z of each deck car: its own motion minus ours, wrapped into the visible strip
        let z = ((c.off - t * c.v * c.dir + S.z) % roadLen + roadLen) % roadLen;
        z = near - z;
        for (const sx of [-0.6, 0.6]) {
          flow.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), m.compose(p.set(c.lane + sx, Y + 1.15, z), q, s.set(1.6, 1.6, 1.6)));
        }
      }
      flow.instanceMatrix.needsUpdate = true;
    },
  };
}
