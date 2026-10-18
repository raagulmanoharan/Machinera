# Machinera: UX flows for review

Status: proposed interaction specification, not wireframes or implemented behaviour.
Date: 18 October 2026.
Companion: [PRD and acceptance criteria](machinera-experience-prd.md).

## 1. Visual contract

Match `public/index.html` and `public/viewfinder.css`, rather than introducing a new design system.

| Element | Preserve |
|---|---|
| Background | Existing textured charcoal, `--paper: #141414`; no blurred glass, gradients or extra panels |
| Foreground | Existing warm off-white, `--ink: #ecebe5` |
| Type | EB Garamond, fallback Garamond; app UI `13px`, weight 400, line-height 1.25, tracking −.01em |
| Case | MACHINERA uppercase; other labels sentence case; info title italic |
| Camera | Full-bleed top within the browser content viewport, existing crosshair lines and central circle; no added top box |
| Camera panel | Existing translucent/transparent treatment and spacing; status below the viewfinder at bottom-left |
| Controls | Existing restrained line icons, approximately 20px inside 44px touch targets; no extra always-visible toolbar |
| Toggle | Existing filled active state for simulation; this is distinct from disabled state |
| Dialogs | Centred textured black, square corners, no decorative border/shadow; small close icon aligned with title |
| Postcard | Existing exception: hairline off-white border, two established export type sizes, aligned rug/text, balanced margins |
| Motion | Existing measured physical movement; reduced-motion alternative; muted mode remains fully usable |

13px is the current baseline, not a reason to defeat browser text enlargement. Layouts must reflow with larger text. New dialog actions need 44px effective touch targets even when their visible glyph is small. Exact new-dialog dimensions and thumbnail arrangement are deferred to wireframes.

## 2. Places and navigation

- **Camera:** existing first floor. Capture, switch camera, sound, info; cloth entry hidden when no memories.
- **Processing:** existing captured camera view plus scan, resolved yarns and lower-panel status. Not a separate page.
- **Cloth:** existing second floor with scroll, camera return, sound, save and optional simulation.
- **Selected-memory actions:** a small contextual surface reached from the memory identifier; offers existing Save and relevant new actions, not another corner button.
- **Variant preview:** one disposable alternate, concise explanation, Try another / Add this weave / Close.
- **Memory overview:** compact, scrollable saved-weave overview, reached through the selected-memory surface in the collection stage.
- **Rename:** short inline/dialog text edit inside the overview; optional.
- **Postcard:** existing preview and close/save/share controls.

Do not repurpose the camera's existing cloth-entry button into a gallery. Do not add tabs to the info card. Keep ordinary capture independent of overview or exploration.

## 3. Shared state and interaction rules

```text
Camera ready
  → Captured / analysing
  → Scan and yarn reveal ready
  → Awaiting rendered cloth readiness
  → Committed / printing and travelling together
  → Cloth idle

Cloth idle
  → Variant preparing → Variant preview → [discard OR append/print]
  → Postcard preparing → Postcard ready → [share/download OR close]
  → Memory overview → [jump OR rename OR close]
```

The state list describes user-visible milestones, not a request to implement another state-machine library. Reuse current operation tokens/readiness flags.

- Mutating operations exclude each other. Starting an export or alternate is unavailable while capture/printing is active.
- Close means discard only before commit. After commit, presentation recovery must keep the committed memory.
- Busy controls communicate state and prevent duplicate work; no frozen unlabeled screen.
- Dialog focus stays within the dialog and returns to its trigger. Escape and a visible Close have equivalent effects.
- Repair current visually hidden failure messages: `#photoStatus` remains available to assistive technology but critical errors also need visible text outside the viewfinder. Export generation needs an explicit Retry action. Scan labels currently follow animation fractions; move truthful status reporting to actual milestones.
- Browser Back should close a transient surface before navigating away where supported; it must never commit. Do not trap a user on the site or require a fragile navigation-history trick.
- Any action that would abandon unsaved current-session work warns specifically about that loss. Ordinary preview cancellation needs no confirmation.

## 4. Flow A — First capture and colour-to-yarn reveal

1. Open app → existing info card and camera startup behaviour.
2. Dismiss info → camera ready. Preserve the current first-use visual composition.
3. Tap shutter or viewfinder → one frame captured, further capture disabled.
4. Show existing scan with source-coloured clustered dots and lower-panel status.
5. Analysis resolves → compact actual yarn inventory becomes visible; it connects visually to the weave preparation. Do not introduce a palette-edit step.
6. Wait until cloth frame is ready → begin printing and pan as one operation.
7. Complete together → cloth idle; show standard actions. Count reflects one committed section.

| Branch | User sees | Result/recovery |
|---|---|---|
| Camera permission denied | Plain explanation with Retry and relevant browser guidance | No scan; existing memories remain accessible |
| Camera unavailable | Retry; photo-input fallback only if supported by implementation | No fake camera feed |
| Slow analysis | Captured frame and honest preparation status | Stay on camera floor until ready |
| Analysis fails | “Couldn't prepare this photo. Try again.” | Clear transient scan and unlock capture, no appended memory |
| Background/resize | Pause/reflow current operation | No second capture or misaligned source dots |
| Reduced motion | Yarn colours and simple preparation states | No travelling scan required |

Success check: a new person can explain that the photo supplies colours, not a literal photographic picture woven into the rug.

## 5. Flow B — Print and travel

1. Prepared data and rendered preview are ready.
2. Commit the new archive entry once.
3. Photo movement, camera travel, rug emergence and stitching sound read the same operation progress.
4. On completion, stop printing sound and movement together; clear temporary photo resources.
5. Cloth idle enables navigation, export and contextual actions.

| Branch | Recovery |
|---|---|
| Slow frame rate | Maintain matched movement; no wall-clock pan arriving before cloth |
| App backgrounded | Pause; resume without jumping independent tracks or accumulating audio |
| Viewport changes | Recalculate positions at the current progress |
| Reduced motion | Show completed committed section directly |
| Save to browser fails | Keep section visible; bottom notice: “This memory couldn't be saved in this browser. You can still download it.” |
| Another tab changed history | Explain conflict; retain in-session work; allow export before a user chooses reload |
| Display fails after commit | Recover/reopen the same section; never append it again |

Persistent warnings must not cover Save or the selected-memory action. Final notice text must distinguish a single failed save from storage being unavailable for the whole session.

## 6. Flow C — Explore another weave

Recommended semantics: accepted variations add a new memory. This is a review decision, not an existing feature.

1. Latest memory has finished printing.
2. Open selected-memory actions → choose **Weave again**.
3. Prepare one bounded alternate using saved yarns and analysis; original cloth remains intact behind the surface.
4. Preview shows the candidate and: “Same colours. Adds a new memory.”
5. Choose:
   - **Try another:** replace the temporary candidate, retaining palette/weights.
   - **Close / Escape / Back:** discard it and return to the original memory.
   - **Add this weave:** disable repeat submission, append once, close preview, print via Flow B.
6. On completion, the new section is selected and the count increases by one. The original stays where it was.

| Branch | Recovery |
|---|---|
| Generation fails | Original remains; “Couldn't make another weave. Try again.” with Retry/Close |
| Rapid Try another | Only the latest task may present a result; release earlier resources |
| Same design produced | Retry a bounded number of seeds; do not loop indefinitely or invent colours |
| Double Add | One commit; no second section |
| Reload before Add | Temporary candidate disappears; original saved history restored |
| Archive tail changed | Invalidate preview; explain conflict, don't overwrite saved cloth |
| Missing analysis in older entry | Weave again unavailable for that entry; Save/navigation still work |
| Local save fails after Add | Current-session section stays visible/exportable with an unsaved notice |

Older entries do not offer Weave again in the first release. No mandatory variant chooser appears after every photo.

## 7. Flow D — Find a memory

1. From cloth idle, activate the selected-memory identifier.
2. Choose **Memories** to open overview.
3. Overview lists derived-rug thumbnail, number and optional name in archive order.
4. Select a memory → close overview and scroll/jump to that section.
5. Save now targets that section. Return to camera remains available through the existing control.

The contextual surface is also the proposed home for Weave again in Stage B. Before the overview ships, it need not contain a dead Memories action.

| Branch | Recovery |
|---|---|
| No memories | Hide entry point; any stale request returns to camera |
| One memory | Show it simply; no empty pagination machinery |
| Many memories | Lazy-load visible thumbnails; no growing stack of renderers |
| Thumbnail fails | Number/name placeholder remains selectable |
| Close | Preserve original scroll position and selection |
| Restore fails | Preserve stored records and explain the issue; no automatic reset |

The exact placement and discoverability of the memory identifier are to be checked in wireframes: do not add an ambiguous unlabeled glyph to an already occupied corner.

## 8. Flow E — Name a memory

1. In overview, open the selected memory's actions → **Rename**.
2. Show one optional field prefilled with the current name; memory number remains visible.
3. Save → persist metadata, update overview and future postcard; weave unchanged.
4. Cancel → leave the previous name unchanged. Blank + Save removes only the custom name.

Errors stay next to the field, preserving typed input. Support 40 user-perceived characters, Unicode/emoji and composition. Escape/cancel does not save. Keyboard must not obscure Save/Cancel on a small phone.

Copy: “Name this memory” / “Optional” / “Save name” / “Cancel”. No default prompt to name every capture.

## 9. Flow F — Save or share

1. From a selected, idle memory, activate existing Save.
2. Open existing postcard surface with “Preparing memory…”. Lock the selected entry for this export.
3. Show completed postcard; enable existing export control.
4. Native file share supported → open share sheet.
5. Otherwise, or on a non-cancellation share error → download route.
6. Close preview → original cloth view and focus restored.

| Branch | Recovery |
|---|---|
| Cancel native share | Return to postcard quietly |
| Export preparation fails | Retry or Close, original memory unchanged |
| Close during preparation | Discard late result and temporary blob; don't reopen |
| Unsupported download context | Explain opening in Safari/Chrome where relevant; no false saved confirmation |
| Storage unavailable | Still export the in-session weave |
| Repeated export taps | Avoid concurrent generation/share sheets |

Do not add icons, controls or export progress labels to the postcard image itself.

## 10. Wireframe brief — next phase, not created yet

After flow review, produce annotated low-fidelity screens in the existing typography/colour system:
1. Current camera baseline and first-use card, with no redesign.
2. Scan → yarn inventory → loom handoff, including slow/failure states.
3. Print at start/middle/end and reduced-motion completion.
4. Latest-memory contextual actions, showing placement against all existing corner controls.
5. Variant preparing/ready/failure and Add-in-progress.
6. Overview: one, many, thumbnail failure and unavailable saved history.
7. Rename: empty, populated, long text, keyboard open and failed save.
8. Postcard preparing/ready/error plus bottom storage warning.

Annotate focus order, touch targets, safe-area offsets, close/back behaviour, busy states, archive commit boundaries and responsive changes. Include small-phone and enlarged-text checks. These are product-flow wireframes, not marketing artwork.

## 11. Owner review checklist

- Does normal capture still feel immediate and uncluttered?
- Does the colour reveal explain the transformation without turning into a colour editor?
- Is adding a variation as a new memory the right behaviour?
- Can contextual actions be found without adding another persistent toolbar?
- Should overview and naming follow later, as proposed?
- Are failure messages clear without interrupting the main experience unnecessarily?

Next gate: review these flows → wireframes → owner wireframe review → implementation breakdown. No app code, new analytics, deployment or visual redesign is included in this planning delivery.
