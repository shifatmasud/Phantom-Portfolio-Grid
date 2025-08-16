import React, { useState, useCallback, useEffect } from "react";
import { Project } from "../../../types";
import { ThreeContext, InteractiveGridProps } from "./types";
import { getProjectByCellId, screenToWorld } from "./hookUtils";
import { AnimationConfig } from "../config";

/**
 * @file Manages the core user interaction logic. This includes:
 * - Handling the "zoom in" action when a user taps a cell.
 * - Handling the "unzoom" action.
 * - Navigating between adjacent projects while zoomed in (swiping).
 * - Managing the state of the currently zoomed project for the UI.
 * - Ensuring the "View Project" link is accessible.
 */
export function useInteraction(
    threeContext: React.MutableRefObject<ThreeContext>,
    setVideoState: (cellId: any) => void,
    props: InteractiveGridProps,
    linkRef: React.RefObject<HTMLAnchorElement>
) {
    const { projects } = props;
    const [zoomedProject, setZoomedProject] = useState<Project | null>(null);

    // This effect ensures that when a project is zoomed, the "View Project"
    // link becomes focusable, which is important for keyboard navigation and accessibility.
    useEffect(() => {
        if (zoomedProject && linkRef.current) {
            const timer = setTimeout(() => linkRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [zoomedProject, linkRef]);
    
    /**
     * Navigates the view to center on a specific cell ID.
     */
    const navigateToCell = useCallback((cellId: any, isInitialZoom: boolean) => {
        const { current: context } = threeContext;
        if (!context.plane) return;

        const project = getProjectByCellId(cellId, projects);
        setZoomedProject(project);
        if (setVideoState) setVideoState(cellId);

        // If this is the first zoom action, save the current camera state.
        if (isInitialZoom) {
            context.lastOffset.copy(context.targetOffset);
            context.lastZoom = context.targetZoom;
            context.targetZoom = AnimationConfig.zoomedInLevel;
            context.targetDistortion = 0.0; // Remove distortion when zoomed.
            context.isZoomed = true;
        }
        // Calculate the target position to center the new cell.
        const currentCellSize = context.plane.material.uniforms.uCellSize.value;
        context.targetOffset.copy(cellId.clone().addScalar(0.5)).multiplyScalar(currentCellSize);
        context.zoomedCellId = cellId.clone();
    }, [threeContext, projects, setVideoState]);

    /**
     * Returns the view to the last saved pre-zoom state.
     */
    const unzoom = useCallback(() => {
        const { current: context } = threeContext;
        context.targetOffset.copy(context.lastOffset);
        context.targetZoom = context.lastZoom;
        context.targetDistortion = 1.0; // Restore distortion.
        context.isZoomed = false;
        context.zoomedCellId = null;
        if (setVideoState) setVideoState(null);
        setZoomedProject(null);
    }, [threeContext, setVideoState]);

    /**
     * The main interaction handler, called when a user finishes a click/touch.
     * It determines whether the action was a tap or a swipe and acts accordingly.
     */
    const handleInteraction = useCallback((clickPos: { x: number; y: number }, delta: { length: () => number, x: number, y: number }) => {
        const { current: context } = threeContext;
        const { plane, isZoomed, zoomedCellId, THREE } = context;
        if (!plane || !THREE) return;

        const worldCoord = screenToWorld(clickPos, context);
        const currentCellSize = plane.material.uniforms.uCellSize.value;
        const tappedCellId = new THREE.Vector2(Math.floor(worldCoord.x / currentCellSize), Math.floor(worldCoord.y / currentCellSize));
        
        const isTap = delta.length() < AnimationConfig.tapThreshold;
        const isSwipe = delta.length() > AnimationConfig.swipeThreshold;

        if (isZoomed) {
            if (isTap) {
                // If tapped on the same cell, unzoom. Otherwise, navigate to the new cell.
                if (tappedCellId.equals(zoomedCellId)) unzoom();
                else navigateToCell(tappedCellId, false);
            } else if (isSwipe) {
                // If swiped, navigate to the adjacent cell in the swipe direction.
                const nextCell = zoomedCellId.clone();
                if (Math.abs(delta.x) > Math.abs(delta.y)) nextCell.x -= Math.sign(delta.x);
                else nextCell.y += Math.sign(delta.y);
                navigateToCell(nextCell, false);
            }
        } else if (isTap) {
            // If not zoomed and the user taps, zoom into that cell.
            navigateToCell(tappedCellId, true);
        }
    }, [threeContext, navigateToCell, unzoom]);

    return { zoomedProject, isZoomed: threeContext.current.isZoomed, handleInteraction };
}