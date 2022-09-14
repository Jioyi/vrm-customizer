import * as THREE from 'three';
import VRMCustomizer from '..';

export default class VRMCustomizerHelpersPlugin {
    public readonly VRMC: VRMCustomizer;

    public readonly humanoidHelperRoot: THREE.Group;

    public readonly lookAtHelperRoot: THREE.Group;

    public readonly springBoneJointHelperRoot: THREE.Group;

    public readonly springBoneColliderHelperRoot: THREE.Group;

    public constructor(_VRMCustomizer: VRMCustomizer) {
        this.VRMC = _VRMCustomizer;

        this.humanoidHelperRoot = new THREE.Group();
        this.humanoidHelperRoot.renderOrder = 10000;
        this.VRMC.scene.add(this.humanoidHelperRoot);

        this.lookAtHelperRoot = new THREE.Group();
        this.lookAtHelperRoot.renderOrder = 10000;
        this.VRMC.scene.add(this.lookAtHelperRoot);

        this.springBoneJointHelperRoot = new THREE.Group();
        this.springBoneJointHelperRoot.renderOrder = 10000;
        this.VRMC.scene.add(this.springBoneJointHelperRoot);

        this.springBoneColliderHelperRoot = new THREE.Group();
        this.springBoneColliderHelperRoot.renderOrder = 10000;
        this.VRMC.scene.add(this.springBoneColliderHelperRoot);
    }
}
