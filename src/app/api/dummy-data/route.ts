import { NextResponse } from 'next/server';
import { 
  seedStormScenario, 
  generateRadarGrid, 
  generateSatelliteChannels, 
  generateLightningFlashes, 
  generateAtmosphericFields 
} from '@/lib/dummyData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const t = parseInt(searchParams.get('t') || '0', 10);
  const scenarioName = searchParams.get('scenario') || 'afternoon_thunderstorm';

  const scenario = seedStormScenario(scenarioName);
  
  const radar = generateRadarGrid(t, scenario);
  const satellite = generateSatelliteChannels(t, scenario);
  const lightning = generateLightningFlashes(t, scenario);
  const atmosphere = generateAtmosphericFields(t, scenario);

  return NextResponse.json({
    timestamp: t,
    scenario: scenarioName,
    radar,
    satellite,
    lightning,
    atmosphere
  });
}
