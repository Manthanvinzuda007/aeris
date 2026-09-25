'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';

interface TimeStripProps {
  value: number; // 0-180
  onChange: (value: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

/**
 * Generates a seismograph-style waveform path.
 * The waveform is more active (higher amplitude) near the current marker position,
 * simulating "energy near the current time."
 */
function generateWaveformPath(width: number, height: number, markerPct: number): string {
  const midY = height / 2;
  const points: string[] = [`M 0 ${midY}`];
  const segments = 120;

  for (let i = 1; i <= segments; i++) {
    const x = (i / segments) * width;
    const pct = i / segments;
    
    // Higher amplitude near the marker position
    const distToMarker = Math.abs(pct - markerPct);
    const baseAmplitude = 3;
    const proximityBoost = Math.max(0, 1 - distToMarker * 4) * 12;
    const amplitude = baseAmplitude + proximityBoost;
    
    // Pseudo-random but deterministic oscillation
    const freq1 = Math.sin(pct * 47.3) * amplitude;
    const freq2 = Math.sin(pct * 91.7) * (amplitude * 0.4);
    const y = midY + freq1 + freq2;
    
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return points.join(' ');
}

export default function TimeStrip({ value, onChange, isPlaying, onPlayPause }: TimeStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateValueFromPointer = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    onChange(Math.round(percentage * 180));
  }, [onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientX);
  }, [updateValueFromPointer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      updateValueFromPointer(e.clientX);
    }
  }, [isDragging, updateValueFromPointer]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const labels = [0, 30, 60, 90, 120, 150, 180];
  const progress = value / 180;

  // Memoize waveform path since it only depends on progress
  const waveformPath = useMemo(() => generateWaveformPath(1000, 40, progress), [progress]);

  return (
    <div
      className="w-full flex-shrink-0 flex justify-center border-t"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        padding: '10px 16px 12px',
      }}
    >
      <div className="w-full max-w-5xl flex flex-col gap-1">
        {/* Top controls row */}
        <div className="flex justify-between items-center">
          <button
            onClick={onPlayPause}
            className="flex items-center gap-2 px-3 py-1 text-sm border transition-colors"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              borderColor: 'var(--line)',
              background: 'var(--surface-raised)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-flash)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
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
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>

          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }} className="text-lg font-semibold tracking-wider">
            T+{value}m
          </div>
        </div>

        {/* Seismograph track */}
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
            style={{ opacity: isDragging ? 0.6 : 0.3 }}
          >
            <path
              d={waveformPath}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.2"
            />
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
              boxShadow: '0 0 6px var(--accent-flash)',
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
                  height: min % 60 === 0 ? '12px' : '6px',
                  background: min <= value ? 'var(--accent-flash)' : 'var(--text-muted)',
                  opacity: min % 60 === 0 ? 0.8 : 0.4,
                }}
              />
            </div>
          ))}

          {/* Marker / scrubber head */}
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
                width: '3px',
                height: '24px',
                background: 'var(--accent-flash)',
                boxShadow: `0 0 8px var(--accent-flash), 0 0 16px rgba(255,200,87,0.3)`,
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

        {/* Labels row */}
        <div className="flex justify-between" style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--text-muted)' }}>
          {labels.map((min) => (
            <span key={min} style={{ color: min <= value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {min === 0 ? 'NOW' : `+${min}m`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
