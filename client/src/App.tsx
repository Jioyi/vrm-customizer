import React from 'react';
import { Route, Routes } from 'react-router-dom';
//Theme
import { ThemeContextProvider } from './Context';
//Views
import Home from './Views/Home';
import Customizer from './Views/Customizer';

const App = () => {
    return (
        <React.Fragment>
            <ThemeContextProvider>
                <Routes>
                    <Route path="/" element={<Customizer />} />
                </Routes>
            </ThemeContextProvider>
        </React.Fragment>
    );
};

export default App;
