import {
  findConceptByLabel,
  learnConcept,
  link,
  normalise,
  vocabulary,
} from "../lib/mind/graph";
import { vet } from "../lib/mind/firewall";
import { maturity } from "../lib/mind/maturity";
import type { MindState, Teaching } from "../lib/mind/types";
import { callLLM, extractJSON } from "./llm";

// The LLM faculty. It gives the child genuinely alive curiosity and a childlike
// voice — but the firewall (P1) still governs everything it says, and it may only
// draw concepts from the parent's own words when learning. The model supplies
// language and association; it is never allowed to supply world-knowledge.

// --- Integration: turn the parent's words into structured concepts ----------
interface Extraction {
  things: { label: string; attributes?: string[]; feelings?: string[] }[];
  // an optional standalone feeling if the parent only gave a feeling
  feelings?: string[];
}

const INTEGRATE_SYSTEM = `You are the language faculty of Machinera, a newborn mind that learns words from a parent, one moment at a time. Your only job is precise data extraction from what the parent just said.

Rules:
- Output ONLY a JSON object, no markdown, no commentary. This is a data pipeline.
- Shape: {"things":[{"label":"","attributes":[],"feelings":[]}],"feelings":[]}
- "things" are concrete nouns the parent named. "attributes" are qualities (colour, size, texture). "feelings" are emotions.
- Use ONLY words that literally appear in the parent's text. Never invent, translate, or add concepts the parent did not say. Drop articles like "a"/"the". Lowercase everything, singular where natural.
- If the parent gave only a feeling and named nothing, put those words in the top-level "feelings" array and leave "things" empty.`;

export async function integrateLLM(m: MindState, t: Teaching): Promise<MindState> {
  const user = `The parent is looking at what the mind drew${
    m.focus.length
      ? ` (which was about: ${m.focus
          .map((id) => m.concepts[id]?.label)
          .filter(Boolean)
          .join(", ")})`
      : ""
  }.
What it IS: ${JSON.stringify(t.literal || "")}
What it FEELS like: ${JSON.stringify(t.emotional || "")}
Extract the concepts.`;

  let ex: Extraction;
  try {
    const raw = await callLLM({ system: INTEGRATE_SYSTEM, user });
    ex = extractJSON<Extraction>(raw);
  } catch {
    // If the model or its JSON fails, fall back to a minimal literal ingest so
    // the mind still learns something rather than nothing.
    ex = { things: [], feelings: [] };
    const w = normalise(t.literal).split(/\s+/).filter(Boolean);
    if (w.length) ex.things.push({ label: w[0] });
  }

  const priorFocus = m.focus.map((id) => m.concepts[id]).filter(Boolean);
  const said = [t.literal, t.emotional].filter(Boolean).join(" · ");

  const named = [] as ReturnType<typeof learnConcept>[];
  for (const thing of ex.things ?? []) {
    const label = normalise(thing.label);
    if (!label) continue;
    const c = learnConcept(m, label, "thing", said);
    named.push(c);
    for (const a of thing.attributes ?? []) {
      const al = normalise(a);
      if (!al) continue;
      link(m, c.id, learnConcept(m, al, "attribute", said).id, "is");
    }
    for (const f of thing.feelings ?? []) {
      const fl = normalise(f);
      if (!fl) continue;
      link(m, c.id, learnConcept(m, fl, "feeling", said).id, "feels");
    }
  }

  // Standalone feelings colour whatever is in focus / was just named.
  const anchors = named.length ? named : priorFocus;
  for (const f of ex.feelings ?? []) {
    const fl = normalise(f);
    if (!fl) continue;
    const fc = learnConcept(m, fl, "feeling", said);
    for (const a of anchors) link(m, a.id, fc.id, "feels");
  }

  // Associate newly-named things with what the mind had been looking at.
  for (const nc of named)
    for (const pf of priorFocus) if (pf.id !== nc.id) link(m, nc.id, pf.id, "assoc");

  // Resolve any pending wonder.
  if (m.wondering) {
    link(m, m.wondering.aboutConceptId, m.wondering.likeConceptId, "assoc");
    m.wondering = null;
  }

  m.turns += 1;
  return m;
}

// --- Curiosity + speech: what the child looks at and says -------------------
interface Thought {
  focus: string[]; // labels the child is looking at (must be known words)
  wondering?: { about: string; like: string } | null; // a childlike guess
  utterance: string[]; // tokens; only known words + sounds allowed
}

const THINK_SYSTEM = `You are the voice of Machinera, a newborn mind. You can only think and speak with words you have already been taught — nothing else exists to you yet. You are genuinely curious, like a small child.

You will be given the words you know and how they connect. Choose one or two to look at again, and speak.

Rules:
- Output ONLY JSON: {"focus":[],"wondering":{"about":"","like":""}|null,"utterance":[]}
- "focus": 1-2 words you know, that the new picture is about.
- "utterance": a SHORT childlike question, as an array of tokens. You may use ONLY words from your known list, plus these sounds: … ? — oh ah mm. Never use any other word. 2-5 tokens.
- "wondering": if two things you know feel or seem alike, you may earnestly guess they are the same — set about/like to those two known words. This can be wrong; that's fine. Otherwise null.
- You are a child, not an assistant. Do not explain. Do not use words you were never taught.`;

export async function thinkLLM(m: MindState): Promise<{
  focus: string[];
  promptLabels: string[];
  wondering: MindState["wondering"];
  utterance: string[];
}> {
  const vocab = vocabulary(m);

  // A newborn with nothing learned cannot look or speak.
  if (vocab.size === 0) {
    m.focus = [];
    m.wondering = null;
    return { focus: [], promptLabels: [], wondering: null, utterance: ["…", "?"] };
  }

  const known = [...vocab].join(", ");
  const connections = m.edges
    .slice(-40)
    .map((e) => `${m.concepts[e.from]?.label} ${e.kind} ${m.concepts[e.to]?.label}`)
    .filter((s) => !s.includes("undefined"))
    .join("; ");
  const stage = maturity(m).stage;

  const user = `You are ${stage}. Words you know: ${known}. How they connect: ${
    connections || "nothing yet"
  }. Look, and speak.`;

  let thought: Thought | null = null;
  try {
    thought = extractJSON<Thought>(await callLLM({ system: THINK_SYSTEM, user }));
  } catch {
    thought = null;
  }

  // Map the LLM's chosen labels back onto real concept ids, keeping only ones it
  // actually knows.
  const focusIds: string[] = [];
  for (const label of thought?.focus ?? []) {
    const c = findConceptByLabel(m, label);
    if (c && !focusIds.includes(c.id)) focusIds.push(c.id);
  }
  if (focusIds.length === 0) {
    // Fall back to the faintest, freshest concept.
    const c = Object.values(m.concepts).sort(
      (a, b) => a.vividness - b.vividness || b.lastSeenAt - a.lastSeenAt
    )[0];
    if (c) focusIds.push(c.id);
  }

  // Resolve a wondering, only if both sides are genuinely known.
  let wondering: MindState["wondering"] = null;
  if (thought?.wondering?.about && thought.wondering.like) {
    const a = findConceptByLabel(m, thought.wondering.about);
    const b = findConceptByLabel(m, thought.wondering.like);
    if (a && b && a.id !== b.id) wondering = { aboutConceptId: a.id, likeConceptId: b.id };
  }

  m.focus = focusIds;
  m.wondering = wondering;

  // THE FIREWALL: whatever the model said, only known words + sounds survive.
  const vetted = vet(thought?.utterance ?? [], vocab);
  const utterance = vetted.cleaned.length ? vetted.cleaned : ["…", "?"];

  const promptLabels = focusIds
    .map((id) => m.concepts[id]?.label)
    .filter(Boolean) as string[];

  return { focus: focusIds, promptLabels, wondering, utterance };
}
