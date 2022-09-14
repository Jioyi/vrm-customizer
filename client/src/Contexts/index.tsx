import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VRMCustomizer from '../VRMCustomizer';

interface UserProviderProps {
    children: React.ReactNode;
}

const UserContext = React.createContext({
    toggleTheme: () => {},
    toggleNavbar: () => {},
    toggleNavbarLeft: () => {},
    toggleSettings: () => {},
    toggleCamera: () => {},
    takeScreenshot: () => {},
    takeHumanoidHelper: () => {},
    takeLookAtHelper: () => {},
    takeSpringBoneJointHelper: () => {},
    takeSpringBoneColliderHelper: () => {},
    setVRMSkintone: (_color: string) => {},
    setVRMHairColor: (_color: string) => {},
    setVRMIrisColor: (_color: string) => {},
    setVRMBrowColor: (_color: string) => {},
    displayNavbar: true,
    displayNavbarLeft: false,
    lockCamera: false,
    setEngine: (_VRMCustomizer: VRMCustomizer) => {},
    cameraRender: () => {},
    camera: false,
    openSettings: false,
    mode: 'light'
});

export const UserContextProvider = ({ children }: UserProviderProps) => {
    const [mode, setMode] = React.useState<'light' | 'dark'>('light');
    const [displayNavbar, setDisplayNavbar] = React.useState(true);
    const [displayNavbarLeft, setDisplayNavbarLeft] = React.useState(false);
    const [lockCamera, setLockCamera] = React.useState(false);
    const [camera, setCamera] = React.useState(false);
    const [VRMC, setVRMC] = React.useState<VRMCustomizer>();
    // const [fullscreen, setFullscreen] = React.useState(false);

    const [openSettings, setOpenSettings] = React.useState(false);

    const values = React.useMemo(
        () => ({
            toggleTheme: () => {
                setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
            },
            toggleNavbar: () => {
                setDisplayNavbar((prevMode) => !prevMode);
            },
            toggleNavbarLeft: () => {
                setDisplayNavbarLeft((prevMode) => !prevMode);
            },
            toggleSettings: () => {
                setOpenSettings((prevMode) => !prevMode);
            },
            setVRMSkintone: (color: string) => {
                if (VRMC) {
                    VRMC.setSkintone(color);
                }
            },
            setVRMHairColor: (color: string) => {
                if (VRMC) {
                    VRMC.setHairColor(color);
                }
            },
            setVRMBrowColor: (color: string) => {
                if (VRMC) {
                    VRMC.setBrowColor(color);
                }
            },
            setVRMIrisColor: (color: string) => {
                if (VRMC) {
                    VRMC.setIrisColor(color);
                }
            },
            takeHumanoidHelper: () => {
                if (VRMC) {
                    VRMC.takeHumanoidHelper();
                }
            },
            takeLookAtHelper: () => {
                if (VRMC) {
                    VRMC.takeLookAtHelper();
                }
            },
            takeSpringBoneJointHelper: () => {
                if (VRMC) {
                    VRMC.takeSpringBoneJointHelper();
                }
            },
            takeSpringBoneColliderHelper: () => {
                if (VRMC) {
                    VRMC.takeSpringBoneColliderHelper();
                }
            },
            toggleCamera: () => {
                setLockCamera((prevMode) => !prevMode);
                if (VRMC) {
                    VRMC.lockCamera(!lockCamera);
                }
            },
            takeScreenshot: () => {
                if (VRMC) {
                    VRMC.takeScreenshot();
                }
            },
            cameraRender: () => {
                if (VRMC) {
                    setCamera((prevMode) => {
                        VRMC.cameraRender(!prevMode);
                        return !prevMode;
                    });
                }
            },
            displayNavbar,
            displayNavbarLeft,
            lockCamera,
            setEngine: (_VRMCustomizer: VRMCustomizer) => {
                setVRMC(_VRMCustomizer);
            },
            camera,
            openSettings,
            mode
        }),
        [displayNavbar, displayNavbarLeft, lockCamera, camera, openSettings, mode, VRMC]
    );

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === 'light'
                        ? {
                              primary: {
                                  main: '#ff8fb5'
                              },
                              secondary: {
                                  main: '#ff6699'
                              }
                          }
                        : {
                              primary: {
                                  main: '#000000'
                              },
                              secondary: {
                                  main: '#4e4e4e'
                              }
                          })
                }
            }),
        [mode]
    );

    return (
        <UserContext.Provider value={values}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    return React.useContext(UserContext);
};
