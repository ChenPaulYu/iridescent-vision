// Shared easing curves so synchronised moments across CosmicDome, mask
// ornament, palette tweens, and prayer beads all share the same motion
// signature. See docs/plan/sync-contract.md §2.

const easeInOutCubic = (t) => {
  if (t < 0.5) return 4 * t * t * t;
  const k = -2 * t + 2;
  return 1 - (k * k * k) / 2;
};

const easeOutQuart = (t) => {
  const k = 1 - t;
  return 1 - k * k * k * k;
};

const easeOutExpo = (t) => {
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t);
};

const linear = (t) => t;

// Two-phase spike: ease-out rise to 1.0 in the first `rise` fraction of
// the duration, then ease-in fall back to 0.0 for the remainder. Used
// by the Twin Spike contract (speedupBg) so dome astrolabe and mask
// ornament pulse share an identical rise + snap-back profile.
const spikeAndReturn = (t, rise = 0.45) => {
  if (t <= rise) {
    const u = t / rise;
    return 1 - Math.pow(1 - u, 4);
  }
  const v = (t - rise) / (1 - rise);
  return 1 - Math.pow(v, 4);
};

const EASING = {
  linear,
  easeInOutCubic,
  easeOutQuart,
  easeOutExpo,
  spikeAndReturn,
};

function getEasing(name) {
  return EASING[name] || easeInOutCubic;
}

export { EASING, getEasing, easeInOutCubic, easeOutQuart, easeOutExpo, linear, spikeAndReturn };
