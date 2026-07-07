import * as THREE from 'three';


var HeadMove = function (renderer, camera, scene, face, mesh, controls) {

    // deltaShake starts near zero: the ending shake opens as a faint
    // tremor and escalates (see headShaking's ramp in update()).
    let randomPoints = [], camPosIndex = 0, spline, deltaRotate = 0.02, deltaFlake = 0, deltaShake = 0.08, deltaMove = 1;
    let rotateModeStart = null;
    let upper = 50, lower  = -50;
    // ←/→ flip the orbit direction during Act 3 (artist request
    // 2026-07-07): flips the sign of autoRotateSpeed immediately and
    // steers the flake-mode speed ramp.
    let rotateDir = 1;
    this.mode = ''; 
    this.camera = camera
    this.scene  = scene
    this.face   = face
    this.mesh   = mesh
    this.controls = controls
    this.renderer = renderer
    this.direction = 'up'   



    let resetPos = (camera, face, mesh) => {

        this.controls.autoRotate = false

        camera.position.set(0, 10, 50);

        mesh.position.set(0, 0, 0)
        mesh.rotation.set(0, 0, 0)

        face.position.set(1, -4, -18);
        face.scale.set(0.1, 0.1, 0.1);
        face.rotation.set(0, Math.PI, 0);
    


        this.controls.autoRotate = true

    }

    let initRandomPoints = () => {
        for (var i = 0; i < 1000; i++) {
            randomPoints.push(
                new THREE.Vector3(Math.random() * 30 - 15, Math.random() * 30 - 10, Math.random() * 30 - 15)
            );
        }
        spline = new THREE.SplineCurve3(randomPoints);
    }

    let setPos = (model, pos, rot, index) => {
        model.position.x = pos.x;
        model.position.y = pos.y;
        model.position.z = pos.z;

        model.rotation.x = rot.x;
        model.rotation.y = rot.y;
        model.rotation.z = rot.z;

        model.lookAt(spline.getPoint((index + 1) / 10000));
    }

    let headShaking = (face, mesh, delta) => {
        controls.autoRotate = false
        // Fractional steps, not Math.floor — the shake must be able to
        // START as a barely-visible tremor (sub-index drift along the
        // spline) before it grows violent; floored steps jump whole
        // spline segments from the first frame.
        camPosIndex += delta;
        if (camPosIndex > 10000) camPosIndex = 0;

        var camPos = spline.getPoint(camPosIndex / 10000);
        var camRot = spline.getTangent(camPosIndex / 10000);

        setPos(face, camPos, camRot, camPosIndex)
        setPos(mesh, camPos, camRot, camPosIndex)
    }

    let maskFlaking = (delta) => {
        this.controls.autoRotate = true
        this.mesh.position.z    += delta
    }

    let faceRotate = () => {
        this.face.rotation.x += deltaRotate * (Math.random() * 2 - 1)
        this.face.rotation.y += deltaRotate * (Math.random() * 2 - 1)
        this.face.rotation.z += deltaRotate * (Math.random() * 2 - 1)
    }

    let maskUp = () => {

        if (this.face.position.y < lower && this.direction == 'down') {
            this.direction = 'up'
            if (upper - lower >= 10) lower += 5;
            if (deltaMove < 10) deltaMove += 0.5; this.face.position.z -= 0.1;
        }

        if (this.face.position.y > upper && this.direction == 'up') {
            this.direction = 'down'
            if (upper - lower >= 10) upper -= 5;
            if (deltaMove < 10) deltaMove += 0.5; this.face.position.z -= 0.1;
        }
        

        if (this.direction == 'up') {
            this.face.position.x += deltaMove
            this.face.position.y += deltaMove
        } else if (this.direction == 'down') { 
            this.face.position.x -= deltaMove
            this.face.position.y -= deltaMove
        }
    }


    let faceRotating = () => {
        // was: += 1 rad/frame unconditionally, plus a broken `this.camera.position > 0`
        // check (comparing a Vector3 to a number, always false) that added another
        // += 0.5 every frame regardless — 1.5 rad/frame at 60fps is ~14 full spins
        // per second, plus the camera pulling back 60 units/sec (reported
        // 2026-07-06: scene 3/4 "轉太快"). Slowed to a gentle multi-second turn,
        // then per further feedback eased in from a standstill (quadratic
        // ramp over ~2.2s from changeMode('rotate')'s timestamp) rather than
        // starting at full speed immediately.
        this.controls.autoRotate = false
        const elapsed = rotateModeStart ? performance.now() - rotateModeStart : 2200
        const t = Math.min(elapsed / 2200, 1)
        const ease = t * t
        // Slowed again per artist feedback (0.012 → 0.006 rad/frame).
        this.camera.rotation.z += 0.006 * ease
        this.camera.position.z -= 0.09 * ease
        if (this.camera.position.z <= -100) removeModelByName('face')
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

    let removeModelByName = (name) => {
        for (var i = 0; i < this.scene.children.length; i++) {
            if (this.scene.children[i].name == name) clearObject(this.scene.children[i], this.scene)
        }
    }

    let onKeyDown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        rotateDir = event.key === 'ArrowLeft' ? -1 : 1;
        this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed) * rotateDir;
    }
    window.addEventListener('keydown', onKeyDown, false);

    this.update = (face, mesh ,controls, directionalLight) => {

        if (this.mode == 'idle') {
            controls.update();
            // if (controls.autoRotateSpeed < 20) controls.autoRotateSpeed += 0.1
            if (directionalLight.intensity < 0.8) directionalLight.intensity += 0.002
            //console.log(directionalLight.intensity)
        } else if (this.mode == 'shake') {
            headShaking(face, mesh, deltaShake)
            // ~15s from faint tremor to full convulsion (shakeHead fires
            // at 1:38.4, flake takes over at 1:53.5).
            if (deltaShake < 10) {
                deltaShake += 0.0035
            }
        } else if (this.mode == 'flake') {
            maskFlaking(deltaFlake)
            if (controls.getAzimuthalAngle() < -0.15) {
                deltaFlake += 0.01  
            } else {
                deltaFlake += 0.001
            }

               
            if (deltaFlake >= 0.8) {
                removeModelByName('mask')
            }
            controls.update();
            if (Math.abs(controls.autoRotateSpeed) < 10) controls.autoRotateSpeed += 0.001 * rotateDir
        } else if (this.mode == 'up') {
            removeModelByName('mask')
            faceRotate()
            deltaRotate += 0.0005
        } else if (this.mode == 'rotate') {
            removeModelByName('mask')
            faceRotating()
        }
    }

    this.changeMode = (mode, camera, face, mesh) => {
        this.mode = mode
        if (mode == 'rotate') {
            rotateModeStart = performance.now()
        }
        if (mode == 'flake') {
            resetPos(camera, face, mesh)
            this.controls.autoRotateSpeed = 1 * rotateDir

        }

        if (mode == 'idle') {
            this.controls.autoRotate = true
        }
        if (mode == 'up' ) this.controls.autoRotate = false
        
    }


    this.disable = () => {
        removeModelByName('face')
        removeModelByName('mask')
        this.controls.autoRotate = false
        this.controls.enabled = false
        this.controls.autoRotateSpeed = 0.1
    }

    this.enable = (camera, face, mesh) =>  {
        this.changeMode('idle')
        this.controls.autoRotateSpeed = 0.4 * rotateDir
        resetPos(camera, face, mesh)
    }
     

    initRandomPoints()
}

export { HeadMove };