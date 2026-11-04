// Post-processing: HDR scene → bloom → lens pass (speed blur, chromatic aberration, glitch, vignette, grain) → tone map.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },     // 0..1.5 → radial speed blur + CA
    uGlitch: { value: 0 },    // 0..1 → block tearing + RGB split
    uFlash: { value: 0 },     // red impact flash
    uBoost: { value: 0 },     // slipstream: cyan rim
    uGrain: { value: 0.028 },
    uAspect: { value: 1.7 },
    uLines: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uSpeed, uGlitch, uFlash, uBoost, uGrain, uAspect, uLines;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      // glitch: horizontal block displacement
      if (uGlitch > 0.0) {
        float row = floor(uv.y * 26.0);
        float t = floor(uTime * 18.0);
        float on = step(1.0 - 0.35 * uGlitch, h(vec2(row, t)));
        uv.x += (h(vec2(t, row)) - 0.5) * 0.12 * on * uGlitch;
      }
      vec2 c = uv - vec2(0.5, 0.56);
      float r = length(c * vec2(uAspect, 1.0));
      // speed: radial blur toward the vanishing point, only at the edges
      float sp = max(0.0, uSpeed - 0.55);
      float blur = sp * sp * 0.05 * smoothstep(0.35, 1.0, r);
      float ca = 0.0015 + uSpeed * 0.0035 + uGlitch * 0.012;
      vec3 col = vec3(0.0);
      const int N = 8;
      for (int i = 0; i < N; i++) {
        float k = float(i) / float(N - 1);
        vec2 o = c * (1.0 - blur * k);
        vec2 dir = normalize(c + 1e-5) * ca * r;
        col.r += texture2D(tDiffuse, vec2(0.5, 0.56) + o + dir).r;
        col.g += texture2D(tDiffuse, vec2(0.5, 0.56) + o).g;
        col.b += texture2D(tDiffuse, vec2(0.5, 0.56) + o - dir).b;
      }
      col /= float(N);
      // cel-anime speed lines: thin radial streaks that flicker at the frame edges
      if (uLines > 0.0) {
        float ang = atan(c.y, c.x * uAspect);
        float id = floor(ang * 90.0);
        float t = floor(uTime * 24.0);
        float on = step(0.86, h(vec2(id, t)));
        float w = smoothstep(0.5, 0.0, abs(fract(ang * 90.0) - 0.5) - 0.38);
        col += vec3(1.0, 0.96, 0.9) * on * w * smoothstep(0.42, 1.0, r) * uLines * 0.55;
      }
      // film grade: crush blacks, warm the highlights, red halation around hot spots
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, col * vec3(1.08, 0.96, 0.9), smoothstep(0.4, 1.6, lum));
      col += vec3(0.35, 0.04, 0.0) * smoothstep(1.2, 4.0, lum) * 0.5;
      col = max(col - 0.012, 0.0) * 1.02;
      // impact flash & boost rim
      col += vec3(1.0, 0.05, 0.15) * uFlash * smoothstep(0.2, 1.0, r) * 1.5;
      col += vec3(0.0, 0.9, 1.0) * uBoost * smoothstep(0.55, 1.1, r) * 0.6;
      // vignette + grain + faint scanlines
      col *= 1.0 - smoothstep(0.55, 1.25, r) * 0.55;
      col += (h(uv * 800.0 + uTime) - 0.5) * uGrain;
      col *= 0.97 + 0.03 * sin(gl_FragCoord.y * 1.6);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export function createPost(renderer, scene, camera, { samples = 4, bloom = 0.5 } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x * bloom, size.y * bloom), 0.62, 0.42, 0.92);
  composer.addPass(bloomPass);
  const lens = new ShaderPass(LensShader);
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  return {
    composer,
    lens: lens.uniforms,
    bloom: bloomPass,
    setSize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      bloomPass.resolution.set(w * bloom, h * bloom);
      lens.uniforms.uAspect.value = w / h;
    },
    render(dt) {
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
      rt.dispose();
    },
  };
}
