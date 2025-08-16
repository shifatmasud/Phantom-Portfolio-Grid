import { Project } from "../../../types";
import { StyleConfig } from "../config";

/**
 * @file Contains utility functions for creating and manipulating textures using the 2D Canvas API.
 * This is where we "draw" our text and combine our images into atlases before
 * uploading them to the GPU to be used by the shader.
 */

type FontStyle = {
    fontFamily: string;
    fontWeight: string | number;
    textColor: string;
};

/**
 * Creates a texture containing the project title and year.
 * It does this by rendering the text onto a hidden 2D canvas and then
 * creating a Three.js texture from that canvas.
 */
export const createTextTexture = (project: Project, fontStyle: FontStyle, THREE: any) => {
    const { title, year } = project;
    const { fontFamily, fontWeight, textColor } = fontStyle;
    const canvas = document.createElement("canvas");
    canvas.width = StyleConfig.textTextureWidth; 
    canvas.height = StyleConfig.textTextureHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    
    ctx.font = `${fontWeight} ${StyleConfig.textureFontSize}px "${fontFamily}"`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = "middle";
    ctx.fillText(title.toUpperCase(), 30, StyleConfig.textTextureHeight / 2);
    ctx.textAlign = "right";
    ctx.fillText(year.toString(), StyleConfig.textTextureWidth - 30, StyleConfig.textTextureHeight / 2);
    
    return new THREE.CanvasTexture(canvas);
};

/**
 * Combines an array of individual textures into a single, larger texture atlas.
 * This is a major performance optimization, as it's much faster for the GPU
 * to bind one large texture than many small ones.
 */
export const createTextureAtlas = (textures: any[], isText: boolean, THREE: any) => {
    const atlasGridSize = Math.ceil(Math.sqrt(textures.length));
    const textureSize = isText ? StyleConfig.textTextureHeight : StyleConfig.imageAtlasTextureSize;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = atlasGridSize * textureSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    
    // Draw each individual texture onto the larger atlas canvas at the correct position.
    textures.forEach((texture, index) => {
        if (texture.image) {
            const x = (index % atlasGridSize) * textureSize;
            const y = Math.floor(index / atlasGridSize) * textureSize;
            ctx.drawImage(texture.image, x, y, textureSize, textureSize);
        }
    });
    
    const atlasTexture = new THREE.CanvasTexture(canvas);
    atlasTexture.minFilter = THREE.LinearFilter;
    atlasTexture.magFilter = THREE.LinearFilter;
    return atlasTexture;
};

/**
 * Creates a placeholder texture to be used when an image fails to load.
 * This prevents the application from crashing and provides clear visual feedback.
 */
export const createPlaceholderTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    const size = StyleConfig.imageAtlasTextureSize;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    
    ctx.fillStyle = "#222"; 
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#555"; 
    ctx.font = `bold ${size / 10}px sans-serif`;
    ctx.textAlign = "center"; 
    ctx.textBaseline = "middle";
    ctx.fillText("Load Error", size / 2, size / 2);
    
    return new THREE.CanvasTexture(canvas);
};