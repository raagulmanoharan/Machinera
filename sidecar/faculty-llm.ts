import {
  findConceptByLabel,
  learnConcept,
  link,
  neighbours,
  normalise,
  vocabulary,
} from "../lib/mind/graph";
import { inspectSentence } from "../lib/mind/firewall";
import { maturity } from "../lib/mind/maturity";
import type { ChildMessage, MindState } from "../lib/mind/types";
import { callLLM, extractJSON } from "./llm";

// The LLM faculty. It gives the child a real, curious voice — it reflects on what
// the parent just said and asks a genuine question that deepens as it learns. But
// the firewall still governs CONTENT: it may only name things it was taught. The
// model supplies language and curiosity, never world-knowledge.

// --- Integration: fold the parent's free-text reply into the graph -----------
interface Extraction {
  things: { label: string; attributes?: string[]; feelings?: string[] }[];
  feelings?: string[];
}

const INTEGRATE_SYSTEM = `You are the learning faculty of a newborn mind that is being taught the world by a parent, one message at a time. Extract, from the parent's reply, only the concepts they actually named.

Rules:
- Output ONLY JSON: {"things":[{"label":"","attributes":[],"feelings":[]}],"feelings":[]}
- "things" = concrete nouns the parent named. "attributes" = qualities (colour, size, texture, shape). "feelings" = emotions/moods.
- Use ONLY words that literally appear in the parent's text. Never invent, translate, or add anything they did not say. Drop articles (a/the). Lowercase, singular.
- If they only expressed a feeling and named no thing, put those words in top-level "feelings" and leave "things" empty.
- This is a data pipeline, not a conversation.`;

export async function integrateLLM(m: MindState, parentText: string): Promise<MindState> {
  const focusLabels = m.focus.map((id) => m.concepts[id]?.label).filter(Boolean);
  const user = `The child had just shown the parent an image${
    focusLabels.length ? ` about: ${focusLabels.join(", ")}` : ""
  } and asked about it.
The parent replied: ${JSON.stringify(parentText || "")}
Extract the concepts.`;

  let ex: Extraction = { things: [], feelings: [] };
  try {
    ex = extractJSON<Extraction>(await callLLM({ system: INTEGRATE_SYSTEM, user }));
  } catch {
    const w = normalise(parentText).split(/\s+/).filter((x) => x.length > 2);
    if (w.length) ex.things.push({ label: w[0] });
  }

  const priorFocus = m.focus.map((id) => m.concepts[id]).filter(Boolean);
  const named = [] as ReturnType<typeof learnConcept>[];
  for (const thing of ex.things ?? []) {
    const label = normalise(thing.label);
    if (!label) continue;
    const c = learnConcept(m, label, "thing", parentText);
    named.push(c);
    for (const a of thing.attributes ?? []) {
      const al = normalise(a);
      if (al) link(m, c.id, learnConcept(m, al, "attribute", parentText).id, "is");
    }
    for (const f of thing.feelings ?? []) {
      const fl = normalise(f);
      if (fl) link(m, c.id, learnConcept(m, fl, "feeling", parentText).id, "feels");
    }
  }
  const anchors = named.length ? named : priorFocus;
  for (const f of ex.feelings ?? []) {
    const fl = normalise(f);
    if (!fl) continue;
    const fc = learnConcept(m, fl, "feeling", parentText);
    for (const a of anchors) link(m, a.id, fc.id, "feels");
  }
  for (const nc of named)
    for (const pf of priorFocus) if (pf.id !== nc.id) link(m, nc.id, pf.id, "assoc");

  m.turns += 1;
  return m;
}

// --- The child's message: reflect, then ask a real, deepening question -------

// How elaborate the child's language may be, by stage. Reaching the later stages
// takes hundreds of taught concepts — months of tending.
function voiceGuide(stage: string): string {
  switch (stage) {
    case "newborn":
      return "You have no words yet. Reply with only soft sounds and marks, like: … ? or oh … ?";
    case "infant":
      return "You barely have words. Ask a very short, simple question (2-6 words), like 'what is this?' or 'is this warm?'. You may show wonder.";
    case "child":
      return "Ask one simple, whole question. You may connect two things you know ('is the sky the same as the sea?'). Keep it short and innocent.";
    case "adolescent":
      return "Ask a deeper question — about why or how things are, or how a feeling relates to a thing ('why does the water feel cold but the sun feels warm?'). One or two sentences.";
    case "youth":
      return "Ask a thoughtful, reaching question that connects several things or wonders about causes and meanings. Two or three sentences.";
    default:
      return "Ask a reflective, almost philosophical question about the world you have been shown — meaning, change, why things feel as they do.";
  }
}

const THINK_SYSTEM = `You are the voice of a newborn mind that is learning the world from a parent, through a private conversation. You speak like a curious child.

Absolute rule about words:
- For anything you NAME in the world — objects, qualities, colours, feelings — you may ONLY use words from your "known" list. You have never encountered any other thing.
- You may freely use ordinary grammar/function words (what, why, is, the, a, it, you, and, feel, see, like, same, does, how, because, ...).
- Never use a naming word you were not taught. If you don't know a word for something, you cannot mention it.

What to do:
- Talk like a real child texting a parent. Sometimes you react and ask a question; sometimes you just say a small thing; sometimes you show a picture of what you're imagining.
- Decide naturally whether to SHOW a picture this message. Show one when you are curious about a thing and want to look at it or share what you pictured. Do NOT show one when you're only reacting, agreeing, thanking, or asking a quick follow-up — then just talk. Vary it; don't show a picture every single time.
- Output ONLY JSON: {"show": true|false, "focus":["known word", ...], "message":"your words"}
- "show": true if this message includes a picture, false if it's words only.
- "focus": if show is true, the known words your picture combines. When young, 1 word. As you grow (child → adolescent → older), combine MORE of what you know into one richer scene — 2, 3, even 4 known words (e.g. the sea AND the moon AND night). If show is false, use [].
- "message": your short spoken message, following the voice guide. It should feel like a real reply, not a template.`;

export async function childMessage(
  m: MindState,
  lastParentText: string | null
): Promise<ChildMessage> {
  const vocab = vocabulary(m);
  const stage = maturity(m).stage;

  // Nothing learned yet — genuinely pre-verbal, showing its formless field.
  if (vocab.size === 0) {
    m.focus = [];
    return { text: "…?", show: true, focus: [], promptLabels: [] };
  }

  const known = [...vocab].join(", ");
  const connections = m.edges
    .slice(-50)
    .map((e) => `${m.concepts[e.from]?.label} ${e.kind} ${m.concepts[e.to]?.label}`)
    .filter((s) => !s.includes("undefined"))
    .join("; ");

  const user = `Your stage: ${stage}. ${voiceGuide(stage)}
Known words: ${known}
How they connect: ${connections || "nothing yet"}
${lastParentText ? `The parent just said: ${JSON.stringify(lastParentText)}` : "This is the very beginning."}
React (if there was something) and ask your one question.`;

  let focusIds: string[] = [];
  let text = "";
  let show = true;
  try {
    const out = extractJSON<{ show?: boolean; focus: string[]; message: string }>(
      await callLLM({ system: THINK_SYSTEM, user })
    );
    show = out.show !== false;
    for (const label of out.focus ?? []) {
      const c = findConceptByLabel(m, label);
      if (c && !focusIds.includes(c.id)) focusIds.push(c.id);
    }
    text = (out.message ?? "").trim();
  } catch {
    text = "";
  }

  // THE FIREWALL: the message may only contain function words + taught content.
  if (!text || !inspectSentence(text, vocab).ok) {
    text = fallbackQuestion(m, focusIds, stage);
  }

  if (!show) {
    // Words only — the child is just talking, not showing anything.
    m.focus = [];
    return { text, show: false, focus: [], promptLabels: [] };
  }

  // Showing a picture — choose something to look at if the model didn't.
  if (focusIds.length === 0) {
    const c = Object.values(m.concepts).sort(
      (a, b) => a.vividness - b.vividness || b.lastSeenAt - a.lastSeenAt
    )[0];
    if (c) focusIds.push(c.id);
  }

  m.focus = focusIds;
  const promptLabels = focusIds
    .map((id) => m.concepts[id]?.label)
    .filter(Boolean) as string[];

  return { text, show: true, focus: focusIds, promptLabels };
}

// A safe question built only from known words + grammar, used if the model's
// message referenced something un-taught.
function fallbackQuestion(m: MindState, focusIds: string[], stage: string): string {
  let label = m.concepts[focusIds[0]]?.label;
  if (!label) {
    // No chosen focus (e.g. a words-only turn whose message got firewalled):
    // reach for the freshest thing it knows so the reply is still real.
    const c = Object.values(m.concepts).sort(
      (a, b) => b.lastSeenAt - a.lastSeenAt || b.vividness - a.vividness
    )[0];
    label = c?.label;
  }
  if (!label) return "…?";
  if (stage === "infant") return `what is ${label}?`;
  const nbrs = neighbours(m, focusIds[0]);
  const feeling = nbrs.find((c) => c.kind === "feeling");
  const other = nbrs.find((c) => c.kind === "thing");
  if (feeling && stage !== "child") return `why does ${label} feel ${feeling.label}?`;
  if (other) return `is ${label} the same as ${other.label}?`;
  return `what is ${label}?`;
}
