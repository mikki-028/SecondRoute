import type { Channels, ItemContext } from "./types";

const KEY = "secondroute.settings.v1";

export interface AppSettings {
  /** Network-level channel availability. A disabled channel is never executable. */
  channels: Channels;
  /** Multiplier applied to seeded operating costs, simulating network cost pressure. */
  costIndex: number;
  qcVerified: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  channels: { resell: true, refurbish: true, exchange: true, donate: true, recycle: true },
  costIndex: 1,
  qcVerified: true,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(next: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("secondroute:settings"));
}

/** Applies network settings on top of the seeded item record. */
export function applySettings(item: ItemContext, s: AppSettings): ItemContext {
  return {
    ...item,
    qcVerified: item.qcVerified && s.qcVerified,
    processingCost: Math.round(item.processingCost * s.costIndex),
    refurbishmentCost: Math.round(item.refurbishmentCost * s.costIndex),
    logisticsCost: Math.round(item.logisticsCost * s.costIndex),
    channels: {
      resell: item.channels.resell && s.channels.resell,
      refurbish: item.channels.refurbish && s.channels.refurbish,
      exchange: item.channels.exchange && s.channels.exchange,
      donate: item.channels.donate && s.channels.donate,
      recycle: item.channels.recycle && s.channels.recycle,
    },
  };
}
