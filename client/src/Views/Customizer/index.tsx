/* eslint-disable no-new */
/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
// Components
import Navbar from '../../Components/Navbar';
// Style css
import Styles from './Customizer.module.css';
// VRMCustomizer
import VRMCustomizer from '../../VRMCustomizer';
// Contexts
import { useUserContext } from '../../Contexts';
import NavbarLeft from '../../Components/NavbarLeft';

const Customizer = () => {
    const sceneCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const cameraVideoRef = React.useRef<HTMLVideoElement>(null);
    const InitialRef = React.useRef(true);

    const { toggleNavbar, setEngine } = useUserContext();

    const init = async () => {
        if (sceneCanvasRef.current !== null && cameraVideoRef.current !== null) {
            InitialRef.current = false;
            const engine = new VRMCustomizer(sceneCanvasRef.current, cameraVideoRef.current);
            setEngine(engine);
        }
    };

    React.useEffect(() => {
        if (!InitialRef.current) {
            return;
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlerDoubleClick = () => {
        toggleNavbar();
    };

    return (
        <div className={Styles['screen-container']} onDoubleClick={handlerDoubleClick}>
            <video ref={cameraVideoRef} hidden className={Styles['camera-video']} />
            <canvas ref={sceneCanvasRef} className={Styles['scene-canvas']} />
            <Navbar />
            <NavbarLeft />
        </div>
    );
};

export default Customizer;
