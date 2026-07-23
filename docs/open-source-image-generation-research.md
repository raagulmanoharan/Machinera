# Open Source Image Generation Models — Research (July 2026)

Research into an effective open-source, self-hostable text-to-image model for Machinera.
Goal: pick a model that balances **output quality**, **license freedom (commercial use)**,
**hardware cost (VRAM)**, and **speed**.

## TL;DR recommendation

**Primary pick: [Z-Image Turbo](https://zimage-ai.com/) (Alibaba Tongyi Lab, 6B, Apache-2.0).**
It is the best all-around default for a product: near-frontier quality at a fraction of the
compute, sub-second-to-few-second generation, runs on consumer GPUs (as low as ~6–12 GB VRAM
quantized), and ships under a clean Apache-2.0 license with **no commercial restrictions**.

Pick a different model if you have a specific need:

| If you need… | Use | Why |
|---|---|---|
| **Best raw photorealism**, budget for big GPUs | FLUX.2 [dev] (32B) | Leads open-weight quality, but ~24–64 GB VRAM and a **non-commercial** weights license |
| **Legible in-image text / bilingual (EN+CN) text** | Qwen-Image (7B, Apache-2.0) | Best-in-class text rendering + built-in editing, native 2K |
| **Apache-licensed quality on ~8 GB VRAM** | FLUX.2 [klein] 4B/9B | Distilled FLUX under Apache-2.0, sub-second at 4 steps |
| **Deepest ecosystem** (LoRAs, ControlNet, tutorials) | Stable Diffusion 3.5 / SDXL | Largest community and tooling, runs on 8 GB |
| **Image + video from one stack** | Wan 2.2 (Apache-2.0) | Specialized for text/image-to-video |

## Why Z-Image Turbo as the default

- **License:** Apache-2.0 — unrestricted commercial use, modification, redistribution; no
  revenue share, explicit patent grant. Critical for shipping paid features without per-output
  legal review. (FLUX.2 [dev]'s weights are non-commercial.)
- **Quality-per-cost:** Reported at ~95% of FLUX-class image quality at ~20% of the compute,
  and cited as a top-ranked open model on the Artificial Analysis Image Arena, competitive with
  FLUX.2 [dev], HunyuanImage 3.0 and Qwen-Image.
- **Hardware:** 6B parameters. ~14–16 GB VRAM at BF16, ~8 GB at FP8, ~6 GB with GGUF quant —
  runs on an RTX 3060/4090 or similar consumer cards. Much cheaper to host than 32B FLUX.2.
- **Speed:** Distilled to ~8 inference steps; sub-second on datacenter GPUs (H800/H100),
  ~5–10 s on a consumer 16 GB GPU. Good for interactive / batch product workloads.
- **Ecosystem trade-off:** Newer model, so the fine-tuning/LoRA ecosystem is thinner than
  Stable Diffusion's. If heavy community LoRAs/ControlNets are a hard requirement, weigh SD 3.5.

## Full comparison

| Model | Params | License | Min VRAM | Best at | Watch-outs |
|---|---|---|---|---|---|
| **Z-Image Turbo** | 6B | Apache-2.0 | ~6–16 GB | Speed + quality balance, cheap hosting | Young fine-tune ecosystem |
| **FLUX.2 [dev]** | 32B | FLUX Non-Commercial | ~24 GB (Q4) – 64 GB (FP16) | Top photorealism, multi-ref (up to 10 imgs), native 4MP | Non-commercial weights; heavy VRAM |
| **FLUX.2 [klein] 4B/9B** | 4B/9B | Apache-2.0 | ~8 GB (4B) / 16 GB (9B) | Apache-licensed FLUX quality, 4-step | Slightly below dev quality |
| **Qwen-Image** | 7B | Apache-2.0 | ~16 GB | In-image text (EN+CN), unified gen+edit, native 2K | Smaller community than SD |
| **Stable Diffusion 3.5** | — | Stability Community | ~8 GB | Deepest LoRA/ControlNet ecosystem, tutorials | Less photorealistic than FLUX.2 |
| **Wan 2.2** | 5B–14B | Apache-2.0 | 8–40 GB | Text/image-to-video | Not tuned for static stills |

## Practical serving notes

- **Runtimes:** All the above run in **ComfyUI** and via **🤗 Diffusers**. ComfyUI is the fastest
  path to a working pipeline and supports GGUF/FP8 quantization for low-VRAM hosts.
- **Quantization matters:** FP8 roughly halves VRAM vs BF16; GGUF Q4 goes lower again with a
  small quality cost — the difference between "needs an A100" and "runs on a 4090."
- **Commercial licensing:** Prefer Apache-2.0 models (Z-Image, Qwen-Image, FLUX.2 klein, Wan 2.2)
  for a shipped product. Avoid FLUX.2 [dev] weights unless you buy a commercial license from
  Black Forest Labs.

## Suggested path for Machinera

1. **Start with Z-Image Turbo** in ComfyUI/Diffusers (FP8 or GGUF to fit a single consumer/L4-class GPU).
2. If in-image **text legibility** turns out to be a core requirement, add **Qwen-Image**.
3. Only reach for **FLUX.2 [dev]** if a customer-visible quality gap justifies the GPU cost and a
   commercial license.

## Sources

- [Thunder Compute — Best Open-Source Image Generation Models (2026)](https://www.thundercompute.com/blog/best-open-source-image-generation-models)
- [BentoML — A Guide to Open-Source Image Generation Models (2026)](https://www.bentoml.com/blog/a-guide-to-open-source-image-generation-models)
- [Local AI Master — Best Local AI Image Models 2026: FLUX vs SDXL vs Qwen](https://localaimaster.com/blog/best-local-image-models-compared)
- [Z-Image Turbo (official)](https://zimage-ai.com/) · [Local AI Master — Z-Image Turbo in ComfyUI](https://localaimaster.com/blog/z-image-turbo-comfyui)
- [FLUX.2 official inference repo](https://github.com/black-forest-labs/flux2) · [WillItRunAI — FLUX.2 Dev VRAM](https://willitrunai.com/image-models/flux-2-dev)
- [Artificial Analysis Text-to-Image Leaderboard](https://huggingface.co/spaces/ArtificialAnalysis/Text-to-Image-Leaderboard)
