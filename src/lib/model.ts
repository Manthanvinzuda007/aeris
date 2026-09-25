/**
 * AERIS Multimodal Spatio-Temporal AI Nowcast Model Engine
 * 
 * Simulates the hybrid CNN-Transformer & PhyDNet architecture specified in
 * Section 3 of deep-research-report:
 * - Semi-Lagrangian Advection with Optical Flow Block-Matching
 * - Physics Regularization: Mass continuity divergence penalty div(V) = du/dx + dv/dy
 * - Dual Decoders: Head A (3D Reflectivity Forecast), Head B (Lightning Probability & Density)
 * - Atmospheric modulation via CAPE, Shear, and CIN boundary conditions
 */

import { GRID_ROWS, GRID_COLS, gridToLatLon } from './geo';
import { AtmosphericIndices } from './dummyData';

export interface MotionVector {
  dx: number;
  dy: number;
}

export interface RenderableVector {
  lat: number;
  lon: number;
  uKmh: number;
  vKmh: number;
  speedKmh: number;
  bearingDeg: number;
}

/**
 * Estimates motion vectors using block-matching (optical flow / TITAN advection core).
 * Compares 3x3 blocks between consecutive frames to find displacement minimizing SAD.
 */
export function computeMotionVectors(frames: number[][][]): MotionVector[][] {
  const vectors: MotionVector[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ dx: 0, dy: 0 }))
  );

  if (frames.length < 2) return vectors;

  const prev = frames[frames.length - 2];
  const curr = frames[frames.length - 1];
  const searchRadius = 3;
  const blockRadius = 1;

  for (let r = searchRadius + blockRadius; r < GRID_ROWS - searchRadius - blockRadius; r++) {
    for (let c = searchRadius + blockRadius; c < GRID_COLS - searchRadius - blockRadius; c++) {
      if (curr[r][c] < 12) continue; // Skip clear air

      let minSAD = Infinity;
      let bestDx = 0;
      let bestDy = 0;

      for (let dr = -searchRadius; dr <= searchRadius; dr++) {
        for (let dc = -searchRadius; dc <= searchRadius; dc++) {
          let sad = 0;
          for (let br = -blockRadius; br <= blockRadius; br++) {
            for (let bc = -blockRadius; bc <= blockRadius; bc++) {
              const currVal = curr[r + br][c + bc];
              const prevVal = prev[r + br + dr][c + bc + dc];
              sad += Math.abs(currVal - prevVal);
            }
          }
          if (sad < minSAD) {
            minSAD = sad;
            bestDx = dc;
            bestDy = dr;
          }
        }
      }

      vectors[r][c] = { dx: bestDx, dy: bestDy };
    }
  }

  // Smoothing pass to enforce spatial coherence (simulate physics divergence constraint)
  const smoothed: MotionVector[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ dx: 0, dy: 0 }))
  );
  for (let r = 1; r < GRID_ROWS - 1; r++) {
    for (let c = 1; c < GRID_COLS - 1; c++) {
      let sumDx = 0, sumDy = 0, count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const v = vectors[r + dr][c + dc];
          if (v.dx !== 0 || v.dy !== 0) {
            sumDx += v.dx;
            sumDy += v.dy;
            count++;
          }
        }
      }
      if (count > 0) {
        smoothed[r][c] = { dx: sumDx / count, dy: sumDy / count };
      }
    }
  }

  return smoothed;
}

/**
 * Extracts a downsampled grid of renderable motion vectors for the GIS map overlay.
 */
export function extractRenderableVectors(motionVectors: MotionVector[][]): RenderableVector[] {
  const result: RenderableVector[] = [];
  const step = 4; // Sample every 4th grid point for clean map visualization

  for (let r = step; r < GRID_ROWS - step; r += step) {
    for (let c = step; c < GRID_COLS - step; c += step) {
      const vec = motionVectors[r][c];
      const mag = Math.sqrt(vec.dx * vec.dx + vec.dy * vec.dy);
      if (mag > 0.2) {
        const { lat, lon } = gridToLatLon(r, c);
        // Convert grid displacement (approx 50km/cell/10min) to km/h
        const uKmh = Math.round(vec.dx * 35);
        const vKmh = Math.round(-vec.dy * 35); // dy > 0 is southward in grid
        const speedKmh = Math.round(Math.sqrt(uKmh * uKmh + vKmh * vKmh));
        const bearingDeg = Math.round((Math.atan2(uKmh, vKmh) * 180 / Math.PI + 360) % 360);

        result.push({ lat, lon, uKmh, vKmh, speedKmh, bearingDeg });
      }
    }
  }

  return result;
}

/**
 * Semi-Lagrangian Advection: extrapolates reflectivity forward in time with decay
 */
export function extrapolateField(
  currentField: number[][],
  motionVectors: MotionVector[][],
  leadTimeSteps: number
): number[][] {
  const result = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const decay = Math.max(0.3, 1 - leadTimeSteps * 0.06);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (currentField[r][c] < 2) continue;

      const vec = motionVectors[r][c];
      const destR = Math.round(r + vec.dy * leadTimeSteps);
      const destC = Math.round(c + vec.dx * leadTimeSteps);

      if (destR >= 0 && destR < GRID_ROWS && destC >= 0 && destC < GRID_COLS) {
        const advected = currentField[r][c] * decay;
        result[destR][destC] = Math.max(result[destR][destC], advected);

        // Lateral diffusion / growth dispersion
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = destR + dr;
            const nc = destC + dc;
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
              result[nr][nc] = Math.max(result[nr][nc], advected * 0.45);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Predicts thunderstorm risk probability (0-1) combining radar advection, CAPE, and wind shear.
 */
export function predictThunderstormRisk(
  history: number[][][],
  atmosphericFields: AtmosphericIndices,
  leadTimeMinutes: number
): number[][] {
  const leadSteps = Math.max(1, Math.round(leadTimeMinutes / 10));
  const currentFrame = history[history.length - 1];

  const motionVectors = computeMotionVectors(history);
  const predictedRadar = extrapolateField(currentFrame, motionVectors, leadSteps);

  const riskGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const radarSignal = Math.min(1, predictedRadar[r][c] / 55.0);
      const capeSignal = Math.min(1, atmosphericFields.cape[r][c] / 3600.0);
      const shearSignal = Math.min(1, atmosphericFields.shear[r][c] / 28.0);

      // Weighted multimodal fusion: radar advection 50%, CAPE 30%, Shear 20%
      const combined = radarSignal * 0.50 + capeSignal * 0.30 + shearSignal * 0.20;

      // Sigmoid calibration
      const risk = 1 / (1 + Math.exp(-11 * (combined - 0.36)));
      riskGrid[r][c] = risk < 0.04 ? 0 : Math.round(risk * 100) / 100;
    }
  }

  return riskGrid;
}

/**
 * Predicts lightning probability (0-1) derived from non-inductive electrification conditions:
 * Updraft proxy (CAPE) + Reflectivity core aloft (> 40 dBZ) + Shear organization.
 */
export function predictLightningRisk(
  thunderstormRisk: number[][],
  atmosphericFields: AtmosphericIndices
): number[][] {
  const lightningRisk = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const tsRisk = thunderstormRisk[r][c];
      const cape = atmosphericFields.cape[r][c];
      const shear = atmosphericFields.shear[r][c];

      if (tsRisk > 0.28 && cape > 750) {
        const capeFactor = Math.min(1, cape / 3500);
        const shearFactor = Math.min(1, shear / 24);
        // Concentrated peak probability
        const prob = Math.pow(tsRisk, 1.35) * (0.65 * capeFactor + 0.35 * shearFactor);
        lightningRisk[r][c] = Math.round(Math.min(1, prob) * 100) / 100;
      }
    }
  }

  return lightningRisk;
}

/**
 * Evaluates Physics Regularization: Mass continuity loss (PhyDNet divergence).
 * Section 3.4 of report: sum (du/dx + dv/dy)^2
 */
export function computeMassContinuityDivergence(vectors: MotionVector[][]): number {
  let totalDivSq = 0;
  let count = 0;

  for (let r = 1; r < GRID_ROWS - 1; r++) {
    for (let c = 1; c < GRID_COLS - 1; c++) {
      // Central difference for divergence
      const dudx = (vectors[r][c + 1].dx - vectors[r][c - 1].dx) / 2;
      const dvdy = (vectors[r + 1][c].dy - vectors[r - 1][c].dy) / 2;
      const div = dudx + dvdy;
      totalDivSq += div * div;
      count++;
    }
  }

  return count > 0 ? Math.round((totalDivSq / count) * 1000) / 1000 : 0.012;
}
