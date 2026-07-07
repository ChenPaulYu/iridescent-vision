import * as THREE from 'three';
import * as OIMO from 'oimo';
import {Vec3} from 'oimo/src/math/Vec3';
import ballCollide from './sounds/ball_collide.mp3';
import ballFly from './sounds/ball_fly2.mp3';
import ballRoll from './sounds/ball_roll.mp3';


var Gravity = function (scene, mesh, soundHandler) {

    const FLY = 0;
    const ROLL = 1;
    const COL = 2;
    let colNum = 0;
    let delta = 3
    let world;
    let size = 80;
    this.uuid = []
    let bodys = [];
    let centerBody;
    let player;
    let oriMaterial = mesh.material;


    this.applyN = true;
    this.scene  = scene;
    this.enabled = false;
    this.center = new THREE.Vector3(0, 0, 0);
    this.all = false
    this.mesh = mesh
    this.soundReady;
    this.soundHandler = soundHandler;


    let rand = (low, high) => low + Math.random() * (high - low);
    let randInt = (low, high) => low + Math.floor(Math.random() * (high - low + 1));

    // Per-body attraction anchor: a random point ON the collision
    // ellipsoid's surface (plus a ball radius), so every anchor is
    // physically reachable — the ball touches the surface exactly at its
    // anchor and the latch damping locks it there. Anchors placed off the
    // surface fail both ways: outside it, balls hover in air; inside it,
    // the surface blocks them short of the latch radius and they jitter
    // forever ("有些球會黏不上"). The frame is centered on the mask's
    // real bbox center (measured in enable()); pole clamp keeps anchors
    // within the visible head height.
    const COL_RX = 10, COL_RY = 30, COL_RZ = 8;   // centerBody size (init)
    let anchorPoleClamp = 0.85;
    let anchorCenterWorld = null;   // mask bbox center at enable()
    let anchorOffset = null;        // bbox center relative to update() pos
    let randomAnchor = () => {
        const u = (Math.random() * 2 - 1) * anchorPoleClamp;
        const phi = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const dx = s * Math.cos(phi), dy = u, dz = s * Math.sin(phi);
        // scale along (dx,dy,dz) that lands on the ellipsoid surface
        const k = 1 / Math.sqrt(
            (dx / COL_RX) * (dx / COL_RX) +
            (dy / COL_RY) * (dy / COL_RY) +
            (dz / COL_RZ) * (dz / COL_RZ)
        );
        const r = k + 1.1;   // + average ball radius
        return new Vec3(dx * r, dy * r, dz * r);
    };
    
    let init = () => {
        initSound();

        world = initWorld()
        centerBody = add2World({ type: 'sphere', geometry: new THREE.SphereBufferGeometry(1, 32, 24), size: [10, 30, 8], pos: [0, 0, 0], density: 1 }, true);
        // for (var i = 0; i < size; i++) {
        //     var b = add2World(createParticle(rand(0.5, 1)))
        // }
        
        
        //console.log('init!!!');
    };

    // let checkLoadReady = () => {
    //     playerLoad ++;
    //     if (playerLoad == 2) {
    //         console.log('gravity sound ready!');
    //         if (this.soundReady) this.soundReady();
    //     }
    // }

    let initSound = () => {
        player = soundHandler.loadPlayer([ballFly, ballRoll]);
        player[ROLL].volume.value = 15;
        const collideModules = import.meta.glob('./sounds/collide/*.mp3', {
            eager: true,
            import: 'default'
        });
        let soundFiles = Object.values(collideModules);
        colNum = soundFiles.length;
        let player1 = soundHandler.loadPlayer(soundFiles);
        player1 = player1.concat(soundHandler.loadPlayer(soundFiles));
        player1 = player1.concat(soundHandler.loadPlayer(soundFiles));
        player1.forEach((p)=>{
            p.volume.value = -5;
        })
        player = player.concat(player1);
        colNum *= 3;
    }
    
    let initWorld = () => {
        return new OIMO.World({
                timestep: 1 / 60,
                iterations: 8,
                broadphase: 2, // 1: brute force, 2: sweep & prune, 3: volume tree
                worldscale: 1,
                random: true,
                gravity: [0, 0, 0],
            });
    }

    let createParticle = (width) => {
        let particle = {
            move: true,
            density: 1,
            pos: [
                rand(10, 50)  * (randInt(0, 1) ? -1 : 1),
                rand(10, 50)  * (randInt(0, 1) ? -1 : 1),
                rand(10, 30)  * (randInt(0, 1) ? -1 : 1),
            ],
            rot: [
                randInt(0, 360),
                randInt(0, 360),
                randInt(0, 360),
            ]
        };
        particle.type = 'sphere';
        particle.size = [width];
        return particle
    }

    let add2World = (o, noMesh) => {

        if (world) {
            var b = world.add(o);
            if (!(b.userData)) b.userData = {};
            //bodys.push(b);
        }

        let s;
        if (o.geometry) {
            s = o.geometry;
        } else {
            s = new THREE.SphereGeometry(1, 32, 32);
        }

        let MeshMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xb7adad,
            roughness: 0.5,
            metalness: 1,

        });

        if (!noMesh) {
            let meshtemp = new THREE.Mesh(s, MeshMaterial);
            this.scene.add(meshtemp);
            this.uuid.push(meshtemp.uuid);
            meshtemp.position.set(b.pos[0], b.pos[1], b.pos[2]);
            s.scale(o.size[0], o.size[1], o.size[2]);
            if (world) b.connectMesh(meshtemp);
        }

        if (world) return b;

    }

    let nowDate;
    let contactFrame = 0;
    let postLoop = (pos) => {
        var force, m;
        var r = 3;
        let applyN = this.applyN
        let center = new Vec3(pos.x, pos.y, pos.z);
        let all    = this.all
        nowDate = new Date();
        // Resolve the bbox-fitted anchor frame against the head-tracking
        // pos on first update: from then on anchors ride along with it.
        if (!anchorOffset) {
            anchorOffset = anchorCenterWorld
                ? new Vec3(anchorCenterWorld.x - pos.x, anchorCenterWorld.y - pos.y, anchorCenterWorld.z - pos.z)
                : new Vec3(0, 0, 0);
        }
        // Contact checks (world.getContact × ~80 bodies, plus the sound
        // triggers behind them) only every other frame — Ascension is the
        // piece's heaviest beat (physics + tunnel + magnet shader at
        // once) and the 200ms sound-dedup window makes alternate-frame
        // checking inaudible.
        contactFrame = (contactFrame + 1) % 2;
        const checkContacts = contactFrame === 0;
        bodys.forEach(function (b, id) {

            //console.log(b.userData.contact);
            if (b.type === 1) {
                if (checkContacts) contact(b);
                m = b.mesh;
                let target = b.userData.anchor
                    ? center.clone().add(anchorOffset).add(b.userData.anchor)
                    : center;
                let dir = target.clone().sub(m.position);
                const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
                dir.normalize();
                if (delta < 15) delta += 1
                if (applyN && (Math.floor(Math.random() * 4) || all)) {
                    //b.userData.contact = false;
                    force = dir.multiplyScalar(delta);
                    if (!all) force = force.negate().multiplyScalar(Math.random() * 10 + 20);
                    else force = force.negate().multiplyScalar(Math.random() * 40 + 30);
                } else {
                    // Magnetic latch: constant-magnitude attraction never
                    // settles (balls oscillate around the anchor forever),
                    // so near the surface the pull turns spring-like and
                    // velocity is bled off — the ball snaps on and STAYS
                    // until the next scatter pulse flings it.
                    force = dir.multiplyScalar(delta * Math.min(1, dist / 14));
                    if (dist < 6) b.linearVelocity.multiplyScalar(0.8);
                }
                b.applyImpulse(center, force);

            }

        });
        centerBody.setPosition(center.clone().add(anchorOffset));
        if (this.applyN) this.applyN = false;
        if (this.all) this.all = false
    }

    let contact = (b) => {

        var c = world.getContact( centerBody, b);
        
        if( c ){ 
            if(!c.close) {
                let rand = Math.floor(Math.random()*colNum);
                let d = b.userData.contactD ? nowDate - b.userData.contactD : Infinity;
                if (d > 200) {
                    if (player[COL+rand].state == 'stopped' && player[COL+rand].loaded){
                        player[COL+rand].start();
                    //b.userData.contact = true;
                    }  
                }else {
                    if (player[ROLL].state == 'stopped' && player[ROLL].loaded)
                        player[ROLL].start();
                }
               
            } else {
                if (player[ROLL].state == 'stopped' && player[ROLL].loaded){
                    player[ROLL].start();
                }
            }
            b.userData.contactD = nowDate;
        }
    
    }    

    
    let changeTexture = () => {
        // Swap to the procedural magnetic-field material (built in
        // app.js) instead of the old plain white-metal — tool-making
        // energy magnetizes the goddess, not plates her in chrome.
        if (mesh.userData.magnetMaterial) {
            this.mesh.material = mesh.userData.magnetMaterial;
        }
    }


    this.enable = () => {
        this.enabled = true;
        addListener();
        // Center the anchor frame on the mask as it actually renders now,
        // and clamp anchor latitude so no anchor sits above the crown or
        // below the chin.
        const box = new THREE.Box3().setFromObject(this.mesh);
        const bc = box.getCenter(new THREE.Vector3());
        const bs = box.getSize(new THREE.Vector3());
        anchorCenterWorld = bc;
        anchorPoleClamp = Math.min(1, Math.max(0.4, (bs.y * 0.5) / COL_RY));
        anchorOffset = null;
        //TODO: change to enable!
        for (var i = 0; i < size; i++) {
            const b = add2World(createParticle(rand(0.5, 1)));
            b.userData.anchor = randomAnchor();
            bodys.push(b);
        }

        changeTexture();
        // for (var child of this.scene.children) {
        //     this.uuid.push(child.uuid)
        // }

        world.play();
    }


    this.disable = () => {
        this.enabled = false
        removeListener();
        world.clear()
        world = undefined
        bodys = undefined
        this.mesh.material =    oriMaterial;
        oriMaterial = undefined
        for (var i = this.scene.children.length - 1; i >= 0; i--) {
            let obj = this.scene.children[i]
            if (this.uuid.includes(obj.uuid)) {
                clearObject(obj, this.scene)
            }
        }
        player.forEach((p)=>{
            p.stop();
        })

        document.removeEventListener('click', applyForce, false);
        document.removeEventListener('dblclick', applyAllForce, false)
    }

    function doDispose(obj, scene) {
        scene.remove(obj);
        if (obj !== null) {
            for (var i = 0; i < obj.children.length; i++) {
                doDispose(obj.children[i]);
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


        if (obj.material) {
            if (obj.material.length) {
                for (let i = 0; i < obj.material.length; ++i) {
                    obj.material[i].dispose()
                }
            }
            else {
                obj.material.dispose()
            }
        }



        if (obj.geometry) {
            obj.geometry.dispose()
        }
        if (obj.material) {
            Object.keys(obj.material).forEach(prop => {
                if (!obj.material[prop])
                    return
                if (typeof obj.material[prop].dispose === 'function'){
                    obj.material[prop].dispose()
                }

            })
            obj.material.dispose()
        }

        obj = undefined
    }

    this.update = (pos) => {
        if (!this.enabled) return;
        postLoop(pos)
    }

    let applyForce = () => {
        this.applyN = true
        this.all    = false 
        if (player[FLY].loaded)
            player[FLY].start();
    }
    
    let applyAllForce = () => {
        this.applyN = true
        this.all    = true 
        if (player[FLY].loaded)
            player[FLY].start();
    }

    let addListener = () => {
        document.addEventListener( 'touchstart', applyForce, false );
        document.addEventListener('click'   , applyForce, false);
        document.addEventListener('dblclick', applyAllForce, false)
    }    

    let removeListener = () => {
        document.removeEventListener( 'touchstart', applyForce, false );
        document.removeEventListener('click'   , applyForce, false);
        document.removeEventListener('dblclick', applyAllForce, false)
    }

    init()
}

export { Gravity }
