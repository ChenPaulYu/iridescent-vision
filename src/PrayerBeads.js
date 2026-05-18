import * as THREE from 'three';

class PrayerBeads {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = Object.assign(
      {
        strandCount: 3,
        beadsPerStrand: 12,
        orbitRadius: 11,
        orbitSpeed: 0.22,
        beadSize: 0.32,
        color: 0xffd95c,
      },
      options
    );

    this.enabled = false;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.intensityRate = 0;
    this.time = 0;
    this.resonanceMode = 'idle';

    this.strands = this.createStrands();
    this.group = new THREE.Group();
    this.group.renderOrder = 2;
    this.group.visible = false;
    for (const strand of this.strands) this.group.add(strand);

    this.tmpMat = new THREE.Matrix4();
    this.tmpScale = new THREE.Vector3();
  }

  createStrands() {
    const strands = [];
    const sphereGeom = new THREE.SphereGeometry(this.options.beadSize, 14, 10);
    const baseMat = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let s = 0; s < this.options.strandCount; s++) {
      const mesh = new THREE.InstancedMesh(sphereGeom, baseMat.clone(), this.options.beadsPerStrand);
      mesh.frustumCulled = false;
      mesh.userData.tiltX = (s - (this.options.strandCount - 1) * 0.5) * 0.42;
      mesh.userData.tiltZ = s * 0.55;
      mesh.userData.phaseOffset = s * 2.1;
      mesh.userData.radiusBias = 1.0 + s * 0.18;
      strands.push(mesh);
    }
    return strands;
  }

  enable() {
    this.enabled = true;
    if (!this.group.parent) this.scene.add(this.group);
    this.group.visible = true;
  }

  disable() {
    this.enabled = false;
    this.group.visible = false;
  }

  setIntensity(target, durationMs = 0) {
    const clamped = Math.max(0, Math.min(1, target));
    this.targetIntensity = clamped;
    if (durationMs <= 0) {
      this.intensity = clamped;
      this.intensityRate = 0;
    } else {
      this.intensityRate = Math.abs(clamped - this.intensity) / (durationMs / 1000);
    }
  }

  resonateWith(mode) {
    this.resonanceMode = mode || 'idle';
  }

  update(delta, center) {
    if (!this.enabled) return;
    this.time += delta;

    if (this.intensityRate > 0) {
      const step = delta * this.intensityRate;
      if (this.intensity < this.targetIntensity) {
        this.intensity = Math.min(this.intensity + step, this.targetIntensity);
      } else {
        this.intensity = Math.max(this.intensity - step, this.targetIntensity);
      }
      if (this.intensity === this.targetIntensity) this.intensityRate = 0;
    }

    let speedScale = 1.0;
    let wobble = 0;
    if (this.resonanceMode === 'shake') {
      speedScale = 1.0 + Math.sin(this.time * 4.5) * 0.5;
      wobble = Math.sin(this.time * 6.2) * 0.5;
    } else if (this.resonanceMode === 'rotate') {
      speedScale = 0.5;
    } else if (this.resonanceMode === 'flake') {
      speedScale = 0.85;
      wobble = Math.sin(this.time * 1.8) * 0.2;
    }

    const cx = center ? center.x : 0;
    const cy = center ? center.y : 0;
    const cz = center ? center.z : 0;

    for (const strand of this.strands) {
      const tiltX = strand.userData.tiltX + wobble * 0.1;
      const tiltZ = strand.userData.tiltZ;
      const phaseOff = strand.userData.phaseOffset;
      const radius = this.options.orbitRadius * strand.userData.radiusBias;
      const cosTX = Math.cos(tiltX);
      const sinTX = Math.sin(tiltX);
      const cosTZ = Math.cos(tiltZ);
      const sinTZ = Math.sin(tiltZ);

      for (let i = 0; i < this.options.beadsPerStrand; i++) {
        const phase =
          (i / this.options.beadsPerStrand) * Math.PI * 2 +
          this.time * this.options.orbitSpeed * speedScale +
          phaseOff;
        const x0 = Math.cos(phase) * radius;
        const y0 = Math.sin(phase) * radius * 0.6;
        const z0 = 0;

        const y1 = y0 * cosTX - z0 * sinTX;
        const z1 = y0 * sinTX + z0 * cosTX;

        const x2 = x0 * cosTZ - y1 * sinTZ;
        const y2 = x0 * sinTZ + y1 * cosTZ;

        this.tmpScale.setScalar(this.intensity);
        this.tmpMat.makeScale(this.intensity, this.intensity, this.intensity);
        this.tmpMat.setPosition(cx + x2, cy + y2, cz + z1);
        strand.setMatrixAt(i, this.tmpMat);
      }
      strand.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    if (this.group.parent) this.scene.remove(this.group);
    for (const strand of this.strands) {
      strand.geometry.dispose();
      strand.material.dispose();
    }
  }
}

export { PrayerBeads };
