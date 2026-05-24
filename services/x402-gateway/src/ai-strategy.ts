export interface StrategyRecommendation {
  protocolId: string;
  allocationBps: number;
  expectedApy: number;
  riskScore: number;
}

const PROTOCOLS = {
  reserve: {
    protocolId: "reserve",
    apyRange: [1, 2] as [number, number],
    riskScore: 1,
  },
  mento: {
    protocolId: "mento",
    apyRange: [2, 4] as [number, number],
    riskScore: 3,
  },
  aave: {
    protocolId: "aave-celo",
    apyRange: [3, 5] as [number, number],
    riskScore: 5,
  },
};

function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function selectProtocol(timeHorizonDays: number): keyof typeof PROTOCOLS {
  if (timeHorizonDays < 7) return "reserve";
  if (timeHorizonDays <= 90) return "mento";
  return "aave";
}

export function analyzeStrategy(
  _user: string,
  timeHorizonDays: number
): StrategyRecommendation {
  const selected = selectProtocol(timeHorizonDays);
  const protocol = PROTOCOLS[selected];

  const allocationMap: Record<string, number> = {
    reserve: 10000,
    mento: 7000,
    aave: 6000,
  };

  return {
    protocolId: protocol.protocolId,
    allocationBps: allocationMap[selected],
    expectedApy: randomInRange(protocol.apyRange[0], protocol.apyRange[1]),
    riskScore: protocol.riskScore,
  };
}
