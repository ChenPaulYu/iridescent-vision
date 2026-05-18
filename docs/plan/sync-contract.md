# Plan: Dome / Mask Synchronization Contract

Three technical contracts that keep [`cosmic-dome.md`](./cosmic-dome.md) and [`mask-evolution.md`](./mask-evolution.md) breathing as one ritual. Either system can ship before the other, but **whichever lands first must honor these contracts**, or the second one will arrive misaligned and require rework.

## Why This Document Exists

The dome and the mask are designed as **two characters in one dance**. Several moments in the experience read powerfully only because both characters move at the same instant, in the same direction, using the same vocabulary. If either character drifts (a different easing curve, a different gold color, a different particle pool), the moment collapses into "two things happening to be near each other."

This document defines what must be shared, not what must be identical. The dome and mask have their own behaviors; the contracts below are the *interfaces* that let them act as one.

## Contract 1 — Shared Palette Uniforms

**Rule:** All shared visual properties pull from a single source of truth.

| Property | Source | Used by |
|---|---|---|
| Iridescent base color | `paletteUniforms.uBaseColor` | Dome sky shader, fiber background, mask material |
| Iridescent tip color | `paletteUniforms.uTipColor` | Dome accents, fiber tips, mask rim |
| Iridescent glow color | `paletteUniforms.uGlowColor` | Dome highlights, sparkle color, mask rim glow |
| **Gold accent color** | `paletteUniforms.uOrnamentColor` | Dome line work (astrolabe, Sri Yantra, mantra), mask ornament |

The new `uOrnamentColor` uniform — pure gold `#d4a017` with iridescent hue-shift — is the most important addition. Both systems must read from it so a single edit (for example, shifting to warmer gold in Reflection) cascades through every gold line in the experience at once.

**Implementation:** centralize palette uniforms on a single `PaletteCoordinator` (or extend the existing `setBackgroundPalette` / `tweenBackgroundPalette` helpers in `app.js`). Both `CosmicDome` and the mask material's `onBeforeCompile` injection share these uniform references rather than allocating their own.

## Contract 2 — Shared Easing Curves

**Rule:** Synchronized moments use the same easing function, sourced from a shared registry.

The dome and mask have four synchronized moments that depend on motion-curve alignment:

| Moment | Duration | Curve name |
|---|---|---|
| Warm-up reveal (Flash buildup) | 2000ms | `easeInOutCubic` |
| Speedup spike (Ascension climax) | 1500ms (rise) + 500ms (snap-back) | `spikeAndReturn` |
| Twin Opening (testTransparent → Orbit) | 1500ms | `easeOutQuart` |
| Decomposition (Reflection) | 8000ms | `easeOutExpo` |

**Implementation:** a small `src/core/easing.js` module that both systems import. The existing `tweenBackgroundPalette` already has an inline ease — refactor it to consume from this registry as well, so palette tweens, dome layer tweens, and mask ornament tweens all share curves.

Without this contract, the same-named "1.5 second tween" in two systems will use slightly different curves and the moment will feel like two events instead of one.

## Contract 3 — Shared Particle Pool

**Rule:** Particles that semantically belong to a single material (cosmic dust, gold) live in one system, regardless of where they spawn.

The dome's Layer 1 dust and the mask's Reflection gold flakes are *the same matter at different phases of the cycle*. Implementing them as two independent particle systems breaks the strongest narrative payload — the audience must be able to read "the gold falling off the goddess becomes the dust drifting through the cosmos" without being told.

**Implementation:** `CosmicDome` exposes a public emission API:

```js
dome.spawnDust({
  position: Vector3,    // world-space origin
  velocity: Vector3,    // initial velocity
  count: number,        // particles to emit
  tint: Color,          // particle color (gold for mask-source, default-base for dome-source)
  lifetime: number,     // optional; defaults to dust system value
});
```

The mask's `GoldFlakes` system calls `dome.spawnDust({...})` instead of allocating its own particle pool. After spawning, particles are governed entirely by the dome's flow field — same drift, same fade, same upper limit on active count.

In Awakening (cycle restart), the dust is dome-tinted by default. The audience reading: "this dust used to be the goddess's gold; she is becoming visible again from her own residue."

## Twin Moments — What These Contracts Protect

These are the moments that *only work* if all three contracts hold:

### Twin Reveal (Flash, Tone time 29.5)
Dome Layer 2 exposes the star map at the same instant the mask kindles its ornament. Requires Contract 2 (same buildup curve) and Contract 1 (same gold for both).

### Twin Spike (Speedup peak, Tone time 64–65.5)
Dome's astrolabe acceleration and mask's ornament pulse rise and snap back together. Requires Contract 2 (`spikeAndReturn` curve shared).

### Twin Opening (Sri Yantra + Third Eye, Tone time 65.5)
**The single most important moment of the experience.** Dome's Sri Yantra blooms outward from the dome center while the mask's third eye opens. If the third eye uses the miniature Sri Yantra design ([`mask-evolution.md`](./mask-evolution.md) §Open Questions #3 option b), the mask's forehead is *literally a microcosm of the dome's center*. Requires Contract 2 (same curve), Contract 1 (same gold), and a coordinated trigger from `app.js:gravity2Glass`.

### Twin Reset (Reflection close → Cycle restart)
Mask's gold flakes off and enters dome's dust system; dome's mantra decomposes into dust at the same rate. Audience reads cycle closure as material continuity. Requires all three contracts — especially Contract 3.

## Validation Checklist

Before merging dome or mask work, verify:

- [ ] All shared colors pull from `paletteUniforms` — search for any local `new THREE.Color()` instantiations that should reference the shared uniforms instead.
- [ ] All synchronized tween calls reference curves from `src/core/easing.js` — no inline `t => t * t` shortcuts in synchronized paths.
- [ ] Mask `GoldFlakes` does not allocate its own `BufferGeometry` for particles — it calls `dome.spawnDust(...)`.
- [ ] All cue times are scheduled via `SoundHandler.schedule` or `scheduleToneTime` — no `setTimeout` for narrative timing.
- [ ] Twin moments fire from a single call site that triggers both systems, not two parallel schedules that "should" line up.

## Open Threads

- Contract 1 needs a small refactor of `app.js`'s palette handling — `tweenBackgroundPalette` currently writes directly to `FiberForestBackground` uniforms. Generalizing it to a `PaletteCoordinator` is the right shape for adding the dome.
- Contract 2's `spikeAndReturn` is unusual (most easing libraries don't include it). Implement as two phases: a fast `easeOutQuart` rise to 1.0, then `easeInQuart` return to baseline. Document the two-phase composition in the easing module.
- Contract 3 raises a performance question: how many particles can the dome's dust system hold? If mask Reflection emissions exceed the cap, oldest dust must retire — the mask's contribution must not crowd out the dome's baseline drift.
