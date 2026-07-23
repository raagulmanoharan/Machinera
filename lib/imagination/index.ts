import type { MindState, Vision } from "../mind/types";
import { maturity } from "../mind/maturity";
import { renderProcedural } from "./procedural";
import { handoffThreshold, renderZImage, zimageConfigured } from "./zimage";

// The Imagination. Decides how the current thought becomes an image:
//   - an empty or immature mind renders procedurally (genuine abstraction)
//   - a mature mind, if a real model is configured, hands off to Z-Image Turbo
// Any failure falls back to procedural so the experience never breaks.

export async function imagine(
  m: MindState,
  focus: string[],
  promptLabels: string[]
): Promise<Vision> {
  const mat = maturity(m);

  const canUseModel =
    zimageConfigured() &&
    promptLabels.length > 0 &&
    mat.score >= handoffThreshold();

  if (canUseModel) {
    try {
      return await renderZImage(promptLabels, mat);
    } catch (err) {
      // The mind's imagination stutters; it falls back to its own inner picture.
      console.warn("imagination handoff failed, staying procedural:", err);
    }
  }

  return renderProcedural(m, focus, mat);
}
