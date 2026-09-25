/**
 * AERIS Geography Utilities
 * 
 * India bounding box, grid ↔ lat/lon conversion, district lookup,
 * and risk-level color mapping using the real meteorological reflectivity ramp.
 */

// India geographic bounds
export const INDIA_BOUNDS = {
  latMin: 6,
  latMax: 37,
  lonMin: 68,
  lonMax: 98,
};

// Grid dimensions: 64×64 cells covering the India bounding box
// Each cell ≈ 0.484° lat × 0.476° lon ≈ 50 km resolution
export const GRID_ROWS = 64;
export const GRID_COLS = 64;

// Derived cell size
export const CELL_LAT = (INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin) / GRID_ROWS;
export const CELL_LON = (INDIA_BOUNDS.lonMax - INDIA_BOUNDS.lonMin) / GRID_COLS;

/**
 * Convert grid indices (row, col) to geographic coordinates (lat, lon).
 * Row 0 is the northernmost row (37°N), row 63 is the southernmost (6°N).
 */
export function gridToLatLon(row: number, col: number) {
  const lat =
    INDIA_BOUNDS.latMax -
    (row / (GRID_ROWS - 1)) * (INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin);
  const lon =
    INDIA_BOUNDS.lonMin +
    (col / (GRID_COLS - 1)) * (INDIA_BOUNDS.lonMax - INDIA_BOUNDS.lonMin);
  return { lat, lon };
}

/**
 * Convert geographic coordinates (lat, lon) to grid indices (row, col).
 * Clamps to valid grid range.
 */
export function latLonToGrid(lat: number, lon: number) {
  const row = Math.round(
    ((INDIA_BOUNDS.latMax - lat) / (INDIA_BOUNDS.latMax - INDIA_BOUNDS.latMin)) *
      (GRID_ROWS - 1)
  );
  const col = Math.round(
    ((lon - INDIA_BOUNDS.lonMin) / (INDIA_BOUNDS.lonMax - INDIA_BOUNDS.lonMin)) *
      (GRID_COLS - 1)
  );
  return {
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
  };
}

/**
 * Map a 0-1 risk value to the meteorological reflectivity ramp color.
 * This is the same convention real radar tools use:
 *   blue (light) → green (moderate) → yellow (heavy) → orange (severe) → red (extreme)
 */
export function getRiskColor(value: number): string {
  if (value < 0.2) return '#3B82F6'; // light
  if (value < 0.4) return '#22C55E'; // moderate
  if (value < 0.6) return '#EAB308'; // heavy
  if (value < 0.8) return '#F97316'; // severe
  return '#DC2626'; // extreme
}

export function getRiskLabel(value: number): string {
  if (value < 0.2) return 'Light';
  if (value < 0.4) return 'Moderate';
  if (value < 0.6) return 'Heavy';
  if (value < 0.8) return 'Severe';
  return 'Extreme';
}

// ============================================================================
// District Lookup Table — 30 major Indian cities/regions
// SWAP POINT: replace with proper reverse geocoding or IMD district shapefile
// ============================================================================

const DISTRICTS = [
  { name: 'Mumbai', lat: 19.076, lon: 72.877 },
  { name: 'Delhi', lat: 28.704, lon: 77.102 },
  { name: 'Kolkata', lat: 22.572, lon: 88.363 },
  { name: 'Chennai', lat: 13.082, lon: 80.27 },
  { name: 'Bangalore', lat: 12.971, lon: 77.594 },
  { name: 'Hyderabad', lat: 17.385, lon: 78.486 },
  { name: 'Ahmedabad', lat: 23.022, lon: 72.571 },
  { name: 'Pune', lat: 18.52, lon: 73.856 },
  { name: 'Jaipur', lat: 26.912, lon: 75.787 },
  { name: 'Lucknow', lat: 26.846, lon: 80.946 },
  { name: 'Bhopal', lat: 23.259, lon: 77.412 },
  { name: 'Patna', lat: 25.594, lon: 85.137 },
  { name: 'Ranchi', lat: 23.344, lon: 85.309 },
  { name: 'Bhubaneswar', lat: 20.296, lon: 85.824 },
  { name: 'Visakhapatnam', lat: 17.686, lon: 83.218 },
  { name: 'Nagpur', lat: 21.145, lon: 79.088 },
  { name: 'Indore', lat: 22.719, lon: 75.857 },
  { name: 'Coimbatore', lat: 11.016, lon: 76.955 },
  { name: 'Thiruvananthapuram', lat: 8.524, lon: 76.936 },
  { name: 'Kochi', lat: 9.931, lon: 76.267 },
  { name: 'Guwahati', lat: 26.144, lon: 91.736 },
  { name: 'Chandigarh', lat: 30.733, lon: 76.779 },
  { name: 'Dehradun', lat: 30.316, lon: 78.032 },
  { name: 'Shimla', lat: 31.104, lon: 77.173 },
  { name: 'Srinagar', lat: 34.083, lon: 74.797 },
  { name: 'Amritsar', lat: 31.634, lon: 74.872 },
  { name: 'Varanasi', lat: 25.317, lon: 82.973 },
  { name: 'Agra', lat: 27.176, lon: 78.008 },
  { name: 'Kanpur', lat: 26.449, lon: 80.331 },
  { name: 'Raipur', lat: 21.251, lon: 81.629 },
];

/**
 * Find the closest known district/city to a given lat/lon.
 * Returns 'Remote Area' if no city is within ~3 degrees.
 */
export function lookupDistrict(lat: number, lon: number): string {
  let closest = 'Remote Area';
  let minDistSq = Infinity;

  for (const d of DISTRICTS) {
    const dLat = d.lat - lat;
    const dLon = d.lon - lon;
    const distSq = dLat * dLat + dLon * dLon;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = d.name;
    }
  }

  // If distance is > ~3 degrees (~300 km), label generically
  if (minDistSq > 9) return 'Remote Area';
  return closest;
}

// ============================================================================
// Alert Extraction — cluster high-risk cells and map to districts
// ============================================================================

/**
 * Extract ranked alerts from a risk grid.
 * Clusters adjacent high-risk cells using BFS, then maps each cluster
 * to the nearest known district.
 */
export function getTopAlerts(
  riskGrid: number[][],
  threshold: number = 0.7
): { district: string; risk: number; lat: number; lon: number }[] {
  const alerts: { district: string; risk: number; lat: number; lon: number }[] = [];
  const visited = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(false)
  );

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (visited[r][c] || riskGrid[r][c] < threshold) continue;

      // BFS flood-fill to find connected cluster
      let maxRisk = riskGrid[r][c];
      let sumLat = 0;
      let sumLon = 0;
      let count = 0;
      const queue = [{ r, c }];
      visited[r][c] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const coords = gridToLatLon(curr.r, curr.c);
        sumLat += coords.lat;
        sumLon += coords.lon;
        count++;

        if (riskGrid[curr.r][curr.c] > maxRisk) {
          maxRisk = riskGrid[curr.r][curr.c];
        }

        // 4-connected neighbors
        const dirs = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        for (const [dr, dc] of dirs) {
          const nr = curr.r + dr;
          const nc = curr.c + dc;
          if (
            nr >= 0 &&
            nr < GRID_ROWS &&
            nc >= 0 &&
            nc < GRID_COLS &&
            !visited[nr][nc] &&
            riskGrid[nr][nc] >= threshold
          ) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }

      const centerLat = sumLat / count;
      const centerLon = sumLon / count;
      const district = lookupDistrict(centerLat, centerLon);

      alerts.push({
        district,
        risk: maxRisk,
        lat: centerLat,
        lon: centerLon,
      });
    }
  }

  // Sort by risk descending, deduplicate districts (keep highest)
  alerts.sort((a, b) => b.risk - a.risk);
  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.district)) return false;
    seen.add(a.district);
    return true;
  });
}
