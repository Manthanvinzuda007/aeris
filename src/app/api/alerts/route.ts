import { NextResponse } from 'next/server';
import { seedStormScenario, getHistoryBuffer, generateAtmosphericFields } from '@/lib/dummyData';
import { predictThunderstormRisk } from '@/lib/model';
import { getTopAlerts } from '@/lib/geo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const t = parseInt(searchParams.get('t') || '0', 10);
  const scenarioName = searchParams.get('scenario') || 'afternoon_thunderstorm';

  const scenario = seedStormScenario(scenarioName);
  const history = getHistoryBuffer(t, scenario);
  const atmosphere = generateAtmosphericFields(t, scenario);

  // Predict 30 mins out for alerts
  const riskGrid = predictThunderstormRisk(history, atmosphere, 30);
  
  const alerts = getTopAlerts(riskGrid, 0.65).map(a => ({
    ...a,
    risk: Math.round(a.risk * 100)
  }));

  return NextResponse.json({
    timestamp: t,
    scenario: scenarioName,
    alerts
  });
}
