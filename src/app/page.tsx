'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header, { ViewMode } from '@/components/Header';
import TimeStrip from '@/components/TimeStrip';
import AlertPanel, { AlertItem } from '@/components/AlertPanel';
import DataSourceNote from '@/components/DataSourceNote';
import LayerControlPanel, { PrimaryLayer, OverlayOptions } from '@/components/LayerControlPanel';
import CapAlertModal from '@/components/CapAlertModal';
import StormCellModal from '@/components/StormCellModal';
import ArchitectureView from '@/components/ArchitectureView';
import ValidationView from '@/components/ValidationView';
import { 
  TrackedCell, 
  LightningStroke, 
  MultiAltitudeGrid, 
  SatelliteChannels,
  GeofenceBreach 
} from '@/lib/dummyData';
import { DwrStation, GeofenceZone } from '@/lib/geo';
import { RenderableVector } from '@/lib/model';

// Leaflet dynamic import for client-only rendering
const MapView = dynamic(() => import('@/components/Map'), { ssr: false });

export default function AERISPage() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [scenario, setScenario] = useState('kalbaishakhi_norwester');

  // Meteorological Layers & Overlays
  const [primaryLayer, setPrimaryLayer] = useState<PrimaryLayer>('radar_composite');
  const [overlays, setOverlays] = useState<OverlayOptions>({
    lightningStrokes: true,
    flashRateDensity: false,
    motionVectors: true,
    trackedCells: true,
    dwrStations: true,
    geofences: true,
  });

  // Time & Playback
  const [currentTime, setCurrentTime] = useState(50); // Start at T+50m where storm is mature
  const [leadTime, setLeadTime] = useState(30);       // 30 min nowcast horizon
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data Stores
  const [cappiGrid, setCappiGrid] = useState<MultiAltitudeGrid | null>(null);
  const [satelliteData, setSatelliteData] = useState<SatelliteChannels | null>(null);
  const [thunderstormRiskGrid, setThunderstormRiskGrid] = useState<number[][] | null>(null);
  const [lightningRiskGrid, setLightningRiskGrid] = useState<number[][] | null>(null);
  const [flashRateDensity, setFlashRateDensity] = useState<number[][] | null>(null);
  const [lightningStrokes, setLightningStrokes] = useState<LightningStroke[]>([]);
  const [motionVectors, setMotionVectors] = useState<RenderableVector[]>([]);
  const [trackedCells, setTrackedCells] = useState<TrackedCell[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [geofenceBreaches, setGeofenceBreaches] = useState<GeofenceBreach[]>([]);
  const [radarStations, setRadarStations] = useState<DwrStation[]>([]);
  const [geofenceZones, setGeofenceZones] = useState<GeofenceZone[]>([]);
  const [capXml, setCapXml] = useState<string>('');
  const [scenarioTitle, setScenarioTitle] = useState<string>('Nor\'wester (Kalbaishakhi) Squall Line');

  // Modals
  const [isCapModalOpen, setIsCapModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<TrackedCell | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Overlay toggle handler
  const handleOverlayToggle = useCallback((key: keyof OverlayOptions) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Fetch all meteorological data streams
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [predictRes, dummyRes, alertsRes] = await Promise.all([
        fetch(`/api/predict?t=${currentTime}&leadTime=${leadTime}&scenario=${scenario}&layer=${primaryLayer}`),
        fetch(`/api/dummy-data?t=${currentTime}&scenario=${scenario}`),
        fetch(`/api/alerts?t=${currentTime}&scenario=${scenario}`),
      ]);

      if (predictRes.ok) {
        const predictData = await predictRes.json();
        setThunderstormRiskGrid(predictData.thunderstormRisk || null);
        setLightningRiskGrid(predictData.lightningRisk || null);
        setMotionVectors(predictData.renderableVectors || []);
      }

      if (dummyRes.ok) {
        const dummyData = await dummyRes.json();
        setCappiGrid(dummyData.cappi || null);
        setSatelliteData(dummyData.satellite || null);
        setLightningStrokes(dummyData.lightning || []);
        setFlashRateDensity(dummyData.flashRateDensity || null);
        setTrackedCells(dummyData.trackedCells || []);
        setRadarStations(dummyData.radarStations || []);
        setGeofenceZones(dummyData.geofenceZones || []);
        if (dummyData.scenarioMeta?.title) {
          setScenarioTitle(dummyData.scenarioMeta.title);
        }
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
        setGeofenceBreaches(alertsData.geofenceBreaches || []);
        if (alertsData.capXml) {
          setCapXml(alertsData.capXml);
        }
      }
    } catch (error) {
      console.error('AERIS data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTime, leadTime, scenario, primaryLayer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automated playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(400, 1500 / playbackSpeed);
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 175) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 5;
        });
      }, intervalMs);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handleTimeChange = useCallback((value: number) => {
    setCurrentTime(value);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0A0E17]">
      {/* Top Header Bar */}
      <Header
        activeView={viewMode}
        onViewChange={setViewMode}
        activeScenario={scenario}
        onScenarioChange={setScenario}
        alertCount={alerts.length}
        onOpenCapModal={() => setIsCapModalOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' && (
          <>
            {/* Map (hero, full bleed) */}
            <div className="absolute inset-0">
              <MapView
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
                onSelectCell={(cell) => setSelectedCell(cell)}
                isLoading={isLoading}
              />
            </div>

            {/* Floating Layer Control Panel (top-left) */}
            <div className="absolute top-3 left-3 z-[1000]">
              <LayerControlPanel
                primaryLayer={primaryLayer}
                onPrimaryLayerChange={setPrimaryLayer}
                overlays={overlays}
                onOverlayToggle={handleOverlayToggle}
              />
            </div>

            {/* Synoptic Scenario Info Badge (top-center) */}
            <div className="absolute top-3 left-72 z-[990] hidden md:block">
              <div className="glass-panel px-3 py-1.5 rounded-lg font-mono text-[11px] text-[#EAEEF7] flex items-center gap-2 border border-[#2A3348]">
                <span className="w-2 h-2 rounded-full bg-[#FFC857] animate-pulse" />
                <span>{scenarioTitle}</span>
                <span className="text-[#8B95AC]">•</span>
                <span className="text-[#3B82F6] font-bold">T+{currentTime}m (Lead: +{leadTime}m)</span>
              </div>
            </div>

            {/* Floating Alert Panel (top-right) */}
            <div className="absolute top-3 right-3 w-80 max-h-[calc(100%-5.5rem)] z-[1000]">
              <AlertPanel
                alerts={alerts}
                geofenceBreaches={geofenceBreaches}
                isLoading={isLoading}
                onOpenCapModal={() => setIsCapModalOpen(true)}
              />
            </div>

            {/* Data Source Note (bottom-left) */}
            <div className="absolute bottom-4 left-3 z-[1000] hidden sm:block">
              <DataSourceNote />
            </div>
          </>
        )}

        {viewMode === 'architecture' && <ArchitectureView />}

        {viewMode === 'validation' && <ValidationView />}
      </div>

      {/* Bottom Time Strip Scrubber (active when in Map view) */}
      {viewMode === 'map' && (
        <TimeStrip
          value={currentTime}
          onChange={handleTimeChange}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
        />
      )}

      {/* OASIS CAP v1.2 XML Modal */}
      <CapAlertModal
        isOpen={isCapModalOpen}
        onClose={() => setIsCapModalOpen(false)}
        capXml={capXml}
        topAlert={alerts[0]}
      />

      {/* TITAN Storm Cell Microphysics & Vertical Profile Modal */}
      <StormCellModal
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  );
}
