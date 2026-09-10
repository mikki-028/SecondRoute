export type Condition = "new" | "good" | "repairable" | "damaged" | "severely_damaged";
export type Season = "in_season" | "transition" | "out_of_season";
export type Demand = "high" | "moderate" | "low";
export type Inventory = "shortage" | "normal" | "excess";

export type RouteKey = "RESELL" | "REFURBISH" | "EXCHANGE" | "DONATE" | "RECYCLE" | "WRITE_OFF";

export interface Channels {
  resell: boolean;
  refurbish: boolean;
  exchange: boolean;
  donate: boolean;
  recycle: boolean;
}

export interface ItemContext {
  returnId: string;
  product: string;
  category: string;
  location: string;
  returnReason: string;
  returnDate: string;
  basePrice: number;
  condition: Condition;
  season: Season;
  demand: Demand;
  inventory: Inventory;
  processingCost: number;
  refurbishmentCost: number;
  logisticsCost: number;
  channels: Channels;
  qcVerified: boolean;
}

export interface RouteCosts {
  processing: number;
  refurbishment: number;
  logistics: number;
  risk: number;
  other: number;
}

export interface RouteEvaluation {
  key: RouteKey;
  label: string;
  feasible: boolean;
  blockedReason: string | null;
  expectedValue: number;
  costs: RouteCosts;
  totalCost: number;
  netRecovery: number;
  drivers: string[];
  rank: number | null;
}

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface Evaluation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  routes: RouteEvaluation[];
  recommended: RouteKey | null;
  runnerUp: RouteKey | null;
  margin: number;
  dataCompleteness: number;
  confidence: Confidence;
  confidenceReason: string;
  explanation: string;
  snapshot: ItemContext;
  evaluatedAt: string;
}

export interface DecisionRecord {
  id: string;
  returnId: string;
  product: string;
  originalRecommendation: RouteKey | null;
  finalDecision: RouteKey;
  overridden: boolean;
  reason: string;
  confidence: Confidence;
  expectedNetRecovery: number;
  timestamp: string;
  snapshot: ItemContext;
  routes: RouteEvaluation[];
}

export const ROUTE_LABELS: Record<RouteKey, string> = {
  RESELL: "Resell",
  REFURBISH: "Refurbish",
  EXCHANGE: "Exchange",
  DONATE: "Donate",
  RECYCLE: "Recycle",
  WRITE_OFF: "Write-off",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "As new",
  good: "Good",
  repairable: "Repairable",
  damaged: "Damaged",
  severely_damaged: "Severely damaged",
};

export const SEASON_LABELS: Record<Season, string> = {
  in_season: "In-season",
  transition: "Transition",
  out_of_season: "Out-of-season",
};

export const DEMAND_LABELS: Record<Demand, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export const INVENTORY_LABELS: Record<Inventory, string> = {
  shortage: "Shortage",
  normal: "Normal",
  excess: "Excess",
};
