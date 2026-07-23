import type { Concept, ConceptKind, Edge, MindState } from "./types";

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function emptyMind(mindId: string): MindState {
  return {
    id: mindId,
    createdAt: Date.now(),
    turns: 0,
    concepts: {},
    edges: [],
    focus: [],
    wondering: null,
  };
}

// Normalise a raw word to a canonical label. Lowercase, trimmed, no surrounding
// punctuation. This is also the key the firewall checks vocabulary against.
export function normalise(word: string): string {
  return word.toLowerCase().trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function findConceptByLabel(m: MindState, label: string): Concept | undefined {
  const target = normalise(label);
  return Object.values(m.concepts).find((c) => normalise(c.label) === target);
}

// Learn a concept, or reinforce it if already known. Never duplicates a word.
export function learnConcept(
  m: MindState,
  label: string,
  kind: ConceptKind,
  said: string
): Concept {
  const existing = findConceptByLabel(m, label);
  if (existing) {
    existing.vividness += 1;
    existing.lastSeenAt = Date.now();
    if (said && !existing.provenance.includes(said)) existing.provenance.push(said);
    return existing;
  }
  const c: Concept = {
    id: id("c"),
    label: normalise(label),
    kind,
    vividness: 1,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    provenance: said ? [said] : [],
  };
  m.concepts[c.id] = c;
  return c;
}

export function link(m: MindState, from: string, to: string, kind: Edge["kind"]): void {
  if (from === to) return;
  const existing = m.edges.find(
    (e) => e.from === from && e.to === to && e.kind === kind
  );
  if (existing) {
    existing.weight += 1;
    return;
  }
  m.edges.push({ from, to, kind, weight: 1 });
}

export function neighbours(m: MindState, conceptId: string): Concept[] {
  const ids = new Set<string>();
  for (const e of m.edges) {
    if (e.from === conceptId) ids.add(e.to);
    if (e.to === conceptId) ids.add(e.from);
  }
  return [...ids].map((i) => m.concepts[i]).filter(Boolean);
}

// The set of every word the mind is allowed to say. Nothing else may pass the firewall.
export function vocabulary(m: MindState): Set<string> {
  return new Set(Object.values(m.concepts).map((c) => normalise(c.label)));
}

export function conceptsOf(m: MindState, ids: string[]): Concept[] {
  return ids.map((i) => m.concepts[i]).filter(Boolean);
}
