import { Project } from "../../../types";
import { ThreeContext } from "./types";

/**
 * @file This file contains shared utility functions used by multiple hooks.
 * Centralizing this logic here prevents code duplication and makes the
 * individual hooks cleaner and more focused on their primary responsibility.
 */

/**
 * Calculates the correct project from the project array based on a grid cell's ID.
 * The calculation uses the modulo operator to ensure the grid wraps around infinitely,
 * so there are no empty cells.
 * @param id - The {x, y} coordinate of the grid cell.
 * @param projects - The array of project data.
 * @returns The project object for that cell, or null if input is invalid.
 */
export const getProjectByCellId = (id: any, projects: Project[]): Project | null => {
     if (!id || !projects || projects.length === 0) return null;
     // A simple way to map a 2D coordinate to a 1D array index.
     const flatIndex = Math.floor(id.x) + Math.floor(id.y) * 3;
     // The modulo operator ensures the index always falls within the bounds of the projects array.
     const projectIndex = ((flatIndex % projects.length) + projects.length) % projects.length;
     return projects[projectIndex];
};

/**
 * Converts screen coordinates (e.g., from a mouse click in pixels) into the
 * distorted 2D "world" coordinates used by the WebGL shader. This is a crucial
 * step for translating user input into the shader's coordinate system.
 * @param screenPos - The {x, y} position on the screen in pixels.
 * @param context - The shared Three.js context object.
 * @returns A THREE.Vector2 representing the position in world coordinates.
 */
export const screenToWorld = (screenPos: { x: number; y: number }, context: ThreeContext) => {
    const { plane, zoom, offset, distortion, THREE } = context;
    if (!plane || !THREE) return new THREE.Vector2();
    
    // 1. Normalize pixel coordinates to the -1 to +1 range (Normalized Device Coordinates).
    const res = plane.material.uniforms.uResolution.value;
    const ndc = new THREE.Vector2((screenPos.x / res.x) * 2 - 1, -(screenPos.y / res.y) * 2 + 1);
    
    // 2. Apply the inverse of the barrel distortion from the shader.
    const distorted = ndc.clone().multiplyScalar(1.0 - distortion * 0.08 * ndc.length() * ndc.length());
    
    // 3. Account for screen aspect ratio, zoom, and camera pan (offset).
    const aspect = new THREE.Vector2(res.x / res.y, 1.0);
    return distorted.multiply(aspect).multiplyScalar(zoom).add(offset);
};