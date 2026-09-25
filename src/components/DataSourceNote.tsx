'use client';

import React, { useState } from 'react';

export default function DataSourceNote() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="font-mono text-[10px] text-[#8B95AC] glass-panel p-2.5 max-w-sm rounded-lg border border-[#2A3348] shadow-lg">
      <div className="flex items-start gap-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-[#FFC857] hover:text-[#EAEEF7] mt-0.5 font-bold"
          aria-label="Toggle details"
        >
          {expanded ? '[-]' : '[+]'}
        </button>
        <div>
          <span className="text-[#EAEEF7] font-bold uppercase tracking-wider">OPERATIONAL DATA FUSION</span> — Physical multimodal stream simulator mirroring IMD DWR, INSAT-3DR, IITM Lightning, and NCUM NWP systems.
        </div>
      </div>
      
      {expanded && (
        <div className="mt-2 pl-4 space-y-1.5 text-[#8B95AC] border-t border-[#2A3348]/60 pt-2 text-[9px]">
          <div>
            <strong className="text-[#3B82F6]">RADAR:</strong> 39 IMD DWR Volumetric Polar Scans (Z_H, Z_DR, K_DP, ρ_HV), Z-PHI Attenuation Correction, 16-level CAPPI gridding via Py-ART.
          </div>
          <div>
            <strong className="text-[#FFC857]">SATELLITE:</strong> INSAT-3DR Geostationary Imager (TIR-1 10.8µm Cloud Top Temp, 6.7µm Water Vapor moisture plumes) via SatPy calibration.
          </div>
          <div>
            <strong className="text-[#DC2626]">LIGHTNING:</strong> IITM & Earth Networks Flash Rate Density (FRD), IC (intra-cloud) & CG (cloud-to-ground) stroke polarity & kA.
          </div>
          <div>
            <strong className="text-[#22C55E]">NWP BOUNDARY:</strong> NCUM 4km & WRF-India Convective Indices (CAPE &gt;3500 J/kg, 0-6km Bulk Wind Shear, CIN, PWAT).
          </div>
        </div>
      )}
    </div>
  );
}
