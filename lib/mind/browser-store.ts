import { emptyMind } from "./graph";
import type { MindState } from "./types";

// One persistent, evolving mind (Principle P4) — kept in the visitor's own
// browser. Each person raises their own private mind; nothing leaves the device.
// Swapping this for a synced backend later touches nothing else.

const KEY = "machinera:mind:default";

export function loadMind(): MindState {
  if (typeof window === "undefined") return emptyMind("default");
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyMind("default");
    const m = JSON.parse(raw) as MindState;
    m.focus ??= [];
    m.wondering ??= null;
    return m;
  } catch {
    return emptyMind("default");
  }
}

export function saveMind(m: MindState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Storage full or unavailable — the mind simply won't persist this turn.
  }
}

export function forgetMind(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
