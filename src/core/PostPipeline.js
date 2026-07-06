/**
 * PostPipeline.js — full-screen post-processing chain: bloom + film grade (★).
 *
 * Wraps EffectComposer with RenderPass → UnrealBloomPass → a single grade
 * pass doing ACES tone mapping, animated luminance-weighted film grain,
 * vignette and subtle radial chromatic aberration. This is the "print
 * lab" of the whole piece: style-anchor mandates glow-over-edges and
 * analog grain as the baseline, and both live here rather than in any
 * individual material. Replaces renderer.render() in the app loop.
 *
 * Reads: three · examples/postprocessing (EffectComposer, RenderPass,
 * UnrealBloomPass, ShaderPass)
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uExposure: { value: 0.92 },
    uGrain: { value: 0.055 },
    uVignette: { value: 0.30 },
    uAberration: { value: 0.0002 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  // ACES fit (Narkowicz) keeps highlights rolling off filmically instead
  // of clipping; grain is luminance-weighted so shadows carry more noise
  // than highlights — matches the MV's analog register.
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uAberration;
    varying vec2 vUv;

    vec3 aces(vec3 x) {
      const float a = 2.51;
      const float b = 0.03;
      const float c = 2.43;
      const float d = 0.59;
      const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 443.8975);
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float dist2 = dot(centered, centered);

      // Radial chromatic aberration: R and B sampled slightly apart,
      // growing with distance from center.
      vec2 caOffset = centered * dist2 * uAberration * 40.0;
      float r = texture2D(tDiffuse, vUv + caOffset).r;
      vec4 base = texture2D(tDiffuse, vUv);
      float b = texture2D(tDiffuse, vUv - caOffset).b;
      vec3 color = vec3(r, base.g, b);

      color = aces(color * uExposure);

      // Shadow-deepening S-curve: the piece lives in deep purple-black
      // (style-anchor squint test), so push midtones down after ACES.
      color = pow(color, vec3(1.14)) * 0.97;

      // Vignette: gentle radial falloff, never fully black.
      float vig = 1.0 - uVignette * smoothstep(0.15, 0.72, dist2);
      color *= vig;

      // Animated luminance-weighted grain (heavier in shadows).
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      float g = hash(vUv * vec2(1621.0, 1053.0) + fract(uTime) * 71.3) - 0.5;
      color += g * uGrain * (1.0 - lum * 0.75);

      gl_FragColor = vec4(color, base.a);
    }
  `,
};

class PostPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.enabled = true;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);

    // Tuned in-browser against the additive fiber forest: thresholds
    // below ~0.55 let the tunnel's stacked additive brightness snowball
    // into a white column.
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x * 0.5, size.y * 0.5),
      0.40, // strength
      0.50, // radius
      0.72 // threshold — only true highlights bloom; dense additive
      // layers (fibers, tapestry) stay below the knee
    );

    this.gradePass = new ShaderPass(GradeShader);
    this.gradePass.renderToScreen = true;

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.gradePass);

    this._scene = scene;
    this._camera = camera;
  }

  render(delta = 0) {
    if (!this.enabled) {
      this.renderer.render(this._scene, this._camera);
      return;
    }
    this.gradePass.uniforms.uTime.value += delta;
    this.composer.render(delta);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width * 0.5, height * 0.5);
  }

  // One knob per beat: flash moments can briefly push bloom, quiet beats
  // pull it back. Values tuned in-browser against mv-frames.
  setBloom({ strength, radius, threshold } = {}) {
    if (strength !== undefined) this.bloomPass.strength = strength;
    if (radius !== undefined) this.bloomPass.radius = radius;
    if (threshold !== undefined) this.bloomPass.threshold = threshold;
  }

  // Momentary bloom surge for flash punctuations: spike to `peak`, decay
  // quadratically back to the resting strength.
  pulseBloom(peak = 1.4, durationMs = 850) {
    const base = this.bloomPass.strength;
    const start = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - start) / durationMs, 1);
      const fall = (1 - t) * (1 - t);
      this.bloomPass.strength = base + (peak - base) * fall;
      if (t < 1) requestAnimationFrame(tick);
      else this.bloomPass.strength = base;
    };
    requestAnimationFrame(tick);
  }
}

export { PostPipeline };
