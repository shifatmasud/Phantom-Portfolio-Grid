export const vertexShader = `
  // The vertex shader is responsible for positioning the vertices of the geometry.
  // Here, we're simply passing the UV coordinates to the fragment shader
  // and setting the final position of the vertex.
  out vec2 vUv;
  void main() {
    vUv = uv; // Pass the texture coordinates to the fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  // --- UNIFORMS ---
  // These are variables passed from our React/Three.js code into the shader.
  // They allow us to control the shader's behavior dynamically.

  // Positioning & Camera
  uniform vec2 uOffset;             // The camera's pan offset
  uniform vec2 uResolution;         // The size of the screen/canvas
  uniform vec2 uMousePos;           // The current mouse position on the screen
  uniform float uZoom;              // The current zoom level
  uniform float uCellSize;          // The size of each grid cell in world units
  
  // Styling
  uniform vec4 uBorderColor;        // The color and opacity of the grid lines
  uniform vec4 uHoverColor;         // The additive color when hovering over a cell
  uniform vec4 uBackgroundColor;    // The base background color of the grid
  
  // Textures & Data
  uniform float uTextureCount;      // The total number of projects/textures
  uniform sampler2D uImageAtlas;    // A texture containing all project images
  uniform sampler2D uTextAtlas;     // A texture containing all project text
  uniform sampler2D uActiveVideo;   // A texture for the currently active video preview

  // Effects & State
  uniform float uDistortionStrength; // The strength of the barrel distortion effect
  uniform vec2 uHoveredCellId;       // The ID of the cell the video is playing for
  uniform bool uIsVideoActive;       // Flag indicating if a video is currently playing
  uniform float uZoomProgress;       // A 0-1 value representing the zoom animation progress
  uniform float uTime;               // A constantly increasing value for time-based effects
  
  // Optimizations
  uniform bool uIsMobile;            // Flag for mobile devices
  uniform bool uHoverEnabled;        // Flag to enable/disable hover effects
  uniform bool uOptimizeMobile;      // Flag to disable performance-intensive effects on mobile

  // --- INPUTS ---
  // Data passed from the vertex shader to the fragment shader.
  in vec2 vUv; // The UV coordinates of the current pixel

  // --- CONSTANTS ---
  #define PI 3.1415926535
  #define LINE_WIDTH 0.005  // The thickness of the grid lines
  #define IMAGE_SIZE 0.6    // The percentage of the cell the image occupies
  #define TEXT_HEIGHT 0.08  // The percentage of the cell the text occupies

  // --- HELPER FUNCTIONS ---

  /**
   * Calculates the color of the grid lines and base background.
   */
  vec3 drawGrid(vec3 color, vec2 cellUV, vec2 mouseWorldCoord, vec2 cellId) {
      // Create a soft mask for the grid lines based on the cell's UV coordinates.
      float gridMask = smoothstep(0.0, LINE_WIDTH, cellUV.x) * smoothstep(1.0, 1.0 - LINE_WIDTH, cellUV.x) *
                       smoothstep(0.0, LINE_WIDTH, cellUV.y) * smoothstep(1.0, 1.0 - LINE_WIDTH, cellUV.y);

      // Calculate hover intensity based on distance from mouse to cell center.
      float distToMouseHover = length(mouseWorldCoord - (cellId + 0.5) * uCellSize);
      float hoverRadius = uCellSize * 1.5;
      float hoverIntensity = pow(smoothstep(hoverRadius, 0.0, distToMouseHover), 2.0);
      bool isHovered = uHoverEnabled && hoverIntensity > 0.0 && uMousePos.x > 0.0;
      
      // Mix in the hover color if applicable.
      if (isHovered) {
        color = mix(color, uHoverColor.rgb, hoverIntensity * uHoverColor.a);
      }

      // Mix in the border color based on the grid mask.
      return mix(color, uBorderColor.rgb, (1.0 - gridMask) * uBorderColor.a);
  }

  /**
   * Calculates the color of the project image within a cell.
   */
  vec3 drawImage(vec3 color, vec2 cellUV, vec2 cellId, float hoverIntensity, float effectIntensity) {
      // Scale the image slightly on hover.
      float hoverScale = 1.0 + hoverIntensity * 0.05;
      vec2 imageUV = (cellUV - (1.0 - IMAGE_SIZE * hoverScale) * 0.5) / (IMAGE_SIZE * hoverScale);
      
      // Create an alpha mask to ensure we only draw inside the image bounds.
      float imageAlpha = smoothstep(0.0, 0.01, imageUV.x) * smoothstep(1.0, 0.99, imageUV.x) *
                         smoothstep(0.0, 0.01, imageUV.y) * smoothstep(1.0, 0.99, imageUV.y);

      if (imageAlpha > 0.0) {
        vec3 imageColor;
        // Check if this cell is the one with the active video.
        bool isHoveredCell = uIsVideoActive && cellId.x == uHoveredCellId.x && cellId.y == uHoveredCellId.y;

        if (isHoveredCell) {
            imageColor = texture(uActiveVideo, imageUV).rgb;
        } else {
            // Calculate which texture to sample from the atlas.
            float texIndex = mod(floor(cellId.x) + floor(cellId.y) * 3.0, uTextureCount);
            float atlasSize = ceil(sqrt(uTextureCount));
            vec2 atlasUV = (vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize)) + imageUV) / atlasSize;
            
            // Apply a slight chromatic aberration effect during zoom transitions on desktop.
            float caOffset = uOptimizeMobile ? 0.0 : effectIntensity * 0.01;
            float r = texture(uImageAtlas, atlasUV + vec2(caOffset, 0.0)).r;
            float g = texture(uImageAtlas, atlasUV).g;
            float b = texture(uImageAtlas, atlasUV - vec2(caOffset, 0.0)).b;
            imageColor = vec3(r, g, b);
        }
        color = mix(color, imageColor, imageAlpha);
      }
      return color;
  }
  
  /**
   * Calculates the color for the project text (title and year).
   */
  vec3 drawText(vec3 color, vec2 cellUV, vec2 cellId, float hoverIntensity) {
      // Check if the current pixel is within the text area.
      if (cellUV.x > 0.05 && cellUV.x < 0.95 && cellUV.y > 0.05 && cellUV.y < 0.05 + TEXT_HEIGHT) {
        // Normalize UVs for the text area.
        vec2 textUV = vec2((cellUV.x - 0.05) / 0.9, (cellUV.y - 0.05) / TEXT_HEIGHT);
        
        // Calculate which text texture to sample from the atlas.
        float texIndex = mod(floor(cellId.x) + floor(cellId.y) * 3.0, uTextureCount);
        float atlasSize = ceil(sqrt(uTextureCount));
        vec2 atlasUV = (vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize)) + textUV) / atlasSize;
        vec4 textColor = texture(uTextAtlas, atlasUV);
        
        // Make text brighter on hover and mix it with the background.
        vec3 finalTextColor = mix(textColor.rgb, vec3(1.0), hoverIntensity * 0.5);
        color = mix(color, finalTextColor, textColor.a);
      }
      return color;
  }

  // --- MAIN SCENE FUNCTION ---
  vec4 getSceneColor(vec2 uv, float effectIntensity) {
      // 1. Calculate world coordinates from screen UVs, applying barrel distortion.
      vec2 screenUV = (uv - 0.5) * 2.0;
      float radius = length(screenUV);
      float distortion = 1.0 - uDistortionStrength * 0.08 * radius * radius;
      vec2 distortedUV = screenUV * distortion;
      vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 worldCoord = distortedUV * aspectRatio;
      worldCoord *= uZoom;
      worldCoord += uOffset;
      
      // 2. Calculate mouse position in world coordinates.
      vec2 mouseScreenUV = (uMousePos / uResolution) * 2.0 - 1.0;
      mouseScreenUV.y = -mouseScreenUV.y;
      vec2 mouseWorldCoord = (mouseScreenUV * aspectRatio) * uZoom + uOffset;

      // 3. Apply a ripple effect based on mouse distance (desktop only).
      if (!uOptimizeMobile) {
        float distToMouseRipple = length(mouseWorldCoord - worldCoord);
        float rippleFalloff = smoothstep(uCellSize * 1.5, 0.0, distToMouseRipple);
        float ripple = sin(distToMouseRipple * 12.0 - uTime * 3.0) * rippleFalloff * 0.002;
        worldCoord.xy += ripple;
      }

      // 4. Determine the current cell ID and the UV within that cell.
      vec2 cellPos = worldCoord / uCellSize;
      vec2 cellId = floor(cellPos);
      vec2 cellUV = fract(cellPos);

      // 5. Calculate hover intensity for effects.
      float distToMouseHover = length(mouseWorldCoord - (cellId + 0.5) * uCellSize);
      float hoverIntensity = pow(smoothstep(uCellSize * 1.5, 0.0, distToMouseHover), 2.0);
      
      // 6. Layer the final color by drawing components on top of each other.
      vec3 color = uBackgroundColor.rgb;
      color = drawGrid(color, cellUV, mouseWorldCoord, cellId); // Start with grid and hover
      color = drawImage(color, cellUV, cellId, hoverIntensity, effectIntensity); // Add the image
      color = drawText(color, cellUV, cellId, hoverIntensity); // Add the text
      
      // 7. Apply a vignette effect by fading to transparent at the edges.
      return vec4(color * (1.0 - smoothstep(1.2, 1.8, radius)), 1.0);
  }

  // --- MAIN ENTRY POINT ---
  void main() {
    // The main function is the entry point for the shader program.
    // It calculates the final color for the current pixel (gl_FragColor).
    
    // Calculate an intensity value for zoom-based effects (like motion blur).
    float effectIntensity = sin(uZoomProgress * PI);
    vec4 finalColor;

    // Apply a radial motion blur effect during zoom transitions (desktop only).
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