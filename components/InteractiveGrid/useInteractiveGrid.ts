import { useRef } from "react";
import { useThreeSetup } from "./hooks/useThreeSetup";
import { useUniforms } from "./hooks/useUniforms";
import { useTextureManager } from "./hooks/useTextureManager";
import { useInteraction } from "./hooks/useInteraction";
import { useEventHandlers } from "./hooks/useEventHandlers";
import { useAnimationLoop } from "./hooks/useAnimationLoop";
import { useVideoManager } from "./hooks/useVideoManager";
import { useResizeObserver } from "./hooks/useResizeObserver";
import { InteractiveGridProps, ThreeContext } from "./hooks/types";
import { AnimationConfig } from "./config";

/**
 * @file This is the main orchestrator hook for the interactive grid.
 * It brings together all the smaller, specialized hooks to create the
 * complete functionality. Its primary job is to manage the central
 * `threeContext` ref object and ensure data flows correctly between
 * the other hooks.
 */
export function useInteractiveGrid(props: InteractiveGridProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const linkRef = useRef<HTMLAnchorElement>(null);

    // This ref holds the mutable Three.js state. It's used to store
    // objects and values that can change frequently without causing re-renders.
    const threeContext = useRef<ThreeContext>({
        ...AnimationConfig.initialState, // Start with initial values from the config
        THREE: null, scene: null, camera: null, renderer: null, plane: null,
        videoRef: undefined, videoTextureRef: null, previousMouse: null, 
        clickStart: null, offset: null, targetOffset: null, offsetVelocity: null, 
        mousePos: null, targetMousePos: null, lastOffset: null,
    });
    
    // Core Three.js scene setup
    const isThreeInitialized = useThreeSetup(mountRef, threeContext);

    // Manages the video element and playback logic
    const { setVideoState } = useVideoManager(mountRef, threeContext, isThreeInitialized, props.projects);

    // Keeps the renderer and uniforms updated on resize
    useResizeObserver(mountRef, threeContext, isThreeInitialized);

    // Manages syncing props to shader uniforms
    useUniforms(threeContext, isThreeInitialized, props);

    // Manages loading image/text data into textures
    useTextureManager(threeContext, isThreeInitialized, props);

    // Handles user interactions like zooming and navigating
    const { zoomedProject, isZoomed, handleInteraction } = useInteraction(
        threeContext,
        setVideoState,
        props,
        linkRef
    );

    // Sets up DOM event handlers for pointer and wheel events
    const { cursor, eventHandlers } = useEventHandlers(
        threeContext,
        handleInteraction
    );
    
    // Runs the main animation loop
    useAnimationLoop(threeContext, isThreeInitialized, setVideoState);

    return {
        mountRef,
        linkRef,
        zoomedProject,
        isZoomed: isZoomed,
        cursor,
        eventHandlers,
    };
}