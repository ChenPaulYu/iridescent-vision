import * as THREE from 'three';

const dustVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  attribute vec3 seed;
  attribute float scale;
  varying float vAlpha;
  varying float vSeedA;

  void main() {
    vec3 drift = vec3(
      sin(uTime * 0.07 + seed.x * 6.28318) * 4.0,
      cos(uTime * 0.05 + seed.y * 6.28318) * 5.0,
      sin(uTime * 0.06 + seed.z * 6.28318) * 4.0
    );
    vec3 pos = position + drift;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = scale * (260.0 / -mvPosition.z) * (0.4 + uIntensity * 0.6);
    vAlpha = (0.45 + 0.55 * abs(sin(uTime * 0.3 + seed.x * 3.14159))) * uIntensity;
    vSeedA = seed.x;
  }
`;

const dustFragmentShader = /* glsl */`
  uniform vec3 uBaseColor;
  uniform vec3 uGlowColor;
  varying float vAlpha;
  varying float vSeedA;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    float soft = smoothstep(0.5, 0.0, dist);
    if (soft < 0.02) discard;
    vec3 color = mix(uBaseColor, uGlowColor, 0.5 + 0.35 * sin(vSeedA * 2.0));
    gl_FragColor = vec4(color, soft * vAlpha * 0.5);
  }
`;

const burstVertexShader = /* glsl */`
  attribute vec3 burstTint;
  attribute float burstLife;
  attribute float burstScale;
  varying vec3 vTint;
  varying float vLife;

  void main() {
    vTint = burstTint;
    vLife = burstLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = burstScale * (300.0 / -mv.z) * burstLife;
  }
`;

const burstFragmentShader = /* glsl */`
  varying vec3 vTint;
  varying float vLife;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    float soft = smoothstep(0.5, 0.0, dist);
    if (soft < 0.02 || vLife <= 0.0) discard;
    gl_FragColor = vec4(vTint, soft * vLife * 0.8);
  }
`;

const yantraVertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const astrolabeVertexShader = yantraVertexShader;

const mantraVertexShader = yantraVertexShader;

const mantraFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uGoldColor;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 5.5;
    float drift = uTime * 0.045;
    p += vec2(drift, sin(drift * 0.5) * 0.25);

    // Domain warp — flowing calligraphic feel
    vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
    float n = fbm(p + q * 1.6);

    // Threshold to extract narrow ridges that read as strokes
    float thr = 0.5;
    float band = smoothstep(thr - 0.03, thr, n) - smoothstep(thr, thr + 0.03, n);

    // Center-bias so strokes fade at frame edges
    vec2 centered = vUv - 0.5;
    float radial = 1.0 - smoothstep(0.28, 0.48, length(centered));

    float glow = band * radial * uIntensity;
    vec3 col = uGoldColor * glow * 1.5;
    float alpha = glow * 0.55;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const astrolabeFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSpeedup;
  uniform vec3 uGoldColor;
  varying vec2 vUv;

  float ringBand(float r, float radius, float thickness) {
    return exp(-abs(r - radius) * thickness);
  }

  float ringWithTicks(vec2 p, float radius, float tickCount, float rotation, float bandThickness) {
    float r = length(p);
    float ring = ringBand(r, radius, bandThickness);
    float a = atan(p.y, p.x) + rotation;
    float interval = 6.28318 / tickCount;
    float tickPos = mod(a, interval);
    float tickDist = min(tickPos, interval - tickPos);
    float tickHighlight = smoothstep(0.05, 0.0, tickDist);
    return ring * (1.0 + tickHighlight * 2.2);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);

    float speed = 1.0 + uSpeedup * 8.0;
    float total = 0.0;
    total += ringWithTicks(p, 0.96, 24.0,  uTime * 0.05 * speed, 220.0);
    total += ringWithTicks(p, 0.78, 16.0, -uTime * 0.07 * speed, 240.0) * 0.85;
    total += ringWithTicks(p, 0.62, 12.0,  uTime * 0.045 * speed, 260.0) * 0.75;
    total += ringWithTicks(p, 0.46,  8.0, -uTime * 0.06 * speed, 280.0) * 0.65;

    float outerFade = 1.0 - smoothstep(0.96, 1.05, r);
    float innerFade = smoothstep(0.42, 0.48, r);
    total *= outerFade * innerFade;

    vec3 col = uGoldColor * total * uIntensity;
    float alpha = total * uIntensity * 0.5;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const yantraFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uBloomAmount;
  uniform float uBloomRadius;
  uniform vec3 uGoldColor;
  uniform vec3 uBinduColor;
  varying vec2 vUv;

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
    return min(min(sdSegment(p, a, b), sdSegment(p, b, c)), sdSegment(p, c, a));
  }

  float downwardTri(vec2 p, float r) {
    return sdTri(p, vec2(0.0, -r), vec2(-r * 0.866, r * 0.5), vec2(r * 0.866, r * 0.5));
  }

  float upwardTri(vec2 p, float r) {
    return sdTri(p, vec2(0.0, r), vec2(-r * 0.866, -r * 0.5), vec2(r * 0.866, -r * 0.5));
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;

    float dist = 1000.0;
    dist = min(dist, downwardTri(p, 0.95));
    dist = min(dist, downwardTri(p, 0.72));
    dist = min(dist, downwardTri(p, 0.52));
    dist = min(dist, downwardTri(p, 0.34));
    dist = min(dist, upwardTri(p, 0.88));
    dist = min(dist, upwardTri(p, 0.66));
    dist = min(dist, upwardTri(p, 0.46));
    dist = min(dist, upwardTri(p, 0.28));

    float core = exp(-dist * 110.0);
    float halo = exp(-dist * 22.0);
    float lineGlow = core * 2.4 + halo * 0.35;
    lineGlow *= 0.78 + 0.22 * sin(uTime * 1.1);

    float pRadius = length(p);
    float revealMask = 1.0 - smoothstep(uBloomRadius - 0.06, uBloomRadius + 0.06, pRadius);
    lineGlow *= revealMask;

    float bindu = exp(-pRadius * pRadius * 240.0) * smoothstep(0.0, 0.06, uBloomRadius);

    vec3 col = uGoldColor * lineGlow + uBinduColor * bindu * 2.4;
    float alpha = (lineGlow * 0.9 + bindu * 1.2) * uBloomAmount;

    if (alpha < 0.005) discard;
    gl_FragColor = vec4(min(col, vec3(1.6)), min(alpha, 1.0));
  }
`;

class CosmicDome {
  constructor(renderer, scene, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.options = Object.assign(
      {
        ambientCount: 2200,
        shellInnerRadius: 28,
        shellOuterRadius: 95,
        baseColor: 0x180b2c,
        glowColor: 0xc9a8ff,
        goldColor: 0xffd95c,
        binduColor: 0xff8a4a,
        yantraSize: 70,
        yantraDistance: -22,
        astrolabeSize: 130,
        astrolabeDistance: -55,
        mantraSize: 110,
        mantraDistance: -38,
        burstCapacity: 600,
        burstDefaultLifetime: 4.5,
      },
      options
    );

    this.enabled = false;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.intensityTransitionRate = 0;

    this.bloomAmount = 0;
    this.targetBloomAmount = 0;
    this.bloomAmountRate = 0;
    this.bloomRadius = 0;
    this.targetBloomRadius = 0;
    this.bloomRadiusRate = 0;

    this.astrolabeIntensity = 0;
    this.targetAstrolabeIntensity = 0;
    this.astrolabeIntensityRate = 0;
    this.astrolabeSpeedup = 0;
    this.targetAstrolabeSpeedup = 0;
    this.astrolabeSpeedupRate = 0;

    this.mantraIntensity = 0;
    this.targetMantraIntensity = 0;
    this.mantraIntensityRate = 0;

    this.resonanceMode = 'idle';
    this.rotationOffset = 0;
    this.shakePhase = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uBaseColor: { value: new THREE.Color(this.options.baseColor) },
      uGlowColor: { value: new THREE.Color(this.options.glowColor) },
    };

    this.yantraUniforms = {
      uTime: this.uniforms.uTime,
      uBloomAmount: { value: 0 },
      uBloomRadius: { value: 0 },
      uGoldColor: { value: new THREE.Color(this.options.goldColor) },
      uBinduColor: { value: new THREE.Color(this.options.binduColor) },
    };

    this.astrolabeUniforms = {
      uTime: this.uniforms.uTime,
      uIntensity: { value: 0 },
      uSpeedup: { value: 0 },
      uGoldColor: { value: new THREE.Color(this.options.goldColor) },
    };

    this.mantraUniforms = {
      uTime: this.uniforms.uTime,
      uIntensity: { value: 0 },
      uGoldColor: { value: new THREE.Color(this.options.goldColor) },
    };

    this.dustPoints = this.createDustSystem();
    this.yantraMesh = this.createYantra();
    this.astrolabeMesh = this.createAstrolabe();
    this.mantraMesh = this.createMantra();
    this.burstPoints = this.createBurstPool();
    this.group = new THREE.Group();
    this.group.renderOrder = -20;
    this.group.add(this.dustPoints);
    this.group.add(this.astrolabeMesh);
    this.group.add(this.mantraMesh);
    this.group.add(this.yantraMesh);
    this.group.add(this.burstPoints);
    this.group.visible = false;
  }

  createBurstPool() {
    const cap = this.options.burstCapacity;
    const positions = new Float32Array(cap * 3);
    const velocities = new Float32Array(cap * 3);
    const tints = new Float32Array(cap * 3);
    const lives = new Float32Array(cap);
    const maxLives = new Float32Array(cap);
    const scales = new Float32Array(cap);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('burstTint', new THREE.BufferAttribute(tints, 3));
    geom.setAttribute('burstLife', new THREE.BufferAttribute(lives, 1));
    geom.setAttribute('burstScale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: burstVertexShader,
      fragmentShader: burstFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    points.userData = { velocities, maxLives, cursor: 0 };
    return points;
  }

  createMantra() {
    const geom = new THREE.PlaneGeometry(this.options.mantraSize, this.options.mantraSize);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.mantraUniforms,
      vertexShader: mantraVertexShader,
      fragmentShader: mantraFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 0, this.options.mantraDistance);
    mesh.frustumCulled = false;
    mesh.renderOrder = -16;
    return mesh;
  }

  createAstrolabe() {
    const geom = new THREE.PlaneGeometry(this.options.astrolabeSize, this.options.astrolabeSize);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.astrolabeUniforms,
      vertexShader: astrolabeVertexShader,
      fragmentShader: astrolabeFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 0, this.options.astrolabeDistance);
    mesh.frustumCulled = false;
    mesh.renderOrder = -18;
    return mesh;
  }

  createYantra() {
    const geom = new THREE.PlaneGeometry(this.options.yantraSize, this.options.yantraSize);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.yantraUniforms,
      vertexShader: yantraVertexShader,
      fragmentShader: yantraFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 0, this.options.yantraDistance);
    mesh.frustumCulled = false;
    mesh.renderOrder = -15;
    return mesh;
  }

  createDustSystem() {
    const count = this.options.ambientCount;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r =
        this.options.shellInnerRadius +
        Math.pow(Math.random(), 0.6) *
          (this.options.shellOuterRadius - this.options.shellInnerRadius);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();

      scales[i] = 1.2 + Math.random() * 3.4;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    geom.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
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
    if (!this.group.parent) {
      this.scene.add(this.group);
    }
    this.group.visible = true;
  }

  disable() {
    this.enabled = false;
    this.group.visible = false;
  }

  setPalette({ base, glow }) {
    if (base !== undefined) this.uniforms.uBaseColor.value.set(base);
    if (glow !== undefined) this.uniforms.uGlowColor.value.set(glow);
  }

  setIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetIntensity = clamped;
    if (durationMs <= 0) {
      this.intensity = clamped;
      this.uniforms.uIntensity.value = clamped;
      this.intensityTransitionRate = 0;
    } else {
      this.intensityTransitionRate =
        Math.abs(clamped - this.intensity) / (durationMs / 1000);
    }
  }

  bloomYantra(durationMs = 1500, peakRadius = 1.15, peakAmount = 1.0) {
    this.targetBloomRadius = peakRadius;
    this.targetBloomAmount = peakAmount;
    if (durationMs <= 0) {
      this.bloomRadius = peakRadius;
      this.bloomAmount = peakAmount;
      this.yantraUniforms.uBloomRadius.value = peakRadius;
      this.yantraUniforms.uBloomAmount.value = peakAmount;
      this.bloomRadiusRate = 0;
      this.bloomAmountRate = 0;
    } else {
      const secs = durationMs / 1000;
      this.bloomRadiusRate = Math.abs(peakRadius - this.bloomRadius) / secs;
      this.bloomAmountRate = Math.abs(peakAmount - this.bloomAmount) / secs;
    }
  }

  collapseYantra(durationMs = 1500) {
    this.bloomYantra(durationMs, 0, 0);
  }

  setAstrolabeIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetAstrolabeIntensity = clamped;
    if (durationMs <= 0) {
      this.astrolabeIntensity = clamped;
      this.astrolabeUniforms.uIntensity.value = clamped;
      this.astrolabeIntensityRate = 0;
    } else {
      this.astrolabeIntensityRate =
        Math.abs(clamped - this.astrolabeIntensity) / (durationMs / 1000);
    }
  }

  resonateWith(mode) {
    this.resonanceMode = mode || 'idle';
  }

  decompose(durationMs = 8000) {
    this.setMantraIntensity(0, durationMs * 0.7);
    this.collapseYantra(durationMs * 0.6);
    this.setAstrolabeIntensity(0, durationMs);
    this.setIntensity(0.45, durationMs * 1.2);
  }

  setMantraIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetMantraIntensity = clamped;
    if (durationMs <= 0) {
      this.mantraIntensity = clamped;
      this.mantraUniforms.uIntensity.value = clamped;
      this.mantraIntensityRate = 0;
    } else {
      this.mantraIntensityRate = Math.abs(clamped - this.mantraIntensity) / (durationMs / 1000);
    }
  }

  pulseAstrolabe(peakSpeed = 1.0, riseMs = 600, fallMs = 900) {
    this.targetAstrolabeSpeedup = peakSpeed;
    this.astrolabeSpeedupRate = Math.abs(peakSpeed - this.astrolabeSpeedup) / (riseMs / 1000);
    setTimeout(() => {
      this.targetAstrolabeSpeedup = 0;
      this.astrolabeSpeedupRate = Math.abs(this.astrolabeSpeedup) / (fallMs / 1000);
    }, riseMs);
  }

  spawnDust({ position, velocity, count = 1, tint, lifetime, scale } = {}) {
    if (!position) return;
    const pool = this.burstPoints;
    const cap = this.options.burstCapacity;
    const positions = pool.geometry.attributes.position.array;
    const tints = pool.geometry.attributes.burstTint.array;
    const lives = pool.geometry.attributes.burstLife.array;
    const scales = pool.geometry.attributes.burstScale.array;
    const velocities = pool.userData.velocities;
    const maxLives = pool.userData.maxLives;
    const defaultColor = tint ? new THREE.Color(tint) : this.uniforms.uGlowColor.value;
    const life = lifetime != null ? lifetime : this.options.burstDefaultLifetime;
    const baseVel = velocity || new THREE.Vector3(0, 0, 0);
    const baseScale = scale != null ? scale : 1.6;

    for (let i = 0; i < count; i++) {
      const idx = pool.userData.cursor;
      pool.userData.cursor = (pool.userData.cursor + 1) % cap;
      positions[idx * 3] = position.x + (Math.random() - 0.5) * 0.4;
      positions[idx * 3 + 1] = position.y + (Math.random() - 0.5) * 0.4;
      positions[idx * 3 + 2] = position.z + (Math.random() - 0.5) * 0.4;
      velocities[idx * 3] = baseVel.x + (Math.random() - 0.5) * 0.6;
      velocities[idx * 3 + 1] = baseVel.y + (Math.random() - 0.5) * 0.6;
      velocities[idx * 3 + 2] = baseVel.z + (Math.random() - 0.5) * 0.6;
      tints[idx * 3] = defaultColor.r;
      tints[idx * 3 + 1] = defaultColor.g;
      tints[idx * 3 + 2] = defaultColor.b;
      lives[idx] = 1.0;
      maxLives[idx] = life;
      scales[idx] = baseScale * (0.7 + Math.random() * 0.6);
    }
    pool.geometry.attributes.position.needsUpdate = true;
    pool.geometry.attributes.burstTint.needsUpdate = true;
    pool.geometry.attributes.burstLife.needsUpdate = true;
    pool.geometry.attributes.burstScale.needsUpdate = true;
  }

  update(delta = 0) {
    if (!this.enabled) return;
    this.uniforms.uTime.value += delta;

    if (this.resonanceMode === 'shake') {
      this.shakePhase += delta * 1.7;
      this.group.rotation.z = Math.sin(this.shakePhase) * 0.05;
      this.group.rotation.x = Math.cos(this.shakePhase * 0.78) * 0.03;
    } else if (this.resonanceMode === 'rotate') {
      this.rotationOffset += delta * 0.12;
      this.group.rotation.z = this.rotationOffset;
      this.group.rotation.x *= 0.94;
    } else if (this.resonanceMode === 'flake') {
      this.shakePhase += delta * 0.5;
      this.group.rotation.z = Math.sin(this.shakePhase) * 0.015;
      this.group.rotation.x *= 0.94;
    } else {
      this.group.rotation.z *= 0.94;
      this.group.rotation.x *= 0.94;
    }

    if (this.intensityTransitionRate > 0) {
      const step = delta * this.intensityTransitionRate;
      if (this.intensity < this.targetIntensity) {
        this.intensity = Math.min(this.intensity + step, this.targetIntensity);
      } else {
        this.intensity = Math.max(this.intensity - step, this.targetIntensity);
      }
      this.uniforms.uIntensity.value = this.intensity;
      if (this.intensity === this.targetIntensity) {
        this.intensityTransitionRate = 0;
      }
    }

    if (this.bloomRadiusRate > 0) {
      const step = delta * this.bloomRadiusRate;
      if (this.bloomRadius < this.targetBloomRadius) {
        this.bloomRadius = Math.min(this.bloomRadius + step, this.targetBloomRadius);
      } else {
        this.bloomRadius = Math.max(this.bloomRadius - step, this.targetBloomRadius);
      }
      this.yantraUniforms.uBloomRadius.value = this.bloomRadius;
      if (this.bloomRadius === this.targetBloomRadius) this.bloomRadiusRate = 0;
    }

    if (this.bloomAmountRate > 0) {
      const step = delta * this.bloomAmountRate;
      if (this.bloomAmount < this.targetBloomAmount) {
        this.bloomAmount = Math.min(this.bloomAmount + step, this.targetBloomAmount);
      } else {
        this.bloomAmount = Math.max(this.bloomAmount - step, this.targetBloomAmount);
      }
      this.yantraUniforms.uBloomAmount.value = this.bloomAmount;
      if (this.bloomAmount === this.targetBloomAmount) this.bloomAmountRate = 0;
    }

    if (this.astrolabeIntensityRate > 0) {
      const step = delta * this.astrolabeIntensityRate;
      if (this.astrolabeIntensity < this.targetAstrolabeIntensity) {
        this.astrolabeIntensity = Math.min(this.astrolabeIntensity + step, this.targetAstrolabeIntensity);
      } else {
        this.astrolabeIntensity = Math.max(this.astrolabeIntensity - step, this.targetAstrolabeIntensity);
      }
      this.astrolabeUniforms.uIntensity.value = this.astrolabeIntensity;
      if (this.astrolabeIntensity === this.targetAstrolabeIntensity) this.astrolabeIntensityRate = 0;
    }

    if (this.astrolabeSpeedupRate > 0) {
      const step = delta * this.astrolabeSpeedupRate;
      if (this.astrolabeSpeedup < this.targetAstrolabeSpeedup) {
        this.astrolabeSpeedup = Math.min(this.astrolabeSpeedup + step, this.targetAstrolabeSpeedup);
      } else {
        this.astrolabeSpeedup = Math.max(this.astrolabeSpeedup - step, this.targetAstrolabeSpeedup);
      }
      this.astrolabeUniforms.uSpeedup.value = this.astrolabeSpeedup;
      if (this.astrolabeSpeedup === this.targetAstrolabeSpeedup) this.astrolabeSpeedupRate = 0;
    }

    if (this.burstPoints) {
      const pool = this.burstPoints;
      const positions = pool.geometry.attributes.position.array;
      const lives = pool.geometry.attributes.burstLife.array;
      const velocities = pool.userData.velocities;
      const maxLives = pool.userData.maxLives;
      const cap = this.options.burstCapacity;
      let anyAlive = false;
      for (let i = 0; i < cap; i++) {
        if (lives[i] <= 0.0) continue;
        anyAlive = true;
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
        velocities[i * 3] *= 0.985;
        velocities[i * 3 + 1] *= 0.985;
        velocities[i * 3 + 2] *= 0.985;
        const decay = delta / maxLives[i];
        lives[i] = Math.max(0, lives[i] - decay);
      }
      if (anyAlive) {
        pool.geometry.attributes.position.needsUpdate = true;
        pool.geometry.attributes.burstLife.needsUpdate = true;
      }
    }

    if (this.mantraIntensityRate > 0) {
      const step = delta * this.mantraIntensityRate;
      if (this.mantraIntensity < this.targetMantraIntensity) {
        this.mantraIntensity = Math.min(this.mantraIntensity + step, this.targetMantraIntensity);
      } else {
        this.mantraIntensity = Math.max(this.mantraIntensity - step, this.targetMantraIntensity);
      }
      this.mantraUniforms.uIntensity.value = this.mantraIntensity;
      if (this.mantraIntensity === this.targetMantraIntensity) this.mantraIntensityRate = 0;
    }
  }

  dispose() {
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
    this.dustPoints.geometry.dispose();
    this.dustPoints.material.dispose();
    this.yantraMesh.geometry.dispose();
    this.yantraMesh.material.dispose();
    this.astrolabeMesh.geometry.dispose();
    this.astrolabeMesh.material.dispose();
    this.mantraMesh.geometry.dispose();
    this.mantraMesh.material.dispose();
    this.burstPoints.geometry.dispose();
    this.burstPoints.material.dispose();
  }
}

export { CosmicDome };
