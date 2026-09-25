'use client';

import React from 'react';
import ScenarioPicker from './ScenarioPicker';
import LayerToggle from './LayerToggle';

interface HeaderProps {
  activeScenario: string;
  onScenarioChange: (s: string) => void;
  activeLayer: 'thunderstorm' | 'lightning';
  onLayerChange: (l: 'thunderstorm' | 'lightning') => void;
}

export default function Header({ activeScenario, onScenarioChange, activeLayer, onLayerChange }: HeaderProps) {
  return (
    <header className="w-full bg-[#121826] border-b border-[#2A3348] px-4 py-3 flex items-center justify-between z-[700] relative">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-6 h-6">
            <div className="absolute inset-0 border-2 border-[#3B82F6] rounded-full opacity-30" />
            <div className="absolute w-full h-full border border-[#3B82F6] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="w-1.5 h-1.5 bg-[#FFC857] rounded-full" />
            <div className="absolute top-1/2 left-1/2 w-[150%] h-[1px] bg-gradient-to-r from-[#3B82F6] to-transparent origin-left animate-[spin_3s_linear_infinite]" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-semibold text-[#EAEEF7] tracking-tighter leading-none">AERIS</h1>
            <p className="font-sans text-[10px] text-[#8B95AC] tracking-widest uppercase mt-0.5">AI-Enabled Real-time Intelligence for Storms</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-[#2A3348] mx-2 hidden md:block" />
        
        <div className="hidden md:block">
          <ScenarioPicker activeScenario={activeScenario} onChange={onScenarioChange} />
        </div>
      </div>

      <div className="flex items-center">
        <LayerToggle activeLayer={activeLayer} onChange={onLayerChange} />
      </div>
    </header>
  );
}
