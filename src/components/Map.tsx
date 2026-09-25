'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { 
  INDIA_BOUNDS, 
  DwrStation, 
  GeofenceZone,
  getRadarColorRGBA, 
  getSatelliteIrColorRGBA, 
  getSatelliteWvColorRGBA 
} from '@/lib/geo';
import { 
  TrackedCell, 
  LightningStroke, 
  MultiAltitudeGrid, 
  SatelliteChannels 
} from '@/lib/dummyData';
import { RenderableVector } from '@/lib/model';
import { PrimaryLayer, OverlayOptions } from './LayerControlPanel';

interface MapProps {
  primaryLayer: PrimaryLayer;
  overlays: OverlayOptions;
  cappiGrid: MultiAltitudeGrid | null;
  satelliteData: SatelliteChannels | null;
  thunderstormRiskGrid: number[][] | null;
  lightningRiskGrid: number[][] | null;
  flashRateDensity: number[][] | null;
  lightningStrokes: LightningStroke[];
  motionVectors: RenderableVector[];
  trackedCells: TrackedCell[];
  radarStations: DwrStation[];
  geofenceZones: GeofenceZone[];
  onSelectCell: (cell: TrackedCell) => void;
  isLoading: boolean;
}

const HEATMAP_BOUNDS = {
  north: INDIA_BOUNDS.latMax,
  south: INDIA_BOUNDS.latMin,
  east: INDIA_BOUNDS.lonMax,
  west: INDIA_BOUNDS.lonMin,
};

function getRiskColorRGBA(risk: number, alpha: number = 0.75): string {
  if (risk < 0.05) return 'transparent';
  if (risk < 0.25) return `rgba(59, 130, 246, ${alpha * 0.7})`;
  if (risk < 0.45) return `rgba(34, 197, 94, ${alpha * 0.8})`;
  if (risk < 0.65) return `rgba(234, 179, 8, ${alpha * 0.85})`;
  if (risk < 0.80) return `rgba(249, 115, 22, ${alpha * 0.9})`;
  return `rgba(220, 38, 38, ${Math.min(1, alpha + 0.1)})`;
}

function CanvasOverlay({
  primaryLayer,
  overlays,
  cappiGrid,
  satelliteData,
  thunderstormRiskGrid,
  lightningRiskGrid,
  flashRateDensity,
  lightningStrokes,
  motionVectors,
  trackedCells,
  radarStations,
  geofenceZones,
  onSelectCell,
}: {
  primaryLayer: PrimaryLayer;
  overlays: OverlayOptions;
  cappiGrid: MultiAltitudeGrid | null;
  satelliteData: SatelliteChannels | null;
  thunderstormRiskGrid: number[][] | null;
  lightningRiskGrid: number[][] | null;
  flashRateDensity: number[][] | null;
  lightningStrokes: LightningStroke[];
  motionVectors: RenderableVector[];
  trackedCells: TrackedCell[];
  radarStations: DwrStation[];
  geofenceZones: GeofenceZone[];
  onSelectCell: (cell: TrackedCell) => void;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Click handling on map for storm cells or radar stations
  useEffect(() => {
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLon = e.latlng.lng;

      // Find nearest tracked cell within ~0.8 degrees
      for (const cell of trackedCells) {
        const d = Math.sqrt(Math.pow(cell.lat - clickLat, 2) + Math.pow(cell.lon - clickLon, 2));
        if (d < 0.8) {
          onSelectCell(cell);
          return;
        }
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, trackedCells, onSelectCell]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const render = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine active grid based on primaryLayer
      let activeGrid: number[][] | null = null;
      let gridType: 'radar' | 'satellite_ir' | 'satellite_wv' | 'ai_risk' = 'radar';

      if (primaryLayer === 'radar_composite') {
        activeGrid = cappiGrid?.composite || null;
        gridType = 'radar';
      } else if (primaryLayer === 'radar_1km') {
        activeGrid = cappiGrid?.level1km || null;
        gridType = 'radar';
      } else if (primaryLayer === 'radar_3km') {
        activeGrid = cappiGrid?.level3km || null;
        gridType = 'radar';
      } else if (primaryLayer === 'radar_5km') {
        activeGrid = cappiGrid?.level5km || null;
        gridType = 'radar';
      } else if (primaryLayer === 'radar_8km') {
        activeGrid = cappiGrid?.level8km || null;
        gridType = 'radar';
      } else if (primaryLayer === 'radar_12km') {
        activeGrid = cappiGrid?.level12km || null;
        gridType = 'radar';
      } else if (primaryLayer === 'satellite_ir') {
        activeGrid = satelliteData?.irTir1 || null;
        gridType = 'satellite_ir';
      } else if (primaryLayer === 'satellite_wv') {
        activeGrid = satelliteData?.waterVapor || null;
        gridType = 'satellite_wv';
      } else if (primaryLayer === 'ai_thunderstorm') {
        activeGrid = thunderstormRiskGrid;
        gridType = 'ai_risk';
      } else if (primaryLayer === 'ai_lightning') {
        activeGrid = lightningRiskGrid;
        gridType = 'ai_risk';
      }

      // 1. Render primary raster field
      if (activeGrid && activeGrid.length > 0) {
        const rows = activeGrid.length;
        const cols = activeGrid[0]?.length || 0;
        const latStep = (HEATMAP_BOUNDS.north - HEATMAP_BOUNDS.south) / rows;
        const lonStep = (HEATMAP_BOUNDS.east - HEATMAP_BOUNDS.west) / cols;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = activeGrid[r][c];
            let color = 'transparent';

            if (gridType === 'radar') {
              color = getRadarColorRGBA(val, 0.72);
            } else if (gridType === 'satellite_ir') {
              color = getSatelliteIrColorRGBA(val, 0.75);
            } else if (gridType === 'satellite_wv') {
              color = getSatelliteWvColorRGBA(val, 0.70);
            } else if (gridType === 'ai_risk') {
              color = getRiskColorRGBA(val, 0.75);
            }

            if (color === 'transparent') continue;

            const latNorth = HEATMAP_BOUNDS.north - r * latStep;
            const latSouth = latNorth - latStep;
            const lonWest = HEATMAP_BOUNDS.west + c * lonStep;
            const lonEast = lonWest + lonStep;

            const nw = map.latLngToContainerPoint([latNorth, lonWest]);
            const se = map.latLngToContainerPoint([latSouth, lonEast]);

            const w = Math.max(1, se.x - nw.x + 1);
            const h = Math.max(1, se.y - nw.y + 1);

            ctx.fillStyle = color;
            ctx.fillRect(nw.x, nw.y, w, h);
          }
        }
      }

      // 2. Render Flash Rate Density (FRD) overlay if enabled
      if (overlays.flashRateDensity && flashRateDensity && flashRateDensity.length > 0) {
        const rows = flashRateDensity.length;
        const cols = flashRateDensity[0]?.length || 0;
        const latStep = (HEATMAP_BOUNDS.north - HEATMAP_BOUNDS.south) / rows;
        const lonStep = (HEATMAP_BOUNDS.east - HEATMAP_BOUNDS.west) / cols;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const frd = flashRateDensity[r][c];
            if (frd < 0.5) continue;

            const latNorth = HEATMAP_BOUNDS.north - r * latStep;
            const lonWest = HEATMAP_BOUNDS.west + c * lonStep;
            const pt = map.latLngToContainerPoint([latNorth, lonWest]);

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.min(18, 3 + frd * 2), 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(255, 200, 87, ${Math.min(0.4, frd * 0.08)})`;
            ctx.fill();
          }
        }
      }

      // 3. Render 39 IMD DWR Stations & 250km rings if enabled
      if (overlays.dwrStations) {
        ctx.save();
        radarStations.forEach((station) => {
          const pt = map.latLngToContainerPoint([station.lat, station.lon]);

          // Draw 250 km surveillance radius circle
          // 1 deg lat ≈ 111 km. Radius in deg ≈ rangeKm / 111
          const edgePt = map.latLngToContainerPoint([
            station.lat + station.rangeKm / 111,
            station.lon,
          ]);
          const radiusPx = Math.abs(edgePt.y - pt.y);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radiusPx, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.28)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Radar station center point
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#22C55E';
          ctx.fill();
          ctx.strokeStyle = '#0A0E17';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Label
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(234, 238, 247, 0.85)';
          ctx.fillText(station.name, pt.x + 6, pt.y + 3);
        });
        ctx.restore();
      }

      // 4. Render Critical Infrastructure Geofences if enabled
      if (overlays.geofences) {
        ctx.save();
        geofenceZones.forEach((zone) => {
          if (!zone.coordinates || zone.coordinates.length < 3) return;

          ctx.beginPath();
          zone.coordinates.forEach((coord, i) => {
            const p = map.latLngToContainerPoint(coord);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();

          ctx.strokeStyle = zone.criticality === 'Severe' ? '#DC2626' : '#F97316';
          ctx.lineWidth = 1.5;
          ctx.fillStyle = zone.criticality === 'Severe' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(249, 115, 22, 0.08)';
          ctx.fill();
          ctx.stroke();

          // Zone name
          const centerPt = map.latLngToContainerPoint(zone.center);
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = zone.criticality === 'Severe' ? '#DC2626' : '#F97316';
          ctx.fillText(`⌖ ${zone.name}`, centerPt.x - 40, centerPt.y - 12);
        });
        ctx.restore();
      }

      // 5. Render Storm Motion Vectors if enabled
      if (overlays.motionVectors && motionVectors) {
        ctx.save();
        ctx.strokeStyle = '#3B82F6';
        ctx.fillStyle = '#3B82F6';
        ctx.lineWidth = 1.5;

        motionVectors.forEach((v) => {
          const pt = map.latLngToContainerPoint([v.lat, v.lon]);
          const rad = (v.bearingDeg - 90) * (Math.PI / 180);
          const len = Math.max(12, Math.min(30, v.speedKmh * 0.45));

          const endX = pt.x + len * Math.cos(rad);
          const endY = pt.y + len * Math.sin(rad);

          // Arrow line
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrow head
          const headAngle = Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 6 * Math.cos(rad - headAngle),
            endY - 6 * Math.sin(rad - headAngle)
          );
          ctx.lineTo(
            endX - 6 * Math.cos(rad + headAngle),
            endY - 6 * Math.sin(rad + headAngle)
          );
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
      }

      // 6. Render TITAN Tracked Storm Cells & Forecast Cones if enabled
      if (overlays.trackedCells && trackedCells) {
        ctx.save();
        trackedCells.forEach((cell) => {
          const pt = map.latLngToContainerPoint([cell.lat, cell.lon]);

          // Bounding ellipse / polygon
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 22, 0, 2 * Math.PI);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Extrapolated trajectory cone
          if (cell.projectedTrack && cell.projectedTrack.length > 0) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            cell.projectedTrack.forEach((t) => {
              const tp = map.latLngToContainerPoint([t.lat, t.lon]);
              ctx.lineTo(tp.x, tp.y);
            });
            ctx.strokeStyle = 'rgba(255, 200, 87, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Track points with time label
            cell.projectedTrack.forEach((t) => {
              const tp = map.latLngToContainerPoint([t.lat, t.lon]);
              ctx.beginPath();
              ctx.arc(tp.x, tp.y, 3, 0, 2 * Math.PI);
              ctx.fillStyle = '#FFC857';
              ctx.fill();

              ctx.font = '8px monospace';
              ctx.fillStyle = '#FFC857';
              ctx.fillText(`+${t.minutes}m`, tp.x + 5, tp.y - 3);
            });
          }

          // Centroid Badge
          ctx.font = 'bold 10px monospace';
          const badgeText = `${cell.id}: ${cell.maxDbz}dBZ | Hail ${cell.hailProb}%`;
          const textWidth = ctx.measureText(badgeText).width;

          ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
          ctx.fillRect(pt.x - textWidth / 2 - 4, pt.y - 30, textWidth + 8, 16);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 1;
          ctx.strokeRect(pt.x - textWidth / 2 - 4, pt.y - 30, textWidth + 8, 16);

          ctx.fillStyle = '#EAEEF7';
          ctx.fillText(badgeText, pt.x - textWidth / 2, pt.y - 18);
        });
        ctx.restore();
      }

      // 7. Render Lightning Strokes if enabled
      if (overlays.lightningStrokes && lightningStrokes) {
        ctx.save();
        lightningStrokes.forEach((flash) => {
          const pt = map.latLngToContainerPoint([flash.lat, flash.lon]);

          if (flash.type === 'CG') {
            // Cloud-to-ground strike: bright glowing bolt point
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 200, 87, 0.35)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFC857';
            ctx.fill();

            // Polarity indicator
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = flash.polarity === '+' ? '#DC2626' : '#3B82F6';
            ctx.fillText(flash.polarity, pt.x - 2, pt.y - 5);
          } else {
            // Intra-Cloud (IC): smaller purple/cyan pulse
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(180, 130, 255, 0.5)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#E0C8FF';
            ctx.fill();
          }
        });
        ctx.restore();
      }
    };

    render();
    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);

    return () => {
      map.off('move', render);
      map.off('zoom', render);
      map.off('resize', render);
    };
  }, [
    map,
    primaryLayer,
    overlays,
    cappiGrid,
    satelliteData,
    thunderstormRiskGrid,
    lightningRiskGrid,
    flashRateDensity,
    lightningStrokes,
    motionVectors,
    trackedCells,
    radarStations,
    geofenceZones,
  ]);

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
        zIndex: 400,
      }}
    />
  );
}

export default function Map({
  primaryLayer,
  overlays,
  cappiGrid,
  satelliteData,
  thunderstormRiskGrid,
  lightningRiskGrid,
  flashRateDensity,
  lightningStrokes,
  motionVectors,
  trackedCells,
  radarStations,
  geofenceZones,
  onSelectCell,
  isLoading,
}: MapProps) {
  const [playedRadar, setPlayedRadar] = React.useState(false);

  useEffect(() => {
    setPlayedRadar(true);
    const timer = setTimeout(() => setPlayedRadar(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: 'var(--bg-night)' }}>
      <MapContainer
        center={[22.5, 80.5]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        style={{ width: '100%', height: '100%', background: '#0A0E17' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | IMD DWR Network'
          className="dark-tiles"
          maxZoom={19}
        />
        <CanvasOverlay
          primaryLayer={primaryLayer}
          overlays={overlays}
          cappiGrid={cappiGrid}
          satelliteData={satelliteData}
          thunderstormRiskGrid={thunderstormRiskGrid}
          lightningRiskGrid={lightningRiskGrid}
          flashRateDensity={flashRateDensity}
          lightningStrokes={lightningStrokes}
          motionVectors={motionVectors}
          trackedCells={trackedCells}
          radarStations={radarStations}
          geofenceZones={geofenceZones}
          onSelectCell={onSelectCell}
        />
      </MapContainer>

      {/* Radar sweep animation */}
      {playedRadar && (
        <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden flex items-center justify-center">
          <div
            className="rounded-full"
            style={{
              width: '150vmax',
              height: '150vmax',
              background:
                'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(59,130,246,0.22) 360deg)',
              animation: 'radar-sweep 2s linear 1 forwards',
            }}
          />
        </div>
      )}
    </div>
  );
}
