import { conceptsOf, emptyMind, vocabulary } from "./mind/graph";
import { vetPrompt } from "./mind/firewall";
import { integrate } from "./mind/faculty";
import { imagine } from "./imagination";
import { maturity } from "./mind/maturity";
import { nextTurn } from "./mind/turn";
import { loadMind, saveMind, forgetMind } from "./mind/browser-store";
import type { MindState, Teaching, TurnView } from "./mind/types";

// The whole mind runs in the browser. By default the Mind uses the built-in local
// faculty (pure TypeScript, no network). If NEXT_PUBLIC_SIDECAR_URL is set, the
// faculty is instead served by the sidecar — a companion service backed by a real
// LLM. Either way the Imagination stays here, and the firewall still governs
// everything the mind shows or says.

const SIDECAR = process.env.NEXT_PUBLIC_SIDECAR_URL;

export function usingSidecar(): boolean {
  return Boolean(SIDECAR);
}

export function boot(): MindState {
  return loadMind();
}

export function reset(): MindState {
  forgetMind();
  return emptyMind("default");
}

export async function think(m: MindState): Promise<TurnView> {
  if (SIDECAR) return thinkViaSidecar(m);
  const view = await nextTurn(m);
  saveMind(m);
  return view;
}

export async function teach(m: MindState, t: Teaching): Promise<TurnView> {
  if (SIDECAR) return teachViaSidecar(m, t);
  integrate(m, t);
  const view = await nextTurn(m);
  saveMind(m);
  return view;
}

// --- Sidecar (real LLM faculty) paths ---------------------------------------

// Keep the caller's mind object identity so React state derived from it stays valid.
function adopt(m: MindState, incoming: MindState): void {
  Object.assign(m, incoming);
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${SIDECAR}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sidecar ${path} ${res.status}`);
  return res.json();
}

async function thinkViaSidecar(m: MindState): Promise<TurnView> {
  const data = await post("/think", { mind: m });
  adopt(m, data.mind as MindState);
  const safe = vetPrompt(data.promptLabels ?? [], vocabulary(m));
  const vision = await imagine(m, data.focus ?? [], safe);
  saveMind(m);
  return {
    vision,
    utterance: data.utterance ?? ["…", "?"],
    maturity: maturity(m),
    focusLabels: conceptsOf(m, data.focus ?? []).map((c) => c.label),
  };
}

async function teachViaSidecar(m: MindState, t: Teaching): Promise<TurnView> {
  const data = await post("/integrate", { mind: m, teaching: t });
  adopt(m, data.mind as MindState);
  return thinkViaSidecar(m);
}
