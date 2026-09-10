import {
  CONDITION_LABELS,
  DEMAND_LABELS,
  INVENTORY_LABELS,
  ROUTE_LABELS,
  SEASON_LABELS,
  type Condition,
  type Confidence,
  type Evaluation,
  type ItemContext,
  type RouteEvaluation,
  type RouteKey,
} from "./types";

/**
 * SecondRoute decision engine — deterministic rules + economics.
 * Single entry point: evaluateReturn(context).
 * No ML, no randomness. Same input always produces the same decision.
 */

const CONDITION_FACTOR: Record<Condition, number> = {
  new: 0.85,
  good: 0.7,
  repairable: 0.45,
  damaged: 0.3,
  severely_damaged: 0.1,
};

const DEMAND_FACTOR = { high: 1.1, moderate: 1.0, low: 0.85 } as const;
const SEASON_FACTOR = { in_season: 1.08, transition: 1.0, out_of_season: 0.85 } as const;
const INVENTORY_FACTOR = { shortage: 1.08, normal: 1.0, excess: 0.88 } as const;

/** Deterministic tie-break order: operationally preferred routes first. */
const PRIORITY: RouteKey[] = ["RESELL", "EXCHANGE", "REFURBISH", "DONATE", "RECYCLE", "WRITE_OFF"];

const r = (n: number) => Math.round(n);

function markdownRisk(ctx: ItemContext, base: number, weight: number) {
  let pct = 0.03;
  if (ctx.season === "transition") pct += 0.02;
  if (ctx.season === "out_of_season") pct += 0.06;
  if (ctx.demand === "moderate") pct += 0.02;
  if (ctx.demand === "low") pct += 0.05;
  if (ctx.inventory === "excess") pct += 0.04;
  if (ctx.inventory === "shortage") pct -= 0.01;
  return base * Math.max(pct, 0.01) * weight;
}

function validate(ctx: ItemContext) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ctx.basePrice || ctx.basePrice <= 0) errors.push("Item base value is missing or zero.");
  if (ctx.processingCost < 0) errors.push("Processing cost cannot be negative.");
  if (ctx.refurbishmentCost < 0) errors.push("Refurbishment cost cannot be negative.");
  if (ctx.logisticsCost < 0) errors.push("Logistics cost cannot be negative.");
  if (!ctx.location) errors.push("Fulfilment location is missing.");

  if (!ctx.qcVerified) warnings.push("QC status is unverified — condition input is provisional.");
  if (!ctx.channels.donate) warnings.push("No donation channel configured for this location.");
  if (!ctx.channels.recycle) warnings.push("No verified recycling channel for this location.");
  return { errors, warnings };
}

function completeness(ctx: ItemContext) {
  const checks = [
    ctx.basePrice > 0,
    ctx.qcVerified,
    Boolean(ctx.location),
    Boolean(ctx.returnReason),
    ctx.processingCost > 0,
    ctx.logisticsCost > 0,
    Object.values(ctx.channels).some(Boolean),
  ];
  return checks.filter(Boolean).length / checks.length;
}

function buildRoutes(ctx: ItemContext): RouteEvaluation[] {
  const base = ctx.basePrice;
  const cond = CONDITION_FACTOR[ctx.condition];
  const dem = DEMAND_FACTOR[ctx.demand];
  const sea = SEASON_FACTOR[ctx.season];
  const inv = INVENTORY_FACTOR[ctx.inventory];
  const routes: RouteEvaluation[] = [];

  const make = (
    key: RouteKey,
    feasible: boolean,
    blockedReason: string | null,
    expectedValue: number,
    costs: Partial<RouteEvaluation["costs"]>,
    drivers: string[],
  ): RouteEvaluation => {
    const c = {
      processing: r(costs.processing ?? 0),
      refurbishment: r(costs.refurbishment ?? 0),
      logistics: r(costs.logistics ?? 0),
      risk: r(costs.risk ?? 0),
      other: r(costs.other ?? 0),
    };
    const totalCost = c.processing + c.refurbishment + c.logistics + c.risk + c.other;
    const ev = r(expectedValue);
    return {
      key,
      label: ROUTE_LABELS[key],
      feasible,
      blockedReason,
      // Economics are always computed so the trace can show why a blocked route
      // would have lost anyway; ranking only ever considers feasible routes.
      expectedValue: ev,
      costs: c,
      totalCost,
      netRecovery: ev - totalCost,
      drivers,
      rank: null,
    };
  };

  // ---- RESELL ----
  {
    const resellable = ctx.condition === "new" || ctx.condition === "good";
    const blocked = !ctx.channels.resell
      ? "Resale channel unavailable for this location."
      : !resellable
        ? `Condition "${CONDITION_LABELS[ctx.condition]}" fails resale QC gate.`
        : null;
    routes.push(
      make(
        "RESELL",
        !blocked,
        blocked,
        base * cond * dem * sea * inv,
        {
          processing: ctx.processingCost,
          logistics: ctx.logisticsCost,
          risk: markdownRisk(ctx, base, 1),
        },
        [
          `${CONDITION_LABELS[ctx.condition]} condition`,
          `${DEMAND_LABELS[ctx.demand].toLowerCase()} demand`,
          `${SEASON_LABELS[ctx.season].toLowerCase()}`,
          `${INVENTORY_LABELS[ctx.inventory].toLowerCase()} inventory`,
        ],
      ),
    );
  }

  // ---- REFURBISH ----
  {
    const repairable = ctx.condition === "repairable" || ctx.condition === "damaged";
    const upliftFactor = Math.min(0.75, cond + 0.3);
    const value = base * upliftFactor * dem * (1 + (sea - 1) * 0.6) * inv;
    const viable = ctx.refurbishmentCost <= value * 0.55;
    const blocked = !ctx.channels.refurbish
      ? "No refurbishment capacity configured."
      : !repairable
        ? ctx.condition === "severely_damaged"
          ? "Damage beyond repairable threshold."
          : "Item does not require refurbishment."
        : !viable
          ? "Refurbishment cost exceeds 55% of recoverable value."
          : null;
    routes.push(
      make(
        "REFURBISH",
        !blocked,
        blocked,
        value,
        {
          processing: ctx.processingCost,
          refurbishment: ctx.refurbishmentCost,
          logistics: ctx.logisticsCost * 0.9,
          risk: markdownRisk(ctx, base, 1.2),
          other: base * 0.01,
        },
        [
          `repair uplift to ${(upliftFactor * 100).toFixed(0)}% of value`,
          `repair cost ${r(ctx.refurbishmentCost)}`,
          `${DEMAND_LABELS[ctx.demand].toLowerCase()} demand`,
        ],
      ),
    );
  }

  // ---- EXCHANGE ----
  {
    const stockAvailable = ctx.inventory !== "shortage";
    const gradeOk = ctx.condition === "new" || ctx.condition === "good";
    const blocked = !ctx.channels.exchange
      ? "Exchange channel not enabled."
      : !stockAvailable
        ? "No replacement inventory available in this size/style."
        : !gradeOk
          ? "Returned unit cannot re-enter sellable stock for an exchange."
          : null;
    routes.push(
      make(
        "EXCHANGE",
        !blocked,
        blocked,
        base * 0.55 * (1 + (dem - 1) * 0.5) * inv,
        {
          processing: ctx.processingCost * 0.8,
          logistics: ctx.logisticsCost * 1.25,
          risk: markdownRisk(ctx, base, 0.5),
        },
        ["retained margin on replacement sale", "two-way logistics", "replacement stock available"],
      ),
    );
  }

  // ---- DONATE ----
  {
    const wearable = ctx.condition !== "severely_damaged";
    const blocked = !ctx.channels.donate
      ? "No configured donation channel."
      : !wearable
        ? "Item not wearable — donation partners reject this grade."
        : null;
    routes.push(
      make(
        "DONATE",
        !blocked,
        blocked,
        base * 0.12,
        { processing: ctx.processingCost * 0.5, logistics: ctx.logisticsCost * 0.7 },
        ["CSR / tax credit value only", "location-dependent partner pickup"],
      ),
    );
  }

  // ---- RECYCLE ----
  {
    const blocked = !ctx.channels.recycle ? "No verified recycling channel for this location." : null;
    routes.push(
      make(
        "RECYCLE",
        !blocked,
        blocked,
        base * 0.06 * (ctx.condition === "severely_damaged" ? 1 : 1.1),
        { processing: ctx.processingCost * 0.4, logistics: ctx.logisticsCost * 0.6 },
        ["material recovery value", "condition-independent, demand-independent"],
      ),
    );
  }

  // ---- WRITE-OFF (always available fallback) ----
  routes.push(
    make("WRITE_OFF", true, null, 0, {}, ["fallback when no route is executable", "zero recovery"]),
  );

  return routes;
}

function rank(routes: RouteEvaluation[]) {
  const feasible = routes.filter((x) => x.feasible);
  feasible.sort((a, b) => {
    if (b.netRecovery !== a.netRecovery) return b.netRecovery - a.netRecovery;
    return PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key);
  });
  feasible.forEach((x, i) => (x.rank = i + 1));
  return feasible;
}

function confidenceOf(
  completenessScore: number,
  margin: number,
  winner: RouteEvaluation,
): { confidence: Confidence; reason: string } {
  const denom = Math.max(Math.abs(winner.netRecovery), 1);
  const marginPct = margin / denom;
  const coverage =
    completenessScore >= 0.9 ? "Strong data coverage" : completenessScore >= 0.7 ? "Adequate data coverage" : "Partial data coverage";
  const lead =
    margin > 0
      ? `₹${margin.toLocaleString("en-IN")} lead over next-best executable route`
      : "no lead over next-best route (tie-break applied)";

  let confidence: Confidence = "LOW";
  if (completenessScore >= 0.85 && marginPct >= 0.12) confidence = "HIGH";
  else if (completenessScore >= 0.7 && marginPct >= 0.04) confidence = "MEDIUM";
  return { confidence, reason: `${coverage} + ${lead}` };
}

function explain(winner: RouteEvaluation, runnerUp: RouteEvaluation | null, ctx: ItemContext) {
  const parts: string[] = [];
  if (winner.key === "WRITE_OFF") {
    parts.push("No recovery route passed its feasibility gate, so write-off is the only executable outcome.");
  } else {
    parts.push(
      `${winner.label} passes its feasibility gate and returns the highest expected net recovery (₹${winner.netRecovery.toLocaleString("en-IN")}) for a ${CONDITION_LABELS[ctx.condition].toLowerCase()} ${ctx.category.toLowerCase()} item with ${DEMAND_LABELS[ctx.demand].toLowerCase()} demand, ${SEASON_LABELS[ctx.season].toLowerCase()} timing and ${INVENTORY_LABELS[ctx.inventory].toLowerCase()} inventory at ${ctx.location}.`,
    );
  }
  if (runnerUp) {
    parts.push(
      `Next-best executable route was ${runnerUp.label} at ₹${runnerUp.netRecovery.toLocaleString("en-IN")}.`,
    );
  }
  return parts.join(" ");
}

export function evaluateReturn(ctx: ItemContext): Evaluation {
  const { errors, warnings } = validate(ctx);
  const evaluatedAt = new Date().toISOString();

  if (errors.length) {
    return {
      ok: false,
      errors,
      warnings,
      routes: [],
      recommended: null,
      runnerUp: null,
      margin: 0,
      dataCompleteness: completeness(ctx),
      confidence: "LOW",
      confidenceReason: "Evaluation could not run — required inputs are missing.",
      explanation: "",
      snapshot: structuredClone(ctx),
      evaluatedAt,
    };
  }

  const routes = buildRoutes(ctx);
  const ranked = rank(routes);
  const winner = ranked[0]!;
  const runnerUp = ranked[1] ?? null;
  const margin = winner.netRecovery - (runnerUp?.netRecovery ?? 0);
  const score = completeness(ctx);
  const { confidence, reason } = confidenceOf(score, margin, winner);

  return {
    ok: true,
    errors,
    warnings,
    routes,
    recommended: winner.key,
    runnerUp: runnerUp?.key ?? null,
    margin,
    dataCompleteness: score,
    confidence,
    confidenceReason: reason,
    explanation: explain(winner, runnerUp, ctx),
    snapshot: structuredClone(ctx),
    evaluatedAt,
  };
}

export function formatINR(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(value)).toLocaleString("en-IN")}`;
}
