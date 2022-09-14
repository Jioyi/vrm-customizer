import { Buffer } from 'buffer';

const getScreenshotBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
    var dataURL = canvas.toDataURL('image/jpeg', 1.0);
    const base64Data = Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    return new Blob([base64Data], { type: 'image/jpeg' });
};

export default getScreenshotBlob;
