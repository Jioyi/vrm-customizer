import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM, VRMHumanoidLoaderPlugin, VRMLoaderPlugin, VRMLookAtLoaderPlugin, VRMSpringBoneLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { Camera } from '@mediapipe/camera_utils';
import Holistic from '@mediapipe/holistic';
import animateVRM from './animations/animateVRM';
import FBXloaderMixamoAnimation from './animations/FBXloaderMixamoAnimation';
import VRMCustomizerHelpersPlugin from './helpers';
import getScreenshotBlob from './exporters/getScreenshotBlob';
import VRMExporter from './exporters/VRMExporter';

const defaultAvatar = {
    model: './assets/models/demo.vrm',
    animation: './assets/motions/walking.fbx',
    hairColor: '#4f2b0d',
    skintone: '#eaeaea',
    irisColor: '#ff0000'
};

export default class VRMCustomizer {
    public canvas: HTMLCanvasElement;
    public cameraVideo: HTMLVideoElement;

    public scene: THREE.Scene;
    public renderer!: THREE.WebGLRenderer;
    public camera!: THREE.PerspectiveCamera;
    public orbitControls!: OrbitControls;

    public cameraHasStarted: boolean = false;
    public currentVrm!: VRM;

    public holistic!: Holistic.Holistic;
    public cameraHolistic!: Camera;
    public stats: Stats;

    public clock: THREE.Clock;
    public currentMixer!: THREE.AnimationMixer;

    public helpers!: VRMCustomizerHelpersPlugin;
    public materials!: any;

    public composer!: EffectComposer;
    public currentUserData: any;

    constructor(canvas: HTMLCanvasElement, cameraVideo: HTMLVideoElement) {
        this.canvas = canvas;
        this.cameraVideo = cameraVideo;
        this.scene = new THREE.Scene();

        // Build Render
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
        });
        this.renderer.domElement.id = 'VRMCustomizerCanvas';
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this.onWindowResize, false);

        this.stats = Stats();
        this.stats.domElement.style.cssText = 'display:flex;position:absolute;top:0px;left:0px;';
        document.body.append(this.stats.dom);

        // Build camera
        this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0.0, 1.4, 1);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.screenSpacePanning = true;
        this.orbitControls.target.set(0.0, 1.4, 0.0);
        this.orbitControls.update();

        this.buildLights();
        this.loadDefaultModel();
        this.onWindowResize();
        this.clock = new THREE.Clock();
        this.RAF();
    }

    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    public lockCamera = (bool: boolean) => {
        if (this.orbitControls) {
            this.orbitControls.enabled = !bool;
        }
    };

    private buildLights = () => {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
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

    private update = (deltaTime: number) => {
        this.stats.update();
        if (this.currentVrm) {
            this.currentVrm.update(deltaTime);
        }
        if (this.currentMixer) {
            this.currentMixer.update(deltaTime);
        }
    };

    public RAF() {
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        requestAnimationFrame(() => this.RAF());
    }

    private loadDefaultModel = async () => {
        this.helpers = new VRMCustomizerHelpersPlugin(this);
        // loader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/');

        const loader = new GLTFLoader();
        //loader.setDRACOLoader(dracoLoader);
        loader.crossOrigin = 'anonymous';
        loader.register((parser: any) => {
            /*console.log('parser', parser);
            return new VRMLoaderPlugin(parser);*/
            return new VRMLoaderPlugin(parser, {
                humanoidPlugin: new VRMHumanoidLoaderPlugin(parser, {
                    helperRoot: this.helpers.humanoidHelperRoot
                }),
                lookAtPlugin: new VRMLookAtLoaderPlugin(parser, {
                    helperRoot: this.helpers.lookAtHelperRoot
                }),
                springBonePlugin: new VRMSpringBoneLoaderPlugin(parser, {
                    jointHelperRoot: this.helpers.springBoneJointHelperRoot,
                    colliderHelperRoot: this.helpers.springBoneColliderHelperRoot
                })
            });
        });

        const gltf = await loader.loadAsync(defaultAvatar.model);
        this.currentUserData = gltf.userData;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        const { vrm } = gltf.userData;
        VRMUtils.rotateVRM0(vrm);
        this.scene.add(vrm.scene);
        this.currentVrm = vrm;
        this.currentMixer = new THREE.AnimationMixer(vrm.humanoid.normalizedHumanBonesRoot);
        this.currentMixer.timeScale = 1;

        this.helpers.humanoidHelperRoot.visible = false;
        this.helpers.lookAtHelperRoot.visible = false;
        this.helpers.springBoneJointHelperRoot.visible = false;
        this.helpers.springBoneColliderHelperRoot.visible = false;

        this.materials = vrm.materials;
        // vrm.humanoid.resetNormalizedPose();

        /* */

        this.setHairColor(defaultAvatar.hairColor);
        this.setIrisColor(defaultAvatar.irisColor);
        this.setBrowColor(defaultAvatar.hairColor);
        // this.setSkintone(defaultAvatar.skintone);
    };

    public loadMixamoAnimation = async () => {
        const clip = await FBXloaderMixamoAnimation(this.currentVrm, defaultAvatar.animation);
        if (clip) {
            const action = this.currentMixer.clipAction(clip);
            action.play();
        }
    };

    public downloadVRMModel = async () => {
        const exporter = new VRMExporter();
        exporter.parse(this.currentVrm, this.currentUserData, (vrm: ArrayBuffer) => {
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = URL.createObjectURL(new Blob([vrm], { type: 'octet/stream' }));
            link.download = 'model.vrm';
            link.click();
        });
    };

    public takeHumanoidHelper = () => {
        if (this.helpers) this.helpers.humanoidHelperRoot.visible = !this.helpers.humanoidHelperRoot.visible;
    };

    public takeLookAtHelper = () => {
        if (this.helpers) this.helpers.lookAtHelperRoot.visible = !this.helpers.lookAtHelperRoot.visible;
    };

    public takeSpringBoneJointHelper = () => {
        if (this.helpers) this.helpers.springBoneJointHelperRoot.visible = !this.helpers.springBoneJointHelperRoot.visible;
    };

    public takeSpringBoneColliderHelper = () => {
        if (this.helpers) this.helpers.springBoneColliderHelperRoot.visible = !this.helpers.springBoneColliderHelperRoot.visible;
    };

    public takeScreenshot = async () => {
        const blob = await getScreenshotBlob(this.canvas);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([blob], { type: 'image/json' }));
        link.download = 'screenshot.jpg';
        link.click();
        //this.downloadVRMModel();
    };

    public cameraRender = async (bool: boolean): Promise<void> => {
        if (bool) {
            if (this.holistic) {
                await this.cameraHolistic.start();
                return;
            }
            const config: Holistic.HolisticConfig = {
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${Holistic.VERSION}/${file}`;
                    //return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
                    //return `https://cdn.jsdelivr.net/npm/electron-mediapipe-holistic@1.0.2/${file}`;
                }
            };

            this.holistic = new Holistic.Holistic(config);

            this.holistic.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                minDetectionConfidence: 0.5, //0.7
                minTrackingConfidence: 0.5, //0.7
                refineFaceLandmarks: true
            });

            this.holistic.onResults((results: Holistic.Results) => {
                if (!this.cameraHasStarted) {
                    this.cameraHasStarted = true;
                }
                animateVRM(this.currentVrm, results, this.cameraVideo);
            });

            this.cameraHolistic = new Camera(this.cameraVideo, {
                onFrame: async () => {
                    await this.holistic.send({ image: this.cameraVideo });
                },
                width: 480,
                height: 480
            });

            await this.cameraHolistic.start();
        } else {
            await this.cameraHolistic.stop();
        }
    };

    public setBackgroundColor(color: string) {
        this.renderer.setClearColor(color);
    }

    public setSkintone(color: string) {
        this.materials.forEach((mat: any) => {
            if (mat.name.includes('MAT_FACE_SKIN') || mat.name.includes('MAT_BODY_SKIN')) {
                mat.color.set(color);
                mat.uniforms.shadeColorFactor.value.set(color);
                mat.uniformsNeedUpdate = true;
            }
        });
    }

    public setHairColor(color: string) {
        this.materials.forEach((mat: any) => {
            if (mat.name.includes('MAT_HAIR')) {
                mat.color.set(color);
                mat.uniforms.shadeColorFactor.value.set(color);
                mat.uniformsNeedUpdate = true;
            }
        });
    }

    public setBrowColor(color: string) {
        this.materials.forEach((mat: any) => {
            if (mat.name.includes('MAT_FACE_BROW')) {
                mat.color.set(color);
                mat.uniforms.shadeColorFactor.value.set(color);
                mat.uniformsNeedUpdate = true;
            }
        });
    }

    public setIrisColor(color: string) {
        this.materials.forEach((mat: any) => {
            if (mat.name.includes('MAT_EYE_IRIS')) {
                mat.color.set(color);
                mat.uniforms.shadeColorFactor.value.set(color);
                mat.uniformsNeedUpdate = true;
            }
        });
    }
}
