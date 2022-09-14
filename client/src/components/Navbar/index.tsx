import React from 'react';
// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slide from '@mui/material/Slide';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material';
// Icons
import AvatarIcon from '@mui/icons-material/AccessibilityNew';
import PlayIcon from '@mui/icons-material/PlayCircleOutline';
import StopIcon from '@mui/icons-material/StopCircle';
import LockIcon from '@mui/icons-material/Lock';
import NoLockIcon from '@mui/icons-material/NoEncryptionGmailerrorred';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import ScreenshotIcon from '@mui/icons-material/CameraAlt';
import GitHubIcon from '@mui/icons-material/GitHub';
// Components
import Tooltip from '../Tooltip';
// Contexts
import { useUserContext } from '../../Contexts';

const CustomIconButton = styled(IconButton)(({ theme }) => ({
    margin: 4,
    color: theme.palette.text.primary,
    background: theme.palette.primary.main,
    '& .MuiSvgIcon-root': {
        color: '#ffffff'
    },
    '&:hover': {
        background: theme.palette.secondary.main,
        '& .MuiSvgIcon-root': {
            color: theme.palette.text.primary
        }
    }
}));

const Nav = styled(Box)(({ theme }) => ({
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.text.primary,
    position: 'absolute',
    paddingTop: 5,
    paddingBottom: 5,
    bottom: 0,
    background: alpha(theme.palette.primary.main, 0.3)
}));

const Navbar = () => {
    const { cameraRender, lockCamera, toggleCamera, toggleNavbarLeft, displayNavbar, toggleNavbar, toggleSettings, camera, takeScreenshot } = useUserContext();
    const containerRef = React.useRef(null);

    const handleCustomizeAvatar = () => {
        toggleNavbarLeft();
    };
    const handleMotionCapture = () => {
        cameraRender();
    };
    const handleLockCamera = () => {
        toggleCamera();
    };

    const handleScreenshot = () => {
        takeScreenshot();
    };

    const handleSettings = () => {
        toggleSettings();
    };

    const handleGitHub = () => {
        window.open('https://github.com/Jioyi', '_blank');
    };

    const handleClose = () => {
        toggleNavbar();
    };

    return (
        <Slide direction="up" in={displayNavbar} container={containerRef.current}>
            <Nav>
                <Tooltip title="Customize avatar">
                    <CustomIconButton onClick={handleCustomizeAvatar}>
                        <AvatarIcon sx={{ fontSize: 24 }} />
                    </CustomIconButton>
                </Tooltip>
                {!camera ? (
                    <Tooltip title="Start motion capture">
                        <CustomIconButton onClick={handleMotionCapture}>
                            <PlayIcon sx={{ fontSize: 24 }} />
                        </CustomIconButton>
                    </Tooltip>
                ) : (
                    <Tooltip title="Stop motion capture">
                        <CustomIconButton onClick={handleMotionCapture}>
                            <StopIcon sx={{ fontSize: 24 }} />
                        </CustomIconButton>
                    </Tooltip>
                )}
                {lockCamera ? (
                    <Tooltip title="Unlock camera">
                        <CustomIconButton onClick={handleLockCamera}>
                            <NoLockIcon sx={{ fontSize: 24 }} />
                        </CustomIconButton>
                    </Tooltip>
                ) : (
                    <Tooltip title="Lock camera">
                        <CustomIconButton onClick={handleLockCamera}>
                            <LockIcon sx={{ fontSize: 24 }} />
                        </CustomIconButton>
                    </Tooltip>
                )}
                <Tooltip title="Take screenshot">
                    <CustomIconButton onClick={handleScreenshot}>
                        <ScreenshotIcon sx={{ fontSize: 24 }} />
                    </CustomIconButton>
                </Tooltip>
                <Tooltip title="GitHub">
                    <CustomIconButton onClick={handleGitHub}>
                        <GitHubIcon sx={{ fontSize: 24 }} />
                    </CustomIconButton>
                </Tooltip>
                <Tooltip title="Settings">
                    <CustomIconButton onClick={handleSettings}>
                        <SettingsIcon sx={{ fontSize: 24 }} />
                    </CustomIconButton>
                </Tooltip>
                <Tooltip title="Close Menu">
                    <CustomIconButton onClick={handleClose}>
                        <CloseIcon sx={{ fontSize: 24 }} />
                    </CustomIconButton>
                </Tooltip>
            </Nav>
        </Slide>
    );
};

export default Navbar;

/* import WallpaperIcon from '@mui/icons-material/Wallpaper';
import FullscreenIcon from '@mui/icons-material/Fullscreen';                
<Tooltip title="Change Wallpaper">
<CustomIconButton onClick={handleWallpaper}>
    <WallpaperIcon sx={{ fontSize: 24 }} />
</CustomIconButton>
</Tooltip>
<Tooltip title="Fullscreen">
<CustomIconButton onClick={handleFullscreen}>
    <FullscreenIcon sx={{ fontSize: 24 }} />
</CustomIconButton>
</Tooltip> */
