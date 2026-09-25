'use client';

import React, { useState } from 'react';
import { ImdAlertLevel, getImdAlertBadge } from '@/lib/geo';
import { GeofenceBreach } from '@/lib/dummyData';

export interface AlertItem {
  district: string;
  state: string;
  risk: number; // 0-100 percentage
  imdLevel: ImdAlertLevel;
  lat: number;
  lon: number;
  maxDbz: number;
  hailProb: number;
  gustKmh: number;
  etaMinutes: number;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  geofenceBreaches: GeofenceBreach[];
  isLoading: boolean;
  onOpenCapModal: () => void;
  onSelectDistrict?: (lat: number, lon: number) => void;
}

export default function AlertPanel({
  alerts,
  geofenceBreaches,
  isLoading,
  onOpenCapModal,
  onSelectDistrict,
}: AlertPanelProps) {
  const [activeTab, setActiveTab] = useState<'districts' | 'geofences'>('districts');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterLevel === 'ALL') return true;
    return a.imdLevel === filterLevel;
  });

  const redCount = alerts.filter((a) => a.imdLevel === 'RED').length;
  const orangeCount = alerts.filter((a) => a.imdLevel === 'ORANGE').length;
  const yellowCount = alerts.filter((a) => a.imdLevel === 'YELLOW').length;

  return (
    <div className="w-full max-h-full flex flex-col glass-panel rounded-lg border border-[#2A3348] shadow-2xl overflow-hidden font-mono text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#121826]/90 border-b border-[#2A3348]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-3 h-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping opacity-75" />
            <div className="absolute w-2 h-2 rounded-full bg-[#DC2626]" />
          </div>
          <span className="text-[11px] font-bold text-[#EAEEF7] tracking-wider uppercase">
            IMD NOWCAST WARNINGS
          </span>
        </div>

        <button
          onClick={onOpenCapModal}
          className="px-2 py-0.5 bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#DC2626] border border-[#DC2626]/50 rounded text-[10px] font-bold transition-colors flex items-center gap-1"
          title="Open OASIS CAP v1.2 XML Alert Dissemination Engine"
        >
          <span>CAP v1.2</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center border-b border-[#2A3348] bg-[#0A0E17]/80 text-[11px]">
        <button
          onClick={() => setActiveTab('districts')}
          className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
            activeTab === 'districts'
              ? 'border-[#3B82F6] text-[#3B82F6] font-bold bg-[#1A2233]/40'
              : 'border-transparent text-[#8B95AC] hover:text-[#EAEEF7]'
          }`}
        >
          Districts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('geofences')}
          className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
            activeTab === 'geofences'
              ? 'border-[#F97316] text-[#F97316] font-bold bg-[#1A2233]/40'
              : 'border-transparent text-[#8B95AC] hover:text-[#EAEEF7]'
          }`}
        >
          Geofences ({geofenceBreaches.length})
        </button>
      </div>

      {/* Filter Badges (for districts) */}
      {activeTab === 'districts' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0E17] border-b border-[#2A3348] text-[9px]">
          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-2 py-0.5 rounded ${
              filterLevel === 'ALL'
                ? 'bg-[#1A2233] text-[#EAEEF7] border border-[#3B82F6]'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            ALL ({alerts.length})
          </button>
          <button
            onClick={() => setFilterLevel('RED')}
            className={`px-2 py-0.5 rounded ${
              filterLevel === 'RED'
                ? 'bg-[#DC2626]/30 text-[#DC2626] border border-[#DC2626]'
                : 'text-[#DC2626]/70 hover:text-[#DC2626]'
            }`}
          >
            RED ({redCount})
          </button>
          <button
            onClick={() => setFilterLevel('ORANGE')}
            className={`px-2 py-0.5 rounded ${
              filterLevel === 'ORANGE'
                ? 'bg-[#F97316]/30 text-[#F97316] border border-[#F97316]'
                : 'text-[#F97316]/70 hover:text-[#F97316]'
            }`}
          >
            ORANGE ({orangeCount})
          </button>
          <button
            onClick={() => setFilterLevel('YELLOW')}
            className={`px-2 py-0.5 rounded ${
              filterLevel === 'YELLOW'
                ? 'bg-[#EAB308]/30 text-[#EAB308] border border-[#EAB308]'
                : 'text-[#EAB308]/70 hover:text-[#EAB308]'
            }`}
          >
            YELLOW ({yellowCount})
          </button>
        </div>
      )}

      {/* Alert List Body */}
      <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[calc(100vh-280px)]">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-[#8B95AC] animate-pulse">
            SCANNING DWR RADAR GRIDS...
          </div>
        ) : activeTab === 'districts' ? (
          filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8B95AC]">
              NO ACTIVE NOWCAST WARNINGS
            </div>
          ) : (
            filteredAlerts.map((alert, idx) => {
              const badge = getImdAlertBadge(alert.imdLevel);

              return (
                <div
                  key={`${alert.district}-${idx}`}
                  onClick={() => onSelectDistrict?.(alert.lat, alert.lon)}
                  className="p-2.5 bg-[#0A0E17]/90 border rounded hover:border-[#3B82F6] transition-colors cursor-pointer space-y-1.5"
                  style={{
                    borderColor: alert.imdLevel === 'RED' ? 'rgba(220,38,38,0.5)' : '#2A3348',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#EAEEF7]">
                          {alert.district}
                        </span>
                        <span className="text-[10px] text-[#8B95AC]">
                          ({alert.state})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                          style={{
                            color: badge.color,
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.text}
                        </span>
                        <span className="text-[10px] text-[#8B95AC]">
                          ETA ~{alert.etaMinutes}m
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: badge.color }}>
                        {alert.risk}%
                      </span>
                    </div>
                  </div>

                  {/* Physical metrics row */}
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#2A3348]/60 text-[10px] text-[#8B95AC]">
                    <div>
                      <span>Core: </span>
                      <strong className="text-[#FFC857]">{alert.maxDbz} dBZ</strong>
                    </div>
                    <div>
                      <span>Hail: </span>
                      <strong className="text-[#DC2626]">{alert.hailProb}%</strong>
                    </div>
                    <div>
                      <span>Gust: </span>
                      <strong className="text-[#F97316]">{alert.gustKmh} km/h</strong>
                    </div>
                  </div>

                  {/* Risk gauge bar */}
                  <div className="h-1 w-full bg-[#1A2233] rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-300 rounded"
                      style={{
                        width: `${alert.risk}%`,
                        backgroundColor: badge.color,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Geofence Breaches List */
          geofenceBreaches.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8B95AC]">
              NO CRITICAL GEOFENCE PROXIMITIES
            </div>
          ) : (
            geofenceBreaches.map((geo, idx) => (
              <div
                key={`${geo.zoneId}-${idx}`}
                className="p-2.5 bg-[#0A0E17]/90 border border-[#2A3348] rounded space-y-1.5"
                style={{
                  borderColor: geo.status === 'Breached' ? '#DC2626' : '#F97316',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#EAEEF7] flex items-center gap-1.5">
                      ⌖ {geo.zoneName}
                    </span>
                    <span className="text-[10px] text-[#8B95AC]">
                      Tracking Cell: {geo.stormId} ({geo.maxDbz} dBZ)
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      geo.status === 'Breached'
                        ? 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]'
                        : 'bg-[#F97316]/20 text-[#F97316] border border-[#F97316]'
                    }`}
                  >
                    {geo.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#8B95AC] pt-1 border-t border-[#2A3348]">
                  <span>Dist: {geo.distanceKm} km</span>
                  <span>{geo.etaMinutes === 0 ? 'IMPACT NOW' : `ETA: ~${geo.etaMinutes} min`}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-2 bg-[#0A0E17] border-t border-[#2A3348] flex items-center justify-between">
        <span className="text-[10px] text-[#8B95AC]">IMD Standard Alert Protocol</span>
        <button
          onClick={onOpenCapModal}
          className="px-2.5 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#3B82F6] border border-[#3B82F6]/40 rounded text-[10px] font-bold transition-colors"
        >
          View Full CAP XML
        </button>
      </div>
    </div>
  );
}
