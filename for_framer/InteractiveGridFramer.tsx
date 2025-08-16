import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    CSSProperties,
} from "react";
import { addPropertyControls, ControlType } from "framer";

// --- TYPE DEFINITIONS ---
// This interface defines the data structure for a single project.
interface Project {
    title: string;
    image: string;
    year: number;
    href: string;
    video?: string;
}

// This interface defines the props for our main InteractiveGrid component.
interface InteractiveGridProps {
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
    style: CSSProperties;
    // New performance and interaction controls
    enableMotionBlur: boolean;
    enableDistortion: boolean;
    enableRippleEffect: boolean;
    enableSwipe: boolean;
    imageSize: number;
}

// --- CONFIGURATION ---
// Centralized configuration for easy tweaking of physics, animation, and styling.

const AnimationConfig = {
    springStiffness: 0.05, damping: 0.75, lerpFactor: 0.1,
    scrollSpeed: 0.001, swipeThreshold: 50, tapThreshold: 10,
    zoomedInLevel: 0.3, defaultZoomLevel: 1.0,
};

const StyleConfig = {
    textTextureWidth: 2048, textTextureHeight: 256,
    imageAtlasTextureSize: 512, textureFontSize: 80,
};


// --- SHADER CODE (GLSL) ---
// Shaders are small programs that run on the GPU for high-performance graphics.

// The vertex shader positions the vertices of our 2D plane. It's simple.
const vertexShader = `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The fragment shader calculates the color of each pixel on the plane. This is where the magic happens.
const fragmentShader = `
  #define PI 3.1415926535
  uniform vec2 uOffset;
  uniform vec2 uResolution;
  uniform vec4 uBorderColor;
  uniform vec4 uHoverColor;
  uniform vec4 uBackgroundColor;
  uniform vec2 uMousePos;
  uniform float uZoom;
  uniform float uCellSize;
  uniform float uTextureCount;
  uniform sampler2D uImageAtlas;
  uniform sampler2D uTextAtlas;
  uniform float uDistortionStrength;
  uniform sampler2D uActiveVideo;
  uniform vec2 uHoveredCellId;
  uniform bool uIsVideoActive;
  uniform float uZoomProgress;
  uniform float uTime;
  uniform bool uIsMobile;
  uniform bool uHoverEnabled;
  uniform bool uOptimizeMobile;
  
  // New uniforms for performance controls
  uniform bool uMotionBlurEnabled;
  uniform bool uRippleEnabled;
  uniform float uImageSize;

  in vec2 vUv;

  vec4 getSceneColor(vec2 uv, float effectIntensity) {
      vec2 screenUV = (uv - 0.5) * 2.0;
      float radius = length(screenUV);
      float distortion = 1.0 - uDistortionStrength * 0.08 * radius * radius;
      vec2 distortedUV = screenUV * distortion;
      vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 worldCoord = distortedUV * aspectRatio;
      worldCoord *= uZoom;
      worldCoord += uOffset;
      
      vec2 mouseScreenUV = (uMousePos / uResolution) * 2.0 - 1.0;
      mouseScreenUV.y = -mouseScreenUV.y;
      vec2 mouseWorldCoord = (mouseScreenUV * aspectRatio) * uZoom + uOffset;

      if (uRippleEnabled && !uOptimizeMobile) {
        float distToMouseRipple = length(mouseWorldCoord - worldCoord);
        float rippleFalloff = smoothstep(uCellSize * 1.5, 0.0, distToMouseRipple);
        float ripple = sin(distToMouseRipple * 12.0 - uTime * 3.0) * rippleFalloff * 0.002;
        worldCoord.xy += ripple;
      }

      vec2 cellPos = worldCoord / uCellSize;
      vec2 cellId = floor(cellPos);
      vec2 cellUV = fract(cellPos);

      float distToMouseHover = length(mouseWorldCoord - (cellId + 0.5) * uCellSize);
      float hoverRadius = uCellSize * 1.5;
      float hoverIntensity = pow(smoothstep(hoverRadius, 0.0, distToMouseHover), 2.0);
      
      bool isHovered = uHoverEnabled && hoverIntensity > 0.0 && uMousePos.x > 0.0;

      vec3 backgroundColor = uBackgroundColor.rgb;
      if (isHovered) {
        backgroundColor = mix(uBackgroundColor.rgb, uHoverColor.rgb, hoverIntensity * uHoverColor.a);
      }

      float lineWidth = 0.005;
      float gridMask = smoothstep(0.0, lineWidth, cellUV.x) * smoothstep(1.0, 1.0 - lineWidth, cellUV.x) *
                       smoothstep(0.0, lineWidth, cellUV.y) * smoothstep(1.0, 1.0 - lineWidth, cellUV.y);

      float hoverScale = 1.0 + hoverIntensity * 0.05;
      vec2 imageUV = (cellUV - (1.0 - uImageSize * hoverScale) * 0.5) / (uImageSize * hoverScale);
      float imageAlpha = smoothstep(0.0, 0.01, imageUV.x) * smoothstep(1.0, 0.99, imageUV.x) *
                           smoothstep(0.0, 0.01, imageUV.y) * smoothstep(1.0, 0.99, imageUV.y);
      
      float texIndex = mod(floor(cellId.x) + floor(cellId.y) * 3.0, uTextureCount);
      vec3 color = backgroundColor;

      if (imageAlpha > 0.0) {
        vec3 imageColor;
        bool isHoveredCell = uIsVideoActive && cellId.x == uHoveredCellId.x && cellId.y == uHoveredCellId.y;

        if (isHoveredCell) {
            imageColor = texture(uActiveVideo, imageUV).rgb;
        } else {
            float atlasSize = ceil(sqrt(uTextureCount));
            vec2 atlasUV = (vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize)) + imageUV) / atlasSize;
            
            float caOffset = uOptimizeMobile ? 0.0 : effectIntensity * 0.01;
            float r = texture(uImageAtlas, atlasUV + vec2(caOffset, 0.0)).r;
            float g = texture(uImageAtlas, atlasUV).g;
            float b = texture(uImageAtlas, atlasUV - vec2(caOffset, 0.0)).b;
            imageColor = vec3(r, g, b);
        }
        color = mix(color, imageColor, imageAlpha);
      }

      float textHeight = 0.08;
      if (cellUV.x > 0.05 && cellUV.x < 0.95 && cellUV.y > 0.05 && cellUV.y < 0.05 + textHeight) {
        vec2 textUV = vec2((cellUV.x - 0.05) / 0.9, (cellUV.y - 0.05) / textHeight);
        
        float atlasSize = ceil(sqrt(uTextureCount));
        vec2 atlasUV = (vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize)) + textUV) / atlasSize;
        vec4 textColor = texture(uTextAtlas, atlasUV);
        color = mix(color, mix(textColor.rgb, vec3(1.0), hoverIntensity * 0.5), textColor.a);
      }

      color = mix(color, uBorderColor.rgb, (1.0 - gridMask) * uBorderColor.a);

      return vec4(color * (1.0 - smoothstep(1.2, 1.8, radius)), 1.0);
  }

  void main() {
    float effectIntensity = sin(uZoomProgress * PI);
    vec4 finalColor;

    if (uMotionBlurEnabled && effectIntensity > 0.01 && !uOptimizeMobile) {
      vec2 blurVector = normalize(vUv - 0.5) * effectIntensity * 0.03;
      finalColor = vec4(0.0);
      const int SAMPLES = 6;
      for (int i = 0; i < SAMPLES; i++) {
          finalColor += getSceneColor(vUv - blurVector * (float(i) / float(SAMPLES - 1)), effectIntensity);
      }
      finalColor /= float(SAMPLES);
    } else {
      finalColor = getSceneColor(vUv, 0.0);
    }

    gl_FragColor = finalColor;
  }
`;

// --- HELPER FUNCTIONS ---
// These functions are pure and live outside the component for better organization.

const parseColorToVec4 = (colorString: string, THREE: any) => {
    const rgbaMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10) / 255;
        const g = parseInt(rgbaMatch[2], 10) / 255;
        const b = parseInt(rgbaMatch[3], 10) / 255;
        const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0;
        return new THREE.Vector4(r, g, b, a);
    }
    const color = new THREE.Color(colorString);
    return new THREE.Vector4(color.r, color.g, color.b, 1.0);
};

// --- MAIN REACT COMPONENT ---
export default function InteractiveGridFramer(props: InteractiveGridProps) {
    // --- REFS ---
    // Refs are used to hold mutable values that don't trigger re-renders.
    
    // This ref holds a reference to the main div element, which will contain our Three.js canvas.
    const mountRef = useRef<HTMLDivElement>(null);
    // This ref holds a reference to the "View Project" link element.
    const linkRef = useRef<HTMLAnchorElement>(null);
    // This is the most important ref. It holds all the mutable state for our Three.js scene (objects, positions, etc.).
    const threeContext = useRef<any>({}).current;

    // --- STATE ---
    // State is for data that, when changed, should cause the component to re-render.

    // This state tracks whether the Three.js scene has been successfully initialized.
    const [isThreeInitialized, setIsThreeInitialized] = useState(false);
    // This state holds the currently zoomed-in project's data to display in the UI.
    const [zoomedProject, setZoomedProject] = useState<Project | null>(null);
    // This state controls the mouse cursor's appearance (e.g., 'grab' vs. 'grabbing').
    const [cursor, setCursor] = useState("grab");
    
    // Destructure props for easier access.
    const { projects, fontFamily, fontWeight, textColor, style } = props;

    // --- EFFECT: DYNAMICALLY LOAD THREE.JS AND INITIALIZE SCENE ---
    // This useEffect runs only once to handle the entire setup process.
    // It ensures Three.js is loaded before attempting to create a WebGL scene.
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        // This function contains all the Three.js scene setup logic.
        // It's called only after we've confirmed that the THREE library is available.
        const initThree = (THREE: any) => {
            // Initialize the threeContext object with all necessary properties.
            threeContext.THREE = THREE;
            const isMobile = "ontouchstart" in window;
            Object.assign(threeContext, {
                isDragging: false, isZoomed: false, previousMouse: new THREE.Vector2(), clickStart: new THREE.Vector2(),
                offset: new THREE.Vector2(), targetOffset: new THREE.Vector2(), offsetVelocity: new THREE.Vector2(),
                mousePos: new THREE.Vector2(-1, -1), targetMousePos: new THREE.Vector2(-1, -1),
                zoom: 1.0, targetZoom: 1.0, distortion: 1.0, targetDistortion: 1.0, zoomProgress: 0.0,
                lastOffset: new THREE.Vector2(), lastZoom: 1.0, videoNonce: 0, hoveredCellId: null, zoomedCellId: null,
            });

            // Create the core Three.js components: scene, camera, and renderer.
            threeContext.scene = new THREE.Scene();
            threeContext.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            threeContext.camera.position.z = 1;
            threeContext.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            threeContext.renderer.setClearColor(0x000000, 0);
            threeContext.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            threeContext.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
            currentMount.appendChild(threeContext.renderer.domElement);

            // Create the video element and texture for hover previews.
            threeContext.videoRef = document.createElement("video");
            Object.assign(threeContext.videoRef, { loop: true, muted: true, playsInline: true, crossOrigin: "anonymous", style: "display:none" });
            currentMount.appendChild(threeContext.videoRef);
            threeContext.videoTextureRef = new THREE.VideoTexture(threeContext.videoRef);

            // Define the shader uniforms (variables passed from JS to the GLSL shader).
            const uniforms = {
                uOffset: { value: threeContext.offset }, uResolution: { value: new THREE.Vector2() },
                uBorderColor: { value: new THREE.Vector4() }, uHoverColor: { value: new THREE.Vector4() },
                uBackgroundColor: { value: new THREE.Vector4() }, uMousePos: { value: threeContext.mousePos },
                uZoom: { value: 1.0 }, uDistortionStrength: { value: 1.0 }, uCellSize: { value: 0.75 },
                uTextureCount: { value: 0 }, uImageAtlas: { value: null }, uTextAtlas: { value: null },
                uActiveVideo: { value: threeContext.videoTextureRef }, uHoveredCellId: { value: new THREE.Vector2(-999, -999) },
                uIsVideoActive: { value: false }, uZoomProgress: { value: 0.0 }, uTime: { value: 0.0 },
                uIsMobile: { value: isMobile }, uHoverEnabled: { value: true }, uOptimizeMobile: { value: true },
                uMotionBlurEnabled: { value: true }, uRippleEnabled: { value: true }, uImageSize: { value: 0.6 },
            };

            // Create a plane that fills the screen and apply our custom shader material to it.
            threeContext.plane = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true })
            );
            threeContext.scene.add(threeContext.plane);

            // Signal that initialization is complete so other effects can run.
            setIsThreeInitialized(true);
        };

        // --- Script Loading Logic ---
        let script: HTMLScriptElement | null = null;
        if ((window as any).THREE) {
            // If THREE is already on the window, initialize immediately.
            initThree((window as any).THREE);
        } else {
            // Otherwise, create a script tag to load it from the CDN.
            script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
            script.async = true;
            
            // When the script finishes loading, call our initialization function.
            script.onload = () => {
                if ((window as any).THREE) {
                    initThree((window as any).THREE);
                } else {
                    console.error("THREE.js failed to load from CDN, even though the script onload event fired.");
                }
            };
            script.onerror = () => {
                console.error("Error loading the THREE.js script from CDN.");
            };
            
            // Add the script to the document head to begin loading.
            document.head.appendChild(script);
        }

        // Cleanup function: runs when the component unmounts.
        return () => {
            // Clean up Three.js resources
            if (threeContext.renderer?.domElement.parentNode === currentMount) {
                currentMount.removeChild(threeContext.renderer.domElement);
            }
            if (threeContext.videoRef?.parentNode === currentMount) {
                currentMount.removeChild(threeContext.videoRef);
            }
            // Clean up the script tag if it was added.
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []); // Empty dependency array means this effect runs only once on mount.

    // --- EFFECT: UPDATE SHADER UNIFORMS & ANIMATION STATE FROM PROPS ---
    useEffect(() => {
        if (isThreeInitialized) {
            const { plane, THREE } = threeContext;
            const { uBorderColor, uHoverColor, uBackgroundColor, uCellSize, uDistortionStrength, uHoverEnabled, uOptimizeMobile } = plane.material.uniforms;
            const { 
                backgroundColor, borderColor, hoverColor, cellSize, distortionStrength, 
                disableMobileHover, optimizeMobile, enableMotionBlur, enableDistortion, 
                enableRippleEffect, imageSize 
            } = props;
            
            uBackgroundColor.value.copy(parseColorToVec4(backgroundColor, THREE));
            uBorderColor.value.copy(parseColorToVec4(borderColor, THREE));
            uHoverColor.value.copy(parseColorToVec4(hoverColor, THREE));
            uCellSize.value = cellSize;
            
            // Update distortion strength based on the Framer toggle.
            uDistortionStrength.value = enableDistortion ? distortionStrength : 0;
            
            const isMobile = "ontouchstart" in window;
            uHoverEnabled.value = !(isMobile && disableMobileHover);
            uOptimizeMobile.value = isMobile && optimizeMobile;

            // Update new performance uniforms from Framer props.
            plane.material.uniforms.uMotionBlurEnabled.value = enableMotionBlur;
            plane.material.uniforms.uRippleEnabled.value = enableRippleEffect;
            plane.material.uniforms.uImageSize.value = imageSize;

            // Update the target distortion for JS animations to respect the toggle.
            if (!threeContext.isZoomed) {
                threeContext.targetDistortion = enableDistortion ? 1.0 : 0.0;
            }
        }
    }, [isThreeInitialized, props, threeContext]);


    // --- EFFECT: LOAD TEXTURES ---
    // This effect is responsible for loading images and creating text textures.
    useEffect(() => {
        if (!isThreeInitialized || !projects || projects.length === 0) return;

        const { THREE, plane } = threeContext;

        // This async function orchestrates the texture loading process.
        const updateData = async () => {
            // Helper function to create a texture from text using a 2D canvas.
            const createTextTexture = (p: Project) => {
                const canvas = document.createElement("canvas");
                canvas.width = StyleConfig.textTextureWidth; canvas.height = StyleConfig.textTextureHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return new THREE.CanvasTexture(canvas);
                ctx.font = `${fontWeight} ${StyleConfig.textureFontSize}px "${fontFamily}"`;
                ctx.fillStyle = textColor;
                ctx.textBaseline = "middle";
                ctx.fillText(p.title.toUpperCase(), 30, StyleConfig.textTextureHeight / 2);
                ctx.textAlign = "right";
                ctx.fillText(p.year.toString(), StyleConfig.textTextureWidth - 30, StyleConfig.textTextureHeight / 2);
                return new THREE.CanvasTexture(canvas);
            };

            // Helper function to combine multiple small textures into one large "atlas" for performance.
            const createTextureAtlas = (textures: any[], isText: boolean) => {
                const atlasGridSize = Math.ceil(Math.sqrt(textures.length));
                const textureSize = isText ? StyleConfig.textTextureHeight : StyleConfig.imageAtlasTextureSize;
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = atlasGridSize * textureSize;
                const ctx = canvas.getContext("2d");
                if (!ctx) return new THREE.CanvasTexture(canvas);
                textures.forEach((texture, index) => {
                    if (texture.image) {
                        ctx.drawImage(texture.image, (index % atlasGridSize) * textureSize, Math.floor(index / atlasGridSize) * textureSize, textureSize, textureSize);
                    }
                });
                const atlasTexture = new THREE.CanvasTexture(canvas);
                atlasTexture.minFilter = THREE.LinearFilter;
                atlasTexture.magFilter = THREE.LinearFilter;
                return atlasTexture;
            };
            
             // Helper to create a placeholder if an image fails to load.
            const createPlaceholderTexture = () => {
                const canvas = document.createElement("canvas");
                const size = StyleConfig.imageAtlasTextureSize;
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (!ctx) return new THREE.CanvasTexture(canvas);
                ctx.fillStyle = "#222"; ctx.fillRect(0, 0, size, size);
                ctx.fillStyle = "#555"; ctx.font = `bold ${size / 10}px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText("Load Error", size / 2, size / 2);
                return new THREE.CanvasTexture(canvas);
            };

            // Load all project images asynchronously.
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin("");
            const texturePromises = projects.map(p => textureLoader.loadAsync(p.image).catch(() => createPlaceholderTexture()));
            const imageTextures = await Promise.all(texturePromises);
            const textTextures = projects.map(createTextTexture);

            // Create the atlases.
            const imageAtlas = createTextureAtlas(imageTextures, false);
            const textAtlas = createTextureAtlas(textTextures, true);

            // Update the shader uniforms with the new atlases.
            const { uniforms } = plane.material;
            if (uniforms.uImageAtlas.value) uniforms.uImageAtlas.value.dispose();
            if (uniforms.uTextAtlas.value) uniforms.uTextAtlas.value.dispose();
            uniforms.uImageAtlas.value = imageAtlas;
            uniforms.uTextAtlas.value = textAtlas;
            uniforms.uTextureCount.value = projects.length;
        };

        updateData();
    }, [isThreeInitialized, projects, fontFamily, fontWeight, textColor, threeContext]);

    // --- INTERACTION LOGIC (CALLBACKS) ---
    // useCallback is used to memoize functions so they aren't recreated on every render.

    // This function converts screen pixel coordinates to the shader's world coordinates.
    // It intentionally ignores distortion for picking calculations to provide a more stable and intuitive click target.
    const screenToWorld = useCallback((coords: { x: number; y: number }) => {
        const { plane, zoom, offset, THREE } = threeContext;
        if (!plane) return new THREE.Vector2();
        
        // Use the resolution (the actual size of the canvas) for normalization.
        const res = plane.material.uniforms.uResolution.value;

        // 1. Normalize pixel coordinates (from 0,0 -> width,height) to Normalized Device Coordinates (-1 to +1).
        const ndc = new THREE.Vector2((coords.x / res.x) * 2 - 1, -(coords.y / res.y) * 2 + 1);

        // 2. Account for screen aspect ratio, current zoom, and camera pan to get final world coordinates.
        const aspect = new THREE.Vector2(res.x / res.y, 1.0);
        return ndc.multiply(aspect).multiplyScalar(zoom).add(offset);
    }, [threeContext]);

    // This function controls video playback for the hovered/zoomed cell.
    const setVideoState = useCallback(async (cellId: any) => {
        const { videoRef, plane } = threeContext;
        const currentNonce = ++threeContext.videoNonce;
        if (!videoRef || !plane) return;

        // Find the project corresponding to the cell ID using wrapping (modulo) logic.
        const getProject = (id: any) => id ? projects[(((Math.floor(id.x) + Math.floor(id.y) * 3) % projects.length) + projects.length) % projects.length] : null;
        const project = getProject(cellId);
        const newSrc = project?.video;

        plane.material.uniforms.uIsVideoActive.value = false;
        if (!videoRef.paused) videoRef.pause();
        if (!newSrc) return;

        try {
             // Nonce check prevents race conditions from fast mouse movements.
            if (currentNonce !== threeContext.videoNonce) return;
            if (videoRef.src !== newSrc) { videoRef.src = newSrc; await videoRef.load(); }
            plane.material.uniforms.uHoveredCellId.value.copy(cellId);
            await videoRef.play();
            if (currentNonce === threeContext.videoNonce) plane.material.uniforms.uIsVideoActive.value = true;
        } catch (error: any) {
            if (error.name !== "AbortError") console.warn("Video playback failed", error);
        }
    }, [threeContext, projects]);
    
    // This function zooms the view out to the previous state.
    const unzoom = useCallback(() => {
        threeContext.targetOffset.copy(threeContext.lastOffset);
        threeContext.targetZoom = threeContext.lastZoom;
        threeContext.targetDistortion = props.enableDistortion ? 1.0 : 0.0;
        threeContext.isZoomed = false;
        threeContext.zoomedCellId = null;
        setVideoState(null);
        setZoomedProject(null);
    }, [threeContext, setVideoState, props.enableDistortion]);
    
    // This function navigates the view to center on a specific cell.
    const navigateToCell = useCallback((cellId: any, isInitialZoom: boolean) => {
        const getProject = (id: any) => id ? projects[(((Math.floor(id.x) + Math.floor(id.y) * 3) % projects.length) + projects.length) % projects.length] : null;
        const project = getProject(cellId);
        setZoomedProject(project);
        setVideoState(cellId);

        if (isInitialZoom) {
            threeContext.lastOffset.copy(threeContext.targetOffset);
            threeContext.lastZoom = threeContext.targetZoom;
            threeContext.targetZoom = AnimationConfig.zoomedInLevel;
            threeContext.targetDistortion = 0.0; // Always remove distortion when zoomed in.
            threeContext.isZoomed = true;
        }
        const currentCellSize = threeContext.plane.material.uniforms.uCellSize.value;
        // Pan the camera to the center of the target cell.
        threeContext.targetOffset.copy(cellId.clone().addScalar(0.5)).multiplyScalar(currentCellSize);
        threeContext.zoomedCellId = cellId.clone();
    }, [threeContext, projects, setVideoState]);

    // Focuses the "View Project" link when zoomed in, for accessibility.
    useEffect(() => {
        if (zoomedProject && linkRef.current) {
            const timer = setTimeout(() => linkRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [zoomedProject]);


    // --- EFFECT: ANIMATION LOOP ---
    // This is the heartbeat of the application. It runs on every frame to update and render the scene.
    useEffect(() => {
        if (!isThreeInitialized) return;

        let animationFrameId: number;
        const { plane, renderer, scene, camera, THREE } = threeContext;
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Animate camera offset with spring physics for a natural feel.
            const force = threeContext.targetOffset.clone().sub(threeContext.offset).multiplyScalar(AnimationConfig.springStiffness);
            threeContext.offsetVelocity.add(force).multiplyScalar(AnimationConfig.damping);
            threeContext.offset.add(threeContext.offsetVelocity);

            // Animate (lerp) other values towards their targets for smoothness.
            threeContext.mousePos.lerp(threeContext.targetMousePos, AnimationConfig.lerpFactor);
            threeContext.zoom += (threeContext.targetZoom - threeContext.zoom) * AnimationConfig.lerpFactor;
            threeContext.distortion += (threeContext.targetDistortion - threeContext.distortion) * AnimationConfig.lerpFactor;
            threeContext.zoomProgress += ((threeContext.isZoomed ? 1 : 0) - threeContext.zoomProgress) * AnimationConfig.lerpFactor;

            // Detect which cell is being hovered over.
            if (!threeContext.isZoomed) {
                const worldCoord = screenToWorld(threeContext.targetMousePos);
                const currentCellSize = plane.material.uniforms.uCellSize.value;
                const currentCellId = new THREE.Vector2(Math.floor(worldCoord.x / currentCellSize), Math.floor(worldCoord.y / currentCellSize));
                if (!threeContext.hoveredCellId || !currentCellId.equals(threeContext.hoveredCellId)) {
                    threeContext.hoveredCellId = currentCellId.clone();
                    setVideoState(currentCellId);
                }
            }

            // Handle panning when the user is dragging.
            if (threeContext.isDragging && !threeContext.isZoomed && plane.material.uniforms.uResolution.value.y > 0) {
                const delta = threeContext.targetMousePos.clone().sub(threeContext.previousMouse);
                const moveSpeed = 2.0 / plane.material.uniforms.uResolution.value.y;
                const aspect = plane.material.uniforms.uResolution.value.x / plane.material.uniforms.uResolution.value.y;
                threeContext.targetOffset.x -= delta.x * moveSpeed * threeContext.zoom * aspect;
                threeContext.targetOffset.y += delta.y * moveSpeed * threeContext.zoom;
                threeContext.previousMouse.copy(threeContext.targetMousePos);
            }

            // Update shader uniforms with the new values for this frame.
            plane.material.uniforms.uZoom.value = threeContext.zoom;
            plane.material.uniforms.uDistortionStrength.value = threeContext.distortion;
            plane.material.uniforms.uZoomProgress.value = threeContext.zoomProgress;
            plane.material.uniforms.uTime.value += 0.016;
            if (threeContext.videoTextureRef) threeContext.videoTextureRef.needsUpdate = true;

            // Render the final scene.
            renderer.render(scene, camera);
        };

        animate(); // Start the loop.
        
        // Cleanup function: Stop the loop when the component unmounts.
        return () => cancelAnimationFrame(animationFrameId);
    }, [isThreeInitialized, threeContext, screenToWorld, setVideoState]);

    // --- EVENT HANDLERS ---
    // These callbacks handle raw user input from the DOM.

    const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!threeContext.renderer) return;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        threeContext.isDragging = true;
        setCursor("grabbing");
        // *** FIX: Use coordinates relative to the component, not the viewport.
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        threeContext.previousMouse.set(x, y);
        threeContext.clickStart.set(x, y);
    }, [threeContext]);

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!threeContext.renderer) return;
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        
        // *** FIX: Use coordinates relative to the component for accuracy.
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickEnd = new threeContext.THREE.Vector2(x, y);

        const delta = clickEnd.clone().sub(threeContext.clickStart);

        const worldCoord = screenToWorld({x, y});
        const currentCellSize = threeContext.plane.material.uniforms.uCellSize.value;
        const tappedCellId = new threeContext.THREE.Vector2(
            Math.floor(worldCoord.x / currentCellSize),
            Math.floor(worldCoord.y / currentCellSize)
        );

        const isTap = delta.length() < AnimationConfig.tapThreshold;
        const isSwipe = delta.length() > AnimationConfig.swipeThreshold;

        if (threeContext.isZoomed) {
            if (isTap) {
                // If the same cell is tapped, unzoom. Otherwise, navigate to the newly tapped cell.
                if (tappedCellId.equals(threeContext.zoomedCellId)) unzoom();
                else navigateToCell(tappedCellId, false);
            } else if (isSwipe && props.enableSwipe) {
                // If swiped (and enabled), navigate to the adjacent cell.
                const nextCell = threeContext.zoomedCellId.clone();
                if (Math.abs(delta.x) > Math.abs(delta.y)) nextCell.x -= Math.sign(delta.x);
                else nextCell.y += Math.sign(delta.y);
                navigateToCell(nextCell, false);
            }
        } else if (isTap) {
            // If not zoomed, a tap will zoom into the selected cell.
            navigateToCell(tappedCellId, true);
        }

        threeContext.isDragging = false;
        setCursor("grab");
    }, [threeContext, screenToWorld, navigateToCell, unzoom, props.enableSwipe]);

    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!threeContext.renderer) return;
        // *** FIX: Use coordinates relative to the component.
        const rect = event.currentTarget.getBoundingClientRect();
        threeContext.targetMousePos.set(event.clientX - rect.left, event.clientY - rect.top);
    }, [threeContext]);

    const onPointerLeave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        // Only trigger the 'up' event if the user was actively dragging.
        if (threeContext.isDragging) {
            onPointerUp(event);
        }
    }, [threeContext, onPointerUp]);


    const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (!threeContext.renderer || threeContext.isZoomed) return;
        event.preventDefault();
        const { plane, zoom, targetOffset } = threeContext;
        const aspectRatio = plane.material.uniforms.uResolution.value.x / plane.material.uniforms.uResolution.value.y;
        let { deltaX, deltaY } = event;
        // Normalize scroll values across different browsers/devices
        if (event.deltaMode === 1) { deltaX *= 18; deltaY *= 18; }
        else if (event.deltaMode === 2) { deltaX *= window.innerWidth; deltaY *= window.innerHeight; }
        targetOffset.x += deltaX * AnimationConfig.scrollSpeed * zoom * aspectRatio;
        targetOffset.y -= deltaY * AnimationConfig.scrollSpeed * zoom;
    }, [threeContext]);


    // --- EFFECT: RESIZE OBSERVER ---
    // This effect ensures the WebGL canvas stays perfectly sized, even if the window is resized.
    useEffect(() => {
        if (!isThreeInitialized) return;
        const currentMount = mountRef.current;
        const onResize = () => {
            if (!threeContext.renderer || !threeContext.plane || !currentMount) return;
            threeContext.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            threeContext.plane.material.uniforms.uResolution.value.set(currentMount.clientWidth, currentMount.clientHeight);
        };
        const resizeObserver = new ResizeObserver(onResize);
        if (currentMount) {
            resizeObserver.observe(currentMount);
            onResize();
        }
        return () => { if (currentMount) resizeObserver.unobserve(currentMount); };
    }, [isThreeInitialized, threeContext]);


    // --- RENDER ---
    // This is the JSX that gets rendered to the DOM.
    return (
        <div
            ref={mountRef}
            style={{
                ...style,
                // *** FIX: Ensure the component fills its container and pins correctly.
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                cursor,
                touchAction: "none",
                overflow: "hidden",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onWheel={onWheel}
        >
            <a
                ref={linkRef}
                href={zoomedProject?.href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={zoomedProject ? 0 : -1}
                aria-label={`View details for ${zoomedProject?.title}`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                style={{
                    position: "absolute",
                    bottom: "3rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "white",
                    fontFamily: props.fontFamily,
                    fontSize: "1.125rem",
                    textDecoration: "none",
                    transition: "opacity 500ms ease-in-out",
                    opacity: threeContext.isZoomed && zoomedProject ? 1 : 0,
                    pointerEvents: threeContext.isZoomed && zoomedProject ? "auto" : "none",
                    zIndex: 10,
                }}
            >
                <span style={{ position: "relative", padding: "0.25rem 0.5rem" }}>
                    View Project
                    <span
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            width: "100%",
                            height: "1px",
                            backgroundColor: "white",
                            transformOrigin: "left",
                            transition: "transform 700ms ease-out 0.3s",
                            transform: threeContext.isZoomed ? "scaleX(1)" : "scaleX(0)",
                        }}
                    ></span>
                </span>
            </a>
        </div>
    );
}

// --- FRAMER PROPERTY CONTROLS ---
// This allows you to edit the component's props directly in the Framer UI.
addPropertyControls(InteractiveGridFramer, {
    projects: {
        title: "Projects",
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                title: { type: ControlType.String, defaultValue: "Project" },
                image: { type: ControlType.Image },
                year: { type: ControlType.Number, defaultValue: 2024 },
                href: { type: ControlType.String, defaultValue: "#" },
                video: { type: ControlType.File, allowedFileTypes: ["mp4", "webm"] },
            },
        },
    },
    // Styling
    fontFamily: { type: ControlType.String, defaultValue: "IBM Plex Mono, monospace", title: "Font Family" },
    fontWeight: { type: ControlType.String, defaultValue: "bold", title: "Font Weight" },
    backgroundColor: { type: ControlType.Color, defaultValue: "#0a0a0a", title: "Background" },
    borderColor: { type: ControlType.String, defaultValue: "rgba(30, 30, 30, 0.5)", title: "Border" },
    hoverColor: { type: ControlType.String, defaultValue: "rgba(255, 255, 255, 0.05)", title: "Hover" },
    textColor: { type: ControlType.Color, defaultValue: "#808080", title: "Text" },
    // Behavior
    cellSize: { type: ControlType.Number, defaultValue: 0.75, min: 0.1, max: 2, step: 0.05, title: "Cell Size" },
    distortionStrength: { 
        type: ControlType.Number, 
        defaultValue: 1.0, 
        min: 0, 
        max: 2, 
        step: 0.1, 
        title: "Distortion Strength",
        hidden: (props) => !props.enableDistortion,
    },
    // Performance & Effects
    enableDistortion: { type: ControlType.Boolean, defaultValue: true, title: "Enable Distortion" },
    enableMotionBlur: { type: ControlType.Boolean, defaultValue: true, title: "Enable Motion Blur" },
    enableRippleEffect: { type: ControlType.Boolean, defaultValue: true, title: "Enable Ripple Effect" },
    enableSwipe: { type: ControlType.Boolean, defaultValue: true, title: "Enable Swipe Nav" },
    imageSize: { type: ControlType.Number, defaultValue: 0.6, min: 0.1, max: 1.0, step: 0.05, title: "Image Size" },
    // Mobile Optimizations
    disableMobileHover: { type: ControlType.Boolean, defaultValue: false, title: "Disable Mobile Hover" },
    optimizeMobile: { type: ControlType.Boolean, defaultValue: true, title: "Optimize Mobile" },
});


// Set default props for the component when used in a Framer canvas.
InteractiveGridFramer.defaultProps = {
    style: { width: "100%", height: "100%" },
    projects: [
        { title: "Motion Study", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg", year: 2024, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
        { title: "Idle Form", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg", year: 2023, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4" },
        { title: "Blur Signal", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg", year: 2024, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
        { title: "Data Weave", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg", year: 2022, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
        { title: "Future Echo", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg", year: 2023, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
        { title: "Kinetic UI", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg", year: 2024, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
        { title: "Glass Shift", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg", year: 2023, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
        { title: "Quantum Leap", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg", year: 2024, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
        { title: "Chroma Flow", image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg", year: 2022, href: "#", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    ],
    enableMotionBlur: true,
    enableDistortion: true,
    enableRippleEffect: true,
    enableSwipe: true,
    imageSize: 0.6,
};
