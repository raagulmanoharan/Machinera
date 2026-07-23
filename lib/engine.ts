import { emptyMind } from "./mind/graph";
import { integrate } from "./mind/faculty";
import { nextTurn } from "./mind/turn";
import { loadMind, saveMind, forgetMind } from "./mind/browser-store";
import type { MindState, Teaching, TurnView } from "./mind/types";

// The whole mind runs in the browser — no server. The Mind and Imagination are
// pure TypeScript, so the same code that drove the API routes drives the client.

export function boot(): MindState {
  return loadMind();
}

export function reset(): MindState {
  forgetMind();
  return emptyMind("default");
}

// Form the next thought (curiosity → image → question) and persist.
export async function think(m: MindState): Promise<TurnView> {
  const view = await nextTurn(m);
  saveMind(m);
  return view;
}

// Fold the parent's answer into the mind, then immediately form the next thought.
export async function teach(m: MindState, t: Teaching): Promise<TurnView> {
  integrate(m, t);
  const view = await nextTurn(m);
  saveMind(m);
  return view;
}
