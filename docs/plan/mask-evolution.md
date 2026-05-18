# Plan: Mask Evolution

How the goddess mask transforms visually across the four narrative beats, in coordination with [`cosmic-dome.md`](./cosmic-dome.md). The mask is not a prop — she is the ritual's protagonist, and her ornament progression is her arc of consciousness made visible.

> Pair with [`sync-contract.md`](./sync-contract.md) for the technical contracts that keep this plan in lockstep with the dome.

## Core Principle

The mask's ornament state is **the goddess's spiritual condition externalized**. She begins bare and primal, receives knowledge (gold lines kindle), transcends into pure consciousness (lines flow like liquid, third eye opens), then decomposes back to bare as the cycle closes.

Critically: **Awakening's mask state and the end of Reflection's mask state are identical.** This is the visual proof of "spiral, not line" — every viewing closes on the same image it opened with, but heavier with meaning.

## Per-Beat Visual State

| Beat | Mask Appearance |
|---|---|
| **Awakening** | Bare and primal. Remove `sheen` and `clearcoat` from the current `MeshPhysicalMaterial` so the surface reads like wet clay or polished stone rather than plastic. Forehead and cheek areas carry **a very faint ornament trace (~5% intensity)** — "she has always been here, the marks were always there." |
| **Ascension warm-up → Flash** | The cinematic flash **kindles the ornament.** Gold mehndi vines and girih geometry begin at the forehead and spread outward across the mask over ~0.8 seconds, fully revealed by the moment the flash fades. Synchronized with the dome's Layer 2 star map reveal — *the goddess receives knowledge as the cosmos becomes legible to her.* |
| **Ascension main → Speedup** | Ornament breathes. Gold lines slowly brighten and dim in time with the music. During the 1.5-second speedup spike, **the entire ornament flares to maximum brightness** in lockstep with the mask/face lift — *she is being raised, and the marks acknowledge it.* |
| **Orbit (post-glassSkin)** | Ornament **flows like liquid** across the surface — gold lines no longer fixed, drifting along a flow field. **Third eye opens at the forehead** with a 0.5-second vermillion flash (the single sanctioned saturated-color punctuation per `style-anchor.md` §3), then settles into persistent glow. With GlassSkin active, the mask refracts the dome's Sri Yantra — the ornament glows over the refraction layer, making her face look like a sacred object. |
| **Orbit middle (HeadMove)** | Tertiary elements appear: **2–3 strands of gold prayer beads orbit the mask** on tilted elliptical paths. During `shake` they sway with the motion. During `flake` **portions of the ornament begin to lift off the mask surface** and drift toward the dome — foreshadowing the decomposition to come. |
| **Reflection** | Decomposition begins. **Gold lines flake off the surface and disperse as gold particles**, one strand at a time. The third eye slowly closes. By the end of Reflection, **the mask has returned to its Awakening state** — bare, with only the faintest residual trace. |
| **Activity** | Mask exits the stage; portrait sphere takes over. |

## Technical Approach: Texture + Shader Hybrid

Pure texture (paint patterns into an image) gives strong cultural specificity but cannot animate "lines flowing" or "lines flaking off." Pure procedural shader (mathematically generated patterns) animates freely but always looks generic — Persian girih and mehndi cannot be convincingly derived from `sin`/`cos`/`fbm`.

**Hybrid:** authored texture freezes the *shape* of the ornament; shader controls *how it is displayed* over time.

### Ornament Texture Specification

One 2048×2048 RGBA texture, UV-mapped to the mask geometry, with **multi-channel separation**:

- **R channel** — mehndi-style organic vine work (covering most of the mask surface)
- **G channel** — girih geometric work (forehead center, symmetric cheek panels)
- **B channel** — third-eye / center insignia (forehead focal region only)
- **A channel** — line-width / intensity mask (where lines exist and how thick)

A single texture carries every ornament variant; the shader chooses what to reveal.

### Shader Uniforms

Inject into `applyMaskMaterial` via `onBeforeCompile` (same point that already injects the rim shader, so the material progression — soft gel → rim → glass — stays intact).

```glsl
uniform sampler2D uOrnamentMap;
uniform float uOrnamentReveal;     // 0 = hidden, 1 = fully revealed (R + G channels)
uniform float uThirdEyeReveal;     // 0 = closed, 1 = open (B channel only)
uniform float uOrnamentPulse;      // 0 = steady, 1 = full breathing amplitude
uniform float uOrnamentFlow;       // 0 = static, 1 = full liquid flow (Orbit)
uniform float uOrnamentFlake;      // 0 = intact, 1 = fully dispersed (Reflection)
uniform float uIridescentShift;    // 0 = flat gold, 1 = full rainbow hue-shift
uniform vec3  uOrnamentColor;      // primary gold, sourced from shared palette
uniform float uTime;
```

### Per-Beat Uniform Schedule

```js
// Awakening (Tone time 0)
maskOrnament.set({ reveal: 0.05, pulse: 0, flow: 0, flake: 0, thirdEye: 0 });

// Warm-up (Tone time 27.5, 2 seconds, paired with dome's Layer 2 reveal)
tween(maskOrnament, { reveal: 1.0 }, 2000);

// Speedup spike (Tone time 64, 1.5 seconds, paired with dome's Layer 3 acceleration)
tween(maskOrnament, { pulse: 1.0, iridescentShift: 0.3 }, 500, 'spike-curve');

// Orbit transition (Tone time 65.5, 1.5 seconds, paired with dome's Layer 4 bloom)
tween(maskOrnament, { flow: 1.0, thirdEye: 1.0, iridescentShift: 1.0 }, 1500);

// Reflection decomposition (Tone time ~183.5, 8 seconds, paired with dome's Layer 7)
tween(maskOrnament, { flake: 1.0, thirdEye: 0, reveal: 0 }, 8000);
```

All timing is driven by `SoundHandler.schedule` against `Tone.Transport`, never wall-clock.

## Tertiary Elements

Two systems live alongside the mask:

### Prayer Beads (`PrayerBeads`)

- `THREE.InstancedMesh` of ~12 small luminous gold spheres per strand
- 2–3 strands, each on a tilted elliptical orbit around the mask
- Activated when the dome's Layer 4 fires (testTransparent → Orbit)
- Receives `HeadMove` mode as input: `shake` perturbs orbits with low-frequency oscillation; `rotate` slows them as if settling while the universe spins around
- Strands fade out during Reflection in parallel with the mask's ornament flake

### Gold Flakes (`GoldFlakes`)

- `THREE.Points` particle system, emission points pinned to the mask surface
- Emit rate proportional to `uOrnamentFlake`
- After spawning, particles **enter the dome's Layer 1 dust flow field** (see [`sync-contract.md`](./sync-contract.md) §3) — they do not exist as a separate system
- The mask's gold becomes the cosmos's dust; the cosmos's dust becomes the next cycle's seed

## Open Questions

1. **Where does the ornament texture come from?**
   - (a) Hand-authored by you or a designer — best cultural fidelity, slowest path
   - (b) Generated via Midjourney / Stable Diffusion against curated reference prompts, then validated by you — fast, risks style drift
   - (c) Procedural shader placeholder first, swap in authored texture later — unblocks implementation immediately
2. **Ornament density** — sparse (forehead + cheek only, zen restraint), medium (vines extend to chin, mehndi register), or full (entire face covered, thangka / Persian miniature register)?
3. **Third-eye symbol** — plain circular eye, miniature Sri Yantra (visual rhyme with dome Layer 4), or single abstract calligraphic stroke?

Default recommendation: **1(c) → 2(b) → 3(b)**. Unblocks work immediately; mehndi vine density gives visual richness without overwhelming; miniature Sri Yantra creates the literal "her third eye is the center of the cosmos" reading.

## Implementation Order

1. Inject ornament shader into `applyMaskMaterial`, parameterized but with placeholder procedural texture (option 1c). Verify the reveal / pulse / flow / flake / third-eye uniforms all drive correctly.
2. Wire per-beat uniform tweens into `app.js`'s existing schedule, aligned with the cosmic dome plan.
3. Add `PrayerBeads` system. Couple to `HeadMove` mode changes.
4. Add `GoldFlakes` system. Route emissions into the dome's dust system per the sync contract.
5. Swap placeholder texture for authored ornament texture once available.
6. Tune per-beat uniform values against the final soundtrack.
