/**
 * AERIS Synthetic Data Layer
 * 
 * Self-contained module providing physically-plausible synthetic weather data
 * for the AERIS nowcasting dashboard. Each function is a labeled stand-in for
 * a real operational data source.
 * 
 * All generators use seeded PRNG for reproducible demonstrations.
 * Fixed seed per scenario ensures reruns show the same honest behavior.
 */

import { GRID_COLS, GRID_ROWS, gridToLatLon, INDIA_BOUNDS } from './geo';

// ============================================================================
// Seeded PRNG (Mulberry32) — deterministic random number generation
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

export type StormPhase = 'growing' | 'mature' | 'decaying';

export interface StormCell {
  lat: number;
  lon: number;
  velocityLat: number;   // degrees per 10-min step
  velocityLon: number;
  intensity: number;     // 0-1 peak reflectivity fraction
  radius: number;        // degrees — Gaussian sigma
  phase: StormPhase;
  startTime: number;     // minute when the cell was initiated
  peakTime: number;      // minute when the cell reaches maturity
  decayTime: number;     // minute when the cell starts decaying
}

export interface StormScenario {
  cells: StormCell[];
  seed: number;
  name: string;
}

export interface AtmosphericFields {
  cape: number[][];     // J/kg — Convective Available Potential Energy
  shear: number[][];    // m/s — 0-6km bulk wind shear
  humidity: number[][];  // % — column relative humidity
}

export interface LightningFlash {
  lat: number;
  lon: number;
  intensity: number;    // kA — peak current (synthetic)
  timestamp: number;    // minutes
}

// ============================================================================
// Storm Scenario Presets
// SWAP POINT: In production, scenarios are replaced by real-time data ingest
// ============================================================================

export function seedStormScenario(name: string): StormScenario {
  if (name === 'squall_line') {
    // Linear convective system — multiple cells aligned NE-SW, moving eastward
    const cells: StormCell[] = [];
    for (let i = 0; i < 6; i++) {
      cells.push({
        lat: 26 - i * 1.0,
        lon: 78 + i * 0.6,
        velocityLat: -0.015,
        velocityLon: 0.06,        // Fast eastward motion (~35 km/h)
        intensity: 0.75 + (i % 3) * 0.08,
        radius: 1.4,
        phase: 'mature',
        startTime: -20 - i * 5,   // Staggered initiation
        peakTime: 40 - i * 3,
        decayTime: 100 - i * 3,
      });
    }
    return { seed: 123, cells, name };
  }

  if (name === 'isolated_cell') {
    // Small intense supercell-like storm near Kolkata — rapid lifecycle
    return {
      seed: 456,
      name,
      cells: [
        {
          lat: 22.5,
          lon: 88.3,             // Near Kolkata
          velocityLat: -0.008,
          velocityLon: 0.04,     // Moving ESE
          intensity: 0.95,       // Very intense
          radius: 1.2,
          phase: 'growing',
          startTime: 10,
          peakTime: 50,
          decayTime: 85,
        },
      ],
    };
  }

  // DEFAULT: afternoon_thunderstorm
  // Classic Indian afternoon convective buildup — single large cell over central India
  return {
    seed: 789,
    name: 'afternoon_thunderstorm',
    cells: [
      {
        lat: 21,
        lon: 79,               // Central India (near Nagpur)
        velocityLat: 0.015,
        velocityLon: 0.025,    // Drifting NE (~15 km/h)
        intensity: 0.85,
        radius: 2.2,
        phase: 'growing',
        startTime: 0,
        peakTime: 65,
        decayTime: 120,
      },
      {
        lat: 23,
        lon: 82,               // Secondary cell near Raipur
        velocityLat: 0.01,
        velocityLon: 0.03,
        intensity: 0.6,
        radius: 1.5,
        phase: 'growing',
        startTime: 30,
        peakTime: 80,
        decayTime: 130,
      },
    ],
  };
}

// ============================================================================
// Storm Cell Physics — lifecycle evolution
// ============================================================================

function evolveCells(cells: StormCell[], t: number, rng: () => number): StormCell[] {
  return cells.map((cell) => {
    const age = t - cell.startTime;
    if (age < 0) {
      // Cell hasn't initiated yet
      return { ...cell, intensity: 0, phase: 'growing' as StormPhase };
    }

    // Position: drift with momentum + small turbulent perturbation
    const turbLat = (rng() - 0.5) * 0.003;
    const turbLon = (rng() - 0.5) * 0.003;
    const newLat = cell.lat + cell.velocityLat * (age / 10) + turbLat;
    const newLon = cell.lon + cell.velocityLon * (age / 10) + turbLon;

    // Lifecycle phases
    const growDuration = cell.peakTime - cell.startTime;
    const matureDuration = cell.decayTime - cell.peakTime;
    const decayDuration = matureDuration * 1.2; // Decay is slightly longer than maturity

    let phase: StormPhase;
    let intensityFactor: number;
    let radiusFactor: number;

    if (t < cell.peakTime) {
      // Growing phase: intensity ramps up, radius expands
      phase = 'growing';
      const progress = Math.max(0, age / growDuration);
      intensityFactor = progress * progress; // Accelerating growth
      radiusFactor = 0.4 + 0.6 * progress;
    } else if (t < cell.decayTime) {
      // Mature phase: peak intensity, stable radius
      phase = 'mature';
      const progress = (t - cell.peakTime) / matureDuration;
      intensityFactor = 1.0 - progress * 0.1; // Slight weakening
      radiusFactor = 1.0 + progress * 0.15;   // Slight expansion (anvil)
    } else {
      // Decaying phase: intensity drops, radius grows (storm spreads out)
      phase = 'decaying';
      const progress = Math.min(1, (t - cell.decayTime) / decayDuration);
      intensityFactor = Math.max(0, (1 - progress) * (1 - progress));
      radiusFactor = 1.15 + progress * 0.6; // Anvil spread
    }

    return {
      ...cell,
      lat: newLat,
      lon: newLon,
      phase,
      intensity: cell.intensity * intensityFactor,
      radius: cell.radius * radiusFactor,
    };
  });
}

// ============================================================================
// Radar Reflectivity Grid
// SWAP POINT: replace with real API call to IMD Doppler Weather Radar network
// ============================================================================

export function generateRadarGrid(t: number, scenario: StormScenario): number[][] {
  const rng = seedRng(scenario.seed + Math.floor(t));
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const cells = evolveCells(scenario.cells, t, rng);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);
      let reflectivity = 0;

      for (const cell of cells) {
        if (cell.intensity <= 0.01) continue;

        const dLat = lat - cell.lat;
        const dLon = lon - cell.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);

        // Core signal: 2D Gaussian
        const core = cell.intensity * Math.exp(
          -(dist * dist) / (2 * cell.radius * cell.radius)
        );

        // Anvil shield: wider but weaker signal around mature/decaying storms
        let anvil = 0;
        if (cell.phase !== 'growing') {
          const anvilRadius = cell.radius * 2.5;
          anvil = cell.intensity * 0.25 * Math.exp(
            -(dist * dist) / (2 * anvilRadius * anvilRadius)
          );
        }

        reflectivity = Math.max(reflectivity, (core + anvil) * 70);
      }

      // Turbulent noise — adds realism to active storm areas
      if (reflectivity > 8) {
        reflectivity += (rng() - 0.5) * 8;
      }

      grid[r][c] = Math.max(0, Math.min(70, reflectivity));
    }
  }

  return grid;
}

// ============================================================================
// Satellite Channels (IR + Water Vapor)
// SWAP POINT: replace with real API call to INSAT-3D/3DR, GOES, Himawari
// ============================================================================

export function generateSatelliteChannels(t: number, scenario: StormScenario) {
  const rng = seedRng(scenario.seed + Math.floor(t) + 5000);
  const irGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(295));
  const wvGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(45));
  const cells = evolveCells(scenario.cells, t, rng);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);

      // Latitude-dependent baseline: warmer near equator
      irGrid[r][c] = 290 + (INDIA_BOUNDS.latMax - lat) * 0.3;

      for (const cell of cells) {
        if (cell.intensity <= 0.01) continue;
        const dist = Math.sqrt(
          Math.pow(lat - cell.lat, 2) + Math.pow(lon - cell.lon, 2)
        );

        // IR: cloud-top temperature drops to ~200-220K at storm cores
        // Anvil shield has wider cold area than radar core
        const anvilRadius = cell.radius * 2.2;
        const irEffect = cell.intensity * Math.exp(
          -(dist * dist) / (2 * anvilRadius * anvilRadius)
        );
        irGrid[r][c] = Math.min(irGrid[r][c], irGrid[r][c] - irEffect * 90);

        // WV: enhanced moisture plume near and downwind of cells
        const wvRadius = cell.radius * 1.8;
        const wvEffect = cell.intensity * Math.exp(
          -(dist * dist) / (2 * wvRadius * wvRadius)
        );
        wvGrid[r][c] = Math.max(wvGrid[r][c], 45 + wvEffect * 55);
      }
    }
  }

  return { ir: irGrid, wv: wvGrid };
}

// ============================================================================
// Lightning Flashes
// SWAP POINT: replace with real API call to INSAT LIS, WWLLN, GOES-GLM,
//             OpenWeatherMap Lightning API, DTN, or XWeather
// ============================================================================

export function generateLightningFlashes(
  t: number,
  scenario: StormScenario
): LightningFlash[] {
  const rng = seedRng(scenario.seed + Math.floor(t) + 9999);
  const cells = evolveCells(scenario.cells, t, rng);
  const flashes: LightningFlash[] = [];

  for (const cell of cells) {
    if (cell.intensity < 0.25) continue;

    // Flash rate scales with intensity² (strong storms produce far more lightning)
    // Realistic rates: isolated cell 5-20 flashes/10min peak, squall line 50+
    const rate = cell.intensity * cell.intensity * 25;
    const numFlashes = Math.floor(rate * (0.5 + rng()));

    for (let i = 0; i < numFlashes; i++) {
      // Spatial distribution: Gaussian around cell center, concentrated near core
      const angle = rng() * 2 * Math.PI;
      const dist = Math.abs(rng() + rng() - 1) * cell.radius * 0.8; // Rayleigh-ish

      flashes.push({
        lat: cell.lat + dist * Math.cos(angle),
        lon: cell.lon + dist * Math.sin(angle),
        intensity: 20 + rng() * 180, // 20-200 kA synthetic peak current
        timestamp: t - rng() * 10,   // Sometime in the last 10 minutes
      });
    }
  }

  return flashes;
}

// ============================================================================
// Atmospheric Fields (CAPE, Shear, Humidity)
// SWAP POINT: replace with real API call to GFS/ECMWF/WRF NWP model output
// ============================================================================

export function generateAtmosphericFields(
  t: number,
  scenario: StormScenario
): AtmosphericFields {
  const rng = seedRng(scenario.seed + 7777);
  const cells = evolveCells(scenario.cells, t, rng);

  const cape = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const shear = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const humidity = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { lat, lon } = gridToLatLon(r, c);

      // Latitude gradient: more instability in tropical/subtropical latitudes
      const latFactor = 1 - Math.abs(lat - 20) / 20;
      const baseCape = 800 + latFactor * 2200 + rng() * 400;
      const baseShear = 8 + latFactor * 12 + rng() * 5;
      const baseHumidity = 40 + latFactor * 25 + rng() * 10;

      cape[r][c] = baseCape;
      shear[r][c] = baseShear;
      humidity[r][c] = baseHumidity;

      // Storm interaction: convection consumes CAPE, enhances local shear/humidity
      for (const cell of cells) {
        if (cell.intensity <= 0.01) continue;
        const dist = Math.sqrt(
          Math.pow(lat - cell.lat, 2) + Math.pow(lon - cell.lon, 2)
        );
        const effect = Math.exp(
          -(dist * dist) / (2 * Math.pow(cell.radius * 1.5, 2))
        );

        // CAPE consumed by active convection
        cape[r][c] -= effect * cell.intensity * 2500;
        cape[r][c] = Math.max(0, cape[r][c]);

        // Shear enhanced near organized storms (outflow boundaries)
        shear[r][c] += effect * cell.intensity * 18;

        // Humidity peaks near active cells
        humidity[r][c] = Math.min(100, humidity[r][c] + effect * cell.intensity * 45);
      }
    }
  }

  return { cape, shear, humidity };
}

// ============================================================================
// History Buffer — rolling window for model input
// SWAP POINT: replace with real-time data archive / ring buffer
// ============================================================================

export function getHistoryBuffer(
  currentTime: number,
  scenario: StormScenario
): number[][][] {
  const buffer: number[][][] = [];
  // 6 frames at 10-minute intervals: t-50, t-40, t-30, t-20, t-10, t
  for (let offset = -50; offset <= 0; offset += 10) {
    buffer.push(generateRadarGrid(currentTime + offset, scenario));
  }
  return buffer;
}
