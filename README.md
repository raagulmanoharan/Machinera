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
and the reasoning faculty is local. No API keys required. Each visitor's mind persists in
their own browser (`localStorage`), so everyone raises their own private mind.

## The two engines

| Engine | What it does | Default | Upgrade |
| --- | --- | --- | --- |
| **The Mind** | holds the memory graph, gets curious, speaks, integrates your answers | local faculty (`lib/mind/faculty.ts`) | **real LLM faculty** via the sidecar (`sidecar/`) |
| **The Imagination** | turns the current thought into an image | **real text-to-image** (FLUX via Pollinations, keyless — `lib/imagination/pollinations.ts`) | **Z-Image Turbo** endpoint (`lib/imagination/zimage.ts`); procedural offline fallback |

Maturity (`lib/mind/maturity.ts`) drives the **style**, not just a threshold: a young mind's
images are formless and dreamlike, sharpening into detailed, vivid scenes as it grows — the
abstract→complex arc, on real generated images. A mind with nothing learned yet can depict
nothing, so turn zero is genuine procedural abstraction. What every image *depicts* is still
firewalled — the prompt is built only from taught concepts.

Real generation needs no API key: the browser (or the sidecar, if one is running) calls a
free FLUX-backed endpoint. Set `NEXT_PUBLIC_IMAGINATION=procedural` to force the offline
look, or configure a `ZIMAGE_ENDPOINT` to use your own Z-Image Turbo deployment instead.

### Real LLM faculty — the sidecar

The Mind can be powered by a real LLM without touching the (static) app, using the
**sidecar pattern**: a small companion service (`sidecar/`) runs alongside the site, holds
any API key server-side, and serves the faculty. The app calls it only when
`NEXT_PUBLIC_SIDECAR_URL` is set; otherwise it uses the built-in local faculty.

Crucially, the [firewall](lib/mind/firewall.ts) still governs the LLM's output: every word
it speaks is vetted against the taught vocabulary, and on learning it may only extract
concepts from the parent's own words. The LLM supplies language and association — never
world-knowledge. So the mind stays genuinely ignorant of anything it wasn't taught, even
with a frontier model behind it.

```bash
# terminal 1 — the sidecar (defaults to the local `claude` CLI as the LLM)
npm run sidecar
# terminal 2 — the app, pointed at it
NEXT_PUBLIC_SIDECAR_URL=http://localhost:8787 npm run dev
```

Providers are pluggable (`sidecar/llm.ts`): set `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY`
(+ `SIDECAR_OPENAI_BASE` for any OpenAI-compatible endpoint), or the local Claude CLI by
default. A live sidecar shows a green **LIVE · LLM FACULTY** badge in the app.

### Turning on real image generation

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_ZIMAGE_ENDPOINT` (a Z-Image Turbo
or compatible text-to-image endpoint). See `docs/open-source-image-generation-research.md`
for why Z-Image Turbo (6B, Apache-2.0) is the default choice.

## Layout

```
app/                     Next.js app (static export)
  page.tsx               the single screen (image · voice · two-mode input · mind)
lib/engine.ts            client engine: local faculty, or the sidecar if configured
lib/mind/                the Mind: graph, firewall, maturity, faculty, turn, browser-store
lib/imagination/         the Imagination: procedural + Z-Image adapter + handoff
sidecar/                 the real-LLM faculty service (server, llm providers, faculty)
components/              Vision, MindPanel
docs/                    experience design + open-source image-model research
.github/workflows/       GitHub Pages deploy
```

## Design

See [`docs/machinera-experience-design.md`](docs/machinera-experience-design.md) for the
principles, the two-engine model, and the decisions locked so far.
