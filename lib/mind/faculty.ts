import { learnConcept, link, neighbours, normalise } from "./graph";
import { maturity } from "./maturity";
import {
  dearest,
  emotionalMemories,
  feelingPatterns,
  formWondering,
} from "./memory";
import type { ChildMessage, MindState } from "./types";

// The built-in LOCAL faculty — used offline, when no sidecar/LLM is configured.
// It cannot reason with a model, but it can still hold an inner life: it
// remembers moments, forms tentative ideas, notices feelings shared across
// things, and grows fond of what it is shown often. Its voice is simple, but it
// genuinely draws on what it has been taught. The real, supple voice still comes
// from the LLM faculty in the sidecar; this keeps the app alive with zero deps.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "it", "this", "that", "of", "to", "and", "or", "but",
  "in", "on", "at", "with", "for", "as", "its", "was", "are", "be", "s", "t",
  "like", "very", "so", "im", "i", "you", "we", "they", "he", "she", "some",
  "thing", "things", "here", "there", "what", "when", "then", "feels", "feel",
]);

// A small lexicon of plainly-emotional words, so that offline the mind can still
// tell a feeling from a mere quality and build an emotional memory of the world.
const EMOTION_WORDS = new Set([
  "calm", "peaceful", "peace", "happy", "happiness", "joy", "joyful", "sad",
  "sadness", "lonely", "loneliness", "scared", "afraid", "fear", "safe", "loved",
  "love", "tender", "gentle", "content", "wonder", "awe", "free", "still",
  "quiet", "comfort", "warmth", "hope", "grief", "longing", "wistful", "serene",
]);

function words(text: string): string[] {
  return text
    .split(/[\s,.;:!?"'()\[\]/\\-]+/)
    .map(normalise)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Learn from the parent's free-text reply. Offline we treat the first meaningful
// word as the thing; the rest describe it — as qualities, or as feelings when
// they are plainly emotional, so the mind's emotional memory can form.
export function integrate(m: MindState, text: string): MindState {
  const priorFocus = m.focus.map((id) => m.concepts[id]).filter(Boolean);
  const w = words(text);
  if (w.length) {
    const [head, ...rest] = w;
    const thing = learnConcept(m, head, "thing", text.trim());
    for (const r of rest) {
      if (EMOTION_WORDS.has(r)) {
        link(m, thing.id, learnConcept(m, r, "feeling", text.trim()).id, "feels");
      } else {
        link(m, thing.id, learnConcept(m, r, "attribute", text.trim()).id, "is");
      }
    }
    for (const pf of priorFocus) if (pf.id !== thing.id) link(m, thing.id, pf.id, "assoc");
  }
  m.turns += 1;
  return m;
}

// The child's turn. Simple grammar, but it chooses among real ways of relating:
// recalling a moment, checking a guess, noticing a pattern, or drawing out a
// feeling — the mode shifting as it matures. Everything is built only from taught
// words, so it is firewall-safe by construction.
export function localMessage(m: MindState, _lastParentText: string | null): ChildMessage {
  const concepts = Object.values(m.concepts);
  if (concepts.length === 0)
    return { text: "…?", show: true, focus: [], promptLabels: [] };

  const stage = maturity(m).stage;
  m.wondering = formWondering(m);

  const freshest = [...concepts].sort(
    (a, b) => b.lastSeenAt - a.lastSeenAt || b.vividness - a.vividness
  )[0];

  const say = (text: string, focus: string[], show = true): ChildMessage => {
    m.focus = focus;
    return {
      text,
      show,
      focus,
      promptLabels: focus.map((id) => m.concepts[id]?.label).filter(Boolean) as string[],
    };
  };

  // youngest minds: just name and wonder
  if (stage === "newborn" || stage === "infant") {
    return say(`what is ${freshest.label}?`, [freshest.id]);
  }

  const mems = emotionalMemories(m);
  const pats = feelingPatterns(m);
  const w = m.wondering;

  // rotate through ways of relating, so the child doesn't feel like one trick
  switch (m.turns % 5) {
    case 1:
      if (w && m.concepts[w.aboutConceptId] && m.concepts[w.likeConceptId]) {
        return say(
          `is ${m.concepts[w.aboutConceptId].label} the same as ${m.concepts[w.likeConceptId].label}?`,
          [w.aboutConceptId]
        );
      }
      break;
    case 2:
      if (pats.length) {
        const p = pats[0];
        // notice a shared feeling — sometimes just say it, no picture
        return say(`so many things feel ${p.feeling.label}. why?`, [p.things[0].id], m.turns % 2 === 0);
      }
      break;
    case 3:
      if (mems.length) {
        const mo = mems[m.turns % mems.length];
        if (mo.thing.id !== freshest.id) {
          return say(
            `you said ${mo.thing.label} feels ${mo.feeling.label}. does ${freshest.label} feel ${mo.feeling.label} too?`,
            [freshest.id]
          );
        }
      }
      break;
    case 4:
      if (stage === "youth" || stage === "grown") {
        const dear = dearest(m, 1)[0];
        if (dear) return say(`i think i like ${dear.label}.`, [dear.id], false);
      }
      break;
    default:
      break;
  }

  // otherwise, reflect on the freshest thing through what connects to it
  const nbrs = neighbours(m, freshest.id);
  const feeling = nbrs.find((c) => c.kind === "feeling");
  const other = nbrs.find((c) => c.kind === "thing" && c.id !== freshest.id);
  if (feeling) return say(`why does ${freshest.label} feel ${feeling.label}?`, [freshest.id]);
  if (other) return say(`is ${freshest.label} like ${other.label}?`, [freshest.id]);
  return say(`what is ${freshest.label}?`, [freshest.id]);
}
