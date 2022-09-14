import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import mixamoVRMRigMap from './mixamoVRMRigMap';

const FBXloaderMixamoAnimation = async (vrm: VRM, url: string): Promise<THREE.AnimationClip | null> => {
    const { humanoid } = vrm;
    if (humanoid == null) return null;

    const loader = new FBXLoader();

    loader.crossOrigin = 'anonymous';
    const asset = await loader.loadAsync(url);

    const fbxHips = asset.children[0];
    const fbxHipsY = fbxHips.position.y;
    const vrmHips = humanoid.normalizedRestPose.hips;

    let hipsPositionScale = 0.01;
    if (vrmHips && vrmHips.position) {
        const vrmHipsY = vrmHips.position[1];
        hipsPositionScale = vrmHipsY / fbxHipsY;
    }

    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
    const tracks: THREE.KeyframeTrack[] = [];

    clip.tracks.forEach((track) => {
        const trackSplitted = track.name.split('.');
        const mixamoRigName = trackSplitted[0];
        const vrmBoneName = mixamoVRMRigMap[mixamoRigName];

        if (vrmBoneName !== null) {
            const vrmNodeName = humanoid.getNormalizedBoneNode(vrmBoneName as VRMHumanBoneName)?.name;

            if (vrmNodeName !== null) {
                const propertyName = trackSplitted[1];

                if (track instanceof THREE.QuaternionKeyframeTrack || track.name.includes('quaternion')) {
                    const trackValues = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v));
                    tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNodeName}.${propertyName}`, Array.from(track.times), Array.from(trackValues)));
                } else if ((track instanceof THREE.VectorKeyframeTrack || track.name.includes('position')) && vrmNodeName === 'Normalized_Hips') {
                    console.log('position:', vrmNodeName);
                    const trackValues = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale);
                    tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, Array.from(track.times), Array.from(trackValues)));
                }
            }
        }
    });
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
};

export default FBXloaderMixamoAnimation;
