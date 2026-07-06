/**
 * EnvironmentDome.js — palette-driven sky dome for Orbit & Reflection (★).
 *
 * Inverted sphere wrapped around the camera, sampling the generated
 * dome texture as luminance-only structure and recoloring it live from
 * the shared palette (base → tip → glow ramp). Replaces the flat clear
 * color of early Orbit and the off-palette gradient.jpeg of Reflection;
 * also gives GlassSkin's cube camera real content to refract. One image,
 * two exposures: dim veil at gravity2Glass, milky bloom at Reflection.
 *
 * Reads: three · textures/generated/dome.jpg · PaletteCoordinator (via
 * setPalette) · app.js update loop
 */
import * as THREE from 'three';
import domeTexturePath from './textures/generated/dome.jpg';

const domeVertexShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vPos;

  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragmentShader = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uGlowColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPos;

  void main() {
    // Two drifting samples so the fog seems to breathe rather than
    // being a frozen photograph.
    vec2 uvA = vec2(vUv.x + uTime * 0.0016, vUv.y);
    vec2 uvB = vec2(vUv.x * 1.35 - uTime * 0.0011, vUv.y * 1.18 + 0.02);
    float lumA = dot(texture2D(uMap, uvA).rgb, vec3(0.299, 0.587, 0.114));
    float lumB = dot(texture2D(uMap, uvB).rgb, vec3(0.299, 0.587, 0.114));
    float lum = lumA * 0.72 + lumB * 0.38;

    // Luminance ramp onto the shared palette: shadows stay base,
    // midtones roll to tip, only the brightest fog pools reach glow.
    vec3 color = mix(uBaseColor, uTipColor, smoothstep(0.04, 0.5, lum));
    color = mix(color, uGlowColor, smoothstep(0.42, 0.95, lum) * 0.6);

    // Vertical shaping: zenith darker than the horizon (camera mostly
    // looks up), and the nadir fades too — HeadMove sends the camera
    // diving, and an unshaded lower hemisphere whites the frame out.
    float zenith = smoothstep(0.15, 0.95, vUv.y);
    color *= mix(1.0, 0.58, zenith * 0.8);
    float nadir = smoothstep(0.45, 0.05, vUv.y);
    color *= mix(1.0, 0.35, nadir);

    color *= uIntensity * (0.85 + 0.15 * lum);

    gl_FragColor = vec4(color, 1.0);
  }
`;

class EnvironmentDome {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;

    this.intensity = 0;
    this.targetIntensity = 0;
    this.intensityRate = 0;

    this.uniforms = {
      uMap: { value: new THREE.TextureLoader().load(domeTexturePath, (t) => {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.minFilter = THREE.LinearFilter;
      }) },
      uBaseColor: { value: new THREE.Color('#090a1c') },
      uTipColor: { value: new THREE.Color('#6ef1ff') },
      uGlowColor: { value: new THREE.Color('#b2fff7') },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
    };

    const geometry = new THREE.SphereBufferGeometry(300, 48, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: domeVertexShader,
      fragmentShader: domeFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'environmentDome';
    this.mesh.renderOrder = -20;
    this.mesh.frustumCulled = false;
  }

  enable() {
    if (this.mesh.parent !== this.scene) this.scene.add(this.mesh);
    this.enabled = true;
  }

  disable() {
    if (this.mesh.parent) this.scene.remove(this.mesh);
    this.enabled = false;
  }

  setPalette({ base, tip, glow } = {}) {
    if (base !== undefined) this.uniforms.uBaseColor.value.set(base);
    if (tip !== undefined) this.uniforms.uTipColor.value.set(tip);
    if (glow !== undefined) this.uniforms.uGlowColor.value.set(glow);
  }

  setIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1.5, target));
    this.targetIntensity = clamped;
    if (durationMs <= 0) {
      this.intensity = clamped;
      this.uniforms.uIntensity.value = clamped;
      this.intensityRate = 0;
    } else {
      this.intensityRate = Math.abs(clamped - this.intensity) / (durationMs / 1000);
    }
  }

  update(delta = 0, camera = null) {
    if (!this.enabled) return;

    if (this.intensityRate > 0) {
      const step = delta * this.intensityRate;
      if (this.intensity < this.targetIntensity) {
        this.intensity = Math.min(this.intensity + step, this.targetIntensity);
      } else {
        this.intensity = Math.max(this.intensity - step, this.targetIntensity);
      }
      this.uniforms.uIntensity.value = this.intensity;
      if (this.intensity === this.targetIntensity) this.intensityRate = 0;
    }

    this.uniforms.uTime.value += delta;
    this.mesh.rotation.y += delta * 0.004;

    // Infinite-sky behavior: the dome follows the camera so spline
    // rides in HeadMove can never poke through it.
    if (camera) this.mesh.position.copy(camera.position);
  }

  dispose() {
    this.disable();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.uniforms.uMap.value) this.uniforms.uMap.value.dispose();
  }
}

export { EnvironmentDome };
