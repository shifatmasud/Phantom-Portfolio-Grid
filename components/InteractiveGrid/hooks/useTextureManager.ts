import { useEffect } from "react";
import { ThreeContext, InteractiveGridProps } from "./types";
import { createTextTexture, createTextureAtlas, createPlaceholderTexture } from "./textureUtils";

/**
 * @file Manages the entire lifecycle of loading and processing textures.
 * This hook is responsible for:
 * - Asynchronously loading all project images.
 * - Handling image loading errors gracefully by providing a placeholder.
 * - Generating textures from text using a 2D canvas.
 * - Combining individual textures into large "texture atlases" for performance.
 * - Updating the shader uniforms with the final atlases.
 */
export function useTextureManager(
    threeContext: React.MutableRefObject<ThreeContext>,
    isThreeInitialized: boolean,
    props: InteractiveGridProps
) {
    const { projects, fontFamily, fontWeight, textColor } = props;

    useEffect(() => {
        if (!isThreeInitialized || !projects || projects.length === 0) return;

        const { current: context } = threeContext;
        const { THREE, plane } = context;

        const updateData = async () => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin("");

            try {
                // Start loading all images, with error handling for each one.
                const texturePromises = projects.map(p => 
                    textureLoader.loadAsync(p.image).catch(err => {
                        console.warn(`Could not load image texture for "${p.title}". Using placeholder.`, err);
                        return createPlaceholderTexture(THREE);
                    })
                );
                // Generate text textures on the fly.
                const imageTextures = await Promise.all(texturePromises);
                const textTextures = projects.map((p) => createTextTexture(p, { fontFamily, fontWeight, textColor }, THREE));

                // Combine the individual textures into two large atlases.
                const imageAtlas = createTextureAtlas(imageTextures, false, THREE);
                const textAtlas = createTextureAtlas(textTextures, true, THREE);
                
                const { uniforms } = plane.material;
                // Dispose of old textures to free up GPU memory before assigning new ones.
                if (uniforms.uImageAtlas.value) uniforms.uImageAtlas.value.dispose();
                if (uniforms.uTextAtlas.value) uniforms.uTextAtlas.value.dispose();
                
                // Update the shader with the new atlases.
                uniforms.uImageAtlas.value = imageAtlas;
                uniforms.uTextAtlas.value = textAtlas;
                uniforms.uTextureCount.value = projects.length;

            } catch (error) {
                console.error("A critical error occurred during texture processing:", error);
            }
        };

        updateData();

    }, [isThreeInitialized, projects, fontFamily, fontWeight, textColor, threeContext]);
}