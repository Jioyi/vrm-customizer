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
import IconButton from '@mui/material/IconButton';
// Icons
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import GitHubIcon from '@mui/icons-material/GitHub';
// VRMCustomizer
import VRMCustomizerState from './../../VRMCustomizer/VRMCustomizerState';
// Components
import Tooltip from './../../components/Tooltip';
import WebCamContainer from '../../components/WebCamContainer';

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

    return (
        <React.Fragment>
            <canvas ref={sceneCanvasRef} className={Styles['scene-canvas']} />
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.primary',
                    position: 'absolute',
                    padding: 1,
                    bottom: 0,
                    bgcolor: alpha(theme.palette.background.default, 0.5)
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Tooltip title={theme.palette.mode === 'dark' ? 'Activate light mode' : 'Activate dark mode'}>
                        <IconButton
                            onClick={() => {
                                handleChangeBackgroundColor();
                                colorMode.toggleColorMode();
                            }}
                            color="inherit"
                            size="large"
                        >
                            {theme.palette.mode === 'dark' ? <Brightness7Icon sx={{ fontSize: 26 }} /> : <Brightness4Icon sx={{ fontSize: 26 }} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hair Color" placement="top">
                        <IconButton onClick={onClickHairColorPicker} color="inherit" size="large">
                            <FormatColorFillIcon sx={{ fontSize: 26 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Skintone" placement="top">
                        <IconButton onClick={onClickSkintonePicker} color="inherit" size="large">
                            <FormatColorFillIcon sx={{ fontSize: 26 }} />
                        </IconButton>
                    </Tooltip>
                    {displayCamera ? (
                        <Tooltip title="Stop motion capture" placement="top">
                            <IconButton onClick={handleCameraRender} color="inherit" size="large">
                                <StopCircleIcon sx={{ fontSize: 26 }} />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Start motion capture" placement="top">
                            <IconButton onClick={handleCameraRender} color="inherit" size="large">
                                <PlayCircleIcon sx={{ fontSize: 26 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="GitHub" placement="top">
                        <IconButton onClick={onClickGitHub} color="inherit" size="large">
                            <GitHubIcon sx={{ fontSize: 26 }} />
                        </IconButton>
                    </Tooltip>
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
