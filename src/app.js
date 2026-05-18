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
import { PrayerBeads } from './PrayerBeads';
import { HeadMove } from './HeadMove';
import { Activity } from './Activity';
import { Gravity } from './Gravity';
import { SoundHandler } from './SoundHandler';
import { TextLayer } from './TextLayer';
import domeImage from './images/gradient.jpeg';
import { Updater } from './core/Updater';
import { EventBus } from './core/EventBus';
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

    this.bgTexture = null;

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
    this.camera.position.set(0, 10, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('#2c123a');
    this.canvas = this.renderer.domElement;
    this.canvas.style.opacity = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.transition = 'opacity 1s ease';
    this.canvas.style.filter = 'blur(10px)';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enable = true;

    this.background = new FiberForestBackground(this.renderer, this.scene);
    this.cosmicDome = new CosmicDome(this.renderer, this.scene);
    this.cosmicDome.enable();
    this.cosmicDome.setIntensity(0.25);
    this.cosmicDome.setAstrolabeIntensity(0.12);
    this.prayerBeads = new PrayerBeads(this.scene);
    this.prayerBeads.enable();
    this.prayerBeads.setIntensity(0);

    this.palette = new PaletteCoordinator(this.palettes.awakening);
    this.palette.register(this.background);
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
      if (this.background && !this.background.enabled) this.background.enable();
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

        if (this.softVolume) {
          this.softVolume.disable();
          this.softVolume.dispose();
          this.softVolume = undefined;
        }
        if (this.gravity) this.gravity.enable();
        if (this.background) this.background.direction = 'up';
        if (this.cosmicDome) {
          this.cosmicDome.setAstrolabeIntensity(0.55, 4000);
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
        let count = 0;
        const interval = setInterval(() => {
          this.flash();
          count += 1;
          if (count > 5) clearInterval(interval);
        }, 200);
        speedupBg();
      }, 0, 45);
    };

    const speedupBg = () => {
      this.soundHandler.schedule(() => {
        if (this.background) {
          this.background.speedup = true;
        }
        if (this.cosmicDome) {
          this.cosmicDome.setAstrolabeIntensity(1.0, 800);
          this.cosmicDome.pulseAstrolabe(1.0, 700, 800);
        }
        this.tweenOrnament({ pulse: 1.0, iridescentShift: 0.4 }, 1500, 'spikeAndReturn');
        this.setBackgroundPalette('ascension');
      }, 1, 4);
      gravity2Glass();
    };

    const gravity2Glass = () => {
      this.soundHandler.schedule(() => {
        if (this.gravity) this.gravity.disable();
        this.gravity = null;
        this.testTransparent(2300);
        this.headmove = new HeadMove(this.renderer, this.camera, this.scene, this.face, this.mesh, this.controls);
        this.headmove.enable(this.camera, this.face, this.mesh);
        this.setBackgroundPalette('orbit');
        if (this.cosmicDome) {
          this.cosmicDome.setIntensity(1.0, 2500);
          this.cosmicDome.bloomYantra(1500);
          this.cosmicDome.setMantraIntensity(0.7, 4000);
        }
        this.tweenOrnament({ flow: 1.0, thirdEye: 1.0, iridescentShift: 1.0 }, 1500, 'easeOutQuart');
        if (this.prayerBeads) this.prayerBeads.setIntensity(1.0, 1800);
      }, 1, 5.5);
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
        const loader = new THREE.TextureLoader();
        this.bgTexture = loader.load(domeImage);
        this.scene.background = this.bgTexture;

        this.setHeadmoveMode('shake');
      }, 1, 38.4);
      headFlake();
    };

    const headFlake = () => {
      this.soundHandler.schedule(() => {
        this.setHeadmoveMode('flake');
      }, 1, 53.5);
      headUp();
    };

    const headUp = () => {
      this.soundHandler.schedule(() => {
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
      }, 2, 7);
      finalHeadUp();
    };

    const rotateHead = () => {
      this.soundHandler.schedule(() => {
        this.setHeadmoveMode('rotate');
      }, 4, 4);
    };

    const finalHeadUp = () => {
      this.soundHandler.schedule(() => {
        this.flash(true);
        const loader = new THREE.TextureLoader();
        this.bgTexture = loader.load(domeImage);
        this.scene.background = this.bgTexture;
        this.setHeadmoveMode('up');
      }, 3, 33);
      afterFlake();
    };

    const afterFlake = () => {
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
      }, 3, 44);
      enableActivity();
    };

    const enableActivity = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) {
          this.headmove.disable();
          this.headmove = undefined;
        }
        this.activity = new Activity(this.camera, this.scene, this.controls);
        this.activity.enable();
      }, 2, 9);
    };

  }

  initDocument() {
    document.body.style.margin = '0px';
    document.body.style.height = '100%';
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
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2a1031'),
      metalness: 0.2,
      roughness: 0.25,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      transmission: 0.12,
      thickness: 0.85,
      sheen: 1.0,
      sheenRoughness: 0.6,
      transparent: true,
      opacity: 0.95,
    });
    const rimColor = new THREE.Color('#d8b5ff');
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimColor.clone() };
      shader.uniforms.uRimStrength = { value: 0.7 };
      shader.uniforms.uRimExponent = { value: 2.3 };
      shader.fragmentShader = shader.fragmentShader.replace(
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
    this.attachOrnamentShell(mesh);
    if (this.palette) this.palette.broadcast();
  }

  attachOrnamentShell(mesh) {
    const ornamentUniforms = {
      uOrnamentReveal: { value: 0.35 },
      uThirdEyeReveal: { value: 0 },
      uOrnamentPulse: { value: 0 },
      uOrnamentFlow: { value: 0 },
      uOrnamentFlake: { value: 0 },
      uIridescentShift: { value: 0.5 },
      uOrnamentGold: { value: new THREE.Color('#b8860b') },
      uOrnamentLavender: { value: new THREE.Color('#d8b5ff') },
      uOrnamentCyan: { value: new THREE.Color('#b2fff7') },
      uTime: { value: 0 },
    };

    // Per-vertex pattern + view-dependent iridescent colour mix in
    // fragment. Three hues (gold / lavender / cyan) blend based on the
    // viewing-angle dot product, so the same surface shimmers as the
    // mask rotates — true iridescence, not flat gold.
    const ornamentVertex = `
      uniform float uOrnamentFlow;
      uniform float uTime;
      varying float vPattern;
      varying float vForehead;
      varying float vFacing;

      void main() {
        float ridge = sin(position.y * 8.0 + uTime * 0.6 * uOrnamentFlow)
                    * cos(position.x * 6.5 - uTime * 0.4 * uOrnamentFlow);
        vPattern = smoothstep(0.75, 0.95, abs(ridge));

        float foreheadY = smoothstep(1.2, 2.8, position.y);
        float foreheadCenter = 1.0 - smoothstep(0.0, 1.0, abs(position.x));
        vForehead = foreheadY * foreheadCenter;

        vec3 inflated = position + normal * 0.06;
        vec4 viewPos = modelViewMatrix * vec4(inflated, 1.0);
        vec3 viewDir = normalize(-viewPos.xyz);
        vec3 worldNormal = normalize(normalMatrix * normal);
        vFacing = max(0.0, dot(worldNormal, viewDir));

        gl_Position = projectionMatrix * viewPos;
      }
    `;

    const ornamentFragment = `
      uniform float uTime;
      uniform float uOrnamentReveal;
      uniform float uThirdEyeReveal;
      uniform float uOrnamentPulse;
      uniform float uOrnamentFlake;
      uniform float uIridescentShift;
      uniform vec3 uOrnamentGold;
      uniform vec3 uOrnamentLavender;
      uniform vec3 uOrnamentCyan;
      varying float vPattern;
      varying float vForehead;
      varying float vFacing;

      void main() {
        float pulse = 1.0 + sin(uTime * 1.3) * 0.3 * uOrnamentPulse;
        float flakeMask = 1.0 - uOrnamentFlake * (0.6 + 0.4 * sin(vPattern * 30.0 + uTime));
        float orn = vPattern * uOrnamentReveal * pulse * flakeMask;
        float eye = vForehead * uThirdEyeReveal;

        float total = orn + eye;
        if (total < 0.01) discard;

        // View-dependent iridescent mix.
        float facing = pow(vFacing, 1.4);
        vec3 base = mix(uOrnamentLavender, uOrnamentGold, facing);
        vec3 hued = mix(base, uOrnamentCyan, pow(vFacing, 5.0) * 0.65);

        // Small time-based shimmer modulated by uIridescentShift.
        float shimmer = sin(uTime * 0.7 + vPattern * 12.0) * 0.5 + 0.5;
        vec3 finalCol = mix(hued, uOrnamentLavender, shimmer * 0.18 * uIridescentShift);

        gl_FragColor = vec4(finalCol * total * 1.3, total * 0.85);
      }
    `;

    const ornamentMat = new THREE.ShaderMaterial({
      uniforms: ornamentUniforms,
      vertexShader: ornamentVertex,
      fragmentShader: ornamentFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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

  tweenOrnament(targets, durationMs = 1500, easingName = 'easeInOutCubic') {
    if (!this.ornamentUniforms) return;
    const state = this.ornamentUniforms;
    const ease = getEasing(easingName);
    const start = {};
    const end = {};
    for (const key of Object.keys(targets)) {
      const uniformKey = key.startsWith('u') ? key : 'u' + key[0].toUpperCase() + key.slice(1);
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
    });
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, duration + 200);
  }

  updateScene(delta = 0) {
    if (!this.renderer || !this.camera || !this.isStarted) return;
    if (this.softVolume) this.softVolume.update(this.camera);
    if (this.glassSkin) this.glassSkin.update(this.renderer, this.camera);
    if (this.mouseLight) this.mouseLight.update(this.mesh);
    if (this.background) {
      this.background.update(delta, this.camera, this.mesh, this.face);
      if (this.background.direction === 'up' && this.background.speedupAmount > 0.5) {
        const lift = delta * this.background.speedupAmount * 4.5;
        if (this.mesh) this.mesh.position.y += lift;
        if (this.face) this.face.position.y += lift;
      }
    }
    if (this.cosmicDome) this.cosmicDome.update(delta);
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
      this.renderer.render(this.scene, this.camera);
    }
  }

  handleLoading() {
    if (this.soundLoad + this.managerLoad < this.totalLoad) return;
    if (this.textLayer) this.textLayer.addButton('CLICK');
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
    if (!visible) {
      if (Math.floor(Math.random() * 2)) {
        this.renderer.setClearColor('#1a0f24');
      } else {
        this.renderer.setClearColor('#311a47');
      }
    } else {
      this.scene.background = undefined;
      this.renderer.setClearColor('#311a47');
    }

    setTimeout(() => {
      if (visible) {
        this.scene.background = this.bgTexture;
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
    if (this.background) this.background.enable();
    if (this.canvas) {
      this.canvas.style.opacity = '1';
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.filter = 'none';
    }
    if (this.soundHandler) this.soundHandler.start();
  }
}

const app = new IridescentVisionApp();
app.start();

if (typeof window !== 'undefined') {
  window.__app = app;
}
