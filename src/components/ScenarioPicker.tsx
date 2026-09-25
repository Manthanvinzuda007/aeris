'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ScenarioPickerProps {
  activeScenario: string;
  onChange: (scenario: string) => void;
}

const SCENARIOS = [
  { id: 'afternoon_thunderstorm', label: 'AFTERNOON T-STORM', desc: 'Convective initiation over central region' },
  { id: 'squall_line', label: 'SQUALL LINE', desc: 'Fast-moving frontal boundary system' },
  { id: 'isolated_cell', label: 'ISOLATED CELL', desc: 'Single extreme severe weather event' }
];

export default function ScenarioPicker({ activeScenario, onChange }: ScenarioPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = SCENARIOS.find(s => s.id === activeScenario) || SCENARIOS[0];

  return (
    <div className="relative font-mono" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col bg-[#0A0E17] border border-[#2A3348] px-3 py-1.5 text-left min-w-[200px] hover:border-[#8B95AC] transition-colors"
      >
        <span className="text-[10px] text-[#8B95AC] uppercase tracking-widest mb-0.5">SCENARIO MODE</span>
        <div className="flex items-center justify-between">
          <span className="text-[#EAEEF7] text-sm tracking-wider">{active.label}</span>
          <svg className={`w-3 h-3 text-[#FFC857] transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#121826]/95 backdrop-blur-md border border-[#2A3348] shadow-2xl z-[1000] glass-panel flex flex-col">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                onChange(scenario.id);
                setIsOpen(false);
              }}
              className={`p-3 text-left hover:bg-[#1A2233] transition-colors border-l-2 ${
                activeScenario === scenario.id ? 'border-[#FFC857] bg-[#1A2233]/50' : 'border-transparent'
              }`}
            >
              <div className="text-[#EAEEF7] text-sm tracking-wider mb-1">{scenario.label}</div>
              <div className="text-[#8B95AC] text-[10px] uppercase leading-tight">{scenario.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
