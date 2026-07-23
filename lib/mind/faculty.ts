import { learnConcept, link, neighbours, normalise, vocabulary } from "./graph";
import { vet } from "./firewall";
import { maturity } from "./maturity";
import type { Concept, MindState, Teaching } from "./types";

// The faculty is a BOUNDED capability, never a source of world-knowledge
// (Principle P1). It may associate, wonder, and speak — but only over concepts
// already in the graph. Its output is always run through the firewall.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "it", "this", "that", "of", "to", "and", "or", "but",
  "in", "on", "at", "with", "for", "as", "its", "was", "are", "be", "s", "t",
  "like", "very", "so", "im", "i", "you", "we", "they", "he", "she", "some",
  "thing", "things", "here", "there", "what", "when", "then",
]);

function meaningfulWords(text: string): string[] {
  return text
    .split(/[\s,.;:!?"'()\[\]/\\-]+/)
    .map(normalise)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export interface Curiosity {
  focus: string[]; // concept ids the image will be built from ([] = abstraction)
  promptLabels: string[]; // learned labels the image may use
  wondering: MindState["wondering"];
}

// --- Curiosity: what does the mind want to look at next? -------------------
export function beCurious(m: MindState): Curiosity {
  const concepts = Object.values(m.concepts);

  // Turn zero, and every time the mind is still empty: it has nothing to picture.
  if (concepts.length === 0) {
    return { focus: [], promptLabels: [], wondering: null };
  }

  // Sometimes the mind forms a tentative, possibly-wrong idea by noticing two
  // concepts that share a neighbour/feeling, and wonders if they are alike.
  const wonder = tryToWonder(m);
  if (wonder) {
    const about = m.concepts[wonder.aboutConceptId];
    const like = m.concepts[wonder.likeConceptId];
    return {
      focus: [about.id, like.id],
      promptLabels: [about.label, like.label, ...attributeLabels(m, about.id)],
      wondering: wonder,
    };
  }

  // Otherwise it returns to what it knows least well — the freshest, faintest
  // concept — and looks at it again, sometimes beside a thing it connects to.
  const focusConcept = [...concepts].sort(
    (a, b) => a.vividness - b.vividness || b.lastSeenAt - a.lastSeenAt
  )[0];
  const near = neighbours(m, focusConcept.id).filter((c) => c.kind !== "feeling");
  const companion = near[0];
  const focus = companion ? [focusConcept.id, companion.id] : [focusConcept.id];
  const promptLabels = [
    focusConcept.label,
    ...(companion ? [companion.label] : []),
    ...attributeLabels(m, focusConcept.id),
  ];
  return { focus, promptLabels, wondering: null };
}

function attributeLabels(m: MindState, conceptId: string): string[] {
  return m.edges
    .filter((e) => e.kind === "is" && e.from === conceptId)
    .map((e) => m.concepts[e.to]?.label)
    .filter(Boolean) as string[];
}

function tryToWonder(m: MindState): MindState["wondering"] {
  const things = Object.values(m.concepts).filter((c) => c.kind === "thing");
  // Deterministic but graph-driven: pick two things that share an attribute or
  // feeling but are not yet linked to each other.
  for (const a of things) {
    const aNbrs = new Set(neighbours(m, a.id).map((c) => c.id));
    for (const b of things) {
      if (b.id === a.id) continue;
      if (aNbrs.has(b.id)) continue; // already connected — nothing to wonder
      const shared = neighbours(m, b.id).some(
        (c) => (c.kind === "attribute" || c.kind === "feeling") && aNbrs.has(c.id)
      );
      if (shared) return { aboutConceptId: a.id, likeConceptId: b.id };
    }
  }
  return null;
}

// --- Speech: what does the mind say, given a curiosity? --------------------
// Returns firewall-safe tokens only. Early on this is pure pre-verbal affect.
export function speak(m: MindState, c: Curiosity): string[] {
  const vocab = vocabulary(m);
  const stage = maturity(m).stage;

  let tokens: string[];
  if (stage === "newborn" || m.focus.length === 0 || c.focus.length === 0) {
    // Nothing learned yet: an offered image and wordless curiosity.
    tokens = ["…", "?"];
  } else if (c.wondering) {
    const about = m.concepts[c.wondering.aboutConceptId]?.label ?? "";
    const like = m.concepts[c.wondering.likeConceptId]?.label ?? "";
    // A genuine, checkable guess: "about… like? like…?"
    tokens = [`${about}…`, `${like}`, "?"];
  } else if (stage === "infant") {
    const label = c.promptLabels[0] ?? "";
    tokens = ["…", `${label}`, "?"];
  } else {
    const label = c.promptLabels[0] ?? "";
    const more = c.promptLabels[1];
    tokens = more ? [`${label}`, "—", `${more}`, "?"] : ["this", "—", `${label}`, "?"];
  }

  // The hard guarantee. Nothing un-taught survives.
  const r = vet(tokens, vocab);
  return r.cleaned.length ? r.cleaned : ["…", "?"];
}

// --- Integration: fold the parent's answer into the graph ------------------
// This is where genuine learning happens. Returns the ids touched this turn.
export function integrate(m: MindState, t: Teaching): string[] {
  const touched: string[] = [];
  const priorFocus = m.focus.map((id) => m.concepts[id]).filter(Boolean) as Concept[];

  // The literal answer names things (and their attributes).
  const words = meaningfulWords(t.literal);
  let namedConcepts: Concept[] = [];
  if (words.length) {
    // First meaningful word is the thing; the rest describe it (attributes).
    const [head, ...rest] = words;
    const thing = learnConcept(m, head, "thing", t.literal.trim());
    namedConcepts.push(thing);
    touched.push(thing.id);
    for (const w of rest) {
      const attr = learnConcept(m, w, "attribute", t.literal.trim());
      link(m, thing.id, attr.id, "is");
      touched.push(attr.id);
    }
  }

  // The emotional answer grows the mind's own affective vocabulary (P: feelings
  // are concepts too) and colours whatever was named / in focus.
  const feelingWords = meaningfulWords(t.emotional);
  const feelings = feelingWords.map((w) => {
    const f = learnConcept(m, w, "feeling", t.emotional.trim());
    touched.push(f.id);
    return f;
  });

  const anchors = namedConcepts.length ? namedConcepts : priorFocus;
  for (const anchor of anchors) {
    for (const f of feelings) link(m, anchor.id, f.id, "feels");
  }
  // If the parent named something new while looking at an old focus, associate them.
  if (namedConcepts.length && priorFocus.length) {
    for (const nc of namedConcepts) {
      for (const pf of priorFocus) {
        if (pf.id !== nc.id) link(m, nc.id, pf.id, "assoc");
      }
    }
  }

  // Confirming or correcting a wonder strengthens or drops the tentative link.
  if (m.wondering) {
    const { aboutConceptId, likeConceptId } = m.wondering;
    const confirmed = namedConcepts.some(
      (c) => c.id === aboutConceptId || c.id === likeConceptId
    );
    if (confirmed) link(m, aboutConceptId, likeConceptId, "assoc");
    m.wondering = null;
  }

  m.turns += 1;
  return touched;
}
