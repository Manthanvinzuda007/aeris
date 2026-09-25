import { NextResponse } from 'next/server';
import { 
  seedStormScenario, 
  getHistoryBuffer, 
  generateAtmosphericFields,
  getTrackedCells,
  evaluateGeofences
} from '@/lib/dummyData';
import { predictThunderstormRisk } from '@/lib/model';
import { 
  getTopAlerts, 
  getImdAlertLevel, 
  buildCapAlertXml,
  lookupDistrict 
} from '@/lib/geo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const t = parseInt(searchParams.get('t') || '60', 10);
  const scenarioName = searchParams.get('scenario') || 'kalbaishakhi_norwester';

  const scenario = seedStormScenario(scenarioName);
  const history = getHistoryBuffer(t, scenario);
  const atmosphere = generateAtmosphericFields(t, scenario);
  const trackedCells = getTrackedCells(t, scenario);
  const geofenceBreaches = evaluateGeofences(t, scenario);

  // Predict 30 mins out for alerts
  const riskGrid = predictThunderstormRisk(history, atmosphere, 30);
  
  const rawAlerts = getTopAlerts(riskGrid, 0.40);
  const alerts = rawAlerts.map(a => {
    const riskPct = Math.round(a.risk * 100);
    const distInfo = lookupDistrict(a.lat, a.lon);
    const imdLevel = getImdAlertLevel(riskPct);
    
    // Find nearest storm cell for physical metrics
    let nearestCell = trackedCells[0];
    let minDist = Infinity;
    for (const c of trackedCells) {
      const d = Math.sqrt(Math.pow(c.lat - a.lat, 2) + Math.pow(c.lon - a.lon, 2));
      if (d < minDist) {
        minDist = d;
        nearestCell = c;
      }
    }

    return {
      district: distInfo.name,
      state: distInfo.state,
      risk: riskPct,
      imdLevel,
      lat: a.lat,
      lon: a.lon,
      maxDbz: nearestCell ? nearestCell.maxDbz : Math.round(40 + a.risk * 25),
      hailProb: nearestCell ? nearestCell.hailProb : Math.round(a.risk * 75),
      gustKmh: nearestCell ? nearestCell.gustSpeedKmh : Math.round(50 + a.risk * 45),
      etaMinutes: Math.round(15 + (1 - a.risk) * 35),
    };
  });

  // Build OASIS CAP v1.2 XML for top critical alert if present
  const topAlert = alerts[0];
  const now = new Date();
  const expires = new Date(now.getTime() + 3 * 3600 * 1000); // 3 hr nowcast window

  // Polygon around top alert center
  const centerLat = topAlert ? topAlert.lat : 23.5;
  const centerLon = topAlert ? topAlert.lon : 87.0;
  const polygonCoords = [
    `${(centerLat + 0.35).toFixed(3)},${(centerLon - 0.45).toFixed(3)}`,
    `${(centerLat + 0.40).toFixed(3)},${(centerLon + 0.50).toFixed(3)}`,
    `${(centerLat - 0.30).toFixed(3)},${(centerLon + 0.55).toFixed(3)}`,
    `${(centerLat - 0.45).toFixed(3)},${(centerLon - 0.40).toFixed(3)}`,
    `${(centerLat + 0.35).toFixed(3)},${(centerLon - 0.45).toFixed(3)}`,
  ].join(' ');

  const capXml = buildCapAlertXml({
    event: topAlert && topAlert.risk >= 80 ? 'Severe Thunderstorm & Damaging Hail Warning' : 'Thunderstorm & Lightning Alert',
    headline: topAlert 
      ? `IMD/AERIS RED ALERT: Severe Thunderstorm approaching ${topAlert.district}, ${topAlert.state}` 
      : 'IMD/AERIS: Convective Weather Alert Active',
    description: `AERIS ML Nowcast predicts a severe convective cell with reflectivity > ${topAlert?.maxDbz || 55} dBZ, high cloud-to-ground lightning frequency, and strong surface gusts reaching ${topAlert?.gustKmh || 80} km/h over ${topAlert?.district || 'affected area'}.`,
    instruction: 'Take immediate shelter in substantial enclosed buildings. Disconnect electrical appliances. Avoid open water, tall isolated trees, and metal structures. Aviation operations initiate convective rerouting.',
    polygon: polygonCoords,
    areaDesc: topAlert ? `${topAlert.district} District and adjoining regions, ${topAlert.state}` : 'Eastern Convective Corridor',
    sentTime: now,
    expiresTime: expires,
    severity: topAlert && topAlert.risk >= 80 ? 'Extreme' : 'Severe',
    urgency: 'Immediate',
    certainty: 'Observed',
  });

  return NextResponse.json({
    timestamp: t,
    scenario: scenarioName,
    alerts,
    geofenceBreaches,
    capXml,
  });
}
