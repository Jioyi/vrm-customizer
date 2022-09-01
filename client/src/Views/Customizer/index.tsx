import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Styles from './Customizer.module.css';
import { SketchPicker, ColorResult } from 'react-color';
// Theme
import { useThemeContext } from '../../Context';
//Material UI
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import { useTheme } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button, { ButtonProps } from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';

// Icons
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import GitHubIcon from '@mui/icons-material/GitHub';
// VRMCustomizer
import VRMCustomizerState from './../../VRMCustomizer/VRMCustomizerState';
// Components
import Tooltip from './../../components/Tooltip';
import WebCamContainer from '../../components/WebCamContainer';

import { styled } from '@mui/material/styles';
const styles2 = {
    paperContainer: {
        backgroundImage: `url(./assets/bg3.png)`,
        backgroundSize: 'cover'
    }
};
const BootstrapButton = styled(Button)({
    boxShadow: 'none',
    textTransform: 'none',
    fontSize: 16,
    padding: '6px 12px',
    border: '1px solid',
    lineHeight: 2,
    backgroundColor: '#BE77F5',
    borderColor: '#BE77F5',
    alignContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    '&:hover': {
        backgroundColor: '#BE77F5',
        borderColor: '#BE77F5',
        boxShadow: 'none'
    },
    '&:active': {
        boxShadow: 'none',
        backgroundColor: '#BE77F5',
        borderColor: '#BE77F5'
    },
    '&:focus': {
        boxShadow: '0 0 0 0.2rem rgba(0,123,255,.5)'
    }
});

const Customizer = () => {
    const theme = useTheme();
    const colorMode = useThemeContext();
    const InitialRef = useRef(true);
    const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraVideoRef = useRef<HTMLVideoElement>(null);

    const VRMCustomizer = useMemo(() => {
        return new VRMCustomizerState();
    }, []);

    const [displayCamera, setDisplayCamera] = useState(false);

    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
    const [display, setDisplay] = useState(false);
    const id = display ? 'simple-popover' : undefined;
    const [colorPicker, setColorPicker] = useState('hair');
    const [hairColor, setHairColor] = useState<ColorResult>({
        hex: '#4f2b0d',
        rgb: {
            a: 1,
            b: 13,
            g: 43,
            r: 79
        },
        hsl: {
            a: 1,
            h: 27.0967741935484,
            l: 0.18016725000000003,
            s: 0.7167381974248925
        }
    });
    const [skintone, setSkintone] = useState<ColorResult>({
        hex: '#eaeaea',
        rgb: {
            a: 1,
            b: 234,
            g: 234,
            r: 234
        },
        hsl: {
            a: 1,
            h: 37.777777777777786,
            l: 0.9159999999999999,
            s: 0
        }
    });
    const { rgb } = colorPicker === 'hair' ? hairColor : colorPicker === 'skin' ? skintone : hairColor;

    const onCloseMethod = () => {
        setDisplay(false);
    };

    const onClickHairColorPicker = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        setColorPicker('hair');
        setDisplay(true);
    };

    const onClickSkintonePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        setColorPicker('skin');
        setDisplay(true);
    };
    const onClickGitHub = (event: React.MouseEvent<HTMLButtonElement>) => {
        window.open('https://github.com/Jioyi/vrm-customizer', '_blank');
    };

    const handleChangeColor = useCallback(
        (color: ColorResult) => {
            if (colorPicker === 'hair') {
                setHairColor(color);
                VRMCustomizer.setHairColor(color);
            } else if (colorPicker === 'skin') {
                setSkintone(color);
                VRMCustomizer.setSkintone(color);
            }
        },
        [VRMCustomizer, colorPicker]
    );

    const handleChangeBackgroundColor = useCallback(() => {
        if (theme.palette.mode === 'dark') {
            VRMCustomizer.setBackgroundColor('#000000');
        } else {
            VRMCustomizer.setBackgroundColor('#ffffff');
        }
    }, [VRMCustomizer, theme.palette.mode]);

    const handleCameraRender = useCallback(() => {
        setDisplayCamera(!displayCamera);
        VRMCustomizer.cameraRender(!displayCamera);
    }, [VRMCustomizer, displayCamera]);

    const init = async () => {
        if (sceneCanvasRef.current !== null && cameraCanvasRef.current !== null && cameraVideoRef.current !== null) {
            InitialRef.current = false;
            VRMCustomizer.start(sceneCanvasRef.current, cameraCanvasRef.current, cameraVideoRef.current);
        }
    };

    useEffect(() => {
        if (!InitialRef.current) {
            return;
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    /* 
                        <IconButton onClick={handleCameraRender} color="inherit" size="large">
                            <StopCircleIcon sx={{ fontSize: 26 }} />
                        </IconButton>*/
    return (
        <React.Fragment>
            <Paper style={styles2.paperContainer}>
                <canvas ref={sceneCanvasRef} className={Styles['scene-canvas']} />
            </Paper>

            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.primary',
                    position: 'absolute',
                    paddingBottom: 5,
                    bottom: 0,
                    bgcolor: alpha(theme.palette.background.default, 0)
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    {!displayCamera ? (
                        <BootstrapButton
                            onClick={handleCameraRender}
                            variant="contained"
                            size="large"
                            sx={{ fontSize: 16 }}
                            startIcon={<PlayArrowIcon sx={{ fontSize: 26 }} />}
                            disableRipple
                        >
                            Start
                        </BootstrapButton>
                    ) : (
                        <BootstrapButton
                            onClick={handleCameraRender}
                            variant="contained"
                            size="large"
                            sx={{ fontSize: 16 }}
                            startIcon={<StopIcon sx={{ fontSize: 26 }} />}
                            disableRipple
                        >
                            Stop
                        </BootstrapButton>
                    )}
                </Stack>
            </Box>
            <Popover
                id={id}
                open={display}
                anchorEl={anchorEl}
                onClose={onCloseMethod}
                anchorOrigin={{
                    vertical: -20,
                    horizontal: 'center'
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center'
                }}
            >
                <SketchPicker color={rgb} onChange={handleChangeColor} />
            </Popover>
            <WebCamContainer open={displayCamera} cameraVideoRef={cameraVideoRef} cameraCanvasRef={cameraCanvasRef} />
        </React.Fragment>
    );
};

export default Customizer;
