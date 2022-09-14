import React from 'react';
import { calculateBounds, colourToRgbObj, convertObjToString, getEffectiveRadius, defaultProps, produceRgbShades, ConvertRGBtoHex } from './utils';
// Style css
import Styles from './ColourWheel.module.css';

type ColourWheelProps = {
    radius: number;
    lineWidth: number;
    onColourSelected?: Function;
    padding?: number;
    spacers?: spacersProps;
    colours?: Array<string>;
    shades?: number;
    dynamicCursor?: boolean;
    preset?: boolean;
    presetColour?: string;
    animated?: boolean;
    toRgbObj?: boolean;
    onRef?: Function;
};

const fullCircle = 2 * Math.PI;
const quarterCircle = fullCircle / 4;

type spacersProps = {
    colour: string;
    shadowColour: string;
    shadowBlur: number;
};

type ColourWheelState = {
    rgb: tinycolor.ColorFormats.RGB;
    innerWheelOpen: boolean;
    centerCircleOpen: boolean;
};

class ColourWheel extends React.Component<ColourWheelProps, ColourWheelState> {
    canvasEl!: HTMLCanvasElement;
    ctx!: CanvasRenderingContext2D;
    padding: number;
    outerWheelRadius!: number;
    innerWheelRadius!: number;
    centerCircleRadius!: number;
    firstSpacerRadius!: number;
    secondSpacerRadius!: number;

    outerWheelBounds!: { inside: (cursorPosFromCenter: number) => boolean };
    innerWheelBounds!: { inside: (cursorPosFromCenter: number) => boolean };
    centerCircleBounds!: { inside: (cursorPosFromCenter: number) => boolean };
    firstSpacerBounds!: { inside: (cursorPosFromCenter: number) => boolean };
    secondSpacerBounds!: { inside: (cursorPosFromCenter: number) => boolean };

    colours: Array<string>;
    spacers: spacersProps;
    shades: number;
    dynamicCursor: boolean;
    thirdSpacerRadius: number;

    constructor(props: ColourWheelProps) {
        super(props);
        this.state = {
            rgb: { r: 0, b: 0, g: 0 },
            innerWheelOpen: true,
            centerCircleOpen: true
        };
        this.padding = props.padding ? props.padding : defaultProps.padding;
        this.colours = props.colours && props.colours.length > 0 ? props.colours : defaultProps.colours;
        this.spacers = props.spacers ? props.spacers : defaultProps.spacers;
        this.shades = props.shades ? props.shades : defaultProps.shades;
        this.dynamicCursor = props.dynamicCursor ? true : false;

        const { radius, lineWidth } = this.props;

        this.outerWheelRadius = radius;
        this.innerWheelRadius = this.outerWheelRadius - lineWidth - this.padding;
        this.centerCircleRadius = this.innerWheelRadius - lineWidth - this.padding;
        this.firstSpacerRadius = this.outerWheelRadius - lineWidth;
        this.secondSpacerRadius = this.innerWheelRadius - lineWidth;
        this.thirdSpacerRadius = this.outerWheelRadius - 1;

        this.outerWheelBounds = calculateBounds(radius - lineWidth, radius);
        this.innerWheelBounds = calculateBounds(this.innerWheelRadius - lineWidth, this.innerWheelRadius);
        this.centerCircleBounds = calculateBounds(0, this.centerCircleRadius);
        this.firstSpacerBounds = calculateBounds(this.firstSpacerRadius - this.padding, this.firstSpacerRadius);
        this.secondSpacerBounds = calculateBounds(this.secondSpacerRadius - this.padding, this.secondSpacerRadius);

        this.onCanvasHover = this.onCanvasHover.bind(this);
        this.onCanvasClick = this.onCanvasClick.bind(this);
    }

    getRelativeMousePos(clientX: any, clientY: any) {
        const { radius } = this.props;

        const canvasPos = this.canvasEl.getBoundingClientRect();
        const h = radius * 2;
        const w = radius * 2;

        const onCanvas = {
            x: clientX - canvasPos.left,
            y: clientY - canvasPos.top
        };

        const fromCenter = Math.sqrt((onCanvas.x - w / 2) * (onCanvas.x - w / 2) + (onCanvas.y - h / 2) * (onCanvas.y - h / 2));

        return {
            fromCenter,
            onCanvas
        };
    }

    initCanvas() {
        const { radius } = this.props;

        const width = radius * 2;
        const height = radius * 2;

        this.ctx.clearRect(0, 0, width, height);

        this.drawOuterWheel();
        this.drawSpacers();
    }

    componentDidMount() {
        if (this.props.onRef) this.props.onRef(this);

        this.canvasEl = document.getElementById('colour-picker') as HTMLCanvasElement;
        this.ctx = this.canvasEl.getContext('2d') as CanvasRenderingContext2D;
        this.ctx.clearRect(0, 0, this.props.radius * 2, this.props.radius * 2);
        if (this.props.preset && this.props.presetColour) {
            const rgb = colourToRgbObj(this.props.presetColour);

            this.setState({ rgb }, () => {
                this.drawOuterWheel();
                this.drawInnerWheel();
                this.drawCenterCircle();
                this.drawSpacers();
            });
        } else {
            this.drawOuterWheel();
            this.drawSpacers();
        }
    }

    onCanvasHover({ clientX, clientY }: any) {
        const evt = this.getRelativeMousePos(clientX, clientY);

        if (this.outerWheelBounds.inside(evt.fromCenter)) {
            this.canvasEl.style.cursor = 'pointer';
        } else if (this.innerWheelBounds.inside(evt.fromCenter) && this.state.innerWheelOpen) {
            this.canvasEl.style.cursor = 'pointer';
        } else if (this.centerCircleBounds.inside(evt.fromCenter) && this.state.centerCircleOpen) {
            this.canvasEl.style.cursor = 'pointer';
        } else {
            this.canvasEl.style.cursor = 'auto';
        }
    }

    onCanvasClick({ clientX, clientY }: any) {
        const evt = this.getRelativeMousePos(clientX, clientY);

        if (this.outerWheelBounds.inside(evt.fromCenter)) {
            this.outerWheelClicked(evt.onCanvas);
        } else if (this.innerWheelBounds.inside(evt.fromCenter) && this.state.innerWheelOpen) {
            this.innerWheelClicked(evt.onCanvas);
        }
    }

    outerWheelClicked(evtPos: { x: number; y: number }) {
        const rgbaArr = this.ctx.getImageData(evtPos.x, evtPos.y, 1, 1).data;
        const rgb = { r: rgbaArr[0], g: rgbaArr[1], b: rgbaArr[2] };
        const rgbArg = convertObjToString(rgb);
        const hex = ConvertRGBtoHex(rgbaArr[0], rgbaArr[1], rgbaArr[2]);
        if (this.props.onColourSelected) this.props.onColourSelected(rgbArg, hex);

        this.setState(
            {
                rgb,
                innerWheelOpen: true,
                centerCircleOpen: true
            },
            () => {
                this.drawInnerWheel();
                this.drawCenterCircle();
            }
        );
    }

    innerWheelClicked(evtPos: any) {
        const rgbaArr = this.ctx.getImageData(evtPos.x, evtPos.y, 1, 1).data;
        const rgb = { r: rgbaArr[0], g: rgbaArr[1], b: rgbaArr[2] };
        const rgbArg = convertObjToString(rgb);
        const hex = ConvertRGBtoHex(rgbaArr[0], rgbaArr[1], rgbaArr[2]);
        if (this.props.onColourSelected) this.props.onColourSelected(rgbArg, hex);

        this.setState(
            {
                rgb,
                centerCircleOpen: true
            },
            () => {
                this.drawCenterCircle();
            }
        );
    }

    clear(callback: () => void) {
        this.setState(
            {
                rgb: { r: 0, g: 0, b: 0 },
                innerWheelOpen: false,
                centerCircleOpen: false
            },
            () => {
                this.initCanvas();
                if (callback) callback();
            }
        );
    }

    drawOuterWheel() {
        const { radius, lineWidth } = this.props;
        const height = radius * 2;
        const width = radius * 2;

        const effectiveRadius = getEffectiveRadius(radius, lineWidth);
        const rgbArr = this.colours.map((colour) => colourToRgbObj(colour));

        rgbArr.forEach((rgb, i) => {
            this.ctx.beginPath();
            const startAngle = (fullCircle / rgbArr.length) * i;
            const endAngle = (fullCircle / rgbArr.length) * (i + 1);

            this.ctx.arc(width / 2, height / 2, effectiveRadius, startAngle, endAngle);
            this.ctx.lineWidth = lineWidth;

            this.ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            this.ctx.stroke();
            this.ctx.closePath();
        });
    }

    drawSpacers() {
        if (this.props.spacers) {
            this.drawSpacer(this.firstSpacerRadius);
            this.drawSpacer(this.secondSpacerRadius);
            this.drawSpacer(this.thirdSpacerRadius);
        }
    }

    drawSpacer(spacerRadius: number) {
        const { radius } = this.props;
        const { colour, shadowColour, shadowBlur } = this.spacers;

        const height = radius * 2;
        const width = radius * 2;

        const effectiveRadius = getEffectiveRadius(spacerRadius, this.padding);

        this.ctx.beginPath();

        this.ctx.arc(width / 2, height / 2, effectiveRadius, 0, fullCircle);
        this.ctx.lineWidth = this.padding;

        this.ctx.shadowColor = shadowColour;
        this.ctx.shadowBlur = shadowBlur;
        this.ctx.strokeStyle = colour;
        this.ctx.stroke();
        this.ctx.closePath();

        this.ctx.shadowColor = 'transparent';
    }

    drawInnerWheel(animationPercentage = 0) {
        window.requestAnimationFrame = requestAnimationFrame;

        const {
            rgb: { r, g, b }
        } = this.state;
        const { radius, lineWidth, animated } = this.props;

        const height = radius * 2;
        const width = radius * 2;

        const effectiveRadius = getEffectiveRadius(this.innerWheelRadius, lineWidth);

        this.ctx.clearRect(0, 0, width, height);
        this.drawOuterWheel();
        this.drawSpacers();

        const rgbShades = produceRgbShades(r, g, b, this.shades);

        const drawShades = () => {
            rgbShades.forEach((rgb, i) => {
                this.ctx.beginPath();

                const startAngle = (fullCircle / rgbShades.length) * i + quarterCircle;
                const endAngle = (fullCircle / rgbShades.length) * (i + 1) + (1 / 2) * Math.PI;

                this.ctx.arc(width / 2, height / 2, effectiveRadius, startAngle, endAngle);
                this.ctx.lineWidth = lineWidth;

                this.ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                this.ctx.stroke();
                this.ctx.closePath();
            });
        };

        const animateShades = () => {
            rgbShades.forEach((rgb, i) => {
                this.ctx.beginPath();

                const startAngle = (fullCircle / rgbShades.length) * i + quarterCircle;
                const endAngle = (fullCircle / rgbShades.length) * (i + 1) + (1 / 2) * Math.PI;

                this.ctx.arc(width / 2, height / 2, effectiveRadius, startAngle, endAngle);
                this.ctx.lineWidth = lineWidth * animationPercentage;

                this.ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                this.ctx.stroke();
                this.ctx.closePath();
            });

            animationPercentage += 1 / 10;

            if (animationPercentage < 1) requestAnimationFrame(animateShades);
        };

        if (animated) {
            animateShades();
        } else {
            drawShades();
        }
    }

    drawCenterCircle() {
        const { rgb } = this.state;
        const { radius } = this.props;

        const height = radius * 2;
        const width = radius * 2;
        this.ctx.lineWidth = 0;

        this.ctx.beginPath();
        this.ctx.arc(width / 2, height / 2, this.centerCircleRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.ctx.fill();
        this.ctx.lineWidth = 0.1;
        this.ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.ctx.stroke();
        this.ctx.closePath();
    }

    render() {
        const { radius } = this.props;
        return this.dynamicCursor ? (
            <canvas
                id="colour-picker"
                className={Styles['colour-picker']}
                onClick={this.onCanvasClick}
                onMouseMove={this.onCanvasHover}
                width={`${radius * 2}px`}
                height={`${radius * 2}px`}
            />
        ) : (
            <canvas id="colour-picker" className={Styles['colour-picker']} onClick={this.onCanvasClick} width={`${radius * 2}px`} height={`${radius * 2}px`} />
        );
    }
}

export default ColourWheel;
