import * as THREE from 'three';

var GlassSkin = function(scene, mesh) {
    
    this.scene = scene;
    this.mesh = mesh;
    this.uuid = [];

    let cubeCamera;
    let enabled = false;
    let oriMaterial = mesh.material;
    let cubeMaterial;
    

    let init = () => {
        for (var child of this.scene.children) {
            this.uuid.push(child.uuid)
        } 

        // Far plane must reach past the EnvironmentDome (r=300) so the
        // glass refracts the dome's fog instead of empty clear color.
        cubeCamera = new THREE.CubeCamera(0.5, 900, 256);
        this.scene.add(cubeCamera);
    
        cubeCamera.renderTarget.texture.mapping = THREE.CubeRefractionMapping;
        // MixOperation shows the refracted environment directly instead
        // of multiplying it with scene lighting — with the scene's single
        // dim directional light, Multiply rendered the glass near-black.
        cubeMaterial = new THREE.MeshPhongMaterial( {
            color: 0xffffff,
            envMap: cubeCamera.renderTarget.texture,
            refractionRatio: 0.93,
            combine: THREE.MixOperation,
            reflectivity: 0.92,
        } );
        this.mesh.material = cubeMaterial;
    }
    
    
    let cubeFrame = 0;
    this.update = (renderer, camera) => {
        if (!enabled) return;
        // The refraction source is slow fog — refreshing the cube map
        // every other frame is invisible and halves six full scene
        // re-renders per frame.
        cubeFrame = (cubeFrame + 1) % 2;
        if (cubeFrame !== 0) return;
        this.mesh.visible = false;
        cubeCamera.position.copy( camera.position );

        cubeCamera.update( renderer, this.scene );
        this.mesh.visible = true;
    }

    this.addTestBackground = () => {
        var r = "./";
        var url_temp = [
            r + "px.jpg", r + "nx.jpg",
            r + "py.jpg", r + "ny.jpg",
            r + "pz.jpg", r + "nz.jpg"
        ];
        var urls = [];
        for (var i=0; i<6; i++) urls.push("");
    
        var context = require.context('./textures/Color/', true, /\.(jpg)$/);
        context.keys().forEach((filename)=>{
            let idx = url_temp.indexOf(filename);
            if (idx !== -1) {
                urls[idx] = context(filename);
            }
        });

        var textureCube = new THREE.CubeTextureLoader().load( urls );
        this.scene.background = textureCube;
    }

    this.enable = () => {
        enabled = true;
        this.mesh.material = cubeMaterial;
    }

    this.disable = () => {
        enabled = false;
        this.scene.background = undefined;
        this.mesh.material = oriMaterial;
    }

    this.dispose = () => {
        this.scene.background = undefined;
        this.mesh.material = oriMaterial;
        this.scene.remove(CubeCamera);
    }

    init();
    
}

export {GlassSkin};