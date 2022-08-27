import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION, HAND_CONNECTIONS, POSE_CONNECTIONS, Results } from '@mediapipe/holistic';

export const drawResults = (results: Results, cameraCanvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void => {
    context.save();
    context.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);

    context.drawImage(results.image, 0, 0, cameraCanvas.width, cameraCanvas.height);

    drawConnectors(context, results.faceLandmarks, FACEMESH_TESSELATION, {
        color: '#FFFFFF50',
        lineWidth: 1
    });

    drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#FFFFFF',
        lineWidth: 1
    });

    drawConnectors(context, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: '#FFFFFF',
        lineWidth: 1
    });

    drawConnectors(context, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: '#FFFFFF',
        lineWidth: 1
    });
    context.restore();
};
