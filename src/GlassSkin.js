import * as THREE from 'three';

var GlassSkin = function(scene, mesh) {

    this.scene = scene;
    this.mesh = mesh;
    this.uuid = [];

    let cubeCamera;
    let enabled = false;
    let oriMaterial = mesh.material;
    let cubeMaterial;
    let fractureUniforms;

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
        // Real alpha + lighter mirror term (2026-07-07, second pass at
        // this after an earlier revert): the artist settled on the
        // see-through register for Orbit — "感覺可以再透明一點".
        cubeMaterial = new THREE.MeshPhongMaterial( {
            color: 0xffffff,
            envMap: cubeCamera.renderTarget.texture,
            refractionRatio: 0.93,
            combine: THREE.MixOperation,
            reflectivity: 0.72,
            transparent: true,
            opacity: 0.75,
        } );

        // "Third-eye" ornament recast as light fracturing inside the
        // glass itself, replacing the old opaque crystal-shell mesh
        // that used to float in front of the (now transparent) mask —
        // see docs/vision.md ornament redesign. Facet edges reuse the
        // same voronoi math as the mask's ornament shader; brightness
        // ramps in via setFractureIntensity() as Orbit settles.
        fractureUniforms = {
            uFractureIntensity: { value: 0 },
            uFractureColor: { value: new THREE.Color('#dff6ff') },
            uFractureScale: { value: 0.085 },
            uFractureSoftness: { value: 0.42 },
            uFractureBrightness: { value: 0.55 },
            uTime: { value: 0 },
        };
        cubeMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, fractureUniforms);
            shader.vertexShader = `
                varying vec3 vFracturePos;
            ` + shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 vFracturePos = position;`
            );
            shader.fragmentShader = `
                uniform float uFractureIntensity;
                uniform vec3 uFractureColor;
                uniform float uFractureScale;
                uniform float uFractureSoftness;
                uniform float uFractureBrightness;
                uniform float uTime;
                varying vec3 vFracturePos;

                float fractureHash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                vec2 fractureHash2(vec2 p) {
                    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                    return fract(sin(p) * 43758.5453);
                }
                // Same cellular-edge trick as the mask ornament shader:
                // distance to nearest cell minus distance to second
                // nearest gives a thin bright seam along facet edges.
                float fractureEdge(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    float d1 = 8.0;
                    float d2 = 8.0;
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 cell = vec2(float(x), float(y));
                            vec2 jitter = fractureHash2(i + cell) * 0.8 + 0.1;
                            vec2 r = cell + jitter - f;
                            float d = dot(r, r);
                            if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
                        }
                    }
                    // Wide falloff -> a handful of soft glowing cracks,
                    // not a dense wireframe mesh (the failure mode of the
                    // old ornament shell we're replacing).
                    return 1.0 - smoothstep(0.0, uFractureSoftness, d2 - d1);
                }
            ` + shader.fragmentShader.replace(
                'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
                `// Low frequency: only a few large facets span the whole
                 // head, reading as scattered fracture lines, not a net.
                 float seamA = fractureEdge(vFracturePos.xy * uFractureScale + uTime * 0.006);
                 float seamB = fractureEdge(vFracturePos.yz * uFractureScale - uTime * 0.004);
                 float seam = max(seamA, seamB) * uFractureIntensity;
                 outgoingLight += uFractureColor * seam * uFractureBrightness;
                 gl_FragColor = vec4( outgoingLight, diffuseColor.a );`
            );
        };

        this.mesh.material = cubeMaterial;
    }

    this.fractureUniforms = () => fractureUniforms;

    // Ramp the glass's internal light-fracture seams in/out. Called by
    // app.js once Orbit settles (replacing the old ornament reveal).
    this.setFractureIntensity = (target, durationMs = 1500) => {
        if (!fractureUniforms) return;
        const uniform = fractureUniforms.uFractureIntensity;
        const startValue = uniform.value;
        const startTime = performance.now();
        const tick = () => {
            const t = Math.min((performance.now() - startTime) / durationMs, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            uniform.value = startValue + (target - startValue) * eased;
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    
    
    let cubeFrame = 0;
    let lastFrameTime = null;
    this.update = (renderer, camera) => {
        if (!enabled) return;
        const now = performance.now();
        if (fractureUniforms) {
            const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : 0;
            fractureUniforms.uTime.value += delta;
        }
        lastFrameTime = now;
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