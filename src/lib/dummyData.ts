/**
 * AERIS Synthetic Meteorological Data Engine
 * 
 * Provides physically-consistent, multimodal meteorological fields for the
 * AERIS nowcasting system according to the IMD operational technical specifications:
 * - Dual-Pol Doppler Radar volumetric CAPPI (1km, 3km, 5km, 8km, 12km, Composite)
 * - Dual-Pol moments (Z, Z_DR, K_DP, Rho_HV, Hydrometeor Classification)
 * - INSAT-3DR Geostationary Satellite (TIR-1 Thermal IR and 6.7µm Water Vapor)
 * - Lightning Location Network (Intra-Cloud IC vs Cloud-to-Ground CG, Polarity, Peak Current kA)
 * - Atmospheric Environmental Fields (CAPE J/kg, 0-6km Shear m/s, CIN, PWAT)
 * - TITAN Storm Cell Tracking & Geofence Breaches
 */

import {
  GRID_COLS,
  GRID_ROWS,
  gridToLatLon,
  INDIA_BOUNDS,
  GEOFENCE_ZONES,
  lookupDistrict,
  getImdAlertLevel,
  ImdAlertLevel,
} from './geo';

// ============================================================================
// Deterministic Seeded PRNG (Mulberry32)
// ============================================================================
export function seedRng(seed: number): () => number {
  let s = seed | 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Types
// ============================================================================
export type StormPhase = 'initiation' | 'mature' | 'dissipating';

export interface StormCellDef {
  id: string;
  lat: number;
  lon: number;
  velocityLat: number; // deg per 10 min
  velocityLon: number;
  peakDbz: number;      // 40-70 dBZ
  radius: number;       // degrees
  topHeightKm: number;  // 8 - 16 km
  vil: number;          // Vertically Integrated Liquid kg/m²
  hailProb: number;     // 0 - 100%
  gustSpeedKmh: number; // 40 - 110 km/h
  startTime: number;
  peakTime: number;
  decayTime: number;
  type: 'Kalbaishakhi Squall' | 'Western Disturbance Cell' | 'Monsoon Deep Band' | 'Diurnal Cumulonimbus';
}

export interface StormScenario {
  id: string;
  name: string;
  title: string;
  region: string;
  description: string;
  synopticSetup: string;
  seed: number;
  cells: StormCellDef[];
}

export interface TrackedCell {
  id: string;
  lat: number;
  lon: number;
  maxDbz: number;
  topHeightKm: number;
  vil: number;
  updraftMs: number;
  hailProb: number;
  gustSpeedKmh: number;
  speedKmh: number;
  bearingDeg: number;
  phase: StormPhase;
  nearestDistrict: string;
  nearestState: string;
  projectedTrack: { lat: number; lon: number; minutes: number }[];
}

export interface LightningStroke {
  id: string;
  lat: number;
  lon: number;
  type: 'IC' | 'CG'; // Intra-Cloud vs Cloud-to-Ground
  polarity: '+' | '-';
  peakCurrentKa: number; // e.g. -45 kA
  timestampMinutes: number;
}

export interface DualPolCellSummary {
  altitudeKm: number;
  dbz: number;
  zdr: number;        // dB (-1 to +4)
  kdp: number;        // °/km (0 to 5)
  rhoHv: number;      // 0.8 to 0.99
  hydrometeor: 'Light Rain' | 'Heavy Rain' | 'Graupel' | 'Hail' | 'Melting Layer' | 'Anvil Ice';
}

export interface MultiAltitudeGrid {
  level1km: number[][];  // boundary layer
  level3km: number[][];  // low-mid
  level5km: number[][];  // freezing level (~0°C)
  level8km: number[][];  // charging zone (-15°C to -25°C)
  level12km: number[][]; // storm top / anvil
  composite: number[][]; // Max across all levels (CMAX)
}

export interface SatelliteChannels {
  irTir1: number[][]; // Brightness Temp in Celsius (-80°C to +35°C)
  waterVapor: number[][]; // Relative moisture content % (20% to 100%)
}

export interface AtmosphericIndices {
  cape: number[][];   // J/kg (0 - 4500)
  shear: number[][];  // m/s (0 - 35)
  cin: number[][];    // J/kg (0 - 300)
  pwat: number[][];   // mm (15 - 75)
}

export interface GeofenceBreach {
  zoneId: string;
  zoneName: string;
  criticality: 'High' | 'Critical' | 'Severe';
  stormId: string;
  distanceKm: number;
  status: 'Breached' | 'Warning (<25km)' | 'Approaching (<50km)';
  etaMinutes: number;
  maxDbz: number;
}

// ============================================================================
// 4 Authentic Indian Meteorological Scenarios (Section 1 of report)
// ============================================================================
export const SCENARIO_PRESETS: Record<string, StormScenario> = {
  kalbaishakhi_norwester: {
    id: 'kalbaishakhi_norwester',
    name: 'Nor\'wester / Kalbaishakhi',
    title: 'Nor\'wester (Kalbaishakhi) Squall Line',
    region: 'Eastern India (Jharkhand, Gangetic West Bengal & Odisha)',
    description: 'Severe pre-monsoon squall line triggered along heat-low trough with strong maritime moisture feed from Bay of Bengal. Produces violent bow echoes, large hail, and extreme lightning activity.',
    synopticSetup: 'Surface heat-low over Chota Nagpur plateau (1002 hPa), moist southerly low-level jet (850 hPa, 25 kt), strong westerly shear at 500 hPa, CAPE > 3800 J/kg, Lifted Index -7.',
    seed: 1045,
    cells: [
      {
        id: 'KB-01',
        lat: 23.6,
        lon: 86.2, // Near Dhanbad / Asansol
        velocityLat: -0.022,
        velocityLon: 0.048, // Propagating SE towards Kolkata (~50 km/h)
        peakDbz: 66,
        radius: 1.4,
        topHeightKm: 15.5,
        vil: 58,
        hailProb: 88,
        gustSpeedKmh: 95,
        startTime: -30,
        peakTime: 50,
        decayTime: 120,
        type: 'Kalbaishakhi Squall',
      },
      {
        id: 'KB-02',
        lat: 22.8,
        lon: 85.5, // Near Jamshedpur
        velocityLat: -0.018,
        velocityLon: 0.052,
        peakDbz: 63,
        radius: 1.3,
        topHeightKm: 14.8,
        vil: 52,
        hailProb: 80,
        gustSpeedKmh: 88,
        startTime: -15,
        peakTime: 65,
        decayTime: 135,
        type: 'Kalbaishakhi Squall',
      },
      {
        id: 'KB-03',
        lat: 22.1,
        lon: 84.8, // Northern Odisha / Baripada track
        velocityLat: -0.015,
        velocityLon: 0.045,
        peakDbz: 59,
        radius: 1.2,
        topHeightKm: 13.5,
        vil: 45,
        hailProb: 68,
        gustSpeedKmh: 75,
        startTime: 0,
        peakTime: 75,
        decayTime: 145,
        type: 'Kalbaishakhi Squall',
      },
      {
        id: 'KB-04',
        lat: 24.3,
        lon: 87.1, // Bankura / Murshidabad flank
        velocityLat: -0.024,
        velocityLon: 0.050,
        peakDbz: 58,
        radius: 1.1,
        topHeightKm: 13.0,
        vil: 42,
        hailProb: 60,
        gustSpeedKmh: 70,
        startTime: 10,
        peakTime: 85,
        decayTime: 150,
        type: 'Kalbaishakhi Squall',
      }
    ]
  },

  western_disturbance: {
    id: 'western_disturbance',
    name: 'Western Disturbance',
    title: 'Western Disturbance Orographic Squall',
    region: 'Northwest India (Punjab, Haryana, Delhi NCR & Western Himalayas)',
    description: 'Mid-latitude westerly upper-level trough interacting with low-level induced cyclonic circulation over Rajasthan. Produces severe convective cells along Shivalik foothills and plains.',
    synopticSetup: 'Upper-tropospheric westerly jet stream at 200 hPa (110 kt), induced surface low over Punjab/Haryana (1006 hPa), orographic uplift along Jammu & Uttarakhand.',
    seed: 2092,
    cells: [
      {
        id: 'WD-01',
        lat: 31.4,
        lon: 75.3, // Amritsar / Jalandhar
        velocityLat: -0.010,
        velocityLon: 0.042, // Drifting ESE towards Chandigarh & Delhi
        peakDbz: 62,
        radius: 1.5,
        topHeightKm: 13.8,
        vil: 48,
        hailProb: 75,
        gustSpeedKmh: 82,
        startTime: -25,
        peakTime: 55,
        decayTime: 125,
        type: 'Western Disturbance Cell',
      },
      {
        id: 'WD-02',
        lat: 30.1,
        lon: 76.5, // Ambala / Kurukshetra heading to Delhi
        velocityLat: -0.008,
        velocityLon: 0.038,
        peakDbz: 60,
        radius: 1.4,
        topHeightKm: 13.0,
        vil: 44,
        hailProb: 70,
        gustSpeedKmh: 78,
        startTime: 5,
        peakTime: 70,
        decayTime: 135,
        type: 'Western Disturbance Cell',
      },
      {
        id: 'WD-03',
        lat: 32.8,
        lon: 74.9, // Jammu foothills
        velocityLat: -0.005,
        velocityLon: 0.030,
        peakDbz: 55,
        radius: 1.2,
        topHeightKm: 12.0,
        vil: 36,
        hailProb: 55,
        gustSpeedKmh: 65,
        startTime: -10,
        peakTime: 60,
        decayTime: 115,
        type: 'Western Disturbance Cell',
      }
    ]
  },

  monsoon_depression: {
    id: 'monsoon_depression',
    name: 'Monsoon Depression / Western Ghats',
    title: 'Monsoon Offshore Trough & Orographic Bands',
    region: 'West Coast & Central India (Mumbai, Konkan Coast, Western Ghats & Vidarbha)',
    description: 'Vigorous monsoon trough with active offshore vortex causing extreme moisture convergence, deep warm-rain convective cores, continuous IC/CG lightning, and heavy orographic rainfall.',
    synopticSetup: 'Offshore trough from South Gujarat to Kerala coast, low-level southwesterly jet (35 kt at 850 hPa), Precipitable Water > 68 mm, continuous maritime feeder bands.',
    seed: 3180,
    cells: [
      {
        id: 'MD-01',
        lat: 19.3,
        lon: 72.4, // Offshore Mumbai / Thane
        velocityLat: 0.008,
        velocityLon: 0.028, // Moving inland across Western Ghats
        peakDbz: 64,
        radius: 1.8,
        topHeightKm: 14.5,
        vil: 62,
        hailProb: 45, // Lower hail due to warm maritime freezing level
        gustSpeedKmh: 75,
        startTime: -40,
        peakTime: 45,
        decayTime: 130,
        type: 'Monsoon Deep Band',
      },
      {
        id: 'MD-02',
        lat: 17.8,
        lon: 73.1, // Ratnagiri / Raigad ghats
        velocityLat: 0.006,
        velocityLon: 0.024,
        peakDbz: 61,
        radius: 1.6,
        topHeightKm: 13.8,
        vil: 56,
        hailProb: 40,
        gustSpeedKmh: 70,
        startTime: -20,
        peakTime: 60,
        decayTime: 140,
        type: 'Monsoon Deep Band',
      },
      {
        id: 'MD-03',
        lat: 20.8,
        lon: 78.5, // Central Vidarbha / Wardha
        velocityLat: 0.012,
        velocityLon: 0.032,
        peakDbz: 58,
        radius: 1.5,
        topHeightKm: 13.2,
        vil: 49,
        hailProb: 55,
        gustSpeedKmh: 68,
        startTime: 10,
        peakTime: 80,
        decayTime: 150,
        type: 'Monsoon Deep Band',
      }
    ]
  },

  afternoon_thunderstorm: {
    id: 'afternoon_thunderstorm',
    name: 'Afternoon Diurnal Initiation',
    title: 'Deccan Diurnal Convective Initiation',
    region: 'Central & Southern Plateau (Nagpur, Vidarbha, Telangana & Marathwada)',
    description: 'Classic diurnal solar insolation creating intense convective instability. Rapid updrafts (15-20 m/s) punch into mid-levels (-15°C to -25°C), driving vigorous non-inductive charge separation.',
    synopticSetup: 'Strong afternoon boundary layer heating (42°C), high convective available potential energy (CAPE > 3500 J/kg), dry line boundary between Arabian Sea and Bay of Bengal air masses.',
    seed: 4421,
    cells: [
      {
        id: 'DT-01',
        lat: 21.2,
        lon: 79.1, // Near Nagpur
        velocityLat: 0.014,
        velocityLon: 0.026, // Drifting NE towards Jabalpur/Gondia
        peakDbz: 65,
        radius: 1.6,
        topHeightKm: 16.0,
        vil: 55,
        hailProb: 82,
        gustSpeedKmh: 85,
        startTime: -10,
        peakTime: 60,
        decayTime: 130,
        type: 'Diurnal Cumulonimbus',
      },
      {
        id: 'DT-02',
        lat: 18.2,
        lon: 79.4, // Northern Telangana / Karimnagar
        velocityLat: 0.010,
        velocityLon: 0.022,
        peakDbz: 62,
        radius: 1.4,
        topHeightKm: 14.5,
        vil: 50,
        hailProb: 76,
        gustSpeedKmh: 80,
        startTime: 15,
        peakTime: 75,
        decayTime: 140,
        type: 'Diurnal Cumulonimbus',
      },
      {
        id: 'DT-03',
        lat: 22.4,
        lon: 82.2, // Bilaspur / Korba (Chhattisgarh)
        velocityLat: 0.008,
        velocityLon: 0.030,
        peakDbz: 59,
        radius: 1.3,
        topHeightKm: 13.5,
        vil: 45,
        hailProb: 65,
        gustSpeedKmh: 72,
        startTime: 25,
        peakTime: 85,
        decayTime: 155,
        type: 'Diurnal Cumulonimbus',
      }
    ]
  }
};

export function seedStormScenario(name: string): StormScenario {
  return SCENARIO_PRESETS[name] || SCENARIO_PRESETS.afternoon_thunderstorm;
}

// ============================================================================
// Storm Cell Physics & Spatio-Temporal Evolution
// ============================================================================
interface EvolvedCell extends StormCellDef {
  currentLat: number;
  currentLon: number;
  currentIntensity: number; // 0 to 1
  currentRadius: number;
  currentPhase: StormPhase;
  currentDbz: number;
}

function evolveCells(cells: StormCellDef[], t: number, rng: () => number): EvolvedCell[] {
  return cells.map((cell) => {
    const age = t - cell.startTime;
    if (age < 0) {
      return {
        ...cell,
        currentLat: cell.lat,
        currentLon: cell.lon,
        currentIntensity: 0,
        currentRadius: cell.radius * 0.4,
        currentPhase: 'initiation',
        currentDbz: 0,
      };
    }

    // Displacement based on velocity vector + minor turbulent perturbation
    const steps = age / 10;
    const turbLat = (rng() - 0.5) * 0.004;
    const turbLon = (rng() - 0.5) * 0.004;
    const currentLat = cell.lat + cell.velocityLat * steps + turbLat;
    const currentLon = cell.lon + cell.velocityLon * steps + turbLon;

    const growDuration = cell.peakTime - cell.startTime;
    const matureDuration = cell.decayTime - cell.peakTime;
    const decayDuration = matureDuration * 1.3;

    let phase: StormPhase;
    let intensityFactor: number;
    let radiusFactor: number;

    if (t < cell.peakTime) {
      phase = 'initiation';
      const progress = Math.max(0, age / growDuration);
      intensityFactor = Math.pow(progress, 1.8); // Non-linear convective growth
      radiusFactor = 0.5 + 0.5 * progress;
    } else if (t < cell.decayTime) {
      phase = 'mature';
      const progress = (t - cell.peakTime) / matureDuration;
      intensityFactor = 1.0 - progress * 0.12; // High steady intensity
      radiusFactor = 1.0 + progress * 0.2;
    } else {
      phase = 'dissipating';
      const progress = Math.min(1, (t - cell.decayTime) / decayDuration);
      intensityFactor = Math.max(0, Math.pow(1 - progress, 2));
      radiusFactor = 1.2 + progress * 0.7; // Anvil outflow spreading
    }

    const currentDbz = cell.peakDbz * intensityFactor;

    return {
      ...cell,
      currentLat,
      currentLon,
      currentIntensity: intensityFactor,
      currentRadius: cell.radius * radiusFactor,
      currentPhase: phase,
      currentDbz,
    };
  });
}

// ============================================================================
// Multi-Altitude Radar Reflectivity CAPPI Generator (Section 2.1)
// ============================================================================
export function generateRadarCappi(t: number, scenario: StormScenario): MultiAltitudeGrid {
  const rng = seedRng(scenario.seed + Math.floor(t * 7));
  const evolved = evolveCells(scenario.cells, t, rng);

  const level1km = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const level3km = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const level5km = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const level8km = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const level12km = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const composite = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);

      let maxZ = 0;
      let z1 = 0, z3 = 0, z5 = 0, z8 = 0, z12 = 0;

      for (const cell of evolved) {
        if (cell.currentIntensity <= 0.02) continue;

        const dLat = lat - cell.currentLat;
        const dLon = lon - cell.currentLon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);

        // Core Gaussian profile
        const sigma = cell.currentRadius * 0.55;
        const coreFactor = Math.exp(-(dist * dist) / (2 * sigma * sigma));

        // Anvil shield profile (broader, elevated)
        const anvilSigma = cell.currentRadius * 1.8;
        const anvilFactor = Math.exp(-(dist * dist) / (2 * anvilSigma * anvilSigma)) * 0.45;

        if (coreFactor > 0.01 || anvilFactor > 0.01) {
          // Vertical weighting based on cloud physics:
          // Low levels (1-3 km): strong rain core
          // 5 km (freezing layer): bright band enhancement + graupel
          // 8 km: hail core aloft
          // 12 km: broad anvil top
          const cellPeak = cell.currentDbz;

          const val1 = (coreFactor * 0.85 + anvilFactor * 0.1) * cellPeak;
          const val3 = (coreFactor * 0.95 + anvilFactor * 0.2) * cellPeak;
          const val5 = (coreFactor * 1.05 + anvilFactor * 0.3) * cellPeak; // Bright-band & graupel peak
          const val8 = (coreFactor * 0.88 + anvilFactor * 0.5) * cellPeak; // Upper core / charging zone
          const val12 = (coreFactor * 0.45 + anvilFactor * 0.75) * cellPeak; // Anvil top

          z1 = Math.max(z1, val1);
          z3 = Math.max(z3, val3);
          z5 = Math.max(z5, val5);
          z8 = Math.max(z8, val8);
          z12 = Math.max(z12, val12);
        }
      }

      // Add slight realistic turbulence in storm cores (> 15 dBZ)
      if (z5 > 15) {
        const noise = (rng() - 0.5) * 4;
        z1 = Math.max(0, Math.min(72, z1 + noise));
        z3 = Math.max(0, Math.min(72, z3 + noise));
        z5 = Math.max(0, Math.min(75, z5 + noise));
        z8 = Math.max(0, Math.min(70, z8 + noise));
        z12 = Math.max(0, Math.min(65, z12 + noise * 0.6));
      }

      maxZ = Math.max(z1, z3, z5, z8, z12);

      level1km[r][c] = Math.round(z1 * 10) / 10;
      level3km[r][c] = Math.round(z3 * 10) / 10;
      level5km[r][c] = Math.round(z5 * 10) / 10;
      level8km[r][c] = Math.round(z8 * 10) / 10;
      level12km[r][c] = Math.round(z12 * 10) / 10;
      composite[r][c] = Math.round(maxZ * 10) / 10;
    }
  }

  return { level1km, level3km, level5km, level8km, level12km, composite };
}

// Backward-compatible wrapper for single radar grid
export function generateRadarGrid(t: number, scenario: StormScenario): number[][] {
  return generateRadarCappi(t, scenario).composite;
}

// ============================================================================
// Satellite Multi-Spectral Imagery (INSAT-3DR TIR-1 & Water Vapor)
// Section 2.2 of report: TIR-1 (10.8µm) & Water Vapor (6.7µm)
// ============================================================================
export function generateSatelliteChannels(t: number, scenario: StormScenario): SatelliteChannels {
  const rng = seedRng(scenario.seed + Math.floor(t * 3) + 900);
  const evolved = evolveCells(scenario.cells, t, rng);

  const irTir1 = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(28)); // 28°C warm baseline
  const waterVapor = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(35)); // 35% background

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);

      // Latitudinal background temperature (warmer south, cooler north)
      let temp = 28 - (lat - 10) * 0.4;
      let wv = 40 + (lat - 15) * 0.3;

      for (const cell of evolved) {
        if (cell.currentIntensity <= 0.02) continue;

        const dLat = lat - cell.currentLat;
        const dLon = lon - cell.currentLon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);

        // Broad anvil cold-cloud temperature shield
        const anvilRadius = cell.currentRadius * 2.2;
        const coldFactor = Math.exp(-(dist * dist) / (2 * anvilRadius * anvilRadius));

        // Deep convective cores reach -60°C to -75°C (overshooting tops)
        const coreCooling = coldFactor * cell.currentIntensity * 95;
        temp -= coreCooling;

        // Elevated moisture plume around convective cells
        const wvBoost = coldFactor * cell.currentIntensity * 60;
        wv += wvBoost;
      }

      irTir1[r][c] = Math.round(Math.max(-80, Math.min(45, temp)) * 10) / 10;
      waterVapor[r][c] = Math.round(Math.max(15, Math.min(100, wv)) * 10) / 10;
    }
  }

  return { irTir1, waterVapor };
}

// ============================================================================
// Lightning Detection Network (IC vs CG, Polarity, Peak Current)
// Section 2.3 & Section 1: Non-inductive charging (-15°C to -25°C), Triboelectric
// ============================================================================
export function generateLightningStrokes(t: number, scenario: StormScenario): LightningStroke[] {
  const rng = seedRng(scenario.seed + Math.floor(t * 11) + 1234);
  const evolved = evolveCells(scenario.cells, t, rng);
  const strokes: LightningStroke[] = [];

  evolved.forEach((cell, cellIdx) => {
    if (cell.currentDbz < 35 || cell.currentIntensity < 0.2) return;

    // Flash rate scales nonlinearly with max reflectivity and updraft strength
    // (Flash rate ~ W^6 power law in severe convection)
    const baseRate = Math.pow(cell.currentDbz / 42, 3.5) * 12;
    const numStrokes = Math.min(50, Math.floor(baseRate * (0.6 + rng() * 0.8)));

    for (let i = 0; i < numStrokes; i++) {
      const angle = rng() * Math.PI * 2;
      // Clustered heavily around updraft core aloft
      const dist = Math.pow(rng(), 1.7) * (cell.currentRadius * 0.75);
      const sLat = cell.currentLat + dist * Math.cos(angle);
      const sLon = cell.currentLon + dist * Math.sin(angle);

      // Intra-Cloud (IC) dominates early initiation, Cloud-to-Ground (CG) in mature
      const isCg = cell.currentPhase === 'mature' ? rng() < 0.42 : rng() < 0.22;
      const type: 'IC' | 'CG' = isCg ? 'CG' : 'IC';
      const polarity: '+' | '-' = rng() < 0.88 ? '-' : '+'; // 88% negative, 12% violent positive CGs

      // Peak current: CGs typically 25 to 120 kA; ICs typically 10 to 40 kA
      let peakCurrentKa = isCg
        ? Math.round(25 + rng() * 95)
        : Math.round(10 + rng() * 35);
      if (polarity === '-') peakCurrentKa = -peakCurrentKa;

      strokes.push({
        id: `LTG_${cell.id}_${cellIdx}_${i}`,
        lat: Math.round(sLat * 1000) / 1000,
        lon: Math.round(sLon * 1000) / 1000,
        type,
        polarity,
        peakCurrentKa,
        timestampMinutes: Math.round((t - rng() * 6) * 10) / 10,
      });
    }
  });

  return strokes;
}

// Flash Rate Density (FRD) grid (flashes / km² / 15min)
export function generateFlashRateDensity(t: number, scenario: StormScenario): number[][] {
  const strokes = generateLightningStrokes(t, scenario);
  const frdGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (const s of strokes) {
    const { row, col } = {
      row: Math.round(((INDIA_BOUNDS.latMax - s.lat) / (INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin)) * (GRID_ROWS - 1)),
      col: Math.round(((s.lon - INDIA_BOUNDS.lonMin) / (INDIA_BOUNDS.lonMax - INDIA_BOUNDS.lonMin)) * (GRID_COLS - 1))
    };

    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      // Gaussian kernel splat for density
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
            const weight = Math.exp(-(dr * dr + dc * dc) / 2);
            frdGrid[nr][nc] += weight * (s.type === 'CG' ? 1.5 : 1.0);
          }
        }
      }
    }
  }

  return frdGrid;
}

// ============================================================================
// Atmospheric Environmental Fields (NCUM / WRF Boundary Conditions)
// Section 2.4 of report: CAPE, Bulk Shear 0-6km, CIN, Precipitable Water
// ============================================================================
export function generateAtmosphericFields(t: number, scenario: StormScenario): AtmosphericIndices {
  const rng = seedRng(scenario.seed + 8888);
  const evolved = evolveCells(scenario.cells, t, rng);

  const cape = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(1200));
  const shear = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(12));
  const cin = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(40));
  const pwat = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(45));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);

      // Tropical background
      let curCape = 1600 + (25 - Math.abs(lat - 20)) * 60;
      let curShear = 14 + (lat > 25 ? 12 : 4);
      let curCin = 50;
      let curPwat = 42 + (lat < 22 ? 18 : 0);

      // Convective consumption & enhancement
      for (const cell of evolved) {
        if (cell.currentIntensity <= 0.02) continue;
        const dist = Math.sqrt(Math.pow(lat - cell.currentLat, 2) + Math.pow(lon - cell.currentLon, 2));
        const effect = Math.exp(-(dist * dist) / (2 * Math.pow(cell.currentRadius * 1.5, 2)));

        // Pre-storm environment has high CAPE; active core consumes CAPE
        curCape += (1 - cell.currentIntensity * 0.7) * effect * 2400;
        curShear += effect * 16 * cell.currentIntensity;
        curCin = Math.max(5, curCin - effect * 45); // CIN eroded by lift
        curPwat += effect * 22 * cell.currentIntensity;
      }

      cape[r][c] = Math.round(curCape);
      shear[r][c] = Math.round(curShear * 10) / 10;
      cin[r][c] = Math.round(curCin);
      pwat[r][c] = Math.round(curPwat);
    }
  }

  return { cape, shear, cin, pwat };
}

// ============================================================================
// TITAN-style Storm Cell Tracking & Extrapolation (Section 5)
// ============================================================================
export function getTrackedCells(t: number, scenario: StormScenario): TrackedCell[] {
  const rng = seedRng(scenario.seed + Math.floor(t * 5));
  const evolved = evolveCells(scenario.cells, t, rng);

  return evolved
    .filter(cell => cell.currentDbz >= 30)
    .map(cell => {
      const distInfo = lookupDistrict(cell.currentLat, cell.currentLon);

      // Velocity in km/h: 1 deg lat ≈ 111 km. cell.velocityLat is deg / 10 min.
      // km/h = (deg * 111) * 6
      const vLatKmH = cell.velocityLat * 111 * 6;
      const vLonKmH = cell.velocityLon * 111 * Math.cos(cell.currentLat * Math.PI / 180) * 6;
      const speedKmh = Math.round(Math.sqrt(vLatKmH * vLatKmH + vLonKmH * vLonKmH));

      // Meteorological bearing (0° North, 90° East)
      let bearingDeg = Math.round((Math.atan2(vLonKmH, vLatKmH) * 180 / Math.PI + 360) % 360);

      // Updraft velocity estimation (w ~ sqrt(2 * CAPE * fraction))
      const updraftMs = Math.round(12 + (cell.currentDbz / 70) * 14);

      // Projected track cones at T+15m, T+30m, T+60m
      const projectedTrack = [15, 30, 60].map(mins => {
        const factor = mins / 10;
        return {
          minutes: mins,
          lat: Math.round((cell.currentLat + cell.velocityLat * factor) * 1000) / 1000,
          lon: Math.round((cell.currentLon + cell.velocityLon * factor) * 1000) / 1000,
        };
      });

      return {
        id: cell.id,
        lat: Math.round(cell.currentLat * 1000) / 1000,
        lon: Math.round(cell.currentLon * 1000) / 1000,
        maxDbz: Math.round(cell.currentDbz),
        topHeightKm: cell.topHeightKm,
        vil: Math.round(cell.vil * cell.currentIntensity),
        updraftMs,
        hailProb: Math.round(cell.hailProb * cell.currentIntensity),
        gustSpeedKmh: Math.round(cell.gustSpeedKmh * (0.8 + cell.currentIntensity * 0.2)),
        speedKmh,
        bearingDeg,
        phase: cell.currentPhase,
        nearestDistrict: distInfo.name,
        nearestState: distInfo.state,
        projectedTrack,
      };
    });
}

// ============================================================================
// Geofence Breach Evaluator
// ============================================================================
export function evaluateGeofences(t: number, scenario: StormScenario): GeofenceBreach[] {
  const cells = getTrackedCells(t, scenario);
  const breaches: GeofenceBreach[] = [];

  for (const zone of GEOFENCE_ZONES) {
    for (const cell of cells) {
      const dLat = (zone.center[0] - cell.lat) * 111;
      const dLon = (zone.center[1] - cell.lon) * 111 * Math.cos(cell.lat * Math.PI / 180);
      const distKm = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));

      if (distKm <= zone.radiusKm + 40) {
        let status: 'Breached' | 'Warning (<25km)' | 'Approaching (<50km)' = 'Approaching (<50km)';
        let etaMinutes = Math.round((distKm / Math.max(20, cell.speedKmh)) * 60);

        if (distKm <= zone.radiusKm) {
          status = 'Breached';
          etaMinutes = 0;
        } else if (distKm <= zone.radiusKm + 20) {
          status = 'Warning (<25km)';
        }

        breaches.push({
          zoneId: zone.id,
          zoneName: zone.name,
          criticality: zone.criticality,
          stormId: cell.id,
          distanceKm: distKm,
          status,
          etaMinutes,
          maxDbz: cell.maxDbz,
        });
      }
    }
  }

  // Sort by highest risk / lowest distance
  return breaches.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ============================================================================
// Vertical Sounding & Dual-Pol Profile for Storm Cell Inspector
// Section 1: Tripolar charge structure, Non-inductive charging (-15°C to -25°C)
// ============================================================================
export function getCellVerticalProfile(cell: TrackedCell): DualPolCellSummary[] {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16];

  return levels.map(alt => {
    // Reflectivity profile
    let dbz = cell.maxDbz;
    if (alt <= 3) {
      dbz = cell.maxDbz * 0.9;
    } else if (alt <= 6) {
      dbz = cell.maxDbz * 1.0; // Peak in core
    } else {
      const decay = Math.max(0, 1 - (alt - 6) / (cell.topHeightKm - 6));
      dbz = cell.maxDbz * decay;
    }

    // Hydrometeor classification & dual-pol signatures
    let hydrometeor: DualPolCellSummary['hydrometeor'] = 'Light Rain';
    let zdr = 1.2;
    let kdp = 0.5;
    let rhoHv = 0.98;

    if (alt < 4.5) {
      if (dbz > 50) {
        hydrometeor = 'Heavy Rain';
        zdr = 2.8;
        kdp = 3.2;
        rhoHv = 0.96;
      } else {
        hydrometeor = 'Light Rain';
        zdr = 1.4;
        kdp = 0.8;
        rhoHv = 0.98;
      }
    } else if (alt >= 4.5 && alt <= 5.5) {
      // Freezing layer / melting layer (0°C)
      hydrometeor = 'Melting Layer';
      zdr = 3.5;
      kdp = 2.2;
      rhoHv = 0.86; // Classic signature drop in correlation coefficient
    } else if (alt > 5.5 && alt <= 9) {
      // Charging zone (-15°C to -25°C): graupel + hail
      if (dbz > 52) {
        hydrometeor = 'Hail';
        zdr = -0.2; // Large tumbling hail has near-zero or negative Z_DR
        kdp = 1.1;
        rhoHv = 0.89;
      } else {
        hydrometeor = 'Graupel';
        zdr = 0.4;
        kdp = 0.6;
        rhoHv = 0.97;
      }
    } else {
      // High altitude anvil ice crystals
      hydrometeor = 'Anvil Ice';
      zdr = 1.8;
      kdp = 0.2;
      rhoHv = 0.99;
    }

    return {
      altitudeKm: alt,
      dbz: Math.round(dbz * 10) / 10,
      zdr: Math.round(zdr * 10) / 10,
      kdp: Math.round(kdp * 10) / 10,
      rhoHv: Math.round(rhoHv * 100) / 100,
      hydrometeor,
    };
  });
}

// ============================================================================
// Rolling History Buffer
// ============================================================================
export function getHistoryBuffer(
  currentTime: number,
  scenario: StormScenario
): number[][][] {
  const buffer: number[][][] = [];
  // 6 frames at 10-minute intervals: t-50, t-40, t-30, t-20, t-10, t
  for (let offset = -50; offset <= 0; offset += 10) {
    buffer.push(generateRadarCappi(currentTime + offset, scenario).composite);
  }
  return buffer;
}
