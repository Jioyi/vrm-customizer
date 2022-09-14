import React from 'react';
// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slide from '@mui/material/Slide';
import { styled } from '@mui/material/styles';
import Popover from '@mui/material/Popover';
// Icons
import AvatarIcon from '@mui/icons-material/AccessibilityNew';
import EyeIcon from '@mui/icons-material/RemoveRedEye';
import HairColorIcon from '../../Icons/HairColorIcon';
import EyeBrowIcon from '../../Icons/EyeBrowIcon';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
// Components
import Tooltip from '../Tooltip';
// Contexts
import { useUserContext } from '../../Contexts';
import ColourWheel from '../ColourWheel';

const CustomIconButton = styled(IconButton)(({ theme }) => ({
    margin: 6,
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

const NavLeft = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'baseline',
    justifyContent: 'center',
    color: theme.palette.text.primary,
    position: 'absolute'
}));

const NavbarLeft = () => {
    const { displayNavbar, displayNavbarLeft, setVRMSkintone, setVRMHairColor, setVRMIrisColor, setVRMBrowColor } = useUserContext();
    const [skintone, setSkintone] = React.useState('rgb(255, 255, 255)');
    const [hairColor, setHairColor] = React.useState('rgb(255, 255, 255)');
    const [browColor, setBrowColor] = React.useState('rgb(255, 255, 255)');
    const [irisColor, setIrisColor] = React.useState('rgb(255, 255, 255)');
    const [colorPicker, setColorPicker] = React.useState('skin');
    const currentColor =
        colorPicker === 'skin'
            ? skintone
            : colorPicker === 'hair'
            ? hairColor
            : colorPicker === 'iris'
            ? irisColor
            : colorPicker === 'brow'
            ? browColor
            : skintone;
    const [displayColourWheel, setDisplayColourWheel] = React.useState(false);
    const containerRef = React.useRef(null);
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const onCloseMethod = () => {
        setDisplayColourWheel(false);
    };

    const onChangeColor = (rgb: any, hex: string) => {
        if (colorPicker === 'skin') {
            setSkintone(rgb);
            setVRMSkintone(hex);
        } else if (colorPicker === 'hair') {
            setHairColor(rgb);
            setVRMHairColor(hex);
        } else if (colorPicker === 'iris') {
            setIrisColor(rgb);
            setVRMIrisColor(hex);
        } else if (colorPicker === 'brow') {
            setBrowColor(rgb);
            setVRMBrowColor(hex);
        }
    };

    const onOpenMethod = (event: React.MouseEvent<HTMLButtonElement>, colorPicker: string) => {
        setColorPicker(colorPicker);
        setAnchorEl(event.currentTarget);
        setDisplayColourWheel(true);
    };

    return (
        <>
            <Slide direction="right" in={displayNavbar && displayNavbarLeft} container={containerRef.current}>
                <NavLeft style={{ minHeight: '100vh' }}>
                    <Box>
                        <Tooltip title="Customize Skin">
                            <CustomIconButton>
                                <AvatarIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                        <Tooltip title="Skintone">
                            <CustomIconButton onClick={(event) => onOpenMethod(event, 'skin')}>
                                <FormatColorFillIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                    </Box>
                    <Box>
                        <Tooltip title="Customize Hair">
                            <CustomIconButton>
                                <HairColorIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                        <Tooltip title="Hair Color">
                            <CustomIconButton onClick={(event) => onOpenMethod(event, 'hair')}>
                                <FormatColorFillIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                    </Box>
                    <Box>
                        <Tooltip title="Customize Eye">
                            <CustomIconButton>
                                <EyeIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                        <Tooltip title="Iris Color">
                            <CustomIconButton onClick={(event) => onOpenMethod(event, 'iris')}>
                                <FormatColorFillIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                    </Box>
                    <Box>
                        <Tooltip title="Customize Eyebrow">
                            <CustomIconButton>
                                <EyeBrowIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                        <Tooltip title="Eyebrow Color">
                            <CustomIconButton onClick={(event) => onOpenMethod(event, 'brow')}>
                                <FormatColorFillIcon sx={{ fontSize: 24 }} />
                            </CustomIconButton>
                        </Tooltip>
                    </Box>
                </NavLeft>
            </Slide>
            <Popover
                id="color-popover"
                open={displayColourWheel}
                anchorEl={anchorEl}
                onClose={onCloseMethod}
                anchorOrigin={{
                    vertical: -10,
                    horizontal: 'center'
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center'
                }}
                PaperProps={{
                    style: {
                        background: 'transparent',
                        backgroundColor: 'transparent'
                    }
                }}
            >
                <ColourWheel
                    radius={70}
                    padding={5}
                    lineWidth={30}
                    onColourSelected={onChangeColor}
                    spacers={{
                        colour: '#FFFFFF',
                        shadowColour: 'grey',
                        shadowBlur: 5
                    }}
                    dynamicCursor={true}
                    preset
                    presetColour={currentColor}
                    animated={false}
                />
            </Popover>
        </>
    );
};

export default NavbarLeft;
