import * as THREE from 'three';
import linkImage from './images/sonia.jpg'

// Closing epitaphs — one is picked at random per playthrough. The piece
// is ABOUT the same vision being re-dreamed by every age, so a different
// inscription each viewing IS the theme, not a gimmick: each replay is
// the cycle's next turn, and the stone remembers it differently. All
// three rhyme (artist-directed); texts adapted from the artist's synopsis.
const STELE_INSCRIPTIONS = [
    [
        'IN EVERY AGE WE CARVED A FACE',
        'TO HOLD THE THINGS WE CHOSE TO TRUST,',
        'FROM PRIMAL ROOT TO POST-TECH GRACE —',
        'SHE ROSE FROM US, RETURNS TO DUST.',
        'AND IF YOU ASK WHAT FUTURES GLEAM:',
        'ONLY THE SAME RETURNING DREAM.',
    ],
    [
        'FROM PRIMAL ROOT TO POST-TECH LIGHT',
        'WE SHAPED HER FACE TO LEAD OUR FLIGHT,',
        'AND ALL THE FUTURES WE PURSUE',
        'ARE VISIONS DREAMING US ANEW.',
    ],
    [
        'WHAT COMES NEXT? THE STONE REPLIES:',
        'ANOTHER FACE, ANOTHER RISE —',
        'FOR EVERY AGE MUST DREAM HER TRUE,',
        'THE OLDEST VISION, EVER NEW.',
    ],
];

var Activity = function (camera, scene, controls) {

    let bgMesh, button, eventType;;
    // One inscription per playthrough — every replay is the cycle's next
    // turn, and the stone remembers it differently.
    const steleInscription = STELE_INSCRIPTIONS[Math.floor(Math.random() * STELE_INSCRIPTIONS.length)];
    let raycaster = new THREE.Raycaster(), INTERSECTED;
    let mouse = new THREE.Vector2();
    // ←/→ flip the chamber's drift direction (artist request 2026-07-07).
    let rotateDir = 1;
    this.scene    = scene
    this.controls = controls
    this.camera   = camera

    // The rotating four walls ARE the stele (artist direction 2026-07-07):
    // instead of a poster skybox plus a separate monolith, the closing
    // chamber's own walls are the 歷史本文 — the viewer stands inside the
    // monument while the auto-rotating camera pans across its inscription.
    // The poster skybox is retired; the portrait sphere stays as the
    // clickable human link at the center.
    let initBackground = () => {
        // Enlarged (was 300×220×300) so the overhead inscription sits
        // higher with more air around it — the type ran cramped edge-to-
        // edge from the low camera.
        let bgCube = new THREE.BoxGeometry(400, 280, 400);
        // (History of this surface: full-poem walls → stanza-per-wall —
        // collided at corners into garbage — → overhead ceiling stele →
        // now floating talismans. The walls/ceiling keep only the
        // poster-fresco + stone grain; the words themselves fly.)
        // The chamber is a poneglyph again (artist direction 2026-07-07:
        // "整個房間...喜歡之前那個類似歷史本文石碑的感覺") — every face is
        // dark violet stone densely carved with the untranslated glyph
        // script. No poster mural, no readable band: the poem itself flies
        // as talismans and only returns to the ceiling when summoned. The
        // dark stone is also what lets the glowing charms read as light.
        const wallOpts = { size: 2048, cell: 112, margin: 64, glyphField: true };
        const buildGlyphTexture = (seedOffset, flipAxis) => {
            const texture = createSteleTexture([], false, Object.assign({}, wallOpts, { seedOffset: seedOffset }));
            // Viewed from inside a box, every face shows its back —
            // textures render mirrored. Walls flip horizontally; the
            // ceiling (+y face seen from below) flips on the other axis.
            if (flipAxis === 'x') {
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = -1;
            } else {
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.y = -1;
            }
            return texture;
        };

        const mat = (map) => new THREE.MeshBasicMaterial({ map: map, side: THREE.BackSide });
        // Face order: +x, -x, +y (ceiling), -y (floor), +z, -z. Every face
        // — floor included — carries the carved script, each with its own
        // glyph seed so the writing doesn't visibly repeat.
        let bgMaterials = [
            mat(buildGlyphTexture(977, 'x')),
            mat(buildGlyphTexture(1291, 'x')),
            mat(buildGlyphTexture(431, 'y')),
            mat(buildGlyphTexture(1747, 'y')),
            mat(buildGlyphTexture(2203, 'x')),
            mat(buildGlyphTexture(337, 'x')),
        ];

        bgMesh = new THREE.Mesh(bgCube, bgMaterials);
        bgMesh.name = 'bg'
    }

    // Flying talismans (符咒) — the epitaph as ritual light-charms roaming
    // the whole chamber ("滿天飛"), two strips per line, billboarded to
    // the camera and breathing in and out of visibility.
    //
    // The tag game (鬼抓人, artist direction 2026-07-07): click a flying
    // charm to pin it to the stone slab under the ceiling. A pinned charm
    // only stays CATCH_HOLD (12s) — miss the full set and it wriggles
    // free (it flickers as its patience runs out). Pin every line and the
    // flock consents: all charms dissolve into the carved ceiling
    // inscription for COMPLETE_HOLD (20s) so the poem can be read whole,
    // then everything scatters and the chase restarts. Alternate summon:
    // spin the chamber fast enough (hover the portrait sphere) and the
    // whole flock pins itself for the full read.
    let talismans = [];
    let ceilingText;
    let lineStates = [];
    let completeT = 0;
    let inscriptionMix = 0;
    const CATCH_HOLD = 12;
    const COMPLETE_HOLD = 10;
    const SPIN_SUMMON_SPEED = 30;

    let createTalismanTexture = (line) => {
        const w = 256, h = 1280;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // A whisper of shadow behind the words — glowing text alone would
        // vanish against the bright poster walls, but a solid paper strip
        // read as a heavy bookmark ("不夠空靈"). Elongated soft ellipse,
        // nothing else.
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(1, h / w);
        const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
        veil.addColorStop(0, 'rgba(18, 12, 38, 0.40)');
        veil.addColorStop(0.7, 'rgba(18, 12, 38, 0.22)');
        veil.addColorStop(1, 'rgba(18, 12, 38, 0)');
        ctx.fillStyle = veil;
        ctx.fillRect(-w / 2, -w / 2, w, w);
        ctx.restore();

        // Words stacked vertically as floating light — two glow passes:
        // a wide halo, then a bright core.
        const words = line.replace(/[—:;,.]/g, '').split(/\s+/).filter(Boolean);
        const top = 90;
        const bottom = h - 90;
        const lh = (bottom - top) / words.length;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        words.forEach((word, i) => {
            let fontSize = Math.min(58, lh * 0.72);
            ctx.font = '600 ' + fontSize + 'px Georgia, "Times New Roman", serif';
            while (fontSize > 22 && ctx.measureText(word).width > w - 64) {
                fontSize -= 2;
                ctx.font = '600 ' + fontSize + 'px Georgia, "Times New Roman", serif';
            }
            const wy = top + lh * (i + 0.5);
            ctx.shadowColor = 'rgba(186, 150, 255, 0.9)';
            ctx.shadowBlur = 34;
            ctx.fillStyle = 'rgba(226, 206, 255, 0.75)';
            ctx.fillText(word, w / 2, wy);
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#f6efff';
            ctx.fillText(word, w / 2, wy);
        });

        return new THREE.CanvasTexture(canvas);
    };

    // The inscription that fades in overhead when the charms are summoned
    // home — transparent canvas, so the poster-stone ceiling shows through
    // around the glowing engraved lines.
    let createCeilingTextTexture = () => {
        const size = 2048;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Fit the type to the longest line — at a fixed 96px the longer
        // epitaphs overflowed the canvas and letters clipped at both ends.
        const sideMargin = 130;
        let fontSize = 96;
        ctx.font = '600 ' + fontSize + 'px Georgia, "Times New Roman", serif';
        const widest = Math.max.apply(null, steleInscription.map((l) => ctx.measureText(l).width));
        if (widest > size - sideMargin * 2) {
            fontSize = Math.floor(fontSize * (size - sideMargin * 2) / widest);
        }
        const lineHeight = Math.round(170 * fontSize / 96);
        const top = (size - steleInscription.length * lineHeight) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 ' + fontSize + 'px Georgia, "Times New Roman", serif';
        steleInscription.forEach((line, i) => {
            const ly = top + lineHeight * (i + 0.5);
            // dark cut first, then lit core — same chisel language as the
            // retired stele band, but floating on transparency
            ctx.shadowColor = 'rgba(9, 6, 20, 0.9)';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(9, 6, 20, 0.85)';
            ctx.fillText(line, size / 2, ly + 5);
            ctx.shadowColor = 'rgba(186, 150, 255, 0.9)';
            ctx.shadowBlur = 26;
            ctx.fillStyle = 'rgba(238, 226, 255, 0.95)';
            ctx.fillText(line, size / 2, ly);
        });
        return new THREE.CanvasTexture(canvas);
    };

    let catchCharm = (tal) => {
        const now = performance.now() / 1000;
        const ls = lineStates[tal.lineIdx];
        if (ls.caught) return;
        ls.caught = true;
        ls.catchT = now;
        tal.caught = true;
        if (lineStates.every((l) => l.caught)) completeT = now;
    };

    let summonAll = () => {
        const now = performance.now() / 1000;
        const firstOfLine = {};
        talismans.forEach((tal) => {
            if (firstOfLine[tal.lineIdx] === undefined) {
                firstOfLine[tal.lineIdx] = true;
                tal.caught = true;
            }
        });
        lineStates.forEach((ls) => { ls.caught = true; ls.catchT = now; });
        completeT = now;
    };

    let releaseAll = () => {
        lineStates.forEach((ls) => { ls.caught = false; });
        talismans.forEach((tal) => { tal.caught = false; });
        completeT = 0;
    };

    let initTalismans = () => {
        const lineCount = steleInscription.length;
        lineStates = steleInscription.map(() => ({ caught: false, catchT: 0 }));
        // Two charms per line, spread wide and high — the poem fills the
        // room's air, not a single orbit band.
        steleInscription.forEach((line, lineIdx) => {
            for (let copy = 0; copy < 2; copy++) {
                const i = lineIdx * 2 + copy;
                const texture = createTalismanTexture(line);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    opacity: 0.9,
                });
                // 256×1280 canvas → 1:5 plane so type isn't stretched.
                const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 45), material);
                mesh.name = 'talisman';
                talismans.push({
                    mesh: mesh,
                    lineIdx: lineIdx,
                    // Wandering path, not an orbit ("還是沒有亂飛"): each
                    // axis sums two incommensurate sines, so every charm
                    // roams its own loose figure through the whole chamber
                    // — crossing others, drifting near and far — instead
                    // of the flock riding one carousel ring.
                    wx: 0.13 + (i % 5) * 0.05,
                    wy: 0.11 + (i % 4) * 0.055,
                    wz: 0.15 + (i % 3) * 0.047,
                    vt: 0,   // per-charm virtual clock — see boost below
                    ax: 70 + (i % 3) * 26,
                    ay: 52 + (i % 4) * 16,
                    az: 70 + ((i + 1) % 3) * 26,
                    px: i * 2.39,
                    py: i * 1.71,
                    pz: i * 3.11,
                    baseY: 28,
                    phase: i * 1.7,
                    caught: false,
                    gmix: 0,     // 0 = flying free, 1 = pinned at the slab
                    supMix: 0,   // twin-suppression fade while its line is pinned
                    // Pin slot: one per LINE (both copies share it — only
                    // the caught copy travels there), an ordered row just
                    // under the ceiling inscription.
                    gatherPos: new THREE.Vector3(
                        (lineIdx - (lineCount - 1) / 2) * 32,
                        122,
                        0
                    ),
                });
            }
        });

        ceilingText = new THREE.Mesh(
            new THREE.PlaneGeometry(330, 330),
            new THREE.MeshBasicMaterial({
                map: createCeilingTextTexture(),
                transparent: true,
                depthWrite: false,
                opacity: 0,
            })
        );
        // Just below the +y face (room is 280 tall), facing down.
        ceilingText.rotation.x = Math.PI / 2;
        ceilingText.position.set(0, 132, 0);
        ceilingText.name = 'ceilingText';
    };

    let smoothstep = (v) => v * v * (3 - 2 * v);
    let lastT = 0;

    let updateTalismans = (camera) => {
        const t = performance.now() / 1000;
        const dt = lastT ? Math.min(t - lastT, 0.05) : 0;
        lastT = t;

        // Timers: pinned charms escape after CATCH_HOLD unless the set is
        // complete; a complete set holds COMPLETE_HOLD then scatters.
        if (completeT) {
            if (t - completeT > COMPLETE_HOLD) releaseAll();
        } else {
            lineStates.forEach((ls, li) => {
                if (ls.caught && t - ls.catchT > CATCH_HOLD) {
                    ls.caught = false;
                    talismans.forEach((tal) => {
                        if (tal.lineIdx === li) tal.caught = false;
                    });
                }
            });
        }

        // The carved inscription only appears for a completed set.
        inscriptionMix += completeT ? 0.012 : -0.012;
        inscriptionMix = Math.min(1, Math.max(0, inscriptionMix));
        const insEase = smoothstep(inscriptionMix);

        // The chase tightens: every pinned line makes the survivors fly
        // faster (last one loose ≈ 2.3× speed). Speed comes from advancing
        // each charm's own virtual clock, not from scaling the sine
        // frequencies directly — a frequency change at time t would
        // teleport the charm to a different point on its path.
        const caughtLines = lineStates.filter((ls) => ls.caught).length;
        const boost = 1 + 1.6 * (caughtLines / lineStates.length);

        talismans.forEach((tal) => {
            const ls = lineStates[tal.lineIdx];
            const suppressed = ls.caught && !tal.caught;
            // pin travel eases in; escape snaps back faster (馬上散開)
            tal.gmix = Math.min(1, Math.max(0, tal.gmix + (tal.caught ? 0.03 : -0.055)));
            tal.supMix = Math.min(1, Math.max(0, tal.supMix + (suppressed ? 0.05 : -0.05)));
            const g = smoothstep(tal.gmix);
            tal.vt += dt * boost;

            const fx = (Math.sin(tal.vt * tal.wx + tal.px) + 0.45 * Math.sin(tal.vt * tal.wx * 2.33 + tal.px * 1.7)) * tal.ax * 0.72;
            const fy = tal.baseY + (Math.sin(tal.vt * tal.wy + tal.py) + 0.45 * Math.sin(tal.vt * tal.wy * 2.1 + tal.py * 2.3)) * tal.ay * 0.72;
            const fz = (Math.sin(tal.vt * tal.wz + tal.pz) + 0.45 * Math.sin(tal.vt * tal.wz * 2.61 + tal.pz * 1.3)) * tal.az * 0.72;
            tal.mesh.position.set(
                fx + (tal.gatherPos.x - fx) * g,
                fy + (tal.gatherPos.y - fy) * g,
                fz + (tal.gatherPos.z - fz) * g
            );
            // Billboard for legibility, then a gentle roll so the strip
            // sways like paper rather than tracking rigidly (pinned strips
            // hold still).
            tal.mesh.lookAt(camera.position);
            tal.mesh.rotation.z += Math.sin(t * 0.45 + tal.phase) * 0.1 * (1 - g);

            // Free charms breathe; pinned ones burn steady — flickering
            // in the last 3s before they wriggle free — and the whole
            // flock dissolves into the ceiling once the set completes.
            const breath = 0.62 + 0.3 * Math.sin(t * 0.5 + tal.phase);
            let opacity = (breath + (0.95 - breath) * g) * (1 - tal.supMix);
            if (tal.caught && !completeT) {
                const remain = CATCH_HOLD - (t - ls.catchT);
                if (remain < 3) opacity *= 0.55 + 0.45 * Math.sin(t * 9);
            }
            tal.mesh.material.opacity = opacity * (1 - insEase);
        });

        if (ceilingText) ceilingText.material.opacity = insEase;
    };

    let initButton = () => {
        var geometry = new THREE.SphereGeometry(8, 48, 48);
        var texture = new THREE.TextureLoader().load(linkImage);
        var material = new THREE.MeshBasicMaterial({ map: texture });
        button = new THREE.Mesh(geometry, material);
        // Floats between the low camera and the inscribed ceiling.
        button.position.set(0, 52, 0);

        button.material.side = THREE.FrontSide;
        button.name = 'button'
    }

    // Poneglyph-style monolith (artist reference: One Piece's 歷史本文) —
    // a massive stone block densely covered edge-to-edge in an invented
    // glyph script, with one readable "translated" band carrying the
    // epitaph. Everything is drawn into a canvas texture: procedural
    // stone mottling, a grid of random-stroke glyphs, and the engraved
    // English lines (chisel effect: dark cut + light lower edge, as if
    // lit from above).
    let makeGlyph = (ctx, x, y, cell, rng) => {
        const pad = cell * 0.18;
        const x0 = x + pad, y0 = y + pad, w = cell - pad * 2, h = cell - pad * 2;
        const strokes = 2 + Math.floor(rng() * 3);
        for (let s = 0; s < strokes; s++) {
            const kind = rng();
            ctx.beginPath();
            if (kind < 0.4) {
                // straight segment
                ctx.moveTo(x0 + rng() * w, y0 + rng() * h);
                ctx.lineTo(x0 + rng() * w, y0 + rng() * h);
            } else if (kind < 0.7) {
                // L-corner
                const mx = x0 + rng() * w, my = y0 + rng() * h;
                ctx.moveTo(x0 + rng() * w, my);
                ctx.lineTo(mx, my);
                ctx.lineTo(mx, y0 + rng() * h);
            } else if (kind < 0.9) {
                // arc
                ctx.arc(x0 + w * (0.3 + rng() * 0.4), y0 + h * (0.3 + rng() * 0.4),
                    w * (0.15 + rng() * 0.2), rng() * Math.PI * 2, rng() * Math.PI * 2 + Math.PI);
            } else {
                // dot
                const dx = x0 + rng() * w, dy = y0 + rng() * h;
                ctx.arc(dx, dy, w * 0.07, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
    }

    let createSteleTexture = (lines, withBand, opts = {}) => {
        const size = opts.size || 1024;
        const cell = opts.cell || 55;
        const margin = opts.margin || 34;
        const font = opts.font || 44;
        const lineHeight = opts.lineHeight || 66;
        const bandPad = opts.bandPad || 84;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Deterministic-enough PRNG so the glyph field is stable within a
        // playthrough (seeded off the chosen inscription for variety).
        let seed = 7 + lines.length * 13 + (withBand ? 0 : 101) + (opts.seedOffset || 0);
        const rng = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        // Stone base: deep violet-grey with soft mottling.
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, '#2e2947');
        grad.addColorStop(0.5, '#272240');
        grad.addColorStop(1, '#1e1a33');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Faded mural: the original poster artwork ghosted into the stone
        // like a weathered fresco — the era's imagery survives under the
        // later carving (artist request: keep some of the poster's feel).
        if (opts.mural) {
            const img = opts.mural;
            const scale = Math.max(size / img.width, size / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            // Poster-dominant blend (artist direction 2026-07-07): the
            // artwork IS the wall surface — stone grain and carving fuse
            // onto the print, not the other way around.
            ctx.globalAlpha = opts.muralAlpha || 0.88;
            ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
            ctx.globalAlpha = 1;
            // Violet veil pulls the mural's colors back into the palette —
            // kept light so the poster survives underneath.
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(112, 100, 156, ' + (opts.muralVeil != null ? opts.muralVeil : 0.4) + ')';
            ctx.fillRect(0, 0, size, size);
            ctx.globalCompositeOperation = 'source-over';
        }

        const mottleCount = Math.floor(2600 * (size / 1024) * (size / 1024));
        for (let i = 0; i < mottleCount; i++) {
            const mx = rng() * size, my = rng() * size, mr = (1 + rng() * 3) * (size / 1024);
            ctx.fillStyle = rng() < 0.5
                ? 'rgba(12, 9, 24, 0.10)'
                : 'rgba(196, 178, 240, 0.05)';
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.fill();
        }

        if (opts.glyphless) {
            return new THREE.CanvasTexture(canvas);
        }

        // Glyph field: full-bleed grid, skipping the central band that
        // the readable epitaph will occupy (glyph-only faces skip nothing).
        const cols = Math.floor((size - margin * 2) / cell);
        const rows = Math.floor((size - margin * 2) / cell);
        const bandHeight = withBand ? lines.length * lineHeight + bandPad : 0;
        const bandTop = withBand ? (size - bandHeight) / 2 : size * 2;
        const bandBottom = bandTop + bandHeight;
        const strokeScale = cell / 55;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // opts.glyphField === false skips the invented-script grid: once
        // the poster became the wall surface (2026-07-07), glyphs over the
        // artwork read as scribbled noise — the ancient register is
        // carried by the chiseled epitaph + stone grain alone.
        if (opts.glyphField !== false) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const gx = margin + c * cell;
                    const gy = margin + r * cell;
                    if (gy + cell > bandTop && gy < bandBottom) continue;
                    // Chisel: light lower edge first, dark cut on top.
                    ctx.lineWidth = 4.5 * strokeScale;
                    ctx.strokeStyle = 'rgba(200, 182, 245, 0.13)';
                    ctx.save();
                    ctx.translate(0, 2 * strokeScale);
                    makeGlyph(ctx, gx, gy, cell, (() => { let s2 = seed; return () => { s2 = (s2 * 16807) % 2147483647; return (s2 - 1) / 2147483646; }; })());
                    ctx.restore();
                    ctx.lineWidth = 4 * strokeScale;
                    ctx.strokeStyle = 'rgba(13, 10, 26, 0.78)';
                    makeGlyph(ctx, gx, gy, cell, rng);
                }
            }
        }

        // Readable band: slightly recessed strip with the epitaph.
        if (withBand) {
            const bandGrad = ctx.createLinearGradient(0, bandTop, 0, bandBottom);
            bandGrad.addColorStop(0, 'rgba(10, 8, 22, 0.55)');
            bandGrad.addColorStop(0.5, 'rgba(16, 12, 32, 0.35)');
            bandGrad.addColorStop(1, 'rgba(10, 8, 22, 0.55)');
            ctx.fillStyle = bandGrad;
            ctx.fillRect(0, bandTop, size, bandHeight);

            ctx.textAlign = 'center';
            ctx.font = '600 ' + font + 'px Georgia, "Times New Roman", serif';
            lines.forEach((line, i) => {
                const ly = bandTop + bandPad * 0.62 + font * 0.5 + i * lineHeight;
                // light lower edge → engraved under top light
                ctx.fillStyle = 'rgba(222, 206, 255, 0.42)';
                ctx.fillText(line, size / 2, ly + 3 * strokeScale);
                ctx.fillStyle = 'rgba(9, 6, 20, 0.95)';
                ctx.fillText(line, size / 2, ly);
            });
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    let resetPos = () => {
        // Free-look chamber framing: orbit target at the room's center,
        // camera low and pulled back so the arrival view tilts up toward
        // the inscribed ceiling — from there the viewer can drag to any
        // wall. (Note: distance limits are re-opened in enable(); the
        // opening act's maxDistance≈70 clamp would otherwise yank the
        // camera toward the target on the first controls.update().)
        camera.position.set(0, -45, 60);
        controls.target.set(0, 15, 0);
        controls.update();
    }

    function onMouseMove(event) {
        eventType = 'mousemove'
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    function clickMouse(event) {
        eventType = 'click'
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    function onKeyDown(event) {
        if (event.key === 'ArrowLeft') rotateDir = -1;
        if (event.key === 'ArrowRight') rotateDir = 1;
    }

    this.init = () => {
        initButton()
        initBackground()
        initTalismans()
        // window.addEventListener('touchstart', clickMouse, false);
        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('click'    , clickMouse, false)
        window.addEventListener('keydown'  , onKeyDown, false)
    }



    this.enable = () => {
        // Free look returns here (artist direction 2026-07-07): the
        // viewer can drag to explore the chamber — ceiling stele, poster
        // walls, floating portrait — while a gentle autoRotate keeps the
        // room drifting when idle. The opening act's tight distance
        // clamp (maxDistance ≈ 70) must be re-opened BEFORE resetPos's
        // controls.update(), or the camera gets yanked toward the target.
        this.controls.enabled = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 150;
        resetPos()
        this.scene.add(button);
        this.scene.add(bgMesh);
        this.scene.add(ceilingText);
        talismans.forEach((tal) => this.scene.add(tal.mesh));
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.8;
    }

    this.update = (camera) => {

        updateTalismans(camera);
        raycaster.setFromCamera(mouse, camera);

        // Tag game first: a click that lands on a free-flying charm pins
        // it to the slab (and doesn't fall through to the portrait).
        if (eventType == 'click') {
            const freeMeshes = talismans
                .filter((tal) => !tal.caught && tal.supMix < 0.5)
                .map((tal) => tal.mesh);
            const hit = raycaster.intersectObjects(freeMeshes)[0];
            if (hit) {
                catchCharm(talismans.find((tal) => tal.mesh === hit.object));
                eventType = '';
            }
        }

        let intersects = raycaster.intersectObjects([bgMesh, button]);

        if (intersects.length > 1) {
            if (eventType == 'mousemove') this.controls.autoRotateSpeed += rotateDir;
            if (eventType == 'click') {
                window.open('https://www.facebook.com/events/1852794901530594/');
                eventType = ''
            }
        } else {
            this.controls.autoRotateSpeed = 0.8 * rotateDir;
            eventType = ''
        }
        // Alternate summon: spin the chamber hard enough (the portrait
        // hover winds autoRotate up) and the whole flock pins itself.
        if (Math.abs(this.controls.autoRotateSpeed) > SPIN_SUMMON_SPEED && !completeT) {
            summonAll();
        }
        this.controls.update();
    }

    this.init()


}

export { Activity }