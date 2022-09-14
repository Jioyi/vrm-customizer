import tinycolor from 'tinycolor2';

export const hexStrings = [
    '#00C3A9',
    '#00B720',
    '#008813',
    '#000000',
    '#FFFFFF',
    '#F8E300',
    '#FF6400',
    '#E20000',
    '#AC000D',
    '#9E005F',
    '#6D0E82',
    '#3B3887',
    '#175FDA',
    '#0091E2',
    '#00BCED',
    '#14E4C5'
];

export const defaultProps = {
    colours: hexStrings,
    shades: 16,
    padding: 0,
    preset: false,
    animated: true,
    toRgbObj: false,
    spacers: {
        colour: '#FFFFFF',
        shadowColour: 'grey',
        shadowBlur: 5
    }
};

export const produceRgbShades = (r: any, g: any, b: any, amount: number) => {
    let shades = [];

    const hsl = tinycolor(`rgb(${r}, ${g}, ${b})`).toHsl();

    for (let i = 9; i > 1; i -= 8 / amount) {
        // Decrements from 9 - 1; i being what luminosity (hsl.l) is multiplied by.
        hsl.l = 0.1 * i;
        shades.push(tinycolor(hsl).toRgb());
    }

    return shades;
};

export const colourToRgbObj = (colour: tinycolor.ColorInput) => {
    // TODO: Note which colours tinycolor() can take; i.e. hex / rgb strings, objects, etc.
    return tinycolor(colour).toRgb();
};

export const calculateBounds = (min: number, max: number) => {
    // i.e. min & max pixels away from the center of the canvas.
    return {
        inside: (cursorPosFromCenter: number) => {
            // our relative mouse-position is passed through here to check.
            return cursorPosFromCenter >= min && cursorPosFromCenter <= max;
        }
    };
};

export const convertObjToString = (obj: tinycolor.ColorInput) => {
    return tinycolor(obj).toRgbString();
};

// Method is helpful for generating a radius representative of the stroke + taking into account lineWidth.
export const getEffectiveRadius = (trueRadius: number, lineWidth: number) => {
    return trueRadius - lineWidth / 2;
};

export const ColorToHex = (color: number) => {
    var hexadecimal = color.toString(16);
    return hexadecimal.length === 1 ? '0' + hexadecimal : hexadecimal;
};

export const ConvertRGBtoHex = (red: number, green: number, blue: number) => {
    return '#' + ColorToHex(red) + ColorToHex(green) + ColorToHex(blue);
};
