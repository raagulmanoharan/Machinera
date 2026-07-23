import type { Maturity, MindState, Stage } from "./types";

// Maturity grows deliberately slowly (Principle: it should feel like days and
// weeks, not minutes). It is a saturating function of three things:
//   - how many concepts the mind holds
//   - how densely those concepts are connected (understanding is relation, not
//     just vocabulary)
//   - how reinforced they are (vividness)
// None of these can be rushed by a single big answer; the curve is sub-linear.

function saturate(x: number, half: number): number {
  // 0 at x=0, approaches 1; equals 0.5 at x = half.
  return x / (x + half);
}

export function maturity(m: MindState): Maturity {
  const concepts = Object.values(m.concepts);
  const n = concepts.length;

  const vocabTerm = saturate(n, 40); // ~40 concepts to reach the midpoint
  const density = n > 1 ? m.edges.length / n : 0;
  const relationTerm = saturate(density, 2.5);
  const totalVividness = concepts.reduce((s, c) => s + (c.vividness - 1), 0);
  const depthTerm = saturate(totalVividness, 60);

  // Weighted, then softened again so early growth is very gentle.
  const raw = 0.5 * vocabTerm + 0.3 * relationTerm + 0.2 * depthTerm;
  const score = Math.max(0, Math.min(1, raw));

  return { score, stage: stageOf(score, n) };
}

function stageOf(score: number, conceptCount: number): Stage {
  if (conceptCount === 0) return "newborn";
  if (score < 0.12) return "infant";
  if (score < 0.35) return "child";
  if (score < 0.6) return "growing";
  return "grown";
}
