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

### Asset 2C — Magnetite matcap (Ascension, replaces the procedural-only look) — ACCEPTED 2026-07-06

**Why:** `buildMagnetFieldMaterial` (app.js) is currently 100% procedural — a flat multiplied base color with meridian field-lines and a fresnel rim on top, no actual surface material. That fixed legibility (you can now see the mask's form) but the material itself still reads as flat/synthetic rather than a real object. This matcap gives it an actual material identity — the field-line/fresnel shader logic stays, layered on top of this texture instead of a flat color.

**Prompt (v2 — v1 generated a crushed-glass/amethyst-geode look: too many small sharp glinting facets, reading as a cut gemstone rather than dull rock, and visually duplicating the Orbit glass-fracture shader's faceted-crack language):**

> A matcap material-capture sphere: a single perfect ball centered on a pure black background, filling almost the entire frame, photographed straight-on. The ball is a rough block of dark magnetite iron ore — a dense, dull natural mineral. NOT polished metal, NOT chrome, and critically NOT a faceted gemstone or cut crystal. The surface is matte and granular like weathered rock or unpolished ore: fine-grained, slightly porous, almost no specular sparkle — think rough sandpaper-textured stone, not cut glass or a geode. Only one or two very soft, broad, low-contrast patches of dull pale-violet sheen break the surface, spread wide and hazy rather than as tiny glinting points. The material is deep charcoal-black to near-black violet-grey, darkening to full black at the base. A faint cool ultraviolet undertone sits in the shadow regions, like a mineral hinting at latent magnetic energy rather than glowing outright. No mirror reflections, no crystal facets, no glassy sparkle, no readable environment, no wet gloss, no warm tones anywhere.
>
> **Negative:** chrome, mirror finish, wet gloss, polished metal, faceted crystal, cut gemstone, geode, amethyst, quartz cluster, crushed glass, sparkle, glitter, glinting highlights, diamond facets, blown-white highlight, orange, yellow, red, green, warm tones, smooth plastic, digital pattern, fractal texture, cellular/voronoi look, text, watermark, second sphere, cropped sphere, bright/high-key overall exposure.

**Acceptance checklist:**

- [ ] Exactly one sphere, fully inside frame, centered, pure black background.
- [ ] Overall dark and restrained — this should be the darkest, dullest matcap in the whole set (duller than 2A rubber). If the highlight blows out to white or looks shiny/wet, reject — that's chrome, not magnetite, and duplicates 2B.
- [ ] **No glassy/crystal sparkle** — if the surface shows many small bright glinting facets (reads like broken glass, a cut gemstone, or an amethyst geode), reject. This was the specific failure of v1: it duplicated the Orbit glass-fracture shader's faceted-crack visual language, which needs to stay unique to that beat.
- [ ] Visible rough/granular texture on close inspection, but soft and matte — a few broad hazy sheen patches, not a flat smooth gradient and not sharp glints.
- [ ] Palette strictly violet / blue-grey / black — no warm tones.
- [ ] Light from above, darkest at the base — consistent with the rest of the mask's matcap lighting convention (2A, 2B).

**Reference stills:** mv-01, mv-09 (dark mineral/metal surfaces at low exposure).

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

## Asset 6 — Opening ember (primordial seed) — v3 ACCEPTED 2026-07-06

**Used for:** the loading/CTA screen's single glowing sphere — the seed of pure potential the goddess is dreamed from, before Awakening begins. Currently faked with the chrome matcap (Asset 2B) run through CSS multiply/brightness hacks; a purpose-built texture would look more intentional and let those CSS filters go away.

**Spec:** square, 1024×1024. One sphere, centered, filling ~85–90% of frame, on pure black. Unlike Asset 2B (blown-out chrome), this one should be murky and self-contained — a designed small emblem, not a crop of a larger material study.

**Prompt (v3 — v2's "chrysalis membrane" reads too smooth/synthetic in the real render, more like a glossy toy orb with a clean vector crack than something primordial; pivoting to raw stone, the same material language that worked for Asset 2C's magnetite matcap, for thematic continuity — she begins as raw mineral with fire trapped inside, and later magnetizes into an actual mineral body):**

> A single fragment of raw, rough dark stone or meteorite floating in pure black void, centered, filling most of the frame — unpolished, irregular, ancient. NOT a smooth egg, NOT a polished sphere, NOT a gemstone with cut facets. The surface is matte, granular, pitted rock — real photographed mineral texture, like a piece of split-open ore or a fallen meteorite fragment. A few (3–5, not more) bold, thick cracks break across the rough surface, and molten light glows out from deep within these cracks — like lava seen through a fissure, or fire trapped inside stone. The glow is uneven and organic along each crack, brightest at a couple of points, not a uniform neon line. Base stone color is near-black charcoal with a cool violet-grey cast; the glow within the cracks is pale lavender-white with a faint magenta undertone, never warm. Heavy analog film grain, the rock's silhouette softening into soft focus at the rim rather than a hard cut edge. No stars, no cosmic dust, no craters-as-decoration, no continents, no smooth egg-like sheen, no faceted gem cuts, no polished chrome.
>
> **Negative:** smooth sphere, glossy surface, egg, chrysalis, polished, planet, moon, nebula, galaxy, starfield, space, cosmic dust, continents, faceted gemstone, cut crystal, clean vector lightning bolt, single thin crack line, orange, yellow, red, green, warm tones, mirror/chrome reflections, blown white highlights, hard edges, geometric patterns, text, watermark, second sphere/rock, cropped.

**Acceptance checklist:**

- [ ] One rock fragment, centered, fully inside frame, pure black background (corners/edges must be flat black, same auto-reject reason as Asset 4).
- [ ] Reads as **raw, rough stone** — visible granular/pitted rock texture, irregular lumpy silhouette (not a perfect sphere) — if it looks smooth/glossy/egg-like, reject (that was v2's problem).
- [ ] Glow reads as *emitted from within* through real cracks, uneven and organic — not a single clean glowing line (that reads as a vector graphic, not molten light in stone).
- [ ] 3–5 bold cracks, not fine fractal lace and not just one — check legibility by shrinking the image to thumbnail size before accepting.
- [ ] No pure-white blown highlight anywhere (that would read as chrome/polished, not raw mineral).
- [ ] Dominant hues: charcoal/violet-grey stone, pale lavender-white/magenta glow only — no warm colors.

**Reference stills:** mv-01, mv-09 (raw mineral/rock register — same reference family as Asset 2C's magnetite matcap).

---

## Asset 7 — Submerged root wall (Awakening/Ascension side panels)

**Used for:** large background panels flanking the tunnel on the left/right (Awakening reads as "underwater" per artist feedback 2026-07-06 — real photographed root/bark realism, not a procedural shader, is needed here). Applied to tall side panels, not the mask.

**Spec:** portrait, 1024×1536 (2:3). One trunk/root mass, filling most of the frame vertically, on a hazy dark background — no pure-black corners required here (unlike the matcap sphere assets), since this is a background panel, not an isolated emblem.

**Prompt:**

> A photorealistic close-up of a real, weathered tree trunk and its gnarled root system, seen underwater from below looking up toward a distant, murky water surface — the same organic bark realism, cracks, and root texture as genuine underwater nature photography, but the entire image recolored into a cool monochromatic-iridescent palette: deep purple-black shadows, violet-blue midtones, pale lavender-white highlights where light catches the bark and suspended particles. NO natural brown, tan, or green anywhere. The roots split and branch into multiple gnarled limbs disappearing into hazy blue-violet water below. Soft shafts of pale lavender-white light filter down from the water surface far above, catching suspended particulate matter and creating gentle volumetric light beams through the murky water. Heavy atmospheric haze, soft focus at the edges, heavy analog film grain, cinematic underwater photography.
>
> **Negative:** brown, tan, orange, yellow, green, warm tones, clear bright daylight, tropical/sunlit water, fish, other creatures, text, watermark, cartoon, illustration, painting style, land or above-water scene, CGI/render look.

**Acceptance checklist:**

- [ ] Reads as **real photographed bark/root texture** — organic cracks, weathering, irregular growth, not a smooth or stylized surface.
- [ ] Visible light shafts penetrating from above through hazy water — this is the specific "穿透水底" feeling requested, not just a static trunk portrait.
- [ ] Dominant hues: violet/blue-purple/lavender-white only — if any brown/tan/green survives the recolor, reject.
- [ ] No fish/creatures/land elements — keep focus on trunk + light + water haze.
- [ ] Composition works as a tall vertical panel (trunk mass filling most of the frame top-to-bottom).

**Reference stills:** general style-anchor palette; user-provided underwater root photograph (recolor target only — palette must still follow project rules, not the reference's natural brown/green).

---

## Rejection quick-reference (applies to every asset)

Reject immediately if you see: any orange/yellow/red/green · any nameable object or figure · hard graphic edges or flat color blocks · text or watermark · sci-fi cliché (stars, planets, grids, holograms, circuit patterns) · "HDR wallpaper" oversaturation. When two variants both pass, pick the one that looks better **darker and softer** — the app adds its own light (bloom) on top.
