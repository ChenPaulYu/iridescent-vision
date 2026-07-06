# Iridescent Vision – Narrative Sketch

> See [`style-anchor.md`](./style-anchor.md) for the discipline (tone, palette, pacing) that governs *how* these beats should feel.
> This document describes *what happens* in each beat and how it is implemented.

## Core Narrative Beats

### 1. Awakening (Primal)

- **Environment:** Dim fiber forest, fibers gently pulsing like roots and nerves; the camera looks into a cylindrical tunnel.
- **Goddess state:** Mask (`mask3.gltf`) appears in front of a darker carved face (`Taj.gltf`). Material is `MeshPhysicalMaterial` with the soft iridescent rim injection from `app.js:applyMaskMaterial` — anchored and translucent.
- **Interaction:** `SoftVolume` lets the viewer pull / deform the mask. `MouseLight` follows the cursor and lights the mask with a moving spot. **This is the only beat with full embodied interaction** — the viewer's hand is the goddess's body.
- **Palette:** `awakening` (dim purple, lavender glow).
- **Timing:** Begins at Transport start via the first scheduled callback in `initSound()`.

### 2. Ascension (Agrarian → Industrial)

- **Environment:** Fibers stop pulsing and start **streaming upward.** The tunnel UV scrolls; sparkles drift up past the camera. The forest stays populated throughout — `driftFactor` keeps baseline slow and lets the climax burst (`FiberForestBackground.update`).
- **Goddess state:** `SoftVolume` is disposed (mask becomes firm); gravity balls begin orbiting and colliding with the mask — energy released by tool-making.
- **Transition in (~`t=27.5` → `t=29.5`):** Two-second pre-warmup — palette tweens to `transition`, a radial buildup glow grows from screen center. Then a **single cinematic flash** at `t=29.5` (no stroboscope) reveals the new state.
- **Climax (`t≈64` → `t≈65.5`):** `background.speedup` flips on; `speedupAmount` ramps quickly toward its cap, vertical scroll accelerates aggressively, and the mask + face physically lift as if being pulled up (`app.js:updateScene`).
- **Palette progression:** `awakening` → `transition` → (later) `ascension`.

### 3. Orbit (Post-Tech)

- **Environment:** Background fades (`testTransparent`), revealing a refractive cube-camera environment. Sparkles and tunnel are gone; the goddess floats in luminous void.
- **Goddess state:** Mask material becomes `MeshPhongMaterial` with `CubeRefractionMapping` (glass skin) — the goddess is no longer flesh. `HeadMove` enters `shake`, `flake`, `up`, `rotate` modes — the head travels along splines.
- **Interaction:** None. The viewer becomes a witness.
- **Palette:** `orbit` (cyan / pale-aqua glow).

### 4. Reflection (Cyclical Future)

- **Environment:** Scene desaturates toward deep purples. `HeadMove` runs a final `flake` / `up` sequence. The texture loaded for `scene.background` is a soft gradient dome (`gradient.jpeg`).
- **Goddess state:** Mask appears to fragment / dissolve into the dome. The cycle prepares to reset.
- **Transition out:** `Activity` opens — a cube-skybox of `poster.jpg` and a clickable portrait sphere (`sonia.jpg`). The portrait links the experience back to the human author behind the goddess — the final return to the embodied world.
- **Palette:** `reflection` (deep purple, soft lavender glow).

## Visual Motifs

- **Goddess head.** Constant anchor. The mask material progression (rim-lit → soft gel → refractive glass → fragmenting) **is** the narrative spine.
- **Fiber tunnel.** Multi-readable across beats: roots / nerves in Awakening, light columns in Ascension, gone by Orbit (transcendence beyond structure).
- **Vertical motion.** Encoded as `direction = 'up'` on the background. Baseline drift is gentle; speedup creates the climax. See `FiberForestBackground.update` for the throttle math.
- **Flashes.** Reserved for narrative punctuation — anticipated, single-burst, slow-fade. See style-anchor §3.

## Interaction Hooks

- `CLICK` button initiates the timeline, fades in the canvas, and starts `Tone.Transport`.
- `SoftVolume` + `MouseLight` are active **only in Awakening** — the viewer's input matters most when the goddess is most embodied.
- Keyboard shortcuts (`A`–`U`) remain as debug entry points to each mode but are not part of the narrative.
- The final `Activity` portrait sphere is the only deliberate UI moment after the start button.

## Audio Coordination

- All beats are driven by `SoundHandler.schedule` and `scheduleToneTime` against `Tone.Transport`.
- New visual cues should be scheduled against the soundtrack, never against wall-clock — soundtrack drift will desync wall-clock cues within minutes.
- Sound effects (`mask_pull`, `mask_release`, `ball_collide`, `ball_roll`, `light1`–`3`) are diegetic — they ground each interaction in physical presence.

## What's Done

### Fiber forest (feature/shadertoy-fiber)

- Pre-warmup palette tween + cinematic flash for the soft → gravity transition (`app.js:soft2Gravity`).
- Ramped speedup with accelerating vertical scroll and synchronized mask / face lift during Ascension climax.
- Throttled baseline vertical drift so the fiber forest doesn't empty during the long Ascension window.
- Shared `uVerticalScroll` uniform across fibers, tunnel, and sparkles so the whole background rises together.

### Cosmic dome (feature/cosmic-dome — `CosmicDome.js`)

All seven layers per `plan/cosmic-dome.md`:

- **Layer 1 — Dust breath** — 2200 additive shell particles, slow noise drift, intensity ramped 0.08 (Awakening) → 1.0 (Orbit, at `gravity2Glass`). Burst pool (600 slots) reserved for shared particle ingestion.
- **Layer 2 — Star map reveal** — astrolabe outer rings appear during the 2-second warm-up; flash exposes them against the warmed palette.
- **Layer 3 — Persian astrolabe** — four concentric golden rings with tick highlights, alternating rotation rates. `pulseAstrolabe` accelerates briefly during the speedup spike.
- **Layer 4 — Sri Yantra bloom** — procedural eight-triangle yantra + bindu, blooms from center over 1500ms at `gravity2Glass`. Refracted through `GlassSkin` — the mask becomes a window onto sacred geometry.
- **Layer 5 — Mantra drift** — domain-warped fbm renders flowing stroke-like patterns in the mid-distance. Fades in during Orbit, supporting role only.
- **Layer 6 — HeadMove resonance** — `dome.resonateWith(mode)` applies per-mode group transforms: shake oscillates sin on z+x, rotate spins z opposite the goddess, flake adds damped slow shake. Wired via `setHeadmoveMode` helper.
- **Layer 7 — Decomposition** — `dome.decompose(durationMs)` staggers mantra/yantra/astrolabe fade-out with dust falling to a mid-level ambient. Triggered at `afterFlake`. Dome returns to Awakening's initial state — cycle closes.

### Mask system (`app.js:applyMaskMaterial` + `app.js:attachOrnamentShell`)

- **Ornament shader** — Separate inflated-shell mesh parented to the mask geometry so the ornament survives every `mesh.material` swap (SoftVolume / Gravity / GlassSkin). Procedural mehndi + girih + third-eye patterns driven by normal-derived 2D coords, with reveal / pulse / flow / flake / iridescent uniforms.
- **Per-beat tweens** — Reveal kindles at warm-up, pulses at speedup, flows + third-eye opens at Orbit (Twin Opening), flakes off during Reflection (Twin Reset).

### Tertiary systems

- **PrayerBeads** (`PrayerBeads.js`) — three tilted elliptical orbits of 12 luminous beads each, follow the mask, react to HeadMove via shared `setHeadmoveMode`.
- **GoldFlakes** (in `app.js:updateScene`) — during Reflection, periodic emissions call `cosmicDome.spawnDust({tint: gold, ...})` so the gold flaking off the mask enters the dome's particle pool — the gold becomes the dust the cycle will be reborn from.

### Sync contracts (`plan/sync-contract.md`)

- **§1 Shared palette** — `PaletteCoordinator` (`core/PaletteCoordinator.js`) owns canonical base/tip/glow/gold THREE.Color instances; fiber background, dome, prayer beads, mask material rim, and mask ornament all register as subsystems and receive every palette update.
- **§2 Shared easing** — `core/easing.js` exports `easeInOutCubic`, `easeOutQuart`, `easeOutExpo`, `spikeAndReturn`. Palette tween and ornament tween accept named curves; the four Twin Moments use the documented profiles.
- **§3 Shared particle pool** — `cosmicDome.spawnDust({position, velocity, count, tint, lifetime, scale})` writes into the 600-slot burst sub-system. The GoldFlakes emitter is the first real caller; mask-source and dome-source dust share one rendering pipeline.

### The thread of civilization (concept, decided 2026-07-06)

The fiber is **one thread reworked by each era's faith**: roots/womb
(Awakening — the goddess is born from the world-tree's vesica, a few
umbilical strands attaching behind her rim) → spun lines streaming
upward (Ascension — the loom age) → woven geometry (Orbit — yantra and
astrolabe are the finished weave) → unraveled back to dust (Reflection).
One space transforming, never a cut. Composition rules learned the hard
way: the womb opening stays wider than the mask silhouette, and every
strand's z stays behind her plane (depth-test terminates the cords at
her silhouette, so they can never cross the face).

### Visual quality pass (feature/visual-quality-pass)

- **Post pipeline** (`core/PostPipeline.js`) — retina pixel ratio, half-res
  UnrealBloom (threshold 0.72 so additive stacks don't snowball), grade
  pass: ACES + shadow-deepening S-curve + animated luminance-weighted
  film grain + vignette + subtle chromatic aberration. The analog-grain
  baseline from style-anchor's MV reference frames lives here.
- **EnvironmentDome** (`EnvironmentDome.js`) — generated dome texture
  sampled as luminance, recolored live by PaletteCoordinator; enters at
  gravity2Glass (0.62), peaks at finalHeadUp (0.78), off at Activity.
  Replaces the flat clear color and the off-palette gradient.jpeg.
  GlassSkin refracts it (cube camera far plane 900, MixOperation).
- **Mask material relay** (important architecture fact): SoftVolume,
  Gravity and GlassSkin each swap `mesh.material` for their beat —
  anything set on the base material only shows in the gaps. Current
  relay: SoftVolume crack-net re-tinted to plum/lavender (Awakening) →
  Gravity swaps in the dedicated liquid-chrome matcap ShaderMaterial
  from `app.js:buildChromeMatcapMaterial` (Ascension) → GlassSkin cube
  refraction (Orbit). Tri-planar surface height map breaks speculars in
  both matcap paths. The rubber matcap (Asset 2A) lives on the resting
  base material only — currently no beat exposes it.
- **Generated textures** (`src/textures/generated/`, briefs + accepted
  candidates in `docs/asset-brief.md` / `docs/reference/`) — dome, two
  matcaps, height map, particle sprite (dust/burst/sparkles), silk veil
  (tunnel layer).

## Open Threads

- Final visual verification (full timeline through agent-browser) deferred this session — the daemon kept wedging mid-sequence. Most layers verified individually; final end-to-end pass still pending.
- Authored ornament texture (`mask-evolution.md` open question #1) — current procedural placeholder unblocks integration but cultural fidelity will improve with a hand-painted multi-channel texture.
- Closing motif at the end of `Activity` that visually echoes Awakening — the cycle currently relies on the dome's Layer 7 decomposition for closure; an Activity-stage callback could complete the rhyme.
- Keyboard shortcuts and the (currently unused) `dat.gui` scaffolding in `SoftVolume.setGUI` are vestigial; expose as a deliberate debug panel or strip from production builds.
- `GlassSkin.dispose()` references an undefined `CubeCamera` (`GlassSkin.js:75`) — latent bug, only matters if anyone calls `dispose` on the glass mode.
