'use client';

import React from 'react';
import ScenarioPicker from './ScenarioPicker';

export type ViewMode = 'map' | 'architecture' | 'validation';

interface HeaderProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  activeScenario: string;
  onScenarioChange: (s: string) => void;
  alertCount: number;
  onOpenCapModal: () => void;
}

export default function Header({
  activeView,
  onViewChange,
  activeScenario,
  onScenarioChange,
  alertCount,
  onOpenCapModal,
}: HeaderProps) {
  return (
    <header className="w-full bg-[#121826] border-b border-[#2A3348] px-4 py-2.5 flex flex-wrap items-center justify-between z-[700] relative font-mono text-xs gap-3">
      {/* Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Animated Radar Antenna Logo */}
          <div className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 border-2 border-[#3B82F6] rounded-full opacity-30" />
            <div className="absolute w-full h-full border border-[#3B82F6] rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="w-2 h-2 bg-[#FFC857] rounded-full shadow-[0_0_8px_#FFC857]" />
            <div className="absolute top-1/2 left-1/2 w-[150%] h-[1.5px] bg-gradient-to-r from-[#3B82F6] to-transparent origin-left animate-[spin_3s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-2xl font-bold text-[#EAEEF7] tracking-tighter leading-none">
                AERIS
              </h1>
              <span className="text-[9px] bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] px-1.5 py-0.2 rounded font-semibold">
                IMD v2.4
              </span>
            </div>
            <p className="font-sans text-[10px] text-[#8B95AC] tracking-widest uppercase mt-0.5">
              AI-Enabled Real-time Intelligence for Storms
            </p>
          </div>
        </div>

        <div className="h-7 w-px bg-[#2A3348] hidden lg:block" />

        {/* View Switcher Tabs */}
        <div className="hidden sm:flex items-center bg-[#0A0E17] border border-[#2A3348] p-0.5 rounded">
          <button
            onClick={() => onViewChange('map')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              activeView === 'map'
                ? 'bg-[#1A2233] text-[#3B82F6] font-semibold border border-[#3B82F6]/40 shadow-sm'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            <span>GIS Nowcast</span>
          </button>
          <button
            onClick={() => onViewChange('architecture')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              activeView === 'architecture'
                ? 'bg-[#1A2233] text-[#FFC857] font-semibold border border-[#FFC857]/40 shadow-sm'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            <span>AI Architecture</span>
          </button>
          <button
            onClick={() => onViewChange('validation')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              activeView === 'validation'
                ? 'bg-[#1A2233] text-[#22C55E] font-semibold border border-[#22C55E]/40 shadow-sm'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            <span>Model Skill</span>
          </button>
        </div>
      </div>

      {/* Middle: Scenario Picker */}
      <div className="flex items-center gap-3">
        <ScenarioPicker activeScenario={activeScenario} onChange={onScenarioChange} />
      </div>

      {/* Right: Telemetry Badges & CAP Alert Action */}
      <div className="flex items-center gap-3">
        {/* Telemetry Pills */}
        <div className="hidden xl:flex items-center gap-2 text-[10px]">
          <div className="px-2 py-1 bg-[#0A0E17] border border-[#2A3348] rounded text-[#8B95AC] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            <span>DWR: 39/39 Live</span>
          </div>
          <div className="px-2 py-1 bg-[#0A0E17] border border-[#2A3348] rounded text-[#8B95AC] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span>INSAT-3DR: 15m</span>
          </div>
          <div className="px-2 py-1 bg-[#0A0E17] border border-[#2A3348] rounded text-[#8B95AC] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC857]" />
            <span>Triton: 31ms</span>
          </div>
        </div>

        {/* CAP XML Button */}
        <button
          onClick={onOpenCapModal}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#DC2626] border border-[#DC2626]/60 rounded text-xs font-bold transition-colors shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
          </span>
          <span>CAP v1.2 ALERTS</span>
          {alertCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#DC2626] text-white rounded text-[10px]">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
