import { learnConcept, link, neighbours, normalise } from "./graph";
import { maturity } from "./maturity";
import type { ChildMessage, MindState } from "./types";

// The built-in LOCAL faculty — used offline, when no sidecar/LLM is configured.
// It is deliberately simple: it learns from the parent's words and asks basic,
// firewalled questions. The real, deepening voice comes from the LLM faculty in
// the sidecar; this keeps the app alive with zero dependencies.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "it", "this", "that", "of", "to", "and", "or", "but",
  "in", "on", "at", "with", "for", "as", "its", "was", "are", "be", "s", "t",
  "like", "very", "so", "im", "i", "you", "we", "they", "he", "she", "some",
  "thing", "things", "here", "there", "what", "when", "then", "feels", "feel",
]);

function words(text: string): string[] {
  return text
    .split(/[\s,.;:!?"'()\[\]/\\-]+/)
    .map(normalise)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Learn from the parent's free-text reply. Offline we can't reliably separate
// feelings from things, so the first meaningful word is the thing and the rest
// describe it.
export function integrate(m: MindState, text: string): MindState {
  const priorFocus = m.focus.map((id) => m.concepts[id]).filter(Boolean);
  const w = words(text);
  if (w.length) {
    const [head, ...rest] = w;
    const thing = learnConcept(m, head, "thing", text.trim());
    for (const r of rest) link(m, thing.id, learnConcept(m, r, "attribute", text.trim()).id, "is");
    for (const pf of priorFocus) if (pf.id !== thing.id) link(m, thing.id, pf.id, "assoc");
  }
  m.turns += 1;
  return m;
}

// A simple, firewalled question. Real depth comes from the LLM faculty.
export function localMessage(m: MindState, _lastParentText: string | null): ChildMessage {
  const concepts = Object.values(m.concepts);
  if (concepts.length === 0) return { text: "…?", focus: [], promptLabels: [] };

  const focus = [...concepts].sort(
    (a, b) => a.vividness - b.vividness || b.lastSeenAt - a.lastSeenAt
  )[0];
  const stage = maturity(m).stage;
  const nbrs = neighbours(m, focus.id);
  const feeling = nbrs.find((c) => c.kind === "feeling");
  const other = nbrs.find((c) => c.kind === "thing");

  let text: string;
  if (stage === "infant") text = `what is ${focus.label}?`;
  else if (feeling) text = `why does ${focus.label} feel ${feeling.label}?`;
  else if (other) text = `is ${focus.label} the same as ${other.label}?`;
  else text = `what is ${focus.label}?`;

  m.focus = [focus.id];
  return { text, focus: [focus.id], promptLabels: [focus.label] };
}
