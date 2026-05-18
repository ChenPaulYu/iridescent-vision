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

const yantraVertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

    this.dustPoints = this.createDustSystem();
    this.yantraMesh = this.createYantra();
    this.group = new THREE.Group();
    this.group.renderOrder = -20;
    this.group.add(this.dustPoints);
    this.group.add(this.yantraMesh);
    this.group.visible = false;
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

  spawnDust(opts = {}) {
    // Public API stub for sync-contract §3 (shared particle pool).
    // Full burst-spawn implementation will land when mask GoldFlakes ships.
    // Logged so the wiring can be verified end-to-end ahead of time.
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[CosmicDome.spawnDust]', opts);
    }
  }

  update(delta = 0) {
    if (!this.enabled) return;
    this.uniforms.uTime.value += delta;

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
  }

  dispose() {
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
    this.dustPoints.geometry.dispose();
    this.dustPoints.material.dispose();
    this.yantraMesh.geometry.dispose();
    this.yantraMesh.material.dispose();
  }
}

export { CosmicDome };
