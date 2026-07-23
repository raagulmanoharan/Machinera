import type { Maturity, Vision } from "../mind/types";

// Adapter for Z-Image Turbo (or any compatible text-to-image endpoint). Reached
// only once the mind is mature enough to picture real forms; below the handoff
// threshold the Imagination stays procedural. Configured entirely via env, so
// self-hosting vs. a hosted endpoint is a deployment detail, not a code change.

export function zimageConfigured(): boolean {
  return Boolean(process.env.ZIMAGE_ENDPOINT);
}

export function handoffThreshold(): number {
  const v = Number(process.env.IMAGINATION_HANDOFF);
  return Number.isFinite(v) ? v : 0.35;
}

// Maturity shapes the render: a younger mind uses fewer steps and lower guidance,
// so even the "real" model produces looser, dreamier images that tighten as it grows.
function paramsFor(mat: Maturity) {
  const steps = Math.round(6 + mat.score * 6); // 6..12 (Z-Image Turbo is few-step)
  const guidance = Number((2.0 + mat.score * 2.5).toFixed(2));
  return { steps, guidance };
}

export async function renderZImage(
  promptLabels: string[],
  mat: Maturity
): Promise<Vision> {
  const endpoint = process.env.ZIMAGE_ENDPOINT!;
  const { steps, guidance } = paramsFor(mat);

  // The prompt is composed ONLY of learned labels (already firewalled upstream).
  const prompt = promptLabels.join(", ");

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.ZIMAGE_API_KEY) {
    headers.authorization = `Bearer ${process.env.ZIMAGE_API_KEY}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      steps,
      guidance,
      width: 768,
      height: 768,
    }),
  });

  if (!res.ok) {
    throw new Error(`z-image endpoint ${res.status}`);
  }

  const data: any = await res.json();
  // Accept a few common response shapes.
  const dataUrl: string | undefined =
    data.dataUrl ??
    data.image ??
    (data.b64 ? `data:image/png;base64,${data.b64}` : undefined) ??
    (Array.isArray(data.images) ? data.images[0] : undefined);

  if (!dataUrl) throw new Error("z-image endpoint returned no image");
  return { kind: "image", dataUrl };
}
