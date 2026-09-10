import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Panel, PrototypeBadge, RouteTag, Tag } from "@/components/sr/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/lib/secondroute/engine";
import { clearDecisions, listDecisions } from "@/lib/secondroute/store";
import {
  CONDITION_LABELS,
  DEMAND_LABELS,
  INVENTORY_LABELS,
  SEASON_LABELS,
  type DecisionRecord,
} from "@/lib/secondroute/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Decision history — SecondRoute" },
      {
        name: "description",
        content:
          "Auditable log of every disposition decision: recommendation, final route, override reason and the exact input snapshot.",
      },
      { property: "og:title", content: "Decision history — SecondRoute" },
      {
        property: "og:description",
        content: "Every logged returns decision with its input snapshot, for audit.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [records, setRecords] = useState<DecisionRecord[]>([]);
  const [open, setOpen] = useState<DecisionRecord | null>(null);

  useEffect(() => {
    const sync = () => setRecords(listDecisions());
    sync();
    window.addEventListener("secondroute:decisions", sync);
    return () => window.removeEventListener("secondroute:decisions", sync);
  }, []);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Decision history</h1>
            <PrototypeBadge />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The engine recommends; a human decides. Every entry keeps the input snapshot used at
            decision time, so any outcome can be replayed and audited.
          </p>
        </div>
        {records.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => clearDecisions()}>
            Clear log
          </Button>
        )}
      </div>

      <Panel className="mt-7" dense>
        {records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium">No decisions logged yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Open a return from the queue, review its decision trace, then accept or override the
              recommendation. It will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left">
                  {[
                    "Return ID",
                    "Recommended",
                    "Final decision",
                    "Override",
                    "Net recovery",
                    "Timestamp",
                    "Reason",
                  ].map((h) => (
                    <th key={h} className="label-xs px-4 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setOpen(d)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface/70"
                  >
                    <td className="num px-4 py-3 text-[13px] font-medium">{d.returnId}</td>
                    <td className="px-4 py-3">
                      <RouteTag route={d.originalRecommendation} />
                    </td>
                    <td className="px-4 py-3">
                      <RouteTag route={d.finalDecision} />
                    </td>
                    <td className="px-4 py-3">
                      {d.overridden ? <Tag tone="warning">Human override</Tag> : <Tag>Accepted</Tag>}
                    </td>
                    <td className="num px-4 py-3 text-[13px]">{formatINR(d.expectedNetRecovery)}</td>
                    <td className="num px-4 py-3 text-[13px] text-muted-foreground">
                      {new Date(d.timestamp).toLocaleString("en-IN")}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground">
                      {d.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  {open.returnId} — input snapshot
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {open.product} · decided {new Date(open.timestamp).toLocaleString("en-IN")} ·
                confidence {open.confidence}
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-border bg-surface/50 p-4 text-sm sm:grid-cols-3">
                {[
                  ["Condition", CONDITION_LABELS[open.snapshot.condition]],
                  ["Season", SEASON_LABELS[open.snapshot.season]],
                  ["Demand", DEMAND_LABELS[open.snapshot.demand]],
                  ["Inventory", INVENTORY_LABELS[open.snapshot.inventory]],
                  ["Location", open.snapshot.location],
                  ["Return reason", open.snapshot.returnReason],
                  ["Item value", formatINR(open.snapshot.basePrice)],
                  ["Processing cost", formatINR(open.snapshot.processingCost)],
                  ["Refurbishment cost", formatINR(open.snapshot.refurbishmentCost)],
                  ["Logistics cost", formatINR(open.snapshot.logisticsCost)],
                  ["QC status", open.snapshot.qcVerified ? "Verified" : "Unverified"],
                  [
                    "Channels",
                    Object.entries(open.snapshot.channels)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ") || "none",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="label-xs">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-md border border-border p-4">
                <div className="label-xs">Route ranking at decision time</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {open.routes.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3">
                      <span className={r.feasible ? "" : "text-muted-foreground line-through"}>
                        {r.label}
                      </span>
                      <span className="num text-[13px]">
                        {r.feasible ? formatINR(r.netRecovery) : "not feasible"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {open.reason && (
                <div className="rounded-md border border-border bg-surface/50 p-4 text-sm">
                  <div className="label-xs">Reason recorded</div>
                  <p className="mt-1">{open.reason}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
