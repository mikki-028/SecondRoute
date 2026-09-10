import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Info,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

import { ConfidenceTag, Field, Panel, PrototypeBadge, Tag } from "@/components/sr/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LOCATIONS, PRESETS, getReturn } from "@/lib/secondroute/data";
import { evaluateReturn, formatINR } from "@/lib/secondroute/engine";
import { applySettings, loadSettings } from "@/lib/secondroute/settings";
import { latestDecisionFor, saveDecision } from "@/lib/secondroute/store";
import {
  CONDITION_LABELS,
  DEMAND_LABELS,
  INVENTORY_LABELS,
  ROUTE_LABELS,
  SEASON_LABELS,
  type Channels,
  type Condition,
  type Demand,
  type Evaluation,
  type Inventory,
  type ItemContext,
  type RouteKey,
  type Season,
} from "@/lib/secondroute/types";

export const Route = createFileRoute("/returns/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — decision · SecondRoute` },
      {
        name: "description",
        content:
          "Feasibility gates, route economics, ranking and explanation for a single returned garment.",
      },
      { property: "og:title", content: `${params.id} — disposition decision · SecondRoute` },
      {
        property: "og:description",
        content: "Compare every feasible destination and its expected net recovery.",
      },
    ],
  }),
  component: DecisionScreen,
});

interface ChangeNotice {
  from: RouteKey;
  to: RouteKey;
  reason: string;
  fromValue: number;
  toValue: number;
  at: number;
}

function netOf(evaluation: Evaluation, key: RouteKey | null) {
  return evaluation.routes.find((r) => r.key === key)?.netRecovery ?? 0;
}

function DecisionScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const seed = getReturn(id);

  const [ctx, setCtx] = useState<ItemContext | null>(null);
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideRoute, setOverrideRoute] = useState<RouteKey | "">("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ route: RouteKey; overridden: boolean } | null>(null);
  const [pendingOverride, setPendingOverride] = useState<{ route: RouteKey; reason: string } | null>(
    null,
  );
  const baseRef = useRef<ItemContext | null>(null);

  useEffect(() => {
    if (!seed) return;
    const withSettings = applySettings(seed, loadSettings());
    baseRef.current = withSettings;
    setCtx(withSettings);
    setNotice(null);
    // Restore an already-finalized decision so a finalized return opens in its
    // final state instead of looking undecided.
    const existing = latestDecisionFor(seed.returnId);
    setSaved(existing ? { route: existing.finalDecision, overridden: existing.overridden } : null);
    setPendingOverride(
      existing?.overridden ? { route: existing.finalDecision, reason: existing.reason } : null,
    );
  }, [seed]);

  const evaluation = useMemo(() => (ctx ? evaluateReturn(ctx) : null), [ctx]);

  if (!seed) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Return not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No returned item matches <span className="num">{id}</span> in this prototype dataset.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
          Back to queue
        </Button>
      </main>
    );
  }

  if (!ctx || !evaluation) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="h-40 animate-pulse rounded-lg border border-border bg-surface" />
      </main>
    );
  }

  /** Every control change funnels through here — one engine, one code path. */
  const patch = (partial: Partial<ItemContext>, changeLabel: string) => {
    const next = { ...ctx, ...partial };
    const before = evaluation;
    const after = evaluateReturn(next);
    setCtx(next);
    if (before.ok && after.ok && before.recommended && after.recommended !== before.recommended) {
      setNotice({
        from: before.recommended,
        to: after.recommended!,
        reason: changeLabel,
        fromValue: netOf(before, before.recommended),
        toValue: netOf(after, after.recommended),
        at: Date.now(),
      });
      // On narrow screens the controls sit below the recommendation — bring the
      // updated decision back into view.
      if (typeof window !== "undefined" && window.innerWidth < 1280) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    setSaved(null);
    // A recalculated evaluation invalidates any pending override selection.
    setPendingOverride(null);
  };

  const recommendedRoute = evaluation.routes.find((r) => r.key === evaluation.recommended) ?? null;
  const ranked = [...evaluation.routes].sort((a, b) => {
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    return b.netRecovery - a.netRecovery;
  });
  const feasibleRoutes = evaluation.routes.filter((r) => r.feasible);

  /** Current decision = human override if one is in force, otherwise the engine pick. */
  const winner = pendingOverride
    ? (evaluation.routes.find((r) => r.key === pendingOverride.route) ?? recommendedRoute)
    : recommendedRoute;
  const isOverridden = Boolean(pendingOverride && winner?.key === pendingOverride.route);

  const finalize = (route: RouteKey, overridden: boolean, reason: string) => {
    saveDecision({
      returnId: ctx.returnId,
      product: ctx.product,
      originalRecommendation: evaluation.recommended,
      finalDecision: route,
      overridden,
      reason,
      confidence: evaluation.confidence,
      expectedNetRecovery: netOf(evaluation, route),
      snapshot: evaluation.snapshot,
      routes: evaluation.routes,
    });
    setSaved({ route, overridden });
  };

  const accept = () => {
    if (!winner) return;
    finalize(
      winner.key,
      isOverridden,
      isOverridden ? pendingOverride!.reason : evaluation.explanation,
    );
  };

  const submitOverride = () => {
    if (!overrideRoute) return setOverrideError("Select a destination to override to.");
    if (overrideReason.trim().length < 10)
      return setOverrideError("Give a reason of at least 10 characters — overrides are audited.");
    setOverrideError(null);
    const reason = overrideReason.trim();
    setPendingOverride({ route: overrideRoute, reason });
    finalize(overrideRoute, true, reason);
    setOverrideOpen(false);
    setOverrideReason("");
    setOverrideRoute("");
  };

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Returns queue
      </Link>

      {/* ITEM HEADER */}
      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="num text-sm font-medium text-muted-foreground">{ctx.returnId}</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            {ctx.product}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Category: {ctx.category}</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>{ctx.location}</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>Return reason: {ctx.returnReason}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={ctx.qcVerified ? "success" : "warning"}>
            <ShieldCheck className="h-3 w-3" /> QC {ctx.qcVerified ? "verified" : "unverified"}
          </Tag>
          <Tag>Item value {formatINR(ctx.basePrice)}</Tag>
          <PrototypeBadge />
        </div>
      </header>

      {/* DECISION UPDATED */}
      {notice && (
        <div
          key={notice.at}
          className="animate-rise mt-5 flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="label-xs text-primary">Decision updated</div>
            <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
              {ROUTE_LABELS[notice.from]}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {ROUTE_LABELS[notice.to]}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Reason: {notice.reason}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="label-xs">Previous</div>
              <div className="num text-sm text-muted-foreground line-through">
                {formatINR(notice.fromValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="label-xs">New</div>
              <div className="num text-sm font-semibold">{formatINR(notice.toValue)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setNotice(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* ERROR STATE */}
          {!evaluation.ok && (
            <Panel className="border-destructive/30">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <h2 className="text-sm font-semibold">Evaluation could not run</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rather than generating a recommendation from incomplete inputs, the engine stops
                    and reports what is missing.
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {evaluation.errors.map((e) => (
                      <li key={e} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-destructive" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          )}

          {/* HERO RECOMMENDATION */}
          {evaluation.ok && winner && (
            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-hero">
              <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
                <div>
                  <div className="label-xs">
                    {isOverridden ? "Current decision — human override" : "Recommended destination"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <h2 className="text-4xl font-bold uppercase tracking-tight sm:text-5xl">
                      {winner.label}
                    </h2>
                    {winner.key === "WRITE_OFF" && <Tag tone="danger">Fallback</Tag>}
                    {isOverridden && <Tag tone="warning">Overridden</Tag>}
                  </div>
                  {isOverridden && recommendedRoute && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Engine recommended {recommendedRoute.label} (
                      {formatINR(recommendedRoute.netRecovery)}). Override reason:{" "}
                      {pendingOverride!.reason}
                    </p>
                  )}
                  <p className="num mt-3 text-xl font-semibold text-success">
                    {formatINR(winner.netRecovery)}
                    <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                      expected net recovery
                    </span>
                  </p>
                </div>
                <div className="shrink-0 rounded-md border border-border bg-surface/70 p-4 sm:min-w-[240px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="label-xs">Decision confidence</span>
                    <ConfidenceTag value={evaluation.confidence} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {evaluation.confidenceReason}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Rules-based, not a model probability.
                  </p>
                </div>
              </div>
              <div className="border-t border-border bg-surface/40 px-5 py-4 sm:px-7">
                <div className="label-xs">
                  {isOverridden ? "Engine rationale for its own pick" : "Why it won"}
                </div>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed">{evaluation.explanation}</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                {saved ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>
                      {saved.overridden ? "Override" : "Decision"} logged —{" "}
                      <span className="font-semibold">{ROUTE_LABELS[saved.route]}</span>
                    </span>
                    <Link
                      to="/history"
                      className="ml-1 text-sm underline underline-offset-4 hover:no-underline"
                    >
                      View history
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The engine recommends. A human decides.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                    {isOverridden ? "Change override" : "Override"}
                  </Button>
                  <Button onClick={accept} disabled={saved?.route === winner.key}>
                    {saved?.route === winner.key
                      ? `${winner.label} finalized`
                      : `Accept ${winner.label}`}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* NO FEASIBLE ROUTE STATE */}
          {evaluation.ok && feasibleRoutes.length === 1 && winner?.key === "WRITE_OFF" && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft/60 p-4 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 text-warning" />
              <p>
                No recovery route is currently executable for this item. Write-off is the fallback —
                enabling a donation or recycling channel for {ctx.location} would create a positive
                recovery option.
              </p>
            </div>
          )}

          {/* DECISION TRACE */}
          {evaluation.ok && (
            <Panel
              title="Decision trace — all six destinations"
              action={<span className="text-xs text-muted-foreground">Ranked by net recovery</span>}
              dense
            >
              <ul className="divide-y divide-border">
                {ranked.map((route) => {
                  const isWinner = route.key === evaluation.recommended;
                  const isFinal = route.key === winner?.key;
                  const lead = (recommendedRoute?.netRecovery ?? 0) - route.netRecovery;
                  return (
                    <li
                      key={route.key}
                      className={cn(
                        "px-4 py-4 transition-colors sm:px-5",
                        isFinal && "bg-success-soft/50",
                        !route.feasible && "opacity-70",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {isFinal && <span className="h-8 w-1 rounded-full bg-success" />}
                        <span className="text-[15px] font-semibold uppercase tracking-wide">
                          {route.label}
                        </span>
                        {route.feasible ? (
                          <Tag tone="success">
                            <Check className="h-3 w-3" /> Feasible
                          </Tag>
                        ) : (
                          <Tag tone="danger">Not feasible</Tag>
                        )}
                        {isWinner && <Tag tone="ink">Engine pick</Tag>}
                        {isFinal && isOverridden && <Tag tone="warning">Final — override</Tag>}
                        {route.key === "WRITE_OFF" && !isFinal && <Tag>Fallback</Tag>}
                        <span className="num ml-auto text-base font-semibold">
                          {formatINR(route.netRecovery)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Field label="Expected value" value={<span className="num">{formatINR(route.expectedValue)}</span>} />
                        <Field label="Total cost" value={<span className="num">{formatINR(route.totalCost)}</span>} />
                        <Field
                          label="Net recovery"
                          value={<span className="num">{formatINR(route.netRecovery)}</span>}
                        />
                        <Field
                          label="Cost breakdown"
                          value={
                            <span className="num text-xs">
                              P {route.costs.processing} · R {route.costs.refurbishment} · L{" "}
                              {route.costs.logistics} · Risk {route.costs.risk}
                            </span>
                          }
                        />
                      </div>

                      {route.feasible ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {isWinner ? "Won: " : "Lost: "}
                          {isWinner
                            ? route.drivers.join(", ")
                            : `${formatINR(lead)} behind ${recommendedRoute?.label} — ${route.drivers.join(", ")}`}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Lost at the feasibility gate: {route.blockedReason} Economics above are
                          indicative only — this route cannot be executed.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {/* ITEM CONTEXT */}
          <Panel title="Item context — engine inputs">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Field label="Condition" value={CONDITION_LABELS[ctx.condition]} hint="QC graded" />
              <Field label="Category" value={ctx.category} />
              <Field label="Location" value={ctx.location} />
              <Field label="Season" value={SEASON_LABELS[ctx.season]} />
              <Field label="Demand" value={DEMAND_LABELS[ctx.demand]} hint="Simulated" />
              <Field label="Inventory" value={INVENTORY_LABELS[ctx.inventory]} hint="Simulated" />
              <Field label="Processing cost" value={<span className="num">{formatINR(ctx.processingCost)}</span>} />
              <Field
                label="Refurbishment cost"
                value={<span className="num">{formatINR(ctx.refurbishmentCost)}</span>}
              />
              <Field label="Logistics cost" value={<span className="num">{formatINR(ctx.logisticsCost)}</span>} />
              <Field
                label="Channel availability"
                value={
                  Object.entries(ctx.channels)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", ") || "none configured"
                }
              />
            </div>

            {evaluation.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-md border border-border bg-surface/50 p-3">
                {evaluation.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* DATA CONTEXT */}
          <Panel title="Data context">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="QC status" value={ctx.qcVerified ? "Verified" : "Unverified"} />
              <Field label="Inventory" value="Simulated" />
              <Field label="Demand" value="Simulated" />
              <Field label="Channel availability" value="Configured" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Data completeness score {(evaluation.dataCompleteness * 100).toFixed(0)}%. Inputs are
              synthetic prototype data — no live retailer integrations.
            </p>
          </Panel>
        </div>

        {/* SCENARIO PANEL */}
        <aside className="space-y-5">
          <Panel title="Scenario controls" action={<PrototypeBadge />}>
            <p className="text-xs text-muted-foreground">
              Changing any input re-runs the full engine: feasibility → economics → ranking →
              recommendation.
            </p>

            <div className="mt-4 space-y-3">
              <Selector
                label="Condition"
                value={ctx.condition}
                options={Object.entries(CONDITION_LABELS)}
                onChange={(v) =>
                  patch(
                    { condition: v as Condition },
                    `Condition changed from ${CONDITION_LABELS[ctx.condition]} → ${CONDITION_LABELS[v as Condition]}`,
                  )
                }
              />
              <Selector
                label="Season"
                value={ctx.season}
                options={Object.entries(SEASON_LABELS)}
                onChange={(v) =>
                  patch(
                    { season: v as Season },
                    `Season changed from ${SEASON_LABELS[ctx.season]} → ${SEASON_LABELS[v as Season]}`,
                  )
                }
              />
              <Selector
                label="Location"
                value={ctx.location}
                options={LOCATIONS.map((l) => [l, l] as [string, string])}
                onChange={(v) => patch({ location: v }, `Location changed to ${v}`)}
              />
              <Selector
                label="Demand"
                value={ctx.demand}
                options={Object.entries(DEMAND_LABELS)}
                onChange={(v) =>
                  patch(
                    { demand: v as Demand },
                    `Demand changed from ${DEMAND_LABELS[ctx.demand]} → ${DEMAND_LABELS[v as Demand]}`,
                  )
                }
              />
              <Selector
                label="Inventory"
                value={ctx.inventory}
                options={Object.entries(INVENTORY_LABELS)}
                onChange={(v) =>
                  patch(
                    { inventory: v as Inventory },
                    `Inventory changed from ${INVENTORY_LABELS[ctx.inventory]} → ${INVENTORY_LABELS[v as Inventory]}`,
                  )
                }
              />

              <div className="grid grid-cols-3 gap-2">
                <CostInput
                  label="Processing"
                  value={ctx.processingCost}
                  onChange={(n) => patch({ processingCost: n }, `Processing cost set to ₹${n}`)}
                />
                <CostInput
                  label="Refurb."
                  value={ctx.refurbishmentCost}
                  onChange={(n) => patch({ refurbishmentCost: n }, `Refurbishment cost set to ₹${n}`)}
                />
                <CostInput
                  label="Logistics"
                  value={ctx.logisticsCost}
                  onChange={(n) => patch({ logisticsCost: n }, `Logistics cost set to ₹${n}`)}
                />
              </div>

              <div className="rounded-md border border-border">
                <div className="label-xs border-b border-border px-3 py-2">Channel availability</div>
                <ul className="divide-y divide-border">
                  {(Object.keys(ctx.channels) as (keyof Channels)[]).map((key) => (
                    <li key={key} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm capitalize">{key}</span>
                      <Switch
                        checked={ctx.channels[key]}
                        onCheckedChange={(v) =>
                          patch(
                            { channels: { ...ctx.channels, [key]: v } },
                            `${key.charAt(0).toUpperCase() + key.slice(1)} channel ${v ? "enabled" : "disabled"}`,
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (baseRef.current) patch(baseRef.current, "Context reset to intake snapshot");
                  setNotice(null);
                }}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset context
              </Button>
            </div>
          </Panel>

          <Panel title="Demo scenarios">
            <ul className="space-y-2">
              {PRESETS.map((preset) => (
                <li key={preset.id}>
                  <button
                    onClick={() => patch(preset.patch, `${preset.name} applied`)}
                    className="w-full rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface"
                  >
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{preset.note}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Reference photo">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong px-4 py-6 text-center transition-colors hover:bg-surface">
              {photo ? (
                <img
                  src={photo}
                  alt="Returned garment reference"
                  className="max-h-48 rounded-md object-contain"
                />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Upload garment photo</span>
                  <span className="text-xs text-muted-foreground">
                    Attached to the QC record. Stays on this device; no vision model is used.
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhoto(URL.createObjectURL(file));
                }}
              />
            </label>
          </Panel>
        </aside>
      </div>

      {/* OVERRIDE */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Override recommendation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Recommended route is{" "}
            <span className="font-medium text-foreground">
              {winner ? ROUTE_LABELS[winner.key] : "—"}
            </span>
            . Only executable destinations can be selected, and a reason is mandatory.
          </p>
          <div className="space-y-2">
            <Label className="label-xs">Final destination</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {feasibleRoutes.map((route) => (
                <button
                  key={route.key}
                  onClick={() => {
                    setOverrideRoute(route.key);
                    setOverrideError(null);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left transition-colors",
                    overrideRoute === route.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-surface",
                  )}
                >
                  <div className="text-sm font-medium">{route.label}</div>
                  <div className="num text-xs text-muted-foreground">
                    {formatINR(route.netRecovery)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="label-xs" htmlFor="reason">
              Reason (required)
            </Label>
            <Textarea
              id="reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Store manager confirmed a local buyer for this unit at full price."
              rows={3}
            />
          </div>
          {overrideError && <p className="text-sm text-destructive">{overrideError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOverride}>Save override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Selector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="label-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CostInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="label-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        className="num mt-1.5"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}
