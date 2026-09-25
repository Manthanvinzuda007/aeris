"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import TimeStrip from "@/components/TimeStrip";
import AlertPanel from "@/components/AlertPanel";
import DataSourceNote from "@/components/DataSourceNote";

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

interface Alert {
  district: string;
  risk: number;
  lat: number;
  lon: number;
}

interface LightningFlash {
  lat: number;
  lon: number;
  intensity: number;
  timestamp: number;
}

export default function AERISPage() {
  // --- State ---
  const [scenario, setScenario] = useState("afternoon_thunderstorm");
  const [activeLayer, setActiveLayer] = useState<"thunderstorm" | "lightning">(
    "thunderstorm"
  );
  const [currentTime, setCurrentTime] = useState(60); // Start at T+60 so storm is visible
  const [leadTime, setLeadTime] = useState(30); // 30 min forecast ahead
  const [predictionGrid, setPredictionGrid] = useState<number[][] | null>(null);
  const [lightningFlashes, setLightningFlashes] = useState<LightningFlash[]>(
    []
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [predictRes, dummyRes, alertsRes] = await Promise.all([
        fetch(
          `/api/predict?t=${currentTime}&leadTime=${leadTime}&scenario=${scenario}&layer=${activeLayer}`
        ),
        fetch(`/api/dummy-data?t=${currentTime}&scenario=${scenario}`),
        fetch(`/api/alerts?t=${currentTime}&scenario=${scenario}`),
      ]);

      if (predictRes.ok) {
        const predictData = await predictRes.json();
        setPredictionGrid(predictData.grid);
      }

      if (dummyRes.ok) {
        const dummyData = await dummyRes.json();
        setLightningFlashes(dummyData.lightning || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error("AERIS data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTime, leadTime, scenario, activeLayer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Playback ---
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 170) {
            setIsPlaying(false);
            return 170;
          }
          return prev + 5;
        });
      }, 1500); // Advance 5 min every 1.5 seconds
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  const handleTimeChange = useCallback((value: number) => {
    setCurrentTime(value);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top header bar */}
      <Header
        activeScenario={scenario}
        onScenarioChange={setScenario}
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
      />

      {/* Main content: Map + Alert Panel */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map (hero, full bleed) */}
        <div className="absolute inset-0">
          <MapView
            predictionGrid={predictionGrid}
            lightningFlashes={lightningFlashes}
            currentTime={currentTime}
            isLoading={isLoading}
          />
        </div>

        {/* Floating Alert Panel (right side) */}
        <div className="absolute top-3 right-3 w-72 max-h-[calc(100%-6rem)] z-[1000]">
          <AlertPanel alerts={alerts} isLoading={isLoading} />
        </div>

        {/* Data Source Note (bottom-left) */}
        <div className="absolute bottom-16 left-3 z-[1000]">
          <DataSourceNote />
        </div>

        {/* Time readout overlay (top-left of map) */}
        <div
          className="absolute top-3 left-3 z-[1000] glass-panel rounded-lg px-4 py-2"
        >
          <div
            className="text-xs tracking-wider"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-muted)",
            }}
          >
            SIMULATION TIME
          </div>
          <div
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            T+{currentTime}m
            <span
              className="ml-3 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              → T+{currentTime + leadTime}m forecast
            </span>
          </div>
        </div>
      </div>

      {/* Bottom time strip */}
      <TimeStrip
        value={currentTime}
        onChange={handleTimeChange}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
      />
    </div>
  );
}
