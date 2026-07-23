import type { Maturity, MindState, Vision } from "../mind/types";
import { conceptsOf } from "../mind/graph";

// The newborn's imagination. With nothing learned it can only produce genuine
// abstraction — a formless, breathing field. As concepts accrue and gain
// vividness, more (and more defined) forms appear, coloured by learned feelings.
// This runs with zero dependencies and honours P1: it can only draw from focus
// concepts the mind actually holds.

// A stable hue for a word, so the same concept always carries the same colour.
function hueOf(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) % 360;
  return h;
}

// Deterministic pseudo-random from a seed, so a given mind-state renders stably.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function feelingHues(m: MindState, focus: string[]): number[] {
  const hues: number[] = [];
  for (const e of m.edges) {
    if (e.kind !== "feels") continue;
    if (!focus.includes(e.from)) continue;
    const f = m.concepts[e.to];
    if (f) hues.push(hueOf(f.label));
  }
  return hues;
}

export function renderProcedural(
  m: MindState,
  focus: string[],
  mat: Maturity
): Vision {
  const size = 768;
  const concepts = conceptsOf(m, focus);
  const seed = m.turns * 2654435761 + focus.length * 40503 + concepts.length;
  const rand = rng(seed);

  const fHues = feelingHues(m, focus);
  const baseHue = fHues.length
    ? fHues[0]
    : concepts.length
    ? hueOf(concepts[0].label)
    : 28; // a warm, un-taught amber for turn zero — the dream of a newborn mind

  const clarity = mat.score; // 0 newborn -> 1 grown; drives sharpness
  const blur = Math.round(60 - clarity * 52); // heavy blur when newborn
  // A soft, foggy field — never a black box. Even an empty mind "sees" a dim,
  // dreamlike haze with faint light, like a photograph of nothing in particular.
  const topLight = 34 + clarity * 12;
  const botLight = 16 + clarity * 8;
  const breathHue = (baseHue + 30) % 360;

  const parts: string[] = [];
  parts.push(
    `<defs>` +
      `<filter id="soft"><feGaussianBlur stdDeviation="${blur}"/></filter>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="hsl(${baseHue} 30% ${topLight}%)"/>` +
      `<stop offset="1" stop-color="hsl(${baseHue} 35% ${botLight}%)"/>` +
      `</linearGradient>` +
      `<radialGradient id="glow" cx="50%" cy="42%" r="60%">` +
      `<stop offset="0" stop-color="hsl(${breathHue} 45% ${topLight + 22}%)" stop-opacity="0.7"/>` +
      `<stop offset="1" stop-color="hsl(${breathHue} 45% ${topLight}%)" stop-opacity="0"/>` +
      `</radialGradient>` +
      `</defs>`
  );
  parts.push(`<rect width="${size}" height="${size}" fill="url(#bg)"/>`);
  // A slow breathing glow — the mind's "attention".
  parts.push(
    `<rect width="${size}" height="${size}" fill="url(#glow)" opacity="${(
      0.5 +
      clarity * 0.3
    ).toFixed(2)}"/>`
  );

  // One form per focus concept; count/definition grow with vividness + maturity.
  concepts.forEach((c, i) => {
    const hue = fHues[i % Math.max(1, fHues.length)] ?? hueOf(c.label);
    const forms = Math.min(1 + Math.floor(c.vividness / 2), 4);
    for (let k = 0; k < forms; k++) {
      const cx = size * (0.2 + rand() * 0.6);
      const cy = size * (0.2 + rand() * 0.6);
      const r = size * (0.08 + rand() * 0.18) * (0.6 + clarity * 0.7);
      const opacity = (0.3 + Math.min(c.vividness, 6) * 0.08) * (0.5 + clarity * 0.5);
      const light = 45 + clarity * 20;
      if (clarity < 0.35 || rand() < 0.5) {
        parts.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ` +
            `fill="hsl(${hue} ${40 + clarity * 40}% ${light}%)" ` +
            `opacity="${opacity.toFixed(2)}" ` +
            `filter="${clarity < 0.55 ? "url(#soft)" : "none"}"/>`
        );
      } else {
        // As the mind matures, forms firm up into edged shapes.
        const w = r * 1.4;
        const h = r * (0.8 + rand() * 0.8);
        const rot = Math.floor(rand() * 360);
        parts.push(
          `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" ` +
            `width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(r * 0.2).toFixed(
              1
            )}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})" ` +
            `fill="hsl(${hue} ${45 + clarity * 40}% ${light}%)" opacity="${opacity.toFixed(
              2
            )}"/>`
        );
      }
    }
  });

  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}" role="img">${parts.join("")}</svg>`;

  return { kind: "svg", markup };
}
