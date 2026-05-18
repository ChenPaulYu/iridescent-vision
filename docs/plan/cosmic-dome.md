# Plan: Layered Cosmic Dome

A staged background system that acts as the goddess's externalized consciousness — blooming alongside her arc, decomposing as the cycle resets.

> Companion to [`../vision.md`](../vision.md) (narrative) and [`../style-anchor.md`](../style-anchor.md) (discipline). This file plans **what to build** to fill the silent 60% of the runtime where `FiberForestBackground` is gone and the scene is reduced to a solid clear color or a static gradient image.

## Core Concept

**The dome is a narrative entity, not a background.** It grows in legibility alongside the goddess; when she dissolves and the cycle prepares to reset, the dome also decomposes.

Implications:
- Coexists with `FiberForestBackground` rather than replacing it (Awakening / Ascension show fiber forest in front, dome dimly present behind).
- Takes over visually when fiber disables (`testTransparent` → Orbit).
- Provides rich content for `GlassSkin` to refract — fixing the current problem where the glass mask refracts a flat color.
- Decomposes during Reflection so the cycle's close echoes its opening.

## Palette Discipline

The deep purple base is the iridescent signature and must be preserved across every layer. All dome additions are **overlays on the purple base**, never replacements.

- **Base**: deep purple-black (matches whichever beat's palette is active via the existing palette tween system).
- **Accent**: pure gold `#d4a017` with a subtle iridescent hue-shift (rainbow shimmer when the view angle changes). Used only for line work (astrolabe rings, Sri Yantra edges, mantra strokes).
- **Glow**: pearl-white with very faint lapis offset `#5d7eb8` — only at the edges of gold lines, never as fill.
- **Forbidden**: primary colors, saturated yellow / green, anything outside the iridescent family.
- **Single exception**: the third-eye opening moment (~0.5s during Orbit) may flash vermillion `#c8102e` — this is the one designed "rare punctuation" per [`style-anchor.md`](../style-anchor.md) §3.

## Seven Layers × Four Beats

### Layer 1 — Dust Breath
**Beat:** Awakening (0:00–0:29)

Large quantity of varied-scale particles drifting slowly in 3D. Faintest possible hint of constellation lines in the deep distance (5–10% brightness, almost subliminal). Subconscious signal: "there is more out there than you can see."

### Layer 2 — Star Map Reveals
**Beat:** Ascension warm-up → Flash (0:27.5–0:30)

During the 2-second buildup, constellation lines clarify and the first golden scale ring of the astrolabe begins to glow. The cinematic flash exposes them all at once, so the reveal happens at peak narrative intensity.

### Layer 3 — Persian Astrolabe Rotates
**Beat:** Ascension main (0:30–1:05)

Multiple concentric golden scale rings rotating at slightly different rates, with abstracted zodiac glyphs. Visible behind the fiber forest at half opacity. Thematic link: the gravity balls orbiting the mask read as **the same physics that drives the celestial machinery behind them**. When `speedup` fires (1:04), the astrolabe rings briefly accelerate then snap back — synchronized to the mask + face lift.

### Layer 4 — Sri Yantra Blooms
**Beat:** Orbit transition (1:05+, when `testTransparent` fires)

As the fiber forest disables, **the astrolabe center blossoms a nine-triangle Sri Yantra**, drawn from the center outward. Procedural shader (not a texture) so the lines can pulse and breathe. This becomes the primary content `GlassSkin` refracts — the mask transforms into a **window onto unfolding sacred geometry** rather than a hollow glass shell. 6–8 volumetric god-ray light columns slowly sweep across the dome for spatial depth.

### Layer 5 — Mantra Drift
**Beat:** Orbit main

Abstracted stroke-forms of Devanagari / Arabic / Persian script (not real readable text — just the gesture of sacred writing) slowly fade in, drift, and dissolve. Always far, blurred, supporting role only. Colors: gold lines, very faint white edge glow.

### Layer 6 — Dome Resonance with HeadMove
**Beat:** Orbit middle (shake / flake / rotate states)

All previous layers coexist. The dome reacts to the goddess's motion:
- `shake` → dome oscillates with a low-frequency sin wave (not random — deliberate, slow).
- `rotate` → dome rotates **in the opposite direction**, creating the illusion of "the goddess stands still while the cosmos turns around her."
- `flake` → Sri Yantra lines drift slightly off their anchor positions, as if about to fragment, then are pulled back.

### Layer 7 — Decomposition
**Beat:** Reflection (~3:00+, after `afterFlake`)

Mantra strokes fully dissolve into pure dust. Sri Yantra triangles slowly fragment and drift outward. Astrolabe rings fade one by one. Only Layer 1's dust breath remains — **the dome has returned to its Awakening initial state**. Then the Activity portrait sphere fades in from center, the cosmos collapsing into a single human face — the goddess returning to embodiment.

## Why This Version Best Serves the Story

1. **Two characters, one breath.** The dome and the mask are co-equal entities, not figure / ground. They grow together.
2. **Legible without being literal.** Viewers won't consciously track "ah, Layer 4 just appeared," but they will feel the steady unfolding — this is the spiral arc of [`style-anchor.md`](../style-anchor.md) §1 made visible.
3. **Solves the GlassSkin emptiness.** Sri Yantra + mantra drift behind the mask gives refraction something worth refracting.
4. **True cyclical close.** Reflection's decomposition returns to Awakening's initial state. On a second viewing, the audience realizes the opening dust *was already the dome at its quietest*.
5. **Every music cue is honored.** Each `SoundHandler.schedule` event lines up with a dome reveal (buildup → Layer 2, flash → Layer 3, speedup → Layer 3 acceleration, testTransparent → Layer 4 bloom). This is the [`style-anchor.md`](../style-anchor.md) §3 punctuation principle taken to its conclusion.

## Visual Anchors

| Layer | Reference points |
|---|---|
| 1–2 | Tarsem Singh *The Fall* opening, Hubble Deep Field, Björk *Vulnicura* visuals |
| 3 | Museum photographs of Persian astrolabes, Khwarazmi astronomy manuscripts |
| 4 | *Doctor Strange* astral plane, Tibetan thangka mandalas, Refik Anadol *Machine Hallucinations* |
| 5 | Anish Kapoor text installations, Bill Viola slow-motion video |
| 6–7 | *2001: A Space Odyssey* Stargate, Godfrey Reggio *Naqoyqatsi* |

## Architecture Sketch

A new class `CosmicDome` parallel to `FiberForestBackground`. Created in `app.js:init` and added to the scene; lives for the entire experience but with per-layer opacity / completeness driven by uniform tweens.

```
class CosmicDome {
  constructor(renderer, scene, options)
  enable() / disable()
  setPalette({ base, tip, glow })

  // Per-layer activation, animated via the existing tween helpers
  setLayerStrength(layerIndex, strength, durationMs)
  triggerSpeedup(durationMs)   // Layer 3 acceleration spike
  bloomYantra(durationMs)      // Layer 4 unfolding
  resonateWith(headMoveMode)   // Layer 6 reactions to HeadMove
  decompose(durationMs)        // Layer 7 fragmentation

  update(delta, camera)
}
```

Layers compose additively in a single shader on a large sky sphere (or two sphere shells if depth fighting becomes a problem). All layers share `uPaletteBase / uPaletteTip / uPaletteGlow` with the rest of the experience so palette tweens propagate naturally.

## Open Questions

- Is the Sri Yantra purely procedural shader math, or do we author a base SVG / mask and let shader animate around it? Procedural is more iridescent-compatible but harder to get the specific nine-triangle topology right.
- Mantra strokes: how literal? Real Devanagari risks reading as a specific religion; pure abstract strokes lose the gesture. A middle ground might be **stroke fragments cut from real calligraphy then heavily distorted**.
- Does the dome need to be visible during Awakening at all? Argument for: cyclical close needs the audience to recognize the dust later. Argument against: keeping it hidden makes the Layer 2 reveal more powerful. Probably keep Layer 1 visible from the start at very low intensity.

## Implementation Order (Recommended)

Layers should land in narrative order so each commit preserves a coherent experience:

1. **Layer 1** (dust breath) — gives the empty Orbit / Reflection segments immediate basic content.
2. **Layer 4** (Sri Yantra bloom) — the most visually transformative, fills the GlassSkin refraction.
3. **Layer 3** (Astrolabe) + **Layer 2** (reveal sequence) — adds the Ascension-stage richness.
4. **Layer 5** (Mantra drift) — adds Orbit middle texture.
5. **Layer 6** (HeadMove resonance) — couples dome to existing animation states.
6. **Layer 7** (Decomposition) — closes the cycle, can be authored last since it inverts what's been built.

Each can ship independently and the experience improves at each step.
