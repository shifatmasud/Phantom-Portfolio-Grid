import React, { useEffect, useCallback } from "react";
import { ThreeContext } from "./types";
import { Project } from "../../../types";
import { getProjectByCellId } from "./hookUtils";

/**
 * @file Manages everything related to video playback. This includes:
 * - Creating the hidden `<video>` element and appending it to the DOM.
 * - Creating a Three.js `VideoTexture` from that element.
 * - Providing a `setVideoState` function to control which video plays.
 * - Handling the asynchronous logic of loading and playing videos.
 * - Preventing race conditions when the user hovers over cells quickly.
 */
export function useVideoManager(
    mountRef: React.RefObject<HTMLDivElement>,
    threeContext: React.MutableRefObject<ThreeContext>,
    isThreeInitialized: boolean,
    projects: Project[]
) {
    // This effect runs once to create the video element and its texture.
    useEffect(() => {
        if (!isThreeInitialized) return;

        const currentMount = mountRef.current;
        const { current: context } = threeContext;
        
        context.videoRef = document.createElement("video");
        Object.assign(context.videoRef, { loop: true, muted: true, playsInline: true, crossOrigin: "anonymous", style: "display:none" });
        currentMount?.appendChild(context.videoRef);
        
        // This special texture type links directly to the video element.
        context.videoTextureRef = new context.THREE.VideoTexture(context.videoRef);
        context.plane.material.uniforms.uActiveVideo.value = context.videoTextureRef;

        // Cleanup: remove the video element when the component unmounts.
        return () => {
            if (context.videoRef?.parentNode === currentMount) {
                currentMount?.removeChild(context.videoRef);
            }
        };
    }, [isThreeInitialized, mountRef, threeContext]);

    /**
     * The core function to control video playback based on a cell ID.
     */
    const setVideoState = useCallback(async (cellId: any) => {
        const { current: context } = threeContext;
        const { videoRef, plane } = context;
        // The "nonce" is a counter to prevent old, slow-loading videos from
        // starting to play after the user has already moved to a new cell.
        const currentNonce = ++context.videoNonce;
        if (!videoRef || !plane) return;

        const project = getProjectByCellId(cellId, projects);
        const newSrc = project?.video;

        // Always start by pausing the current video and hiding it in the shader.
        plane.material.uniforms.uIsVideoActive.value = false;
        if (!videoRef.paused) videoRef.pause();

        if (!newSrc) return; // No video for this project.
        
        try {
            // Check if a newer request has come in while this one was waiting.
            if (currentNonce !== context.videoNonce) return;

            if (videoRef.src !== newSrc) {
                videoRef.src = newSrc;
                await videoRef.load();
            }
            plane.material.uniforms.uHoveredCellId.value.copy(cellId);
            await videoRef.play();
            
            // Final check on the nonce before showing the video.
            if (currentNonce === context.videoNonce) {
                plane.material.uniforms.uIsVideoActive.value = true;
            }
        } catch (error: any) {
            // Don't log "AbortError", which happens normally when we interrupt a load.
            if (error.name !== "AbortError") console.warn("Video playback failed for", newSrc, error);
        }
    }, [threeContext, projects]);

    return { setVideoState };
}