import { NextResponse } from "next/server";
import { loadMind } from "@/lib/mind/store";
import { maturity } from "@/lib/mind/maturity";

export const dynamic = "force-dynamic";

const MIND_ID = "default";

// The mind laid bare — everything it has been taught — for the growing graph view.
export async function GET() {
  const mind = await loadMind(MIND_ID);
  return NextResponse.json({
    id: mind.id,
    turns: mind.turns,
    createdAt: mind.createdAt,
    maturity: maturity(mind),
    concepts: Object.values(mind.concepts),
    edges: mind.edges,
  });
}
