import React from 'react';
import { Route, Routes } from 'react-router-dom';

//Views
import Home from './Views/Home';
import Customizer from './Views/Customizer';

const App = () => {
    return (
        <React.Fragment>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/customizer" element={<Customizer />} />
            </Routes>
        </React.Fragment>
    );
};

export default App;
