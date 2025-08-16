import React from 'react';
import InteractiveGrid from './components/InteractiveGrid/index';
import { DEFAULT_PROJECTS } from './constants';

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
        // Data for the grid
        projects={DEFAULT_PROJECTS}

        // --- STYLING PROPS ---
        fontFamily="IBM Plex Mono, monospace"
        fontWeight="bold"
        backgroundColor="#0a0a0a"
        borderColor={borderColor}
        hoverColor="rgba(255, 255, 255, 0.05)"
        textColor="#808080"
        
        // --- BEHAVIOR & APPEARANCE PROPS ---
        cellSize={0.75}
        distortionStrength={1.0}

        // --- MOBILE OPTIMIZATIONS ---
        disableMobileHover={false}
        optimizeMobile={true}

        // --- GENERAL PROPS ---
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