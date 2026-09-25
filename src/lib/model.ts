/**
 * AERIS Nowcast Model
 * 
 * Rule-based motion-vector extrapolation (TITAN/ROVER-style heuristic nowcast).
 * This is a real, widely-used technique in operational meteorology.
 * 
 * The model genuinely computes predictions from input data — it is not canned
 * or precomputed. However, it is a heuristic, not a trained neural network.
 * 
 * SWAP POINT: replace with trained ConvLSTM or U-Net model.
 * The input/output contract is designed so a trained model can be dropped in
 * with no changes to the rest of the system.
 */

import { GRID_ROWS, GRID_COLS } from './geo';
import { AtmosphericFields } from './dummyData';

interface MotionVector {
  dx: number;
  dy: number;
}

/**
 * Estimates motion vectors using block-matching (optical flow approximation).
 * Compares 3x3 blocks between the two most recent frames to find the
 * displacement that minimizes the Sum of Absolute Differences (SAD).
 */
export function computeMotionVectors(frames: number[][][]): MotionVector[][] {
  // Initialize with zero vectors (each cell gets its own object)
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
      // Skip clear air — no need to track motion where there's nothing
      if (curr[r][c] < 10) continue;

      let minSAD = Infinity;
      let bestDx = 0;
      let bestDy = 0;

      // Search neighborhood in previous frame
      for (let dr = -searchRadius; dr <= searchRadius; dr++) {
        for (let dc = -searchRadius; dc <= searchRadius; dc++) {
          let sad = 0;
          // Compare block around (r,c) in current with block around (r+dr,c+dc) in previous
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

  // Simple 3x3 smoothing pass to reduce noise in motion field
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
 * Semi-Lagrangian advection: extrapolates the current field forward using motion vectors.
 * Applies a decay factor based on lead time (predictions fade toward climatology).
 */
export function extrapolateField(
  currentField: number[][],
  motionVectors: MotionVector[][],
  leadTimeSteps: number
): number[][] {
  const result = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  // Decay: predictions lose confidence at longer lead times
  const decay = Math.max(0.2, 1 - leadTimeSteps * 0.08);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (currentField[r][c] < 1) continue;

      const vec = motionVectors[r][c];
      // Forward advection: move the signal to where it will be
      const destR = Math.round(r + vec.dy * leadTimeSteps);
      const destC = Math.round(c + vec.dx * leadTimeSteps);

      if (destR >= 0 && destR < GRID_ROWS && destC >= 0 && destC < GRID_COLS) {
        const advected = currentField[r][c] * decay;
        result[destR][destC] = Math.max(result[destR][destC], advected);

        // Spread to immediate neighbors to simulate growth uncertainty
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = destR + dr;
            const nc = destC + dc;
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
              result[nr][nc] = Math.max(result[nr][nc], advected * 0.4);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Predicts thunderstorm probability (0-1) by combining:
 * - Motion-extrapolated radar reflectivity
 * - CAPE (convective available potential energy)
 * - Wind shear (0-6km)
 * 
 * Uses a sigmoid to map the combined signal to a calibrated probability.
 */
export function predictThunderstormRisk(
  history: number[][][],
  atmosphericFields: AtmosphericFields,
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
      const capeSignal = Math.min(1, atmosphericFields.cape[r][c] / 3500.0);
      const shearSignal = Math.min(1, atmosphericFields.shear[r][c] / 30.0);

      // Weighted combination: radar is primary, atmosphere modulates
      const combined = radarSignal * 0.55 + capeSignal * 0.25 + shearSignal * 0.20;

      // Sigmoid normalization for calibrated probability
      const risk = 1 / (1 + Math.exp(-12 * (combined - 0.35)));
      riskGrid[r][c] = risk < 0.03 ? 0 : risk; // Clean floor
    }
  }

  return riskGrid;
}

/**
 * Predicts lightning probability (0-1) derived from:
 * - Thunderstorm risk (prerequisite for lightning)
 * - CAPE (updraft strength drives charge separation)
 * - Shear (organization correlates with lightning efficiency)
 * 
 * Lightning risk is more concentrated spatially than thunderstorm risk.
 */
export function predictLightningRisk(
  thunderstormRisk: number[][],
  atmosphericFields: AtmosphericFields
): number[][] {
  const lightningRisk = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const tsRisk = thunderstormRisk[r][c];
      const cape = atmosphericFields.cape[r][c];
      const shear = atmosphericFields.shear[r][c];

      // Lightning requires substantial convection + CAPE
      if (tsRisk > 0.3 && cape > 800) {
        const capeFactor = Math.min(1, cape / 3500);
        const shearFactor = Math.min(1, shear / 25);
        // Lightning is more peaked — use power to concentrate
        lightningRisk[r][c] = Math.pow(tsRisk, 1.3) * (0.6 * capeFactor + 0.4 * shearFactor);
      }
    }
  }

  return lightningRisk;
}
