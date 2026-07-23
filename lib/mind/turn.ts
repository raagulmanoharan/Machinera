import { imagine } from "../imagination";
import { conceptsOf, vocabulary } from "./graph";
import { vetPrompt } from "./firewall";
import { beCurious, speak } from "./faculty";
import { maturity } from "./maturity";
import type { MindState, TurnView } from "./types";

// Advance the mind by one thought: decide what to be curious about, picture it,
// and phrase the question. Mutates `m` (sets focus/wondering) but does not save;
// the caller persists. Everything the mind shows or says is firewalled here.
export async function nextTurn(m: MindState): Promise<TurnView> {
  const curiosity = beCurious(m);

  // Hard guard: the image may reference only learned labels.
  const safeLabels = vetPrompt(curiosity.promptLabels, vocabulary(m));

  m.focus = curiosity.focus;
  m.wondering = curiosity.wondering;

  const vision = await imagine(m, curiosity.focus, safeLabels);
  const utterance = speak(m, curiosity);
  const mat = maturity(m);

  return {
    vision,
    utterance,
    maturity: mat,
    focusLabels: conceptsOf(m, curiosity.focus).map((c) => c.label),
  };
}
