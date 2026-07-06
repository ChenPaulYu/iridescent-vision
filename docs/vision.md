# Iridescent Vision – Narrative Sketch

> See [`style-anchor.md`](./style-anchor.md) for the discipline (tone, palette, pacing) that governs *how* these beats should feel.
> This document describes *what happens* in each beat and how it is implemented.

## Core Narrative Beats

### 1. Awakening (Primal)

- **Environment:** Dim swirling tunnel with photographed silk-veil luminance and drifting sparkles; the camera looks into a cylindrical vortex. Calm, soft, no rigid geometry.
- **Goddess state:** Mask (`mask3.gltf`) appears in front of a darker carved face (`Taj.gltf`). Material is `MeshPhysicalMaterial` with the soft iridescent rim injection from `app.js:applyMaskMaterial` — anchored and translucent.
- **Interaction:** `SoftVolume` lets the viewer pull / deform the mask. `MouseLight` follows the cursor and lights the mask with a moving spot. **This is the only beat with full embodied interaction** — the viewer's hand is the goddess's body.
- **Palette:** `awakening` (dim purple, lavender glow).
- **Timing:** Begins at Transport start via the first scheduled callback in `initSound()`.

### 2. Ascension (Agrarian → Industrial)

- **Environment:** The *same* tunnel speeds up and brightens rather than switching motifs — UV scroll accelerates, sparkles drift upward past the camera faster, `setVeilIntensity` ramps back to full at the climax (`FiberForestBackground.update`).
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

### Tunnel + veil environment (feature/shadertoy-fiber, reworked 2026-07-06)

- Awakening/Ascension environment is a Shadertoy-style tunnel cylinder
  layered with photographed silk-drape luminance (`silk-veil.jpg`), plus
  sprite-based sparkles drifting/rising inside it (`FiberForestBackground.js`).
- Pre-warmup palette tween + cinematic flash for the soft → gravity transition (`app.js:soft2Gravity`).
- Ramped speedup with accelerating vertical scroll and synchronized mask / face lift during Ascension climax.
- Shared `uVerticalScroll` uniform across tunnel and sparkles so the whole background rises together.
- **Dropped the instanced fiber-strand curtain** (roots↔streams via
  `uMode`) that used to hang in front of/around the tunnel — it read as
  a rigid, scratchy door-frame rather than the soft mv-10 reference
  (fine, dense, depth-of-field-blurred strands). The tunnel+veil alone
  tested better in side-by-side comparison; see "environment concept"
  below for what replaces it.

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

### Environment concept (superseded 2026-07-06 — see below)

~~The fiber is one thread reworked by each era's faith: roots/womb
(Awakening) → spun lines streaming upward (Ascension) → woven geometry
(Orbit) → unraveled back to dust (Reflection).~~ Dropped after the
Awakening curtain read as a rigid door-frame rather than the intended
mv-10 softness (side-by-side mockup comparison confirmed tunnel+veil
alone, without any strand system, was the better look). Current
concept: **the same tunnel/veil space intensifies rather than swapping
motifs** — Awakening is the tunnel calm and dim (`setVeilIntensity`
breathes it in from near-dark), Ascension is the *same* tunnel sped up
and brightened (`background.speedup`, `setVeilIntensity(1.0, ...)` at
the climax) with sparkles drifting upward instead of a separate
"streaming fiber" mode. Orbit/Reflection's weave→dust arc (CosmicDome's
yantra/astrolabe → decomposition) is unaffected — it was always a
separate system from the fiber curtain, not the same threads continuing.

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
  the base material (built in `applyMaskMaterial`, rim shader only) is
  essentially never seen, restored for at most a same-tick gap between
  beats. Real material identity lives entirely in the materials each
  mode swaps to. Current relay: SoftVolume swaps in the rubber-gel
  matcap (`mesh.userData.rubberMaterial`, Asset 2A — Awakening's
  touchable body) → Gravity swaps in the magnet-field material
  (`mesh.userData.magnetMaterial`, `app.js:buildMagnetFieldMaterial` —
  Ascension: dark granular magnetite matcap (Asset 2C, `matcap-magnetite.jpg`,
  added 2026-07-06) as the body, with procedural field-line arcs
  converging at both poles of the mesh's local Y axis, brighter near the
  poles with a slow pole-to-pole pulse, plus a fresnel rim for
  silhouette/volume legibility — scene 2 is a magnet, not chrome/metal)
  → GlassSkin cube refraction (Orbit). Tri-planar surface height map
  feeds micro-relief into both the rubber matcap and the magnet matcap's
  UV offset. The chrome matcap (Asset 2B, `matcap-chrome.jpg`) is still
  unused by the app — the asset file remains in `src/textures/generated/`.
- **Generated textures** (`src/textures/generated/`, briefs + accepted
  candidates in `docs/asset-brief.md` / `docs/reference/`) — dome, two
  matcaps, height map, particle sprite (dust/burst/sparkles), silk veil
  (tunnel layer).
- **Ornament redesign** (2026-07-06): the crystal-shell ornament no
  longer floats over every beat. Awakening keeps it subtle (reveal
  fades to 0 right after the soft→gravity flash); Ascension carries its
  "energizing" beat through the magnet material's own uTime pulse
  instead of an ornament pulse; Orbit recasts the third-eye motif as
  light fracturing inside the glass itself (`GlassSkin.setFractureIntensity`,
  a voronoi facet-edge shader keyed to `uFractureScale`/`uFractureSoftness`)
  rather than an opaque shell in front of a transparent mask. Reflection's
  flake/shatter cue is unchanged.
- **Mask z-fighting fix** (2026-07-06, important root-cause fact): the
  "weird grid" seen on the mask surface — first on the ornament shell,
  then again on the new glass-fracture shader, and confirmed present on
  the rubber matcap and magnet materials too — was never a shader or
  material bug. `mask3.gltf` has two very-slightly-separated shell
  faces that z-fight under a standard non-linear depth buffer at the
  mask's actual camera distance (tens of units; `OrbitControls.minDistance`
  is 20). Proof: the crack pattern matched the mesh's own wireframe
  exactly, persisted through a flat-unlit debug override (ruling out
  lighting/envmap), and vanished completely with `depthTest` disabled.
  Fixed by enabling `logarithmicDepthBuffer: true` on the `WebGLRenderer`
  (`app.js:init`), which built-in materials (the base `MeshPhysicalMaterial`,
  `GlassSkin`'s `MeshPhongMaterial`) pick up automatically; the two
  custom `THREE.ShaderMaterial`s (`buildMatcapMaterial`,
  `buildMagnetFieldMaterial`) needed `#include <logdepthbuf_vertex>` /
  `<logdepthbuf_fragment>` added by hand since three.js only auto-injects
  the chunk *declarations*, not the compute lines, into raw shader
  bodies. Any future custom `ShaderMaterial` added to the mask must
  include the same chunks or this artifact will reappear.

## Open Threads

- Final visual verification (full timeline through agent-browser) deferred this session — the daemon kept wedging mid-sequence. Most layers verified individually; final end-to-end pass still pending.
- Authored ornament texture (`mask-evolution.md` open question #1) — current procedural placeholder unblocks integration but cultural fidelity will improve with a hand-painted multi-channel texture.
- Closing motif at the end of `Activity` that visually echoes Awakening — the cycle currently relies on the dome's Layer 7 decomposition for closure; an Activity-stage callback could complete the rhyme.
- Keyboard shortcuts and the (currently unused) `dat.gui` scaffolding in `SoftVolume.setGUI` are vestigial; expose as a deliberate debug panel or strip from production builds.
- `GlassSkin.dispose()` references an undefined `CubeCamera` (`GlassSkin.js:75`) — latent bug, only matters if anyone calls `dispose` on the glass mode.
