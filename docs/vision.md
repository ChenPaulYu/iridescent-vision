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

- Pre-warmup palette tween + cinematic flash for the soft → gravity transition (`app.js:soft2Gravity`).
- Ramped speedup with accelerating vertical scroll and synchronized mask / face lift during Ascension climax.
- Throttled baseline vertical drift so the fiber forest doesn't empty during the long Ascension window.
- Shared `uVerticalScroll` uniform across fibers, tunnel, and sparkles so the whole background rises together.
- Shared palette + rim-color across fiber background and mask material via `setBackgroundPalette` / `tweenBackgroundPalette`.

## Open Threads

- The speedup → `testTransparent` handoff at `t≈65.5` currently just kills the background. A short fade or palette flush would echo the soft → gravity polish.
- The `orbit` → `reflection` palette swap at `afterFlake` (`t≈183.5`) is instant; route it through `tweenBackgroundPalette` for consistency.
- Consider a closing motif at the end of `Activity` that visually echoes Awakening — the cycle should close, not just stop.
- Keyboard shortcuts and the (currently unused) `dat.gui` scaffolding in `SoftVolume.setGUI` are vestigial; expose as a deliberate debug panel or strip from production builds.
- `GlassSkin.dispose()` references an undefined `CubeCamera` (`GlassSkin.js:75`) — latent bug, only matters if anyone calls `dispose` on the glass mode.
