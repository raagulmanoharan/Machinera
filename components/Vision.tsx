"use client";

import type { Vision } from "@/lib/mind/types";

// Renders whatever the mind is currently "seeing" — inline SVG for procedural
// abstraction, or a generated raster once the Imagination has handed off.
export default function VisionView({
  vision,
  thinking,
}: {
  vision: Vision | null;
  thinking: boolean;
}) {
  return (
    <div className={`vision${thinking ? " thinking" : ""}`}>
      {vision?.kind === "svg" ? (
        <div dangerouslySetInnerHTML={{ __html: vision.markup }} />
      ) : vision?.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vision.dataUrl} alt="what the mind sees" />
      ) : null}
    </div>
  );
}
