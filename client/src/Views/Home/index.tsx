import React from 'react';
import Styles from './Home.module.css';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    return (
        <div className={Styles['container']}>
            <div className={Styles['center']}>
                <p>VRM avatar customization demo</p>
                <button onClick={() => navigate('/customizer')}>Create Avatar</button>
            </div>
        </div>
    );
};

export default Home;
