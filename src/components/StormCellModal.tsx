'use client';

import React from 'react';
import { TrackedCell, getCellVerticalProfile } from '@/lib/dummyData';

interface StormCellModalProps {
  cell: TrackedCell | null;
  onClose: () => void;
}

export default function StormCellModal({ cell, onClose }: StormCellModalProps) {
  if (!cell) return null;

  const verticalProfile = getCellVerticalProfile(cell);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#121826] border border-[#2A3348] rounded-lg shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A0E17] border-b border-[#2A3348]">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#FFC857] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0A0E17]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#EAEEF7] tracking-wider flex items-center gap-2">
                TITAN CONVECTIVE CELL INSPECTOR: {cell.id}
                <span className="text-[10px] bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40 px-2 py-0.5 rounded">
                  {cell.phase.toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] text-[#8B95AC]">
                Near {cell.nearestDistrict}, {cell.nearestState} • Coord: {cell.lat.toFixed(3)}°N, {cell.lon.toFixed(3)}°E
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B95AC] hover:text-[#EAEEF7] p-1.5 transition-colors text-lg"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0A0E17] border border-[#2A3348] rounded p-3">
              <span className="text-[10px] text-[#8B95AC] uppercase">Peak Reflectivity</span>
              <div className="text-xl font-bold text-[#FFC857] mt-0.5">{cell.maxDbz} dBZ</div>
              <span className="text-[10px] text-[#22C55E]">Severe Core Aloft</span>
            </div>
            <div className="bg-[#0A0E17] border border-[#2A3348] rounded p-3">
              <span className="text-[10px] text-[#8B95AC] uppercase">Echo Top Height</span>
              <div className="text-xl font-bold text-[#3B82F6] mt-0.5">{cell.topHeightKm} km</div>
              <span className="text-[10px] text-[#8B95AC]">Tropopause Penetrating</span>
            </div>
            <div className="bg-[#0A0E17] border border-[#2A3348] rounded p-3">
              <span className="text-[10px] text-[#8B95AC] uppercase">Severe Hail Risk</span>
              <div className="text-xl font-bold text-[#DC2626] mt-0.5">{cell.hailProb}%</div>
              <span className="text-[10px] text-[#DC2626]">Large Hail (&gt;2cm) Likely</span>
            </div>
            <div className="bg-[#0A0E17] border border-[#2A3348] rounded p-3">
              <span className="text-[10px] text-[#8B95AC] uppercase">Cell Motion</span>
              <div className="text-xl font-bold text-[#EAEEF7] mt-0.5">{cell.speedKmh} km/h</div>
              <span className="text-[10px] text-[#8B95AC]">Bearing: {cell.bearingDeg}° (ESE)</span>
            </div>
          </div>

          {/* Additional Physics Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-[#0A0E17]/60 border border-[#2A3348] rounded p-3">
            <div>
              <span className="text-[10px] text-[#8B95AC]">VERTICALLY INTEGRATED LIQUID (VIL)</span>
              <div className="text-sm font-bold text-[#EAEEF7]">{cell.vil} kg/m²</div>
            </div>
            <div>
              <span className="text-[10px] text-[#8B95AC]">ESTIMATED UPDRAFT VELOCITY (w)</span>
              <div className="text-sm font-bold text-[#22C55E]">{cell.updraftMs} m/s (~{Math.round(cell.updraftMs * 3.6)} km/h)</div>
            </div>
            <div>
              <span className="text-[10px] text-[#8B95AC]">MAX SURFACE DOWNBURST GUST</span>
              <div className="text-sm font-bold text-[#F97316]">{cell.gustSpeedKmh} km/h</div>
            </div>
          </div>

          {/* Vertical Profile & Sounding Chart */}
          <div className="border border-[#2A3348] bg-[#0A0E17] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[#EAEEF7]">
                Vertical Reflectivity Profile & Hydrometeor Microphysics
              </h4>
              <span className="text-[10px] text-[#8B95AC]">
                Section 1: Non-inductive charging zone (-15°C to -25°C)
              </span>
            </div>

            {/* Vertical levels bar representation */}
            <div className="space-y-1.5 pt-2">
              {verticalProfile.map((level) => {
                const isFreezing = level.altitudeKm === 5;
                const isCharging = level.altitudeKm === 8;

                return (
                  <div key={level.altitudeKm} className="flex items-center gap-3">
                    <span className="w-14 text-right text-[11px] text-[#8B95AC]">
                      {level.altitudeKm} km
                    </span>

                    {/* Bar container */}
                    <div className="flex-1 bg-[#1A2233] h-4 rounded overflow-hidden relative">
                      {/* Highlight zones */}
                      {isFreezing && (
                        <div className="absolute inset-0 bg-[#3B82F6]/20 border border-[#3B82F6]/40 pointer-events-none" />
                      )}
                      {isCharging && (
                        <div className="absolute inset-0 bg-[#FFC857]/20 border border-[#FFC857]/40 pointer-events-none" />
                      )}

                      <div
                        className="h-full transition-all duration-300 rounded"
                        style={{
                          width: `${Math.min(100, (level.dbz / 70) * 100)}%`,
                          background: level.dbz >= 55 ? '#DC2626' : level.dbz >= 45 ? '#F97316' : level.dbz >= 35 ? '#EAB308' : '#3B82F6',
                        }}
                      />
                    </div>

                    <span className="w-14 text-xs font-bold text-[#EAEEF7]">
                      {level.dbz} dBZ
                    </span>

                    <span className="w-24 text-[10px] text-[#8B95AC] truncate">
                      {level.hydrometeor}
                    </span>

                    <span className="w-28 text-[10px] text-[#8B95AC]">
                      Zdr: {level.zdr} | ρhv: {level.rhoHv}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2A3348] text-[10px] text-[#8B95AC]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Freezing Level (0°C ~5km): Bright Band
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FFC857]" /> Non-Inductive Charging (-15°C to -25°C ~8km): Graupel Collisions
              </span>
            </div>
          </div>

          {/* Forecast Trajectory Cones */}
          <div className="border border-[#2A3348] bg-[#0A0E17] rounded-lg p-4 space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-[#EAEEF7]">
              Advective Extrapolation Cone (TITAN / SCIT Forecast)
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {cell.projectedTrack.map((track) => (
                <div key={track.minutes} className="bg-[#121826] p-2.5 rounded border border-[#2A3348]">
                  <div className="text-[10px] text-[#3B82F6] font-bold">T+{track.minutes} MINUTES FORECAST</div>
                  <div className="text-xs text-[#EAEEF7] mt-1">
                    Lat: {track.lat.toFixed(3)}°N
                  </div>
                  <div className="text-xs text-[#EAEEF7]">
                    Lon: {track.lon.toFixed(3)}°E
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#0A0E17] border-t border-[#2A3348] text-[11px] text-[#8B95AC]">
          <div>AERIS Convective Tracking Module • Algorithm: TITAN/SCIT-3D Hybrid</div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#EAEEF7] border border-[#2A3348] rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
