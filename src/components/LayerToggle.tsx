'use client';

import React from 'react';

interface LayerToggleProps {
  activeLayer: 'thunderstorm' | 'lightning';
  onChange: (layer: 'thunderstorm' | 'lightning') => void;
}

export default function LayerToggle({ activeLayer, onChange }: LayerToggleProps) {
  return (
    <div className="flex items-center bg-[#0A0E17] border border-[#2A3348] p-1 font-mono text-xs shadow-inner">
      <button
        onClick={() => onChange('thunderstorm')}
        className={`px-3 py-1.5 transition-all duration-200 uppercase tracking-wider ${
          activeLayer === 'thunderstorm' 
            ? 'bg-[#1A2233] text-[#3B82F6] shadow-[inset_0_0_8px_rgba(59,130,246,0.2)] border border-[#3B82F6]/30'
            : 'text-[#8B95AC] hover:text-[#EAEEF7] border border-transparent'
        }`}
      >
        Thunderstorm
      </button>
      <button
        onClick={() => onChange('lightning')}
        className={`px-3 py-1.5 transition-all duration-200 uppercase tracking-wider ${
          activeLayer === 'lightning'
            ? 'bg-[#1A2233] text-[#FFC857] shadow-[inset_0_0_8px_rgba(255,200,87,0.2)] border border-[#FFC857]/30'
            : 'text-[#8B95AC] hover:text-[#EAEEF7] border border-transparent'
        }`}
      >
        Lightning
      </button>
    </div>
  );
}
