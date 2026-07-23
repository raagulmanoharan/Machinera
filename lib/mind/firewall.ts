import { normalise } from "./graph";

// The firewall is the single guarantee behind Principle P1: the mind may only
// express what it has actually been taught. Every utterance and every image
// prompt passes through here. Anything that references an un-taught concept is
// rejected before it can reach the parent — so the newborn's ignorance is real,
// never performed, and an LLM faculty cannot leak pretrained world-knowledge.

// Pre-verbal sounds and structural marks are NOT world-knowledge. A newborn can
// cry, sigh, or gesture without having been taught anything. This is the only
// vocabulary allowed that does not come from the graph.
export const PREVERBAL = new Set([
  "…",
  "?",
  "—",
  "oh",
  "ah",
  "mm",
  "mmm",
  "uh",
  "hm",
  "ha",
  "eh",
  "aa",
  "ooh",
]);

function isStructural(token: string): boolean {
  return /^[^\p{L}\p{N}]+$/u.test(token);
}

export interface FirewallResult {
  ok: boolean;
  cleaned: string[]; // only tokens that survived
  rejected: string[]; // tokens that referenced un-taught concepts
}

// Vet a sequence of tokens against the mind's learned vocabulary.
export function vet(tokens: string[], vocab: Set<string>): FirewallResult {
  const cleaned: string[] = [];
  const rejected: string[] = [];
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    if (isStructural(token) || PREVERBAL.has(token.toLowerCase())) {
      cleaned.push(token);
      continue;
    }
    const norm = normalise(token);
    if (norm && vocab.has(norm)) {
      cleaned.push(token);
    } else {
      rejected.push(token);
    }
  }
  return { ok: rejected.length === 0, cleaned, rejected };
}

// Guard an image prompt: it may reference ONLY learned concept labels. Returns the
// subset that is legal. An empty result means the mind has nothing to picture yet
// and must fall back to pure abstraction — exactly right for a newborn.
export function vetPrompt(conceptLabels: string[], vocab: Set<string>): string[] {
  return conceptLabels.map(normalise).filter((l) => l && vocab.has(l));
}

// A hard assertion for development: throws if anything un-taught slipped through.
// Use around any faculty output you don't fully control (e.g. an LLM's).
export function assertClean(tokens: string[], vocab: Set<string>): string[] {
  const r = vet(tokens, vocab);
  if (!r.ok) {
    throw new Error(
      `firewall breach: the mind tried to say un-taught words [${r.rejected.join(
        ", "
      )}]`
    );
  }
  return r.cleaned;
}
