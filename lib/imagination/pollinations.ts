import type { Maturity, MindState, Vision } from "../mind/types";

// A real, keyless text-to-image provider (Pollinations, FLUX-backed). The browser
// loads the URL directly as an <img>, so real generation works even on a static
// host with no API key and no server. What the mind depicts is still firewalled —
// the prompt is built only from learned concepts. Maturity drives the STYLE, so
// the same real model renders formless/dreamlike for a young mind and detailed,
// vivid imagery as it grows — the abstract→complex arc, on real images.

export function pollinationsEnabled(): boolean {
  const mode = process.env.NEXT_PUBLIC_IMAGINATION;
  return mode === undefined || mode === "auto" || mode === "pollinations";
}

// Rendering directives scaled by maturity. These are style, not world-knowledge —
// the concepts depicted still come only from what was taught.
function styleFor(score: number): string {
  if (score < 0.15)
    return "abstract, formless, blurred, hazy, dreamlike, soft, minimal, out of focus";
  if (score < 0.35)
    return "soft abstract, dreamy, impressionistic, gentle emerging forms, muted";
  if (score < 0.6)
    return "impressionistic, painterly, atmospheric, luminous, soft light";
  return "richly detailed, vivid, luminous, intricate, painterly, ethereal, dreamlike";
}

// Feelings connected to what the mind is looking at colour the mood — all learned,
// so still within the firewall.
function feelingsFor(m: MindState, focus: string[]): string[] {
  const out = new Set<string>();
  for (const e of m.edges) {
    if (e.kind === "feels" && focus.includes(e.from)) {
      const f = m.concepts[e.to];
      if (f) out.add(f.label);
    }
  }
  return [...out];
}

export function renderPollinations(
  m: MindState,
  focus: string[],
  promptLabels: string[],
  mat: Maturity
): Vision {
  const subject = promptLabels.join(", ");
  const feelings = feelingsFor(m, focus);
  const mood = feelings.length ? `, ${feelings.join(", ")}` : "";
  const prompt = `${subject}${mood}, ${styleFor(mat.score)}`;

  // Stable seed per turn so a given moment renders the same image.
  const seed = Math.abs((m.turns * 2654435761) % 1_000_000);

  // If a sidecar is configured, route the image through it (the browser only ever
  // talks to the sidecar; it reaches the model). Otherwise call the model directly
  // — a browser on a normal network needs no proxy.
  const sidecar = process.env.NEXT_PUBLIC_SIDECAR_URL;
  const url = sidecar
    ? `${sidecar}/image?prompt=${encodeURIComponent(prompt)}&seed=${seed}&w=768&h=768`
    : `${process.env.NEXT_PUBLIC_POLLINATIONS_BASE || "https://image.pollinations.ai"}` +
      `/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${seed}&model=flux`;

  return { kind: "image", dataUrl: url };
}
