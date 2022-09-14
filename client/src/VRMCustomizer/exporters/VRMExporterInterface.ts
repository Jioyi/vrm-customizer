import { MToonMaterial } from '@pixiv/three-vrm';
import * as THREE from 'three';

export const WEBGL_CONSTANTS = {
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,

    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,

    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703,

    CLAMP_TO_EDGE: 33071,
    MIRRORED_REPEAT: 33648,
    REPEAT: 10497
};

type Vector2 = [number, number];
type Vector3 = [number, number, number];
type Vector4 = [number, number, number, number];

export interface OutputAccessor {
    bufferView: number;
    byteOffset: number;
    componentType: number;
    count: number;
    max: Vector3 | undefined;
    min: Vector3 | undefined;
    normalized: boolean;
    type: string;
}

export interface OutputNode {
    isBone?: boolean;
    isGroup?: boolean;    
    children?: Array<number> | undefined;
    skin?: number | undefined;
    mesh?: number | undefined;
    name: string;
    rotation: Vector4;
    scale: Vector3;
    translation: Vector3;
}

export interface OutputSkin {
    inverseBindMatrices: number;
    joints: Array<number>;
    skeleton: number;
}
export type VRMMaterial = THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | MToonMaterial;

export interface VRMSkinnedMesh extends THREE.SkinnedMesh {
    geometry: VRMBufferGeometry;
}

export interface OutputImage {
    bufferView: number;
    mimeType: string;
    name: string;
}

export interface OutputTexture {
    sampler: number;
    source: number;
}

export interface OutputSampler {
    magFilter: number;
    minFilter: number;
    wrapS: number;
    wrapT: number;
}

export interface OutputBaseTexture {
    extensions: {
        KHR_texture_transform: {
            offset: Vector2;
            scale: Vector2;
        };
    };
    index: number;
    texCoord: number;
}

export interface OutputMaterial {
    alphaCutoff?: number | undefined;
    alphaMode: string;
    doubleSided: boolean;
    // eslint-disable-next-line @typescript-eslint/ban-types
    extensions?: { KHR_materials_unlit: {} } | undefined;
    name: string;
    pbrMetallicRoughness: {
        baseColorFactor?: Vector4 | undefined;
        baseColorTexture?: OutputBaseTexture | undefined;
        metallicFactor: number;
        roughnessFactor: number;
    };
}

export interface VRMImageData {
    name: string;
    imageBitmap: ImageBitmap;
}

export interface VRMBufferGeometry extends THREE.BufferGeometry {
    attributes: { [name: string]: THREE.BufferAttribute };
    morphAttributes: { [name: string]: Array<THREE.BufferAttribute> };
    userData: { targetNames: Array<string> };
}

export interface VRMGroup extends THREE.Group {
    children: Array<VRMSkinnedMesh>;
}

export const parseBinary = (attr: THREE.BufferAttribute, componentType: number) => {
    const componentTypeSize = componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT ? 2 : 4;
    const array = attr.array;
    let offset = 0;
    const buf = new ArrayBuffer(attr.count * attr.itemSize * componentTypeSize);
    const view = new DataView(buf);
    for (let i = 0; i < attr.count; i++) {
        for (let a = 0; a < attr.itemSize; a++) {
            let value: number;
            if (attr.itemSize > 4) {
                value = array[i * attr.itemSize + a];
            } else {
                if (a === 0) value = attr.getX(i);
                else if (a === 1) value = attr.getY(i);
                else if (a === 2) value = attr.getZ(i);
                else value = attr.getW(i);
            }

            if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
                view.setUint16(offset, value, true);
            } else if (componentType === WEBGL_CONSTANTS.UNSIGNED_INT) {
                view.setUint32(offset, value, true);
            } else {
                view.setFloat32(offset, value, true);
            }
            offset += componentTypeSize;
        }
    }
    return buf;
};

export enum VRMObjectType {
    Group = 'Group',
    SkinnedMesh = 'SkinnedMesh',
    Object3D = 'Object3D',
    Bone = 'Bone'
}

export enum MaterialType {
    MeshBasicMaterial = 'MeshBasicMaterial',
    MeshStandardMaterial = 'MeshStandardMaterial',
    MToonMaterial = 'MToonMaterial'
}

export enum AccessorsType {
    SCALAR = 'SCALAR', // 1
    VEC2 = 'VEC2', // 2
    VEC3 = 'VEC3', // 3
    VEC4 = 'VEC4', // 4
    MAT4 = 'MAT4' // 16
}

export enum MeshDataType {
    POSITION = 'POSITION',
    NORMAL = 'NORMAL',
    UV = 'UV',
    INDEX = 'INDEX',
    SKIN_WEIGHT = 'SKIN_WEIGHT',
    SKIN_INDEX = 'SKIN_INDEX',
    BLEND_POSITION = 'BLEND_POSITION',
    BLEND_NORMAL = 'BLEND_NORMAL',
    BIND_MATRIX = 'BIND_MATRIX',
    IMAGE = 'IMAGE'
}

export class MeshData {
    attribute: THREE.BufferAttribute;
    valueType: number;
    type: MeshDataType;
    accessorsType: AccessorsType;
    meshName: string;
    name: string | undefined;
    buffer: ArrayBuffer;
    max: [number, number, number] | undefined;
    min: [number, number, number] | undefined;
    constructor(
        attribute: THREE.BufferAttribute,
        valueType: number,
        type: MeshDataType,
        accessorsType: AccessorsType,
        meshName: string,
        name: string | undefined
    ) {
        this.attribute = attribute;
        this.type = type;
        this.valueType = valueType;
        this.accessorsType = accessorsType;
        this.meshName = meshName;
        this.name = name;
        this.buffer = parseBinary(this.attribute, this.valueType);
        this.max =
            type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
                ? [
                      Math.max.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 0)
                      ),
                      Math.max.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 1)
                      ),
                      Math.max.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 2)
                      )
                  ]
                : undefined;
        this.min =
            type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
                ? [
                      Math.min.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 0)
                      ),
                      Math.min.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 1)
                      ),
                      Math.min.apply(
                          null,
                          Array.from(this.attribute.array).filter((_, i) => i % 3 === 2)
                      )
                  ]
                : undefined;
    }
}

export interface BufferView {
    buffer: ArrayBuffer;
    type: MeshDataType;
}

export interface OutputBufferView {
    buffer: number;
    byteLength: number;
    byteOffset: number;
    target?: number | undefined;
}

export interface OutputScene {
    nodes: Array<number>;
    name?: string;
}

export interface OutputMesh {
    isSkinnedMesh?: boolean;
    name: string;
    primitives?: Array<OutputPrimitive>;
    weights?: Array<number>;
    extras?: {
        targetNames: Array<string>;
    };
}

export interface OutputPrimitive {
    attributes: {
        JOINTS_0: number;
        NORMAL: number;
        POSITION: number;
        TEXCOORD_0: number;
        WEIGHTS_0: number;
    };
    extras: {
        targetNames: Array<string>;
    };
    indices: number;
    material?: number;
    mode: number;
    targets?:
        | Array<{
              NORMAL: number;
              POSITION: number;
          }>
        | undefined;
}
