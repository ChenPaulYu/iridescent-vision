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
| **Fibers as multi-readable** | The fiber forest reads as roots in Awakening, light columns in Ascension, circuits / synapses in Orbit. Do not add new geometric forms that compete with it. |
| **Sparkles as starlight** | Sparkles are always microscopic light particles — never snow, never fireworks. Transparent, additive blending, sit behind the mask. |

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
