'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';

interface TimeStripProps {
  value: number; // 0-180 min
  onChange: (value: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

function generateWaveformPath(width: number, height: number, markerPct: number): string {
  const midY = height / 2;
  const points: string[] = [`M 0 ${midY}`];
  const segments = 140;

  for (let i = 1; i <= segments; i++) {
    const x = (i / segments) * width;
    const pct = i / segments;
    const distToMarker = Math.abs(pct - markerPct);
    const baseAmplitude = 2.5;
    const proximityBoost = Math.max(0, 1 - distToMarker * 3.5) * 14;
    const amplitude = baseAmplitude + proximityBoost;
    
    const freq1 = Math.sin(pct * 48.7) * amplitude;
    const freq2 = Math.sin(pct * 95.3) * (amplitude * 0.45);
    const y = midY + freq1 + freq2;
    
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return points.join(' ');
}

export default function TimeStrip({
  value,
  onChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
}: TimeStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateValueFromPointer = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const rawVal = Math.round(percentage * 180);
      // Snap to nearest 5 minutes
      const snapped = Math.round(rawVal / 5) * 5;
      onChange(Math.max(0, Math.min(180, snapped)));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateValueFromPointer(e.clientX);
    },
    [updateValueFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        updateValueFromPointer(e.clientX);
      }
    },
    [isDragging, updateValueFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleStepBack = () => {
    onChange(Math.max(0, value - 5));
  };

  const handleStepForward = () => {
    onChange(Math.min(180, value + 5));
  };

  const labels = [0, 30, 60, 90, 120, 150, 180];
  const progress = value / 180;
  const waveformPath = useMemo(() => generateWaveformPath(1000, 40, progress), [progress]);

  return (
    <div
      className="w-full flex-shrink-0 flex justify-center border-t select-none font-mono"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        padding: '8px 16px 10px',
      }}
    >
      <div className="w-full max-w-6xl flex flex-col gap-1.5">
        {/* Top Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {/* Step Back button */}
            <button
              onClick={handleStepBack}
              className="px-2.5 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#EAEEF7] border border-[#2A3348] rounded transition-colors"
              title="Step -5 min"
            >
              -5m
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={onPlayPause}
              className="flex items-center gap-2 px-3.5 py-1 text-xs border border-[#2A3348] bg-[#1A2233] hover:border-[#FFC857] text-[#EAEEF7] rounded transition-colors font-bold"
            >
              {isPlaying ? (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect x="1" y="1" width="3" height="8" fill="var(--accent-flash)" />
                  <rect x="6" y="1" width="3" height="8" fill="var(--accent-flash)" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <polygon points="1,0 10,5 1,10" fill="var(--accent-flash)" />
                </svg>
              )}
              <span>{isPlaying ? 'PAUSE' : 'PLAY NOWCAST'}</span>
            </button>

            {/* Step Forward button */}
            <button
              onClick={handleStepForward}
              className="px-2.5 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#EAEEF7] border border-[#2A3348] rounded transition-colors"
              title="Step +5 min"
            >
              +5m
            </button>

            {/* Playback speed selector */}
            <div className="flex items-center bg-[#0A0E17] border border-[#2A3348] rounded p-0.5 ml-2 text-[10px]">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    playbackSpeed === s
                      ? 'bg-[#1A2233] text-[#FFC857] font-bold'
                      : 'text-[#8B95AC] hover:text-[#EAEEF7]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Time & Forecast Lead Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8B95AC] hidden sm:inline">
              LEAD TIME WINDOW: <strong className="text-[#3B82F6]">0–180 MIN</strong>
            </span>
            <div className="text-base font-bold tracking-wider text-[#FFC857] px-3 py-0.5 bg-[#0A0E17] border border-[#2A3348] rounded">
              T+{value}m NOWCAST
            </div>
          </div>
        </div>

        {/* Seismograph & Scrubber Track */}
        <div
          ref={containerRef}
          className="relative h-10 w-full cursor-pointer select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Waveform trace */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
            className="absolute inset-0"
            style={{ opacity: isDragging ? 0.7 : 0.35 }}
          >
            <path d={waveformPath} fill="none" stroke="var(--text-muted)" strokeWidth="1.2" />
          </svg>

          {/* Track baseline */}
          <div
            className="absolute top-1/2 left-0 right-0 h-px"
            style={{ background: 'var(--line)', transform: 'translateY(-50%)' }}
          />

          {/* Active track (filled portion) */}
          <div
            className="absolute top-1/2 left-0 h-px"
            style={{
              width: `${progress * 100}%`,
              background: 'var(--accent-flash)',
              transform: 'translateY(-50%)',
              boxShadow: '0 0 8px var(--accent-flash)',
            }}
          />

          {/* Tick marks */}
          {labels.map((min) => (
            <div
              key={min}
              className="absolute top-1/2"
              style={{
                left: `${(min / 180) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="w-px"
                style={{
                  height: min % 60 === 0 ? '14px' : '7px',
                  background: min <= value ? 'var(--accent-flash)' : 'var(--text-muted)',
                  opacity: min % 60 === 0 ? 0.9 : 0.45,
                }}
              />
            </div>
          ))}

          {/* Marker / Scrubber Head */}
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{
              left: `${progress * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '3.5px',
                height: '24px',
                background: 'var(--accent-flash)',
                boxShadow: `0 0 8px var(--accent-flash), 0 0 16px rgba(255,200,87,0.4)`,
              }}
            />
            {isDragging && (
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--accent-flash)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'alert-pulse 1s ease-in-out infinite',
                  opacity: 0.4,
                }}
              />
            )}
          </div>
        </div>

        {/* Labels Row */}
        <div className="flex justify-between text-[10px] text-[#8B95AC]">
          {labels.map((min) => (
            <span
              key={min}
              style={{
                color: min <= value ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: min % 60 === 0 ? 'bold' : 'normal',
              }}
            >
              {min === 0 ? 'T+0 (ANALYSIS)' : `+${min}m`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
