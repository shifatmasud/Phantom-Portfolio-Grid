import { useEffect } from "react";
import { ThreeContext } from "./types";
import { screenToWorld } from "./hookUtils";
import { AnimationConfig } from "../config";

/**
 * @file Manages the main animation loop using `requestAnimationFrame`.
 * This hook is the heartbeat of the experience. It runs on every frame and
 * is responsible for all continuous updates, including:
 * - Calculating spring physics for smooth camera movement.
 * - Interpolating (lerping) values for smooth visual transitions.
 * - Detecting which grid cell is being hovered over.
 * - Handling drag-to-pan logic.
 * - Updating the shader uniforms with the new values.
 * - Rendering the final scene.
 */
export function useAnimationLoop(
    threeContext: React.MutableRefObject<ThreeContext>,
    isThreeInitialized: boolean,
    setVideoState: (cellId: any) => void
) {
    useEffect(() => {
        if (!isThreeInitialized) return;

        let animationFrameId: number;
        const { current: context } = threeContext;
        const { plane, renderer, scene, camera, THREE } = context;
        const { springStiffness, damping, lerpFactor } = AnimationConfig;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // --- 1. PHYSICS & SMOOTHING ---

            // Apply spring physics to the camera offset for a bouncy, natural feel.
            const force = context.targetOffset.clone().sub(context.offset).multiplyScalar(springStiffness);
            context.offsetVelocity.add(force).multiplyScalar(damping);
            context.offset.add(context.offsetVelocity);

            // Linearly interpolate (lerp) values towards their targets for smooth transitions.
            context.mousePos.lerp(context.targetMousePos, lerpFactor);
            context.zoom += (context.targetZoom - context.zoom) * lerpFactor;
            context.distortion += (context.targetDistortion - context.distortion) * lerpFactor;
            context.zoomProgress += ((context.isZoomed ? 1 : 0) - context.zoomProgress) * lerpFactor;

            // --- 2. STATE UPDATES ---

            // Detect which cell is under the mouse when not zoomed in.
            if (!context.isZoomed) {
                const worldCoord = screenToWorld(context.targetMousePos, context);
                const currentCellSize = plane.material.uniforms.uCellSize.value;
                const currentCellId = new THREE.Vector2(Math.floor(worldCoord.x / currentCellSize), Math.floor(worldCoord.y / currentCellSize));
                
                // If the hovered cell changes, update the state and trigger the video.
                if (!context.hoveredCellId || !currentCellId.equals(context.hoveredCellId)) {
                    context.hoveredCellId = currentCellId.clone();
                    if (setVideoState) setVideoState(currentCellId);
                }
            }

            // Handle panning the grid when the user is dragging.
            if (context.isDragging && !context.isZoomed && plane.material.uniforms.uResolution.value.y > 0) {
                const delta = context.targetMousePos.clone().sub(context.previousMouse);
                const moveSpeed = 2.0 / plane.material.uniforms.uResolution.value.y;
                const aspect = plane.material.uniforms.uResolution.value.x / plane.material.uniforms.uResolution.value.y;
                context.targetOffset.x -= delta.x * moveSpeed * context.zoom * aspect;
                context.targetOffset.y += delta.y * moveSpeed * context.zoom;
                context.previousMouse.copy(context.targetMousePos);
            }

            // --- 3. SHADER & RENDER ---

            // Update the necessary shader uniforms with the new values from this frame.
            Object.assign(plane.material.uniforms, {
                uZoom: { value: context.zoom },
                uDistortionStrength: { value: context.distortion },
                uZoomProgress: { value: context.zoomProgress },
                uTime: { value: plane.material.uniforms.uTime.value + 0.016 }, // Increment time
            });
            
            // If there's a video texture, tell Three.js it needs to be updated.
            if (context.videoTextureRef) context.videoTextureRef.needsUpdate = true;
            
            // Finally, render the scene with the updated camera and uniforms.
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isThreeInitialized, threeContext, setVideoState]);
}