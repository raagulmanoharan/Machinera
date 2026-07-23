# Machinera

> A newly-born mind, raised by you.

Machinera is a **conversation**. A newly-born mind that knows **nothing** about the real
world messages you — showing you what it "sees" (at first a formless field) and asking what
things are. You reply, in plain words, like texting a curious child. It remembers everything,
and slowly its inner world takes the exact shape of what you chose to teach it. No two people
raise the same mind. The interface is just that chat — nothing else.

This repo is an early, runnable prototype of that experience.

## The one idea that makes it real

The child must **genuinely** learn — never pretend to be dumb. So Machinera enforces a
firewall between **faculty** and **content** (`lib/mind/firewall.ts`):

- The **memory graph is the only source of what the mind knows about the world.** If you
  haven't taught it, it does not exist for the mind.
- The reasoning engine is a **faculty only** — machinery for language, association, and
  curiosity — not a source of world-knowledge (a newborn brain, not an encyclopaedia).
- **Content words** (things, qualities, feelings) must be taught. **Function words** (what,
  why, is, the, feel…) are always available — they are language faculty, not world-knowledge,
  which is what lets the child ask *real* questions instead of naming-word fragments.
- Every message the child speaks and every image prompt it forms is vetted. Anything
  referencing an un-taught concept is rejected — so even a frontier LLM faculty cannot leak
  pretrained knowledge. The ignorance is **real**.

Because it starts empty, it literally cannot picture or name anything — so its first message
is a formless image and a wordless "…?". As you teach it, its questions deepen (from "what is
this?" to "why does the water feel cold but the sun feel warm?") and its images sharpen. That
arc is **emergent** from the graph getting richer — and it is meant to unfold over **months**
of tending, not a single session. The maturity curve is deliberately slow; a mind stays young
for a long time.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

No API keys required. By default the reasoning faculty is local (simple questions) and the
Imagination generates real images via a keyless open-model endpoint; set
`NEXT_PUBLIC_IMAGINATION=procedural` to run **fully offline**. For the deepening,
conversational voice, run the sidecar (below). Each visitor's mind and conversation persist
in their own browser (`localStorage`), so everyone raises their own private mind.

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
default. The sidecar exposes `/open` and `/reply` (the conversation) and `/image` (proxies
the image model where only the server has external egress).

### Image generation (open model)

Images are generated by an **open-weight model** (FLUX, keyless by default). Maturity drives
the style — dreamlike/abstract for a young mind, detailed as it grows (over months). To run
your own from the research (`docs/open-source-image-generation-research.md`), set
`NEXT_PUBLIC_ZIMAGE_ENDPOINT` to a **Z-Image Turbo** (6B, Apache-2.0) or compatible endpoint;
it takes precedence over the keyless default.

## Layout

```
app/                     Next.js app (static export)
  page.tsx               the messaging UI — a chat, nothing else
lib/engine.ts            conversation engine: local faculty, or the sidecar if configured
lib/mind/                the Mind: graph, firewall (content vs function words), maturity,
                         local faculty, browser-store
lib/imagination/         the Imagination: open-model generation + procedural fallback
sidecar/                 the real-LLM faculty service (/open, /reply, /image; providers)
docs/                    experience design + open-source image-model research
.github/workflows/       GitHub Pages deploy
```

## Design

See [`docs/machinera-experience-design.md`](docs/machinera-experience-design.md) for the
principles, the two-engine model, and the decisions locked so far.
