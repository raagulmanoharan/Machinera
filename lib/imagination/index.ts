import type { MindState, Vision } from "../mind/types";
import { maturity } from "../mind/maturity";
import { renderProcedural } from "./procedural";
import { pollinationsEnabled, renderPollinations } from "./pollinations";
import { handoffThreshold, renderZImage, zimageConfigured } from "./zimage";

// The Imagination. Turns the current thought into an image:
//   - an empty mind (nothing learned) can depict nothing → procedural abstraction
//   - otherwise a real text-to-image model renders it, with maturity driving the
//     style from formless/dreamlike to detailed/vivid
// Provider priority: an explicit Z-Image endpoint (once mature) → Pollinations
// (real, keyless, the default) → procedural fallback. Any failure degrades
// gracefully so the experience never breaks.

export async function imagine(
  m: MindState,
  focus: string[],
  promptLabels: string[]
): Promise<Vision> {
  const mat = maturity(m);

  // Genuine emptiness: with nothing taught there is nothing to picture.
  if (promptLabels.length === 0) {
    return renderProcedural(m, focus, mat);
  }

  // A configured Z-Image Turbo endpoint takes precedence once the mind is mature.
  if (zimageConfigured() && mat.score >= handoffThreshold()) {
    try {
      return await renderZImage(promptLabels, mat);
    } catch (err) {
      console.warn("z-image handoff failed:", err);
    }
  }

  // Default: real generation, no key required.
  if (pollinationsEnabled()) {
    try {
      return renderPollinations(m, focus, promptLabels, mat);
    } catch (err) {
      console.warn("pollinations render failed, staying procedural:", err);
    }
  }

  return renderProcedural(m, focus, mat);
}
