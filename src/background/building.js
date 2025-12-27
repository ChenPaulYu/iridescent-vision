import * as THREE from 'three';

export default class Building {
    constructor(x, y, z, height, rotX = 0, rotY = 0, rotZ = 0) {
        function CustomSinCurve(scale) {
            THREE.Curve.call(this);
            this.type = x > -30 ? 1: 0; 
            this.scale = (scale === undefined) ? 1 : scale;
            
        }

        CustomSinCurve.prototype = Object.create(THREE.Curve.prototype);
        CustomSinCurve.prototype.constructor = CustomSinCurve;

        CustomSinCurve.prototype.getPoint = function (t) {
            if (this.type == 1) var tx = Math.cos(2 * Math.PI * t);
            else var tx = Math.sin(2 * Math.PI * t);
        
            var ty = t * 10 - 1.5
            var tz = 0

            return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);

        };

        var path = new CustomSinCurve(50);
        var geometry = new THREE.TubeGeometry(path, 20, 0.5, 8, false);
        this.geo = geometry
        // this.geo = new THREE.CubeGeometry(width / 2, height / 2, depth);
        // this.mat = new THREE.MeshLambertMaterial({
        //     color: bldgColor,
        // });

        this.mat = new THREE.MeshPhongMaterial({
            color: 0x8d5fd3,
            emissive: 0x311a47,
            specular: 0xdcb5ff,
            side: THREE.DoubleSide,
            alphaTest: 0.7,
            shininess: 30
        });


        let halfHeight = height / 2,
            isRotated = rotX != 0 || rotY != 0 || rotZ != 0;

        this.mesh = new THREE.Mesh(this.geo, this.mat);
        this.mesh.position.set(x, isRotated ? y : y + halfHeight, z);

        if (isRotated) {
            this.geo.translate(0, halfHeight, 0);
            this.mesh.rotation.x = rotX * Math.PI / 180;
            this.mesh.rotation.y = rotY * Math.PI / 180;
            this.mesh.rotation.z = rotZ * Math.PI / 180;
        }
        this.mesh.castShadow = true;



        // scene.add(this.mesh);
    }
}
