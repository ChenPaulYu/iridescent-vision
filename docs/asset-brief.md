# Iridescent Vision – Asset Generation Brief

Working document for generating 2D image assets with an image-gen model. Companion to [`style-anchor.md`](./style-anchor.md) (tone rules) and [`docs/reference/mv-frames/`](./reference/mv-frames/) (ground-truth stills from the MV).

**How to use:** For every generation, paste the **Project Context** block below first, then the asset's **Prompt**. Generate 3–4 variants per asset. Check each variant against the asset's **Acceptance checklist** — if unsure, hand all variants to the integration session; final judging happens in-engine with bloom enabled.

**Color discipline reminder:** Except for the matcap, all assets are re-colored in-shader from the app's palette at runtime — the image supplies *structure and light*, the code supplies *color*. So when choosing between variants, prefer the one with the best **shapes, depth, and light falloff**, not the prettiest color.

---

## Project Context (paste before every prompt)

> This image is an asset for "Iridescent Vision", an interactive WebGL music-video experience about a goddess archetype moving through the cycle of human civilization — from primal roots to a post-tech era and back. The entire piece lives in a single color world: deep purple-black darkness, ultraviolet blue and violet, magenta and lavender accents, pale cyan sheen, and pearl-white light. There are NO warm colors anywhere — no orange, no yellow, no red, no green (warm tones are reserved exclusively for the goddess's skin, which never appears in generated assets). The visual language is: molten liquid-chrome surfaces reflecting a violet world, translucent silk and fog that light bleeds through, heavy analog film grain, soft glowing edges, never hard outlines or flat graphic shapes. The mood is ritual, ceremonial, slow, immersive — like a dream remembered from inside a temple, not a sci-fi trailer. Everything either glows, blurs, or dissolves at its edges.

---

## Asset 1 — Environment dome (highest priority)

**Used for:** wrapped inside a large sphere surrounding the camera during the Orbit and Reflection beats; also refracted through the glass mask. Replaces the current off-palette `gradient.jpeg`. Recolored at runtime by the palette system (structure matters most).

**Spec:** equirectangular panorama, aspect exactly 2:1, ideally 4096×2048 (minimum 2048×1024). Left and right edges should connect if possible (seams are fixable in code).

**Prompt:**

> A seamless equirectangular 360-degree panorama, aspect ratio 2:1, designed to be wrapped inside a sphere as an environment dome. Vast folds of translucent silk-like veils of light hang and drift through darkness, as if enormous curtains of glowing fabric were suspended in a void. The lower half of the panorama is filled with slow, milky lavender-grey fog with soft light bleeding through it from behind; the upper half fades gradually into near-black deep purple darkness. Inside the fabric folds, faint sheens of ultraviolet blue, magenta and pale cyan shimmer like light caught in silk. A few very soft, out-of-focus white bokeh specks float in the middle distance, like dust catching light. Heavy analog film grain over the whole image, soft focus everywhere, nothing sharp, no hard edges anywhere. No stars, no clouds, no landscape, no horizon line, no objects, no figures, no light rays with defined edges. The overall exposure is dark — most of the image sits in deep shadow, with light concentrated in a few gentle pools. Cinematic, ritualistic, dreamlike.
>
> **Negative:** orange, yellow, red, green, warm tones, sunlight, sunset, fire, gold, recognizable objects, buildings, trees, mountains, water, planets, stars, text, watermark, sharp edges, geometric shapes, lens flare streaks, HDR look, oversaturated.

**Acceptance checklist — a variant is OK if ALL of these hold:**

- [ ] Squint test: with eyes half-closed, ≥ 60% of the image reads as near-black / deep shadow. If the whole frame is bright, reject.
- [ ] Every hue in the image sits in the blue → violet → magenta range (plus neutral grey/white). Any patch of orange/yellow/green anywhere = reject.
- [ ] No nameable object: nothing you could point at and call "a mountain / a cloud / a planet / a window". Structure must read as abstract fabric, fog, or light.
- [ ] No hard silhouette lines: every boundary between light and dark is a gradient, not an edge.
- [ ] Vertical composition correct: darkest region at top, fog/light concentrated in lower half (camera sits at the sphere's center and mostly looks slightly upward — the top will be seen most).
- [ ] The two side edges roughly continue into each other in brightness and structure (perfect seam not required).

**Reference stills:** mv-06 (silk + bokeh), mv-07 (lavender fog), mv-10 (indigo fiber curtain).

---

## Asset 2 — Mask matcaps (two variants: rubber → chrome)

The mask's material progression **is** the narrative spine (style-anchor §2): soft rubber-gel while the goddess is touchable (Awakening), liquid chrome once tool-making energy hardens her (Ascension), real-time glass refraction in Orbit (no matcap needed — the environment dome feeds it). So we need **two** matcaps, cross-faded at the existing `soft2Gravity` cinematic flash. Both are sampled by surface normal to light the goddess mask — these images *are* the mask's material, the only assets whose own colors ship to screen unmodified.

**Spec (both):** square, 1024×1024 (minimum 512). One sphere, centered, filling ~90–95% of frame, on pure black.

### Asset 2A — Matte rubber-gel matcap (Awakening)

**Prompt:**

> A matcap material-capture sphere: a single perfect ball centered on a pure black background, filling almost the entire frame, photographed straight-on. The ball is made of soft matte silicone gel, deep plum purple-black in color — like a dark rubber sphere with a faintly waxy, skin-like surface. Lighting is diffuse and gentle from above: one broad, soft pearl-lavender sheen spread across the upper surface (a wide gradient, NOT a sharp specular point), a subtle violet subsurface glow along the outer rim as if light barely penetrates the material, and the lower third sinking into near-black. No mirror reflections, no chrome, no gloss, no wetness. The material should feel organic, warm-blooded but cold-colored — a body, not an object.
>
> **Negative:** chrome, mirror, glossy, sharp highlight, blown white, orange, yellow, red, green, warm tones, plastic shine, visible environment reflection, text, watermark, second sphere, cropped sphere.

**Acceptance checklist:**

- [ ] Exactly one sphere, fully inside frame, centered, pure black background.
- [ ] NO blown-white speculars — the exact opposite of 2B. Brightest area is a broad pale-lavender sheen, not a hot point. (A sharp highlight makes Awakening's soft body read as hard plastic — reject.)
- [ ] Rim slightly luminous relative to center (subsurface feel) — this echoes the app's existing rim-light shader.
- [ ] Base color deep purple-black; overall the darkest of all assets.
- [ ] Light from above; bottom third near-black.

**Reference stills:** mv-07 (soft embodied register); the app's Awakening beat.

### Asset 2B — Liquid-chrome matcap (Ascension)

**Prompt:**

> A matcap material-capture sphere: a single perfect ball centered on a pure black background, filling almost the entire frame, photographed straight-on. The ball is made of molten liquid chrome — a mirror-polished, wet-looking metal surface. Its reflections show a violet world: the upper region of the sphere reflects blown-out pearl-white and pale lavender light (highlights overexposed to pure white), the middle region reflects deep ultraviolet blue and violet, the lower region falls into near-black purple shadow. Thin streaks of magenta and pale cyan iridescence run between the zones, like oil film on liquid metal. The reflections are soft and abstract — no recognizable room, windows, or objects, just zones of colored light as if the sphere stood inside an abstract violet nebula studio. High contrast between the white highlight and the dark base. Glossy, liquid, expensive.
>
> **Negative:** orange, yellow, red, green, gold, warm tones, matte surface, plastic look, visible room reflection, windows, photographer silhouette, text, watermark, background gradient, second sphere, cropped sphere.

**Acceptance checklist:**

- [ ] Exactly one sphere, fully inside frame, centered; background pure black (no glow halo bleeding past the sphere's edge).
- [ ] Brightest highlight actually clips to white (chrome needs blown speculars — a polite grey highlight reads as plastic).
- [ ] Dominant hues: white / lavender / ultraviolet blue / violet / magenta / trace cyan. Any warm reflection = reject.
- [ ] The dark zone is genuinely dark (near-black purple), so the mask keeps contrast against bright backgrounds.
- [ ] Light comes roughly from above: bright top, dark bottom. (The app's world implies overhead light; an upside-down matcap makes the mask look lit from below — reject.)
- [ ] No readable reflected content (no windows, figures, horizon lines) — abstract zones only.

**Reference stills:** mv-01, mv-04, mv-09 (chrome material), mv-03 (chrome head against violet).

---

## Asset 3 — Surface detail height map

**Used for:** tri-planar projected micro-relief on the mask so speculars break up organically instead of reading as smooth plastic. Grayscale only; contributes zero color.

**Spec:** square, 1024×1024, seamlessly tileable, grayscale.

**Prompt:**

> A macro photograph of a real physical surface: slowly cooling molten metal that has solidified into smooth, organic ripples. This is a photographed material surface with authentic imperfections — NOT a digital pattern, NOT a fractal generator render, NOT procedural noise, NOT AI-art texture. Gentle flowing undulations at two distinct scales at once: broad slow swells rolling across the whole frame, with much finer subtle wrinkles layered on top of them, like the surface of poured wax or slowly stirred mercury settling to rest. Even, mid-grey tonal range throughout the entire image — no area should read as pure black or pure white. All transitions soft, smooth, and rounded; no sharp creases, no cracks, no cellular or honeycomb cells, no stamped-looking repeating motif. Must be seamlessly tileable in both directions. Rendered as a pure grayscale height/displacement map, softly and evenly lit, like a depth-scan of a real surface, not artistically lit.
>
> **Negative:** color, high contrast, pure black areas, pure white areas, hard edges, cracks, scratches, hexagons, voronoi cells, fabric weave, digital noise grain, fractal pattern, generative-art look, text, watermark, directional hard shadows, visible tile seam, stucco, concrete, plaster.

**Acceptance checklist:**

- [ ] Pure grayscale (any color tint is fine to reject, though convertible).
- [ ] Histogram centered: mostly mid-grey, no large pure-black or pure-white areas (extremes create ugly specular holes).
- [ ] Features exist at ≥ 2 scales (broad swells + fine wrinkles). A single uniform noise frequency looks like plastic wrap — reject.
- [ ] No recognizable repeating motif when tiled 2×2 mentally (obvious repetition breaks the illusion at close range).
- [ ] Everything smooth/rounded: no sharp creases, no crack lines, no cellular/voronoi look (the ornament shader already owns the faceted-crystal language — this map must not compete with it).

**Reference stills:** mv-01, mv-09 (crumpled molten surface).

---

## Asset 4 — Particle sprite

**Used for:** the point-sprite texture for dust and sparkles (tinted by the palette's glow color at runtime). Replaces procedural soft circles.

**Spec:** square, 256×256 or 512×512, single speck centered on pure black. (Black = transparent via additive blending — no alpha channel needed.)

**Prompt:**

> A macro photograph of a single tiny out-of-focus light source floating in complete darkness — like one grain of glowing dust or an ink fleck caught in a flashlight beam, shot with a shallow-depth-of-field macro lens on film. This is a real photograph, not a vector graphic or icon. The speck sits centered in the frame, occupying roughly one quarter of the frame's width, with a soft, organic, slightly asymmetric blob shape — irregular like a genuine dust mote, absolutely not a symmetric circle, not a four-point or six-point star, not a lens-flare sparkle icon, not a diamond shape. Its edge fades gradually and unevenly into black over a wide soft gradient, with faint photographic grain visible in the falloff. The speck itself is near-white with the faintest lavender tint. Every pixel outside the speck's glow — including all four corners and edges of the frame — must be pure flat black; this is critical, as the black will be treated as transparent when composited.
>
> **Negative:** perfect circle, four-point star, six-point star, sparkle icon, asterisk, lens flare streak, rainbow fringing, concentric rings, halo ring, multiple specks, color, orange, yellow, sharp vector edge, icon/clipart look, text, watermark, grey or dark-grey background (must be pure black, not near-black).

**Acceptance checklist:**

- [ ] Exactly one speck, roughly centered; corners and edges of the frame are pure black (a non-black frame edge creates visible square boundaries on every particle in-app — auto-reject).
- [ ] Shape slightly irregular/organic — a mathematically perfect disc is what we already have procedurally; a hard-edged star is off-style.
- [ ] Falloff is gradual: no ring artifacts, no sharp boundary between speck and black.
- [ ] Near-white core, neutral-to-lavender tint only.

**Reference stills:** mv-05, mv-06 (ink-fleck bokeh particles).

---

## Asset 5 — Silk light-veil texture (optional)

**Used for:** possible upgrade layer for the tunnel walls / mantra mid-distance layer. Grayscale; recolored and scrolled in-shader. Lower priority — generate only after 1–4 are locked.

**Spec:** 2:1 landscape (2048×1024) or square 1024; tileable at least horizontally.

**Prompt:**

> A macro-to-medium photograph of real backlit silk fabric hanging in long curtain-like drapes, shot on film — an actual photographed textile, NOT a digital fractal pattern, NOT generative art, NOT an aurora or light-veil render. Tall vertical folds of translucent cloth catch light glowing from behind; some folds are broad and slow, others narrow and tightly bunched, creating an uneven, irregular rhythm across the frame — like mv reference "indigo fiber curtain". Light bleeds through the thin stretched parts of the fabric while thick overlapping folds sink into soft shadow. Visible fine-grain photographic texture throughout, soft focus, nothing sharp anywhere. Rendered in pure grayscale, mid-to-high tonal range, but no pure white and no pure black anywhere. The image should tile horizontally without an obvious seam. No visible faces, figures, embroidery, or printed designs — plain woven cloth only.
>
> **Negative:** color, digital fractal pattern, generative art, aurora, lightning, plasma, faces, figures, embroidery, printed patterns, hard edges, window-shaped light, perfectly even/symmetric folds, text, watermark.

**Acceptance checklist:**

- [ ] Folds run vertically (the shader scrolls this vertically — horizontal folds would read as sideways drift).
- [ ] Tonal: rich mid-range, no blown whites / crushed blacks.
- [ ] Structure at 2+ scales (broad drapes + fine fiber detail), echoing mv-10.
- [ ] Horizontally tileable to the eye.

---

## Asset 6 — Opening ember (primordial seed)

**Used for:** the loading/CTA screen's single glowing sphere — the seed of pure potential the goddess is dreamed from, before Awakening begins. Currently faked with the chrome matcap (Asset 2B) run through CSS multiply/brightness hacks; a purpose-built texture would look more intentional and let those CSS filters go away.

**Spec:** square, 1024×1024. One sphere, centered, filling ~85–90% of frame, on pure black. Unlike Asset 2B (blown-out chrome), this one should be murky and self-contained — a designed small emblem, not a crop of a larger material study.

**Prompt (v2 — v1 read too much like a cosmic nebula planet, and its fine fractal cracks risked turning to mush at real display size):**

> A single sphere floating in pure black void, centered, filling most of the frame — an egg-like seed of dormant primordial life, not a planet or celestial body. The surface is smooth organic dark violet-indigo tissue, like the shell of a chrysalis or a vein-laced membrane, with a small number of thick glowing veins of pale lavender-white light running across the surface and branching, as if lit from underneath by inner bioluminescence — think firefly veins glowing under dark skin, or lightning trapped inside a geode, never starlight or a nebula. Keep the glowing veins few and bold (3–6 major branches), not many fine fractal cracks, so the pattern stays legible even when shrunk very small. A faint wash of magenta and the barest hint of pale cyan color the glow, never warm. No stars, no cosmic dust, no crater texture, no continents, no visible horizon line — this must read as a living seed or egg, not a planet or moon. Heavy analog film grain, soft-focus rim fading to black.
>
> **Negative:** planet, moon, nebula, galaxy, starfield, space, cosmic dust, craters, continents, orange, yellow, red, green, warm tones, mirror/chrome reflections, blown white highlights, hard edges, geometric patterns, text, watermark, second sphere, cropped sphere.

**Acceptance checklist:**

- [ ] One sphere, centered, fully inside frame, pure black background (corners/edges must be flat black, same auto-reject reason as Asset 4).
- [ ] Glow reads as *emitted from within* (uneven inner light through cracks/veins), not an *external* reflected highlight — this is the opposite instruction from the chrome matcap, and is the whole point of a separate asset.
- [ ] No pure-white blown highlight anywhere (that would read as chrome, not murky potential).
- [ ] Dominant hues: violet/indigo/deep purple, with magenta and the faintest cyan as accents only — no warm colors.
- [ ] Doesn't read as a planet/nebula (no crater texture, no continents, no starfield, no "cosmic photo" gestalt) or a gemstone (no faceted cuts) — organic, alive, egg-like.
- [ ] Veins are few and bold (roughly 3–6 major branches), not fine fractal lace — check legibility by shrinking the image to thumbnail size before accepting.

**Reference stills:** mv-06, mv-07 (the murky lavender-fog register), general style-anchor palette.

---

## Rejection quick-reference (applies to every asset)

Reject immediately if you see: any orange/yellow/red/green · any nameable object or figure · hard graphic edges or flat color blocks · text or watermark · sci-fi cliché (stars, planets, grids, holograms, circuit patterns) · "HDR wallpaper" oversaturation. When two variants both pass, pick the one that looks better **darker and softer** — the app adds its own light (bloom) on top.
