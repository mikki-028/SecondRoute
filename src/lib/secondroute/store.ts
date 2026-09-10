import type { DecisionRecord } from "./types";

/**
 * Mock persistence layer. Backend-ready: swap these four functions for
 * fetch() calls to /decisions, /evaluate, /override against FastAPI + SQLite.
 */
const KEY = "secondroute.decisions.v1";

function read(): DecisionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DecisionRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: DecisionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("secondroute:decisions"));
}

export function listDecisions(): DecisionRecord[] {
  // One final decision per return — newest wins.
  const byReturn = new Map<string, DecisionRecord>();
  for (const d of read()) {
    const existing = byReturn.get(d.returnId);
    if (!existing || d.timestamp.localeCompare(existing.timestamp) > 0) byReturn.set(d.returnId, d);
  }
  return [...byReturn.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function latestDecisionFor(returnId: string): DecisionRecord | undefined {
  return listDecisions().find((d) => d.returnId === returnId);
}

/** Upsert: a return has exactly one final decision, superseded in place. */
export function saveDecision(record: Omit<DecisionRecord, "id" | "timestamp">): DecisionRecord {
  const existing = read().find((d) => d.returnId === record.returnId);
  const full: DecisionRecord = {
    ...record,
    id: existing?.id ?? `DEC-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
  };
  write([full, ...read().filter((d) => d.returnId !== record.returnId)]);
  return full;
}

export function clearDecisions() {
  write([]);
}
