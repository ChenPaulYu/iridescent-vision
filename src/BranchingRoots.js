import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

function mix(a, b, t) { return a + (b - a) * t; }

class BranchingRoots {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = Object.assign(
      {
        mainRootCount: 70,
        subBranchProbability: 0.65,
        secondaryProbability: 0.35,
        length: 95,
        width: 38,
        depthRange: 28,
        pointsPerCurve: 32,
        baseColor: 0x4434a8,
        tipColor: 0xb057e0,
        glowColor: 0xe0c0ff,
      },
      options
    );

    this.enabled = false;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.intensityRate = 0;
    this.time = 0;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.renderOrder = -19;

    this.baseColor = new THREE.Color(this.options.baseColor);
    this.tipColor = new THREE.Color(this.options.tipColor);
    this.glowColor = new THREE.Color(this.options.glowColor);

    this.buildRoots();
  }

  buildRoots() {
    const positions = [];
    const colors = [];

    for (let r = 0; r < this.options.mainRootCount; r++) {
      this.addRoot(positions, colors);
    }

    const geom = new LineSegmentsGeometry();
    geom.setPositions(positions);
    geom.setColors(colors);

    const mat = new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      linewidth: 0.0035,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    this.lines = new LineSegments2(geom, mat);
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
  }

  onWindowResize(width, height) {
    if (this.lines && this.lines.material) {
      this.lines.material.resolution.set(width, height);
    }
  }

  cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    return new THREE.Vector3(
      uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
      uu * u * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + tt * t * p3.z
    );
  }

  quadraticBezier(p0, p1, p2, t) {
    const u = 1 - t;
    return new THREE.Vector3(
      u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
    );
  }

  colorAtT(t) {
    const c = new THREE.Color();
    if (t < 0.45) {
      c.copy(this.glowColor).lerp(this.tipColor, t / 0.45);
    } else {
      c.copy(this.tipColor).lerp(this.baseColor, (t - 0.45) / 0.55);
    }
    return c;
  }

  pushSegments(positions, colors, points, tStart, tEnd) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const f = i / (points.length - 1);
      const fNext = (i + 1) / (points.length - 1);
      const t1 = mix(tStart, tEnd, f);
      const t2 = mix(tStart, tEnd, fNext);
      const c1 = this.colorAtT(t1);
      const c2 = this.colorAtT(t2);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
    }
  }

  addRoot(positions, colors) {
    const opts = this.options;
    const pts = opts.pointsPerCurve;

    // Source: small cluster at top, scattered in xz
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = Math.random() * 6 + Math.random() * 4;
    const start = new THREE.Vector3(
      Math.cos(startAngle) * startRadius,
      opts.length * 0.45 + Math.random() * 4 - 2,
      Math.sin(startAngle) * startRadius - 4
    );

    // Endpoint: wide spread outward and down
    const endAngle = startAngle + (Math.random() - 0.5) * 1.8;
    const endRadius = opts.width * (0.45 + Math.random() * 0.85);
    const end = new THREE.Vector3(
      Math.cos(endAngle) * endRadius,
      -opts.length * 0.42 + Math.random() * 8,
      Math.sin(endAngle) * endRadius + (Math.random() - 0.5) * opts.depthRange
    );

    // Bezier controls bend the path outward in 3D
    const ctrlAngle1 = startAngle + (Math.random() - 0.5) * 0.7;
    const ctrlRadius1 = endRadius * (0.55 + Math.random() * 0.3) + 5;
    const ctrl1 = new THREE.Vector3(
      Math.cos(ctrlAngle1) * ctrlRadius1,
      mix(start.y, end.y, 0.25),
      Math.sin(ctrlAngle1) * ctrlRadius1
    );
    const ctrlAngle2 = endAngle + (Math.random() - 0.5) * 0.5;
    const ctrlRadius2 = endRadius * (0.8 + Math.random() * 0.3);
    const ctrl2 = new THREE.Vector3(
      Math.cos(ctrlAngle2) * ctrlRadius2,
      mix(start.y, end.y, 0.75),
      Math.sin(ctrlAngle2) * ctrlRadius2
    );

    const main = [];
    for (let i = 0; i < pts; i++) {
      const t = i / (pts - 1);
      main.push(this.cubicBezier(start, ctrl1, ctrl2, end, t));
    }
    this.pushSegments(positions, colors, main, 0, 1);

    // Primary sub-branch
    if (Math.random() < opts.subBranchProbability) {
      const forkAtT = 0.25 + Math.random() * 0.4;
      const forkIdx = Math.max(1, Math.floor(forkAtT * (pts - 1)));
      const forkPoint = main[forkIdx];
      const sub = this.makeBranch(forkPoint, end, 16, 0.6);
      this.pushSegments(positions, colors, sub, forkAtT, 1);

      // Secondary sub-branch from the sub-branch itself
      if (Math.random() < opts.secondaryProbability) {
        const subForkIdx = Math.max(1, Math.floor((0.4 + Math.random() * 0.3) * (sub.length - 1)));
        const subForkPt = sub[subForkIdx];
        const subEnd = new THREE.Vector3(
          subForkPt.x + (Math.random() - 0.5) * opts.width * 0.4,
          subForkPt.y - 6 - Math.random() * 10,
          subForkPt.z + (Math.random() - 0.5) * opts.width * 0.4
        );
        const twig = this.makeBranch(subForkPt, subEnd, 12, 0.4);
        this.pushSegments(positions, colors, twig, 0.6, 1);
      }
    }
  }

  makeBranch(from, towardEnd, points, divergence) {
    // Quadratic curve from `from` toward a randomly biased point near `towardEnd`.
    const biasDir = new THREE.Vector3().subVectors(towardEnd, from).multiplyScalar(divergence);
    const biased = new THREE.Vector3(
      from.x + biasDir.x + (Math.random() - 0.5) * 14,
      from.y + biasDir.y * 1.2 - Math.random() * 6,
      from.z + biasDir.z + (Math.random() - 0.5) * 14
    );
    const ctrl = new THREE.Vector3(
      (from.x + biased.x) * 0.5 + (Math.random() - 0.5) * 8,
      (from.y + biased.y) * 0.5,
      (from.z + biased.z) * 0.5 + (Math.random() - 0.5) * 8
    );
    const result = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      result.push(this.quadraticBezier(from, ctrl, biased, t));
    }
    return result;
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
      this.lines.material.opacity = clamped;
      this.intensityRate = 0;
    } else {
      this.intensityRate = Math.abs(clamped - this.intensity) / (durationMs / 1000);
    }
  }

  setPalette({ base, tip, glow } = {}) {
    // Palette is captured at build time; runtime recolour skipped to keep
    // LineSegments2 internal buffer layout (instanceColorStart/End) opaque.
    // If you want live recolour, rebuild geometry instead.
    if (base !== undefined) this.baseColor = base.isColor ? base.clone() : new THREE.Color(base);
    if (tip !== undefined) this.tipColor = tip.isColor ? tip.clone() : new THREE.Color(tip);
    if (glow !== undefined) this.glowColor = glow.isColor ? glow.clone() : new THREE.Color(glow);
  }

  update(delta) {
    if (!this.enabled) return;
    this.time += delta;
    if (this.intensityRate > 0) {
      const step = delta * this.intensityRate;
      if (this.intensity < this.targetIntensity) {
        this.intensity = Math.min(this.intensity + step, this.targetIntensity);
      } else {
        this.intensity = Math.max(this.intensity - step, this.targetIntensity);
      }
      this.lines.material.opacity = this.intensity;
      if (this.intensity === this.targetIntensity) this.intensityRate = 0;
    }
  }

  dispose() {
    if (this.group.parent) this.scene.remove(this.group);
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}

export { BranchingRoots };
