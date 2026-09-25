'use client';

import React, { useState } from 'react';

interface CapAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  capXml: string;
  topAlert?: {
    district: string;
    state: string;
    risk: number;
    maxDbz: number;
    hailProb: number;
    gustKmh: number;
  };
}

export default function CapAlertModal({ isOpen, onClose, capXml, topAlert }: CapAlertModalProps) {
  const [copied, setCopied] = useState(false);
  const [sachetSent, setSachetSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'xml'>('preview');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(capXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([capXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AERIS_IMD_CAP_ALERT_${Date.now()}.cap.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerSachet = () => {
    setSachetSent(true);
    setTimeout(() => setSachetSent(false), 3000);
  };

  const triggerSms = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#121826] border border-[#2A3348] rounded-lg shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A0E17] border-b border-[#2A3348]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#DC2626] animate-pulse" />
            <div>
              <h2 className="text-base font-bold text-[#EAEEF7] tracking-wider flex items-center gap-2">
                OASIS CAP v1.2 ALERT DISSEMINATION ENGINE
                <span className="text-[10px] bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40 px-2 py-0.5 rounded">
                  IMD STANDARD
                </span>
              </h2>
              <p className="text-[11px] text-[#8B95AC]">
                Common Alerting Protocol (ITU-T X.1303 / OASIS CAP v1.2) Specification for SACHET & SMS Gateways
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

        {/* Tab switcher */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#161D2E] border-b border-[#2A3348] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'preview'
                  ? 'bg-[#1A2233] text-[#3B82F6] border border-[#3B82F6]/50'
                  : 'text-[#8B95AC] hover:text-[#EAEEF7]'
              }`}
            >
              Emergency Broadcast Preview
            </button>
            <button
              onClick={() => setActiveTab('xml')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'xml'
                  ? 'bg-[#1A2233] text-[#FFC857] border border-[#FFC857]/50'
                  : 'text-[#8B95AC] hover:text-[#EAEEF7]'
              }`}
            >
              Raw CAP XML (v1.2)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#EAEEF7] border border-[#2A3348] rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <span>{copied ? '✓ Copied' : 'Copy XML'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-[#1A2233] hover:bg-[#2A3348] text-[#EAEEF7] border border-[#2A3348] rounded text-xs transition-colors flex items-center gap-1.5"
            >
              <span>Download .cap.xml</span>
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* Alert Card */}
              <div className="border border-[#DC2626]/40 bg-[#DC2626]/10 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#DC2626] bg-[#DC2626]/20 px-2 py-0.5 rounded">
                      IMD SEVERE WEATHER NOWCAST ALERT (RED LEVEL)
                    </span>
                    <h3 className="text-lg font-bold text-[#EAEEF7] mt-1">
                      Severe Thunderstorm, Damaging Hail & Lightning Warning
                    </h3>
                    <p className="text-xs text-[#8B95AC]">
                      Target Area: {topAlert ? `${topAlert.district} District, ${topAlert.state}` : 'Eastern Convective Corridor'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#8B95AC]">Certainty:</span>
                    <div className="text-sm font-bold text-[#22C55E]">OBSERVED / LIKELY (92%)</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#DC2626]/20 text-xs">
                  <div className="bg-[#0A0E17]/60 p-2 rounded border border-[#2A3348]">
                    <div className="text-[10px] text-[#8B95AC]">MAX REFLECTIVITY</div>
                    <div className="text-sm font-bold text-[#FFC857]">{topAlert?.maxDbz || 64} dBZ</div>
                  </div>
                  <div className="bg-[#0A0E17]/60 p-2 rounded border border-[#2A3348]">
                    <div className="text-[10px] text-[#8B95AC]">HAIL PROBABILITY</div>
                    <div className="text-sm font-bold text-[#DC2626]">{topAlert?.hailProb || 82}%</div>
                  </div>
                  <div className="bg-[#0A0E17]/60 p-2 rounded border border-[#2A3348]">
                    <div className="text-[10px] text-[#8B95AC]">ESTIMATED GUSTS</div>
                    <div className="text-sm font-bold text-[#F97316]">{topAlert?.gustKmh || 85} km/h</div>
                  </div>
                  <div className="bg-[#0A0E17]/60 p-2 rounded border border-[#2A3348]">
                    <div className="text-[10px] text-[#8B95AC]">LEAD TIME WINDOW</div>
                    <div className="text-sm font-bold text-[#3B82F6]">0–180 Minutes</div>
                  </div>
                </div>

                <div className="text-xs text-[#EAEEF7]/90 leading-relaxed bg-[#0A0E17]/40 p-3 rounded border border-[#2A3348]">
                  <strong>PUBLIC SAFETY INSTRUCTION:</strong> Intense convective cell moving rapidly towards populated district center. Severe cloud-to-ground lightning flashes and microburst wind gusts expected. Move immediately indoors away from windows, tin roofs, and tall trees. Cease open ground agricultural and construction operations.
                </div>
              </div>

              {/* Broadcast Simulation Triggers */}
              <div className="border border-[#2A3348] bg-[#0A0E17] rounded-lg p-4 space-y-3">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#EAEEF7]">
                  National Early Warning Dissemination Channels
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#121826] border border-[#2A3348] rounded flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-[#3B82F6]">NDMA SACHET Platform Push</div>
                      <p className="text-[11px] text-[#8B95AC] mt-1">
                        Pushes CAP v1.2 XML payload via HTTPS webhook to National Disaster Management Authority Sachet portal.
                      </p>
                    </div>
                    <button
                      onClick={triggerSachet}
                      className="mt-3 w-full py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded font-medium transition-colors"
                    >
                      {sachetSent ? '✓ Broadcast Payload Dispatched!' : 'Simulate NDMA SACHET Push'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#121826] border border-[#2A3348] rounded flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-[#FFC857]">Telecom Cell Broadcast / SMS Gateway</div>
                      <p className="text-[11px] text-[#8B95AC] mt-1">
                        Triggers geofenced emergency SMS broadcast to mobile base transceiver stations (BTS) in affected districts.
                      </p>
                    </div>
                    <button
                      onClick={triggerSms}
                      className="mt-3 w-full py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold rounded transition-colors"
                    >
                      {smsSent ? '✓ Geofenced SMS Alert Triggered!' : 'Simulate Telecom Cell Broadcast'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-[#0A0E17] border border-[#2A3348] rounded text-xs text-[#22C55E] overflow-x-auto whitespace-pre font-mono leading-relaxed">
                {capXml}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#0A0E17] border-t border-[#2A3348] text-[11px] text-[#8B95AC]">
          <div>AERIS Operational CAP Engine • Specification OASIS CAP v1.2 / ITU-T X.1303</div>
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
