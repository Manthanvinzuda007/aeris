'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface MapProps {
  predictionGrid: number[][] | null;
  lightningFlashes: { lat: number; lon: number; intensity: number }[];
  currentTime: number;
  isLoading: boolean;
}

const HEATMAP_BOUNDS = {
  north: 37,
  south: 6,
  east: 98,
  west: 68
};

/**
 * Interpolates the meteorological reflectivity ramp for smooth color transitions.
 * Ramp: #3B82F6 (light) → #22C55E (moderate) → #EAB308 (heavy) → #F97316 (severe) → #DC2626 (extreme)
 */
function getRiskColorRGBA(risk: number, alpha: number): string {
  if (risk < 0.05) return 'transparent';
  
  // Define color stops as [r, g, b]
  const stops: [number, number, number][] = [
    [59, 130, 246],   // #3B82F6 blue
    [34, 197, 94],    // #22C55E green
    [234, 179, 8],    // #EAB308 yellow
    [249, 115, 22],   // #F97316 orange
    [220, 38, 38],    // #DC2626 red
  ];
  
  const t = Math.min(1, Math.max(0, risk)) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const f = t - i;
  
  const r = Math.round(stops[i][0] + f * (stops[i + 1][0] - stops[i][0]));
  const g = Math.round(stops[i][1] + f * (stops[i + 1][1] - stops[i][1]));
  const b = Math.round(stops[i][2] + f * (stops[i + 1][2] - stops[i][2]));
  
  return `rgba(${r},${g},${b},${alpha})`;
}

function CanvasOverlay({ predictionGrid, lightningFlashes }: { 
  predictionGrid: number[][] | null;
  lightningFlashes: { lat: number; lon: number; intensity: number }[];
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const updateCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // --- Render prediction heatmap ---
      if (predictionGrid && predictionGrid.length > 0) {
        const rows = predictionGrid.length;
        const cols = predictionGrid[0]?.length || 0;
        if (cols === 0) return;
        
        const latStep = (HEATMAP_BOUNDS.north - HEATMAP_BOUNDS.south) / rows;
        const lonStep = (HEATMAP_BOUNDS.east - HEATMAP_BOUNDS.west) / cols;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = predictionGrid[r][c];
            if (val < 0.05) continue;

            const latNorth = HEATMAP_BOUNDS.north - r * latStep;
            const latSouth = latNorth - latStep;
            const lonWest = HEATMAP_BOUNDS.west + c * lonStep;
            const lonEast = lonWest + lonStep;

            const nw = map.latLngToContainerPoint([latNorth, lonWest]);
            const se = map.latLngToContainerPoint([latSouth, lonEast]);

            const w = Math.max(1, se.x - nw.x + 1);
            const h = Math.max(1, se.y - nw.y + 1);

            ctx.fillStyle = getRiskColorRGBA(val, 0.55 + val * 0.25);
            ctx.fillRect(nw.x, nw.y, w, h);
          }
        }
      }

      // --- Render lightning flashes ---
      ctx.save();
      lightningFlashes.forEach(flash => {
        const pt = map.latLngToContainerPoint([flash.lat, flash.lon]);
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 200, 87, 0.2)';
        ctx.fill();
        
        // Inner dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFC857';
        ctx.fill();
      });
      ctx.restore();
    };

    updateCanvas();
    map.on('move', updateCanvas);
    map.on('zoom', updateCanvas);
    map.on('resize', updateCanvas);

    return () => {
      map.off('move', updateCanvas);
      map.off('zoom', updateCanvas);
      map.off('resize', updateCanvas);
    };
  }, [map, predictionGrid, lightningFlashes]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 400
      }}
    />
  );
}

export default function Map({ predictionGrid, lightningFlashes, currentTime, isLoading }: MapProps) {
  const [playedRadar, setPlayedRadar] = React.useState(false);

  useEffect(() => {
    setPlayedRadar(true);
    const timer = setTimeout(() => setPlayedRadar(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: 'var(--bg-night)' }}>
      <MapContainer
        center={[22, 79]}
        zoom={5}
        style={{ width: '100%', height: '100%', background: '#0A0E17' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <CanvasOverlay predictionGrid={predictionGrid} lightningFlashes={lightningFlashes} />
      </MapContainer>
      
      {/* Radar sweep entrance animation */}
      {playedRadar && (
        <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden flex items-center justify-center">
          <div 
            className="rounded-full"
            style={{
              width: '150vmax',
              height: '150vmax',
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(59,130,246,0.25) 360deg)',
              animation: 'radar-sweep 2s linear 1 forwards',
            }}
          />
        </div>
      )}
    </div>
  );
}
