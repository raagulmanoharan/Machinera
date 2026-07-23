# Machinera

> A newly-born mind, raised by you.

Machinera starts as an AI that is genuinely curious and knows **nothing** about the
real world. It shows you what it "sees" — at first a formless, breathing field — and
asks you what things are. You answer with meaning, with feeling, or both. It remembers
everything, and slowly its inner world takes the exact shape of what you chose to teach
it. No two people raise the same mind.

This repo is an early, runnable prototype of that experience.

## The one idea that makes it real

The child must **genuinely** learn — never pretend to be dumb. So Machinera enforces a
firewall between **faculty** and **content**:

- The **memory graph is the only source of what the mind knows about the world.** If you
  haven't taught it, it does not exist for the mind.
- The reasoning engine is a **faculty only** — machinery for language, association, and
  curiosity — not a source of world-knowledge (a newborn brain, not an encyclopaedia).
- Every word the mind says and every image prompt it forms passes through
  `lib/mind/firewall.ts`. Anything referencing an un-taught concept is rejected before it
  reaches you. The newborn's ignorance is therefore **real**, and even an LLM faculty
  cannot leak pretrained knowledge.

Because the mind starts empty, it literally cannot picture or name anything — so turn zero
is pure abstraction and wordless curiosity. As you teach it, images sharpen and its voice
grows from babble → words → sentences. That arc is *emergent* from the graph getting richer,
not scripted.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

It runs **fully offline by default** — the newborn's imagination is rendered procedurally
and the reasoning faculty is local. No API keys required. Your mind persists to `.data/`.

## The two engines

| Engine | What it does | Default | Upgrade |
| --- | --- | --- | --- |
| **The Mind** | holds the memory graph, gets curious, speaks, integrates your answers | local faculty (`lib/mind/faculty.ts`) | optional LLM faculty (firewalled) |
| **The Imagination** | turns the current thought into an image | procedural abstraction (`lib/imagination/procedural.ts`) | **Z-Image Turbo** once the mind matures (`lib/imagination/zimage.ts`) |

Maturity (`lib/mind/maturity.ts`) drives everything: below a threshold the image stays
abstract; above it, if a real model is configured, the Imagination hands off — with fewer
steps / lower guidance for a younger mind, so even real renders start dreamy and tighten
as it grows.

### Turning on real image generation

Copy `.env.example` to `.env.local` and set `ZIMAGE_ENDPOINT` (a Z-Image Turbo or
compatible text-to-image endpoint). See `docs/open-source-image-generation-research.md`
for why Z-Image Turbo (6B, Apache-2.0) is the default choice.

## Layout

```
app/                     Next.js app router
  page.tsx               the single screen (image · voice · two-mode input · mind)
  api/mind/next          form the next thought (curiosity → image → question)
  api/mind/teach         integrate the parent's answer, then form the next thought
  api/mind/state         the mind laid bare (for the graph panel)
lib/mind/                the Mind: graph, firewall, maturity, faculty, store, turn
lib/imagination/         the Imagination: procedural + Z-Image adapter + handoff
components/              Vision, MindPanel
docs/                    experience design + open-source image-model research
```

## Design

See [`docs/machinera-experience-design.md`](docs/machinera-experience-design.md) for the
principles, the two-engine model, and the decisions locked so far.
