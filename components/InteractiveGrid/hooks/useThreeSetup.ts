import { useState, useEffect } from "react";
import { vertexShader, fragmentShader } from "../shaders";
import { ThreeContext } from "./types";

/**
 * @file Handles the one-time, boilerplate setup of the core Three.js environment.
 * This hook is responsible for creating the fundamental building blocks of
 * a Three.js scene:
 * - The Scene itself, which is the container for all objects.
 * - The Orthographic Camera, used for 2D rendering.
 * - The WebGL Renderer, which draws everything to the canvas.
 * - The main Plane Mesh, which fills the screen and has our custom shader material.
 * It returns a boolean flag that indicates when this setup is complete.
 */
export function useThreeSetup(
    mountRef: React.RefObject<HTMLDivElement>,
    threeContext: React.MutableRefObject<ThreeContext>
): boolean {
    const [isThreeInitialized, setIsThreeInitialized] = useState(false);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount || isThreeInitialized) return;

        // Ensure THREE.js is loaded from the CDN script in index.html
        const THREE = (window as any).THREE;
        if (!THREE) {
            console.error("THREE.js has not been loaded. Check the script tag in index.html.");
            return;
        }
        
        const context = threeContext.current;
        context.THREE = THREE;
        const isMobile = "ontouchstart" in window;

        // Initialize vector objects and other mutable properties on the context.
        Object.assign(context, {
            previousMouse: new THREE.Vector2(), clickStart: new THREE.Vector2(),
            offset: new THREE.Vector2(), targetOffset: new THREE.Vector2(),
            offsetVelocity: new THREE.Vector2(), mousePos: new THREE.Vector2(-1, -1),
            targetMousePos: new THREE.Vector2(-1, -1), lastOffset: new THREE.Vector2(),
            hoveredCellId: new THREE.Vector2(-999, -999)
        });

        // 1. Create the Scene
        context.scene = new THREE.Scene();
        
        // 2. Create the Camera
        context.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        context.camera.position.z = 1;
        
        // 3. Create the Renderer
        context.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        context.renderer.setClearColor(0x000000, 0); // Transparent background
        context.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
        currentMount.appendChild(context.renderer.domElement);
        
        // 4. Create the Shader Material and Plane Mesh
        const uniforms = {
            uOffset: { value: context.offset }, uResolution: { value: new THREE.Vector2() },
            uBorderColor: { value: new THREE.Vector4() }, uHoverColor: { value: new THREE.Vector4() },
            uBackgroundColor: { value: new THREE.Vector4() }, uMousePos: { value: context.mousePos },
            uZoom: { value: 1.0 }, uDistortionStrength: { value: 1.0 }, uCellSize: { value: 0.75 },
            uTextureCount: { value: 0 }, uImageAtlas: { value: null }, uTextAtlas: { value: null },
            uActiveVideo: { value: null }, uHoveredCellId: { value: new THREE.Vector2(-999, -999) },
            uIsVideoActive: { value: false }, uZoomProgress: { value: 0.0 }, uTime: { value: 0.0 },
            uIsMobile: { value: isMobile }, uHoverEnabled: { value: true }, uOptimizeMobile: { value: true },
        };
        const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
        context.plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        context.scene.add(context.plane);

        // Signal that initialization is complete.
        setIsThreeInitialized(true);

        // Cleanup function to remove the renderer's canvas on component unmount.
        return () => {
            if (context.renderer?.domElement.parentNode === currentMount) {
                currentMount.removeChild(context.renderer.domElement);
            }
        };
    }, [mountRef, threeContext]);

    return isThreeInitialized;
}