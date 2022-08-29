import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM, VRMUtils } from '@pixiv/three-vrm';
import Holistic from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { drawResults } from './utils';
import animateVRM from './animateVRM';

const defaultValue = {
    hairColor: '#4f2b0d',
    skintone: '#eaeaea'
};

export default class VRMCustomizer {
    public canvas: HTMLCanvasElement;
    public cameraCanvas: HTMLCanvasElement;
    public cameraVideo: HTMLVideoElement;
    public stream!: MediaStream;

    public scene: THREE.Scene;
    public renderer!: THREE.WebGLRenderer;
    public camera!: THREE.PerspectiveCamera;
    public orbitControls!: OrbitControls;
    public previousRAF: number | null = null;

    public cameraHasStarted: boolean = false;
    public currentVrm!: VRM;
    public cameraContext!: CanvasRenderingContext2D | null;
    public holistic!: Holistic.Holistic;
    public cameraHolistic!: Camera;

    constructor(canvas: HTMLCanvasElement, cameraCanvas: HTMLCanvasElement, cameraVideo: HTMLVideoElement) {
        this.canvas = canvas;
        this.cameraCanvas = cameraCanvas;
        this.cameraVideo = cameraVideo;
        this.scene = new THREE.Scene();

        this.buildRender();
        this.buildCamera();
        this.buildLights();

        this.loadModel();

        this.RAF();
    }

    private buildRender = () => {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.domElement.id = 'VRMCustomizerCanvas';
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#000000');
        window.addEventListener('resize', this.onWindowResize, false);
    };

    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    private buildCamera = () => {
        const fov = 35;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;

        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(0.0, 1.4, 1);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.screenSpacePanning = true;
        this.orbitControls.target.set(0.0, 1.4, 0.0);
        this.orbitControls.minDistance = 0.5;
        this.orbitControls.maxDistance = 10;
        this.orbitControls.update();
    };

    private buildLights = () => {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(5, 10, 5).normalize();
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.bias = -0.001;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 50.0;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = -10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        const light = new THREE.PointLight(0xffffff, 1, 0.3);
        light.position.set(5, 10, 5);
        this.scene.add(light);

        const light2 = new THREE.PointLight(0xffffff, 1, 0.3);
        light.position.set(-5, 10, -5);
        this.scene.add(light2);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
    };

    private update = (timeElapsed: number) => {
        if (this.currentVrm) {
            this.currentVrm.update(timeElapsed);
        }
    };

    private RAF() {
        requestAnimationFrame((t) => {
            if (this.previousRAF == null) {
                this.previousRAF = t;
            }

            this.update((t - this.previousRAF) * 0.001);
            this.renderer.render(this.scene, this.camera);
            this.previousRAF = t;
            this.RAF();
        });
    }

    private loadModel = async () => {
        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';

        const gltf = await loader.loadAsync('./models/violet2.vrm');
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        const vrm = await VRM.from(gltf);
        this.scene.add(vrm.scene);
        this.currentVrm = vrm;
        this.currentVrm.scene.rotation.y = Math.PI;
        this.setHairColor(defaultValue.hairColor);
        this.setSkintone(defaultValue.skintone);
    };

    public cameraRender = async (bool: boolean): Promise<void> => {
        if (bool) {
            if (this.holistic) {
                await this.cameraHolistic.start();
                return;
            }
            this.cameraContext = this.cameraCanvas.getContext('2d');
            const config: Holistic.HolisticConfig = {
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/electron-mediapipe-holistic@1.0.2/${file}`;
                }
            };
            this.holistic = new Holistic.Holistic(config);

            this.holistic.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7,
                refineFaceLandmarks: true
            });

            this.holistic.onResults((results: Holistic.Results) => {
                if (!this.cameraHasStarted) {
                    this.cameraHasStarted = true;
                    this.cameraCanvas.dispatchEvent(new Event('started'));
                }

                if (this.cameraContext !== null) {
                    drawResults(results, this.cameraCanvas, this.cameraContext);
                    animateVRM(this.currentVrm, results, this.cameraVideo);
                }
            });

            this.cameraHolistic = new Camera(this.cameraVideo, {
                onFrame: async () => {
                    await this.holistic.send({ image: this.cameraVideo });
                }
            });

            await this.cameraHolistic.start();
        } else {
            await this.cameraHolistic.stop();
        }
    };

    public setBackgroundColor(color: string) {
        this.renderer.setClearColor(color);
    }

    public setHairColor(color: string) {
        this.scene.traverse(async (child: any) => {
            if (child.material instanceof Array) {
                child.material.forEach((mat: any) => {
                    if (mat.name.includes('MAT_HAIR')) {
                        mat.uniforms.color.value.set(color);
                        mat.uniforms.shadeColor.value.set(color);
                        mat.uniformsNeedUpdate = true;
                    }
                });
            }
        });
    }

    public setSkintone(color: string) {
        this.scene.traverse(async (child: any) => {
            if (child.material instanceof Array) {
                child.material.forEach((mat: any) => {
                    if (mat.name.includes('MAT_FACE_SKIN') || mat.name.includes('MAT_BODY_SKIN')) {
                        mat.uniforms.color.value.set(color);
                        mat.uniforms.shadeColor.value.set(color);
                        mat.uniformsNeedUpdate = true;
                    }
                });
            }
        });
    }
}

//mat.color.setHex(0x000000);
//console.log(mat.uniforms);
//mat.uniforms.glowColor.value.set( 0x00ff00 );
//mat.uniforms.diffuse.value.setHex ( 0xFF0000 );
// mat.uniforms.diffuse.value.setHex(0xff0000);
// mat.color.set(color);
// mat.needsUpdate = true;
