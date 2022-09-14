import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Contexts
import { UserContextProvider } from './Contexts';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <UserContextProvider>
        <App />
    </UserContextProvider>
);

reportWebVitals();
