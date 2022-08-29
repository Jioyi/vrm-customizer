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
        <Draggable>
            <Box
                sx={{
                    display: 'flex',
                    width: 200,
                    height: 200,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.primary',
                    position: 'absolute',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    padding: 1,
                    top: 0,
                    right: 0,
                    bgcolor: alpha(theme.palette.primary.contrastText, 0.9)
                }}
            >
                <video ref={cameraVideoRef} width="195" height="195" hidden={!open} className={Styles['camera-video']} />
                <canvas ref={cameraCanvasRef} width="195" height="195" hidden={true} className={Styles['camera-canvas']} />
                <Box
                    sx={{
                        display: 'flex',
                        width: 12,
                        height: 12,
                        position: 'absolute',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        padding: 1,
                        bottom: 18,
                        right: 18,
                        bgcolor: open ? theme.palette.success.main : theme.palette.error.main
                    }}
                ></Box>
            </Box>
        </Draggable>
    );
};

export default WebCamContainer;
