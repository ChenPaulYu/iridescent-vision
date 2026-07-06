import * as THREE from 'three';
import spritePath from './textures/generated/particle-sprite.png';
import silkPath from './textures/generated/silk-veil.jpg';

// Instanced fiber shaders ----------------------------------------------------
const fiberVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uScroll;
  uniform float uLength;
  uniform float uDepthRange;
  uniform float uCurveStrength;
  uniform float uWavePhase;
  uniform float uWaveAmp;
  uniform float uVerticalScroll;
  uniform float uVerticalWrap;
  uniform float uMode;
  attribute float progress;
  attribute vec3 instOffset;
  attribute vec3 instSeed;
  attribute float instWidth;
  attribute float instDepth;
  varying float vProgress;
  varying float vNoise;
  varying float vHue;
  varying float vBrightness;

  float softNoise(float x) {
    return sin(x) * 0.5 + sin(x * 0.35) * 0.35 + sin(x * 0.1) * 0.15;
  }

  void main() {
    float t = clamp(progress, 0.0, 1.0);
    float swirl = instSeed.x;
    float swaySpeed = instSeed.y * 0.4 + 0.4;
    float ripple = instSeed.z;

    float radial = (1.0 - pow(t, 1.6)) * swirl;
    float wave = softNoise(t * 9.0 + uTime * swaySpeed + instOffset.x * 0.4);

    vec3 displaced = vec3(0.0);
    displaced.x = instOffset.x + sin(t * 5.0 + instSeed.x) * radial + wave * 0.6;
    displaced.z = instOffset.y + cos(t * 6.0 + instSeed.y) * radial * 0.35;

    float yShift = mod(-uVerticalScroll + uVerticalWrap * 0.5, uVerticalWrap) - uVerticalWrap * 0.5;
    float height = -uLength * 0.5 + t * uLength + instOffset.z + yShift;
    displaced.y = height;

    float depthShift = instDepth + uScroll - t * uDepthRange * 0.35;
    depthShift = mod(depthShift + uDepthRange, uDepthRange) - uDepthRange * 0.5;
    displaced.z += depthShift;

    float waveOffset = sin(uWavePhase + instSeed.x + t * 5.0) * uWaveAmp * (1.0 - t * 0.3);
    displaced.x += waveOffset;
    displaced.z += cos(uWavePhase * 0.6 + instSeed.y + t * 4.0) * uWaveAmp * 0.4 * (1.0 - t);

    float side = instOffset.x >= 0.0 ? 1.0 : -1.0;
    float curveEnvelope = smoothstep(0.05, 0.45, t) * (1.0 - smoothstep(0.55, 0.95, t));
    float roundEnvelope = smoothstep(0.1, 0.6, t);

    vec3 finalPosition = displaced;
    finalPosition.x += side * curveEnvelope * uCurveStrength * (0.6 + abs(instOffset.x) * 0.05);
    finalPosition.z += curveEnvelope * uCurveStrength * 0.25 * side;
    finalPosition.x *= mix(1.0, 1.35, roundEnvelope);
    finalPosition.z *= mix(1.0, 1.15, roundEnvelope);
    finalPosition.x += position.x * instWidth * (1.0 - t * 0.7);
    finalPosition.z += position.x * instWidth * 0.35;
    finalPosition.y += (1.0 - t) * wave * 0.4;

    vProgress = t;
    vNoise = wave + ripple * 0.3;
    vHue = instSeed.x * 0.5 + instSeed.z * 0.5;
    // Power curve so most fibres are dim with a few brighter ones —
    // cinematic contrast like the reference (mostly dark purple base).
    vBrightness = pow(instSeed.y, 2.5) * 1.2 + 0.25;

    // ROOTS mode (uMode = 0): organic branching tendrils. Each fibre
    // starts from a small cluster of source points (not single point),
    // follows a cubic curve with a per-fibre random control point,
    // bends downward and outward like real roots.
    float seedAngle = instSeed.x * 6.2832;
    float seedRadius = 2.0 + instSeed.z * 5.0;
    // Source point: wider top cluster — looks like multiple roots emerging
    vec3 rootsTop = vec3(
      cos(seedAngle) * seedRadius,
      uLength * 0.36 + sin(instSeed.y * 6.2832) * 3.0,
      sin(seedAngle) * seedRadius - 4.0
    );
    // Endpoint: pushed further out so curves are more dramatic
    vec3 rootsEnd = vec3(instOffset.x * 1.8, -uLength * 0.45, instOffset.y * 1.8 + 4.0);
    // Control point: bends way out then sweeps back inward
    float ctrlAngle = instSeed.y * 6.2832;
    float ctrlPush = 10.0 + instSeed.z * 14.0;
    vec3 ctrlA = vec3(
      mix(rootsTop.x, rootsEnd.x, 0.35) + cos(ctrlAngle) * ctrlPush,
      mix(rootsTop.y, rootsEnd.y, 0.55),
      mix(rootsTop.z, rootsEnd.z, 0.35) + sin(ctrlAngle) * ctrlPush
    );
    vec3 ctrlB = vec3(
      mix(rootsTop.x, rootsEnd.x, 0.7) + cos(ctrlAngle + 1.5) * ctrlPush * 0.6,
      mix(rootsTop.y, rootsEnd.y, 0.8),
      mix(rootsTop.z, rootsEnd.z, 0.7) + sin(ctrlAngle + 1.5) * ctrlPush * 0.6
    );
    // Cubic Bezier: B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
    float ti = 1.0 - t;
    vec3 rootsPos = ti*ti*ti * rootsTop
                  + 3.0*ti*ti*t * ctrlA
                  + 3.0*ti*t*t * ctrlB
                  + t*t*t * rootsEnd;
    // Per-fibre time wobble — slight breathing
    rootsPos.x += sin(uTime * 0.3 + instSeed.x * 7.5) * 0.7 * (0.3 + 0.7 * t);
    rootsPos.z += cos(uTime * 0.25 + instSeed.y * 7.5) * 0.7 * (0.3 + 0.7 * t);
    // High-frequency twig wobble for texture
    rootsPos.x += sin(t * 22.0 + instSeed.x * 6.0) * 0.18;
    rootsPos.z += cos(t * 24.0 + instSeed.y * 6.0) * 0.18;
    rootsPos.y += yShift * 0.35;
    // Width tapers from thick base to thin tip
    float widthTaper = mix(1.6, 0.4, t);
    rootsPos.x += position.x * instWidth * widthTaper;
    rootsPos.z += position.x * instWidth * widthTaper * 0.35;

    float modeBlend = clamp(uMode, 0.0, 1.0);
    vec3 blendedPosition = mix(rootsPos, finalPosition, modeBlend);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(blendedPosition, 1.0);
  }
`;

const fiberFragmentShader = /* glsl */`
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uGlowColor;
  uniform float uForestIntensity;
  varying float vProgress;
  varying float vNoise;
  varying float vHue;
  varying float vBrightness;

  void main() {
    float alpha = smoothstep(0.02, 0.2, vProgress) * (1.0 - vProgress);
    // Frayed-tip artefact: noise breaks the upper third of the fiber.
    float fray = 1.0 - smoothstep(0.55, 0.95, vProgress) * (0.35 + 0.4 * sin(vNoise * 12.0 + vHue * 30.0));
    alpha *= fray;

    vec3 color = mix(uBaseColor, uTipColor, pow(vProgress, 0.55));
    color += uGlowColor * (0.18 + 0.35 * (1.0 - vProgress) + vNoise * 0.12);

    // Per-fiber hue shift inside the iridescent family.
    vec3 hueOffset = vec3((vHue - 0.5) * 0.18, (vHue - 0.5) * -0.05, (vHue - 0.5) * 0.22);
    color += hueOffset;

    // Chromatic aberration: split R/B subtly per fiber so bright strands
    // gain a coloured fringe — cinematic / lens artefact feel.
    float chromShift = (vHue - 0.5) * 0.35;
    color.r *= 1.0 + chromShift * 0.4;
    color.b *= 1.0 - chromShift * 0.3;

    color *= vBrightness;

    gl_FragColor = vec4(color, alpha * 0.55 * uForestIntensity * (0.35 + 0.65 * vBrightness));
    if (gl_FragColor.a < 0.015) discard;
  }
`;

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
  uniform sampler2D uSilk;
  varying vec2 vUv;
  varying float vRadial;

  float fbm(vec2 p) {
    float a = 0.5;
    float f = 0.0;
    for (int i = 0; i < 4; i++) {
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
    float alpha = fiber * edge * depthFade * (0.45 + 0.85 * silk);
    alpha += silk * silk * edge * depthFade * 0.10;
    if (alpha < 0.01) discard;

    vec3 base = mix(uBaseColor, uTipColor, pow(uv.y, 0.45));
    vec3 color = base + uGlowColor * fiber * edge * (0.7 + 0.8 * silk);
    color += uGlowColor * silk * silk * edge * 0.28;
    color *= mix(0.4, 1.2, edge);

    gl_FragColor = vec4(color, alpha);
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
        fiberCount: 380,
        length: 140,
        innerRadius: 5,
        radiusSpread: 22,
        nearBandRatio: 0.2,
        depthRange: 160,
        heightVariance: 60,
        scrollSpeed: 18,
        timeScale: 0.45,
        curveStrength: 3.5,
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
    this.scroll = 0;
    this.verticalScroll = 0;
    this.speedupAmount = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uLength: { value: this.options.length },
      uDepthRange: { value: this.options.depthRange },
      uBaseColor: { value: new THREE.Color(0x110816) },
      uTipColor: { value: new THREE.Color(0x6b4bff) },
      uGlowColor: { value: new THREE.Color(0xb7a4ff) },
      uCurveStrength: { value: this.options.curveStrength },
      uWavePhase: { value: 0 },
      uWaveAmp: { value: 0.8 },
      uVerticalScroll: { value: 0 },
      uVerticalWrap: { value: this.options.verticalWrap },
      uForestIntensity: { value: 1.0 },
      uMode: { value: 0.0 },
    };

    this.forestIntensity = 1.0;
    this.targetForestIntensity = 1.0;
    this.forestIntensityRate = 0;

    this.mode = 0.0;
    this.targetMode = 0.0;
    this.modeRate = 0;

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

    this.geometry = this.createFiberGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: fiberVertexShader,
      fragmentShader: fiberFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;

    this.tunnel = this.createTunnel();
    this.sparkles = this.createSparkles();

    this.group = new THREE.Group();
    this.group.visible = false;
    this.tunnel.renderOrder = -10;
    this.mesh.renderOrder = 0;
    this.sparkles.renderOrder = 5;
    this.group.add(this.tunnel);
    this.group.add(this.mesh);
    this.group.add(this.sparkles);
  }

  createFiberGeometry() {
    const segments = 80;
    const plane = new THREE.PlaneBufferGeometry(1.8, this.options.length, 6, segments);
    const posAttr = plane.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const yNorm = (posAttr.getY(i) / this.options.length) * 2.0;
      const flare = 0.65 * (1.0 - Math.pow(Math.abs(yNorm), 1.5));
      const base = 0.25 + flare;
      posAttr.setX(i, posAttr.getX(i) * base);
    }
    posAttr.needsUpdate = true;
    const progress = new Float32Array(posAttr.count);
    const positions = posAttr.array;
    for (let i = 0; i < plane.attributes.position.count; i++) {
      const y = positions[i * 3 + 1];
      const t = Math.max(0, Math.min(1, (y + this.options.length / 2) / this.options.length));
      progress[i] = t;
    }
    plane.setAttribute('progress', new THREE.Float32BufferAttribute(progress, 1));

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = plane.index;
    geometry.attributes.position = plane.attributes.position;
    geometry.attributes.uv = plane.attributes.uv;
    geometry.attributes.normal = plane.attributes.normal;
    geometry.setAttribute('progress', plane.getAttribute('progress'));

    const fiberCount = this.options.fiberCount;
    const offsets = new Float32Array(fiberCount * 3);
    const seeds = new Float32Array(fiberCount * 3);
    const widths = new Float32Array(fiberCount);
    const depths = new Float32Array(fiberCount);

    for (let i = 0; i < fiberCount; i++) {
      const i3 = i * 3;
      const vertical = Math.random() * 2 - 1;
      const upper = vertical >= 0.0 ? 1 : -1;
      const flare = Math.pow(Math.abs(vertical), 0.55);
      const outer = this.options.innerRadius + this.options.radiusSpread * (0.9 + 0.2 * Math.random());
      const inner = this.options.innerRadius * (0.45 + 0.2 * Math.random());
      const radius = inner + (1.0 - flare) * (outer - inner);
      const x = (radius + 0.5 * Math.sin(vertical * 2.4)) * upper;
      const z = vertical * this.options.radiusSpread * 0.85 + (Math.random() - 0.5);

      offsets[i3] = x;
      offsets[i3 + 1] = z;
      offsets[i3 + 2] = Math.random() * this.options.heightVariance - this.options.heightVariance * 0.5;

      seeds[i3] = 0.8 + Math.random() * 1.8;
      seeds[i3 + 1] = Math.random() * 2.0 + 0.5;
      seeds[i3 + 2] = Math.random() * 0.8 + 0.2;

      widths[i] = Math.random() * 0.16 + 0.04;
      depths[i] = Math.random() * this.options.depthRange;
    }

    geometry.setAttribute('instOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute('instSeed', new THREE.InstancedBufferAttribute(seeds, 3));
    geometry.setAttribute('instWidth', new THREE.InstancedBufferAttribute(widths, 1));
    geometry.setAttribute('instDepth', new THREE.InstancedBufferAttribute(depths, 1));
    geometry.instanceCount = fiberCount;
    return geometry;
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
    const count = 1200;
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
    this.scene.fog = new THREE.Fog(this.uniforms.uBaseColor.value.getHex(), 12, this.options.length * 1.6);
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

  setMode(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetMode = clamped;
    if (durationMs <= 0) {
      this.mode = clamped;
      this.uniforms.uMode.value = clamped;
      this.modeRate = 0;
    } else {
      this.modeRate = Math.abs(clamped - this.mode) / (durationMs / 1000);
    }
  }

  setForestIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetForestIntensity = clamped;
    if (durationMs <= 0) {
      this.forestIntensity = clamped;
      this.uniforms.uForestIntensity.value = clamped;
      this.forestIntensityRate = 0;
    } else {
      this.forestIntensityRate = Math.abs(clamped - this.forestIntensity) / (durationMs / 1000);
    }
  }

  setPalette({ base, tip, glow } = {}) {
    if (base !== undefined) this.uniforms.uBaseColor.value.set(base);
    if (tip !== undefined) this.uniforms.uTipColor.value.set(tip);
    if (glow !== undefined) this.uniforms.uGlowColor.value.set(glow);
  }

  update(delta = 0) {
    if (!this.enabled) return;

    if (this.forestIntensityRate > 0) {
      const step = delta * this.forestIntensityRate;
      if (this.forestIntensity < this.targetForestIntensity) {
        this.forestIntensity = Math.min(this.forestIntensity + step, this.targetForestIntensity);
      } else {
        this.forestIntensity = Math.max(this.forestIntensity - step, this.targetForestIntensity);
      }
      this.uniforms.uForestIntensity.value = this.forestIntensity;
      if (this.forestIntensity === this.targetForestIntensity) this.forestIntensityRate = 0;
    }

    if (this.modeRate > 0) {
      const step = delta * this.modeRate;
      if (this.mode < this.targetMode) {
        this.mode = Math.min(this.mode + step, this.targetMode);
      } else {
        this.mode = Math.max(this.mode - step, this.targetMode);
      }
      this.uniforms.uMode.value = this.mode;
      if (this.mode === this.targetMode) this.modeRate = 0;
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
    this.uniforms.uWavePhase.value += delta * 1.5;
    this.scroll = (this.scroll + delta * this.options.scrollSpeed * speedMultiplier) % this.options.depthRange;
    this.uniforms.uScroll.value = this.scroll;
    this.uniforms.uCurveStrength.value = this.options.curveStrength * (0.85 + Math.sin(this.uniforms.uTime.value * 0.7) * 0.2);

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
    this.geometry.dispose();
    this.material.dispose();
    this.tunnel.geometry.dispose();
    this.tunnel.material.dispose();
    this.sparkles.geometry.dispose();
    this.sparkles.material.dispose();
  }
}

export { FiberForestBackground };
