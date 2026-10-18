# Memory experience: isolated branch review

Branch: `feature/machinera-memory-experience`.
Base: `main` at `c0c08ea74a411e44efb0ae3f9c13a8ba1e09a323`.

The live GitHub Pages app and deployment configuration are unchanged. This branch is not merged or deployed. The source copy used for earlier planning remains untouched; implementation is in this isolated checkout.

## Included

- Existing source-coloured scan resolves into the actual derived yarn inventory; status no longer pretends algorithm stages are running at arbitrary animation percentages.
- Camera pan follows the same print progress, including resize/background pause and reduced-motion completion.
- Visible camera/decode/preparation failures, explicit camera retry/photo selection, export retry and share/download fallback.
- A compact Memories surface with lazy derived-weave previews, selected-memory navigation and export, plus optional 40-grapheme names.
- Latest-memory-only Weave again: one disposable preview, Try another, explicit Add this weave. Adding appends one new section; cancelling changes nothing.
- Narrow IndexedDB name updates with conflict checks; saved history and yarn arrays remain unchanged. New entries retain analysis metrics and stable IDs for future exploration; old entries load without migration and offer navigation/naming/export, but cannot invent missing analysis.
- Same charcoal texture, Garamond, restrained controls, existing postcard design and saturation treatment. Small-screen and enlarged-text adjustments preserve usable touch targets.

## Boundaries

- Source photos, scan maps and preview images are never persisted. Only derived weave data and optional name/lineage metadata are saved.
- No accounts, analytics, new physics, new colour rules, animated export or production deployment.
- Variations count as additional memories. No replacement/deletion/reordering of continuous cloth history.
- Browser storage can be unavailable. In-session work remains exportable; stale or unreadable saved history is not overwritten or silently cleared.
- A browser download action cannot confirm the file reached Photos. UI offers guidance rather than a false success message.

## Local review

From the repository root:

```sh
npm ci
python3 -m http.server 5188 --bind 127.0.0.1 --directory public
```

Open `http://127.0.0.1:5188/strand/`. Using this local origin keeps test data separate from production browser storage. Camera permission requires localhost or HTTPS.

## Checks

```sh
node --test public/strand/*.test.mjs
npm run build
node tools/check-memory-ui.mjs
node tools/check-memory-experience.mjs
```

The browser scripts expect the local server and installed Playwright Chromium. They route Three.js to the installed version. `MACHINERA_TEST_URL` overrides the URL; `MACHINERA_TEST_OUTPUT` chooses full-flow screenshots; optional `MACHINERA_TEST_HDR` supplies a local licensed studio HDR instead of downloading the existing Poly Haven resource.

`MACHINERA_FAST_SMOKE=1` shortens only the test browser's scan/print presentation for software graphics. It does not change committed application timings. Unit tests separately verify the real print-progress/pan equations. Do not use software-rendered smoke timing as phone-performance evidence.

Manual device follow-up: iPhone Safari and Instagram/X browser camera permissions, keyboard/name editing, native share cancellation and download destination; Android Chrome; real-device lower-power frame pacing. Headless Chromium cannot establish these platform-specific behaviours.

## Recorded validation

- 98 automated tests pass, including derived-variant reproducibility, original-history immutability, IndexedDB metadata-only updates, stale-tab rejection, corrupt-record preservation, grapheme limits and postcard wrapping.
- Production build passes. Vite retains the pre-existing large root-app bundle advisory; this work does not change that unrelated entry point.
- Real DOM interaction checks pass for overview, latest-only variations, rename success/cancel/failure, focus restoration, duplicate Add prevention and closing during a pending thumbnail.
- Full 3D browser smoke passes capture → scan → print → name → cancelled variant → accepted variant → selected older-memory export → reload with both sections and name restored; no page errors. Software-graphics runs use the documented presentation-time override.
- Static 320×568, 390×844 and enlarged-text reviews informed touch-target, overflow and short-preview adjustments. Real iOS keyboard/share behaviour remains a manual device check.
