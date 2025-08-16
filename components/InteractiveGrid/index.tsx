import React from "react";
import { Project } from "../../types";
import { useInteractiveGrid } from "./useInteractiveGrid";

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

export default function InteractiveGrid(props: InteractiveGridProps) {
    const { 
        mountRef, 
        linkRef, 
        zoomedProject, 
        isZoomed, 
        cursor, 
        eventHandlers 
    } = useInteractiveGrid(props);

    return (
        <div
            ref={mountRef}
            className={`${props.className} touch-none overflow-hidden relative`}
            style={{ cursor }}
            {...eventHandlers}
        >
            {/* Loading indicator removed as requested. The grid will appear once textures are ready. */}
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