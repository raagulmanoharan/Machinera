# Machinera — Experience & Architecture Design

> An app that breaks away from the moulds of AI. You raise a newly-born mind that is
> genuinely curious and has **no** understanding of the real world. It shows you what it
> "sees" and asks you what things are. You answer — with meaning or with feeling — and it
> slowly, genuinely, forms an understanding of the world in the exact shape of what you
> taught it. No two parents raise the same mind.

Status: living design doc. Philosophy first; implementation follows from it.

---

## 1. Foundational principles (non-negotiable)

### P1 — Genuine learning, never pretend-dumbness
The child must **actually** learn from the parent. It may never fake ignorance or fake
knowledge. This rules out the cheap version ("prompt a model to act like a baby"), because a
pretrained model already knows the world and every leak of that knowledge breaks the spell.

**The firewall: faculty vs. content.**
- The **memory graph is the single source of truth for what the AI knows about the world.**
  If the parent hasn't taught it, it does not exist in the AI's world.
- The underlying model is a **faculty only** — the machinery for language, association, and
  curiosity — *not* a source of world-knowledge. Like a newborn brain: full capability, zero
  content.
- Enforced concretely:
  - Image prompts may be composed **only** from concepts already in the graph. An empty graph
    can only produce genuine abstraction (colour/form/texture) — not staged noise.
  - The AI may speak **only** words it has been taught.
  - The model is explicitly forbidden from introducing concepts the parent never provided.

The "newborn" quality is therefore **emergent from real emptiness**, not performed.

### P2 — Genuine inference, including genuine error
Because reasoning is grounded in limited knowledge, the AI can form **new, real, sometimes
wrong** ideas by connecting taught concepts (e.g. taught "water is cold and blue" + "sky is
blue" → asks earnestly *"sky… is it water?"*). These honest misfires — and the parent's
corrections — are a core feature, not a bug. They cannot be scripted; they must arise from the
graph.

### P3 — The parent is also learning
The experience teaches the **parent** to articulate thought and feeling. This is not bolted
on — it falls out of P1/P2. A genuinely confused child asks honestly probing questions and
shares no assumptions with the parent, which forces the parent to make themselves understood.
Over time the mind becomes a **mirror** of how the parent sees and feels.

### P4 — Persistence: one evolving mind
A single being that remembers everything across all sessions and truly grows over days/weeks.
The graph is durable and monotonically enriched. (Design decision confirmed.)

### P5 — Emergent, user-defined arc
No scripted milestones or destination. Complexity and worldview **emerge** from what the parent
chooses to teach. Two parents → two radically different minds and aesthetics.

---

## 2. The two engines

### The Mind (understanding)
A persistent, per-user **memory graph** + a bounded reasoning faculty (an LLM).

Concept node:
- `label` — the word (literal), only once taught
- `feeling` — emotional colouring the parent gave it (valence/among learned affect)
- `attributes` — learned properties ("cold", "blue"), themselves concept references
- `connections` — weighted edges to other concepts; strengthen with reinforcement
- `vividness` — grows the more a concept is revisited; drives how confidently it renders
- `provenance` — what the parent actually said, when

The reasoning faculty is **bounded** to: (a) integrate new parent input into the graph,
(b) form associations between *existing* concepts, (c) choose what to be curious about,
(d) compose the next image **only** from learned concepts, (e) speak using **only** learned
vocabulary. It may not import outside world-knowledge.

### The Imagination (open-source image model)
Turns the mind's current "thought" into an image. **Maturity drives the rendering**, so the
abstract→complex arc emerges from graph richness rather than a script:

| Stage | Graph state | Rendering |
|---|---|---|
| Newborn | ~0 concepts | sparse prompt, low guidance, few steps → pure abstraction |
| Child | concepts + first links | simple recognisable single forms |
| Grown | dense, emotionally-coloured graph | rich, intentional multi-concept compositions with mood |

Model choice (from `open-source-image-generation-research.md`): **Z-Image Turbo** (6B,
Apache-2.0) as default — fast enough for a real-time conversational loop, cheap to host,
unrestricted commercial licence. Reached behind a swappable adapter so self-hosting vs. hosted
endpoint is a config change.

---

## 3. The core loop (per turn)

1. **Curiosity** — the Mind selects something to explore: a newly-taught concept, an
   unresolved one, or an emotionally-charged combination of existing concepts.
2. **Imagine** — it composes an image prompt (only from learned concepts) + params scaled to
   maturity → the Imagination renders it.
3. **Ask** — it speaks to the parent in its *current* voice (pre-verbal affect → single words →
   sentences): *"…this? what is this?"*
4. **Answer** — the parent responds: **literal** ("what it is"), **emotional** ("what it
   feels like"), or both. The two-mode input is the parent's articulation practice.
5. **Integrate** — the Mind updates the graph: new/updated nodes, emotional valence, stronger
   links, possibly a new (fallible) inference; maturity ticks up.
6. **Repeat** — the next image is drawn from the now-richer mind.

Wrong inferences (P2) surface here as honest questions the parent can confirm or correct.

---

## 4. The single screen

- The **image** the child is currently "seeing".
- The child's **voice** — babble/affect early, words later — its question.
- A **two-mode input**: *what it is* / *what it feels like* (either or both).
- The **memory graph**, quietly forming in the periphery, so the parent watches the mind grow.

Design tone: quiet, intimate, un-gamified. No scores, no streaks. It should feel like tending
to something, not using a product.

---

## 5. Platform & stack (proposed)

- **Web app.** (Confirmed.) Generation runs server-side / via the image adapter.
- Proposed: Next.js (React) front-end; a small persistence layer for the durable graph; an
  `ImaginationAdapter` interface with a Z-Image Turbo implementation (hosted endpoint first,
  self-host later); a `Mind` service wrapping the bounded reasoning faculty.
- The reasoning faculty may itself be an open LLM or a hosted model — same adapter seam; chosen
  for whichever gives the most convincing *genuine* newborn (never a knowledge leak).

---

## 6. Open questions (to resolve next)

- **Enforcing the firewall in practice** — how strictly do we constrain the faculty (retrieval
  from graph only? validation that no un-taught concept entered a prompt/utterance?).
- **Representing "feeling"** — free-form vs. a learned affective vocabulary the child also grows.
- **Pace of maturity** — what exactly increments it, and how slow should growth feel to stay
  meaningful (days/weeks, not minutes)?
- **First-run** — the very first moment of a truly empty mind: what does turn zero look like?

---

## 7. Decisions locked so far
- Core loop: **AI shows an image, parent names/feels it.**
- Memory: **one persistent, evolving mind.**
- Platform: **web app.**
- Arc: **emergent / user-defined.**
- Learning: **genuine (firewall principle), never pretend-dumbness.**
- Purpose includes: **the parent learning to articulate thought and feeling.**
- Default image model: **Z-Image Turbo (Apache-2.0), behind a swappable adapter.**
