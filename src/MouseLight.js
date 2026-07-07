import * as THREE from 'three';
import { Vector3 } from 'three/build/three.module';
import light1 from './sounds/light1.mp3';
import light2 from './sounds/light2.mp3';
import light3 from './sounds/light3.mp3';


var MouseLight = function (scene, camera, soundHandler) {

    this.scene = scene;
    this.camera = camera;

    this.initIntensity = 1;
    this.initAngle = 0.1;

    this.intensityStep = 0.02;
    this.angleStep = 0.005;

    this.soundHandler = soundHandler;

    let light, target;
    let raycaster = new THREE.Raycaster();
    let mouse = {x:0, y:0}
    let count = 0;
    let enabled = false;
    let player;
    let playerOrder = 0;
    let mouseMove = false;

    let initLight = () => {
        light = new THREE.SpotLight( 0xffffff, this.initIntensity);
        light.position.copy(camera.position);
        light.angle = this.initAngle;
        light.penumbra = 1;
        this.scene.add(light);
    
        target = new THREE.Object3D();
        this.scene.add(target);
        light.target = target; 
    }

    let initSound = () => {
        player = soundHandler.loadPlayer([light1, light2, light3], 1.5);
        player.forEach((p)=>{
            p.volume.value = -10;
        })
    }
    
    // Follows the mouse event
    let onMouseMove = (event) => {
        mouseMove = true;
      // Update the mouse variable
      event.preventDefault();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }


    let onTouchMove = (event) => {
        mouseMove = true;
        event.preventDefault();
        event.stopPropagation();
        mouse.x = (event.touches[ 0 ].pageX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[ 0 ].pageY / window.innerHeight) * 2 + 1;
    }
    
    this.update = (mesh) => {
        if (!enabled) return;
        
        light.position.copy(this.camera.position);

        if (!raycaster || !light || !mesh) return;
        if (!mouseMove && player) {
            if (player[playerOrder].state !== 'stopped') {
                //console.log('stop!', playerOrder);
                player[playerOrder].stop();
                playerOrder = (playerOrder+1)%3;
            }
            return;
        }
        //console.log(mesh);
        raycaster.setFromCamera( mouse, this.camera );
        var intersects = raycaster.intersectObjects([mesh], true );
    
        if ( intersects.length != 0 ) {
            count ++;
            if (count % 100 == 0) {
                light.intensity += this.intensityStep; 
                light.angle += this.angleStep; 
            }
            target.position.copy(intersects[0].point);
            //console.log('player', player);
            if (player) {
                //console.log('play!', playerOrder, player[playerOrder].loaded);
                if (player[playerOrder].loaded)
                    player[playerOrder].start();
            }    
        } else {
            
            if (player[playerOrder].state !== 'stopped') {
                //console.log('stop!', playerOrder);
                player[playerOrder].stop();
                playerOrder = (playerOrder+1)%3;
            }
            target.position.copy(new Vector3(-100,-100,-100));
        } 
        mouseMove = false;
        
    }

    this.enable = () => {
        enabled = true;
        initLight();
        //light.initIntensity = this.initIntensity;
    }

    this.disable = () => {
        enabled = false;
        // light/target only exist after enable() has run once — a debug
        // scene-jump can replay a disable cue before any enable happened.
        if (!target || !light) return;
        target.position.copy(new Vector3(-1000,-1000,-1000));
        light.intensity = 0;
    }

    this.dispose = () => {
        this.scene.remove(light);
        this.scene.remove(target);
        //light.dispose();
        //arget.dispose();
        document.removeEventListener( 'touchmove', onTouchMove, false );
        document.removeEventListener( 'mousemove', onMouseMove, false );
    }

    //TODO: prevent scroll
    document.addEventListener( 'touchmove', onTouchMove, false );
    document.addEventListener('mousemove', onMouseMove, false);

    initSound();
    //initLight();
    
}

export {MouseLight};