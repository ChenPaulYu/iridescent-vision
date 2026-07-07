import * as THREE from 'three';
import bgImage from './images/poster.jpg'
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
        // Full inscription on the two z walls, untranslated glyph fields
        // on the x walls. (A stanza-per-wall split was tried — "要旋轉才
        // 看得完" — but with 2-3 walls visible at once and every band at
        // the same eye level, adjacent stanzas collided into garbage at
        // the corners; the room read as one broken run-on sentence.)
        // The inscription lives OVERHEAD (artist direction 2026-07-07:
        // "放在我們的頭頂") — the epitaph is carved into the chamber's
        // ceiling and the closing camera lies low, gazing up at it while
        // it slowly circles: history's weight hanging over the viewer.
        // Walls stay untranslated glyph fields; floor stays plain stone.
        // Smaller type + wider leading than the first overhead pass —
        // the epitaph breathes instead of running edge-to-edge.
        const wallOpts = { size: 2048, cell: 112, margin: 64, font: 72, lineHeight: 128, bandPad: 220, glyphField: false };
        const buildWallTextures = (mural) => {
            const ceiling = createSteleTexture(steleInscription, true, Object.assign({}, wallOpts, { mural: mural }));
            const glyph = createSteleTexture([], false, Object.assign({}, wallOpts, { seedOffset: 977, mural: mural }));
            // Viewed from inside a box, every face shows its back —
            // textures render mirrored. Walls flip horizontally; the
            // ceiling (+y face seen from below) flips on the other axis.
            glyph.wrapS = THREE.RepeatWrapping;
            glyph.repeat.x = -1;
            ceiling.wrapT = THREE.RepeatWrapping;
            ceiling.repeat.y = -1;
            return { ceiling: ceiling, glyph: glyph };
        };

        const wallTextures = buildWallTextures(null);
        const stoneTexture = createSteleTexture([], false, Object.assign({}, wallOpts, { size: 512, glyphless: true }));

        const mat = (map) => new THREE.MeshBasicMaterial({ map: map, side: THREE.BackSide });
        // Face order: +x, -x, +y (ceiling), -y (floor), +z, -z.
        let bgMaterials = [
            mat(wallTextures.glyph),
            mat(wallTextures.glyph),
            mat(wallTextures.ceiling),
            mat(stoneTexture),
            mat(wallTextures.glyph),
            mat(wallTextures.glyph),
        ];

        bgMesh = new THREE.Mesh(bgCube, bgMaterials);
        bgMesh.name = 'bg'

        // The poster mural bakes in asynchronously: walls appear as plain
        // carved stone for the instant the 4.6MB image (usually already
        // browser-cached by Act 1's prewarm) takes to decode, then the
        // fresco fades up under the glyphs via texture swap.
        const posterImg = new Image();
        posterImg.onload = () => {
            const muralTextures = buildWallTextures(posterImg);
            [0, 1, 2, 4, 5].forEach((face) => {
                const material = bgMesh.material[face];
                if (material.map) material.map.dispose();
                material.map = face === 2 ? muralTextures.ceiling : muralTextures.glyph;
                material.needsUpdate = true;
            });
        };
        posterImg.src = bgImage;
    }

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
        // Lying-in-the-tomb framing: camera low, target high overhead, so
        // the ceiling inscription fills the view and autoRotate slowly
        // circles beneath it. Not dead-vertical — OrbitControls gets
        // unstable as the polar angle reaches 0, and a slight tilt keeps
        // one glyph wall grazing the frame edge for depth.
        camera.position.set(0, -42, 44);
        controls.target.set(0, 100, 0);
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

    this.init = () => {
        initButton()
        initBackground()
        // window.addEventListener('touchstart', clickMouse, false);
        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('click'    , clickMouse, false)
    }



    this.enable = () => {
        resetPos()
        this.scene.add(button);
        this.scene.add(bgMesh);
        this.controls.autoRotate = true;
        this.controls.enabled = false;
    }

    this.update = (camera) => {
    
        raycaster.setFromCamera(mouse, camera);
    
        let intersects = raycaster.intersectObjects([bgMesh, button]);

        if (intersects.length > 1) {
            if (eventType == 'mousemove') this.controls.autoRotateSpeed += 1;
            if (eventType == 'click') {
                window.open('https://www.facebook.com/events/1852794901530594/');
                eventType = ''
            }
        } else {
            this.controls.autoRotateSpeed = 2;
            eventType = ''
        }
        if (controls.autoRotate) this.controls.update();
    }

    this.init()


}

export { Activity }