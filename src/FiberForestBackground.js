/**
 * FiberForestBackground.js — Awakening/Ascension environment (★).
 *
 * A Shadertoy-style tunnel cylinder layered with photographed silk-drape
 * luminance, plus sprite-based sparkles that drift/rise inside it.
 * uVerticalScroll is shared across both so they rise together; speedup
 * ramp (background.speedup / direction) drives the Ascension climax —
 * same environment intensifying, not a scene cut.
 *
 * Replaces an earlier instanced fiber-strand curtain (roots↔streams via
 * uMode) — dropped 2026-07-06 for reading as a rigid, scratchy door-frame
 * rather than the soft mv-10 reference; the tunnel+veil alone tested
 * better (docs/vision.md "thread of civilization" section is stale on
 * this point).
 *
 * Reads: three · textures/generated/particle-sprite.png ·
 * textures/generated/silk-veil.jpg · PaletteCoordinator (setPalette)
 */
import * as THREE from 'three';
import spritePath from './textures/generated/particle-sprite.png';
import silkPath from './textures/generated/silk-veil.jpg';

// Shadertoy-inspired tunnel shaders -----------------------------------------
const tunnelVertexShader = /* glsl */`
  uniform float uRadius;
  varying vec2 vUv;
  varying float vRadial;

  void main() {
    vUv = uv;
    vec3 pos = position;
    vRadial = clamp(length(pos.xz) / uRadius, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const tunnelFragmentShader = /* glsl */`
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uGlowColor;
  uniform float uVerticalScroll;
  uniform float uVeilIntensity;
  uniform sampler2D uSilk;
  varying vec2 vUv;
  varying float vRadial;

  float fbm(vec2 p) {
    // 3 octaves — the 4th was invisible under the silk layer and this
    // runs on a full-screen backside cylinder.
    float a = 0.5;
    float f = 0.0;
    for (int i = 0; i < 3; i++) {
      f += a * sin(p.x) * cos(p.y);
      p *= 1.8;
      a *= 0.5;
    }
    return f;
  }

  void main() {
    vec2 uv = vUv;
    uv.y = fract(uv.y - uVerticalScroll * 0.012);
    float time = uTime * 0.35;
    float swirl = sin(uv.y * 8.0 - time * 3.5);
    float noise = fbm(vec2(uv.x * 10.0 + swirl * 0.5, uv.y * 6.0 + time * 1.2));
    float flow = uv.x + swirl * 0.15 + noise * 0.06 + time * 0.1;
    float ridges = abs(sin(flow * 46.0));
    float fiber = pow(1.0 - ridges, 4.5);

    // Photographed silk-drape luminance layered over the procedural
    // ridges: real cloth micro-structure the fbm can't fake (mv-10).
    float silk = texture2D(uSilk, vec2(
      fract(uv.x * 2.0 + swirl * 0.02),
      fract(uv.y * 1.4 - uVerticalScroll * 0.008 - time * 0.015)
    )).r;

    float depthFade = smoothstep(0.05, 0.35, uv.y) * (1.0 - uv.y);
    float edge = smoothstep(0.45, 1.0, vRadial);
    float alpha = fiber * edge * depthFade * (0.40 + 0.60 * silk);
    alpha += silk * silk * edge * depthFade * 0.05;
    if (alpha < 0.01) discard;

    vec3 base = mix(uBaseColor, uTipColor, pow(uv.y, 0.45));
    vec3 color = base + uGlowColor * fiber * edge * (0.60 + 0.60 * silk);
    color += uGlowColor * silk * silk * edge * 0.18;
    color *= mix(0.4, 1.2, edge);

    gl_FragColor = vec4(color, alpha * uVeilIntensity);
  }
`;

const sparkVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uVerticalScroll;
  uniform float uSparkleWrap;
  attribute vec3 aSeed;
  varying float vStrength;
  varying float vRot;

  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.4 + aSeed.x) * 0.8;
    pos.z += cos(uTime * 0.5 + aSeed.y) * 0.8;
    pos.y += sin(uTime * 0.35 + aSeed.z) * 10.0;
    pos.y = mod(pos.y - uVerticalScroll + uSparkleWrap * 0.5, uSparkleWrap) - uSparkleWrap * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Sprite speck fills ~1/4 of its frame, so points run larger than
    // the old full-quad procedural disc did.
    float size = 10.0 + sin(uTime * 0.6 + aSeed.x) * 6.0;
    gl_PointSize = size * (280.0 / -mvPosition.z);
    vStrength = 0.5 + 0.5 * sin(uTime * 0.8 + aSeed.y);
    vRot = aSeed.z * 6.28318;
  }
`;

const sparkFragmentShader = /* glsl */`
  uniform vec3 uGlowColor;
  uniform sampler2D uSprite;
  varying float vStrength;
  varying float vRot;

  void main() {
    // Per-particle rotation so the asymmetric ink-fleck sprite doesn't
    // read as one repeated stamp.
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vRot);
    float co = cos(vRot);
    vec2 rc = vec2(c.x * co - c.y * s, c.x * s + c.y * co) + 0.5;
    vec3 tex = texture2D(uSprite, clamp(rc, 0.0, 1.0)).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    if (lum < 0.02) discard;
    vec3 color = uGlowColor * (0.4 + vStrength * 0.6) * (0.35 + lum * 1.2);
    gl_FragColor = vec4(color, lum * 0.5 * vStrength);
  }
`;

class FiberForestBackground {
  constructor(renderer, scene, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.options = Object.assign(
      {
        timeScale: 0.45,
        tunnelRadius: 26,
        tunnelHeight: 200,
        tunnelSegments: 96,
        verticalSpeed: 8,
        verticalWrap: 600,
        speedupMax: 20,
        speedupRate: 14,
        speedupDecay: 6,
        speedupTimeBoost: 2.0,
      },
      options
    );

    this.enabled = false;
    this.speedup = false;
    this.direction = 'forward';
    this.verticalScroll = 0;
    this.speedupAmount = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(0x110816) },
      uTipColor: { value: new THREE.Color(0x6b4bff) },
      uGlowColor: { value: new THREE.Color(0xb7a4ff) },
      uVerticalScroll: { value: 0 },
      uVeilIntensity: { value: 1.0 },
    };

    this.veilIntensity = 1.0;
    this.targetVeilIntensity = 1.0;
    this.veilIntensityRate = 0;

    const texLoader = new THREE.TextureLoader();
    this.silkTexture = texLoader.load(silkPath, (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    });
    this.spriteTexture = texLoader.load(spritePath);

    this.tunnelUniforms = {
      uTime: this.uniforms.uTime,
      uBaseColor: this.uniforms.uBaseColor,
      uTipColor: this.uniforms.uTipColor,
      uGlowColor: this.uniforms.uGlowColor,
      uVerticalScroll: this.uniforms.uVerticalScroll,
      uVeilIntensity: this.uniforms.uVeilIntensity,
      uRadius: { value: this.options.tunnelRadius },
      uSilk: { value: this.silkTexture },
    };

    this.sparkUniforms = {
      uTime: this.uniforms.uTime,
      uGlowColor: this.uniforms.uGlowColor,
      uVerticalScroll: this.uniforms.uVerticalScroll,
      uSparkleWrap: { value: this.options.tunnelHeight },
      uSprite: { value: this.spriteTexture },
    };

    this.previousFog = scene.fog || null;

    this.tunnel = this.createTunnel();
    this.sparkles = this.createSparkles();

    this.group = new THREE.Group();
    this.group.visible = false;
    this.tunnel.renderOrder = -10;
    this.sparkles.renderOrder = 5;
    this.group.add(this.tunnel);
    this.group.add(this.sparkles);
  }

  createTunnel() {
    const geom = new THREE.CylinderGeometry(
      this.options.tunnelRadius,
      this.options.tunnelRadius,
      this.options.tunnelHeight,
      this.options.tunnelSegments,
      64,
      true
    );
    geom.rotateX(Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      uniforms: this.tunnelUniforms,
      vertexShader: tunnelVertexShader,
      fragmentShader: tunnelFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  createSparkles() {
    // 1200 → 2100 → 3400 per artist request (2026-07-07, twice): more of
    // the scattered cotton-like flecks drifting through Act 1.
    const count = 3400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const radius = this.options.tunnelRadius * (0.75 + Math.random() * 0.4);
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = (Math.random() - 0.5) * this.options.tunnelHeight;
      positions[i3 + 2] = Math.sin(theta) * radius;
      seeds[i3] = Math.random() * Math.PI * 2;
      seeds[i3 + 1] = Math.random() * Math.PI * 2;
      seeds[i3 + 2] = Math.random() * Math.PI * 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: this.sparkUniforms,
      vertexShader: sparkVertexShader,
      fragmentShader: sparkFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    return points;
  }

  enable() {
    this.enabled = true;
    this.verticalScroll = 0;
    this.speedupAmount = 0;
    this.uniforms.uVerticalScroll.value = 0;
    if (this.group.parent !== this.scene) {
      this.scene.add(this.group);
    }
    this.group.visible = true;
    this.scene.fog = new THREE.Fog(this.uniforms.uBaseColor.value.getHex(), 12, this.options.tunnelHeight * 1.1);
    this.renderer.setClearColor(this.uniforms.uBaseColor.value);
  }

  disable(color = new THREE.Color(0x2c123a)) {
    this.enabled = false;
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
    this.group.visible = false;
    this.scene.fog = this.previousFog;
    const targetColor = typeof color === 'string' || typeof color === 'number' ? new THREE.Color(color) : color;
    this.renderer.setClearColor(targetColor);
  }

  // Drives the tunnel/veil's breathe-in (near-dark to full) and any later
  // dim/recover beats — same role the old fiber-curtain's forestIntensity
  // played, now targeting the tunnel itself since it's the whole environment.
  setVeilIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetVeilIntensity = clamped;
    if (durationMs <= 0) {
      this.veilIntensity = clamped;
      this.uniforms.uVeilIntensity.value = clamped;
      this.veilIntensityRate = 0;
    } else {
      this.veilIntensityRate = Math.abs(clamped - this.veilIntensity) / (durationMs / 1000);
    }
  }

  setPalette({ base, tip, glow } = {}) {
    if (base !== undefined) this.uniforms.uBaseColor.value.set(base);
    if (tip !== undefined) this.uniforms.uTipColor.value.set(tip);
    if (glow !== undefined) this.uniforms.uGlowColor.value.set(glow);
  }

  update(delta = 0) {
    if (!this.enabled) return;

    if (this.veilIntensityRate > 0) {
      const step = delta * this.veilIntensityRate;
      if (this.veilIntensity < this.targetVeilIntensity) {
        this.veilIntensity = Math.min(this.veilIntensity + step, this.targetVeilIntensity);
      } else {
        this.veilIntensity = Math.max(this.veilIntensity - step, this.targetVeilIntensity);
      }
      this.uniforms.uVeilIntensity.value = this.veilIntensity;
      if (this.veilIntensity === this.targetVeilIntensity) this.veilIntensityRate = 0;
    }

    if (this.speedup) {
      this.speedupAmount = Math.min(
        this.speedupAmount + delta * this.options.speedupRate,
        this.options.speedupMax
      );
    } else {
      this.speedupAmount = Math.max(this.speedupAmount - delta * this.options.speedupDecay, 0);
    }
    const speedMultiplier = 1 + this.speedupAmount;

    this.uniforms.uTime.value += delta * this.options.timeScale * (0.6 + speedMultiplier * 0.4 * this.options.speedupTimeBoost);

    let verticalDir = 0;
    if (this.direction === 'up') verticalDir = 1;
    else if (this.direction === 'down') verticalDir = -1;
    if (verticalDir !== 0) {
      const driftFactor = 0.15 + this.speedupAmount * 1.1;
      this.verticalScroll += delta * this.options.verticalSpeed * driftFactor * verticalDir;
      this.uniforms.uVerticalScroll.value = this.verticalScroll;
    }
  }

  dispose() {
    this.disable();
    this.tunnel.geometry.dispose();
    this.tunnel.material.dispose();
    this.sparkles.geometry.dispose();
    this.sparkles.material.dispose();
  }
}

export { FiberForestBackground };
