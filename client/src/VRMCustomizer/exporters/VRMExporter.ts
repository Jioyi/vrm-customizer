import * as THREE from 'three';
import { MToonMaterial, VRM, VRM0Meta } from '@pixiv/three-vrm';
import { MaterialType, OutputMesh, OutputNode, OutputScene, VRMObjectType, WEBGL_CONSTANTS } from './VRMExporterInterface';
import { expressionManagerVRM0, getPaddedArrayBuffer, getPaddedBufferSize, stringToArrayBuffer } from './VRMExporterUtils';

let cachedCanvas: any = null;

const getCanvas = () => {
    if (cachedCanvas) {
        return cachedCanvas;
    }
    if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'undefined') {
        cachedCanvas = new OffscreenCanvas(1, 1);
    } else {
        cachedCanvas = document.createElement('canvas');
    }
    return cachedCanvas;
};

const MORPH_CONTROLLER_PREFIX = 'VRMExpression_';
const EXPORTER_VERSION = 'VRMExporter-2.0';

// GLB constants
const GLB_HEADER_BYTES = 12;
const GLB_HEADER_MAGIC = 0x46546c67;
const GLB_VERSION = 2;

const GLB_CHUNK_PREFIX_BYTES = 8;
const GLB_CHUNK_TYPE_JSON = 0x4e4f534a;
const GLB_CHUNK_TYPE_BIN = 0x004e4942;

const THREE_TO_WEBGL: any = {};

THREE_TO_WEBGL[THREE.NearestFilter] = WEBGL_CONSTANTS.NEAREST;
THREE_TO_WEBGL[THREE.NearestMipmapNearestFilter] = WEBGL_CONSTANTS.NEAREST_MIPMAP_NEAREST;
THREE_TO_WEBGL[THREE.NearestMipmapLinearFilter] = WEBGL_CONSTANTS.NEAREST_MIPMAP_LINEAR;
THREE_TO_WEBGL[THREE.LinearFilter] = WEBGL_CONSTANTS.LINEAR;
THREE_TO_WEBGL[THREE.LinearMipmapNearestFilter] = WEBGL_CONSTANTS.LINEAR_MIPMAP_NEAREST;
THREE_TO_WEBGL[THREE.LinearMipmapLinearFilter] = WEBGL_CONSTANTS.LINEAR_MIPMAP_LINEAR;

THREE_TO_WEBGL[THREE.ClampToEdgeWrapping] = WEBGL_CONSTANTS.CLAMP_TO_EDGE;
THREE_TO_WEBGL[THREE.RepeatWrapping] = WEBGL_CONSTANTS.REPEAT;
THREE_TO_WEBGL[THREE.MirroredRepeatWrapping] = WEBGL_CONSTANTS.MIRRORED_REPEAT;

export default class VRMExporter {
    buffers: ArrayBuffer[];
    outputData: any;
    byteOffset: number;
    skins: any[];
    nodeMap: Map<any, any>;
    joinMap: Map<any, any>;
    cache: {
        meshes: Map<any, any>;
        attributes: Map<any, any>;
        attributesNormalized: Map<any, any>;
        materials: Map<any, any>;
        textures: Map<any, any>;
        images: Map<any, any>;
    };
    pending: any[];
    uids: Map<any, any>;
    uid: number;
    outputMaterialProperties: any[];
    userData: any;

    constructor() {
        this.cache = {
            meshes: new Map(),
            attributes: new Map(),
            attributesNormalized: new Map(),
            materials: new Map(),
            textures: new Map(),
            images: new Map()
        };
        this.outputMaterialProperties = [];
        this.uid = 0;
        this.uids = new Map();
        this.nodeMap = new Map();
        this.joinMap = new Map();
        this.pending = [];
        this.skins = [];
        this.buffers = [];
        this.byteOffset = 0;
        this.outputData = {
            asset: {
                version: '2.0',
                generator: 'VRMExporter'
            },
            bufferViews: [],
            accessors: [],
            scene: 0,
            extensions: {},
            extensionsUsed: [],
            nodes: [],
            scenes: [],
            images: [],
            materials: [],
            meshes: [],
            samplers: [],
            skins: [],
            textures: []
        };
    }

    async parse(vrm: VRM, userData: any, onDone: (buffer: ArrayBuffer) => void): Promise<void> {
        this.processVRM(vrm, userData.gltfExtensions.VRM);

        await Promise.all(this.pending);

        const writer = this;
        const buffers = writer.buffers;
        const outputData = writer.outputData;

        // Merge buffers.
        const blob = new Blob(buffers, { type: 'application/octet-stream' });

        // Declare extensions.
        outputData.extensionsUsed = ['KHR_materials_unlit', 'KHR_texture_transform', 'VRMC_materials_mtoon', 'VRM'];

        // Update bytelength of the single buffer.
        if (outputData.buffers && outputData.buffers.length > 0) outputData.buffers[0].byteLength = blob.size;
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onloadend = () => {
            // Binary chunk.
            var binaryChunk = getPaddedArrayBuffer(reader.result as ArrayBuffer);
            var binaryChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
            binaryChunkPrefix.setUint32(0, binaryChunk.byteLength, true);
            binaryChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_BIN, true);

            // JSON chunk.
            var jsonChunk = getPaddedArrayBuffer(stringToArrayBuffer(JSON.stringify(outputData)), 0x20);
            var jsonChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
            jsonChunkPrefix.setUint32(0, jsonChunk.byteLength, true);
            jsonChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_JSON, true);

            // GLB header.
            var header = new ArrayBuffer(GLB_HEADER_BYTES);
            var headerView = new DataView(header);
            headerView.setUint32(0, GLB_HEADER_MAGIC, true);
            headerView.setUint32(4, GLB_VERSION, true);
            var totalByteLength = GLB_HEADER_BYTES + jsonChunkPrefix.byteLength + jsonChunk.byteLength + binaryChunkPrefix.byteLength + binaryChunk.byteLength;
            headerView.setUint32(8, totalByteLength, true);

            var glbBlob = new Blob([header, jsonChunkPrefix, jsonChunk, binaryChunkPrefix, binaryChunk], { type: 'application/octet-stream' });

            var glbReader = new window.FileReader();
            glbReader.readAsArrayBuffer(glbBlob);
            glbReader.onloadend = () => {
                onDone(glbReader.result as ArrayBuffer);
            };
        };
    }

    processVRM(vrm: VRM, userData: any) {
        const outputData = this.outputData;
        const nodeMap = this.nodeMap;
        //const joinMap = this.joinMap;
        this.userData = userData;
        const scene = vrm.scene.clone();
        const humanoid = vrm.humanoid;
        const firstPerson = vrm.firstPerson;
        const expressionManager = vrm.expressionManager;
        const lookAt = vrm.lookAt;
        if (!scene) {
            throw new Error('VRMExporter: Scene is undefined or null');
        } else if (!humanoid) {
            throw new Error('VRMExporter: Humanoid is undefined or null');
        } else if (!firstPerson) {
            throw new Error('VRMExporter: firstPerson is undefined or null');
        } else if (!expressionManager) {
            throw new Error('VRMExporter: ExpressionManager is undefined or null');
        } else if (!lookAt) {
            throw new Error('VRMExporter: LookAt is undefined or null');
        }

        this.processScene(scene);

        for (let i = 0; i < this.skins.length; ++i) {
            this.processSkin(this.skins[i]);
            //this.processMultySkin(this.skins[i]);
        }

        const vrmBlendShapeMaster = {
            // @ts-ignore: Unreachable code error
            blendShapeGroups: Object.values(expressionManager._expressionMap).map((blendShape: any) => {
                // @ts-ignore: Unreachable code error
                //console.log('vrmBlendShapeMaster', blendShape._binds);
                // @ts-ignore: Unreachable code error

                const binds = [];
                const bind = blendShape._binds[0];
                for (let i = 0, l = blendShape._binds[0]?.primitives?.length; i < l; i++) {
                    const nodeIndex = nodeMap.get(blendShape._binds[0].primitives[i].name);
                    binds.push({
                        mesh: nodeIndex,
                        index: bind.index,
                        weight: bind.weight * 100
                    });
                    /*const child = scene.children[i];
                    if (child.visible) {
                        const nodeIndex = this.processNode(child);
                        if (nodeIndex !== null) nodes.push(nodeIndex);
                    }*/
                }
                /*.forEach((bind) => {
                    const node = nodeMap.get(bind.primitives[0].name);
                    //const join = joinMap.get(node);
                    return {
                        mesh: node,
                        index: bind.index, //join.geometry.userData.targetNames[bind.index], //bind.index,
                        weight: bind.weight * 100
                    };
                }),*/

                return {
                    // @ts-ignore: Unreachable code error
                    name: blendShape.name.replace(MORPH_CONTROLLER_PREFIX, ''),
                    // @ts-ignore: Unreachable code error
                    presetName: expressionManagerVRM0(blendShape.expressionName),
                    // @ts-ignore: Unreachable code error
                    isBinary: blendShape.isBinary,
                    // @ts-ignore: Unreachable code error
                    binds: binds,
                    materialValues: []
                };
            })
        };

        const vrmHumanoid = {
            armStretch: 0.05000000074505806,
            feetSpacing: 0,
            hasTranslationDoF: false,
            humanBones: Object.entries(humanoid.humanBones).map((x: any) => ({
                bone: x[0],
                node: nodeMap.get(x[1].node.name),
                useDefaultValues: true
            })),
            legStretch: 0.05000000074505806,
            lowerArmTwist: 0.5,
            lowerLegTwist: 0.5,
            upperArmTwist: 0.5,
            upperLegTwist: 0.5
        };

        const outputMeta: VRM0Meta = {
            title: 'VRMExporter-2.0',
            metaVersion: '0',
            author: 'VRMExporter-2.0',
            version: '1.0.0',
            violentUssageName: 'Allow',
            sexualUssageName: 'Allow'
            //otherPermissionUrl: 'https://vrm-customizer.herokuapp.com/'
        };

        outputData.extensions.VRM = {
            //blendShapeMaster: vrmBlendShapeMaster,
            exporterVersion: EXPORTER_VERSION, // EXPORTER_VERSION,
            //firstPerson: vrmFirstPerson, //vrmFirstPerson,
            humanoid: vrmHumanoid, // get humanBones
            materialProperties: this.outputMaterialProperties, //outputMaterialProperties,
            meta: outputMeta,
            //secondaryAnimation: secondaryAnimation, //outputSecondaryAnimation,
            specVersion: '0.0' // TODO:
        };
    }

    processScene(scene: THREE.Scene | THREE.Group) {
        const outputData = this.outputData;
        if (!outputData.scenes) {
            outputData.scenes = [];
            outputData.scene = 0;
        }

        const sceneDef: OutputScene = {
            nodes: []
        };

        if (scene.name !== '') sceneDef.name = scene.name;

        outputData.scenes.push(sceneDef);
        const nodes = [];

        for (let i = 0, l = scene.children.length; i < l; i++) {
            const child = scene.children[i];
            if (child.visible) {
                const nodeIndex = this.processNode(child);
                if (nodeIndex !== null) nodes.push(nodeIndex);
            }
        }
        /*const preNodes = scene.children.filter(
            (child) => child.type === VRMObjectType.Group || child.type === VRMObjectType.SkinnedMesh || child.type === VRMObjectType.Bone
        );


        for (let i = 0, l = preNodes.length; i < l; i++) {
            const child = preNodes[i];
            if (child.visible) {
                const nodeIndex = this.processNode(child);
                if (nodeIndex !== null) nodes.push(nodeIndex);
            }
        }*/

        if (nodes.length > 0) sceneDef.nodes = nodes;
    }

    getNodes(parentNode: THREE.Object3D | THREE.Bone): Array<THREE.Object3D | THREE.Bone> {
        if (parentNode.children.length <= 0) return [parentNode];
        return [parentNode].concat(parentNode.children.map((child) => this.getNodes(child)).flat());
    }

    serializeUserData(object: any, objectDef: any) {
        if (Object.keys(object.userData).length === 0) return;

        try {
            const json = JSON.parse(JSON.stringify(object.userData));

            if (Object.keys(json).length > 0) objectDef.extras = json;
        } catch (error) {
            let message;
            if (error instanceof Error) {
                message = error.message;
            } else {
                message = String(error);
            }
            console.warn(`VRMExporter: userData of '${object.name}' won't be serialized because of JSON.stringify error - ${message}`);
        }
    }

    processNode(object: any) {
        if (object.name.includes('VRMHumanoidRig')) return null;
        const outputData = this.outputData;
        if (!outputData.nodes) outputData.nodes = [];
        const nodeMap = this.nodeMap;
        const joinMap = this.joinMap;
        const nodeDef: OutputNode = {
            name: String(object.name),
            rotation: [object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w],
            scale: [object.scale.x, object.scale.y, object.scale.z],
            translation: [object.position.x, object.position.y, object.position.z]
        };

        // this.serializeUserData(object, nodeDef);
        if (object.type === VRMObjectType.Bone) nodeDef.isBone = true;

        /*if (object.type === VRMObjectType.Group) {
            const meshIndex = this.processMultyMesh3(object);
            if (meshIndex !== null) nodeDef.mesh = meshIndex;
            this.skins.push(object);
        }*/
        if (object.isMesh) {
            const meshIndex = this.processMesh(object);
            if (meshIndex !== null) nodeDef.mesh = meshIndex;
        }
        if (object.isSkinnedMesh) this.skins.push(object);
        /*if (object.isMesh) {
            const meshIndex = this.processMesh(object);
            if (meshIndex !== null) nodeDef.mesh = meshIndex;
        }*/

        //if (object.isSkinnedMesh) this.skins.push(object);

        if (object.children.length > 0) {
            const children = [];
            for (let i = 0, l = object.children.length; i < l; i++) {
                const child = object.children[i];
                if (child.visible) {
                    const nodeIndex = this.processNode(child);
                    if (nodeIndex !== null) children.push(nodeIndex);
                }
            }
            if (children.length > 0) nodeDef.children = children;
        }
        const nodeIndex = outputData.nodes.push(nodeDef) - 1;
        nodeMap.set(object.name, nodeIndex);
        joinMap.set(nodeIndex, object);
        return nodeIndex;
    }

    processAccessor(
        attribute: THREE.BufferAttribute,
        geometry: THREE.BufferGeometry | undefined = undefined,
        start: number | undefined = undefined,
        count: number | undefined = undefined
    ) {
        const outputData = this.outputData;

        const types: any = {
            1: 'SCALAR',
            2: 'VEC2',
            3: 'VEC3',
            4: 'VEC4',
            16: 'MAT4'
        };

        let componentType;

        // Detect the component type of the attribute array (float, uint or ushort)
        if (attribute.array.constructor === Float32Array) {
            componentType = WEBGL_CONSTANTS.FLOAT;
        } else if (attribute.array.constructor === Uint32Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_INT;
        } else if (attribute.array.constructor === Uint16Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_SHORT;
        } else if (attribute.array.constructor === Uint8Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_BYTE;
        } else {
            throw new Error('THREE.GLTFExporter: Unsupported bufferAttribute component type.');
        }

        if (start === undefined) start = 0;
        if (count === undefined) count = attribute.count;

        // Skip creating an accessor if the attribute doesn't have data to export
        if (count === 0) return null;

        const minMax = this.getMinMax(attribute, start, count);
        let bufferViewTarget;

        // If geometry isn't provided, don't infer the target usage of the bufferView. For
        // animation samplers, target must not be set.
        if (geometry !== undefined) {
            bufferViewTarget = attribute === geometry.index ? WEBGL_CONSTANTS.ELEMENT_ARRAY_BUFFER : WEBGL_CONSTANTS.ARRAY_BUFFER;
        }

        const bufferView = this.processBufferView(attribute, componentType, start, count, bufferViewTarget);

        const accessorDef: any = {
            bufferView: bufferView.id,
            byteOffset: bufferView.byteOffset,
            componentType: componentType,
            count: count,
            max: minMax.max,
            min: minMax.min,
            type: types[attribute.itemSize]
        };

        if (attribute.normalized === true) accessorDef.normalized = true;
        if (!outputData.accessors) outputData.accessors = [];

        return outputData.accessors.push(accessorDef) - 1;
    }

    processBuffer(buffer: ArrayBuffer) {
        const outputData = this.outputData;
        const buffers = this.buffers;
        if (!outputData.buffers) outputData.buffers = [{ byteLength: 0 }];
        // All buffers are merged before export.
        buffers.push(buffer);
        return 0;
    }

    getMinMax(attribute: THREE.BufferAttribute, start: number, count: number): { min: Array<number>; max: Array<number> } {
        const output = {
            min: new Array(attribute.itemSize).fill(Number.POSITIVE_INFINITY),
            max: new Array(attribute.itemSize).fill(Number.NEGATIVE_INFINITY)
        };
        for (let i = start; i < start + count; i++) {
            for (let a = 0; a < attribute.itemSize; a++) {
                let value;

                if (attribute.itemSize > 4) {
                    // no support for interleaved data for itemSize > 4
                    value = attribute.array[i * attribute.itemSize + a];
                } else {
                    if (a === 0) value = attribute.getX(i);
                    else if (a === 1) value = attribute.getY(i);
                    else if (a === 2) value = attribute.getZ(i);
                    else if (a === 3) value = attribute.getW(i);
                }

                output.min[a] = Math.min(output.min[a], value as number);
                output.max[a] = Math.max(output.max[a], value as number);
            }
        }
        return output;
    }

    processSkin(object: any) {
        const outputData = this.outputData;
        const nodeMap = this.nodeMap;

        const node = outputData.nodes[nodeMap.get(object.name)];

        const skeleton = object.skeleton;
        if (skeleton === undefined) return null;

        const rootJoint = object.skeleton.bones[0];
        if (rootJoint === undefined) return null;

        const joints = [];
        const inverseBindMatrices = new Float32Array(skeleton.bones.length * 16);
        const temporaryBoneInverse = new THREE.Matrix4();

        for (let i = 0; i < skeleton.bones.length; ++i) {
            joints.push(nodeMap.get(skeleton.bones[i].name));
            temporaryBoneInverse.copy(skeleton.boneInverses[i]);
            temporaryBoneInverse.multiply(object.bindMatrix).toArray(inverseBindMatrices, i * 16);
        }

        if (outputData.skins === undefined) outputData.skins = [];

        outputData.skins.push({
            inverseBindMatrices: this.processAccessor(new THREE.BufferAttribute(inverseBindMatrices, 16)),
            joints: joints,
            skeleton: nodeMap.get(rootJoint.name)
        });

        const skinIndex = (node.skin = outputData.skins.length - 1);
        return skinIndex;
    }

    processMultySkin(object: any) {
        const outputData = this.outputData;
        const nodeMap = this.nodeMap;
        const joinMap = this.joinMap;

        const joints = [];
        const boneInverses: any = {};
        const bindMatrix: any = {};

        for (let i = 0, l = object.children.length; i < l; i++) {
            for (let e = 0; e < object.children[i].skeleton.boneInverses.length; ++e) {
                boneInverses[nodeMap.get(object.children[i].skeleton.bones[e].name)] = object.children[i].skeleton.boneInverses[e];
                bindMatrix[nodeMap.get(object.children[i].skeleton.bones[e].name)] = i;
            }
            for (let e = 0; e < object.children[i].skeleton.bones.length; ++e) {
                joints.push(nodeMap.get(object.children[i].skeleton.bones[e].name));
            }
        }

        const reJoints = Array.from(new Set(joints));

        const node = outputData.nodes[nodeMap.get(object.name)];

        const skeleton = object.children[0].skeleton;
        if (skeleton === undefined) return null;

        const rootJoint = object.children[0].skeleton.bones[0];
        if (rootJoint === undefined) return null;

        const temporaryBoneInverse = new THREE.Matrix4();
        const inverseBindMatrices = new Float32Array(reJoints.length * 16);

        for (let i = 0; i < reJoints.length; ++i) {
            temporaryBoneInverse.copy(boneInverses[reJoints[i]]);
            temporaryBoneInverse.multiply(object.children[bindMatrix[reJoints[i]]].bindMatrix).toArray(inverseBindMatrices, i * 16);
        }

        /*
        for (let i = 0, l = object.children.length; i < l; i++) {
            const subSkeleton = object.children[i].skeleton;
            for (let e = 0; e < subSkeleton.bones.length; ++e) {
                //subSkeleton.boneInverses[e].elements.flat();
                //temporaryBoneInverse.copy(subSkeleton.boneInverses[e]);
                temporaryBoneInverse.multiplyMatrices(subSkeleton.bones[e].matrixWorld, subSkeleton.boneInverses[e]).toArray(inverseBindMatrices, e * 16);
                //temporaryBoneInverse.multiply(object.children[i].bindMatrix).toArray(inverseBindMatrices, e * 16);
                //object.children[i].bindMatrix;*/
        //temporaryBoneInverse.multiplyMatrices(subSkeleton.bones[e].matrixWorld, subSkeleton.boneInverses[e]).toArray(inverseBindMatrices, e * 16);
        /*}
        }*/

        /*for (let i = 0; i < skeleton.bones.length; ++i) {
            joints.push(nodeMap.get(skeleton.bones[i].name));
            temporaryBoneInverse.copy(skeleton.boneInverses[i]);
            temporaryBoneInverse.multiply(object.children[0].bindMatrix).toArray(inverseBindMatrices, i * 16);
        }*/

        /*for (let i = 0; i < skeleton.bones.length; ++i) {
            joints.push(nodeMap.get(skeleton.bones[i].name));
            //temporaryBoneInverse.copy(skeleton.boneInverses[i]);
            //temporaryBoneInverse.multiply(object.bindMatrix).toArray(inverseBindMatrices, i * 16);
        }*/

        /*for (let i = 0, l = object.children.length; i < l; i++) {
            const subSkeleton = object.children[i].skeleton;
            for (let e = 0; e < subSkeleton.bones.length; ++e) {
                subSkeleton.boneInverses[e].elements.flat();
                temporaryBoneInverse.copy(subSkeleton.boneInverses[e]);
                temporaryBoneInverse.multiply(object.children[i].bindMatrix).toArray(inverseBindMatrices, e * 16);
            }
        }*/

        if (outputData.skins === undefined) outputData.skins = [];

        outputData.skins.push({
            inverseBindMatrices: this.processAccessor(new THREE.BufferAttribute(inverseBindMatrices, 16)),
            joints: reJoints,
            skeleton: nodeMap.get(rootJoint.name)
        });

        const skinIndex = (node.skin = outputData.skins.length - 1);
        return skinIndex;
    }

    processMultyMesh(object: any) {
        const outputData = this.outputData;

        const meshDef: OutputMesh = {
            name: object.name,
            isSkinnedMesh: true
        };

        const primitives = [];

        // Conversion between attributes names in threejs and gltf spec
        const nameConversion: any = {
            uv: 'TEXCOORD_0',
            uv2: 'TEXCOORD_1',
            color: 'COLOR_0',
            skinWeight: 'WEIGHTS_0',
            skinIndex: 'JOINTS_0'
        };

        for (let i = 0, l = object.children.length; i < l; i++) {
            const mesh = object.children[i];

            const targets: any = [];
            const attributes: any = {};
            let modifiedAttribute = null;

            for (let attributeName in mesh.geometry.attributes) {
                // Ignore morph target attributes, which are exported later.
                if (attributeName.slice(0, 5) === 'morph') continue;

                const attribute = mesh.geometry.attributes[attributeName];
                attributeName = nameConversion[attributeName] || attributeName.toUpperCase();

                // Prefix all geometry attributes except the ones specifically
                // listed in the spec; non-spec attributes are considered custom.
                const validVertexAttributes = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;

                if (!validVertexAttributes.test(attributeName)) attributeName = '_' + attributeName;

                // JOINTS_0 must be UNSIGNED_BYTE or UNSIGNED_SHORT.
                modifiedAttribute = null;
                const array = attribute.array;

                if (attributeName === 'JOINTS_0' && !(array instanceof Uint16Array) && !(array instanceof Uint8Array)) {
                    console.warn('GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                    modifiedAttribute = new THREE.BufferAttribute(new Uint16Array(array), attribute.itemSize, attribute.normalized);
                }

                const accessor = this.processAccessor(modifiedAttribute || attribute, mesh.geometry);

                if (accessor !== null) {
                    attributes[attributeName] = accessor;
                }
            }
            // Morph targets
            if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
                const weights = [];
                const targetNames = [];
                const reverseDictionary: any = {};

                if (mesh.morphTargetDictionary !== undefined) {
                    for (const key in mesh.morphTargetDictionary) {
                        reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                    }
                }

                for (let i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                    const target: any = {};

                    for (const attributeName in mesh.geometry.morphAttributes) {
                        const attribute = mesh.geometry.morphAttributes[attributeName][i];
                        const gltfAttributeName = attributeName.toUpperCase();
                        const baseAttribute = mesh.geometry.attributes[attributeName];

                        // Clones attribute not to override
                        const relativeAttribute = attribute.clone();

                        if (!mesh.geometry.morphTargetsRelative) {
                            for (let j = 0, jl = attribute.count; j < jl; j++) {
                                relativeAttribute.setXYZ(
                                    j,
                                    attribute.getX(j) - baseAttribute.getX(j),
                                    attribute.getY(j) - baseAttribute.getY(j),
                                    attribute.getZ(j) - baseAttribute.getZ(j)
                                );
                            }
                        }

                        target[gltfAttributeName] = this.processAccessor(relativeAttribute, mesh.geometry);
                    }

                    targets.push(target);

                    weights.push(mesh.morphTargetInfluences[i]);

                    if (mesh.morphTargetDictionary !== undefined) targetNames.push(reverseDictionary[i]);
                }
                console.log(targetNames);
                meshDef.weights = weights;

                if (targetNames.length > 0) meshDef.extras = { targetNames };
            }

            const isMultiMaterial = Array.isArray(mesh.material);
            if (isMultiMaterial && mesh.geometry.groups.length === 0) return null;
            const materials = isMultiMaterial ? mesh.material : [mesh.material];
            const groups = isMultiMaterial ? mesh.geometry.groups : [{ materialIndex: 0, start: undefined, count: undefined }];

            for (let i = 0, il = groups.length; i < il; i++) {
                if (materials[groups[i].materialIndex].name.includes('Outline')) {
                    continue;
                }
                const primitive: any = {
                    mode: 4,
                    attributes: attributes
                };

                //this.serializeUserData(mesh.geometry, primitive);

                if (targets.length > 0) primitive.targets = targets;

                if (mesh.geometry.index !== null) {
                    primitive.indices = this.processAccessor(mesh.geometry.index, mesh.geometry);

                    if (primitive.indices === null) delete primitive.indices;
                }
                const material = this.processMaterial(materials[groups[i].materialIndex]);
                if (material !== null) primitive.material = material;
                primitives.push(primitive);
            }
        }

        meshDef.primitives = primitives;

        if (!outputData.meshes) outputData.meshes = [];
        const index = outputData.meshes.push(meshDef) - 1;
        return index;
    }

    processMultyMesh3(object: any) {
        const cache = this.cache;
        const outputData = this.outputData;

        const meshDef: OutputMesh = {
            name: object.name
        };
        /* const materials = []

       var geom = new THREE.Geometry()
        const materials = []

        object.children.forEach((mesh: any, index: any) => {
            mesh.updateMatrix();
            mesh.geometry.faces.forEach((face: any) => {
                face.materialIndex = 0;
            });
            geom.merge(mesh.geometry, mesh.matrix, index);
            materials.push(mesh.material);
        });*/

        const primitives = [];
        // Conversion between attributes names in threejs and gltf spec
        const nameConversion: any = {
            uv: 'TEXCOORD_0',
            uv2: 'TEXCOORD_1',
            color: 'COLOR_0',
            skinWeight: 'WEIGHTS_0',
            skinIndex: 'JOINTS_0'
        };
        //meshDef.extras = { targetNames };meshDef.weights = weights;
        for (let i = 0, l = object.children.length; i < l; i++) {
            const mesh = object.children[i];
            const geometry = mesh.geometry;

            const attributes: any = {};
            const targets: any = [];
            // @QUESTION Detect if .vertexColors = true?
            // For every attribute create an accessor
            let modifiedAttribute = null;

            for (let attributeName in geometry.attributes) {
                // Ignore morph target attributes, which are exported later.
                if (attributeName.slice(0, 5) === 'morph') continue;

                const attribute = geometry.attributes[attributeName];
                attributeName = nameConversion[attributeName] || attributeName.toUpperCase();

                // Prefix all geometry attributes except the ones specifically
                // listed in the spec; non-spec attributes are considered custom.
                const validVertexAttributes = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;

                if (!validVertexAttributes.test(attributeName)) attributeName = '_' + attributeName;

                if (cache.attributes.has(this.getUID(attribute))) {
                    attributes[attributeName] = cache.attributes.get(this.getUID(attribute));
                    continue;
                }

                // JOINTS_0 must be UNSIGNED_BYTE or UNSIGNED_SHORT.
                modifiedAttribute = null;
                const array = attribute.array;

                if (attributeName === 'JOINTS_0' && !(array instanceof Uint16Array) && !(array instanceof Uint8Array)) {
                    console.warn('VRMExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                    modifiedAttribute = new THREE.BufferAttribute(new Uint16Array(array), attribute.itemSize, attribute.normalized);
                }
                const accessor = this.processAccessor(modifiedAttribute || attribute, geometry);

                if (accessor !== null) {
                    attributes[attributeName] = accessor;
                    cache.attributes.set(this.getUID(attribute), accessor);
                }
            }

            const primitive: any = {
                mode: 4,
                attributes: attributes
            };

            if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
                const weights = [];
                const targetNames = [];
                const reverseDictionary: any = {};

                if (mesh.morphTargetDictionary !== undefined) {
                    for (const key in mesh.morphTargetDictionary) {
                        reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                    }
                }

                for (let i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                    const target: any = {};

                    for (const attributeName in geometry.morphAttributes) {
                        const attribute = geometry.morphAttributes[attributeName][i];
                        const gltfAttributeName = attributeName.toUpperCase();
                        const baseAttribute = geometry.attributes[attributeName];

                        if (cache.attributes.has(this.getUID(attribute))) {
                            target[gltfAttributeName] = cache.attributes.get(this.getUID(attribute));
                            continue;
                        }
                        // Clones attribute not to override
                        const relativeAttribute = attribute.clone();

                        if (!geometry.morphTargetsRelative) {
                            for (let j = 0, jl = attribute.count; j < jl; j++) {
                                relativeAttribute.setXYZ(
                                    j,
                                    attribute.getX(j) - baseAttribute.getX(j),
                                    attribute.getY(j) - baseAttribute.getY(j),
                                    attribute.getZ(j) - baseAttribute.getZ(j)
                                );
                            }
                        }

                        target[gltfAttributeName] = this.processAccessor(relativeAttribute, geometry);
                        cache.attributes.set(this.getUID(baseAttribute), target[gltfAttributeName]);
                    }

                    targets.push(target);

                    weights.push(mesh.morphTargetInfluences[i]);

                    if (mesh.morphTargetDictionary !== undefined) targetNames.push(reverseDictionary[i]);
                }

                meshDef.weights = weights;

                if (targetNames.length > 0) {
                    meshDef.extras = { targetNames };
                }
            }

            const isMultiMaterial = Array.isArray(mesh.material);

            if (isMultiMaterial && geometry.groups.length === 0) return null;

            const materials = isMultiMaterial ? mesh.material : [mesh.material];
            const groups = isMultiMaterial ? geometry.groups : [{ materialIndex: 0, start: undefined, count: undefined }];

            for (let i = 0, il = groups.length; i < il; i++) {
                if (materials[groups[i].materialIndex].name.includes('Outline')) continue;
                this.serializeUserData(geometry, primitive);

                if (targets.length > 0) primitive.targets = targets;

                if (geometry.index !== null) {
                    primitive.indices = this.processAccessor(geometry.index, geometry, groups[i].start, groups[i].count);
                    if (primitive.indices === null) delete primitive.indices;
                }

                const material = this.processMaterial(materials[groups[i].materialIndex]);
                if (material !== null) primitive.material = material;
                primitives.push(primitive);
            }
        }

        meshDef.primitives = primitives;

        if (!outputData.meshes) outputData.meshes = [];
        const index = outputData.meshes.push(meshDef) - 1;
        return index;
    }
    processMultyMesh2(object: any) {
        const cache = this.cache;
        const outputData = this.outputData;

        const meshDef: OutputMesh = {
            name: object.name
        };

        const primitives = [];
        // Conversion between attributes names in threejs and gltf spec
        const nameConversion: any = {
            uv: 'TEXCOORD_0',
            uv2: 'TEXCOORD_1',
            color: 'COLOR_0',
            skinWeight: 'WEIGHTS_0',
            skinIndex: 'JOINTS_0'
        };
        //meshDef.extras = { targetNames };meshDef.weights = weights;
        for (let i = 0, l = object.children.length; i < l; i++) {
            const mesh = object.children[i];
            const geometry = mesh.geometry;

            const attributes: any = {};
            const targets: any = [];
            // @QUESTION Detect if .vertexColors = true?
            // For every attribute create an accessor
            let modifiedAttribute = null;

            for (let attributeName in geometry.attributes) {
                // Ignore morph target attributes, which are exported later.
                if (attributeName.slice(0, 5) === 'morph') continue;

                const attribute = geometry.attributes[attributeName];
                attributeName = nameConversion[attributeName] || attributeName.toUpperCase();

                // Prefix all geometry attributes except the ones specifically
                // listed in the spec; non-spec attributes are considered custom.
                const validVertexAttributes = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;

                if (!validVertexAttributes.test(attributeName)) attributeName = '_' + attributeName;

                if (cache.attributes.has(this.getUID(attribute))) {
                    attributes[attributeName] = cache.attributes.get(this.getUID(attribute));
                    continue;
                }

                // JOINTS_0 must be UNSIGNED_BYTE or UNSIGNED_SHORT.
                modifiedAttribute = null;
                const array = attribute.array;

                if (attributeName === 'JOINTS_0' && !(array instanceof Uint16Array) && !(array instanceof Uint8Array)) {
                    console.warn('VRMExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                    modifiedAttribute = new THREE.BufferAttribute(new Uint16Array(array), attribute.itemSize, attribute.normalized);
                }
                const accessor = this.processAccessor(modifiedAttribute || attribute, geometry);

                if (accessor !== null) {
                    attributes[attributeName] = accessor;
                    cache.attributes.set(this.getUID(attribute), accessor);
                }
            }

            const primitive: any = {
                mode: 4,
                attributes: attributes
            };

            if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
                const weights = [];
                const targetNames = [];
                const reverseDictionary: any = {};

                if (mesh.morphTargetDictionary !== undefined) {
                    for (const key in mesh.morphTargetDictionary) {
                        reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                    }
                }

                for (let i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                    const target: any = {};

                    for (const attributeName in geometry.morphAttributes) {
                        const attribute = geometry.morphAttributes[attributeName][i];
                        const gltfAttributeName = attributeName.toUpperCase();
                        const baseAttribute = geometry.attributes[attributeName];

                        if (cache.attributes.has(this.getUID(attribute))) {
                            target[gltfAttributeName] = cache.attributes.get(this.getUID(attribute));
                            continue;
                        }
                        // Clones attribute not to override
                        const relativeAttribute = attribute.clone();

                        if (!geometry.morphTargetsRelative) {
                            for (let j = 0, jl = attribute.count; j < jl; j++) {
                                relativeAttribute.setXYZ(
                                    j,
                                    attribute.getX(j) - baseAttribute.getX(j),
                                    attribute.getY(j) - baseAttribute.getY(j),
                                    attribute.getZ(j) - baseAttribute.getZ(j)
                                );
                            }
                        }

                        target[gltfAttributeName] = this.processAccessor(relativeAttribute, geometry);
                        cache.attributes.set(this.getUID(baseAttribute), target[gltfAttributeName]);
                    }

                    targets.push(target);

                    weights.push(mesh.morphTargetInfluences[i]);

                    if (mesh.morphTargetDictionary !== undefined) targetNames.push(reverseDictionary[i]);
                }

                meshDef.weights = weights;

                if (targetNames.length > 0) {
                    meshDef.extras = { targetNames };
                }
            }

            const isMultiMaterial = Array.isArray(mesh.material);

            if (isMultiMaterial && geometry.groups.length === 0) return null;

            const materials = isMultiMaterial ? mesh.material : [mesh.material];
            const groups = isMultiMaterial ? geometry.groups : [{ materialIndex: 0, start: undefined, count: undefined }];

            for (let i = 0, il = groups.length; i < il; i++) {
                if (materials[groups[i].materialIndex].name.includes('Outline')) continue;
                this.serializeUserData(geometry, primitive);

                if (targets.length > 0) primitive.targets = targets;

                if (geometry.index !== null) {
                    primitive.indices = this.processAccessor(geometry.index, geometry, groups[i].start, groups[i].count);
                    if (primitive.indices === null) delete primitive.indices;
                }

                const material = this.processMaterial(materials[groups[i].materialIndex]);
                if (material !== null) primitive.material = material;
                primitives.push(primitive);
            }
        }

        meshDef.primitives = primitives;

        if (!outputData.meshes) outputData.meshes = [];
        const index = outputData.meshes.push(meshDef) - 1;
        return index;
    }

    processMesh(mesh: any) {
        const cache = this.cache;
        const outputData = this.outputData;

        const meshCacheKeyParts = [mesh.geometry.uuid];

        if (Array.isArray(mesh.material)) {
            for (let i = 0, l = mesh.material.length; i < l; i++) {
                meshCacheKeyParts.push(mesh.material[i].uuid);
            }
        } else {
            meshCacheKeyParts.push(mesh.material.uuid);
        }

        const meshCacheKey = meshCacheKeyParts.join(':');
        if (cache.meshes.has(meshCacheKey)) return cache.meshes.get(meshCacheKey);

        const geometry = mesh.geometry;
        const meshDef: OutputMesh = {
            name: mesh.name
        };

        const attributes: any = {};
        const primitives = [];
        const targets: any = [];

        // Conversion between attributes names in threejs and gltf spec
        const nameConversion: any = {
            uv: 'TEXCOORD_0',
            uv2: 'TEXCOORD_1',
            color: 'COLOR_0',
            skinWeight: 'WEIGHTS_0',
            skinIndex: 'JOINTS_0'
        };

        const originalNormal = geometry.getAttribute('normal');

        if (originalNormal !== undefined && !this.isNormalizedNormalAttribute(originalNormal)) {
            console.warn('VRMExporter: Creating normalized normal attribute from the non-normalized one.');
            geometry.setAttribute('normal', this.createNormalizedNormalAttribute(originalNormal));
        }

        // @QUESTION Detect if .vertexColors = true?
        // For every attribute create an accessor
        let modifiedAttribute = null;

        for (let attributeName in geometry.attributes) {
            // Ignore morph target attributes, which are exported later.
            if (attributeName.slice(0, 5) === 'morph') continue;

            const attribute = geometry.attributes[attributeName];
            attributeName = nameConversion[attributeName] || attributeName.toUpperCase();

            // Prefix all geometry attributes except the ones specifically
            // listed in the spec; non-spec attributes are considered custom.
            const validVertexAttributes = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;

            if (!validVertexAttributes.test(attributeName)) attributeName = '_' + attributeName;

            if (cache.attributes.has(this.getUID(attribute))) {
                attributes[attributeName] = cache.attributes.get(this.getUID(attribute));
                continue;
            }

            // JOINTS_0 must be UNSIGNED_BYTE or UNSIGNED_SHORT.
            modifiedAttribute = null;
            const array = attribute.array;

            if (attributeName === 'JOINTS_0' && !(array instanceof Uint16Array) && !(array instanceof Uint8Array)) {
                console.warn('VRMExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                modifiedAttribute = new THREE.BufferAttribute(new Uint16Array(array), attribute.itemSize, attribute.normalized);
            }

            const accessor = this.processAccessor(modifiedAttribute || attribute, geometry);

            if (accessor !== null) {
                attributes[attributeName] = accessor;
                cache.attributes.set(this.getUID(attribute), accessor);
            }
        }

        if (originalNormal !== undefined) geometry.setAttribute('normal', originalNormal);

        // Skip if no exportable attributes found
        if (Object.keys(attributes).length === 0) return null;

        // Morph targets
        if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
            const weights = [];
            const targetNames = [];
            /*const reverseDictionary: any = {};
            
            if (mesh.morphTargetDictionary !== undefined) {
                for (const key in mesh.morphTargetDictionary) {
                    reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                }
            }*/

            for (let i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                const target: any = {};
                let warned = false;

                for (const attributeName in geometry.morphAttributes) {
                    // glTF 2.0 morph supports only POSITION/NORMAL/TANGENT.
                    // Three.js doesn't support TANGENT yet.

                    if (attributeName !== 'position' && attributeName !== 'normal') {
                        if (!warned) {
                            console.warn('VRMExporter: Only POSITION and NORMAL morph are supported.');
                            warned = true;
                        }
                        continue;
                    }

                    const attribute = geometry.morphAttributes[attributeName][i];
                    const gltfAttributeName = attributeName.toUpperCase();
                    const baseAttribute = geometry.attributes[attributeName];

                    if (cache.attributes.has(this.getUID(attribute))) {
                        target[gltfAttributeName] = cache.attributes.get(this.getUID(attribute));
                        continue;
                    }
                    // Clones attribute not to override
                    const relativeAttribute = attribute.clone();

                    if (!geometry.morphTargetsRelative) {
                        for (let j = 0, jl = attribute.count; j < jl; j++) {
                            relativeAttribute.setXYZ(
                                j,
                                attribute.getX(j) - baseAttribute.getX(j),
                                attribute.getY(j) - baseAttribute.getY(j),
                                attribute.getZ(j) - baseAttribute.getZ(j)
                            );
                        }
                    }

                    target[gltfAttributeName] = this.processAccessor(relativeAttribute, geometry);
                    cache.attributes.set(this.getUID(baseAttribute), target[gltfAttributeName]);
                }

                targets.push(target);

                weights.push(mesh.morphTargetInfluences[i]);

                if (mesh.morphTargetDictionary !== undefined) targetNames.push(mesh.geometry.userData.targetNames[i]);
            }

            meshDef.weights = weights;

            if (targetNames.length > 0) meshDef.extras = { targetNames };
        }

        const isMultiMaterial = Array.isArray(mesh.material);

        if (isMultiMaterial && geometry.groups.length === 0) return null;

        const materials = isMultiMaterial ? mesh.material : [mesh.material];
        const groups = isMultiMaterial ? geometry.groups : [{ materialIndex: 0, start: undefined, count: undefined }];

        for (let i = 0, il = groups.length; i < il; i++) {
            if (materials[groups[i].materialIndex].name.includes('Outline')) continue;
            const primitive: any = {
                mode: 4,
                attributes: attributes
            };
            this.serializeUserData(geometry, primitive);

            if (targets.length > 0) primitive.targets = targets;

            if (geometry.index !== null) {
                let cacheKey = this.getUID(geometry.index);

                if (groups[i].start !== undefined || groups[i].count !== undefined) {
                    cacheKey += ':' + groups[i].start + ':' + groups[i].count;
                }

                if (cache.attributes.has(cacheKey)) {
                    primitive.indices = cache.attributes.get(cacheKey);
                } else {
                    primitive.indices = this.processAccessor(geometry.index, geometry, groups[i].start, groups[i].count);
                    //console.log("sss", cacheKey,primitive.indices);
                    cache.attributes.set(cacheKey, primitive.indices);
                }

                if (primitive.indices === null) delete primitive.indices;
            }

            const material = this.processMaterial(materials[groups[i].materialIndex]);
            if (material !== null) primitive.material = material;
            primitives.push(primitive);
        }

        meshDef.primitives = primitives;

        if (!outputData.meshes) outputData.meshes = [];
        const index = outputData.meshes.push(meshDef) - 1;
        cache.meshes.set(meshCacheKey, index);
        return index;
    }

    getUID(object: any) {
        if (!this.uids.has(object)) this.uids.set(object, this.uid++);
        return this.uids.get(object);
    }

    getWithName(arr: Array<any>, name: string) {
        return arr.find((obj: any) => {
            return obj.name === name;
        });
    }

    processSampler(map: THREE.Texture) {
        const outputData = this.outputData;

        if (!outputData.samplers) outputData.samplers = [];

        const samplerDef = {
            magFilter: THREE_TO_WEBGL[map.magFilter],
            minFilter: THREE_TO_WEBGL[map.minFilter],
            wrapS: THREE_TO_WEBGL[map.wrapS],
            wrapT: THREE_TO_WEBGL[map.wrapT]
        };

        return outputData.samplers.push(samplerDef) - 1;
    }

    processImage(image: any, format: THREE.PixelFormat, flipY: boolean, mimeType = 'image/png') {
        const writer = this;
        const cache = writer.cache;
        const outputData = writer.outputData;
        const pending = writer.pending;

        if (!cache.images.has(image)) cache.images.set(image, {});

        const cachedImages = cache.images.get(image);

        const key = mimeType + ':flipY/' + flipY.toString();

        if (cachedImages[key] !== undefined) return cachedImages[key];

        if (!outputData.images) outputData.images = [];

        const imageDef: any = { mimeType: mimeType };

        const canvas = getCanvas();

        canvas.width = Math.min(image.width, 2048);
        canvas.height = Math.min(image.height, 2048);

        const ctx = canvas.getContext('2d');

        if (flipY === true) {
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
        }

        if (image.data !== undefined) {
            // THREE.DataTexture

            if (format !== THREE.RGBAFormat) {
                console.error('VRMFExporter: Only RGBAFormat is supported.');
            }

            const data = new Uint8ClampedArray(image.height * image.width * 4);

            for (let i = 0; i < data.length; i += 4) {
                data[i + 0] = image.data[i + 0];
                data[i + 1] = image.data[i + 1];
                data[i + 2] = image.data[i + 2];
                data[i + 3] = image.data[i + 3];
            }

            ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
        } else {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }

        let toBlobPromise;

        if (canvas.toBlob !== undefined) {
            toBlobPromise = new Promise((resolve) => canvas.toBlob(resolve, mimeType));
        } else {
            let quality;

            // Blink's implementation of convertToBlob seems to default to a quality level of 100%
            // Use the Blink default quality levels of toBlob instead so that file sizes are comparable.
            if (mimeType === 'image/jpeg') {
                quality = 0.92;
            } else if (mimeType === 'image/webp') {
                quality = 0.8;
            }

            toBlobPromise = canvas.convertToBlob({
                type: mimeType,
                quality: quality
            });
        }

        pending.push(
            toBlobPromise.then((blob: Blob) =>
                writer.processBufferViewImage(blob).then((bufferViewIndex) => {
                    imageDef.bufferView = bufferViewIndex;
                })
            )
        );

        const index = outputData.images.push(imageDef) - 1;
        cachedImages[key] = index;
        imageDef.extra = { name: `image_${index}` };
        return index;
    }

    processTexture(map: THREE.Texture) {
        const cache = this.cache;
        const outputData = this.outputData;

        if (cache.textures.has(map)) return cache.textures.get(map);

        if (!outputData.textures) outputData.textures = [];

        let mimeType = map.userData.mimeType;

        if (mimeType === 'image/webp') mimeType = 'image/png';

        const textureDef: any = {
            sampler: this.processSampler(map),
            source: this.processImage(map.image, map.format, map.flipY, mimeType)
        };

        if (map.name) textureDef.name = map.name;

        const index = outputData.textures.push(textureDef) - 1;
        cache.textures.set(map, index);
        return index;
    }

    processMaterial(material: any) {
        const cache = this.cache;
        const outputMaterialProperties = this.outputMaterialProperties;
        const outputData = this.outputData;
        const userData = this.userData;
        if (!outputData.materials) outputData.materials = [];
        if (cache.materials.has(material.name)) return cache.materials.get(material);

        const materialDef: any = {
            name: material.name,
            pbrMetallicRoughness: {}
        };

        if (material.type === 'ShaderMaterial' || material.type === MaterialType.MToonMaterial) {
            const base = this.getWithName(userData.materialProperties, material.name);
            //material.color.set(color);
            //material.uniforms.shadeColorFactor.value.set(color);
            /* if (material.map) {
                const baseColorMapDef = { index: this.processTexture(material.map) };
                this.applyTextureTransform(baseColorMapDef, material.map);
                //materialDef.pbrMetallicRoughness.baseColorTexture = baseColorMapDef;
            }*/
            //console.log(material.lightMap, material.envMap, material.displacementMap, material.bumpMap , material.aoMap, material.alphaMap);

            outputMaterialProperties.push({
                ...base,
                textureProperties: {
                    _BumpMap: material.normalMap ? this.processTexture(material.normalMap) : null,
                    _EmissionMap: material.emissiveMap ? this.processTexture(material.emissiveMap) : null,
                    _MainTex: material.map ? this.processTexture(material.map) : null,
                    _ShadeTexture: material.map ? this.processTexture(material.map) : null,
                    _SphereAdd: material.matcapTexture ? this.processTexture(material.matcapTexture) : null
                },
                vectorProperties: {
                    ...base.vectorProperties,
                    _ShadeColor: [material.color.r, material.color.b, material.color.g, 1],
                    _EmissionColor: [material.color.r, material.color.b, material.color.g, 1]
                    //_Color: [material.color.r, material.color.b, material.color.g, 1]
                }
            });

            //material.map  index: this.processTexture(material.map)
            const mtoonMaterial = material as MToonMaterial;
            const color = mtoonMaterial.color ? [mtoonMaterial.color.r, mtoonMaterial.color.b, mtoonMaterial.color.g, 1] : undefined;
            materialDef.pbrMetallicRoughness.baseColorFactor = color;
            materialDef.shader = 2;
        } else {
        }

        /*const materialDef: any = {
            /*name: material.name,
            alphaCutoff: 0.5,
            alphaMode: 'MASK',
            shader: 'VRM/MToon',
            doubleSided: false,
            emissiveFactor: [0, 0, 0, 0],
            emissiveTexture: {
                extensions: {
                    KHR_texture_transform: {
                        offset: [0, 0],
                        scale: [1, 1]
                    },
                    index: this.processTexture(material.map)
                }
            },
            extensions: {
                VRMC_materials_mtoon: {
                    giEqualizationFactor: 0.8999999985098839,
                    outlineColorFactor: [0.05818714204823957, 0.005028192746017137, 0.010397784631416817, 1],
                    outlineLightingMixFactor: 0,
                    outlineWidthFactor: 0.0007500000298023224,
                    outlineWidthMode: 'worldCoordinates',
                    outlineWidthMultiplyTexture: undefined,
                    parametricRimColorFactor: [0, 0, 0, 0],
                    parametricRimFresnelPowerFactor: 1,
                    parametricRimLiftFactor: 0,
                    renderQueueOffsetNumber: 0,
                    rimLightingMixFactor: 0,
                    rimMultiplyTexture: undefined,
                    shadingShiftFactor: -0.19999998807907104,
                    shadingToonyFactor: 0.19999998807907104,
                    specVersion: '1.0-beta',
                    shadeColorFactor: [0.9351855438474652, 0.6290237514021403, 0.7176234281681153, 1],
                    transparentWithZWrite: false,
                    uvAnimationMaskTexture: undefined,
                    uvAnimationRotationSpeedFactor: 0,
                    uvAnimationScrollXSpeedFactor: 0,
                    uvAnimationScrollYSpeedFactor: -0
                }
            },
            normalTexture: {
                extensions: {
                    KHR_texture_transform: {
                        offset: [0, 0],
                        scale: [1, 1]
                    }
                },
                index: this.processTexture(material.map),
                scale: 1
            }*/
        /*alphaCutoff: material.alphaTest > 0 ? material.alphaTest : undefined,
            alphaMode: material.transparent ? 'BLEND' : material.alphaTest > 0 ? 'MASK' : 'OPAQUE',
            doubleSided: material.side === 2,
            extensions: {
                VRMC_materials_mtoon: {}
            },
            name: material.name,
            pbrMetallicRoughness: {
                baseColorFactor: baseColor,
                baseColorTexture: baseTexture,
                metallicFactor: metallicFactor,
                roughnessFactor: roughnessFactor
            }
            pbrMetallicRoughness: {}
        };*/
        /* if (material.isShaderMaterial) {
            /*console.warn('GLTFExporter: THREE.ShaderMaterial not supported.', material);
            materialDef.shader = 'VRM/MToon';
            if (material.vertexShader !== undefined) materialDef.vertexShader = material.vertexShader;
            if (material.fragmentShader !== undefined) materialDef.vertexShader = material.fragmentShader;
            //if (material.uniforms !== undefined) materialDef.vertexShader = material.uniforms;
            if (material.defines !== undefined) materialDef.defines = material.defines;
            //materialDef.gltfExtensions.VRMC_materials_mtoon = {};
            if (material.uniforms !== undefined) {
                materialDef.uniforms = {};
                for (let name in material.uniforms) {
                    //const uniform = material.uniforms[name];
                    materialDef.uniforms[name] = {};
                    switch (material.uniforms[name].type) {
                        case 't':
                            //materialDef.uniforms[name].value = getTexture(uniform.value);
                            break;
                        case 'c':
                            materialDef.uniforms[name].value = material.uniforms[name].value;
                            break;
                        case 'v2':
                            materialDef.uniforms[name].value = material.uniforms[name].value;
                            break;
                        case 'v3':
                            materialDef.uniforms[name].value = new THREE.Vector3().fromArray(material.uniforms[name].value);
                            break;
                        case 'v4':
                            materialDef.uniforms[name].value = new THREE.Vector4().fromArray(material.uniforms[name].value);
                            break;
                        case 'm3':
                            materialDef.uniforms[name].value = new THREE.Matrix3().fromArray(material.uniforms[name].value);
                            break;
                        case 'm4':
                            materialDef.uniforms[name].value = new THREE.Matrix4().fromArray(material.uniforms[name].value);
                            break;

                        default:
                            materialDef.uniforms[name].value = material.uniforms[name].value;
                    }
                }
            }*/
        //const json = JSON.parse(JSON.stringify(material.userData));
        /*vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            side: THREE.DoubleSide,*/ /*
        }

        if (material.type === MaterialType.MToonMaterial) {
            const mtoonMaterial = material as MToonMaterial;
            const color = mtoonMaterial.color ? [mtoonMaterial.color.r, mtoonMaterial.color.b, mtoonMaterial.color.g, 1] : undefined;
            materialDef.pbrMetallicRoughness.baseColorFactor = color;
            materialDef.shader = 2;
        } else {
            const color = material.color.toArray().concat([material.opacity]);
            if (!this.equalArray(color, [1, 1, 1, 1])) {
                materialDef.pbrMetallicRoughness.baseColorFactor = color;
            }
        }

        if (material.isMeshStandardMaterial) {
            materialDef.pbrMetallicRoughness.metallicFactor = material.metalness;
            materialDef.pbrMetallicRoughness.roughnessFactor = material.roughness;
        } else {
            materialDef.pbrMetallicRoughness.metallicFactor = 0.5;
            materialDef.pbrMetallicRoughness.roughnessFactor = 0.5;
        }

        // pbrMetallicRoughness.metallicRoughnessTexture
        if (material.metalnessMap || material.roughnessMap) {
            const metalRoughTexture = this.buildMetalRoughTexture(material.metalnessMap, material.roughnessMap);

            const metalRoughMapDef = { index: this.processTexture(metalRoughTexture) };
            this.applyTextureTransform(metalRoughMapDef, metalRoughTexture);
            materialDef.pbrMetallicRoughness.metallicRoughnessTexture = metalRoughMapDef;
        }

        // pbrMetallicRoughness.baseColorTexture or pbrSpecularGlossiness diffuseTexture
        if (material.map) {
            const baseColorMapDef = { index: this.processTexture(material.map) };
            this.applyTextureTransform(baseColorMapDef, material.map);
            materialDef.pbrMetallicRoughness.baseColorTexture = baseColorMapDef;
        }

        if (material.emissive) {
            // note: emissive components are limited to stay within the 0 - 1 range to accommodate glTF spec. see #21849 and #22000.
            const emissive = material.emissive.clone().multiplyScalar(material.emissiveIntensity);
            const maxEmissiveComponent = Math.max(emissive.r, emissive.g, emissive.b);

            if (maxEmissiveComponent > 1) {
                emissive.multiplyScalar(1 / maxEmissiveComponent);

                console.warn('THREE.GLTFExporter: Some emissive components exceed 1; emissive has been limited');
            }

            if (maxEmissiveComponent > 0) {
                materialDef.emissiveFactor = emissive.toArray();
            }

            // emissiveTexture
            if (material.emissiveMap) {
                const emissiveMapDef = { index: this.processTexture(material.emissiveMap) };
                this.applyTextureTransform(emissiveMapDef, material.emissiveMap);
                materialDef.emissiveTexture = emissiveMapDef;
            }
        }

        // normalTexture
        if (material.normalMap) {
            const normalMapDef: any = { index: this.processTexture(material.normalMap) };

            if (material.normalScale && material.normalScale.x !== 1) {
                // glTF normal scale is univariate. Ignore `y`, which may be flipped.
                // Context: https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
                normalMapDef.scale = material.normalScale.x;
            }

            this.applyTextureTransform(normalMapDef, material.normalMap);
            materialDef.normalTexture = normalMapDef;
        }
//*/
        // occlusionTexture
        if (material.aoMap) {
            const occlusionMapDef: any = {
                index: this.processTexture(material.aoMap),
                texCoord: 1
            };

            if (material.aoMapIntensity !== 1.0) {
                occlusionMapDef.strength = material.aoMapIntensity;
            }

            this.applyTextureTransform(occlusionMapDef, material.aoMap);
            materialDef.occlusionTexture = occlusionMapDef;
        }

        // alphaMode
        if (material.transparent) {
            materialDef.alphaMode = 'BLEND';
        } else {
            if (material.alphaTest > 0.0) {
                materialDef.alphaMode = 'MASK';
                materialDef.alphaCutoff = material.alphaTest;
            }
        }

        // doubleSided
        if (material.side === THREE.DoubleSide) materialDef.doubleSided = true;

        //this.serializeUserData(material, materialDef);

        const index = outputData.materials.push(materialDef) - 1;
        cache.materials.set(material.name, index);
        return index;
    }

    processBufferViewImage(blob: Blob): Promise<number> {
        const writer = this;
        const outputData = writer.outputData;
        if (!outputData.bufferViews) outputData.bufferViews = [];
        return new Promise(function (resolve) {
            const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onloadend = function () {
                const buffer = getPaddedArrayBuffer(reader.result as ArrayBuffer);
                const bufferViewDef = {
                    buffer: writer.processBuffer(buffer),
                    byteOffset: writer.byteOffset,
                    byteLength: buffer.byteLength
                };
                writer.byteOffset += buffer.byteLength;
                resolve(outputData.bufferViews.push(bufferViewDef) - 1);
            };
        });
    }

    processBufferView(attribute: THREE.BufferAttribute, componentType: number, start: number, count: number, target: number | undefined = undefined) {
        const outputData = this.outputData;
        if (!outputData.bufferViews) outputData.bufferViews = [];
        let componentSize;
        if (componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE) {
            componentSize = 1;
        } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
            componentSize = 2;
        } else {
            componentSize = 4;
        }
        const byteLength = getPaddedBufferSize(count * attribute.itemSize * componentSize);
        const dataView = new DataView(new ArrayBuffer(byteLength));
        let offset = 0;

        for (let i = start; i < start + count; i++) {
            for (let a = 0; a < attribute.itemSize; a++) {
                let value;

                if (attribute.itemSize > 4) {
                    value = attribute.array[i * attribute.itemSize + a];
                } else {
                    if (a === 0) value = attribute.getX(i);
                    else if (a === 1) value = attribute.getY(i);
                    else if (a === 2) value = attribute.getZ(i);
                    else if (a === 3) value = attribute.getW(i);
                }

                if (componentType === WEBGL_CONSTANTS.FLOAT) {
                    dataView.setFloat32(offset, value as number, true);
                } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_INT) {
                    dataView.setUint32(offset, value as number, true);
                } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
                    dataView.setUint16(offset, value as number, true);
                } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE) {
                    dataView.setUint8(offset, value as number);
                }

                offset += componentSize;
            }
        }

        const bufferViewDef: any = {
            buffer: this.processBuffer(dataView.buffer),
            byteOffset: this.byteOffset,
            byteLength: byteLength
        };

        if (target !== undefined) bufferViewDef.target = target;

        if (target === WEBGL_CONSTANTS.ARRAY_BUFFER) {
            // Only define byteStride for vertex attributes.
            bufferViewDef.byteStride = attribute.itemSize * componentSize;
        }

        this.byteOffset += byteLength;

        outputData.bufferViews.push(bufferViewDef);

        // @TODO Merge bufferViews where possible.
        const output: any = {
            id: outputData.bufferViews.length - 1,
            byteLength: 0
        };
        return output;
    }

    isNormalizedNormalAttribute(normal: THREE.BufferAttribute): boolean {
        const cache = this.cache;
        if (cache.attributesNormalized.has(normal)) return false;
        const vector = new THREE.Vector3();
        for (let i = 0, il = normal.count; i < il; i++) {
            // 0.0005 is from glTF-validator
            if (Math.abs(vector.fromBufferAttribute(normal, i).length() - 1.0) > 0.0005) return false;
        }
        return true;
    }

    createNormalizedNormalAttribute(normal: THREE.BufferAttribute): THREE.BufferAttribute {
        const cache = this.cache;
        if (cache.attributesNormalized.has(normal)) return cache.attributesNormalized.get(normal);
        const attribute = normal.clone();
        const vector = new THREE.Vector3();
        for (let i = 0, il = attribute.count; i < il; i++) {
            vector.fromBufferAttribute(attribute, i);
            if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
                // if values can't be normalized set (1, 0, 0)
                vector.setX(1.0);
            } else {
                vector.normalize();
            }
            attribute.setXYZ(i, vector.x, vector.y, vector.z);
        }
        cache.attributesNormalized.set(normal, attribute);
        return attribute;
    }

    applyTextureTransform(mapDef: any, texture: THREE.Texture) {
        let didTransform = false;
        const transformDef: any = {};

        if (texture.offset.x !== 0 || texture.offset.y !== 0) {
            transformDef.offset = texture.offset.toArray();
            didTransform = true;
        }

        if (texture.rotation !== 0) {
            transformDef.rotation = texture.rotation;
            didTransform = true;
        }

        if (texture.repeat.x !== 1 || texture.repeat.y !== 1) {
            transformDef.scale = texture.repeat.toArray();
            didTransform = true;
        }

        if (didTransform) {
            mapDef.extensions = mapDef.extensions || {};
            mapDef.extensions['KHR_texture_transform'] = transformDef;
        }
    }
}
