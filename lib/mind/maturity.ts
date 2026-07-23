import type { Maturity, MindState, Stage } from "./types";

// Maturity is meant to unfold over MONTHS of real conversation, not a single
// session. It grows very slowly and saturates late, so a mind stays genuinely
// young for a long time — it does not become articulate after twenty images.
// Three inputs, all saturating slowly:
//   - how many concepts it holds (vocabulary breadth)
//   - how densely they connect (understanding is relation, not just words)
//   - how reinforced they are (things seen and revisited many times)

function saturate(x: number, half: number): number {
  return x / (x + half);
}

export function maturity(m: MindState): Maturity {
  const concepts = Object.values(m.concepts);
  const n = concepts.length;

  // Half-maxima chosen for a months-long arc: ~600 concepts to reach the midpoint
  // of the vocabulary term, heavy reinforcement to reach the depth midpoint.
  const vocabTerm = saturate(n, 600);
  const density = n > 1 ? m.edges.length / n : 0;
  const relationTerm = saturate(density, 5);
  const totalVividness = concepts.reduce((s, c) => s + (c.vividness - 1), 0);
  const depthTerm = saturate(totalVividness, 1200);

  const score = Math.max(
    0,
    Math.min(1, 0.5 * vocabTerm + 0.25 * relationTerm + 0.25 * depthTerm)
  );

  return { score, stage: stageOf(n) };
}

// Stage is keyed to concept count so it reads intuitively. The thresholds are
// deliberately far apart — reaching "adolescent" alone means hundreds of taught
// concepts, i.e. weeks or months of tending.
function stageOf(n: number): Stage {
  if (n === 0) return "newborn";
  if (n < 12) return "infant";
  if (n < 60) return "child";
  if (n < 200) return "adolescent";
  if (n < 600) return "youth";
  return "grown";
}
