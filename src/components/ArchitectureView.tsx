'use client';

import React, { useState } from 'react';

export default function ArchitectureView() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'pipeline' | 'losses'>('architecture');

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0A0E17] text-[#EAEEF7] p-6 font-mono space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#2A3348] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] text-xs font-bold rounded">
              SPECIFICATION COMPLIANT
            </span>
            <span className="text-xs text-[#8B95AC]">Sections 3 & 4: Deep Research Technical Architecture</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#EAEEF7] mt-1">
            Multimodal Spatio-Temporal AI Architecture & Operational Pipeline
          </h1>
          <p className="text-xs text-[#8B95AC] max-w-3xl mt-1">
            Hybrid 3D-CNN, Space-Time Transformer (Earthformer) & PhyDNet physics-guided advection engine for 0–180 minute severe thunderstorm and lightning nowcasting.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-[#121826] border border-[#2A3348] p-1 rounded text-xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'architecture'
                ? 'bg-[#1A2233] text-[#3B82F6] border border-[#3B82F6]/40'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            Neural Architecture
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-[#1A2233] text-[#FFC857] border border-[#FFC857]/40'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            Production Data Pipeline
          </button>
          <button
            onClick={() => setActiveTab('losses')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'losses'
                ? 'bg-[#1A2233] text-[#22C55E] border border-[#22C55E]/40'
                : 'text-[#8B95AC] hover:text-[#EAEEF7]'
            }`}
          >
            Loss Functions & Regularizers
          </button>
        </div>
      </div>

      {/* Tab 1: Neural Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Architecture Diagram */}
          <div className="p-6 bg-[#121826] border border-[#2A3348] rounded-lg">
            <h2 className="text-sm font-bold text-[#EAEEF7] tracking-wider uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              Model Paradigm & Cross-Attention Multimodal Fusion (Section 3.1–3.3)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Modality 1: Radar */}
              <div className="p-4 bg-[#0A0E17] border border-[#3B82F6]/40 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#3B82F6]">1. DUAL-POL DOPPLER RADAR</div>
                  <div className="text-[10px] text-[#8B95AC] mt-1">39 IMD DWR Network</div>
                  <div className="mt-3 p-2 bg-[#161D2E] rounded text-[11px] space-y-1">
                    <div><strong>Input:</strong> X_radar</div>
                    <div className="text-[#3B82F6] font-mono text-[10px]">[B, T_in, 5, 16, 512, 512]</div>
                    <div className="text-[10px] text-[#8B95AC]">Moments: Z_H, Z_DR, K_DP, ρ_HV, V</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#2A3348] text-[10px] text-[#EAEEF7]">
                  <strong>Encoder:</strong> 3D-CNN + 3D ConvLSTM (downsamples to [B, D, 8, 128, 128])
                </div>
              </div>

              {/* Modality 2: Satellite */}
              <div className="p-4 bg-[#0A0E17] border border-[#FFC857]/40 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#FFC857]">2. GEOSTATIONARY SATELLITE</div>
                  <div className="text-[10px] text-[#8B95AC] mt-1">INSAT-3D / 3DR / 3DS</div>
                  <div className="mt-3 p-2 bg-[#161D2E] rounded text-[11px] space-y-1">
                    <div><strong>Input:</strong> X_sat</div>
                    <div className="text-[#FFC857] font-mono text-[10px]">[B, T_in, 6, 512, 512]</div>
                    <div className="text-[10px] text-[#8B95AC]">Bands: TIR-1, TIR-2, WV, VIS, CTT</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#2A3348] text-[10px] text-[#EAEEF7]">
                  <strong>Encoder:</strong> 2D ResNet-34 Feature Extractor (downsamples to [B, D, 128, 128])
                </div>
              </div>

              {/* Modality 3: Lightning */}
              <div className="p-4 bg-[#0A0E17] border border-[#DC2626]/40 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#DC2626]">3. LIGHTNING LOCATION NET</div>
                  <div className="text-[10px] text-[#8B95AC] mt-1">IITM, DAMINI & Earth Networks</div>
                  <div className="mt-3 p-2 bg-[#161D2E] rounded text-[11px] space-y-1">
                    <div><strong>Input:</strong> X_light</div>
                    <div className="text-[#DC2626] font-mono text-[10px]">[B, T_in, 3, 512, 512]</div>
                    <div className="text-[10px] text-[#8B95AC]">Channels: IC-FRD, CG-FRD, Peak kA</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#2A3348] text-[10px] text-[#EAEEF7]">
                  <strong>Encoder:</strong> Spatio-Temporal 2D-CNN Point-Kernel Extractor
                </div>
              </div>

              {/* Modality 4: NWP */}
              <div className="p-4 bg-[#0A0E17] border border-[#22C55E]/40 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#22C55E]">4. NUMERICAL WEATHER (NWP)</div>
                  <div className="text-[10px] text-[#8B95AC] mt-1">NCUM 4km / WRF-India GRIB2</div>
                  <div className="mt-3 p-2 bg-[#161D2E] rounded text-[11px] space-y-1">
                    <div><strong>Input:</strong> X_nwp</div>
                    <div className="text-[#22C55E] font-mono text-[10px]">[B, 10, 512, 512]</div>
                    <div className="text-[10px] text-[#8B95AC]">CAPE, Shear 0-6km, CIN, PWAT, θ_e</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#2A3348] text-[10px] text-[#EAEEF7]">
                  <strong>Encoder:</strong> Environmental Context Projection (1x1 Conv + Sinusoidal Pos)
                </div>
              </div>
            </div>

            {/* Fusion & Core Section */}
            <div className="mt-4 p-4 bg-[#161D2E] border border-[#2A3348] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EAEEF7]">
                  CROSS-MODAL ATTENTION FUSION LAYER (d_q = 64)
                </span>
                <span className="text-[10px] text-[#8B95AC]">Multi-Head Cross Attention (H=8, d_k=64)</span>
              </div>
              <p className="text-xs text-[#8B95AC] leading-relaxed">
                Queries from Radar feature maps attend to Keys & Values in concatenated [Satellite, Lightning, NWP] representations. Captures rapid convective initiation when high CAPE, cold satellite tops, and lightning bursts align before radar echo intensification.
              </p>
            </div>

            {/* Spatio-Temporal Core & Decoders */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0A0E17] border border-[#2A3348] rounded-lg">
                <div className="text-xs font-bold text-[#3B82F6]">SPATIO-TEMPORAL CORE</div>
                <div className="text-[11px] text-[#EAEEF7] mt-1 font-semibold">Earthformer + PhyDNet PhyCell</div>
                <p className="text-[10px] text-[#8B95AC] mt-2 leading-relaxed">
                  Cuboid self-attention transformer models long-range storm advection. A parallel PhyCell branch enforces soft mass conservation: <strong>∂u/∂x + ∂v/∂y ≈ 0</strong>.
                </p>
              </div>

              <div className="p-4 bg-[#0A0E17] border border-[#3B82F6]/30 rounded-lg">
                <div className="text-xs font-bold text-[#3B82F6]">HEAD A: 3D REFLECTIVITY DECODER</div>
                <div className="text-[11px] text-[#EAEEF7] mt-1 font-semibold">3D Transpose Conv Decoder</div>
                <div className="mt-2 text-[10px] text-[#8B95AC] space-y-1">
                  <div><strong>Output:</strong> Y_radar ∈ R^[B, 36, 1, 16, 512, 512]</div>
                  <div>36 Lead Timesteps (0 to 180 min at 5-min intervals)</div>
                  <div>16 Constant-Altitude CAPPI slices (0 to 15 km)</div>
                </div>
              </div>

              <div className="p-4 bg-[#0A0E17] border border-[#FFC857]/30 rounded-lg">
                <div className="text-xs font-bold text-[#FFC857]">HEAD B: LIGHTNING RISK DECODER</div>
                <div className="text-[11px] text-[#EAEEF7] mt-1 font-semibold">2D Transpose Conv Decoder</div>
                <div className="mt-2 text-[10px] text-[#8B95AC] space-y-1">
                  <div><strong>Output:</strong> Y_light ∈ R^[B, 36, 2, 512, 512]</div>
                  <div>Logistic Logits: Pr(IC strike ≥ 1) & Pr(CG strike ≥ 1)</div>
                  <div>Flash Rate Density (FRD) per 1 km² per 15 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Production Data Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#121826] border border-[#2A3348] rounded-lg space-y-6">
            <h2 className="text-sm font-bold text-[#EAEEF7] tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFC857]" />
              End-to-End Operational Pipeline & Latency Budget (Section 4)
            </h2>

            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-[#0A0E17] border border-[#2A3348] rounded">
                <div className="text-[10px] text-[#3B82F6] font-bold">STAGE 1: INGESTION</div>
                <div className="text-xs font-bold text-[#EAEEF7] mt-1">Kafka Ingest Broker</div>
                <div className="text-[10px] text-[#8B95AC] mt-2 space-y-1">
                  <div>• HDF5 / UF DWR Broadcast</div>
                  <div>• INSAT LRIT / HRIT Stream</div>
                  <div>• Lightning Microsecond UDP</div>
                  <div>• Latency: ~12s</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0E17] border border-[#2A3348] rounded">
                <div className="text-[10px] text-[#3B82F6] font-bold">STAGE 2: PREPROCESS</div>
                <div className="text-xs font-bold text-[#EAEEF7] mt-1">Py-ART & SatPy Worker</div>
                <div className="text-[10px] text-[#8B95AC] mt-2 space-y-1">
                  <div>• Z-PHI Attenuation Corr</div>
                  <div>• Velocity Dealiasing</div>
                  <div>• Parallax & Grid Reprojection</div>
                  <div>• Latency: ~14s</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0E17] border border-[#2A3348] rounded">
                <div className="text-[10px] text-[#3B82F6] font-bold">STAGE 3: FEATURE STORE</div>
                <div className="text-xs font-bold text-[#EAEEF7] mt-1">Redis & NetCDF Queue</div>
                <div className="text-[10px] text-[#8B95AC] mt-2 space-y-1">
                  <div>• 6-frame rolling ring buffer</div>
                  <div>• Zero-copy GPU memory shm</div>
                  <div>• Missing data masking</div>
                  <div>• Latency: ~3s</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0E17] border border-[#22C55E] rounded bg-[#22C55E]/5">
                <div className="text-[10px] text-[#22C55E] font-bold">STAGE 4: INFERENCE</div>
                <div className="text-xs font-bold text-[#EAEEF7] mt-1">NVIDIA Triton Cluster</div>
                <div className="text-[10px] text-[#8B95AC] mt-2 space-y-1">
                  <div>• TensorRT FP16 / INT8 Engine</div>
                  <div>• 4x NVIDIA A100 SXM4 80GB</div>
                  <div>• Dynamic batching (B=4)</div>
                  <div>• Latency: 31.4 ms</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0E17] border border-[#DC2626] rounded bg-[#DC2626]/5">
                <div className="text-[10px] text-[#DC2626] font-bold">STAGE 5: ALERTING</div>
                <div className="text-xs font-bold text-[#EAEEF7] mt-1">CAP XML & GIS API</div>
                <div className="text-[10px] text-[#8B95AC] mt-2 space-y-1">
                  <div>• OASIS CAP v1.2 Payload</div>
                  <div>• TITAN Polygons & Centroids</div>
                  <div>• NDMA SACHET Webhook</div>
                  <div>• Latency: ~4s</div>
                </div>
              </div>
            </div>

            {/* Total Budget Summary */}
            <div className="p-4 bg-[#161D2E] border border-[#2A3348] rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#22C55E]">END-TO-END OPERATIONAL LATENCY: ~33.4 SECONDS</span>
                <p className="text-[11px] text-[#8B95AC] mt-0.5">
                  Allows IMD to issue severe thunderstorm and lightning warnings within 5–10 minutes of initial radar sweep initiation.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="text-center">
                  <div className="text-[#3B82F6]">39 RADARS</div>
                  <div className="text-[10px] text-[#8B95AC]">Nationwide Ingest</div>
                </div>
                <div className="text-center">
                  <div className="text-[#FFC857]">15 MIN</div>
                  <div className="text-[10px] text-[#8B95AC]">INSAT Cadence</div>
                </div>
                <div className="text-center">
                  <div className="text-[#22C55E]">100%</div>
                  <div className="text-[10px] text-[#8B95AC]">OASIS CAP v1.2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Loss Functions */}
      {activeTab === 'losses' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#121826] border border-[#2A3348] rounded-lg space-y-5">
            <h2 className="text-sm font-bold text-[#EAEEF7] tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              Multi-Task Loss Formulation & Physics Regularization (Section 3.4)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Loss 1 */}
              <div className="p-4 bg-[#0A0E17] border border-[#2A3348] rounded-lg space-y-2">
                <div className="text-xs font-bold text-[#3B82F6]">1. RADAR LOSS (L_radar)</div>
                <div className="text-[11px] text-[#EAEEF7]">Balanced MSE + Weighted CSI Loss</div>
                <div className="p-2.5 bg-[#161D2E] rounded text-[11px] text-[#3B82F6] font-mono leading-relaxed">
                  L_radar = α1 · Σ w(x,y)(Z_hat - Z)² + α2 · (1 - CSI@40dBZ)
                </div>
                <p className="text-[10px] text-[#8B95AC] leading-relaxed">
                  Standard MSE yields blurry forecasts. Severity mask w(x,y) applies higher weight on severe storm cores (&gt; 40 dBZ) to prevent attenuation of convective peaks.
                </p>
              </div>

              {/* Loss 2 */}
              <div className="p-4 bg-[#0A0E17] border border-[#2A3348] rounded-lg space-y-2">
                <div className="text-xs font-bold text-[#FFC857]">2. LIGHTNING LOSS (L_light)</div>
                <div className="text-[11px] text-[#EAEEF7]">Focal Loss for Extreme Class Imbalance</div>
                <div className="p-2.5 bg-[#161D2E] rounded text-[11px] text-[#FFC857] font-mono leading-relaxed">
                  L_light = -Σ [y·α(1-σ)^γ log(σ) + (1-y)(1-α)σ^γ log(1-σ)]
                </div>
                <p className="text-[10px] text-[#8B95AC] leading-relaxed">
                  Hyperparameters: γ = 2, α = 0.75. Prevents vast regions of clear air from overwhelming the gradient of rare, concentrated lightning strikes.
                </p>
              </div>

              {/* Loss 3 */}
              <div className="p-4 bg-[#0A0E17] border border-[#2A3348] rounded-lg space-y-2">
                <div className="text-xs font-bold text-[#22C55E]">3. PHYSICS REGULARIZATION (L_physics)</div>
                <div className="text-[11px] text-[#EAEEF7]">Divergence Penalty & Smooth Advection</div>
                <div className="p-2.5 bg-[#161D2E] rounded text-[11px] text-[#22C55E] font-mono leading-relaxed">
                  L_physics = Σ (∂u/∂x + ∂v/∂y)² + λ_diff · ||∇Z_hat||²
                </div>
                <p className="text-[10px] text-[#8B95AC] leading-relaxed">
                  Enforces learned latent motion field to strictly respect physical mass conservation (incompressible 2D flow assumption) and prevents unnatural numerical diffusion.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#0A0E17] border border-[#2A3348] rounded text-xs flex items-center justify-between">
              <span className="text-[#EAEEF7]">
                <strong>Total Multi-Task Objective:</strong> L_total = 1.0 · L_radar + 0.5 · L_light + 0.1 · L_physics
              </span>
              <span className="text-[10px] text-[#22C55E]">Optimized via AdamW (lr=2e-4, Cosine Decay)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
