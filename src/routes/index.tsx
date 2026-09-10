import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Panel, PrototypeBadge, RouteTag, Tag } from "@/components/sr/primitives";
import { RETURNS } from "@/lib/secondroute/data";
import { evaluateReturn, formatINR } from "@/lib/secondroute/engine";
import { applySettings, loadSettings, type AppSettings } from "@/lib/secondroute/settings";
import { listDecisions } from "@/lib/secondroute/store";
import { CONDITION_LABELS, type DecisionRecord } from "@/lib/secondroute/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Returns queue — SecondRoute" },
      {
        name: "description",
        content:
          "Every returned garment in the queue, with the destination SecondRoute's decision engine currently recommends.",
      },
      { property: "og:title", content: "Returns queue — SecondRoute" },
      {
        property: "og:description",
        content: "Context-aware disposition recommendations for returned fashion items.",
      },
    ],
  }),
  component: QueuePage,
});

function useLiveState() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  useEffect(() => {
    const sync = () => {
      setSettings(loadSettings());
      setDecisions(listDecisions());
    };
    sync();
    window.addEventListener("secondroute:settings", sync);
    window.addEventListener("secondroute:decisions", sync);
    return () => {
      window.removeEventListener("secondroute:settings", sync);
      window.removeEventListener("secondroute:decisions", sync);
    };
  }, []);
  return { settings, decisions };
}

function QueuePage() {
  const { settings, decisions } = useLiveState();
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      RETURNS.map((item) => {
        const ctx = applySettings(item, settings);
        const evaluation = evaluateReturn(ctx);
        const decision = decisions.find((d) => d.returnId === item.returnId);
        return { item, ctx, evaluation, decision };
      }),
    [settings, decisions],
  );

  const activeRows = rows.filter((r) => !r.decision);
  const finalizedRows = rows.filter((r) => r.decision);
  const potential = activeRows.reduce((sum, r) => {
    const win = r.evaluation.routes.find((x) => x.key === r.evaluation.recommended);
    return sum + (win?.netRecovery ?? 0);
  }, 0);
  const recovered = finalizedRows.reduce((sum, r) => sum + (r.decision?.expectedNetRecovery ?? 0), 0);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[26px]">Returns queue</h1>
            <PrototypeBadge />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            SecondRoute scores every feasible destination for each returned item and surfaces the
            best executable route. Open a return to inspect the decision trace or change its context.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <Metric label="In queue" value={String(rows.length)} />
          <Metric label="Decisions logged" value={String(decided)} />
          <Metric label="Recoverable value" value={formatINR(potential)} />
        </div>
      </div>

      <Panel className="mt-7" dense>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left">
                {[
                  "Return ID",
                  "Product",
                  "Category",
                  "Condition",
                  "Location",
                  "Return date",
                  "Status",
                  "Recommendation",
                  "",
                ].map((h) => (
                  <th key={h} className="label-xs px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, ctx, evaluation, decision }) => {
                const win = evaluation.routes.find((x) => x.key === evaluation.recommended);
                return (
                  <tr
                    key={item.returnId}
                    onClick={() => navigate({ to: "/returns/$id", params: { id: item.returnId } })}
                    className="group cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface/70"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/returns/$id"
                        params={{ id: item.returnId }}
                        className="num text-[13px] font-medium underline-offset-4 hover:underline"
                      >
                        {item.returnId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.product}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {CONDITION_LABELS[ctx.condition]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
                    <td className="num px-4 py-3 text-[13px] text-muted-foreground">
                      {item.returnDate}
                    </td>
                    <td className="px-4 py-3">
                      {decision ? (
                        <Tag tone={decision.overridden ? "warning" : "success"}>
                          {decision.overridden ? "Overridden" : "Accepted"}
                        </Tag>
                      ) : (
                        <Tag>Awaiting decision</Tag>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RouteTag route={evaluation.recommended} />
                        <span className="num text-[13px] text-muted-foreground">
                          {win ? formatINR(win.netRecovery) : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/returns/$id"
                        params={{ id: item.returnId }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border pl-3 sm:pl-4">
      <div className="label-xs">{label}</div>
      <div className="num mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
