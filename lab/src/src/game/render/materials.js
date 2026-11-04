// Shaders & material factories for REDLINE.
// The road never actually curves: every world-space vertex ahead of the player is bent sideways
// and up/down by uCurve·d² and uHill·d² ("curved world"). Track curvature lives in the sim;
// the renderer just feeds these two uniforms, so geometry stays dead simple and endless.
import * as THREE from 'three';

export const U = {
  uCurve: { value: 0 },
  uHill: { value: 0 },
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color('#5a1650') },
  uFogDensity: { value: 0.004 },
};

export const BEND_GLSL = /* glsl */ `
uniform float uCurve;
uniform float uHill;
vec4 bendW(vec4 wp) {
  float d = clamp(-wp.z, 0.0, 1200.0);
  wp.x += uCurve * d * d;
  wp.y += uHill * d * d;
  return wp;
}
`;

const FOG_GLSL = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
float fogF(float depth) { float k = uFogDensity * depth; return 1.0 - exp(-k * k); }
`;

const HASH_GLSL = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

// Patch any built-in material (Standard/Basic/Physical) so it bends with the world.
export function bend(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = U.uCurve;
    shader.uniforms.uHill = U.uHill;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + BEND_GLSL)
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = viewMatrix * bendW( modelMatrix * mvPosition );
gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  mat.customProgramCacheKey = () => 'bend';
  return mat;
}

export const std = (o) => bend(new THREE.MeshStandardMaterial(o));
export const basic = (o) => bend(new THREE.MeshBasicMaterial(o));

// ---------- procedural buildings: windows, floors, neon bands · no textures ----------
export function buildingMaterial({ far = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uWin: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      uBase: { value: new THREE.Color('#0b0912') },
      uGain: { value: far ? 0.75 : 1.1 },
      uFar: { value: far ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      ${BEND_GLSL}
      attribute float aSeed;
      uniform float uFar;
      varying vec3 vLocal; varying vec3 vN; varying float vSeed; varying float vH; varying float vDepth;
      void main() {
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLocal = position * sc;
        vN = normal; vSeed = aSeed; vH = sc.y;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        if (uFar < 0.5) wp = bendW(wp);
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG_GLSL}
      ${HASH_GLSL}
      uniform vec3 uWin[4]; uniform vec3 uBase; uniform float uGain; uniform float uTime; uniform float uFar;
      varying vec3 vLocal; varying vec3 vN; varying float vSeed; varying float vH; varying float vDepth;
      vec3 pick(float r) { int i = int(floor(r * 3.999)); return i == 0 ? uWin[0] : i == 1 ? uWin[1] : i == 2 ? uWin[2] : uWin[3]; }
      void main() {
        // snap the per-building seed: interpolated varyings carry tiny per-pixel error that the hash would amplify into static
        float seed = floor(vSeed * 997.0 + 0.5) / 997.0;
        vec3 n = normalize(vN);
        float hgt = clamp(vLocal.y / max(vH, 1.0), 0.0, 1.0);
        vec3 col = uBase * (0.75 + 0.5 * hgt);
        if (n.y < 0.5) {
          vec2 uv = abs(n.x) > 0.5 ? vec2(vLocal.z, vLocal.y) : vec2(vLocal.x, vLocal.y);
          vec2 cell = uFar > 0.5 ? vec2(3.0, 4.2) : vec2(2.1, 3.3);
          vec2 id = floor(uv / cell);
          vec2 f = fract(uv / cell);
          float win = smoothstep(0.14, 0.2, f.x) * smoothstep(0.86, 0.8, f.x) * smoothstep(0.2, 0.27, f.y) * smoothstep(0.82, 0.75, f.y);
          float r = h21(id + seed * 17.0);
          float floorOn = step(0.5, h21(vec2(id.y * 1.7, seed * 31.0)));
          float lit = max(step(0.6, r) * floorOn, step(0.95, r));
          // anti-alias: when a window is smaller than ~2px, fade to the facade's average glow
          vec2 fw = fwidth(uv / cell);
          float aa = clamp(max(fw.x, fw.y) * 2.5 - 0.4, 0.0, 1.0);
          win = mix(win, 0.42, aa);
          lit = mix(lit, 0.26, aa);
          r = mix(r, 0.5, aa);
          float flick = 0.9 + 0.1 * sin(uTime * (2.0 + r * 5.0) + r * 40.0);
          vec3 wc = pick(h21(vec2(seed * 9.1, floor(id.y / 3.0))));
          col += wc * win * lit * uGain * (0.45 + 0.9 * r) * flick;
          col += vec3(0.012, 0.012, 0.02) * win;
          // horizontal neon band on some towers
          float bandY = vH * (0.25 + 0.6 * fract(seed * 7.31));
          float band = step(0.7, seed) * (1.0 - smoothstep(0.0, 0.45, abs(vLocal.y - bandY)));
          col += pick(fract(seed * 3.7)) * band * 2.6;
          // crown light
          col += pick(fract(seed * 5.3)) * step(0.55, fract(seed * 11.0)) * smoothstep(vH - 0.8, vH - 0.2, vLocal.y) * 1.8;
        }
        float fog = uFar > 0.5 ? 0.0 : fogF(vDepth);
        gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
      }`,
  });
}

// ---------- camera-facing glow billboards (instanced) ----------
export function glowMaterial({ gain = 1, fog = true, bent = true, size = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uGain: { value: gain }, uFogOn: { value: fog ? 1 : 0 }, uBent: { value: bent ? 1 : 0 }, uSize: { value: size } },
    vertexShader: /* glsl */ `
      ${BEND_GLSL}
      uniform float uBent; uniform float uSize;
      varying vec2 vUv; varying vec3 vCol; varying float vDepth;
      void main() {
        vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        if (uBent > 0.5) c = bendW(c);
        float s = length(instanceMatrix[0].xyz) * uSize;
        vec4 mv = viewMatrix * c;
        mv.xy += position.xy * s;
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG_GLSL}
      uniform float uGain; uniform float uFogOn;
      varying vec2 vUv; varying vec3 vCol; varying float vDepth;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2) + 0.6 * pow(max(0.0, 1.0 - d), 12.0);
        if (uFogOn > 0.5) a *= 1.0 - fogF(vDepth);
        gl_FragColor = vec4(vCol * a * uGain, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// ---------- flat additive decals on the road: light pools & wet reflection streaks ----------
export function decalMaterial({ shape = 'pool', gain = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uGain: { value: gain }, uShape: { value: shape === 'pool' ? 0 : 1 } },
    vertexShader: /* glsl */ `
      ${BEND_GLSL}
      varying vec2 vUv; varying vec3 vCol; varying float vDepth;
      void main() {
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        wp = bendW(wp);
        vec4 mv = viewMatrix * wp;
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG_GLSL}
      ${HASH_GLSL}
      uniform float uGain; uniform float uShape; uniform float uTime;
      varying vec2 vUv; varying vec3 vCol; varying float vDepth;
      void main() {
        float a;
        if (uShape < 0.5) {
          float d = length(vUv - 0.5) * 2.0;
          a = pow(max(0.0, 1.0 - d), 1.8);
        } else {
          // streak: tight across, long along; shimmer like broken water
          float x = (vUv.x - 0.5) * 2.0;
          float across = exp(-x * x * 9.0);
          float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float ripple = 0.65 + 0.35 * h21(vec2(floor(vUv.y * 40.0), floor(uTime * 12.0)));
          a = across * along * ripple;
        }
        a *= 1.0 - fogF(vDepth);
        gl_FragColor = vec4(vCol * a * uGain, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

// ---------- sky dome ----------
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uFogC: { value: new THREE.Color() },
      uStars: { value: 0 },
      uTime: U.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${HASH_GLSL}
      uniform vec3 uZenith, uHorizon, uGlow, uFogC; uniform float uStars, uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.45));
        col += uGlow * exp(-max(y, 0.0) * 14.0) * 0.55;           // hot band on the horizon
        col = mix(col, uFogC, smoothstep(0.03, -0.02, y));       // below horizon → fog
        // stars
        vec2 g = vec2(atan(d.z, d.x) * 180.0, y * 180.0);
        vec2 id = floor(g);
        float s = h21(id);
        float tw = 0.6 + 0.4 * sin(uTime * (1.0 + s * 3.0) + s * 50.0);
        float star = step(0.985, s) * smoothstep(0.5, 0.0, length(fract(g) - 0.5)) * tw;
        col += vec3(star) * uStars * smoothstep(0.08, 0.35, y) * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

// ---------- moon / sun ----------
export function celestialMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uSun: { value: 0 }, uGlowC: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${HASH_GLSL}
      uniform vec3 uColor, uGlowC; uniform float uSun;
      varying vec2 vUv;
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;     // quad is 3× the disc
        float r = length(p) * 3.0;
        float disc = smoothstep(1.0, 0.985, r);
        vec3 col;
        if (uSun > 0.5) {
          // striped sunset disc: gradient top→bottom, slats cut through the lower half
          float t = clamp(p.y * 3.0 * 0.5 + 0.5, 0.0, 1.0);
          col = mix(vec3(1.0, 0.25, 0.55), uColor, t) * 2.2;
          float yy = p.y * 3.0;
          float slat = yy < 0.15 ? step(0.5, fract((yy + 1.0) * (6.0 + (1.0 - yy) * 4.0))) : 1.0;
          disc *= slat;
        } else {
          float n = noise(p * 9.0) * 0.6 + noise(p * 23.0) * 0.4;
          col = uColor * (1.25 - 0.35 * smoothstep(0.45, 0.75, n)) * (0.9 + 0.1 * (1.0 - r));
        }
        float halo = exp(-max(r - 1.0, 0.0) * 2.4) * 0.35 + exp(-max(r - 1.0, 0.0) * 9.0) * 0.4;
        vec3 outc = col * disc + uGlowC * halo * (1.0 - disc);
        gl_FragColor = vec4(outc, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
}

// ---------- additive particles ----------
export function particleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize;
      uniform float uScale;
      varying vec3 vCol;
      void main() {
        vCol = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0);
        gl_FragColor = vec4(vCol * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// ---------- underglow pool beneath the player car ----------
export function underglowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#00f0ff') }, uGain: { value: 1.6 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uGain; varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float d = length(p * vec2(1.0, 0.62));
        float a = pow(max(0.0, 1.0 - d), 1.6);
        gl_FragColor = vec4(uColor * a * uGain, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
