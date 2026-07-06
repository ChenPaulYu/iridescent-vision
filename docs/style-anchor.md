# Iridescent Vision – Style Anchor

Shared reference for tone, look, and pacing when iterating on the experience. Read this **before** adding or modifying any visual or interaction.

Complements [`vision.md`](./vision.md), which describes *what happens* in each beat. This document describes *how it should feel* and *what discipline to keep*.

## 1. Core: A Goddess Through a Civilizational Cycle

The piece is a ritual, not a demo.

The mask (`mask3.gltf`) is the persona; the carved face behind it (`Taj.gltf`) is the deeper self. The MV follows a feminine archetype emerging from primal matter, ascending through cultural / technological stages, dissolving into pure light, questioning herself, and returning to organic origins.

This arc is **a spiral, not a line.** Each scene should breathe — expand, withdraw, expand, settle — and the final beat should rhyme with the first.

**Cultural register.** "Taj" (Persian for crown) plus the dark sculpted face plus the deep iridescent palette explicitly signal a **non-Western divine archetype.** Avoid imagery that pulls toward Greco-Roman marble, Catholic saints, or generic sci-fi goddesses. Lean into the ambiguous, syncretic — Persian, South Asian, African — without being literal about any one tradition.

## 2. Visual Vocabulary: Iridescent

The name of the project is the rule.

| Dimension | Rule |
|---|---|
| **Palette** | Deep purple-black base. Magenta / lavender / pink as tip. Pearl-white / pale lavender / pale cyan as glow. Monochromatic-iridescent throughout. **No primary colors. No saturated yellow or green.** |
| **Three states of materiality** | (a) **Soft translucent gel** (`SoftVolume`) → (b) **Refractive glass** (`GlassSkin`) → (c) **Iridescent rim** (mask `MeshPhysicalMaterial` with the rim-shader injection in `app.js:applyMaskMaterial`). The progression itself is the narrative: body → spirit → consciousness. |
| **Glow over edges** | Everything glows, blurs, or fades at the edges. **No hard outlines, no flat color blocks, no geometric silhouettes** other than the mask, which is the anchor. |
| **Tunnel/veil as the environment, not a foreground motif** | Awakening/Ascension are the *same* swirling tunnel + silk-veil luminance intensifying (calm/dim → fast/bright), not a geometric curtain or strand system placed in front of the goddess. An earlier fiber-strand curtain was dropped 2026-07-06 for reading as a rigid door-frame; do not reintroduce foreground geometric forms that compete with the mask. |
| **Sparkles as starlight** | Sparkles are always microscopic light particles — never snow, never fireworks. Transparent, additive blending, sit behind the mask. |

### MV reference frames (ground truth)

`docs/reference/mv-frames/` holds ten stills from the original music video. When a written rule and the stills disagree, **the stills win.** Beyond the palette table above, they establish four material facts:

1. **Liquid chrome, not pearl.** The goddess head and the floating masses (mv-01, mv-04, mv-09) are molten mirror-chrome: blown-out white speculars, reflections tinted ultraviolet blue / magenta / pale cyan. "Iridescent" here means *chrome reflecting a violet world*, not soft pearl sheen. The GlassSkin refraction phase is the in-app cousin of this material.
2. **Analog film grain is the baseline, not a garnish.** Every frame carries heavy grain, chromatic aberration, overexposure, or motion blur (mv-05 is almost pure noise). A clean digital render reads as off-style; post grain should be present throughout, heavier than instinct suggests.
3. **High-key passages exist.** The piece is not uniformly dark: milky lavender fog (mv-07), backlit silk with bokeh flecks (mv-06), and full bleach-outs (mv-02) are legitimate registers. Light sometimes floods the frame rather than punctuating it — but always as lavender/white wash, never warm.
4. **Skin is the only warm color.** The goddess's brown skin (mv-04, mv-07) is the sole warm element in the entire piece — this is *why* the palette bans warm hues everywhere else. Generated assets must contain zero orange / yellow / red.

mv-10 (indigo fiber curtain) was the original reference for the Awakening environment, but the in-app instanced-strand attempt never matched its softness/density and was dropped in favor of the tunnel+silk-veil alone (2026-07-06); mv-08 (electric halo) for ring-like punctuation glow.

### What to avoid

- Stroboscopic flicker (replaced in the soft → gravity transition for this reason).
- Solid screen-color flashes. Use radial gradients or fade-out overlays.
- UI chrome: labels, buttons, HUDs. The only deliberate UI moments are the `CLICK` to enter and the closing `Activity` portrait portal.
- Hard camera cuts. The camera moves continuously, never teleports.

## 3. Pacing Grammar: Ritual Time

The hardest discipline. This is not a film, not a music video, not a game — it is **ritual time.**

- **Slow drift is the default.** 90% of the runtime is slow breathing, gentle motion, palette pulsing. The viewer is being immersed, not entertained.
- **Punctuation is rare and designed.** A single track may have only 4–5 climactic punctuations (flash, palette shift, mode change). Each needs three things: anticipatory **buildup**, the **climax** moment, and time to **settle**. Never punctuate without all three.
- **Music cues drive everything.** All timing flows from `SoundHandler.schedule` against `Tone.Transport`. Never schedule against wall-clock for anything narrative.
- **Interactivity tapers off intentionally.** The viewer can pull the mask in Awakening (`SoftVolume`) and steer the spotlight (`MouseLight`). After Ascension, the viewer becomes a witness — the goddess is no longer touchable. This mirrors her arc out of embodiment.
- **Recurring ritual gestures.** `bumpFlash`, `shakeHead`, `flake`, `headUp`, `rotateHead` are choreographic motifs — like dance phrases. Reuse them rather than inventing new gestures for each beat.

## 4. Checklist for Any Change

Before adding or modifying anything, ask:

1. **Does it sit in the Iridescent palette?** If a new primary or saturated color is required, reconsider.
2. **Does it glow?** Hard edges and flat fills break the spell.
3. **Is there buildup-climax-settle, or just an event?** Single events feel abrupt and break ritual time.
4. **Does interactivity match the arc?** Touch / steer in early beats; observe in later beats.
5. **Does it rhyme with the cycle?** New gestures should echo existing motifs, not introduce new vocabulary.
6. **Is it on a music cue, not a clock?** If timing is wall-clock, the soundtrack drift will desync it within minutes.
