# Machinera: a clearer, more playful weaving experience

Status: proposal for review; no implementation authorised by this document.
Date: 18 October 2026.
Companion: [UX flows](machinera-experience-flows.md).

## 1. Purpose and scope

Make taking a photo, recognising its colours in a rug, and keeping that rug feel like one coherent experience. Give people a small amount of meaningful exploration without introducing a settings-heavy editor.

This PRD covers **Machinera only**. Relief needs a separate instrument-specific brief. The research covered public descriptions and maker demos of [Thermal](https://devpost.com/software/thermal-daily-receipt) and [PicoCam](https://www.reddit.com/r/vibecoding/comments/1u7i35s/made_an_app_that_turns_your_dynamic_island_into_a/); it was not hands-on testing or retention research. Their relevant lessons are a legible physical ritual, personal inputs, and an output worth keeping.

User needs:
- As a first-time visitor, understand what to do without reading a tutorial.
- As someone intentionally photographing a colour, recognise its influence in the result.
- As someone curious about generative patterns, explore another interpretation without losing the first.
- As a returning visitor, find and share an earlier woven memory.
- As a privacy-conscious visitor, use the app without uploading or storing source photos.

## 2. Current baseline: observed in source

| Area | Existing behaviour | Planning implication |
|---|---|---|
| Capture | Full-bleed camera, central reticle, shutter; capture normally proceeds automatically | Preserve the one-capture-to-print path |
| Analysis | Source pixels produce derived yarn colours, weights, analysis and a bounded scan map | Reuse these outputs; do not build a second colour pipeline |
| Scan | Close dotted lines, source-coloured dot clusters, bottom-left status, scan sound | Refine continuity rather than replace the visual language |
| Print | Preparation/preview readiness gate, print-progress reader, bridge/pan and stitching sound | Audit and improve one shared progress model; do not add another timer |
| Cloth | Ordered, continuous woven sections with splices and absolute yarn coordinates | Committed history must stay immutable |
| Persistence | IndexedDB stores derived weave snapshots; append checks the saved tail for stale tabs | Adding metadata or variants needs versioning and compatibility planning |
| Export | Selected-memory postcard, native file share when supported, download fallback | Reliability work builds on this existing flow |
| Interaction | Optional cloth simulation; native scrolling otherwise | No new physics requirement for core actions |

Specific repair findings: `#photoStatus` is visually hidden, so some processing/decode errors lack a visible presentation. Scan labels currently advance at animation fractions rather than actual analysis milestones. Export preparation has an error message but no explicit Retry control. These are existing gaps to repair in Stage A, not additional product features. Camera permission failure currently falls back to the capture file input; make that path understandable and recoverable rather than treating a cancelled picker as a successful capture.

Source references: `public/index.html`, `viewfinder.css`, `stream-study.js`, `photo-rug-bridge.js`, `rug-archive.js`, `memory-store.js`, `postcard-capture.js` and `memory-postcard.js`. Current source may differ from a visitor's cached live version.

## 3. Release order

| Stage | Feature | Reason |
|---|---|---|
| A: core | F1 Colour-to-yarn continuity | Make the photo's contribution understandable |
| A: core | F2 Print continuity and recovery | A convincing, reliable finish is foundational |
| A: core | F3 Save/share reliability | Existing output must be easy to keep |
| B: exploration | F4 Weave again | Add meaningful replay using existing derived data |
| C: collection | F5 Memory overview | Make a growing cloth navigable |
| C: optional | F6 Memory names | Add personal context without requiring writing |

Stage A should pass usability and phone checks before Stage B is implemented. No automatic approval or implementation follows from this order.

## 4. Global requirements

- Keep the existing camera and cloth screens as the two main places in the app.
- Keep source photos transient; never persist photos, source scan maps, or preview frames. Preserve current saturation treatment.
- No accounts, cloud gallery, streaks, notification system, social feed, filter catalogue or tracking added by this work.
- Save/share is a user-triggered export of a rendered rug, not permission to upload source imagery.
- One active operation at a time: capture, generation, variant preparation and export must not race.
- Use explicit states, cancellation tokens and cleanup in the existing flow. Avoid a second archive or generation system.
- Controls must work by touch and keyboard. Accessible names explain icon actions; focus returns to the initiating control when a dialog closes.
- Honour reduced motion and mute. No interaction depends on hearing a sound, shaking a phone, dragging precisely, or native iOS haptics.
- Closing a view is safe before commit. After commit, retrying navigation or export must not append the same weave again.
- Errors use plain language and a relevant recovery action. Persistence notices remain attached to the screen bottom, clear of safe areas and controls.

## 5. F1 — Colour-to-yarn continuity

**Outcome:** People can see which colours will become yarns and recognise them in the rug.

Requirements:
1. Retain the existing tight dotted scan and clustered dots. Spatial scan dots continue to describe their source location; do not recolour them with unrelated palette accents.
2. When analysis completes, briefly resolve the actual derived palette into a compact group of yarn strands within the existing processing composition. These are the same dye values handed to the generator, subject to the existing renderer's lighting/display treatment.
3. Distinguish location sampling from consolidated yarn colours visually: source dots show sampled locations; the final strands show the selected yarn inventory. Do not imply one-to-one pixel reproduction.
4. Feed those strands visually into the onset of weaving. No permanent colour toolbar, palette picker or extra confirmation screen.
5. Keep status bottom-left in the lower camera UI, outside the viewfinder. Status changes reflect actual analysis/readiness milestones. A deliberate reveal animation must not pretend expensive computation is still running after completion.
6. Reuse existing analysis results and texture resources. No per-frame full-resolution image readback, segmentation model or hue-specific exception rules.

Negative paths and recovery:
- Analysis is late: remain on the captured frame with an honest waiting status; no pan to empty cloth.
- Uniform, dark or low-colour input: show the available yarn colours without inventing accents or claiming a missing colour was detected.
- Analysis fails: stop sound/animation, clear transient resources, return to a usable capture state with “Couldn't prepare this photo. Try again.” Do not append an entry.
- App is backgrounded or viewport rotates: pause/recalculate the visual layout; do not start another analysis or capture.
- Reduced motion: show the final yarn inventory and simple state changes without a travelling scan.

Acceptance:
- The final yarn inventory corresponds to the generator input, including muted and monochrome inputs.
- Portrait/landscape and mirrored previews preserve the mapping between source dots and image coordinates.
- Capture count is unchanged until an archive entry is committed.
- No new source-image data survives successful completion, cancellation or failure.

## 6. F2 — One coherent printing motion

**Outcome:** Photo feeding, camera travel, cloth emergence and stitching sound describe the same operation.

Requirements:
1. Keep the existing prepared-data + rendered-preview gate before the transition starts.
2. Drive photo feed, camera position and reveal from the same normalised print progress. Reuse the existing bridge/progress infrastructure.
3. The camera reaches its destination when the intended new section has finished emerging. Previously committed cloth remains unchanged.
4. No carpet leaks into the camera screen before transition; no unprinted tail, clipped result, late extension or visible progress reset after arrival.
5. Stitching sound follows actual print activity and stops during pause, failure, mute and completion. No extra processing sound layer is added.
6. Apply the same printing path to photo captures and accepted derived variants.

Negative paths and recovery:
- Slow frames: advance the whole operation coherently; never let an independent CSS timer outrun printing.
- Background/resume: pause the shared operation and resume from one consistent state, without a burst of queued sound.
- Resize/rotation: recalculate geometry from the current progress, preserving the committed section and progress.
- Reduced motion: directly reveal the completed section once ready; save it exactly once.
- Render/context failure: stop sound, show a recoverable error and retain persisted history. Avoid a promise of recovery that silently deletes unsaved work.
- Failure after append: identify the existing committed entry and recover presentation only; do not append a duplicate.

Acceptance:
- At arrival the complete new section is visible and no meaningful printing continues afterward.
- Slow-device and background tests show matched travel and reveal, no early arrival or missing first frames.
- The existing cloth, memory order, seed and joins remain identical across replay or reopening.

## 7. F3 — Save/share reliability

**Outcome:** The current memory can be kept outside the app without disrupting the cloth.

Requirements:
1. Preserve the existing black textured 1080 × 1920 postcard, hairline border, Garamond, two export font sizes, rug/text alignment and balanced spacing. No palette strip, extra backgrounds, shadows or app controls inside the image.
2. Capture the selected memory consistently; lock its identity while preparing/exporting even if navigation changes later.
3. Keep technical details tied to the actual saved draft/yarn inventory. Do not regenerate a different pattern for export.
4. Use native file sharing only when supported, otherwise offer the existing download route. Native share cancellation is neutral, not an error.
5. Close and retry remain usable. Export cleanup restores the live renderer, camera and simulation state and releases temporary URLs/blobs.
6. Do not claim a file reached the photo library: browser downloads and share destinations behave differently.

Negative paths and recovery:
- Export fails: show “Couldn't prepare the postcard. Try again.” Keep the original memory intact.
- Unsupported file share or non-cancellation share failure: expose download fallback.
- Save appears to do nothing in an in-app browser: provide concise browser-appropriate help, without falsely reporting success.
- Closing during preparation: cancel/discard late results; do not reopen the dialog.
- Memory is printable but local storage failed: allow export from the current session; clearly distinguish local saving from postcard download.

Acceptance:
- Exported pattern, memory identity, number and specifications match the selected archive entry.
- Share cancellation creates neither an error banner nor another memory.
- Opening/closing export never changes the live rug's pose, simulation setting, order or scroll position.

## 8. F4 — Weave again

**Outcome:** Explore another draft from the same yarn colours without losing a woven memory.

Recommended product decision for review: **an accepted variation is a new memory/cloth section**. It increments the count. It does not replace the original. UI copy explicitly says so.

Requirements:
1. Initially available for the latest finished section only, through that memory's contextual actions rather than another permanent corner icon.
2. Reuse its palette, weights and analysis. A fresh seed changes the draft/layout; colours are not resampled or regraded.
3. Prepare one temporary candidate in a compact preview using a bounded preview path. Do not append to the live archive to create a preview.
4. Offer “Try another”, “Add this weave” and a small close control. Supporting copy: “Same colours. Adds a new memory.” Preserve the original until explicit Add.
5. Try another replaces only the disposable candidate. Keep at most one candidate and ignore stale asynchronous results.
6. Avoid an identical plan where alternatives exist. For low-information inputs, a useful different draft is acceptable without invented colours; explain if no distinct candidate can be prepared.
7. Add commits once, prints through F2, then persists using the existing append path. Store a stable derived-from reference if the schema supports it; never reference a source photo.
8. No source-image scan animation or “Extracting colours” claim for a variant: analysis is already available.

Negative paths and recovery:
- Cancel, Back or reload before Add: discard candidate; archive, count and saved history unchanged.
- Generation fails: retain original and allow retry or close.
- Rapid taps: one candidate task or one commit only; disable actions while committing.
- Switching tabs/history changes: invalidate the candidate's archive-tail expectation before Add. Show a conflict message without overwriting either history.
- Persistence fails after Add: retain the section in-session, show unsaved status and allow export. Retrying save must not append it twice.
- Old snapshots lack necessary analysis: hide this action or provide a clear unavailable explanation; do not synthesize a photo or invent profiling metrics.

Acceptance:
- Ten cancelled previews leave the archive and memory count unchanged.
- The original saved entry is byte-identical after generation, cancellation and accepted append.
- Candidate palette identities and weights match the source; a new seed survives reload after successful save.
- Double Add results in exactly one appended section.

## 9. F5 — Memory overview

**Outcome:** Find a memory without scrolling the entire cloth.

Requirements:
1. Keep the existing camera-to-cloth control. On the cloth, the selected-memory identifier opens contextual actions with a Memories action leading to the compact overview; do not make the existing camera grid button change meaning silently. Resolve the exact entry-point placement in wireframes against the occupied corner controls.
2. Show memory number, optional name and small rug thumbnail in archive order. No source-photo thumbnails.
3. Selecting a memory closes the overview and moves to that section; reduced motion jumps directly. Subsequent export targets that selected section.
4. Reuse derived data and a bounded thumbnail cache. Lazy-generate visible thumbnails using one rendering path; no WebGL context per cell or continuously animated grid.
5. Older memories offer navigation and export. Weave again remains latest-only in the first release.

Negative paths and recovery:
- No memories: entry point hidden; stale open request resolves to camera rather than blank gallery.
- One memory: overview still works without unnecessary pagination.
- Thumbnail unavailable: show number/name placeholder; navigation remains available.
- Many memories: lazy rendering and scrolling remain responsive; no full-history render on open.
- Restore fails or an incompatible saved record exists: preserve database contents and show recovery guidance; never silently clear data or regenerate history.

Acceptance: selected identity, scroll destination, displayed number and exported memory agree, including at joins and first/last entries.

## 10. F6 — Optional memory names

Requirements:
1. Put Rename in the overview's selected-memory actions. No text input during capture or printing.
2. Optional plain text, up to 40 user-perceived characters, with a counter near the limit. Blank clears the name; generated memory number always remains visible.
3. Support Unicode, emoji and input-method composition. Render as text, not markup. Fit the postcard without widows or unexpected new typography; wrap rather than shrink below the existing body size.
4. Persist name as versioned metadata addressed by stable entry ID. Rename must not mutate the weave plan, yarn arrays or archive joins.
5. Existing snapshots load with no name. Migration must preserve all weave bytes and history.

Negative paths: Cancel leaves old name; over-limit input has inline guidance; failed save retains edit text for retry and reports unsaved status; stale-tab update cannot overwrite newer metadata silently. Do not block weaving if naming is unavailable.

Acceptance: renamed memory survives reopen, retains identical pattern data and exports the same name; older records load unchanged.

## 11. Persistence and error policy

| Condition | Required behaviour |
|---|---|
| Permission denied/no camera/in-use camera | Clear enable/retry guidance; supported photo-input fallback only where actually wired; no empty scan |
| Storage unavailable or quota exceeded | Keep current session usable and exportable; bottom notice says changes may not survive closing |
| Another tab has changed archive | Do not append incompatible saved history; explain conflict, preserve current-session work and allow export before user-triggered reload |
| Reload during uncommitted preview/analysis | Discard transient state; restore only previously committed saved history |
| Reload after saved commit but before animation ends | Restore that exact entry once; do not reprint by appending again |
| Audio cannot start | Continue silently; never block camera, scan or printing |
| Corrupt/incompatible saved data | Preserve originals; no automatic reset, partial overwrite or invented recovery |

Use honest distinctions between “woven in this session”, “saved in this browser” and “exported”. No forced reload while unsaved work is only in memory.

## 12. Validation and success criteria

Before building, validate proposed flows and wireframes with the owner. After building:
- First-use observation: can a new person capture, identify photo colours in the result, and find Save without coaching?
- Exploration observation: do people understand Add creates a new section and Close preserves the original?
- Return observation: can people find and export a previous memory?
- Quality checks: coloured foreground against neutral background, monochrome, dark scene, tiny accent, similar successive photos, portrait/landscape and front-camera mirroring.
- Device checks: iPhone Safari, an iPhone social in-app browser, Android Chrome and desktop browser; small viewport, safe areas, backgrounding, reduced motion, keyboard and screen reader.
- Recovery checks: denied camera, failed analysis, missing WebGL, storage blocked/quota, stale tab, export failure/cancellation, rapid repeated actions and reload at each commit boundary.
- Performance: record a reproducible baseline on a lower-powered phone before changes; compare capture-to-ready time, transition frame pacing, memory and overview opening. Set measured budgets before implementation; no unsupported smoothness claim or fabricated numeric target.

Focus automated tests on transaction safety, immutable history, palette reuse, progress coupling and cleanup. Use physical-device checks for permissions, share sheets, downloads, audio and browser chrome.

No analytics are added by this PRD. Any future tracking needs a separate decision about events, provider and disclosure.

## 13. Review decisions and next gates

1. Confirm Stage A before exploration/collection features.
2. Confirm accepted variants count as new memories; changing existing sections is out of scope.
3. Confirm latest-memory-only exploration and contextual controls.
4. Confirm overview and optional naming belong in a later stage.
5. Review companion flows, including failure paths.
6. After flows are approved, produce wireframes for default and error states using the existing visual system.
7. Owner reviews wireframes before implementation planning and app changes.

Deferred: animated export, manual shuttle/drag-to-print, new pattern families, hue-specific profiling rules, new physics, collaborative galleries and native-only gestures.
