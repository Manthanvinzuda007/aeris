import { NextResponse } from 'next/server';
import { 
  seedStormScenario, 
  generateRadarCappi, 
  generateSatelliteChannels, 
  generateLightningStrokes, 
  generateFlashRateDensity,
  generateAtmosphericFields,
  getTrackedCells,
  evaluateGeofences
} from '@/lib/dummyData';
import { IMD_DWR_STATIONS, GEOFENCE_ZONES } from '@/lib/geo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const t = parseInt(searchParams.get('t') || '60', 10);
  const scenarioName = searchParams.get('scenario') || 'kalbaishakhi_norwester';

  const scenario = seedStormScenario(scenarioName);
  
  const cappi = generateRadarCappi(t, scenario);
  const satellite = generateSatelliteChannels(t, scenario);
  const lightning = generateLightningStrokes(t, scenario);
  const flashRateDensity = generateFlashRateDensity(t, scenario);
  const atmosphere = generateAtmosphericFields(t, scenario);
  const trackedCells = getTrackedCells(t, scenario);
  const geofenceBreaches = evaluateGeofences(t, scenario);

  return NextResponse.json({
    timestamp: t,
    scenario: scenarioName,
    scenarioMeta: {
      id: scenario.id,
      name: scenario.name,
      title: scenario.title,
      region: scenario.region,
      description: scenario.description,
      synopticSetup: scenario.synopticSetup,
    },
    radar: cappi.composite, // backward compatibility
    cappi,
    satellite,
    lightning,
    flashRateDensity,
    atmosphere,
    trackedCells,
    geofenceBreaches,
    radarStations: IMD_DWR_STATIONS,
    geofenceZones: GEOFENCE_ZONES,
  });
}
