import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import maskPath from './models/mask3.gltf';
import headPath from './models/Taj.gltf';
import { MouseLight } from './MouseLight';
import { GlassSkin } from './GlassSkin';
import { SoftVolume } from './SoftVolume';
import { FiberForestBackground } from './FiberForestBackground';
import { HeadMove } from './HeadMove';
import { Activity } from './Activity';
import { Gravity } from './Gravity';
import { SoundHandler } from './SoundHandler';
import { TextLayer } from './TextLayer';
import domeImage from './images/gradient.jpeg';
import { Updater } from './core/Updater';
import { EventBus } from './core/EventBus';

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
        this.tweenBackgroundPalette('transition', 2000);
        this.cinematicBuildup(2000);
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

        if (this.headmove) this.headmove.changeMode('shake', this.camera, this.face, this.mesh);
      }, 1, 38.4);
      headFlake();
    };

    const headFlake = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) this.headmove.changeMode('flake', this.camera, this.face, this.mesh);
      }, 1, 53.5);
      headUp();
    };

    const headUp = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) this.headmove.changeMode('up', this.camera, this.face, this.mesh);
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
        if (this.headmove) this.headmove.changeMode('shake', this.camera, this.face, this.mesh);
      }, 2, 7);
      finalHeadUp();
    };

    const rotateHead = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) this.headmove.changeMode('rotate', this.camera, this.face, this.mesh);
      }, 4, 4);
    };

    const finalHeadUp = () => {
      this.soundHandler.schedule(() => {
        this.flash(true);
        const loader = new THREE.TextureLoader();
        this.bgTexture = loader.load(domeImage);
        this.scene.background = this.bgTexture;
        if (this.headmove) this.headmove.changeMode('up', this.camera, this.face, this.mesh);
      }, 3, 33);
      afterFlake();
    };

    const afterFlake = () => {
      this.soundHandler.schedule(() => {
        if (this.headmove) this.headmove.changeMode('flake', this.camera, this.face, this.mesh);
        this.setBackgroundPalette('reflection');
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
      model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.rotateY(2 * Math.PI);
          child.geometry.scale(0.15, 0.15, 0.15);
          child.geometry.translate(0, -5, 7);
          child.geometry.computeVertexNormals();
          this.mesh = child;
          this.mesh.name = 'mask';
          this.applyMaskMaterial(this.mesh);
          this.scene.add(this.mesh);
          this.initMode();
        }
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
  }

  setBackgroundPalette(name) {
    const palette = this.palettes[name];
    if (!palette) return;
    if (this.background && this.background.setPalette) {
      this.background.setPalette(palette);
    }
    if (this.maskMaterial && this.maskMaterial.userData.setRimColor) {
      this.maskMaterial.userData.setRimColor(palette.glow);
    }
  }

  tweenBackgroundPalette(name, duration = 1500) {
    const target = this.palettes[name];
    if (!target || !this.background) return;
    const fromBase = this.background.uniforms.uBaseColor.value.clone();
    const fromTip = this.background.uniforms.uTipColor.value.clone();
    const fromGlow = this.background.uniforms.uGlowColor.value.clone();
    const toBase = new THREE.Color(target.base);
    const toTip = new THREE.Color(target.tip);
    const toGlow = new THREE.Color(target.glow);
    const start = performance.now();
    const tick = () => {
      if (!this.background) return;
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const base = fromBase.clone().lerp(toBase, eased);
      const tip = fromTip.clone().lerp(toTip, eased);
      const glow = fromGlow.clone().lerp(toGlow, eased);
      this.background.setPalette({
        base: '#' + base.getHexString(),
        tip: '#' + tip.getHexString(),
        glow: '#' + glow.getHexString(),
      });
      if (this.maskMaterial && this.maskMaterial.userData.setRimColor) {
        this.maskMaterial.userData.setRimColor(glow);
      }
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
