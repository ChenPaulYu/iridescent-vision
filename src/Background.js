import * as THREE from 'three';
import Building from './background/building.js';


var Background = function (renderer, scene, tintColor = 0x2c123a) {
    let ambientLight, hemiLight
    let bldgs  = []
    let delta_speed = 0
    let lightColor = 0x9c62ff, backgroundColor = tintColor, recoverColor = 0x2c123a,
        chunkSize = 120, chunksAtATime = 6;


    this.speedup = false
    this.scene = scene;
    this.direction = 'forward'
    this.speed = 0.05;
    this.fogDistance = 10; 
    this.brightness  = 0.1;
    this.enabled = false
    this.uuid = []

    this.update = (camera, mesh, face) => {
        if (!this.enabled) return 
        backgroundUpdate(camera, mesh, face)
        if (this.scene.fog.far <= 720) {
            if (scene.fog.far <= 100) this.scene.fog.far += 0.3
            else this.scene.fog.far += 0.5
        }

        if (this.speedup) {
            if (this.speed < 500) delta_speed += 0.03
            else speedup = false
            this.speed += delta_speed
            
        }
    }
    
    this.disable = (color = new THREE.Color(recoverColor)) => {
        for (var i = this.scene.children.length - 1; i >= 0; i--) {
            let obj = this.scene.children[i]
            if (this.uuid.includes(obj.uuid)) {
                clearObject(obj, this.scene)
            }
        }
       // console.log(color);
        renderer.setClearColor(color)
        this.enabled = false
    }

    function doDispose(obj, scene) {
        scene.remove(obj);
        if (obj !== null) {
            for (var i = 0; i < obj.children.length; i++) {
                doDispose(obj.children[i], scene);
            }
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.geometry = undefined;
            }
            if (obj.material) {
                if (obj.material.map) {
                    obj.material.map.dispose();
                    obj.material.map = undefined;
                }
                obj.material.dispose();
                obj.material = undefined;
            }
        }
        obj = undefined;
    }

    function clearObject(obj, scene) {
        scene.remove(obj);
        if (obj.geometry) {
            obj.geometry.dispose()
        }
        if (obj.material) {
            Object.keys(obj.material).forEach(prop => {
                if (!obj.material[prop])
                    return
                if (typeof obj.material[prop].dispose === 'function')
                    obj.material[prop].dispose()
            })
            obj.material.dispose()
        }
    }



    function forestGenerate(zMove) {
        var buildings = []

        for(var i = 0; i < 30; i++) {
            var x = Math.random() * 600 - 300
            var y = Math.random() * 100 - 300
            var z = Math.random() * 100 - 50
            var d = Math.random() * 20  + 60
            buildings.push(new Building(x, y, z + zMove, d))
        }
        return buildings

    }

    let lightGenerate = (lightColor, brightness) => {

        ambientLight = new THREE.AmbientLight(lightColor);
        
        this.scene.add(ambientLight);
        this.uuid.push(ambientLight.uuid)
        hemiLight = new THREE.HemisphereLight(lightColor, 0xffffff, brightness);
        hemiLight.position.set(0, 8, 0);
        hemiLight.name = 'hemiLight'
        this.scene.add(hemiLight);
        this.uuid.push(hemiLight.uuid)

    }   
 
    let backgroundGenerate = (chunkSize, chunksAtATime) => {
        for (var cz = 1; cz > -chunksAtATime; --cz) {
            var zMove = chunkSize * cz;
            bldgs  = forestGenerate(zMove)

            for(var i =0;i < bldgs.length;i++) {
                bldgs[i].mesh.name = 'bldgs'
                this.scene.add(bldgs[i].mesh)
                this.uuid.push( bldgs[i].mesh.uuid)
            }
            
        }
    }

    let backgroundUpdate = (camera, mesh, face) => {

        let delta = this.speed;

        if(this.direction == 'up') {
            camera.position.y += delta;
            mesh.position.y   += delta;
            face.position.y   += delta;
        } else if (this.direction == 'down') {
            camera.position.y -= delta;
            mesh.position.y   -= delta;
            face.position.y   -= delta;
        } else if(this.direction == 'forward') {
            camera.position.z += delta;
            mesh.position.z   += delta;
            face.position.z   += delta;
        } else if(this.direction == 'back') {
            camera.position.z -= delta;
            mesh.position.z   -= delta;
            face.position.z   -= delta;
        }

    }

    let initBackground = (renderer) => {
        renderer.setClearColor(new THREE.Color(backgroundColor));
        renderer.shadowMap.enabled = true;
        backgroundGenerate(chunkSize, chunksAtATime)
        lightGenerate(lightColor, this.brightness)
        this.scene.fog = new THREE.Fog(backgroundColor, 0.01, this.fogDistance);
    }

    this.enable = () => {
        this.enabled = true
    }

    initBackground(renderer, scene)

}

export { Background };
