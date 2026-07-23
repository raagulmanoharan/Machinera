import { NextResponse } from "next/server";
import { loadMind, saveMind } from "@/lib/mind/store";
import { integrate } from "@/lib/mind/faculty";
import { nextTurn } from "@/lib/mind/turn";
import type { Teaching } from "@/lib/mind/types";

export const dynamic = "force-dynamic";

const MIND_ID = "default";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Teaching>;
  const teaching: Teaching = {
    literal: (body.literal ?? "").toString(),
    emotional: (body.emotional ?? "").toString(),
  };

  const mind = await loadMind(MIND_ID);
  integrate(mind, teaching);
  // Immediately form the next thought from the now-richer mind.
  const view = await nextTurn(mind);
  await saveMind(mind);

  return NextResponse.json(view);
}
