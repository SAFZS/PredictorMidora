export type GameState = "idle" | "countdown" | "climbing" | "crashed";

export interface RoundResult {
  roundId: number;
  crashPoint: number;
  timestamp: string;
}

export interface BetConfig {
  amount: number;
  autoCashout: number; // e.g. 2.0
  autoBetEnabled: boolean;
  strategy: "flat" | "martingale" | "fibonacci" | "custom_limits";
  martingaleMultiplier: number; // usually 2.0
  fibonacciStep: number;
}

export interface AIPrediction {
  predictedMultiplier: number;
  confidence: number;
  trendType: string;
  explanation: string;
  probabilities: {
    crashBelow1_5: number;
    crashBelow2_0: number;
    crashBelow5_0: number;
  };
  recommendedBetStrategy: string;
}

export interface SimulationRun {
  currentRound: number;
  history: number[];
  balanceOverTime: { round: number; balance: number }[];
  totalRounds: number;
  startingBalance: number;
}
