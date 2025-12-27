import * as THREE from 'three';

const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uScroll;
  uniform float uLength;
  uniform float uDepthRange;
  uniform float uCurveStrength;
  attribute float progress;
  attribute vec3 instOffset;
  attribute vec3 instSeed;
  attribute float instWidth;
  attribute float instDepth;
  varying float vProgress;
  varying float vNoise;

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

    float height = -uLength * 0.5 + t * uLength + instOffset.z;
    displaced.y = height;

    float depthShift = instDepth + uScroll - t * uDepthRange * 0.35;
    depthShift = mod(depthShift + uDepthRange, uDepthRange) - uDepthRange * 0.5;
    displaced.z += depthShift;

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

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uGlowColor;
  varying float vProgress;
  varying float vNoise;

  void main() {
    float alpha = smoothstep(0.02, 0.2, vProgress) * (1.0 - vProgress);
    vec3 color = mix(uBaseColor, uTipColor, pow(vProgress, 0.55));
    color += uGlowColor * (0.2 + 0.4 * (1.0 - vProgress) + vNoise * 0.05);
    gl_FragColor = vec4(color, alpha * 0.9);
    if (gl_FragColor.a < 0.02) discard;
  }
`;

class FiberForestBackground {
  constructor(renderer, scene, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.options = Object.assign(
      {
        fiberCount: 420,
        length: 140,
        innerRadius: 7,
        radiusSpread: 18,
        depthRange: 160,
        heightVariance: 60,
        scrollSpeed: 18,
        timeScale: 0.45,
        curveStrength: 3.5,
      },
      options
    );

    this.enabled = false;
    this.speedup = false;
    this.direction = 'forward';
    this.scroll = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uLength: { value: this.options.length },
      uDepthRange: { value: this.options.depthRange },
      uBaseColor: { value: new THREE.Color(0x110816) },
      uTipColor: { value: new THREE.Color(0x6b4bff) },
      uGlowColor: { value: new THREE.Color(0xb7a4ff) },
      uCurveStrength: { value: this.options.curveStrength },
    };

    this.previousFog = scene.fog || null;

    this.geometry = this.createGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.add(this.mesh);
  }

  createGeometry() {
    const segments = 80;
    const plane = new THREE.PlaneBufferGeometry(1, this.options.length, 1, segments);
    const progress = new Float32Array(plane.attributes.position.count);
    const positions = plane.attributes.position.array;
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
      const theta = Math.random() * Math.PI * 2;
      const radius = this.options.innerRadius + Math.pow(Math.random(), 0.55) * this.options.radiusSpread;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius * 0.8;

      offsets[i3] = x;
      offsets[i3 + 1] = z;
      offsets[i3 + 2] = Math.random() * this.options.heightVariance - this.options.heightVariance * 0.5;

      seeds[i3] = 0.8 + Math.random() * 1.8; // swirl strength
      seeds[i3 + 1] = Math.random() * 2.0 + 0.5; // sway speed
      seeds[i3 + 2] = Math.random() * 0.8 + 0.2; // ripple amount

      widths[i] = Math.random() * 0.18 + 0.04;
      depths[i] = Math.random() * this.options.depthRange;
    }

    geometry.setAttribute('instOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute('instSeed', new THREE.InstancedBufferAttribute(seeds, 3));
    geometry.setAttribute('instWidth', new THREE.InstancedBufferAttribute(widths, 1));
    geometry.setAttribute('instDepth', new THREE.InstancedBufferAttribute(depths, 1));
    geometry.instanceCount = fiberCount;
    return geometry;
  }

  enable() {
    this.enabled = true;
    if (this.group.parent !== this.scene) {
      this.scene.add(this.group);
    }
    this.group.visible = true;
    this.scene.fog = new THREE.Fog(0x110816, 15, this.options.length * 1.8);
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

  update(delta = 0) {
    if (!this.enabled) return;
    const speedMultiplier = this.speedup ? 2.5 : 1;
    this.uniforms.uTime.value += delta * this.options.timeScale * (0.6 + speedMultiplier * 0.4);
    const wrap = this.options.depthRange;
    this.scroll = (this.scroll + delta * this.options.scrollSpeed * speedMultiplier) % wrap;
    this.uniforms.uScroll.value = this.scroll;
  }

  dispose() {
    this.disable();
    this.geometry.dispose();
    this.material.dispose();
  }
}

export { FiberForestBackground };
