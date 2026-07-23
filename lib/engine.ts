import { conceptsOf, emptyMind, vocabulary } from "./mind/graph";
import { vetPrompt } from "./mind/firewall";
import { integrate, localMessage } from "./mind/faculty";
import { imagine } from "./imagination";
import { loadMind, saveMind, forgetMind } from "./mind/browser-store";
import type { ChildMessage, MindState, Vision } from "./mind/types";

// The conversation engine, in the browser. The child opens; the parent replies in
// free text; the child learns and speaks again. By default the faculty is local;
// if NEXT_PUBLIC_SIDECAR_URL is set, a real LLM (via the sidecar) gives the child
// a deepening voice. The Imagination renders what the child is looking at.

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

export interface Spoken {
  text: string;
  vision?: Vision; // absent when the child is only talking
}

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

// Build the image the child is showing (only if it chose to show one), persist.
async function render(m: MindState, msg: ChildMessage): Promise<Spoken> {
  let vision: Vision | undefined;
  if (msg.show) {
    const safe = vetPrompt(msg.promptLabels, vocabulary(m));
    vision = await imagine(m, msg.focus, safe);
  }
  saveMind(m);
  void conceptsOf; // (kept for parity with earlier API)
  return { text: msg.text, vision };
}

// The child's first message, from whatever it currently is.
export async function openChild(m: MindState): Promise<Spoken> {
  if (SIDECAR) {
    const data = await post("/open", { mind: m });
    adopt(m, data.mind as MindState);
    return render(m, data.message as ChildMessage);
  }
  return render(m, localMessage(m, null));
}

// The parent replied: the child learns from it, then speaks again.
export async function reply(m: MindState, parentText: string): Promise<Spoken> {
  if (SIDECAR) {
    const data = await post("/reply", { mind: m, text: parentText });
    adopt(m, data.mind as MindState);
    return render(m, data.message as ChildMessage);
  }
  integrate(m, parentText);
  return render(m, localMessage(m, parentText));
}
