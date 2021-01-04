import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
// import THREE from 'three';

class Game {
    constructor() {
        this.objects = [];
        this.scene;
        this.camera;
        this.renderer;
        //target var
        this.targetOrbit;
        this.targetElevation;
        this.targetBob;
        //tank var
        this.tank;
        this.time = 1;

        const game = this;

        game.init();
        game.render();
    }

    init() {
        // main camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        // 내가 그냥 가볍게 생각해도 비율만 정해주고 스케일을 키우면서 코딩하는게 좋은 방식이네
        this.camera.position.set(8, 5, 10).multiplyScalar(3);
        this.camera.lookAt(0, 0, 0);


        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);

        {
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 20, 0);
            this.scene.add(light);
            light.castShadow = true;
            light.shadow.mapSize.width = 2048;
            light.shadow.mapSize.height = 2048;

            const d = 50;
            light.shadow.camera.left = -d;
            light.shadow.camera.right = d;
            light.shadow.camera.top = d;
            light.shadow.camera.bottom = -d;
            light.shadow.camera.near = 1;
            light.shadow.camera.far = 50;
            light.shadow.bias = 0.001;
        }

        {
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 2, 4);
            this.scene.add(light);
        }

        //make tank
        const carWidth = 4;
        const carHeight = 1;
        const carLength = 8;

        this.tank = new THREE.Object3D();
        this.scene.add(this.tank);

        this.tankGeometry = new THREE.BoxBufferGeometry(carWidth, carHeight, carLength);
        this.tankMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        this.tankBodyMesh = new THREE.Mesh(this.tankGeometry, this.tankMaterial);
        this.tankBodyMesh.position.y = 1.4;
        this.tankBodyMesh.castShadow = true;
        this.tank.add(this.tankBodyMesh);

        const tankCamFov = 75;
        this.tankCam = this.makeCamera(tankCamFov);
        this.tankCam.position.y = 3;
        this.tankCam.position.z = -6;
        this.tankCam.rotation.y = Math.PI;
        this.tankBodyMesh.add(this.tankCam);

        const wheelRadius = 1;
        const wheelThickness = .5;
        const wheelSegment = 6;
        this.tankWheelGeometry = new THREE.CylinderBufferGeometry(wheelRadius, wheelRadius, wheelThickness, wheelSegment);
        const wheelPositions = [
            [-carWidth / 2 - wheelThickness / 2, -carHeight / 2, carLength / 3],
            [-carWidth / 2 - wheelThickness / 2, -carHeight / 2, 0],
            [-carWidth / 2 - wheelThickness / 2, -carHeight / 2, -carLength / 3],
            [carWidth / 2 + wheelThickness / 2, -carHeight / 2, carLength / 3],
            [carWidth / 2 + wheelThickness / 2, -carHeight / 2, 0],
            [carWidth / 2 + wheelThickness / 2, -carHeight / 2, -carLength / 3],
        ];

        // mapping 후에는 wheelMeshes에 wheelposition 위치 정보가 three.mesh 들로 업데이트? 된다.
        this.wheelMeshes = wheelPositions.map((position) => {
            const mesh = new THREE.Mesh(this.tankWheelGeometry, this.tankMaterial);
            mesh.position.set(...position);
            mesh.rotation.z = Math.PI / 2;
            mesh.castShadow = true;
            this.tankBodyMesh.add(mesh);
            return mesh;
        });

        const domeRadius = 2;
        const domeWidthSegment = 30;
        const domeHeightSegment = 30;

        this.domeGeometry = new THREE.SphereBufferGeometry(domeRadius, domeWidthSegment, domeHeightSegment);
        this.domeMesh = new THREE.Mesh(this.domeGeometry, this.tankMaterial);
        this.domeMesh.position.y = .5;
        this.tankBodyMesh.add(this.domeMesh);

        const turretWidth = .1;
        const turretHeight = .1;
        const turretLength = carLength * .75 * .2;
        this.turretGeometry = new THREE.BoxBufferGeometry(turretWidth, turretHeight, turretLength);
        this.turretMeterial = new THREE.MeshPhongMaterial({color: 0x11111a})
        this.turretMesh = new THREE.Mesh(this.turretGeometry, this.turretMeterial);
        this.turretPivot = new THREE.Object3D();
        this.turretMesh.castShadow = true;
        this.turretPivot.scale.set(5, 5, 5);
        this.turretPivot.position.y = .5;
        this.turretMesh.position.z = turretLength * .5;
        this.turretPivot.add(this.turretMesh);
        this.tankBodyMesh.add(this.turretPivot);

        //turret camera
        this.turretCamera = this.makeCamera();
        this.turretCamera.position.y = .75 * .2;
        this.turretMesh.add(this.turretCamera);

        //make target
        this.targetGeometry = new THREE.SphereBufferGeometry(.5, 6, 3);
        this.targetMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00, flatShading: true });
        this.targetMesh = new THREE.Mesh(this.targetGeometry, this.targetMaterial);
        this.targetOrbit = new THREE.Object3D();
        this.targetElevation = new THREE.Object3D();
        this.targetBob = new THREE.Object3D();
        this.targetMesh.castShadow = true;
        this.scene.add(this.targetOrbit);
        this.targetOrbit.add(this.targetElevation);
        this.targetElevation.position.z = carLength * 2;
        this.targetElevation.position.y = 3;
        this.targetElevation.add(this.targetBob);
        this.targetBob.add(this.targetMesh);

        //target camera
        this.targetCamera = this.makeCamera();
        this.targetCameraPivot = new THREE.Object3D();
        this.targetCamera.position.y = 2;
        this.targetCamera.position.z = -2;
        this.targetCamera.rotation.y = Math.PI;
        this.targetBob.add(this.targetCameraPivot);
        this.targetCameraPivot.add(this.targetCamera);

        this.curve = new THREE.SplineCurve([
            new THREE.Vector2(-10, 0),
            new THREE.Vector2(-5, 5),
            new THREE.Vector2(0, 0),
            new THREE.Vector2(5, -5),
            new THREE.Vector2(10, 0),
            new THREE.Vector2(5, 10),
            new THREE.Vector2(-5, 10),
            new THREE.Vector2(-10, -10),
            new THREE.Vector2(-15, -8),
            new THREE.Vector2(-10, 0),
        ]);

        this.targetPosition = new THREE.Vector3();
        this.tankPosition = new THREE.Vector2();
        this.tankTarget = new THREE.Vector2();

        this.infoElem = document.querySelector('#info');

        this.cameras = [
            { cam: this.camera, desc: 'detached camera', },
            { cam: this.turretCamera, desc: 'on turret looking at target', },
            { cam: this.targetCamera, desc: 'near target looking at tank', },
            { cam: this.tankCam, desc: 'above back of tank', },
        ];


        const ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(50, 50), new THREE.MeshPhongMaterial({ color: 0xffffff }));
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const points = this.curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff });
        const splineObject = new THREE.Line(geometry, material);
        splineObject.rotation.x = Math.PI * .5;
        splineObject.position.y = 0.05;
        this.scene.add(splineObject);

        const canvas = document.querySelector('#c');
        this.renderer = new THREE.WebGLRenderer({ canvas });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        const game = this;

        window.addEventListener('resize', function () { game.onWindowResize(); }, false);
    }

    makeCamera(fov = 40) {
        const aspect = 2;
        const near = 0.1;
        const far = 1000;

        return new THREE.PerspectiveCamera(fov, aspect, near, far);
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.time += 0.01;
        const game = this;


        // move target
        this.targetOrbit.rotation.y = this.time * .27;
        this.targetBob.position.x = 1.5 * Math.sin(this.time * 2);
        this.targetBob.position.y = Math.sin(this.time * 2);
        this.targetMesh.rotation.x = this.time * 7;
        this.targetMesh.rotation.y = this.time * 13;
        this.targetMaterial.emissive.setHSL(this.time * 10 % 1, 1, .25);
        this.targetMaterial.color.setHSL(this.time * 10 % 1, 1, .25);

        // move tank
        const tankTime = this.time * 0.05;
        this.curve.getPointAt(tankTime % 1, this.tankPosition);
        this.curve.getPointAt((tankTime + 0.001) % 1, this.tankTarget);
        this.tank.position.set(this.tankPosition.x, 0, this.tankPosition.y);
        this.tank.lookAt(this.tankTarget.x, 0, this.tankTarget.y);

        // face turret at target
        this.targetMesh.getWorldPosition(this.targetPosition);
        this.turretPivot.lookAt(this.targetPosition);

        // make the turretCamera look at target
        this.turretCamera.lookAt(this.targetPosition);

        // make the targetCameraPivot look at the at the tank
        this.tank.getWorldPosition(this.targetPosition);
        this.targetCameraPivot.lookAt(this.targetPosition);

        this.wheelMeshes.forEach((obj) => {
            obj.rotation.x = this.time * 3;
        });

        const camera = this.cameras[this.time * .25 % this.cameras.length | 0];

        requestAnimationFrame(function () { game.render(); });

        this.renderer.render(this.scene, camera.cam);
    }
}

window.onload = () => {
    const game = new Game();
    window.game = game;
}