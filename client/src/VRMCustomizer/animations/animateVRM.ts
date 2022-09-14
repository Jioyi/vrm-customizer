import * as THREE from 'three';
import { VRM, VRMExpressionPresetName, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { Results } from '@mediapipe/holistic';
import * as Kalidokit from 'kalidokit';

const animateVRM = (vrm: VRM, results: Results, videoEl: HTMLVideoElement) => {
    if (!vrm) return;

    // Import Helper Functions from Kalidokit
    const clamp = Kalidokit.Utils.clamp;
    const lerp = Kalidokit.Vector.lerp;

    const oldLookTarget = new THREE.Euler();

    // Animate Rotation Helper function
    const rigRotation = (name: keyof typeof VRMHumanBoneName, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        const Part = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName[name]); // getBoneNode
        if (!Part) return;

        const euler = new THREE.Euler(rotation.x * dampener, rotation.y * dampener, rotation.z * dampener);
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    };

    // Animate Position Helper Function
    const rigPosition = (name: keyof typeof VRMHumanBoneName, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        const Part = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName[name]); // getBoneNode
        if (!Part) return;

        const vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
        Part.position.lerp(vector, lerpAmount); // interpolate
    };

    const rigFace = (riggedFace: Kalidokit.TFace) => {
        if (!vrm) return;

        rigRotation('Neck', riggedFace.head, 0.7);

        //  Blendshapes and Preset Name Schema
        const Blendshape = vrm.expressionManager;

        const PresetName = VRMExpressionPresetName;

        if (!Blendshape) return;

        // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
        // for VRM, 1 is closed, 0 is open.
        if (riggedFace.eye) {
            riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.Blink) as number, 0.5);
            riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.Blink) as number, 0.5);
            riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);
            Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);
        }

        // Interpolate and set mouth blendshapes
        Blendshape.setValue(PresetName.Ih, lerp(riggedFace.mouth.shape.I, Blendshape.getValue(PresetName.Ih) as number, 0.5));
        Blendshape.setValue(PresetName.Aa, lerp(riggedFace.mouth.shape.A, Blendshape.getValue(PresetName.Aa) as number, 0.5));
        Blendshape.setValue(PresetName.Ee, lerp(riggedFace.mouth.shape.E, Blendshape.getValue(PresetName.Ee) as number, 0.5));
        Blendshape.setValue(PresetName.Oh, lerp(riggedFace.mouth.shape.O, Blendshape.getValue(PresetName.Oh) as number, 0.5));
        Blendshape.setValue(PresetName.Ou, lerp(riggedFace.mouth.shape.U, Blendshape.getValue(PresetName.Ou) as number, 0.5));

        // PUPILS
        // interpolate pupil and keep a copy of the value
        if (riggedFace.pupil) {
            const lookTarget = new THREE.Euler(lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4), lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4), 0, 'XYZ');
            oldLookTarget.copy(lookTarget);
            // vrm.lookAt?.applier?.lookAt(lookTarget);
        }
    };

    // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
    let riggedPose: Kalidokit.TPose | undefined;
    let riggedLeftHand: Kalidokit.THand<'Left'> | undefined;
    let riggedRightHand: Kalidokit.THand<'Right'> | undefined;
    let riggedFace: Kalidokit.TFace | undefined;
    // Pose 3D Landmarks are with respect to Hip distance in meters
    const pose3DLandmarks = (results as any).ea;
    // Pose 2D landmarks are with respect to videoWidth and videoHeight
    const pose2DLandmarks = results.poseLandmarks;

    const { faceLandmarks } = results;
    // Be careful, hand landmarks may be reversed
    const leftHandLandmarks = results.rightHandLandmarks;
    const rightHandLandmarks = results.leftHandLandmarks;

    // Animate Face
    if (faceLandmarks) {
        riggedFace = Kalidokit.Face.solve(faceLandmarks, {
            runtime: 'mediapipe',
            video: videoEl
        });
    }
    // Animate Pose
    if (pose2DLandmarks && pose3DLandmarks) {
        riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
            runtime: 'mediapipe',
            video: videoEl
        });
    }
    // Animate Hands
    if (leftHandLandmarks) riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, 'Left');
    if (rightHandLandmarks) riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, 'Right');

    // rotate by data
    if (riggedFace) rigFace(riggedFace);

    if (riggedPose) {
        // rigRotation('Hips', riggedPose.Hips.rotation, 0.7);
        if (riggedPose.Hips.worldPosition) {
            rigPosition(
                'Hips',
                {
                    x: -riggedPose.Hips.worldPosition.x, // Reverse direction
                    y: riggedPose.Hips.worldPosition.y + 1, // Add a bit of height
                    z: -riggedPose.Hips.worldPosition.z // Reverse direction
                },
                1,
                0.07
            );
        }

        rigRotation('Chest', riggedPose.Spine, 0.25, 0.3);
        rigRotation('Spine', riggedPose.Spine, 0.45, 0.3);

        rigRotation('RightUpperArm', riggedPose.RightUpperArm, 1, 0.3);
        rigRotation('RightLowerArm', riggedPose.RightLowerArm, 1, 0.3);
        rigRotation('LeftUpperArm', riggedPose.LeftUpperArm, 1, 0.3);
        rigRotation('LeftLowerArm', riggedPose.LeftLowerArm, 1, 0.3);

        rigRotation('LeftUpperLeg', riggedPose.LeftUpperLeg, 1, 0.3);
        rigRotation('LeftLowerLeg', riggedPose.LeftLowerLeg, 1, 0.3);
        rigRotation('RightUpperLeg', riggedPose.RightUpperLeg, 1, 0.3);
        rigRotation('RightLowerLeg', riggedPose.RightLowerLeg, 1, 0.3);
    }

    if (riggedLeftHand) {
        if (riggedPose) {
            rigRotation('LeftHand', {
                // Combine pose rotation Z and hand rotation X Y
                z: riggedPose.LeftHand.z,
                y: riggedLeftHand.LeftWrist.y,
                x: riggedLeftHand.LeftWrist.x
            });
        }
        rigRotation('LeftRingProximal', riggedLeftHand.LeftRingProximal);
        rigRotation('LeftRingIntermediate', riggedLeftHand.LeftRingIntermediate);
        rigRotation('LeftRingDistal', riggedLeftHand.LeftRingDistal);
        rigRotation('LeftIndexProximal', riggedLeftHand.LeftIndexProximal);
        rigRotation('LeftIndexIntermediate', riggedLeftHand.LeftIndexIntermediate);
        rigRotation('LeftIndexDistal', riggedLeftHand.LeftIndexDistal);
        rigRotation('LeftMiddleProximal', riggedLeftHand.LeftMiddleProximal);
        rigRotation('LeftMiddleIntermediate', riggedLeftHand.LeftMiddleIntermediate);
        rigRotation('LeftMiddleDistal', riggedLeftHand.LeftMiddleDistal);
        rigRotation('LeftThumbProximal', riggedLeftHand.LeftThumbProximal);
        rigRotation('LeftThumbMetacarpal', riggedLeftHand.LeftThumbIntermediate); // <== LeftThumbIntermediate
        rigRotation('LeftThumbDistal', riggedLeftHand.LeftThumbDistal);
        rigRotation('LeftLittleProximal', riggedLeftHand.LeftLittleProximal);
        rigRotation('LeftLittleIntermediate', riggedLeftHand.LeftLittleIntermediate);
        rigRotation('LeftLittleDistal', riggedLeftHand.LeftLittleDistal);
    }

    if (riggedRightHand) {
        if (riggedPose) {
            rigRotation('RightHand', {
                // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
                z: riggedPose.RightHand.z,
                y: riggedRightHand.RightWrist.y,
                x: riggedRightHand.RightWrist.x
            });
        }
        rigRotation('RightRingProximal', riggedRightHand.RightRingProximal);
        rigRotation('RightRingIntermediate', riggedRightHand.RightRingIntermediate);
        rigRotation('RightRingDistal', riggedRightHand.RightRingDistal);
        rigRotation('RightIndexProximal', riggedRightHand.RightIndexProximal);
        rigRotation('RightIndexIntermediate', riggedRightHand.RightIndexIntermediate);
        rigRotation('RightIndexDistal', riggedRightHand.RightIndexDistal);
        rigRotation('RightMiddleProximal', riggedRightHand.RightMiddleProximal);
        rigRotation('RightMiddleIntermediate', riggedRightHand.RightMiddleIntermediate);
        rigRotation('RightMiddleDistal', riggedRightHand.RightMiddleDistal);
        rigRotation('RightThumbProximal', riggedRightHand.RightThumbProximal);
        rigRotation('RightThumbMetacarpal', riggedRightHand.RightThumbIntermediate); // <== RightThumbMetacarpal
        rigRotation('RightThumbDistal', riggedRightHand.RightThumbDistal);
        rigRotation('RightLittleProximal', riggedRightHand.RightLittleProximal);
        rigRotation('RightLittleIntermediate', riggedRightHand.RightLittleIntermediate);
        rigRotation('RightLittleDistal', riggedRightHand.RightLittleDistal);
    }
};

export default animateVRM;
