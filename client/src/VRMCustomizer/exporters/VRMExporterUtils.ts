export const getPaddedArrayBuffer = (arrayBuffer: ArrayBuffer, paddingByte: number = 0): ArrayBuffer => {
    const paddedLength = getPaddedBufferSize(arrayBuffer.byteLength);
    if (paddedLength !== arrayBuffer.byteLength) {
        const array = new Uint8Array(paddedLength);
        array.set(new Uint8Array(arrayBuffer));
        if (paddingByte !== 0) {
            for (let i = arrayBuffer.byteLength; i < paddedLength; i++) {
                array[i] = paddingByte;
            }
        }
        return array.buffer;
    }
    return arrayBuffer;
};

export const getPaddedBufferSize = (bufferSize: number): number => {
    return Math.ceil(bufferSize / 4) * 4;
};

export const stringToArrayBuffer = (text: string): ArrayBuffer => {
    return new TextEncoder().encode(text).buffer;
};
export const expressionManagerVRM0 = (value: string): string => {
    let convert;
    switch (value) {
        case 'neutral':
            convert = 'neutral';
            break;
        case 'aa':
            convert = 'a';
            break;
        case 'ih':
            convert = 'i';
            break;
        case 'ou':
            convert = 'u';
            break;
        case 'ee':
            convert = 'e';
            break;
        case 'oh':
            convert = 'o';
            break;
        case 'blink':
            convert = 'blink';
            break;
        case 'blinkLeft':
            convert = 'blink_l';
            break;
        case 'blinkRight':
            convert = 'blink_r';
            break;
        case 'angry':
            convert = 'angry';
            break;
        case 'happy':
            convert = 'joy';
            break;
        case 'sad':
            convert = 'sorrow';
            break;
        case 'lookUp':
            convert = 'lookup';
            break;
        case 'lookDown':
            convert = 'lookdown';
            break;
        case 'lookLeft':
            convert = 'lookleft';
            break;
        case 'lookRight':
            convert = 'lookright';
            break;
        case 'relaxed':
        case 'Surprised':
        case 'Extra':
        default:
            convert = 'unknown';
    }
    return convert;
};
