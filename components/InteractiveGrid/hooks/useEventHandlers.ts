import React, { useState, useCallback } from "react";
import { ThreeContext } from "./types";
import { AnimationConfig } from "../config";

/**
 * @file Sets up all the necessary DOM event listeners for user interaction.
 * This hook is responsible for capturing raw user input (mouse clicks,
 * touch gestures, scrolling) and translating it into actions for the
 * application. It manages the cursor state and delegates the core
 * interaction logic to the `handleInteraction` callback.
 */
export function useEventHandlers(
    threeContext: React.MutableRefObject<ThreeContext>,
    handleInteraction: (pos: { x: number; y: number }, delta: any) => void
) {
    const [cursor, setCursor] = useState("grab");

    /**
     * Handles the start of a drag/touch interaction.
     */
    const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const { current: context } = threeContext;
        if (!context.renderer) return;
        // Capture the pointer to ensure events are received even if the cursor leaves the element.
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        context.isDragging = true;
        setCursor("grabbing");
        context.previousMouse.set(event.clientX, event.clientY);
        context.clickStart.set(event.clientX, event.clientY);
    }, [threeContext]);

    /**
     * Handles the end of a drag/touch interaction, determining if it was a tap or a swipe.
     */
    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const { current: context } = threeContext;
        if (!context.renderer) return;
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        
        const clickEnd = new context.THREE.Vector2(event.clientX, event.clientY);
        const delta = clickEnd.clone().sub(context.clickStart);
        // Delegate to the interaction hook to handle the logic.
        handleInteraction(clickEnd, delta);
        
        context.isDragging = false;
        setCursor("grab");
    }, [threeContext, handleInteraction]);

    /**
     * Updates the target mouse position as the user moves their cursor.
     */
    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const { current: context } = threeContext;
        if (!context.renderer) return;
        context.targetMousePos.set(event.clientX, event.clientY);
    }, [threeContext]);

    /**
     * Ensures dragging stops if the cursor leaves the window.
     */
    const onPointerLeave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const { current: context } = threeContext;
        if (!context.renderer || !context.isDragging) return;
        onPointerUp(event);
    }, [threeContext, onPointerUp]);

    /**
     * Handles mouse wheel scrolling to pan the grid.
     */
    const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        const { current: context } = threeContext;
        if (!context.renderer || context.isZoomed || !context.plane) return;
        event.preventDefault();

        const { plane, zoom, targetOffset } = context;
        const res = plane.material.uniforms.uResolution.value;
        const aspectRatio = res.x / res.y;
        
        let { deltaX, deltaY } = event;
        // Normalize scroll values across different browsers and input devices.
        if (event.deltaMode === 1) { deltaX *= 18; deltaY *= 18; } 
        else if (event.deltaMode === 2) { deltaX *= window.innerWidth; deltaY *= window.innerHeight; }
        
        targetOffset.x += deltaX * AnimationConfig.scrollSpeed * zoom * aspectRatio;
        targetOffset.y -= deltaY * AnimationConfig.scrollSpeed * zoom;
    }, [threeContext]);

    return {
        cursor,
        eventHandlers: {
            onPointerDown,
            onPointerUp,
            onPointerMove,
            onPointerLeave,
            onWheel,
        },
    };
}