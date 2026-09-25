'use client';

import React from 'react';

interface Alert {
  district: string;
  risk: number; // 0-100 percentage
  lat: number;
  lon: number;
}

interface AlertPanelProps {
  alerts: Alert[];
  isLoading: boolean;
}

function getRiskColor(risk: number): string {
  if (risk < 20) return '#3B82F6';
  if (risk < 40) return '#22C55E';
  if (risk < 60) return '#EAB308';
  if (risk < 80) return '#F97316';
  return '#DC2626';
}

function getRiskLabel(risk: number): string {
  if (risk < 20) return 'LOW';
  if (risk < 40) return 'MOD';
  if (risk < 60) return 'HIGH';
  if (risk < 80) return 'SEV';
  return 'EXT';
}

export default function AlertPanel({ alerts, isLoading }: AlertPanelProps) {
  const sortedAlerts = [...alerts].sort((a, b) => b.risk - a.risk);

  return (
    <div className="w-full max-h-full flex flex-col glass-panel rounded overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0"
        style={{
          borderColor: 'var(--line)',
          background: 'rgba(26, 34, 51, 0.5)',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-flash)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span
          className="text-sm tracking-widest font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          ACTIVE ALERTS
        </span>
        {!isLoading && (
          <span
            className="ml-auto text-xs"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}
          >
            {sortedAlerts.length}
          </span>
        )}
      </div>

      {/* Alert list */}
      <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1.5">
        {isLoading ? (
          <div
            className="text-center py-6 text-xs tracking-widest"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-muted)',
              animation: 'alert-pulse 1.5s ease-in-out infinite',
            }}
          >
            SCANNING...
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div
            className="text-center py-6 text-xs tracking-widest"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}
          >
            NO ACTIVE ALERTS
          </div>
        ) : (
          sortedAlerts.map((alert, idx) => {
            const color = getRiskColor(alert.risk);
            const isExtreme = alert.risk >= 90;

            return (
              <div
                key={`${alert.district}-${idx}`}
                className="p-2.5 border"
                style={{
                  borderColor: isExtreme ? `${color}66` : 'var(--line)',
                  background: isExtreme
                    ? `rgba(${alert.risk >= 90 ? '220,38,38' : '249,115,22'},0.06)`
                    : 'rgba(10, 14, 23, 0.5)',
                  animation: isExtreme ? 'alert-pulse 2s ease-in-out infinite' : 'none',
                }}
              >
                <div className="flex justify-between items-baseline">
                  <span
                    className="text-sm uppercase truncate pr-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {alert.district}
                  </span>
                  <div className="flex items-baseline gap-1.5 flex-shrink-0">
                    <span
                      className="text-[9px] tracking-wider"
                      style={{ fontFamily: 'var(--font-display)', color }}
                    >
                      {getRiskLabel(alert.risk)}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ fontFamily: 'var(--font-display)', color }}
                    >
                      {Math.round(alert.risk)}%
                    </span>
                  </div>
                </div>
                {/* Risk bar */}
                <div
                  className="h-0.5 w-full mt-1.5 overflow-hidden"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${alert.risk}%`,
                      backgroundColor: color,
                      boxShadow: isExtreme ? `0 0 4px ${color}` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
