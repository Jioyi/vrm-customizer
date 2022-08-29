import { ColorResult } from 'react-color';
import VRMCustomizer from '.';

export default class VRMCustomizerState {
    customizer!: VRMCustomizer;

    start(canvas: HTMLCanvasElement, cameraCanvas: HTMLCanvasElement, cameraVideo: HTMLVideoElement) {
        this.customizer = new VRMCustomizer(canvas, cameraCanvas, cameraVideo);
    }

    startCameraRender() {
        this.customizer.startCameraRender();
    }

    setHairColor(color: ColorResult) {
        this.customizer.setHairColor(color.hex);
    }

    setSkintone(color: ColorResult) {
        this.customizer.setSkintone(color.hex);
    }

    setBackgroundColor(color: string) {
        this.customizer.setBackgroundColor(color);
    }
}
