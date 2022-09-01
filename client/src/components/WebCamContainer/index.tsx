import React, { FC } from 'react';
import Styles from './WebCamContainer.module.css';
import Box from '@mui/material/Box';
import Draggable from 'react-draggable';
import { alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';

type Props = {
    open: boolean;
    cameraVideoRef: any;
    cameraCanvasRef: any;
};

const WebCamContainer: FC<Props> = (props: Props) => {
    const { open, cameraVideoRef, cameraCanvasRef } = props;
    const theme = useTheme();

    return (
        <>
            <video ref={cameraVideoRef} width="195" height="195" hidden={true} className={Styles['camera-video']} />
            <canvas ref={cameraCanvasRef} width="195" height="195" hidden={true} className={Styles['camera-canvas']} />
        </>
    );
};

export default WebCamContainer;
