import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import maskPath from './models/mask3.gltf';
import headPath from './models/Taj.gltf';
import { MouseLight } from './MouseLight';
import { GlassSkin } from './GlassSkin';
import { SoftVolume } from './SoftVolume';
import { Background } from './Background'
import { HeadMove } from './HeadMove'
import {Activity} from './Activity'
import { Gravity } from './Gravity'
import { SoundHandler } from './SoundHandler';
import {TextLayer} from './TextLayer';
import domeImage from './images/gradient.jpeg';

var camera, scene, renderer;

var mesh, face; //model mesh
var mouseLight, glassSkin; // use for transparent effect
var softVolume; // use for softvolume effect

var background, gravity, headmove, activity;
var controls;
var directionalLight;

var soundHandler;
var textLayer;

var manager = new THREE.LoadingManager();
var managerLoad = 0;
var soundLoad = 0;
var totalLoad = 25+20;

var bgTexture;


init();
animate();

function initSound() {
    soundHandler = new SoundHandler(soundOnProgress);
    soundHandler.schedule(() => {
        soundHandler.playBG();
        softVolume.enable();
        background.enable();
        soft2Gravity();
    }, 0, 0);
    
    let soft2Gravity = () => {
        soundHandler.scheduleToneTime(()=>{

            var count = 0
            var interval = setInterval(() => {
                flash();
                count += 1
                if (count > 10) { clearInterval(interval) }
            }, 100);

            if (softVolume) {
                softVolume.disable();
                softVolume.dispose();
                softVolume = undefined;
            }
            gravity.enable()
            background.direction = 'up'
            bumpFlash();
        }, 29.5);
    }
    let soft2Gravity2 = () => {
        soundHandler.schedule(()=>{
            var count = 0
            var interval = setInterval(() => {
                flash()
                count += 1
                if (count > 5) { clearInterval(interval) }
            }, 200);

            if (softVolume) {
                softVolume.disable();
                softVolume.dispose();
                softVolume = undefined;
            }
            //gravity = new Gravity(scene, mesh, soundHandler);
            gravity.enable()
            background.direction = 'up'
            bumpFlash();
        }, 0, 30);
    }
    
    let bumpFlash = () => {
        soundHandler.schedule(() => {
            var count = 0
            var interval = setInterval(() => {
                flash()
                count += 1
                if (count > 5) {clearInterval(interval)}
            }, 200);
            speedupBg();
        }, 0, 45);
    }

    let speedupBg = () => {
        soundHandler.schedule(() => {
            if (background) {
                background.speedup = true
            }
            
        }, 1, 4);
        gravity2Glass();
    }
    
    let gravity2Glass = () => {
        soundHandler.schedule(() => {
            gravity.disable()
            gravity = null
            testTransparent(2300);
            headmove = new HeadMove(renderer, camera, scene, face, mesh, controls)
            headmove.enable(camera, face, mesh)
        }, 1, 5.5);
        shakeHead();
    }
    
    let shakeHead = () =>{
        soundHandler.schedule(() => {
            if (mouseLight) mouseLight.disable();
            flash(true);
            var count = 0
            var interval = setInterval(() => {
                flash(true)
                count += 1
                if (count > 2) {clearInterval(interval)}
            }, 1850);
            const loader = new THREE.TextureLoader();
            bgTexture = loader.load(domeImage);
            scene.background = bgTexture;

            headmove.changeMode('shake', camera, face, mesh)
            
        }, 1, 38.4);
        headFlake();
    }

    
    let headFlake = () => {
        soundHandler.schedule(() => {
            headmove.changeMode('flake', camera, face, mesh)
        }, 1, 53.5);
        headUp();
    }

    let headUp = () => {
        soundHandler.schedule(() => {
            headmove.changeMode('up', camera, face, mesh)
        }, 2, 2);
        rotateHead();
        shakeHead2();
    }

    let shakeHead2 = () => {
        soundHandler.schedule(() => {
            headmove.changeMode('shake', camera, face, mesh)
        }, 2, 5);
        rotateHead();
    }

    let rotateHead = () => {
        soundHandler.schedule(() => {
            headmove.changeMode('rotate', camera, face, mesh)
        }, 2, 7);
        showActivity();
    }

    let showActivity = () => {
        soundHandler.schedule(() => {
            directionalLight.intensity = 1
            if (headmove) {
                headmove.disable()
                headmove = undefined
            }
            activity = new Activity(camera, scene, controls)
            activity.enable();
        }, 2, 9);
    }    

    
}

function init() {
    disableZoom();
    let width = window.innerWidth
    let height = window.innerHeight
    
    

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 10, 50);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor('#2c123a');

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enable = true;
    background = new Background(renderer, scene);

    initSound();
    textLayer = new TextLayer(()=>{soundHandler.start();});

    handleManager();
    initLight();
    initModel();



    document.body.appendChild(renderer.domElement);
    initDocument()
    window.addEventListener( 'resize', onWindowResized, false );
}



function initDocument () {
    document.querySelector('body').style.margin = "0px"; 
    document.querySelector('body').style.height = "100%"; 

}




function initLight() {
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(-1, -0.4, 1);
    scene.add(directionalLight);
    scene.add(new THREE.DirectionalLight(0xffffff, 0.5));
}


function initModel() {
    let loader = new GLTFLoader(manager);

    loader.load(maskPath, gltf => {
        let model = gltf.scene
        model.traverse(child => {
            if (child.isMesh) {
                child.geometry.rotateY(2 * Math.PI);
                child.geometry.scale(0.15, 0.15, 0.15)
                child.geometry.translate(0, -5, 7)
                child.geometry.computeVertexNormals();
                mesh = child;
                mesh.name = 'mask'
                scene.add(mesh);
                initMode();
            }
        })

    });

    loader.load(headPath, gltf => {
        face = gltf.scene;
        face.position.set(1, -4, -18);
        face.scale.set(0.1, 0.1, 0.1);
        face.rotation.set(0, Math.PI, 0);
        face.name = 'face';
        scene.add(face);
    });

}

function initMode() {
    mouseLight = new MouseLight(scene, camera, soundHandler);
    gravity = new Gravity(scene, mesh, soundHandler);
    softVolume = new SoftVolume(scene, mesh, true, soundHandler);
    // let gui = new dat.GUI();
    // softVolume.setGUI(gui);
    //softVolume.enable();
    //gravity.enable();
}


function animate() {
    requestAnimationFrame(animate);
    if (softVolume) softVolume.update(camera);
    if (glassSkin) glassSkin.update(renderer, camera);
    if (mouseLight) mouseLight.update(mesh);
    if (background) background.update(camera, mesh, face);
    if (gravity) gravity.update(face.position.clone().add(new THREE.Vector3(-2,0,23)));
    if (headmove) headmove.update(face, mesh, controls, directionalLight)
    if (activity) activity.update(camera)
    
    renderer.render(scene, camera);
    //handleLoading();
    

}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }


function handleLoading() {
    if (soundLoad + managerLoad < totalLoad) return;
    textLayer.addButton('CLICK');
}

function soundOnProgress(l) {
    soundLoad = l;    
    handleLoading();
}

function handleManager() {

    manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
        managerLoad = itemsLoaded;
        handleLoading();
        //console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    };
    
    manager.onError = function ( url ) {
        console.log( 'There was an error loading ' + url );
    };
}


function testEvent() {
    window.addEventListener('keydown', function (e) {
        var keyID = e.code;
        if (keyID === 'KeyA') {
            gravity.disable()
            gravity = null
            testTransparent(2300);
            headmove = new HeadMove(renderer, camera, scene, face, mesh, controls)
            headmove.enable(camera, face, mesh)
            e.preventDefault();
        }
        if (keyID == 'KeyB') {
            if (gravity) {
                gravity.disable()
                gravity = null
            }
            if (mouseLight) mouseLight.disable();
            if (gSkin) glassSkin.disable();
            testSoft();
            e.preventDefault();
        }
        if (keyID == 'KeyC') {
            testOrigin();
            if (gravity) {
                gravity.disable()
                gravity = null
            }
            e.preventDefault();
        }
        if (keyID == 'KeyD') {
            if (mouseLight) mouseLight.disable();
            if (glassSkin) glassSkin.disable();
            if (gravity) {
                gravity.disable()
                gravity = null
            }
            testBackground();
            e.preventDefault();
        }
        if (keyID == 'KeyE') {
            camera.position.x += 1;
            mesh.position.z -= 1;
            e.preventDefault();
        }

        if (keyID == 'KeyF') {
            if (softVolume) {
                softVolume.disable();
                softVolume.dispose();
                softVolume = undefined;
            }
            //gravity = new Gravity(scene, mesh, soundHandler);
            gravity.enable()
            background.direction = 'up'
            e.preventDefault();
        }
        if (keyID == 'KeyG') {

            if (gravity) {
                gravity.applyN = true
            }
            e.preventDefault();
        }


        if (keyID == 'KeyO') {
            if (background) {
                background.speedup = true
            }
        }


        if (keyID == 'KeyI') {
            if (background) backgroundFlash('#343161')
            else backgroundFlash('#457552')
        }

        if (keyID == 'KeyQ') {
            headmove = new HeadMove(renderer, camera, scene, face, mesh, controls)
            headmove.enable(camera, face, mesh)
        }
        if (keyID == 'KeyW') {
            headmove.changeMode('shake', camera, face, mesh)
        }

        if (keyID == 'KeyE') {
            headmove.changeMode('flake', camera, face, mesh)
        }
        if (keyID == 'KeyR') {
            headmove.changeMode('up', camera, face, mesh)
        }
        if (keyID == 'KeyT') {
            headmove.changeMode('rotate', camera, face, mesh)
        }

        if (keyID == 'KeyU') {
            if (headmove) {
                headmove.disable()
                headmove = undefined
            }
            activity = new Activity(camera, scene, controls)
            activity.enable()
        }


    }, false);

}



function testBackground() {
    controls.enabled = false;

    if (!background) {
        background = new Background(renderer, scene);
        background.enable()
    }
    else {
        background.disable()
        background = undefined
    }
}

function testOrigin() {
    controls.enabled = true;
    directionalLight.intensity = 0.5;
    if (mouseLight) mouseLight.disable();
    if (glassSkin) glassSkin.disable();
    if (softVolume) softVolume.disable();
}

function testTransparent(time) {
    
    if (background) {
        background.disable('#000000')
        background = undefined
    }
    directionalLight.intensity = 0;
    // if (softVolume) softVolume.disable();
    //directionalLight.intensity = 1;

    //console.log(mesh, face);

    if (!glassSkin)
        glassSkin = new GlassSkin(scene, mesh);
    glassSkin.enable();

    setTimeout(()=>{
        if (!mouseLight)
            mouseLight = new MouseLight(scene, camera, soundHandler);
        mouseLight.enable();

        //const loader = new THREE.TextureLoader();
        //const bgTexture = loader.load(domeImage);
        //scene.background = bgTexture;
        renderer.setClearColor('#5a2c7f')
    }, time)
    
    
    
}

function testSoft() {
    controls.enabled = false;
    directionalLight.intensity = 0.5;
    if (!softVolume) {
        softVolume = new SoftVolume(scene, mesh, true, soundHandler);
        // let gui = new dat.GUI();
        // softVolume.setGUI(gui);
    }
    softVolume.enable();
}


function flash (visible = false) {
    if (background) backgroundFlash('#343161', visible)
    else backgroundFlash('#457552', visible)
}


function backgroundFlash(color, visible) {
    face.visible = visible
    mesh.visible = visible
    if (!visible) {
        if (Math.floor(Math.random() * 2)) {
            renderer.setClearColor('#1a0f24');
        } else {
            renderer.setClearColor('#311a47');
        }
    } else {
        scene.background = undefined;
        renderer.setClearColor('#311a47');
    }
    
    setTimeout(() => {
        if (visible) {
            //const loader = new THREE.TextureLoader();
            //const bgTexture = loader.load(domeImage);
            scene.background = bgTexture;
        }
        renderer.setClearColor(color);
        face.visible = true
        mesh.visible = true
    }, 100);
}

function onWindowResized( event ) {
    let w = window.innerWidth;
    let h = window.innerHeight;
    renderer.setSize( w, h );
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
 }

 function disableZoom() {
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length > 1) {
         event.preventDefault();
      }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  
  }
