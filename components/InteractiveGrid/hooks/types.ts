import { Project } from "../../../types";

export interface InteractiveGridProps {
    className?: string;
    projects: Project[];
    fontFamily: string;
    fontWeight: string | number;
    backgroundColor: string;
    borderColor: string;
    hoverColor: string;
    textColor: string;
    cellSize: number;
    distortionStrength: number;
    disableMobileHover: boolean;
    optimizeMobile: boolean;
}

/**
 * A mutable ref object to hold all Three.js related instances and state.
 * This is the "brain" of the animation, passed between all the hooks.
 * Using a ref allows us to modify these values without causing React re-renders.
 */
export interface ThreeContext {
    // Core Three.js objects
    THREE?: any;
    scene?: any;
    camera?: any;
    renderer?: any;
    plane?: any; // This is the main plane mesh with our shader material
    
    // Media elements
    videoRef?: HTMLVideoElement;
    videoTextureRef?: any;
    
    // --- STATE ---

    // Interaction state
    isDragging: boolean;    // Is the user currently pressing and dragging?
    isZoomed: boolean;      // Is the view zoomed in on a cell?
    previousMouse: any;     // The mouse position from the previous frame (for calculating delta)
    clickStart: any;        // The screen position where a click/touch started
    
    // Animation & Physics state (current and target values for smooth interpolation)
    offset: any;            // The current camera pan offset
    targetOffset: any;      // The target camera pan offset
    offsetVelocity: any;    // The velocity of the camera pan for spring physics
    mousePos: any;          // The current smoothed mouse position
    targetMousePos: any;    // The actual raw mouse position
    zoom: number;           // The current zoom level
    targetZoom: number;     // The target zoom level
    distortion: number;     // The current barrel distortion strength
    targetDistortion: number; // The target barrel distortion strength
    zoomProgress: number;   // A 0-1 value representing the zoom animation progress

    // Zoom history (to remember where to return to after unzooming)
    lastOffset: any;
    lastZoom: number;

    // Cell state
    videoNonce: number;     // A counter to prevent race conditions with video loading
    hoveredCellId: any | null; // The ID of the cell currently being hovered over
    zoomedCellId: any | null;  // The ID of the cell currently zoomed in on
}