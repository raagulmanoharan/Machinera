import { NextResponse } from "next/server";
import { loadMind, saveMind } from "@/lib/mind/store";
import { nextTurn } from "@/lib/mind/turn";

export const dynamic = "force-dynamic";

const MIND_ID = "default"; // one persistent, evolving mind

export async function POST() {
  const mind = await loadMind(MIND_ID);
  const view = await nextTurn(mind);
  await saveMind(mind);
  return NextResponse.json(view);
}
