import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    CSSProperties,
} from "react";

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
}

// --- CONSTANTS & CONFIGURATION ---

// Default project data used by the App component.
const DEFAULT_PROJECTS: Project[] = [
    {
        title: "Motion Study",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
        year: 2024,
        href: "https://example.com/project/motion-study",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    },
    {
        title: "Idle Form",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg",
        year: 2023,
        href: "https://example.com/project/idle-form",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    },
    {
        title: "Blur Signal",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
        year: 2024,
        href: "https://example.com/project/blur-signal",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    },
     {
        title: "Data Weave",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
        year: 2022,
        href: "https://example.com/project/data-weave",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    },
    {
        title: "Future Echo",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
        year: 2023,
        href: "https://example.com/project/future-echo",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    },
    {
        title: "Kinetic UI",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
        year: 2024,
        href: "https://example.com/project/kinetic-ui",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    },
    {
        title: "Glass Shift",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
        year: 2023,
        href: "https://example.com/project/glass-shift",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    },
    {
        title: "Quantum Leap",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
        year: 2024,
        href: "https://example.com/project/quantum-leap",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
    {
        title: "Chroma Flow",
        image: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
        year: 2022,
        href: "https://example.com/project/chroma-flow",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    },
];

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

      if (!uOptimizeMobile) {
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
      float imageSize = 0.6;
      vec2 imageUV = (cellUV - (1.0 - imageSize * hoverScale) * 0.5) / (imageSize * hoverScale);
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

    if (effectIntensity > 0.01 && !uOptimizeMobile) {
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

// Centralized configuration for physics, animation, and styling constants.
const AnimationConfig = {
    springStiffness: 0.05, damping: 0.75, lerpFactor: 0.1,
    scrollSpeed: 0.001, swipeThreshold: 50, tapThreshold: 10,
    zoomedInLevel: 0.3, defaultZoomLevel: 1.0,
};

const StyleConfig = {
    textTextureWidth: 2048, textTextureHeight: 256,
    imageAtlasTextureSize: 512, textureFontSize: 80,
};

// --- HELPER FUNCTIONS ---

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

// --- INTERACTIVE GRID COMPONENT ---
// This is the main component that renders the WebGL grid. All logic is self-contained.
function InteractiveGrid(props: InteractiveGridProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const linkRef = useRef<HTMLAnchorElement>(null);
    const threeContext = useRef<any>({}).current;

    const [zoomedProject, setZoomedProject] = useState<Project | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [cursor, setCursor] = useState("grab");
    
    const { projects, fontFamily, fontWeight, textColor } = props;

    // This effect runs only once to set up the entire Three.js scene, camera, renderer, and shaders.
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;
        
        const THREE = (window as any).THREE;
        if (!THREE) { console.error("THREE.js not loaded."); return; }

        const isMobile = "ontouchstart" in window;
        Object.assign(threeContext, {
            THREE, isMobile, isDragging: false, isZoomed: false,
            previousMouse: new THREE.Vector2(), clickStart: new THREE.Vector2(),
            offset: new THREE.Vector2(), targetOffset: new THREE.Vector2(),
            offsetVelocity: new THREE.Vector2(), mousePos: new THREE.Vector2(-1, -1),
            targetMousePos: new THREE.Vector2(-1, -1), zoom: 1.0, targetZoom: 1.0,
            distortion: 1.0, targetDistortion: 1.0, zoomProgress: 0.0,
            lastOffset: new THREE.Vector2(), lastZoom: 1.0, videoNonce: 0,
            hoveredCellId: new THREE.Vector2(-999, -999), zoomedCellId: null,
        });

        threeContext.scene = new THREE.Scene();
        threeContext.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        threeContext.camera.position.z = 1;
        threeContext.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        threeContext.renderer.setClearColor(0x000000, 0);
        threeContext.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
        currentMount.appendChild(threeContext.renderer.domElement);

        threeContext.videoRef = document.createElement("video");
        Object.assign(threeContext.videoRef, { loop: true, muted: true, playsInline: true, crossOrigin: "anonymous", style: "display:none" });
        currentMount.appendChild(threeContext.videoRef);
        threeContext.videoTextureRef = new THREE.VideoTexture(threeContext.videoRef);

        const uniforms = {
            uOffset: { value: threeContext.offset }, uResolution: { value: new THREE.Vector2() },
            uBorderColor: { value: new THREE.Vector4() }, uHoverColor: { value: new THREE.Vector4() },
            uBackgroundColor: { value: new THREE.Vector4() }, uMousePos: { value: threeContext.mousePos },
            uZoom: { value: 1.0 }, uDistortionStrength: { value: 1.0 }, uCellSize: { value: 0.75 },
            uTextureCount: { value: 0 }, uImageAtlas: { value: null }, uTextAtlas: { value: null },
            uActiveVideo: { value: threeContext.videoTextureRef }, uHoveredCellId: { value: new THREE.Vector2(-999, -999) },
            uIsVideoActive: { value: false }, uZoomProgress: { value: 0.0 }, uTime: { value: 0.0 },
            uIsMobile: { value: isMobile }, uHoverEnabled: { value: true }, uOptimizeMobile: { value: true },
        };
        threeContext.plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true }));
        threeContext.scene.add(threeContext.plane);

        const onResize = () => {
            if (!threeContext.renderer || !threeContext.plane || !currentMount) return;
            threeContext.renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            threeContext.plane.material.uniforms.uResolution.value.set(currentMount.clientWidth, currentMount.clientHeight);
        };
        const resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(currentMount);
        onResize();

        return () => {
            resizeObserver.unobserve(currentMount);
            if (threeContext.renderer?.domElement.parentNode === currentMount) {
                currentMount.removeChild(threeContext.renderer.domElement);
            }
            if (threeContext.videoRef?.parentNode === currentMount) {
                currentMount.removeChild(threeContext.videoRef);
            }
        };
    }, []);

    // This effect synchronizes props from React to the shader uniforms whenever they change.
    useEffect(() => {
        if (threeContext.plane) {
            const { plane, THREE } = threeContext;
            const { uBorderColor, uHoverColor, uBackgroundColor, uCellSize, uDistortionStrength, uHoverEnabled, uOptimizeMobile } = plane.material.uniforms;
            const { backgroundColor, borderColor, hoverColor, cellSize, distortionStrength, disableMobileHover, optimizeMobile } = props;
            uBackgroundColor.value.copy(parseColorToVec4(backgroundColor, THREE));
            uBorderColor.value.copy(parseColorToVec4(borderColor, THREE));
            uHoverColor.value.copy(parseColorToVec4(hoverColor, THREE));
            uCellSize.value = cellSize;
            uDistortionStrength.value = distortionStrength;
            uHoverEnabled.value = !(threeContext.isMobile && disableMobileHover);
            uOptimizeMobile.value = threeContext.isMobile && optimizeMobile;
        }
    }, [props, threeContext]);

    // This effect loads all image and text textures when the component mounts or projects change.
    useEffect(() => {
        if (!threeContext.plane || !projects || projects.length === 0) return;
        const { THREE, plane } = threeContext;
        
        const createTextTexture = (p: Project, fontStyle: any, three: any) => {
            const canvas = document.createElement("canvas");
            canvas.width = StyleConfig.textTextureWidth; canvas.height = StyleConfig.textTextureHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return new three.CanvasTexture(canvas);
            ctx.font = `${fontStyle.fontWeight} ${StyleConfig.textureFontSize}px "${fontStyle.fontFamily}"`;
            ctx.fillStyle = fontStyle.textColor;
            ctx.textBaseline = "middle";
            ctx.fillText(p.title.toUpperCase(), 30, StyleConfig.textTextureHeight / 2);
            ctx.textAlign = "right";
            ctx.fillText(p.year.toString(), StyleConfig.textTextureWidth - 30, StyleConfig.textTextureHeight / 2);
            return new three.CanvasTexture(canvas);
        };
        const createTextureAtlas = (textures: any[], isText: boolean, three: any) => {
            const atlasGridSize = Math.ceil(Math.sqrt(textures.length));
            const textureSize = isText ? StyleConfig.textTextureHeight : StyleConfig.imageAtlasTextureSize;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = atlasGridSize * textureSize;
            const ctx = canvas.getContext("2d");
            if (!ctx) return new three.CanvasTexture(canvas);
            textures.forEach((texture, index) => {
                if (texture.image) {
                    const x = (index % atlasGridSize) * textureSize;
                    const y = Math.floor(index / atlasGridSize) * textureSize;
                    ctx.drawImage(texture.image, x, y, textureSize, textureSize);
                }
            });
            const atlasTexture = new three.CanvasTexture(canvas);
            atlasTexture.minFilter = three.LinearFilter;
            atlasTexture.magFilter = three.LinearFilter;
            return atlasTexture;
        };
        const createPlaceholderTexture = (three: any) => {
            const canvas = document.createElement("canvas");
            const size = StyleConfig.imageAtlasTextureSize;
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return new three.CanvasTexture(canvas);
            ctx.fillStyle = "#222"; ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = "#555"; ctx.font = `bold ${size / 10}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Load Error", size / 2, size / 2);
            return new three.CanvasTexture(canvas);
        };

        const updateData = async () => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin("");
            const texturePromises = projects.map(p => textureLoader.loadAsync(p.image).catch(() => createPlaceholderTexture(THREE)));
            const imageTextures = await Promise.all(texturePromises);
            const textTextures = projects.map((p) => createTextTexture(p, { fontFamily, fontWeight, textColor }, THREE));
            const imageAtlas = createTextureAtlas(imageTextures, false, THREE);
            const textAtlas = createTextureAtlas(textTextures, true, THREE);
            const { uniforms } = plane.material;
            if (uniforms.uImageAtlas.value) uniforms.uImageAtlas.value.dispose();
            if (uniforms.uTextAtlas.value) uniforms.uTextAtlas.value.dispose();
            uniforms.uImageAtlas.value = imageAtlas;
            uniforms.uTextAtlas.value = textAtlas;
            uniforms.uTextureCount.value = projects.length;
        };
        updateData();
    }, [threeContext, projects, fontFamily, fontWeight, textColor]);
    
    // Core interaction logic, memoized with useCallback.
    const getProjectByCellId = useCallback((id: any) => {
        if (!id || !projects || projects.length === 0) return null;
        const flatIndex = Math.floor(id.x) + Math.floor(id.y) * 3;
        const projectIndex = ((flatIndex % projects.length) + projects.length) % projects.length;
        return projects[projectIndex];
    }, [projects]);
    
    const setVideoState = useCallback(async (cellId: any) => {
        const { videoRef, plane } = threeContext;
        const currentNonce = ++threeContext.videoNonce;
        if (!videoRef || !plane) return;
        const project = getProjectByCellId(cellId);
        const newSrc = project?.video;
        plane.material.uniforms.uIsVideoActive.value = false;
        if (!videoRef.paused) videoRef.pause();
        if (!newSrc) return;
        try {
            if (currentNonce !== threeContext.videoNonce) return;
            if (videoRef.src !== newSrc) { videoRef.src = newSrc; await videoRef.load(); }
            plane.material.uniforms.uHoveredCellId.value.copy(cellId);
            await videoRef.play();
            if (currentNonce === threeContext.videoNonce) plane.material.uniforms.uIsVideoActive.value = true;
        } catch (error: any) {
            if (error.name !== "AbortError") console.warn("Video playback failed", error);
        }
    }, [threeContext, getProjectByCellId]);
    
    const unzoom = useCallback(() => {
        threeContext.targetOffset.copy(threeContext.lastOffset);
        threeContext.targetZoom = threeContext.lastZoom;
        threeContext.targetDistortion = 1.0;
        threeContext.isZoomed = false;
        setIsZoomed(false);
        threeContext.zoomedCellId = null;
        setVideoState(null);
        setZoomedProject(null);
    }, [threeContext, setVideoState]);

    const navigateToCell = useCallback((cellId: any, isInitialZoom: boolean) => {
        const project = getProjectByCellId(cellId);
        setZoomedProject(project);
        setVideoState(cellId);
        if (isInitialZoom) {
            threeContext.lastOffset.copy(threeContext.targetOffset);
            threeContext.lastZoom = threeContext.targetZoom;
            threeContext.targetZoom = AnimationConfig.zoomedInLevel;
            threeContext.targetDistortion = 0.0;
            threeContext.isZoomed = true;
            setIsZoomed(true);
        }
        const currentCellSize = threeContext.plane.material.uniforms.uCellSize.value;
        threeContext.targetOffset.copy(cellId.clone().addScalar(0.5)).multiplyScalar(currentCellSize);
        threeContext.zoomedCellId = cellId.clone();
    }, [threeContext, getProjectByCellId, setVideoState]);

    useEffect(() => {
        if (zoomedProject && linkRef.current) {
            const timer = setTimeout(() => linkRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [zoomedProject]);

    const screenToWorld = useCallback((screenPos: { x: number; y: number }) => {
        const { plane, zoom, offset, distortion, THREE } = threeContext;
        if (!plane) return new THREE.Vector2();
        const res = plane.material.uniforms.uResolution.value;
        const ndc = new THREE.Vector2((screenPos.x / res.x) * 2 - 1, -(screenPos.y / res.y) * 2 + 1);
        const distorted = ndc.clone().multiplyScalar(1.0 - distortion * 0.08 * ndc.length() * ndc.length());
        const aspect = new THREE.Vector2(res.x / res.y, 1.0);
        return distorted.multiply(aspect).multiplyScalar(zoom).add(offset);
    }, [threeContext]);

    // This is the main animation loop, running on every frame.
    useEffect(() => {
        if (!threeContext.plane) return;
        let animationFrameId: number;
        const { plane, renderer, scene, camera, THREE } = threeContext;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const force = threeContext.targetOffset.clone().sub(threeContext.offset).multiplyScalar(AnimationConfig.springStiffness);
            threeContext.offsetVelocity.add(force).multiplyScalar(AnimationConfig.damping);
            threeContext.offset.add(threeContext.offsetVelocity);
            threeContext.mousePos.lerp(threeContext.targetMousePos, AnimationConfig.lerpFactor);
            threeContext.zoom += (threeContext.targetZoom - threeContext.zoom) * AnimationConfig.lerpFactor;
            threeContext.distortion += (threeContext.targetDistortion - threeContext.distortion) * AnimationConfig.lerpFactor;
            threeContext.zoomProgress += ((threeContext.isZoomed ? 1 : 0) - threeContext.zoomProgress) * AnimationConfig.lerpFactor;

            if (!threeContext.isZoomed) {
                const worldCoord = screenToWorld(threeContext.targetMousePos);
                const currentCellSize = plane.material.uniforms.uCellSize.value;
                const currentCellId = new THREE.Vector2(Math.floor(worldCoord.x / currentCellSize), Math.floor(worldCoord.y / currentCellSize));
                if (!threeContext.hoveredCellId || !currentCellId.equals(threeContext.hoveredCellId)) {
                    threeContext.hoveredCellId = currentCellId.clone();
                    setVideoState(currentCellId);
                }
            }

            if (threeContext.isDragging && !threeContext.isZoomed && plane.material.uniforms.uResolution.value.y > 0) {
                const delta = threeContext.targetMousePos.clone().sub(threeContext.previousMouse);
                const moveSpeed = 2.0 / plane.material.uniforms.uResolution.value.y;
                const aspect = plane.material.uniforms.uResolution.value.x / plane.material.uniforms.uResolution.value.y;
                threeContext.targetOffset.x -= delta.x * moveSpeed * threeContext.zoom * aspect;
                threeContext.targetOffset.y += delta.y * moveSpeed * threeContext.zoom;
                threeContext.previousMouse.copy(threeContext.targetMousePos);
            }
            
            Object.assign(plane.material.uniforms, {
                uZoom: { value: threeContext.zoom }, uDistortionStrength: { value: threeContext.distortion },
                uZoomProgress: { value: threeContext.zoomProgress }, uTime: { value: plane.material.uniforms.uTime.value + 0.016 },
            });
            if (threeContext.videoTextureRef) threeContext.videoTextureRef.needsUpdate = true;
            renderer.render(scene, camera);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [threeContext, screenToWorld, setVideoState]);
    
    // Event handlers for user input.
    const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!threeContext.renderer) return;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        threeContext.isDragging = true;
        setCursor("grabbing");
        threeContext.previousMouse.set(event.clientX, event.clientY);
        threeContext.clickStart.set(event.clientX, event.clientY);
    }, [threeContext]);

    const handleInteraction = useCallback((clickPos: { x: number, y: number }, delta: any) => {
        const { plane, isZoomed, zoomedCellId, THREE } = threeContext;
        if (!plane) return;
        const worldCoord = screenToWorld(clickPos);
        const tappedCellId = new THREE.Vector2(Math.floor(worldCoord.x / plane.material.uniforms.uCellSize.value), Math.floor(worldCoord.y / plane.material.uniforms.uCellSize.value));
        const isTap = delta.length() < AnimationConfig.tapThreshold;
        const isSwipe = delta.length() > AnimationConfig.swipeThreshold;
        if (isZoomed) {
            if (isTap) {
                if (tappedCellId.equals(zoomedCellId)) unzoom(); else navigateToCell(tappedCellId, false);
            } else if (isSwipe) {
                const nextCell = zoomedCellId.clone();
                if (Math.abs(delta.x) > Math.abs(delta.y)) nextCell.x -= Math.sign(delta.x); else nextCell.y += Math.sign(delta.y);
                navigateToCell(nextCell, false);
            }
        } else if (isTap) {
            navigateToCell(tappedCellId, true);
        }
    }, [threeContext, screenToWorld, navigateToCell, unzoom]);

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!threeContext.renderer) return;
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        const clickEnd = new threeContext.THREE.Vector2(event.clientX, event.clientY);
        handleInteraction(clickEnd, clickEnd.clone().sub(threeContext.clickStart));
        threeContext.isDragging = false;
        setCursor("grab");
    }, [threeContext, handleInteraction]);

    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (threeContext.targetMousePos) threeContext.targetMousePos.set(event.clientX, event.clientY);
    }, [threeContext]);

    const onPointerLeave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (threeContext.isDragging) onPointerUp(event);
    }, [threeContext, onPointerUp]);
    
    const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (!threeContext.renderer || threeContext.isZoomed) return;
        event.preventDefault();
        const { plane, zoom, targetOffset } = threeContext;
        const res = plane.material.uniforms.uResolution.value;
        const aspectRatio = res.x / res.y;
        let { deltaX, deltaY } = event;
        if (event.deltaMode === 1) { deltaX *= 18; deltaY *= 18; } else if (event.deltaMode === 2) { deltaX *= window.innerWidth; deltaY *= window.innerHeight; }
        targetOffset.x += deltaX * AnimationConfig.scrollSpeed * zoom * aspectRatio;
        targetOffset.y -= deltaY * AnimationConfig.scrollSpeed * zoom;
    }, [threeContext]);

    return (
        <div
            ref={mountRef}
            className={`${props.className} touch-none overflow-hidden relative`}
            style={{ cursor }}
            onPointerDown={onPointerDown} onPointerUp={onPointerUp}
            onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}
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
                className={`absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-lg md:text-xl no-underline z-10 transition-opacity duration-500 ease-in-out
                ${isZoomed && zoomedProject ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            >
                <span className="relative py-1 px-2">
                    View Project
                    <span className={`absolute bottom-0 left-0 w-full h-px bg-white origin-left transition-transform duration-700 ease-out delay-300
                    ${isZoomed ? "scale-x-100" : "scale-x-0"}`}
                    ></span>
                </span>
            </a>
        </div>
    );
}

// --- APP COMPONENT ---
// This is the main application component that puts everything together.
function App() {
  const borderColor = "rgba(40, 40, 40, 0.7)";

  return (
    <main style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="h-screen w-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <div 
        className="absolute top-8 left-8 z-10 p-4 bg-black/20 rounded-lg backdrop-blur-sm border"
        style={{ borderColor }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider">PROJECTS</h1>
        <p className="text-gray-400 text-sm md:text-base mt-1">An interactive portfolio showcase</p>
      </div>
      
      <InteractiveGrid
        projects={DEFAULT_PROJECTS}
        fontFamily="IBM Plex Mono, monospace"
        fontWeight="bold"
        backgroundColor="#0a0a0a"
        borderColor={borderColor}
        hoverColor="rgba(255, 255, 255, 0.05)"
        textColor="#808080"
        cellSize={0.75}
        distortionStrength={1.0}
        disableMobileHover={false}
        optimizeMobile={true}
        className="w-full h-full"
      />

      <div 
        className="absolute bottom-8 right-8 z-10 text-right text-gray-500 text-xs md:text-sm p-4 bg-black/20 rounded-lg backdrop-blur-sm border"
        style={{ borderColor }}
      >
        <p>Click & Drag to Explore</p>
        <p>Click a cell to zoom</p>
      </div>
    </main>
  );
}

export default App;
