import React, { useMemo, useState, createContext, useContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

interface ThemeProviderProps {
    children: React.ReactNode;
}

const ThemeContext = createContext({ toggleColorMode: () => {} });

export const ThemeContextProvider = ({ children }: ThemeProviderProps) => {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    const themeMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
            }
        }),
        []
    );

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                }
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={themeMode}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => {
    return useContext(ThemeContext);
};
