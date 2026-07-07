# Iridescent Vision

An interactive WebGL music-video experience about human civilization — journeying from the primitive age to the post-tech era. A goddess's head symbolizes everything we believed in across different times, leading us toward our next destination. And what is the future going to be? Maybe it's just a vision that keeps repeating itself.

**Live: <https://chenpaulyu.github.io/iridescent-vision/>**

> Use Chrome, sound on. The piece is a single ~2-minute ritual driven by its soundtrack — click the ember to begin.

## The Four Acts

The goddess mask's material progression **is** the narrative spine: each age remakes her out of what it believes in.

| Act | Age | Goddess | Environment | Interaction |
|---|---|---|---|---|
| **I · Awakening** | Primal | Soft rubber-gel body — touchable, embodied | Underwater silk tunnel, god rays breaking through the surface, drifting motes | Pull and deform the mask with the cursor; a light follows your hand |
| **II · Ascension** | Agrarian → Industrial | Magnetized — dark magnetite with field lines converging at her poles | The same tunnel accelerating and brightening; orbiting spheres collide with her; the climax lifts her skyward | Click to scatter the spheres |
| **III · Orbit** | Post-Tech | Refractive glass — light fractures inside her as she turns transparent | Blackout cut into a luminous void: astrolabe rings, Sri Yantra, cosmic dust | None — you become a witness |
| **IV · Reflection** | Cyclical Future | Dissolves into gold dust — the dust the cycle will be reborn from | The dome decomposes; everything returns to ambient stillness | — |
| **Coda** | — | — | A stone chamber: the poster of this age fused into carved walls, a rhymed epitaph (one of three, chosen at random each playthrough) chiseled overhead | Click the floating portrait to meet the artist |

## Architecture

```
src/
├── app.js                    # Orchestrator: Tone-driven timeline, mask materials, scene wiring
├── core/
│   ├── PostPipeline.js       # Bloom → ACES tonemap → film grain → vignette → chromatic aberration
│   ├── PaletteCoordinator.js # One palette source of truth, broadcast to every subsystem
│   └── easing.js             # Shared easing curves
├── FiberForestBackground.js  # Acts I–II environment: silk-veil tunnel + drifting sparkles
├── SoftVolume.js             # Act I: spring-mesh pull interaction (rubber body)
├── Gravity.js                # Act II: Oimo physics spheres orbiting the magnetized mask
├── GlassSkin.js              # Act III: cube-camera refraction + internal light-fracture shader
├── HeadMove.js               # Acts III–IV: spline head choreography (shake / flake / up / rotate)
├── CosmicDome.js             # Astrolabe, Sri Yantra, mantra field, shared dust-particle pool
├── EnvironmentDome.js        # Palette-recolored luminance dome behind the glass acts
├── Activity.js               # Coda: the inscribed stone chamber + portrait link
└── textures/generated/       # AI-generated, hand-curated assets (see docs/asset-brief.md)
```

Key design decisions:

- **Everything is scheduled against `Tone.Transport`**, never wall-clock — visual cues can't drift from the soundtrack. The full ending timeline is documented in [`docs/vision.md`](docs/vision.md).
- **Mask material relay** — `SoftVolume`, `Gravity` and `GlassSkin` each swap `mesh.material` wholesale for their act; per-act material identity lives in the material each mode owns, not in a shared base.
- **Generated-asset pipeline** — matcaps, the dome, silk veil, particle sprite and the opening ember are AI-generated images curated against explicit acceptance checklists ([`docs/asset-brief.md`](docs/asset-brief.md)), then wired into custom shaders (tri-planar relief, view-space matcap sampling, luminance recoloring).
- **One post-processing chain** (`PostPipeline`) carries the piece's analog register: capped-resolution bloom, ACES with a shadow-deepening S-curve, luminance-weighted animated grain, and an adaptive quality governor that steps pixel ratio down under sustained load.
- **A logarithmic depth buffer** is required — the mask mesh has near-coincident shell faces that z-fight at scene distances under a standard depth buffer. Custom `ShaderMaterial`s must include the `logdepthbuf` shader chunks manually.

Docs worth reading before touching visuals: [`docs/style-anchor.md`](docs/style-anchor.md) (palette and tone rules — the MV reference stills win every argument) and [`docs/vision.md`](docs/vision.md) (what happens in each beat and how it is implemented).

## Run Locally

```bash
npm install        # install dependencies
npm run dev        # dev server (Vite, port 5174)
npm run build      # production bundle → dist/
npm run preview    # preview the production build
```

## Deploy

```bash
npm run build
npm run deploy     # publish dist/ to the gh-pages branch
```

GitHub Pages serves from the `gh-pages` branch; `vite.config.js` uses relative asset paths (`base: './'`) so the subpath deployment works without extra configuration.

## Credits

- **Original work, artwork, music & concept** — [Sonia Lai](https://github.com/Sonia-lai/Iridescent-Vision). This repository continues her project: the soundtrack, poster, portrait and the music-video reference frames are hers.
- **Visual-quality pass, interaction & closing chamber** — [Paul Chen](https://github.com/ChenPaulYu).
