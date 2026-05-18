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
      },
      options
    );

    this.enabled = false;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.intensityTransitionRate = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uBaseColor: { value: new THREE.Color(this.options.baseColor) },
      uGlowColor: { value: new THREE.Color(this.options.glowColor) },
    };

    this.dustPoints = this.createDustSystem();
    this.group = new THREE.Group();
    this.group.renderOrder = -20;
    this.group.add(this.dustPoints);
    this.group.visible = false;
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
  }

  dispose() {
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
    this.dustPoints.geometry.dispose();
    this.dustPoints.material.dispose();
  }
}

export { CosmicDome };
