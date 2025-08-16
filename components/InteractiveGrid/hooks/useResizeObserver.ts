import React, { useEffect } from "react";
import { ThreeContext } from "./types";

/**
 * @file Manages a `ResizeObserver` to automatically keep the Three.js
 * renderer and shader uniforms in sync with the size of the component's DOM element.
 * This is crucial for making the WebGL canvas responsive. Without this, the canvas
 * would be a fixed size and would not adapt to window resizing.
 */
export function useResizeObserver(
    mountRef: React.RefObject<HTMLDivElement>,
    threeContext: React.MutableRefObject<ThreeContext>,
    isThreeInitialized: boolean
) {
    useEffect(() => {
        if (!isThreeInitialized) return;

        const currentMount = mountRef.current;
        const { current: context } = threeContext;

        /**
         * This callback function is executed by the ResizeObserver whenever
         * the observed element's size changes.
         */
        const onResize = () => {
            if (!context.renderer || !context.plane || !currentMount) return;
            // 1. Update the renderer's size to match the new element size.
            context.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            // 2. Update the shader's `uResolution` uniform so it knows the new screen dimensions.
            context.plane.material.uniforms.uResolution.value.set(currentMount.clientWidth, currentMount.clientHeight);
        };

        const resizeObserver = new ResizeObserver(onResize);
        if (currentMount) {
            // Start observing the main mount element.
            resizeObserver.observe(currentMount);
            onResize(); // Call it once initially to set the correct size.
        }

        // Cleanup function to stop observing when the component unmounts.
        return () => {
            if (currentMount) {
                resizeObserver.unobserve(currentMount);
            }
        };
    }, [isThreeInitialized, mountRef, threeContext]);
}