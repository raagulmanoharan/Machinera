# Textile implementation and visual review

The audit below records v16. Later changes, including the v22 lighting comparison, are documented in the addendum at the end.

The supplied 15-page Textile WebGL Hyperrealism Guide was read in full. Plate A is the source of truth for proportions, stripe ordering and palette. Plate B is the reference for lighting, tactile material, small imperfections and photographic presentation. Its generated image is not used as a texture, and the application does not claim a pixel-identical reconstruction.

| Guide section | Implemented change | Evidence / limits |
| --- | --- | --- |
| pp. 2–3: physical scene and camera | Preserve the existing 1.536 × 2.304 m hanging; 25° frontal perspective, wall/floor/rail/fixings as separate geometry. Rest clearance is roughly 4–5 cm. | Source design and dimensions retained. The guide’s 1.2 × 1.7 m values are starting examples, not a reason to resize the original product. |
| pp. 3–5: actual crossing yarns | Reuse the Blender-authored continuous 8×8 warp/weft tile. Compress its depth to about 16 mm overall and keep alternating over/under crossings. Repair ply phase at tile boundaries and average matching endpoint normals so reused yarns meet continuously. Medium and near geometry remain instanced. | Close-up browser checks reveal geometry and parallax. No separate mesh per crossing. |
| pp. 5–6: materials | High, varying roughness; directional fibre normals; dye-tinted cotton sheen; small correlated dye variation; coherent normal-directed yarn thickness variation. | Colour maps are sRGB; normal, roughness and AO maps are non-colour. Photo colour remains live and anchored to undeformed cloth coordinates. |
| pp. 6–7: shape and irregularity | A 25×39-node position-based simulation, pinned top row, structural/shear/bend links, damping, small rest bow and wavy edges. The same position/normal field deforms surface, yarns, fibres, fringe and yarn shadow shaders. | CPU proxy supplies matching hit tests and wall shadows. Wall collision has a margin for yarn thickness; the shader also bounds fringe vertices in front of plaster. This is an approximate cloth solver, not a full textile constitutive or self-collision solver. |
| pp. 7–9: lighting and shadow scales | Broad warm RectAreaLight, aligned directional shadow caster, real Z-up HDR environment and weak neutral bounce. PCF soft filtering avoids close-yarn VSM bleeding. | RectAreaLight does not cast WebGL shadows; the separate aligned directional light is an intentional raster compromise described in the guide. |
| pp. 9–10: room and renderer | Beveled rail/skirting, directional wood colour/roughness/grain, rounded brass pins, oak floor and subtle off-white plaster. AgX, linear half-float composition, sRGB output and FXAA. | Bloom, chromatic aberration, vignette, sharpening, added grain and forced depth of field remain off. |
| pp. 9–11: micro-occlusion and LOD | At load, bake normals, role/coverage and local SSAO from the actual crossing geometry in the browser. Full view uses a subdivided deformed sheet with those maps. Medium zoom uses reduced yarn geometry; close-up uses full yarn geometry and sparse fibres. | No heavy full-screen AO over the room. Micro-AO supplements indirect light. High-detail self-shadows are restricted to stable close-ups. Tile culling follows actual cloth positions. Surface and yarn LODs are mutually exclusive, avoiding intersecting backing layers. |
| p. 11: optional path tracing | Not enabled. | The required photo-to-carpet and touch workflow stays rasterized and immediate. Progressive path tracing remains optional, not a dependency or an untested promised result. |
| pp. 11–13: workflow and QA | Native camera/library inputs, repeated local photo updates, zoom, exposure and browser export retained. One reusable geometry asset; no photo upload or offline render job. | Browser interaction and numeric tests passed; physical-phone frame rate and capture hardware remain unverified. |

## Interaction checks

- Mouse and real touch-pointer drags move the cloth while the top rail stays pinned.
- Release settles; quick taps inject a small local impulse.
- Two fingers zoom/pan; dragging outside the fabric pans the view.
- The wall constrains the cloth centre and visible yarn/fringe shell.
- Photo colour uses rest coordinates, so it follows the cloth rather than sliding in world space.
- Saving immediately after Fit refreshes the visible instance list and uses full-detail yarns.

## Browser measurements

The 390×844 DPR-1 browser scenario submitted 44,706 triangles in 19 calls at full view. A stable close-up submitted about 1.88 million triangles in 20 calls after deformed-position tile culling, including shadow work. These are renderer submission counts from the test environment, not measured phone FPS. Actual-device profiling is still needed.

## Visual limits

The new render has genuine crossings, moving cloth and coherent shadows, but the generated target is still the visual benchmark rather than an achieved exact match. Remaining differences include yarn-level stochastic structure, measured fibre scattering, full indirect transport, self-collision under extreme folding, and the photographic richness of the target’s room. Do not substitute a flat reference image or an offline frame and describe it as interactive rendering.

The earlier `blender-preview.html` page records the v14 offline authoring experiment; it is not a preview of the current v16 live simulation. The current runtime is implemented directly in Three.js and reuses the geometry authored in Blender.


## v22 lighting comparison addendum

Six 720×1280 browser screenshots were iterated against the supplied room reference, with independent subagent critiques between passes. The reference image is not embedded in the app or published as a material.

- Replace the nearly uniform grey room with warm cream plaster, lower isotropic fill, a grazing upper-left key and a calibrated, softly feathered window projector. Two window-frame bands run down and right across the exposed wall; the same lighting reaches the floor.
- Keep the 1K CC0 HDR environment for bounce and reflections. Add high-window bounce and a warm floor pool to avoid lifting every textile colour through global exposure.
- Retain actual PBR cotton/wool maps. Bake periodic yarn-level visibility once from a 3×3 neighbourhood of the real interlacing geometry. This supplements indirect AO with directional recess shadows without adding every yarn to the room shadow map each frame. Close views use real yarn shadow rendering instead of compounding this bake.
- Strengthen the moving cloth-wall contact shadow. Render 192 fine fringe ends, give them real UVs for the wool maps, and project their shadow from the same deformation field. Loose fibres remain visible at full view.
- Adjust portrait framing and the default sample dyes toward the reference. Uploaded photo pixels remain the live dye input; no reference image, painted photograph, or server render replaces the interactive cloth.

The sixth-pass review accepted a clear improvement in room warmth, soft window bands, hanging contact and yarn relief. It did **not** judge the result identical to the reference. The yarn topology remains more regular and smoother, the fringe less organic, and the target's grazing floor light is still stronger. Regional RGB samples were used as rough checks, not as a claim of pixel-perfect lighting reconstruction.

At 720×1280 DPR1 the final initial render submitted about 2.62 million triangles in 25 calls, including shadow work. Earlier 44,706-triangle sheet measurements above describe v16, not the current always-visible yarn geometry. These are headless renderer counts, not physical-phone frame-rate measurements. The periodic yarn visibility and projected contact shadows are real-time approximations, particularly under large folds.


## v23 natural hanging shape

The upper edge now has five load-bearing attachment points with small linen loops. Nodes between them can sag. The initial/rest shape includes unequal widening tension folds, two broad shallow puffs, a gentle asymmetric bow, and a subtly uneven hem; the same field drives yarns, fibres, fringe, hit testing and projected shadows. This is an art-directed rest shape relaxed by the existing position-based solver, not a full stress-derived cloth equilibrium simulation.

Four physics tests cover fixed anchors/settling, wall clearance, smooth grabbing and bounded initial relief. Browser resting/held screenshots and a grab/release check pass without shader errors. The light setup and texture resolution are retained.


## v24 shadows from the waved surface

Replace the projected contact/fringe silhouettes with actual depth shadows from the deformed geometry. The 25×39 cloth interaction mesh now also casts the broad surface shadow; its positions and normals use the same interpolated field as the visible yarns. Both the upper-left key and the projected window light cast shadows, the yarns receive them at every viewing distance, and the maps refresh whenever the displayed pose changes. Close-up yarn shadow casters still supply small-scale detail.

Use radius-filtered PCF maps instead of VSM so receiving yarn meshes do not have to be redrawn into every room shadow pass. Keep the soft kernel, move the key slightly more grazing while balancing its intensity, and retain the HDR/area bounce. This is shadow-mapped real-time cloth shading, not full path-traced contact hardening.

Browser checks verify that 975 caster vertices/normals exactly follow the displayed field (maximum discrepancy zero in the float-texture test) after a roughly 18 cm pull. Resting and held captures show responsive wall/fringe shadows and fold shading, and photo/shader checks pass.


## v25 — positive window illumination and dense yarn coverage

The requested comparator/critic loop reviewed baseline and successive screenshots. Both reviewers rejected a pixel-perfect match claim. Early candidates removed dark stripes but lacked positive illumination; stronger variants washed the cloth. The final approach uses blurred bright panes over black, a calibrated diagonal projection (approximately 1.1 wall-space slope), restrained textile modulation, warm upper-wall bounce and a localized floor pool. Global exposure stays at 1.1. Shadow maps still use the actual shared cloth pose.

A close-up showed that many apparent white glints were wall visible through square weave holes. Lateral yarn coverage was increased from .40/.43 to .50/.53 pitch while ply height compensation .72→.58 preserves depth. The 8×8 reusable Blender topology and periodic end checks remain. Physical crossings are 80×120 over the same 1.536×2.304m cloth; default 18 dye bands are sampled independently, so photos continue to drive every source pixel rather than palette clustering.

Existing CC0 normal/roughness maps use finer textile scale. Fringe is 176 three-ply twisted ends, not a single fuzzy shell. Foreground cords reuse the same authored yarn geometry over a CC0 Hessian 230 substrate; this adds real relief but remains more regular than the reference's braids. Asset URLs, authors, CC0 licence and verified MD5/SHA256 are recorded in the manifest.

At 720×1280 DPR1 the complete initial shadow render is about 2.73M triangles / 46 calls, versus v24 2.60M / 44. Main hanging geometry is lower, but added fringe and foreground offset the savings; this is not a phone-FPS result. Simulation stays fixed-step with interpolated display, eased grabs and sleeping when settled. Browser checks cover live dragging, source-photo colour replacement, macro geometry, 4K export and narrow controls. Remaining gaps: uniformly repeated cotton cells, limited fibre scattering, fringe opacity and the exact plaster/daylight/braid character. Real-time interactivity is preserved; reference-level photorealism is not demonstrated.
