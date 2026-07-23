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
  "…", "?", "—", "!",
  // pre-verbal sounds
  "oh", "ah", "mm", "mmm", "uh", "hm", "hmm", "ha", "eh", "aa", "ooh", "oooh",
  // social / interjection words — grammar of talking, not names of things
  "hi", "hey", "hello", "yes", "no", "yeah", "okay", "ok", "wow", "yay",
  "please", "thanks", "thank", "sorry", "wait", "again", "more",
]);

// Function words are the LANGUAGE FACULTY, not world-knowledge. A child acquires
// closed-class grammar (articles, pronouns, question words, copulas, a few core
// cognitive verbs) as part of learning to speak — none of it names a thing in the
// world. Allowing these lets the child ask real questions ("why does the water
// feel cold?") while every CONTENT word (things, qualities, feelings) still has to
// be taught. This is the fix for lifeless two-word fragments.
export const FUNCTION_WORDS = new Set([
  // question words
  "what", "who", "where", "when", "why", "how", "which",
  // copula / auxiliaries / modals
  "is", "are", "am", "was", "were", "be", "been", "do", "does", "did",
  "can", "could", "will", "would", "should", "may", "might", "have", "has", "had",
  // determiners / demonstratives
  "the", "a", "an", "this", "that", "these", "those", "some", "any", "no", "every", "all",
  // pronouns
  "i", "you", "we", "they", "it", "he", "she", "me", "us", "them", "him", "her",
  "my", "your", "our", "their", "its", "his", "one", "something", "nothing",
  // conjunctions / connectives
  "and", "or", "but", "so", "if", "then", "because", "though", "yet", "as", "than",
  // prepositions / particles
  "of", "to", "in", "on", "at", "by", "with", "from", "for", "about", "into",
  "over", "under", "up", "down", "out", "off", "through", "between", "like", "not",
  // adverbs / degree / deixis
  "yes", "too", "very", "more", "less", "most", "again", "here", "there", "now",
  "always", "never", "still", "also", "only", "just", "same", "different", "why",
  // core cognitive/perception verbs (grammar of a curious mind, not content)
  "see", "saw", "look", "looks", "feel", "feels", "feeling", "know", "want",
  "wants", "think", "thinks", "seem", "seems", "make", "makes", "come", "go",
  "goes", "show", "tell", "say", "says", "call", "called", "mean", "means",
  // generic placeholders a child leans on
  "thing", "things", "way", "kind", "part", "bit", "lot",
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
    const lower = token.toLowerCase();
    if (isStructural(token) || PREVERBAL.has(lower) || FUNCTION_WORDS.has(lower)) {
      cleaned.push(token);
      continue;
    }
    const norm = normalise(token);
    if (norm && (vocab.has(norm) || FUNCTION_WORDS.has(norm))) {
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

// Inspect a whole sentence: are all its CONTENT words either taught or function
// words? Used to vet a conversational message the child composed; if not ok, the
// caller falls back to a message built only from known words.
export function inspectSentence(
  text: string,
  vocab: Set<string>
): { ok: boolean; rejected: string[] } {
  const words = text.split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  const rejected: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (PREVERBAL.has(lower) || FUNCTION_WORDS.has(lower)) continue;
    const norm = normalise(w);
    if (norm && (vocab.has(norm) || FUNCTION_WORDS.has(norm))) continue;
    rejected.push(w);
  }
  return { ok: rejected.length === 0, rejected };
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
