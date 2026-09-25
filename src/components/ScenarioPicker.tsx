'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ScenarioPickerProps {
  activeScenario: string;
  onChange: (scenario: string) => void;
}

const SCENARIOS = [
  { 
    id: 'kalbaishakhi_norwester', 
    label: 'NOR\'WESTER (KALBAISHAKHI)', 
    desc: 'Eastern India severe squall line with large hail & bow echo' 
  },
  { 
    id: 'western_disturbance', 
    label: 'WESTERN DISTURBANCE', 
    desc: 'Mid-latitude westerly trough over NW India, Punjab & Himalayas' 
  },
  { 
    id: 'monsoon_depression', 
    label: 'MONSOON OFFSHORE TROUGH', 
    desc: 'Intense coastal bands & orographic lifting over Western Ghats' 
  },
  { 
    id: 'afternoon_thunderstorm', 
    label: 'AFTERNOON CONVECTIVE INITIATION', 
    desc: 'Diurnal solar heating & high-CAPE severe storm in Central India' 
  }
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

  const active = SCENARIOS.find((s) => s.id === activeScenario) || SCENARIOS[0];

  return (
    <div className="relative font-mono" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col bg-[#0A0E17] border border-[#2A3348] px-3 py-1 text-left min-w-[220px] hover:border-[#8B95AC] transition-colors rounded"
      >
        <span className="text-[9px] text-[#8B95AC] uppercase tracking-widest leading-none">
          SYNOPTIC SCENARIO
        </span>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[#EAEEF7] text-xs font-semibold tracking-wider truncate pr-2">
            {active.label}
          </span>
          <svg
            className={`w-3 h-3 text-[#FFC857] flex-shrink-0 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-[#121826]/95 backdrop-blur-md border border-[#2A3348] shadow-2xl z-[1500] glass-panel flex flex-col rounded overflow-hidden">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                onChange(scenario.id);
                setIsOpen(false);
              }}
              className={`p-2.5 text-left hover:bg-[#1A2233] transition-colors border-l-2 ${
                activeScenario === scenario.id
                  ? 'border-[#FFC857] bg-[#1A2233]/60'
                  : 'border-transparent'
              }`}
            >
              <div className="text-[#EAEEF7] text-xs font-semibold tracking-wider">
                {scenario.label}
              </div>
              <div className="text-[#8B95AC] text-[10px] uppercase leading-tight mt-0.5">
                {scenario.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
