import * as THREE from 'three';

export class PixelShader {
    public palette = [new THREE.Color('#000000')];

    public setPalette = (_newPalette: THREE.Color[]) => {
        this.palette = _newPalette
    }   

    private colorComparisonBuilder = () => {
        let output = 'vec4 original = texture2D(tDiffuse, coord);\n';
        for (let i = 0; i < this.palette.length; i++) {
            output +=
                'float distance' +
                i +
                ' = abs(original.r - palette[' +
                i +
                '].r) + abs(original.g - palette[' +
                i +
                '].g) + abs(original.b - palette[' +
                i +
                '].b);\n';
        }
        output += 'vec3 closestColor = palette[0];\n';
        output += 'float minDistance = distance0;\n';
        for (let i = 1; i < this.palette.length; i++) {
            output += 'if(distance' + i + ' < minDistance) {\n';
            output += 'minDistance = distance' + i + ';\n';
            output += 'closestColor = palette[' + i + '];\n';
            output += '}\n';
        }
        return output;
    };

    public loadShader = () => {
        return {
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: null },
                pixelSize: { value: 16 },
                palette: { value: this.palette }
            },
            vertexShader: `
            varying highp vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
            fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float pixelSize;
      uniform vec2 resolution;
      uniform vec3[${this.palette.length}] palette;
      varying highp vec2 vUv;
      void main(){
        vec2 dxy = pixelSize / resolution;
        vec2 coord = dxy * floor( vUv / dxy );
        ${this.colorComparisonBuilder()}
        gl_FragColor = vec4(closestColor, original.a);
        //gl_FragColor = original;
      }`,

            side: THREE.DoubleSide
        };
    };
}