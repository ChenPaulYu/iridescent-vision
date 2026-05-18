import * as THREE from 'three';
import { getEasing } from './easing';

// Single source of truth for the iridescent palette across every
// subsystem. See docs/plan/sync-contract.md §1.
//
// Subsystems implementing `setPalette({ base, tip, glow, gold })` register
// themselves; coordinator pushes the current palette to every registered
// subsystem on each setPalette or tween tick.

class PaletteCoordinator {
  constructor(initial = {}) {
    this.base = new THREE.Color(initial.base || 0x11081a);
    this.tip = new THREE.Color(initial.tip || 0x6044ff);
    this.glow = new THREE.Color(initial.glow || 0xd5b4ff);
    this.gold = new THREE.Color(initial.gold || 0xffd95c);
    this.subsystems = [];
  }

  register(subsystem) {
    if (!subsystem || typeof subsystem.setPalette !== 'function') return;
    this.subsystems.push(subsystem);
    subsystem.setPalette(this.snapshot());
  }

  snapshot() {
    return {
      base: this.base.clone(),
      tip: this.tip.clone(),
      glow: this.glow.clone(),
      gold: this.gold.clone(),
    };
  }

  setPalette(palette) {
    if (!palette) return;
    if (palette.base !== undefined) this.base.set(palette.base);
    if (palette.tip !== undefined) this.tip.set(palette.tip);
    if (palette.glow !== undefined) this.glow.set(palette.glow);
    if (palette.gold !== undefined) this.gold.set(palette.gold);
    this.broadcast();
  }

  broadcast() {
    const snap = this.snapshot();
    for (const sub of this.subsystems) {
      try {
        sub.setPalette(snap);
      } catch (e) {
        // Subsystem failure shouldn't break the coordinator
      }
    }
  }

  tweenPalette(palette, durationMs = 1500, easingName = 'easeInOutCubic') {
    if (!palette) return;
    const ease = getEasing(easingName);
    const from = this.snapshot();
    const to = {
      base: palette.base !== undefined ? new THREE.Color(palette.base) : from.base,
      tip: palette.tip !== undefined ? new THREE.Color(palette.tip) : from.tip,
      glow: palette.glow !== undefined ? new THREE.Color(palette.glow) : from.glow,
      gold: palette.gold !== undefined ? new THREE.Color(palette.gold) : from.gold,
    };
    const startTime = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / durationMs, 1);
      const eased = ease(t);
      this.base.copy(from.base).lerp(to.base, eased);
      this.tip.copy(from.tip).lerp(to.tip, eased);
      this.glow.copy(from.glow).lerp(to.glow, eased);
      this.gold.copy(from.gold).lerp(to.gold, eased);
      this.broadcast();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export { PaletteCoordinator };
