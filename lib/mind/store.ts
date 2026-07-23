import { promises as fs } from "fs";
import path from "path";
import { emptyMind } from "./graph";
import type { MindState } from "./types";

// One persistent, evolving mind (Principle P4). For the prototype a single mind
// lives on disk as JSON. Swapping this module for a real database later does not
// touch anything else.

const DATA_DIR = path.join(process.cwd(), ".data");

function fileFor(mindId: string): string {
  return path.join(DATA_DIR, `mind-${mindId}.json`);
}

export async function loadMind(mindId: string): Promise<MindState> {
  try {
    const raw = await fs.readFile(fileFor(mindId), "utf8");
    const parsed = JSON.parse(raw) as MindState;
    // Tolerate older/partial saves.
    parsed.focus ??= [];
    parsed.wondering ??= null;
    return parsed;
  } catch {
    return emptyMind(mindId);
  }
}

export async function saveMind(m: MindState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(m.id), JSON.stringify(m, null, 2), "utf8");
}
