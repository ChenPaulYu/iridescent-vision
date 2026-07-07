/**
 * app.js — orchestrator: timeline, mask material, scene wiring (★).
 *
 * Owns the Tone-driven narrative schedule (initSound), the mask's
 * material narrative (applyMaskMaterial: physical base + rim + dual
 * matcap rubber→chrome + tri-planar surface relief; attachOrnamentShell
 * for the mehndi/girih shell), and creates/retires every subsystem per
 * beat. All timing flows from SoundHandler cues — never wall-clock.
 *
 * Reads: FiberForestBackground · CosmicDome · EnvironmentDome ·
 * SoftVolume/Gravity/GlassSkin/HeadMove/Activity · core/PostPipeline ·
 * core/PaletteCoordinator · textures/generated/*
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import maskPath from './models/mask3.gltf';
import headPath from './models/Taj.gltf';
import { MouseLight } from './MouseLight';
import { GlassSkin } from './GlassSkin';
import { SoftVolume } from './SoftVolume';
import { FiberForestBackground } from './FiberForestBackground';
import { CosmicDome } from './CosmicDome';
import { EnvironmentDome } from './EnvironmentDome';
import { PrayerBeads } from './PrayerBeads';
import { HeadMove } from './HeadMove';
import { Activity } from './Activity';
import { Gravity } from './Gravity';
import { SoundHandler } from './SoundHandler';
import { TextLayer } from './TextLayer';
import matcapRubberPath from './textures/generated/matcap-rubber.jpg';
import matcapMagnetitePath from './textures/generated/matcap-magnetite.jpg';
import surfaceHeightPath from './textures/generated/surface-height.jpg';
import posterPath from './images/poster.jpg';
import { Updater } from './core/Updater';
import { EventBus } from './core/EventBus';
import { PostPipeline } from './core/PostPipeline';
import { getEasing } from './core/easing';
import { PaletteCoordinator } from './core/PaletteCoordinator';

class IridescentVisionApp {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.directionalLight = null;

    this.mesh = null;
    this.face = null;

    this.mouseLight = null;
    this.glassSkin = null;
    this.softVolume = null;
    this.background = null;
    this.cosmicDome = null;
    this.envDome = null;
    this.prayerBeads = null;
    this.goldFlakeState = { active: false, rate: 0, timer: 0 };
    this.gravity = null;
    this.headmove = null;
    this.activity = null;

    this.soundHandler = null;
    this.textLayer = null;
    this.maskMaterial = null;

    this.manager = new THREE.LoadingManager();
    this.managerLoad = 0;
    this.soundLoad = 0;
    this.totalLoad = 45;

    this.updater = new Updater();
    this.events = new EventBus();
    this.lastTime = 0;
    this.canvas = null;
    this.isStarted = false;
    this.palettes = {
      awakening: { base: '#11081a', tip: '#6044ff', glow: '#d5b4ff' },
      transition: { base: '#2a1240', tip: '#e070ff', glow: '#ffe8ff' },
      ascension: { base: '#1a1326', tip: '#ff6ac1', glow: '#ffd0ff' },
      orbit: { base: '#090a1c', tip: '#6ef1ff', glow: '#b2fff7' },
      veil: { base: '#0d0a24', tip: '#b46bff', glow: '#ffd9f4' },
      reflection: { base: '#140616', tip: '#9d60ff', glow: '#f4c2ff' },
    };

    this.animate = this.animate.bind(this);
    this.updateScene = this.updateScene.bind(this);
    this.onWindowResized = this.onWindowResized.bind(this);
    this.updaterHandle = this.updater.add(this.updateScene);
  }

  start() {
    this.disableZoom();
    this.init();
    this.animate();
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // Act 1 "curtain sanctuary" framing (mockup A): wide enough that the
    // tunnel/veil environment cocoons the goddess with dark void around.
    this.camera.position.set(0, 6, 74);

    // logarithmicDepthBuffer: the mask mesh (mask3.gltf) has two
    // very-slightly-separated shell faces that z-fight under the standard
    // non-linear depth buffer at the mask's actual camera distance (tens of
    // units) — that z-fighting, not any material/shader bug, was the real
    // cause of the "weird grid" seen on the mask surface across every beat
    // (confirmed 2026-07-06: the pattern matched the mesh's own wireframe
    // exactly and vanished with depthTest disabled). A log depth buffer
    // spreads precision evenly across the whole near/far range instead of
    // crushing it at distance. Custom mask ShaderMaterials must manually
    // include the logdepthbuf_vertex/fragment chunks — see
    // buildMatcapMaterial / buildMagnetFieldMaterial.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('#2c123a');
    this.canvas = this.renderer.domElement;
    this.canvas.style.opacity = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.transition = 'opacity 2.4s ease, filter 3.6s ease';
    this.canvas.style.filter = 'blur(26px)';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // The frame is a composed ritual shot — dragging never orbits or
    // pans the camera (that's SoftVolume's pull interaction alone), but
    // scroll/pinch zoom stays available for the audience to lean in.
    // `enabled` must stay true or zoom dies with it; Activity re-enables
    // rotate/pan for its own autoRotate finale.
    this.controls.enabled = true;
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = 20;
    this.controls.target.set(0, 4, 0);
    // maxDistance locked to the default framing itself (not a hardcoded
    // number that can drift out of sync with it) — zooming in is still
    // free, but the audience can never pull back further than the
    // composed opening shot.
    this.controls.maxDistance = this.camera.position.distanceTo(this.controls.target);
    this.controls.update();

    this.post = new PostPipeline(this.renderer, this.scene, this.camera);

    this.background = new FiberForestBackground(this.renderer, this.scene);
    this.envDome = new EnvironmentDome(this.scene);
    this.cosmicDome = new CosmicDome(this.renderer, this.scene);
    this.cosmicDome.enable();
    this.cosmicDome.setIntensity(0.25);
    this.cosmicDome.setAstrolabeIntensity(0.12);
    this.prayerBeads = new PrayerBeads(this.scene);
    this.prayerBeads.enable();
    this.prayerBeads.setIntensity(0);

    this.palette = new PaletteCoordinator(this.palettes.awakening);
    this.palette.register(this.background);
    this.palette.register(this.envDome);
    this.palette.register(this.cosmicDome);
    this.palette.register(this.prayerBeads);
    this.palette.register({
      setPalette: ({ glow, gold }) => {
        if (glow && this.maskMaterial && this.maskMaterial.userData.setRimColor) {
          this.maskMaterial.userData.setRimColor(glow);
        }
        if (this.ornamentUniforms) {
          if (gold) this.ornamentUniforms.uOrnamentGold.value.copy(gold);
          if (glow) this.ornamentUniforms.uOrnamentLavender.value.copy(glow);
        }
      },
    });
    this.setBackgroundPalette('awakening');

    this.initSound();
    this.textLayer = new TextLayer(() => this.handleStart());

    this.handleManager();
    this.initLight();
    this.initModel();
    this.registerKeyboardShortcuts();

    document.body.appendChild(this.renderer.domElement);
    this.initDocument();
    window.addEventListener('resize', this.onWindowResized, false);
  }

  initSound() {
    this.soundHandler = new SoundHandler((l) => this.soundOnProgress(l));
    this.soundHandler.schedule(() => {
      this.soundHandler.playBG();
      if (this.softVolume) this.softVolume.enable();
      if (this.background && !this.background.enabled) {
        this.background.enable();
      }
      // Faint dome fog from the very first breath — Act 1 mockup F:
      // the womb opening reveals depth, not flat black.
      if (this.envDome) {
        this.envDome.enable();
        this.envDome.setIntensity(0.32, 6000);
      }
      soft2Gravity();
    }, 0, 0);

    const soft2Gravity = () => {
      this.soundHandler.scheduleToneTime(() => {
        this.tweenBackgroundPalette('transition', 2000, 'easeInOutCubic');
        this.cinematicBuildup(2000);
        if (this.cosmicDome) {
          this.cosmicDome.setAstrolabeIntensity(0.28, 2000);
          this.cosmicDome.setIntensity(0.18, 2000);
        }
        this.tweenOrnament({ reveal: 1.0 }, 1800, 'easeInOutCubic');
      }, 27.5);

      this.soundHandler.scheduleToneTime(() => {
        this.cinematicFlash(900);
        // Material narrative beat: soft rubber body magnetizes behind
        // the flash — SoftVolume -> Gravity swaps mesh.material from
        // rubberMaterial to magnetMaterial at this exact moment.
        // The independent crystal-shell ornament hands its role to the
        // magnet material's own pole/pulse glow — fade the shell out so
        // it stops competing with the field lines (ornament redesign).
        this.tweenOrnament({ reveal: 0, thirdEye: 0 }, 1800, 'easeInOutCubic');

        if (this.softVolume) {
          this.softVolume.disable();
          this.softVolume.dispose();
          this.softVolume = undefined;
        }
        if (this.gravity) {
          this.gravity.enable();
          // Gravity.postLoop pulls every ball toward center every frame
          // and only ever scatters them on a real click/dblclick
          // (applyForce/applyAllForce in Gravity.js) — during normal
          // passive playback nothing ever fires that, so the balls just
          // clump onto one spot on the mask instead of orbiting (reported
          // 2026-07-06: "球散的好不平均"). Auto-pulse the scatter impulse
          // periodically for the whole Ascension window so they keep
          // circulating without needing a real click.
          this.gravity.applyN = true;
          if (this._gravityScatterInterval) clearInterval(this._gravityScatterInterval);
          this._gravityScatterInterval = setInterval(() => {
            if (this.gravity) this.gravity.applyN = true;
          }, 2600);
        }
        if (this.background) {
          this.background.direction = 'up';
          this.background.setVeilIntensity(0.5, 3500);
        }
        if (this.cosmicDome) {
          this.cosmicDome.setAstrolabeIntensity(0.55, 4000);
          this.cosmicDome.setTapestryIntensity(0.5, 3000);
        }
        // Ascension gets a first breath of the dome fog behind the
        // tunnel — the Act-3 environment leaking in early.
        if (this.envDome) {
          this.envDome.enable();
          this.envDome.setIntensity(0.3, 4500);
        }
        bumpFlash();
      }, 29.5);
    };

    const soft2Gravity2 = () => {
      this.soundHandler.schedule(() => {
        let count = 0;
        const interval = setInterval(() => {
          this.flash();
          count += 1;
          if (count > 5) clearInterval(interval);
        }, 200);

        if (this.softVolume) {
          this.softVolume.disable();
          this.softVolume.dispose();
          this.softVolume = undefined;
        }
        if (this.gravity) this.gravity.enable();
        if (this.background) this.background.direction = 'up';
        bumpFlash();
      }, 0, 30);
    };

    const bumpFlash = () => {
      this.soundHandler.schedule(() => {
        this.energyFlash(750);
        speedupBg();
      }, 0, 45);
    };

    const speedupBg = () => {
      this.soundHandler.schedule(() => {
        // Fades to full black over 700ms (reaching full at ~64.7s), holds
        // through gravity2Glass's actual scene swap at 67.5s, then fades
        // back in — the ascent "bursts through" into Orbit under a clean
        // cut instead of the new scene popping in mid-frame. Hold length
        // tracks the swap time: Orbit was revealing ~2s too early per
        // artist feedback (2026-07-07), so the swap moved 65.5→67.5 and
        // this hold stretched to keep it covered.
        this.blackoutTransition(3200, 700);
        if (this.background) {
          this.background.speedup = true;
          this.background.setVeilIntensity(1.0, 1200);
        }
        if (this.envDome) this.envDome.setIntensity(0.42, 1500);
        if (this.cosmicDome) {
          // Kept subtle here on purpose: the astrolabe's full bloom is
          // Orbit's "finished weave" reveal (gravity2Glass below) — at
          // full intensity here it competed with the still-opaque magnet
          // material for attention and buried the mask's actual form.
          this.cosmicDome.setAstrolabeIntensity(0.4, 800);
          this.cosmicDome.pulseAstrolabe(0.6, 700, 800);
        }
        // (Ornament shell stays hidden here — the magnet material's own
        // uTime-driven pulse already carries this beat's "energizing"
        // punctuation; see buildMagnetFieldMaterial.)
        this.setBackgroundPalette('ascension');
      }, 1, 4);
      gravity2Glass();
    };

    const gravity2Glass = () => {
      this.soundHandler.schedule(() => {
        if (this._gravityScatterInterval) {
          clearInterval(this._gravityScatterInterval);
          this._gravityScatterInterval = undefined;
        }
        if (this.gravity) this.gravity.disable();
        this.gravity = null;
        this.testTransparent(2300);
        if (this.post) this.post.setGodrayIntensity(0, 1800);
        if (this.envDome) {
          this.envDome.enable();
          this.envDome.setIntensity(0.5, 3200);
        }
        this.headmove = new HeadMove(this.renderer, this.camera, this.scene, this.face, this.mesh, this.controls);
        this.headmove.enable(this.camera, this.face, this.mesh);
        this.setBackgroundPalette('orbit');
        if (this.cosmicDome) {
          this.cosmicDome.setIntensity(1.0, 2500);
          // Full astrolabe bloom belongs here — the "finished weave"
          // reveal, now that the mask is transparent/refractive and can
          // actually show the grid through glass instead of competing
          // with an opaque face for attention.
          this.cosmicDome.setAstrolabeIntensity(1.0, 2000);
          this.cosmicDome.bloomYantra(1500);
          this.cosmicDome.setMantraIntensity(0.7, 4000);
          this.cosmicDome.setTapestryIntensity(0, 2500);
        }
        // "Twin Opening" third-eye motif now lives inside the glass
        // itself — light fracturing along facet seams as she becomes
        // transparent — rather than an opaque shell floating in front
        // of a see-through mask (ornament redesign). Independent shell
        // stays hidden; only its third-eye glow gets a last faint echo.
        if (this.glassSkin) this.glassSkin.setFractureIntensity(0.65, 2600);
        this.tweenOrnament({ thirdEye: 0.15 }, 2500, 'easeOutQuart');
        if (this.prayerBeads) this.prayerBeads.setIntensity(1.0, 1800);
      }, 1, 7.5);
      shakeHead();
    };

    const shakeHead = () => {
      this.soundHandler.schedule(() => {
        if (this.mouseLight) this.mouseLight.disable();
        this.flash(true);
        let count = 0;
        const interval = setInterval(() => {
          this.flash(true);
          count += 1;
          if (count > 2) clearInterval(interval);
        }, 1850);
        if (this.envDome) this.envDome.setIntensity(0.62, 2500);

        this.setHeadmoveMode('shake');
      }, 1, 38.4);
      headFlake();
    };

    // The whole tail below was rescaled 2026-07-06: bgm.mp3 is only
    // ~128.5s long, but this sequence had drifted out to firing at
    // 213s/224s/244s/250s — 84+ seconds after the music actually ends
    // ("頭沒有消失" / "好像停在這了": the dispersal + portrait cues were
    // registered, just scheduled into dead silence long after the track
    // was over). Restored to the original pre-dispersal-effects timing
    // (git history: shakeHead 98.4s → flake 113.5s → up 122s → shake
    // 125s → rotate 127s → portrait 129s, ending right as the track
    // does) and folded the later-added dispersal payload (decompose,
    // gold flakes, ornament shatter, reflection palette) into the 113.5s
    // flake cue instead of its own disconnected slot, and finalHeadUp's
    // flash/envDome bump into this 122s up cue.
    const headFlake = () => {
      this.soundHandler.schedule(() => {
        this.setHeadmoveMode('flake');
        this.setBackgroundPalette('reflection');
        if (this.cosmicDome) this.cosmicDome.decompose(8000);
        this.tweenOrnament({ flake: 0.95, thirdEye: 0, reveal: 0.1 }, 8000, 'easeOutExpo');
        if (this.prayerBeads) this.prayerBeads.setIntensity(0, 6000);
        this.goldFlakeState.active = true;
        this.goldFlakeState.rate = 22;
        this.goldFlakeState.timer = 0;
        setTimeout(() => {
          this.goldFlakeState.rate = 0;
          this.goldFlakeState.active = false;
        }, 9000);
      }, 1, 53.5);
      headUp();
    };

    const headUp = () => {
      this.soundHandler.schedule(() => {
        this.flash(true);
        if (this.envDome) this.envDome.setIntensity(0.78, 2200);
        this.setHeadmoveMode('up');
      }, 2, 2);
      rotateHead();
      shakeHead2();
    };

    const shakeHead2 = () => {
      this.soundHandler.schedule(() => {
        this.flash(true);
        let count = 0;
        const interval = setInterval(() => {
          this.flash(true);
          count += 1;
          if (count > 2) clearInterval(interval);
        }, 800);
        this.setHeadmoveMode('shake');
      }, 2, 3);
    };

    const rotateHead = () => {
      this.soundHandler.schedule(() => {
        this.setHeadmoveMode('rotate');
        // Scene breath for the III→IV turn: as the head begins to
        // rotate, the palette slides into a deeper veil register and
        // the dome dims toward intimacy (user-requested beat).
        this.tweenBackgroundPalette('veil', 5000, 'easeInOutCubic');
        if (this.envDome) this.envDome.setIntensity(0.5, 4000);
        if (this.cosmicDome) this.cosmicDome.setMantraIntensity(0.85, 4000);
        // Final exit (2026-07-06, "頭沒有飛出去"): 'rotate' mode's own
        // camera pull-back reads as the camera retreating, not the head
        // actually leaving. Give the mask/face a genuine accelerating
        // upward+outward push for the ~2s remaining before the portrait
        // cuts in, so the ending reads as her flying off rather than
        // just fading in place.
        const flyStart = performance.now();
        const flyDuration = 2200;
        const flyOut = () => {
          const t = Math.min((performance.now() - flyStart) / flyDuration, 1);
          const speed = t * t;
          if (this.mesh) {
            this.mesh.position.y += speed * 2.4;
            this.mesh.position.z -= speed * 1.7;
          }
          if (this.face) {
            this.face.position.y += speed * 2.4;
            this.face.position.z -= speed * 1.7;
          }
          if (t < 1) requestAnimationFrame(flyOut);
        };
        requestAnimationFrame(flyOut);
      }, 2, 7);
      enableActivity();
    };

    const enableActivity = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) {
          this.headmove.disable();
          this.headmove = undefined;
        }
        if (this.mesh) this.mesh.visible = false;
        if (this.face) this.face.visible = false;
        if (this.envDome) this.envDome.disable();
        if (this.cosmicDome) this.cosmicDome.setIntensity(0.15, 3000);
        if (this.prayerBeads) this.prayerBeads.setIntensity(0, 1500);
        this.activity = new Activity(this.camera, this.scene, this.controls);
        this.activity.enable();
      }, 2, 9);
    };

  }

  initDocument() {
    document.body.style.margin = '0px';
    document.body.style.height = '100%';
    // The piece begins in darkness — never show a white page.
    document.body.style.background = '#050208';
  }

  initLight() {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.position.set(-1, -0.4, 1);
    this.scene.add(this.directionalLight);
    this.scene.add(new THREE.DirectionalLight(0xffffff, 0.5));
  }

  initModel() {
    const loader = new GLTFLoader(this.manager);

    loader.load(maskPath, (gltf) => {
      const model = gltf.scene;
      let processed = false;
      model.traverse((child) => {
        if (processed || !child.isMesh) return;
        processed = true;
        child.geometry.rotateY(2 * Math.PI);
        child.geometry.scale(0.15, 0.15, 0.15);
        child.geometry.translate(0, -5, 7);
        child.geometry.computeVertexNormals();
        this.mesh = child;
        this.mesh.name = 'mask';
        this.applyMaskMaterial(this.mesh);
        this.scene.add(this.mesh);
        this.initMode();
      });
    });

    loader.load(headPath, (gltf) => {
      this.face = gltf.scene;
      this.face.position.set(1, -4, -18);
      this.face.scale.set(0.1, 0.1, 0.1);
      this.face.rotation.set(0, Math.PI, 0);
      this.face.name = 'face';
      this.scene.add(this.face);
    });
  }

  initMode() {
    this.mouseLight = new MouseLight(this.scene, this.camera, this.soundHandler);
    this.gravity = new Gravity(this.scene, this.mesh, this.soundHandler);
    this.softVolume = new SoftVolume(this.scene, this.mesh, true, this.soundHandler);
  }

  applyMaskMaterial(mesh) {
    // r110 notes: transmission/thickness/sheenRoughness don't exist in
    // this three version, and a numeric `sheen` poisons the uniform
    // update with NaN (r110 expects a Color) — which silently made the
    // whole mask body invisible. Keep to r110-supported params only.
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2a1031'),
      metalness: 0.2,
      roughness: 0.25,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.985,
    });
    const rimColor = new THREE.Color('#d8b5ff');

    // NOTE: this base material is essentially never seen on screen.
    // SoftVolume/Gravity/GlassSkin each swap `mesh.material` wholesale
    // for their beat and restore this one only for a same-tick gap in
    // between (see docs/vision.md "mask material relay"). Real material
    // identity per beat lives in the dedicated materials built below,
    // which SoftVolume/Gravity actually assign — keep this one simple.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimColor.clone() };
      shader.uniforms.uRimStrength = { value: 0.7 };
      shader.uniforms.uRimExponent = { value: 2.3 };
      shader.fragmentShader = `
        uniform vec3 uRimColor;
        uniform float uRimStrength;
        uniform float uRimExponent;
      ` + shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float rimDot = clamp(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0, 1.0);
         float rim = pow(1.0 - rimDot, uRimExponent);
         vec3 rimCol = uRimColor * rim * uRimStrength;
         vec4 diffuseColor = vec4(diffuse + rimCol, opacity);`
      );
      material.userData.shader = shader;
    };
    material.userData.setRimColor = (color) => {
      const shader = material.userData.shader;
      if (!shader) return;
      shader.uniforms.uRimColor.value.set(color);
    };
    mesh.material = material;
    this.maskMaterial = material;

    const texLoader = new THREE.TextureLoader();
    const matcapRubber = texLoader.load(matcapRubberPath);
    const matcapMagnetite = texLoader.load(matcapMagnetitePath);
    const surfaceTex = texLoader.load(surfaceHeightPath);
    surfaceTex.wrapS = THREE.RepeatWrapping;
    surfaceTex.wrapT = THREE.RepeatWrapping;

    // Rubber-gel body for Awakening (SoftVolume swaps this in) — the
    // goddess's touchable, embodied material (docs/asset-brief Asset 2A).
    mesh.userData.rubberMaterial = this.buildMatcapMaterial(matcapRubber, surfaceTex, { gain: 1.55 });
    // Magnetic field for Ascension (Gravity swaps this in) — tool-making
    // energy magnetizes her, field lines converging pole to pole, not a
    // mirror-chrome surface (see project memory: scene 2 is magnet, not metal).
    // matcapMagnetite (docs/asset-brief Asset 2C) gives it an actual dull,
    // granular mineral surface identity — the field-line/fresnel shader
    // logic layers on top of this instead of a flat multiplied color.
    mesh.userData.magnetMaterial = this.buildMagnetFieldMaterial(mesh, surfaceTex, matcapMagnetite);

    this.attachOrnamentShell(mesh);
    if (this.palette) this.palette.broadcast();
  }

  // Shared matcap-sampling material (no three lighting pipeline —
  // deterministic and cheap): used for Awakening's rubber body.
  // SoftVolume swaps it in on enable() and restores the base material
  // on disable().
  buildMatcapMaterial(matcapTexture, surfaceTexture, { gain = 1.0 } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMatcap: { value: matcapTexture },
        uSurfaceTex: { value: surfaceTexture },
        uSurfaceScale: { value: 0.24 },
        uSurfaceAmount: { value: 0.13 },
        uGain: { value: gain },
      },
      vertexShader: /* glsl */`
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vP;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = -mv.xyz;
          vP = position;
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: /* glsl */`
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D uMatcap;
        uniform sampler2D uSurfaceTex;
        uniform float uSurfaceScale;
        uniform float uSurfaceAmount;
        uniform float uGain;
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vP;

        float surfaceHeight(vec3 p, vec3 n) {
          vec3 an = abs(n);
          an /= (an.x + an.y + an.z + 0.0001);
          float hx = texture2D(uSurfaceTex, p.yz * uSurfaceScale).r;
          float hy = texture2D(uSurfaceTex, p.xz * uSurfaceScale).r;
          float hz = texture2D(uSurfaceTex, p.xy * uSurfaceScale).r;
          return hx * an.x + hy * an.y + hz * an.z;
        }

        void main() {
          vec3 n = normalize(vN);
          vec3 viewDir = normalize(vV);
          vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
          vec3 y = cross(viewDir, x);
          float h = surfaceHeight(vP, n);
          vec2 uv = vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5;
          uv += (h - 0.5) * uSurfaceAmount;
          // Rubber matcap is the darkest asset by design (docs/asset-brief) —
          // needs gain on the near-black stage to read as plum-lavender.
          vec3 col = texture2D(uMatcap, uv).rgb * uGain;
          col *= 0.72 + 0.56 * h;
          gl_FragColor = vec4(col, 1.0);
          #include <logdepthbuf_fragment>
        }
      `,
    });
  }

  // Ascension's magnetic-field material: dipole field lines are
  // procedural (pole axis = mesh's local Y, crown to chin; meridian arcs
  // converge geometrically at both poles, brightened near the poles with
  // a slow pole-to-pole pulse), but the body itself now samples a real
  // dark-magnetite matcap (docs/asset-brief Asset 2C) instead of a flat
  // multiplied color — the earlier flat version read as synthetic/plain
  // even after the fresnel rim fixed its legibility.
  buildMagnetFieldMaterial(mesh, surfaceTexture, matcapTexture) {
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    const center = bb.getCenter(new THREE.Vector3());
    const axisHalf = (bb.max.y - bb.min.y) / 2;

    return new THREE.ShaderMaterial({
      uniforms: {
        uMatcap: { value: matcapTexture },
        uSurfaceTex: { value: surfaceTexture },
        uSurfaceScale: { value: 0.16 },
        uAxisCenter: { value: center },
        uAxisHalf: { value: axisHalf },
        uGain: { value: 1.35 },
        uLineColor: { value: new THREE.Color('#c9b8ff') },
        uRimColor: { value: new THREE.Color('#a690ff') },
        uLineCount: { value: 11.0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */`
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vN;
        varying vec3 vP;
        varying vec3 vViewPos;
        void main() {
          vN = normalize(normalMatrix * normal);
          vP = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: /* glsl */`
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D uMatcap;
        uniform sampler2D uSurfaceTex;
        uniform float uSurfaceScale;
        uniform vec3 uAxisCenter;
        uniform float uAxisHalf;
        uniform float uGain;
        uniform vec3 uLineColor;
        uniform vec3 uRimColor;
        uniform float uLineCount;
        uniform float uTime;
        varying vec3 vN;
        varying vec3 vP;
        varying vec3 vViewPos;

        void main() {
          vec3 rel = vP - uAxisCenter;
          float t = clamp(rel.y / uAxisHalf, -1.0, 1.0);
          float theta = acos(t);
          float azimuth = atan(rel.z, rel.x);

          // Meridian arcs converge geometrically at both poles; a few
          // bold lines (not fine fractal lace — legibility at distance).
          float linePattern = pow(max(0.0, cos(azimuth * uLineCount)), 32.0);

          // Field density reads brighter near the poles, dim at the
          // equator — physically the field a dipole actually produces.
          float poleBoost = clamp(1.0 - sin(theta), 0.0, 1.0);

          // Slow pulse of energy traveling pole-to-pole.
          float flow = fract(theta / 3.14159265 * 2.0 - uTime * 0.1);
          float pulse = smoothstep(0.0, 0.18, flow) * smoothstep(0.42, 0.18, flow);

          float lineBrightness = linePattern * (0.3 + poleBoost * 0.85 + pulse * 0.5);

          float h = texture2D(uSurfaceTex, rel.xy * uSurfaceScale).r;

          // Matcap sample (same technique as the rubber body): view-space
          // normal projected into the capture sphere's UV space, so the
          // dull granular magnetite reads as a real material rather than
          // a flat multiplied color.
          vec3 viewDir = normalize(-vViewPos);
          vec3 n = normalize(vN);
          vec3 mx = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
          vec3 my = cross(viewDir, mx);
          vec2 matcapUv = vec2(dot(mx, n), dot(my, n)) * 0.495 + 0.5;
          matcapUv += (h - 0.5) * 0.06;
          vec3 base = texture2D(uMatcap, matcapUv).rgb * uGain;

          // Fresnel rim: the field-line pattern alone gave no cue to the
          // mask's actual 3D form (vN was computed but never sampled) —
          // the whole head read as a flat dark blob except right at the
          // poles. This brings the silhouette/volume back without
          // brightening the magnetite body itself.
          float fresnel = pow(1.0 - max(0.0, dot(n, viewDir)), 2.2);
          vec3 rim = uRimColor * fresnel * 0.85;

          vec3 color = base + uLineColor * lineBrightness + rim;

          gl_FragColor = vec4(color, 1.0);
          #include <logdepthbuf_fragment>
        }
      `,
    });
  }

  attachOrnamentShell(mesh) {
    const ornamentUniforms = {
      uOrnamentReveal: { value: 0.35 },
      uThirdEyeReveal: { value: 0 },
      uOrnamentPulse: { value: 0 },
      uOrnamentFlow: { value: 0 },
      uOrnamentFlake: { value: 0 },
      uIridescentShift: { value: 0.85 },
      uOrnamentGold: { value: new THREE.Color('#f0e0ff') },
      uOrnamentLavender: { value: new THREE.Color('#9d80e0') },
      uOrnamentCyan: { value: new THREE.Color('#a8f0ec') },
      uTime: { value: 0 },
    };

    // Per-vertex pattern + view-dependent iridescent colour mix in
    // fragment. Three hues (gold / lavender / cyan) blend based on the
    // viewing-angle dot product, so the same surface shimmers as the
    // mask rotates — true iridescence, not flat gold.
    const ornamentVertex = `
      varying vec3 vLocalPos;
      varying vec3 vWorldNormal;
      varying float vFacing;

      void main() {
        vLocalPos = position;
        vec3 inflated = position + normal * 0.06;
        vec4 viewPos = modelViewMatrix * vec4(inflated, 1.0);
        vec3 viewDir = normalize(-viewPos.xyz);
        vWorldNormal = normalize(normalMatrix * normal);
        vFacing = max(0.0, dot(vWorldNormal, viewDir));
        gl_Position = projectionMatrix * viewPos;
      }
    `;

    // Per-fragment noise gives proper broken / organic texture rather
    // than the smooth gradient that vertex-baked patterns produce.
    // Kept cheap: 1-octave hash noise (no fbm loop), single trig
    // ridge, single smoothstep. View-dependent iridescent mix on top.
    const ornamentFragment = `
      uniform float uTime;
      uniform float uOrnamentReveal;
      uniform float uThirdEyeReveal;
      uniform float uOrnamentPulse;
      uniform float uOrnamentFlow;
      uniform float uOrnamentFlake;
      uniform float uIridescentShift;
      uniform vec3 uOrnamentGold;
      uniform vec3 uOrnamentLavender;
      uniform vec3 uOrnamentCyan;
      varying vec3 vLocalPos;
      varying vec3 vWorldNormal;
      varying float vFacing;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      // Returns: x = distance to cell centre, y = distance to second
      // closest centre (so y - x = distance to nearest edge), z = a
      // per-cell hash for tinting.
      vec3 voronoi(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float d1 = 8.0;
        float d2 = 8.0;
        vec2 nearestCell = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 cell = vec2(float(x), float(y));
            vec2 jitter = hash2(i + cell) * 0.8 + 0.1;
            vec2 r = cell + jitter - f;
            float d = dot(r, r);
            if (d < d1) {
              d2 = d1; d1 = d;
              nearestCell = i + cell;
            } else if (d < d2) {
              d2 = d;
            }
          }
        }
        return vec3(sqrt(d1), sqrt(d2), hash(nearestCell));
      }

      void main() {
        // Two coordinate frames: structural ridges + organic noise.
        vec2 p = vLocalPos.xy * 4.0;
        float flow = uOrnamentFlow * uTime * 0.5;
        float ridges = sin(p.y * 2.2 + flow) * cos(p.x * 1.7 - flow * 0.6);
        float noise = vnoise(p * 1.6 + vec2(flow * 0.3, 0.0));

        // Voronoi facet pattern — gives crystal-shell texture.
        vec2 voronoiP = vLocalPos.xy * 0.9 + vec2(flow * 0.2, 0.0);
        vec3 vor = voronoi(voronoiP);
        float edgeDist = vor.y - vor.x;
        float facetEdge = 1.0 - smoothstep(0.0, 0.15, edgeDist);
        float cellTint = vor.z;

        // Combine: ridges define the line, noise breaks it up.
        float fabric = abs(ridges) * (0.65 + 0.45 * noise);
        float pattern = smoothstep(0.5, 0.85, fabric);

        // Forehead third-eye region.
        float foreheadY = smoothstep(1.2, 2.8, vLocalPos.y);
        float foreheadCenter = 1.0 - smoothstep(0.0, 1.0, abs(vLocalPos.x));
        float eye = foreheadY * foreheadCenter * uThirdEyeReveal;

        // Reveal / pulse / flake modulation.
        float pulse = 1.0 + sin(uTime * 1.3) * 0.35 * uOrnamentPulse;
        float flakeMask = 1.0 - uOrnamentFlake * (0.55 + 0.45 * noise);

        // BASE coverage so the whole face shimmers iridescent (oil-on-
        // water effect) — face never reads flat once reveal is on.
        float baseCoverage = uOrnamentReveal * 0.55 * pulse * flakeMask;
        // PATTERN layer adds bright ridges on top of the base shimmer.
        float patternLayer = pattern * uOrnamentReveal * pulse * flakeMask * 1.0;
        // FACET edges glow brighter (crystal-shell effect).
        float facetLayer = facetEdge * uOrnamentReveal * 1.4 * pulse;
        // EYE layer for the third-eye region.
        float eyeLayer = eye * 1.4;

        float total = baseCoverage + patternLayer + facetLayer + eyeLayer;
        if (total < 0.005) discard;

        // Three-colour iridescent: viewing angle picks base hue, time
        // and noise add per-position swirl, plus per-facet hue offset
        // so every cell of the crystal shell has its own tint.
        float facing = pow(vFacing, 1.4);
        vec3 viewBase = mix(uOrnamentLavender, uOrnamentGold, facing);
        vec3 viewHi = mix(viewBase, uOrnamentCyan, pow(vFacing, 4.5) * 0.85);

        float swirlShift = noise * 1.4
                         + sin(uTime * 0.5 + vLocalPos.y * 2.5) * 0.55
                         + sin(uTime * 0.7 + vLocalPos.x * 3.2) * 0.45;
        vec3 oilFilm = mix(viewHi, uOrnamentCyan, swirlShift * 0.35 * uIridescentShift);
        oilFilm = mix(oilFilm, uOrnamentLavender, smoothstep(0.55, 1.0, noise) * 0.4);

        // Per-cell hue: each voronoi facet gets a distinct tint pulled
        // from the iridescent triad based on the cell's hash value.
        vec3 cellHueA = mix(uOrnamentLavender, uOrnamentCyan, cellTint);
        vec3 cellHueB = mix(uOrnamentGold, uOrnamentLavender, cellTint);
        vec3 cellHue = mix(cellHueA, cellHueB, cellTint * cellTint);
        oilFilm = mix(oilFilm, cellHue, 0.45 * uIridescentShift);

        gl_FragColor = vec4(oilFilm * total * 1.35, total * 0.82);
      }
    `;

    const ornamentMat = new THREE.ShaderMaterial({
      uniforms: ornamentUniforms,
      vertexShader: ornamentVertex,
      fragmentShader: ornamentFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });

    const ornamentMesh = new THREE.Mesh(mesh.geometry, ornamentMat);
    ornamentMesh.name = 'maskOrnament';
    ornamentMesh.renderOrder = 1;
    ornamentMesh.frustumCulled = false;
    mesh.add(ornamentMesh);

    this.ornamentMesh = ornamentMesh;
    this.ornamentUniforms = ornamentUniforms;
  }

  setBackgroundPalette(name) {
    const palette = this.palettes[name];
    if (!palette || !this.palette) return;
    this.palette.setPalette(palette);
  }

  tweenBackgroundPalette(name, duration = 1500, easingName = 'easeInOutCubic') {
    const target = this.palettes[name];
    if (!target || !this.palette) return;
    this.palette.tweenPalette(target, duration, easingName);
  }

  // Shorthand -> real uniform name. NOTE: a naive 'u' + capitalize
  // (e.g. reveal -> uReveal) does NOT match this shell's actual names
  // (uOrnamentReveal, uThirdEyeReveal, ...) and silently no-ops — every
  // tweenOrnament call in the timeline except iridescentShift was dead
  // until this map existed (found 2026-07-06 while redesigning the
  // ornament to hand off per-beat instead of floating over every
  // material). Keep this table in sync with attachOrnamentShell's
  // uniform names.
  static ORNAMENT_ALIASES = {
    reveal: 'uOrnamentReveal',
    thirdEye: 'uThirdEyeReveal',
    pulse: 'uOrnamentPulse',
    flow: 'uOrnamentFlow',
    flake: 'uOrnamentFlake',
    iridescentShift: 'uIridescentShift',
  };

  tweenOrnament(targets, durationMs = 1500, easingName = 'easeInOutCubic') {
    if (!this.ornamentUniforms) return;
    const state = this.ornamentUniforms;
    const ease = getEasing(easingName);
    const start = {};
    const end = {};
    for (const key of Object.keys(targets)) {
      const uniformKey = key.startsWith('u')
        ? key
        : (IridescentVisionApp.ORNAMENT_ALIASES[key] || ('u' + key[0].toUpperCase() + key.slice(1)));
      if (state[uniformKey]) {
        start[uniformKey] = state[uniformKey].value;
        end[uniformKey] = targets[key];
      }
    }
    const startTime = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / durationMs, 1);
      const eased = ease(t);
      for (const key of Object.keys(end)) {
        state[key].value = start[key] + (end[key] - start[key]) * eased;
      }
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  setHeadmoveMode(mode) {
    if (this.headmove) {
      this.headmove.changeMode(mode, this.camera, this.face, this.mesh);
    }
    if (this.cosmicDome) {
      this.cosmicDome.resonateWith(mode);
    }
    if (this.prayerBeads) {
      this.prayerBeads.resonateWith(mode);
    }
  }

  cinematicBuildup(duration = 2000) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, rgba(220, 180, 255, 0.55) 0%, rgba(140, 90, 200, 0.22) 45%, transparent 80%);
      pointer-events: none;
      z-index: 9998;
      opacity: 0;
      transition: opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    });
    setTimeout(() => {
      overlay.style.transition = `opacity 700ms ease-out`;
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 800);
    }, duration + 100);
  }

  cinematicFlash(duration = 900) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: #f0e8ff;
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
      transition: opacity ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1);
    `;
    document.body.appendChild(overlay);

    // Expanding shockwave ring behind the white pop — reads as the
    // flash physically radiating out of the goddess.
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: 12vmin;
      height: 12vmin;
      margin: -6vmin 0 0 -6vmin;
      border-radius: 50%;
      border: 3px solid rgba(232, 214, 255, 0.9);
      box-shadow: 0 0 40px 12px rgba(200, 160, 255, 0.55),
                  inset 0 0 30px 6px rgba(200, 160, 255, 0.4);
      pointer-events: none;
      z-index: 9998;
      opacity: 0.95;
      filter: blur(1px);
      transform: scale(1);
      transition: transform ${duration + 500}ms cubic-bezier(0.16, 0.84, 0.3, 1),
                  opacity ${duration + 500}ms ease-out;
    `;
    document.body.appendChild(ring);

    if (this.post) this.post.pulseBloom(1.6, duration + 300);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        ring.style.transform = 'scale(14)';
        ring.style.opacity = '0';
      });
    });
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (ring.parentNode) ring.parentNode.removeChild(ring);
    }, duration + 700);
  }

  // Ascension's mid-beat punctuation (bumpFlash, t=45s). Redesigned
  // 2026-07-06 as the "can you see the light?" lyric moment (user
  // request) — an iris-close-then-snap-open rather than a flat pulse:
  // the frame narrows like eyes drawing shut, then blows open into a
  // blown-out white flash with the astrolabe geometry flaring to full
  // brightness for an instant (a glimpse of the "light" the lyric
  // names) before settling back to Ascension's normal subdued register,
  // with a longer/stronger bloom surge than the standard punctuation
  // flash it replaced. Earlier passes: a center-radial gradient (too
  // faint against the bright tunnel), then a flat full-screen wash
  // (visible but generic) — this version is the deliberate "wow" beat.
  energyFlash(duration = 900) {
    const iris = document.createElement('div');
    iris.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, transparent 0%, transparent 22%, rgba(4, 2, 10, 0.97) 72%);
      pointer-events: none;
      z-index: 9998;
      opacity: 0;
      transition: opacity 340ms ease-in;
    `;
    document.body.appendChild(iris);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        iris.style.opacity = '1';
      });
    });

    const astrolabeBaseline = this.cosmicDome ? this.cosmicDome.astrolabeIntensity : null;

    setTimeout(() => {
      // Snap open: the iris vanishes almost instantly, replaced by the
      // blown-out flash — the "seeing the light" instant.
      iris.style.transition = 'opacity 90ms ease-out';
      iris.style.opacity = '0';

      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: #fbf7ff;
        pointer-events: none;
        z-index: 9999;
        opacity: 1;
        transition: opacity ${duration}ms cubic-bezier(0.16, 0.84, 0.3, 1);
      `;
      document.body.appendChild(flash);

      const ring = document.createElement('div');
      ring.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        width: 8vmin;
        height: 8vmin;
        margin: -4vmin 0 0 -4vmin;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 0 60px 20px rgba(220, 200, 255, 0.7),
                    inset 0 0 40px 10px rgba(220, 200, 255, 0.5);
        pointer-events: none;
        z-index: 9998;
        opacity: 1;
        transform: scale(1);
        transition: transform ${duration + 600}ms cubic-bezier(0.16, 0.84, 0.3, 1),
                    opacity ${duration + 600}ms ease-out;
      `;
      document.body.appendChild(ring);

      if (this.post) this.post.pulseBloom(2.1, duration + 500);
      if (this.cosmicDome) {
        this.cosmicDome.setAstrolabeIntensity(1.0, 120);
        setTimeout(() => {
          this.cosmicDome.setAstrolabeIntensity(astrolabeBaseline != null ? astrolabeBaseline : 0.4, 900);
        }, duration + 200);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flash.style.opacity = '0';
          ring.style.transform = 'scale(16)';
          ring.style.opacity = '0';
        });
      });

      setTimeout(() => {
        if (iris.parentNode) iris.parentNode.removeChild(iris);
        if (flash.parentNode) flash.parentNode.removeChild(flash);
        if (ring.parentNode) ring.parentNode.removeChild(ring);
      }, duration + 700);
    }, 340);
  }

  // Ascension→Orbit "burst through the sky" cut (user request 2026-07-06):
  // a genuine full blackout like a scene change, not just a flash — timed
  // to fully cover gravity2Glass's actual scene swap (fiber background
  // disposal, GlassSkin/HeadMove construction) underneath a clean black
  // beat, so the ascent reads as breaking through into a new register
  // rather than the new scene popping in.
  blackoutTransition(holdMs = 1000, fadeMs = 700) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000000;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity ${fadeMs}ms ease-in;
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    });
    setTimeout(() => {
      overlay.style.transition = `opacity ${fadeMs}ms ease-out`;
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, fadeMs + 100);
    }, fadeMs + holdMs);
  }

  updateScene(delta = 0) {
    if (!this.renderer || !this.camera || !this.isStarted) return;
    if (this.softVolume) this.softVolume.update(this.camera);
    if (this.glassSkin) this.glassSkin.update(this.renderer, this.camera);
    if (this.mouseLight) this.mouseLight.update(this.mesh);
    if (this.background) {
      this.background.update(delta, this.camera, this.mesh, this.face);
      if (this.background.direction === 'up' && this.background.speedupAmount > 0.5) {
        // Stronger ascent (was 4.5 — read as too timid/"不夠灑脫") plus a
        // camera counter-dip: the camera holds its ground while she
        // surges upward, instead of just drifting in a static frame —
        // sells the liftoff as a g-force moment rather than a slow float.
        // Safe to leave unbounded here: HeadMove.resetPos() (fired at
        // the 'flake' mode change, 1:53.5) resets camera/mesh/face
        // positions outright, so this never accumulates past Ascension.
        const lift = delta * this.background.speedupAmount * 8.5;
        if (this.mesh) this.mesh.position.y += lift;
        if (this.face) this.face.position.y += lift;
        if (this.camera) this.camera.position.y -= delta * this.background.speedupAmount * 0.4;
      }
    }
    if (this.cosmicDome) this.cosmicDome.update(delta);
    if (this.envDome) this.envDome.update(delta, this.camera);
    if (this.mesh && this.mesh.userData.magnetMaterial) {
      this.mesh.userData.magnetMaterial.uniforms.uTime.value += delta;
    }
    if (this.ornamentUniforms) {
      this.ornamentUniforms.uTime.value += delta;
      if (this.ornamentMesh) {
        const r = this.ornamentUniforms.uOrnamentReveal.value;
        const e = this.ornamentUniforms.uThirdEyeReveal.value;
        this.ornamentMesh.visible = r > 0.02 || e > 0.02;
      }
    }
    if (this.prayerBeads && this.mesh) this.prayerBeads.update(delta, this.mesh.position);
    if (this.goldFlakeState.active && this.cosmicDome && this.mesh) {
      this.goldFlakeState.timer += delta;
      const interval = 1 / Math.max(this.goldFlakeState.rate, 0.01);
      while (this.goldFlakeState.timer >= interval) {
        this.goldFlakeState.timer -= interval;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 4.5;
        const offset = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * r,
          Math.sin(phi) * Math.sin(theta) * r,
          Math.cos(phi) * r
        );
        const spawnPos = this.mesh.position.clone().add(offset);
        const outward = offset.clone().normalize().multiplyScalar(1.6 + Math.random() * 1.4);
        outward.y += (Math.random() - 0.3) * 0.6;
        this.cosmicDome.spawnDust({
          position: spawnPos,
          velocity: outward,
          count: 2,
          tint: 0xffd95c,
          lifetime: 5.0 + Math.random() * 2.0,
          scale: 1.4 + Math.random() * 0.8,
        });
      }
    }
    if (this.gravity && this.face) {
      const offset = this.face.position.clone().add(new THREE.Vector3(-2, 0, 23));
      this.gravity.update(offset);
    }
    if (this.headmove && this.face && this.mesh && this.controls && this.directionalLight) {
      this.headmove.update(this.face, this.mesh, this.controls, this.directionalLight);
    }
    if (this.activity && this.camera) this.activity.update(this.camera);
  }

  animate(time = 0) {
    requestAnimationFrame(this.animate);
    if (!this.renderer || !this.camera) return;
    const delta = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    if (this.isStarted) {
      this.updater.update(delta);
      if (this.post) {
        this.post.render(delta);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  handleLoading() {
    if (this.textLayer && this.textLayer.setProgress) {
      this.textLayer.setProgress((this.soundLoad + this.managerLoad) / this.totalLoad);
    }
    if (this.soundLoad + this.managerLoad < this.totalLoad) return;
    this.warmShaders();
    if (this.textLayer) this.textLayer.addButton('CLICK');
  }

  // Compile every shader program while the loading screen is still up,
  // including the magnet-field material that otherwise compiles mid-
  // flash at t=29.5 — the single worst jank moment of the piece.
  warmShaders() {
    if (this._shadersWarmed || !this.renderer || !this.camera || !this.mesh) return;
    this._shadersWarmed = true;
    const warmMeshes = [];
    const magnet = this.mesh.userData.magnetMaterial;
    if (magnet) {
      const m = new THREE.Mesh(new THREE.PlaneBufferGeometry(0.001, 0.001), magnet);
      m.frustumCulled = false;
      warmMeshes.push(m);
    }
    warmMeshes.forEach((m) => this.scene.add(m));
    if (this.envDome) this.envDome.enable();
    this.renderer.compile(this.scene, this.camera);
    warmMeshes.forEach((m) => this.scene.remove(m));
  }

  soundOnProgress(loaded) {
    this.soundLoad = loaded;
    this.handleLoading();
  }

  handleManager() {
    this.manager.onProgress = (url, itemsLoaded) => {
      this.managerLoad = itemsLoaded;
      this.handleLoading();
    };

    this.manager.onError = (url) => {
      console.log('There was an error loading ' + url);
    };
  }

  registerKeyboardShortcuts() {
    window.addEventListener(
      'keydown',
      (e) => {
        const keyID = e.code;
        if (!this.isStarted) return;
        if (keyID === 'KeyA') {
          if (this.gravity) {
            this.gravity.disable();
            this.gravity = null;
          }
          this.testTransparent(2300);
          this.headmove = new HeadMove(this.renderer, this.camera, this.scene, this.face, this.mesh, this.controls);
          this.headmove.enable(this.camera, this.face, this.mesh);
          e.preventDefault();
        }
        if (keyID === 'KeyB') {
          if (this.gravity) {
            this.gravity.disable();
            this.gravity = null;
          }
          if (this.mouseLight) this.mouseLight.disable();
          if (this.glassSkin) this.glassSkin.disable();
          this.testSoft();
          e.preventDefault();
        }
        if (keyID === 'KeyC') {
          this.testOrigin();
          if (this.gravity) {
            this.gravity.disable();
            this.gravity = null;
          }
          e.preventDefault();
        }
        if (keyID === 'KeyD') {
          if (this.mouseLight) this.mouseLight.disable();
          if (this.glassSkin) this.glassSkin.disable();
          if (this.gravity) {
            this.gravity.disable();
            this.gravity = null;
          }
          this.testBackground();
          e.preventDefault();
        }
        if (keyID === 'KeyE') {
          if (this.camera) this.camera.position.x += 1;
          if (this.mesh) this.mesh.position.z -= 1;
          e.preventDefault();
        }
        if (keyID === 'KeyF') {
          if (this.softVolume) {
            this.softVolume.disable();
            this.softVolume.dispose();
            this.softVolume = undefined;
          }
          if (!this.gravity && this.mesh) {
            this.gravity = new Gravity(this.scene, this.mesh, this.soundHandler);
          }
          if (this.gravity) this.gravity.enable();
          if (this.background) this.background.direction = 'up';
          e.preventDefault();
        }
        if (keyID === 'KeyG') {
          if (this.gravity) {
            this.gravity.applyN = true;
          }
          e.preventDefault();
        }
        if (keyID === 'KeyO') {
          if (this.background) {
            this.background.speedup = true;
          }
        }
        if (keyID === 'KeyI') {
          if (this.background) this.backgroundFlash('#343161');
          else this.backgroundFlash('#5a2c7f');
        }
        if (keyID === 'KeyQ') {
          this.headmove = new HeadMove(this.renderer, this.camera, this.scene, this.face, this.mesh, this.controls);
          this.headmove.enable(this.camera, this.face, this.mesh);
        }
        if (keyID === 'KeyW' && this.headmove) {
          this.headmove.changeMode('shake', this.camera, this.face, this.mesh);
        }
        if (keyID === 'KeyE' && this.headmove) {
          this.headmove.changeMode('flake', this.camera, this.face, this.mesh);
        }
        if (keyID === 'KeyR' && this.headmove) {
          this.headmove.changeMode('up', this.camera, this.face, this.mesh);
        }
        if (keyID === 'KeyT' && this.headmove) {
          this.headmove.changeMode('rotate', this.camera, this.face, this.mesh);
        }
        if (keyID === 'KeyU') {
          if (this.headmove) {
            this.headmove.disable();
            this.headmove = undefined;
          }
          this.activity = new Activity(this.camera, this.scene, this.controls);
          this.activity.enable();
        }
      },
      false
    );
  }

  testBackground() {
    if (!this.controls) return;
    this.controls.enabled = false;

    if (!this.background) {
      this.background = new FiberForestBackground(this.renderer, this.scene);
      this.background.enable();
    } else {
      this.background.disable();
      this.background = undefined;
    }
  }

  testOrigin() {
    if (this.controls) this.controls.enabled = true;
    if (this.directionalLight) this.directionalLight.intensity = 0.5;
    if (this.mouseLight) this.mouseLight.disable();
    if (this.glassSkin) this.glassSkin.disable();
    if (this.softVolume) this.softVolume.disable();
  }

  testTransparent(time) {
    if (this.background) {
      this.background.disable('#000000');
      // Free the fiber forest's GPU buffers for good — it never
      // returns after the glass phase begins.
      this.background.dispose();
      this.background = undefined;
    }
    if (this.directionalLight) this.directionalLight.intensity = 0;

    if (!this.glassSkin && this.scene && this.mesh) {
      this.glassSkin = new GlassSkin(this.scene, this.mesh);
    }
    if (this.glassSkin) this.glassSkin.enable();

    setTimeout(() => {
      if (!this.mouseLight && this.scene && this.camera) {
        this.mouseLight = new MouseLight(this.scene, this.camera, this.soundHandler);
      }
      if (this.mouseLight) this.mouseLight.enable();
      if (this.renderer) this.renderer.setClearColor('#5a2c7f');
    }, time);
  }

  testSoft() {
    if (this.controls) this.controls.enabled = false;
    if (this.directionalLight) this.directionalLight.intensity = 0.5;
    if (!this.softVolume && this.scene && this.mesh) {
      this.softVolume = new SoftVolume(this.scene, this.mesh, true, this.soundHandler);
    }
    if (this.softVolume) this.softVolume.enable();
  }

  flash(visible = false) {
    if (this.background) this.backgroundFlash('#343161', visible);
    else this.backgroundFlash('#5a2c7f', visible);
  }

  backgroundFlash(color, visible) {
    if (this.face) this.face.visible = visible;
    if (this.mesh) this.mesh.visible = visible;
    const domeWasVisible = this.envDome && this.envDome.enabled && this.envDome.mesh.visible;
    if (!visible) {
      if (Math.floor(Math.random() * 2)) {
        this.renderer.setClearColor('#1a0f24');
      } else {
        this.renderer.setClearColor('#311a47');
      }
    } else {
      // Blink the dome off for one beat so the flash reads as a burst
      // of darkness behind the goddess (was: scene.background swap).
      if (domeWasVisible) this.envDome.mesh.visible = false;
      this.renderer.setClearColor('#311a47');
    }

    setTimeout(() => {
      if (visible && domeWasVisible) {
        this.envDome.mesh.visible = true;
      }
      this.renderer.setClearColor(color);
      if (this.face) this.face.visible = true;
      if (this.mesh) this.mesh.visible = true;
    }, 100);
  }

  onWindowResized() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.post) this.post.setSize(w, h);
  }

  disableZoom() {
    document.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    let lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      false
    );
  }

  handleStart() {
    if (this.isStarted) return;
    this.isStarted = true;
    // Hard cut (user direction 2026-07-07, after trying a held-darkness
    // pause): no pause, no fade — click lands directly inside the fully
    // formed scene, canvas at full opacity/sharpness, veil and god rays
    // already at strength, Transport starting on the same tick.
    if (this.background) {
      this.background.enable();
      this.background.setVeilIntensity(1.0, 0);
    }
    // "Underwater" god-ray register for Awakening/Ascension (user request
    // 2026-07-06) — faded out at the Orbit transition (gravity2Glass),
    // since Orbit reads as transcendent glass/void, not submerged.
    if (this.post) this.post.setGodrayIntensity(0.6, 0);
    if (this.canvas) {
      this.canvas.style.transition = 'none';
      this.canvas.style.opacity = '1';
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.filter = 'none';
    }
    if (this.soundHandler) this.soundHandler.start();
    // Warm the finale's 4.6MB poster into browser cache during Act 1's
    // quiet — Activity's TextureLoader then hits cache instead of the
    // network mid-piece.
    setTimeout(() => {
      const img = new Image();
      img.src = posterPath;
    }, 9000);
  }
}

const app = new IridescentVisionApp();
app.start();

if (typeof window !== 'undefined') {
  window.__app = app;
}
