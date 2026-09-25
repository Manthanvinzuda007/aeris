import { NextResponse } from 'next/server';
import { seedStormScenario, getHistoryBuffer, generateAtmosphericFields } from '@/lib/dummyData';
import { predictThunderstormRisk, predictLightningRisk } from '@/lib/model';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const t = parseInt(searchParams.get('t') || '0', 10);
  const leadTime = parseInt(searchParams.get('leadTime') || '30', 10);
  const scenarioName = searchParams.get('scenario') || 'afternoon_thunderstorm';
  const layer = searchParams.get('layer') || 'thunderstorm';

  const scenario = seedStormScenario(scenarioName);
  const history = getHistoryBuffer(t, scenario);
  const atmosphere = generateAtmosphericFields(t, scenario);

  let predictionGrid: number[][];
  
  const thunderstormRisk = predictThunderstormRisk(history, atmosphere, leadTime);

  if (layer === 'lightning') {
    predictionGrid = predictLightningRisk(thunderstormRisk, atmosphere);
  } else {
    predictionGrid = thunderstormRisk;
  }

  return NextResponse.json({
    timestamp: t,
    leadTime,
    scenario: scenarioName,
    layer,
    grid: predictionGrid
  });
}
