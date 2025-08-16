import { useEffect } from "react";
import { parseColorToVec4 } from "../utils";
import { ThreeContext, InteractiveGridProps } from "./types";

/**
 * @file Synchronizes the React component's props with the Three.js shader uniforms.
 * This hook acts as a bridge between the React world and the WebGL world.
 * Whenever a prop related to the grid's appearance changes (like color, cell size, etc.),
 * this hook ensures the corresponding `uniform` variable in the shader is updated
 * to reflect that change instantly.
 */
export function useUniforms(
    threeContext: React.MutableRefObject<ThreeContext>,
    isThreeInitialized: boolean,
    props: InteractiveGridProps
) {
    const { backgroundColor, borderColor, hoverColor, cellSize, distortionStrength, disableMobileHover, optimizeMobile } = props;

    // This effect updates all color-related uniforms.
    useEffect(() => {
        if (isThreeInitialized) {
            const { plane, THREE } = threeContext.current;
            const { uBorderColor, uHoverColor, uBackgroundColor } = plane.material.uniforms;
            // The `parseColorToVec4` utility converts CSS color strings into a format the shader understands.
            uBackgroundColor.value.copy(parseColorToVec4(backgroundColor, THREE));
            uBorderColor.value.copy(parseColorToVec4(borderColor, THREE));
            uHoverColor.value.copy(parseColorToVec4(hoverColor, THREE));
        }
    }, [isThreeInitialized, backgroundColor, borderColor, hoverColor, threeContext]);

    // This effect updates scalar (single number) uniforms.
    useEffect(() => {
        if (isThreeInitialized) {
            const { plane } = threeContext.current;
            plane.material.uniforms.uCellSize.value = cellSize;
            plane.material.uniforms.uDistortionStrength.value = distortionStrength;
        }
    }, [isThreeInitialized, cellSize, distortionStrength, threeContext]);
    
    // This effect updates boolean uniforms related to mobile optimizations.
    useEffect(() => {
        if (isThreeInitialized) {
            const { plane } = threeContext.current;
            const isMobile = "ontouchstart" in window;
            plane.material.uniforms.uHoverEnabled.value = !(isMobile && disableMobileHover);
            plane.material.uniforms.uOptimizeMobile.value = isMobile && optimizeMobile;
        }
    }, [isThreeInitialized, disableMobileHover, optimizeMobile, threeContext]);
}