# Strand — interactive photo to cloth

Take or choose a photo to colour real woven yarns in a browser-based hanging carpet. Drag the cloth to pull it; release to let it settle. Pinch with two fingers to zoom, or drag beside the cloth to pan. The top edge stays attached to the rail. The wall prevents the fabric passing into the plaster.

Native camera and library inputs share one local processing path. Photo pixels colour the warp and weft directly at up to 4096 pixels on the longest edge, rather than being reduced to dominant palette colours. Replacing a photo reuses the same geometry, light rig and simulation. No photo upload, server render or offline processing job is needed.

## Guide-based renderer

The supplied hyperrealism guide informed the v16 revision. [GUIDE-IMPLEMENTATION.md](GUIDE-IMPLEMENTATION.md) maps its sections to implementation, checks and remaining limits. The original stripe design and proportions are retained; the generated photographic target remains a visual reference, not an exact match claim.

- A fixed-step position-based 25×39 cloth grid drives a shared position/normal deformation field. The surface, yarns, loose fibres, fringe and depth shaders follow that field. A CPU-deformed proxy supplies touch picking and broad moving wall shadows.
- Full view uses reduced instanced yarn geometry with local AO and directional visibility baked at startup from the actual Blender weave tile. Close-up and export use the full yarn geometry. Both follow the same cloth field; a flat image never replaces the interactive weave.
- Tile boundaries use matching ply twist phases and endpoint normals, avoiding disconnected yarn ends. Yarn materials combine real three-ply geometry, correlated thickness/dye variation, directional fibre normals, matte roughness variation and zero-sheen matte materials. Fringe length and curl vary subtly.
- The photographic rig uses a broad rectangular window light, an aligned directional shadow caster and the bundled real HDR environment. AgX, linear half-float composition, sRGB output and FXAA handle display. AO is local and baked, not a dark full-screen outline filter.
- The room has off-white plaster, a beveled wooden rail, brass pins, wood-grained skirting and oak flooring. Camera rotation remains disabled.

This is a real-time approximation with bounded local dragging, not a full yarn mechanics or self-collision solver. Physical-phone capture and frame rates remain unverified. Full reference-level photorealism has not been demonstrated.

## Run and checks

In the standalone workspace, `npm run dev` serves `public/` at http://localhost:3000. In the Machinera repository, use its existing dev server and open `/strand/`; the entry is `public/strand/index.html`. Live: https://raagulmanoharan.github.io/Machinera/strand/.

`node --test --test-isolation=none public/strand/hanging-physics.test.mjs` (or `public/hanging-physics.test.mjs` in the standalone workspace) checks invariant rail pins, finite bounded stretch, settling and wall collision. Browser checks cover mouse/touch drags, touch pinch, photo replacement, LODs, narrow-screen controls, shader compilation and 4K export. Save refreshes culling and uses full yarn geometry with the live photo and current cloth pose.

## Assets and earlier experiments

`blender/build_textile.py` is the reproducible Blender 4.3 authoring source for the reusable 8×8 three-ply weave tile. The glTF buffer is embedded in `assets/blender-poc/weave-tile.gltf`. The browser applies the v16 material, geometric variation and cloth simulation directly; Blender is not required at runtime. The older `blender-preview.html` contains historical v14 offline Cycles renders and is outside the current photo workflow.

The weave, room geometry and procedural textures are original project assets. Studio fill uses [Poly Haven Studio Small 08](https://polyhaven.com/a/studio_small_08), Sergej Majboroda, CC0; see `assets/studio-license.json`. Three.js 0.170.0 and addons load from unpkg. The earlier 3D camera/printing scene remains separately at `camera.html`; the current entry uses native photo capture and the wall-hanging simulation.

## Soft window light revision (v25)

Window panes now add bright, softly diffused diagonal illumination instead of dark grey bands. The projector angle was calibrated against its wall-space projection; warm upper-wall bounce, HDR fill and a separate soft floor pool keep the room readable without raising exposure. The live deformed cloth still casts real moving shadows. Yarn receives a restrained share of the projected pane light to avoid bleached dye.

The cloth uses 80×120 close-packed crossings, widened laterally while preserving its thin depth. This closes bright background pinholes without adding a backing sheet. Default colour bands remain independent of tile count; uploaded photos still supply pixel colours locally. Fine material normal/roughness maps, flyaways rooted on actual yarn triangles, three-ply cotton fringe and raised jute cords add surface detail. The foreground reuses the authored yarn geometry over a verified CC0 [Poly Haven Hessian 230](https://polyhaven.com/a/hessian_230) surface (Colormass / Rico Cilliers). Source URLs and checksums are in the material manifest.

Sixteen local screenshots/variants informed a two-agent comparison/critique loop. The result improves positive daylight and opaque weave coverage, but does **not** match the supplied reference pixel for pixel. Yarn regularity, fringe and foreground braids remain visible differences. Added foreground/fringe geometry offsets some yarn savings; measured phone frame rates are still unverified.

## Diffused daylight and interaction revision (v26)

The left-side illumination now uses overlapping, gently curved Gaussian pools instead of straight window strips. Brightness changes blend across the wall and floor without crisp edges.

The 25×39 simulation and seven constraint iterations remain unchanged. Packed constraint data and a scalar inner loop reduce local solver time from about 2.28ms to .96ms per step; a 900-step comparison reproduced the previous positions exactly. Static yarn instance buffers upload only when visibility changes. Conservative bounds and cached picking indices avoid repeated mesh bookkeeping. Shadow-only strand envelopes replace sub-texel fringe plies in the shadow maps; the visible high-detail fringe and yarn meshes remain intact.

Interaction resets its idle clock, suppresses tap impulses during drags/pinch/cancellation, scales pull distance in close-ups, and adds hysteresis around the detailed-yarn threshold. Local browser checks measured about 14.3ms→7.9ms CPU frame submission and 2.73M→2.50M triangles during the same grab scenario. These software-browser measurements are not physical-phone FPS. Photo colouring, zoom and export retain their original resolution.

## Scanned surface relief (v27)

The wood floor, wooden rail/skirting, yarns and fringe now combine their existing normal maps with verified CC0 scanned height maps. A fragment bump layer adds fine relief over the tangent-space normals; it does not displace vertices or change the simulation. Wood grain uses physical UV scale instead of stretching a narrow texture strip across the rail and skirting. Normal strengths are calibrated for the shallow scanned wood maps. Textile dye still comes exclusively from the photo.

## Fibre and visibility refinement (v28)

Yarn relief now blends the scanned surface at a finer physical scale with derivative-filtered longitudinal microfibres. Fine flyaway strands have softly fading tips and restrained upper-left lighting variation, preserving their photo-derived dye. The main cloth, scanned surface relief, shadow rig and physics remain unchanged. Static raised floor-cord tiles are culled against conservatively transformed geometry bounds, keeping the same detailed mesh wherever it is visible. The canvas no longer preserves its drawing buffer between frames; export renders immediately before capturing the PNG.

## Soft daylight and wood cavities (v29)

Static room surfaces use a world-anchored, baked-style illumination field with broad Gaussian daylight streaks. It multiplies existing shaded radiance, preserving the moving cloth's shadow rather than placing an overlay above it. This is an art-directed approximation, not volumetric ray tracing or a Blender lightmap. The projector is retargeted with a lower energy and higher-contrast soft cookie. Wood now includes height-derived cavity shading over its scanned normal/bump detail, with less environment fill and calibrated roughness. No additional meshes, texture requests, shadow maps or full-screen passes are added; photo dye and cloth physics are unchanged.

## Sustained interaction safeguards (v30)

Rendering now polls a WebGL sync fence without blocking and submits a new interactive frame only after the previous frame has completed. It caps drawing at 60 fps to avoid excess sustained work on high-refresh screens, pauses while hidden, and resets its frame clock on return. Cloth simulation, geometry, materials, textures, shadows and export resolution are unchanged. Lost touch capture, tab hiding and window blur now clear gesture state so later touches cannot inherit a stale pinch.

Validation: three repeated five-frame tugs in a software-rendered browser retained 22 geometries, 37 textures and 17 shader programs in both baseline and candidate; no progressive resource growth or GPU queue buildup reproduced in that scenario. Eight CPU-only repeated tugs settled in 3.58–3.64 seconds each. These checks do not establish physical-phone thermal behavior or prove the reported progressive slowdown resolved. Gate lifecycle/fallback tests, cloth tests and lost-capture gesture recovery pass.

## Three-agent lag audit and scheduler correction (v31)

Independent GPU, cloth/input and sustained-use reviews identified excessive per-frame GPU workload and a v30 pacing regression. The single-in-flight GPU fence is removed: polling it only at RAF boundaries can delay both physics and presentation an extra refresh. A deadline-accumulating 60fps pacer replaces the prior elapsed-time cap; deterministic tests retain 60fps average on 60/90/120/144Hz schedules (the old cap produced 45fps at 90Hz and 48fps at 144Hz).

A front-face-only yarn trial exposed gaps in close-up comparisons and was rejected; double-sided yarns and their prior shadow rendering remain intact. Moving shadows are refreshed only when displayed deformation accumulates more than .25mm per coordinate from the last shadow snapshot, or caster membership changes. A 376-frame solver/display replay reduced refreshes from 376 to 335 (10.9%), all savings in the settling tail; active dragging still refreshes every frame. No visual geometry or texture resolution is reduced.

The local short-run resource counts show no growing leak, and desktop physics steps take about .964ms. These findings do not establish phone GPU timings or thermal behavior; the scene still submits millions of yarn triangles and uses two live shadow maps. Software-browser CPU timings and a 15-frame replay are not sustained mobile FPS evidence. v30's GPU gate is retained as an unused module/test for history, not imported by the app.
