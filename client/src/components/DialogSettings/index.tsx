import React from 'react';
// Material UI
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputBase from '@mui/material/InputBase';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
// Contexts
import { useUserContext } from '../../Contexts';

const CustomDialog = styled(Dialog)(({ theme }) => ({
    zIndex: 7,
    paddingTop: theme.spacing(3),
    '& .MuiDialogContent-root': {
        padding: theme.spacing(1)
    },
    '& .MuiDialogActions-root': {
        padding: theme.spacing(1)
    },
    '& .MuiDialogTitle-root': {
        textAlign: 'center',
        padding: theme.spacing(1),
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        alignItems: 'center',
        justifyContent: 'center'
    }
}));

const CustomInput = styled(InputBase)(({ theme }) => ({
    'label + &': {
        color: theme.palette.text.primary,
        marginTop: theme.spacing(3)
    },
    '& .MuiInputBase-input': {
        borderRadius: 4,
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
        border: '1px solid #ced4da',
        fontSize: 14,
        width: 250,
        padding: '10px 26px 10px 12px',
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        // Use the system font instead of the default Roboto font.
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"'
        ].join(','),
        '&:focus': {
            borderRadius: 4
        }
    }
}));

const DialogSettings = () => {
    const { openSettings, toggleSettings, mode, toggleTheme, takeHumanoidHelper, takeLookAtHelper, takeSpringBoneJointHelper, takeSpringBoneColliderHelper } =
        useUserContext();

    const [language, setLanguage] = React.useState('english');

    const handleClose = () => {
        toggleSettings();
    };

    const handleChangeLanguage = (event: SelectChangeEvent) => {
        setLanguage(event.target.value);
    };

    const handleChangeTheme = (event: SelectChangeEvent) => {
        if (mode !== event.target.value) {
            toggleTheme();
        }
    };

    return (
        <div>
            <CustomDialog open={openSettings} onClose={handleClose}>
                <DialogTitle component="span">Settings</DialogTitle>
                <DialogContent sx={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <DialogContentText component="span">
                        <FormControl sx={{ m: 1 }} variant="standard">
                            <InputLabel>Language</InputLabel>
                            <Select value={language} label="Language" onChange={handleChangeLanguage} input={<CustomInput />}>
                                <MenuItem value="english">English</MenuItem>
                            </Select>
                        </FormControl>
                        <Divider />
                        <FormControl sx={{ m: 1 }} variant="standard">
                            <InputLabel>Theme</InputLabel>
                            <Select value={mode} label="Theme" onChange={handleChangeTheme} input={<CustomInput />}>
                                <MenuItem value="light">Light</MenuItem>
                                <MenuItem value="dark">Dark</MenuItem>
                            </Select>
                        </FormControl>
                        <Divider />
                        <FormControl sx={{ m: 1 }} variant="standard">
                            <Button onClick={takeHumanoidHelper} sx={{ m: 1 }} variant="contained" size="medium">
                                Humanoid Helper
                            </Button>
                            <Button onClick={takeLookAtHelper} sx={{ m: 1 }} variant="contained" size="medium">
                                Look At Helper
                            </Button>
                            <Button onClick={takeSpringBoneJointHelper} sx={{ m: 1 }} variant="contained" size="medium">
                                Spring Bone JointHelper
                            </Button>
                            <Button onClick={takeSpringBoneColliderHelper} sx={{ m: 1 }} variant="contained" size="medium">
                                Spring Bone Collider Helper
                            </Button>
                        </FormControl>
                    </DialogContentText>
                </DialogContent>
            </CustomDialog>
        </div>
    );
};

export default DialogSettings;
