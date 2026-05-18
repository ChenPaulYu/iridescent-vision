import * as THREE from 'three';
import bgImage from './images/poster.jpg'
import linkImage from './images/sonia.jpg'


var Activity = function (camera, scene, controls) {
    
    let bgMesh, button, eventType;;
    let raycaster = new THREE.Raycaster(), INTERSECTED;
    let mouse = new THREE.Vector2();
    this.scene    = scene
    this.controls = controls
    this.camera   = camera

    let initBackground = () => {
        let bgCube = new THREE.CubeGeometry(1000, 1000, 1000);
        let bgMaterials = [
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(bgImage),
                side: THREE.DoubleSide
            })
        ];

        var bgMaterial = new THREE.MeshFaceMaterial(bgMaterials);
        bgMesh = new THREE.Mesh(bgCube, bgMaterial);
        bgMesh.name = 'bg'
    }

    let initButton = () => {
        var geometry = new THREE.SphereGeometry(8, 48, 48);
        var texture = new THREE.TextureLoader().load(linkImage);
        var material = new THREE.MeshBasicMaterial({ map: texture });
        button = new THREE.Mesh(geometry, material);

        button.material.side = THREE.FrontSide;
        button.name = 'button'
    }

    let resetPos = () => {
        camera.position.set(0, 10, 30);
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