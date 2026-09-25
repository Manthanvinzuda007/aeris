'use client';

import React, { useState } from 'react';

export type PrimaryLayer = 
  | 'radar_composite'
  | 'radar_1km'
  | 'radar_3km'
  | 'radar_5km'
  | 'radar_8km'
  | 'radar_12km'
  | 'satellite_ir'
  | 'satellite_wv'
  | 'ai_thunderstorm'
  | 'ai_lightning';

export interface OverlayOptions {
  lightningStrokes: boolean;
  flashRateDensity: boolean;
  motionVectors: boolean;
  trackedCells: boolean;
  dwrStations: boolean;
  geofences: boolean;
}

interface LayerControlPanelProps {
  primaryLayer: PrimaryLayer;
  onPrimaryLayerChange: (layer: PrimaryLayer) => void;
  overlays: OverlayOptions;
  onOverlayToggle: (key: keyof OverlayOptions) => void;
}

export default function LayerControlPanel({
  primaryLayer,
  onPrimaryLayerChange,
  overlays,
  onOverlayToggle,
}: LayerControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="font-mono text-xs select-none">
      {/* Panel container */}
      <div className="glass-panel rounded-lg border border-[#2A3348] shadow-2xl overflow-hidden w-64">
        {/* Panel Header */}
        <div 
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-3 py-2 bg-[#121826]/90 border-b border-[#2A3348] cursor-pointer hover:bg-[#1A2233] transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span className="text-[11px] font-bold text-[#EAEEF7] tracking-wider uppercase">
              METEOROLOGICAL LAYERS
            </span>
          </div>
          <span className="text-[10px] text-[#8B95AC]">
            {collapsed ? '[+]' : '[-]'}
          </span>
        </div>

        {!collapsed && (
          <div className="p-3 space-y-3 bg-[#0A0E17]/90 max-h-[70vh] overflow-y-auto">
            {/* Primary Layer Selection */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B95AC]">
                Primary Field
              </span>
              <div className="mt-1 space-y-1">
                <select
                  value={primaryLayer}
                  onChange={(e) => onPrimaryLayerChange(e.target.value as PrimaryLayer)}
                  className="w-full bg-[#121826] border border-[#2A3348] text-[#EAEEF7] px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-[#3B82F6]"
                >
                  <optgroup label="Dual-Pol Doppler Radar (dBZ)">
                    <option value="radar_composite">Composite Reflectivity (CMAX)</option>
                    <option value="radar_1km">CAPPI 1 km (Surface Rain)</option>
                    <option value="radar_3km">CAPPI 3 km (Mid-Level Core)</option>
                    <option value="radar_5km">CAPPI 5 km (0°C Melting Layer)</option>
                    <option value="radar_8km">CAPPI 8 km (-20°C Charging Zone)</option>
                    <option value="radar_12km">CAPPI 12 km (Anvil Storm Top)</option>
                  </optgroup>
                  <optgroup label="INSAT-3DR Geostationary Satellite">
                    <option value="satellite_ir">TIR-1 Thermal IR (Cloud Top °C)</option>
                    <option value="satellite_wv">6.7µm Water Vapor (Moisture %)</option>
                  </optgroup>
                  <optgroup label="AI Nowcast Probability Heads">
                    <option value="ai_thunderstorm">AI Thunderstorm Probability (0–100%)</option>
                    <option value="ai_lightning">AI Lightning Probability (0–100%)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Overlays Checklist */}
            <div className="pt-2 border-t border-[#2A3348]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B95AC]">
                Map Overlays & GIS Feeds
              </span>
              <div className="mt-1.5 space-y-1.5">
                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.lightningStrokes}
                    onChange={() => onOverlayToggle('lightningStrokes')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#FFC857] focus:ring-0"
                  />
                  <span>Lightning Strokes (IC/CG)</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.flashRateDensity}
                    onChange={() => onOverlayToggle('flashRateDensity')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#FFC857] focus:ring-0"
                  />
                  <span>Flash Rate Density (FRD)</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.motionVectors}
                    onChange={() => onOverlayToggle('motionVectors')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#3B82F6] focus:ring-0"
                  />
                  <span>Storm Motion Vectors (km/h)</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.trackedCells}
                    onChange={() => onOverlayToggle('trackedCells')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#DC2626] focus:ring-0"
                  />
                  <span>TITAN Tracked Cells & Cones</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.dwrStations}
                    onChange={() => onOverlayToggle('dwrStations')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#22C55E] focus:ring-0"
                  />
                  <span>39 IMD DWR Stations (250km rings)</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] text-[#EAEEF7] cursor-pointer hover:text-[#3B82F6] transition-colors">
                  <input
                    type="checkbox"
                    checked={overlays.geofences}
                    onChange={() => onOverlayToggle('geofences')}
                    className="rounded border-[#2A3348] bg-[#121826] text-[#F97316] focus:ring-0"
                  />
                  <span>Critical Geofences (Airports/Grids)</span>
                </label>
              </div>
            </div>

            {/* Dynamic Legend */}
            <div className="pt-2 border-t border-[#2A3348] space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B95AC]">
                {primaryLayer.startsWith('radar')
                  ? 'Reflectivity Scale (dBZ)'
                  : primaryLayer === 'satellite_ir'
                  ? 'Cloud-Top Temp (°C)'
                  : primaryLayer === 'satellite_wv'
                  ? 'Water Vapor (%)'
                  : 'AI Probability (%)'}
              </span>

              {primaryLayer.startsWith('radar') && (
                <div>
                  <div className="h-2.5 w-full rounded flex overflow-hidden border border-[#2A3348]">
                    <span className="flex-1 bg-[#2878F0]" />
                    <span className="flex-1 bg-[#32C8F0]" />
                    <span className="flex-1 bg-[#28BE46]" />
                    <span className="flex-1 bg-[#F0D714]" />
                    <span className="flex-1 bg-[#F58214]" />
                    <span className="flex-1 bg-[#EB2823]" />
                    <span className="flex-1 bg-[#B41EB4]" />
                    <span className="flex-1 bg-[#FFFFFF]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8B95AC] mt-1">
                    <span>5</span>
                    <span>25</span>
                    <span>35</span>
                    <span>45</span>
                    <span>55</span>
                    <span>65+</span>
                  </div>
                </div>
              )}

              {primaryLayer === 'satellite_ir' && (
                <div>
                  <div className="h-2.5 w-full rounded flex overflow-hidden border border-[#2A3348]">
                    <span className="flex-1 bg-[#506E96]" />
                    <span className="flex-1 bg-[#3CA0DC]" />
                    <span className="flex-1 bg-[#28C88C]" />
                    <span className="flex-1 bg-[#F0C81E]" />
                    <span className="flex-1 bg-[#E63C28]" />
                    <span className="flex-1 bg-[#FAFAFA]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8B95AC] mt-1">
                    <span>-10°</span>
                    <span>-30°</span>
                    <span>-50°</span>
                    <span>-60°</span>
                    <span>-75°C</span>
                  </div>
                </div>
              )}

              {primaryLayer === 'satellite_wv' && (
                <div>
                  <div className="h-2.5 w-full rounded flex overflow-hidden border border-[#2A3348]">
                    <span className="flex-1 bg-[#3250A0]" />
                    <span className="flex-1 bg-[#1EA0D2]" />
                    <span className="flex-1 bg-[#32D2A0]" />
                    <span className="flex-1 bg-[#F0F064]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8B95AC] mt-1">
                    <span>30%</span>
                    <span>50%</span>
                    <span>70%</span>
                    <span>90%+</span>
                  </div>
                </div>
              )}

              {primaryLayer.startsWith('ai') && (
                <div>
                  <div className="h-2.5 w-full rounded flex overflow-hidden border border-[#2A3348]">
                    <span className="flex-1 bg-[#3B82F6]" />
                    <span className="flex-1 bg-[#22C55E]" />
                    <span className="flex-1 bg-[#EAB308]" />
                    <span className="flex-1 bg-[#F97316]" />
                    <span className="flex-1 bg-[#DC2626]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#8B95AC] mt-1">
                    <span>Low</span>
                    <span>Mod</span>
                    <span>High</span>
                    <span>Sev</span>
                    <span>Ext</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
