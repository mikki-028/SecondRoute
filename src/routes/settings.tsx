import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Panel, PrototypeBadge } from "@/components/sr/primitives";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/secondroute/settings";
import type { Channels } from "@/lib/secondroute/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Scenario controls — SecondRoute" },
      {
        name: "description",
        content:
          "Network-level channel availability, cost index and QC assumptions used by the SecondRoute decision engine.",
      },
      { property: "og:title", content: "Scenario controls — SecondRoute" },
      {
        property: "og:description",
        content: "Configure channel availability and cost pressure for the disposition engine.",
      },
    ],
  }),
  component: SettingsPage,
});

const CHANNEL_COPY: Record<keyof Channels, { name: string; note: string }> = {
  resell: { name: "Resale channel", note: "Marketplace / own-store re-listing of graded stock." },
  refurbish: { name: "Refurbishment capacity", note: "In-network repair and re-grading capability." },
  exchange: { name: "Exchange fulfilment", note: "Replacement dispatch against the same order." },
  donate: { name: "Donation partner", note: "Configured NGO pickup at the fulfilment location." },
  recycle: { name: "Verified recycler", note: "Textile recycling contract for this location." },
};

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => setSettings(loadSettings()), []);

  const update = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Scenario controls</h1>
        <PrototypeBadge />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        These are network-level assumptions. Disabling a channel makes it non-executable everywhere —
        the engine will never recommend a route it cannot execute, no matter how high its theoretical
        recovery value.
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <Panel title="Channel availability">
          <ul className="divide-y divide-border">
            {(Object.keys(CHANNEL_COPY) as (keyof Channels)[]).map((key) => (
              <li key={key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium">{CHANNEL_COPY[key].name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {CHANNEL_COPY[key].note}
                  </div>
                </div>
                <Switch
                  checked={settings.channels[key]}
                  onCheckedChange={(v) =>
                    update({ ...settings, channels: { ...settings.channels, [key]: v } })
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Operating cost index">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                Multiplier applied to processing, refurbishment and logistics costs.
              </span>
              <span className="num text-lg font-semibold">{settings.costIndex.toFixed(2)}×</span>
            </div>
            <Slider
              className="mt-5"
              min={0.6}
              max={2}
              step={0.05}
              value={[settings.costIndex]}
              onValueChange={([v]) => update({ ...settings, costIndex: v ?? 1 })}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0.60×</span>
              <span>2.00×</span>
            </div>
          </Panel>

          <Panel title="Data context">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">QC verification available</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  When off, condition inputs are provisional and decision confidence drops.
                </div>
              </div>
              <Switch
                checked={settings.qcVerified}
                onCheckedChange={(v) => update({ ...settings, qcVerified: v })}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border bg-surface/50 p-3 text-sm">
              <div>
                <dt className="label-xs">Inventory</dt>
                <dd className="mt-0.5">Simulated</dd>
              </div>
              <div>
                <dt className="label-xs">Demand</dt>
                <dd className="mt-0.5">Simulated</dd>
              </div>
              <div>
                <dt className="label-xs">Channel availability</dt>
                <dd className="mt-0.5">Configured</dd>
              </div>
              <div>
                <dt className="label-xs">Persistence</dt>
                <dd className="mt-0.5">Local (backend-ready)</dd>
              </div>
            </dl>
          </Panel>

          <Button variant="outline" onClick={() => update(DEFAULT_SETTINGS)}>
            Reset to defaults
          </Button>
        </div>
      </div>
    </main>
  );
}
