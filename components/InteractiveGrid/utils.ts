// This utility function parses a CSS color string (like 'rgb(r,g,b)' or '#hex')
// and converts it into a THREE.Vector4, which is required for shader uniforms.
export const parseColorToVec4 = (colorString: string, THREE: any) => {
    // Attempt to match rgba(r, g, b, a) format
    const rgbaMatch = colorString.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );

    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10) / 255;
        const g = parseInt(rgbaMatch[2], 10) / 255;
        const b = parseInt(rgbaMatch[3], 10) / 255;
        const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0;
        return new THREE.Vector4(r, g, b, a);
    }

    // Fallback to THREE.Color for other formats (like hex)
    const color = new THREE.Color(colorString);
    return new THREE.Vector4(color.r, color.g, color.b, 1.0);
};
