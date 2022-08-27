import React, { useRef, useEffect } from 'react';
import './Style.css';
// VRMCustomizer
import VRMCustomizer from './../../VRMCustomizer';

const Customizer = () => {
    const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraVideoRef = useRef<HTMLVideoElement>(null);
    const InitialRef = useRef(true);

    const init = async () => {
        if (sceneCanvasRef.current !== null && cameraCanvasRef.current !== null && cameraVideoRef.current !== null) {
            InitialRef.current = false;
            const engine = new VRMCustomizer(sceneCanvasRef.current, cameraCanvasRef.current, cameraVideoRef.current);
            await engine.startCameraRender();
        }
    };

    useEffect(() => {
        if (!InitialRef.current) {
            return;
        }
        init();
    }, []);

    return (
        <div>
            <video ref={cameraVideoRef} className="camera-video" />
            <canvas ref={cameraCanvasRef} className="camera-canvas" />
            <canvas ref={sceneCanvasRef} className="scene-canvas" />
        </div>
    );
};

export default Customizer;
