import React from 'react';
import ColourWheel from '../../Components/ColourWheel';
import Styles from './Test.module.css';

const Test = () => {
    const [state, setState] = React.useState('rgb(255, 255, 255)');

    const onChangeColor = (rgb: any) => {
        setState(rgb);
        console.log(rgb);
    };

    return (
        <div className={Styles['screen-container']}>
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
                preset // You can set this bool depending on whether you have a pre-selected colour in state.
                presetColour={state}
                animated={false}
            />
        </div>
    );
};

export default Test;
