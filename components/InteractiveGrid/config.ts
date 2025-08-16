/**
 * @file This is the central configuration file for the interactive grid.
 * It's the perfect place for a new developer to start experimenting.
 * Try changing some of these values and see what happens!
 */
export const AnimationConfig = {
    // --- PHYSICS & FEEL ---
    // How quickly the camera pans to its target. Lower is "springier".
    springStiffness: 0.05,
    // How much drag is applied to the camera movement. 0 is no drag, 1 is full stop.
    damping: 0.75,
    // How quickly values like zoom and distortion animate. Lower is slower.
    lerpFactor: 0.1,
    // How fast the grid pans when you scroll with a mouse wheel.
    scrollSpeed: 0.001,
    
    // --- INTERACTION ---
    // How far (in pixels) you need to move your mouse/finger to register a "swipe".
    swipeThreshold: 50,
    // How far (in pixels) you can move before a "click" is no longer considered a "tap".
    tapThreshold: 10,

    // --- ZOOM ---
    // The zoom level when focused on a single project. Closer to 0 is more zoomed in.
    zoomedInLevel: 0.3,
    // The default zoom level of the grid.
    defaultZoomLevel: 1.0,

    // --- INITIAL STATE ---
    // The initial state for various animation properties.
    initialState: {
        isDragging: false, 
        isZoomed: false, 
        zoom: 1.0, 
        targetZoom: 1.0,
        distortion: 1.0, 
        targetDistortion: 1.0, 
        zoomProgress: 0.0,
        lastZoom: 1.0, 
        videoNonce: 0, 
        hoveredCellId: null, 
        zoomedCellId: null,
    },
};

export const StyleConfig = {
    // --- TEXTURE GENERATION ---
    // The resolution of the generated text textures. Higher is sharper but uses more memory.
    textTextureWidth: 2048,
    textTextureHeight: 256,
    // The resolution of the generated image atlas textures.
    imageAtlasTextureSize: 512,
    // The font size for the project titles and years on the textures.
    textureFontSize: 80,
};
