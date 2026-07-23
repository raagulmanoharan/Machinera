import type { Concept, MindState } from "./types";

// The mind's inner life: not new knowledge, but ways of holding what it already
// knows — remembering moments, noticing patterns, forming tentative ideas. Pure
// and firewall-safe: everything here only ever returns concepts the mind was
// actually taught, so anything built from it still passes inspectSentence.

export function things(m: MindState): Concept[] {
  return Object.values(m.concepts).filter((c) => c.kind === "thing");
}
export function feelings(m: MindState): Concept[] {
  return Object.values(m.concepts).filter((c) => c.kind === "feeling");
}

// the feelings a thing carries, and the things that carry a feeling
export function feelingsOf(m: MindState, thingId: string): Concept[] {
  return m.edges
    .filter((e) => e.kind === "feels" && e.from === thingId)
    .map((e) => m.concepts[e.to])
    .filter(Boolean) as Concept[];
}
export function thingsThatFeel(m: MindState, feelingId: string): Concept[] {
  return m.edges
    .filter((e) => e.kind === "feels" && e.to === feelingId)
    .map((e) => m.concepts[e.from])
    .filter(Boolean) as Concept[];
}

// A remembered moment: a thing, a feeling the parent gave it, and the exact
// words they used. This is what the mind can bring back later.
export interface Moment {
  thing: Concept;
  feeling: Concept;
  said?: string;
}

export function emotionalMemories(m: MindState): Moment[] {
  const out: Moment[] = [];
  for (const e of m.edges) {
    if (e.kind !== "feels") continue;
    const thing = m.concepts[e.from];
    const feeling = m.concepts[e.to];
    if (!thing || !feeling) continue;
    out.push({ thing, feeling, said: thing.provenance[thing.provenance.length - 1] });
  }
  // most-reinforced, most-recent first — the moments that mattered most
  return out.sort(
    (a, b) => b.thing.vividness - a.thing.vividness || b.thing.lastSeenAt - a.thing.lastSeenAt
  );
}

// A feeling shared by two or more things — an emotional pattern the mind can
// notice ("many things you show me feel calm").
export interface Pattern {
  feeling: Concept;
  things: Concept[];
}
export function feelingPatterns(m: MindState): Pattern[] {
  const byFeeling = new Map<string, Concept[]>();
  for (const e of m.edges) {
    if (e.kind !== "feels") continue;
    const thing = m.concepts[e.from];
    if (!thing) continue;
    const arr = byFeeling.get(e.to) ?? [];
    if (!arr.some((t) => t.id === thing.id)) arr.push(thing);
    byFeeling.set(e.to, arr);
  }
  const out: Pattern[] = [];
  for (const [fid, ts] of byFeeling) {
    const feeling = m.concepts[fid];
    if (feeling && ts.length >= 2) out.push({ feeling, things: ts });
  }
  return out.sort((a, b) => b.things.length - a.things.length);
}

// A tentative, possibly-wrong idea the mind forms and wants to check — the heart
// of childlike reasoning. Prefers two things that feel the same (are they alike?),
// then two things it has associated. Returns ids for mind.wondering.
export function formWondering(
  m: MindState
): { aboutConceptId: string; likeConceptId: string } | null {
  const pats = feelingPatterns(m);
  for (const p of pats) {
    const [a, b] = p.things;
    if (a && b && a.id !== b.id) return { aboutConceptId: a.id, likeConceptId: b.id };
  }
  for (const e of m.edges) {
    if (e.kind !== "assoc") continue;
    if (e.from !== e.to && m.concepts[e.from] && m.concepts[e.to])
      return { aboutConceptId: e.from, likeConceptId: e.to };
  }
  return null;
}

// The things the mind has grown fondest of — most seen, most felt. As it matures
// it can express, in taught words, what it is drawn to.
export function dearest(m: MindState, limit = 3): Concept[] {
  return things(m)
    .map((t) => ({ t, weight: t.vividness + feelingsOf(m, t.id).length }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((x) => x.t);
}

// Whether the parent's most recent message gave a feeling, or only a bare thing.
// When only a thing was named, a maturing mind can gently draw the feeling out —
// the parent learning to articulate.
export function lastGaveFeeling(m: MindState, sinceTurn: number): boolean {
  return feelings(m).some((f) => f.lastSeenAt >= sinceTurn);
}
