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
  return read().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function latestDecisionFor(returnId: string): DecisionRecord | undefined {
  return listDecisions().find((d) => d.returnId === returnId);
}

export function saveDecision(record: Omit<DecisionRecord, "id" | "timestamp">): DecisionRecord {
  const full: DecisionRecord = {
    ...record,
    id: `DEC-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
  };
  write([full, ...read()]);
  return full;
}

export function clearDecisions() {
  write([]);
}
