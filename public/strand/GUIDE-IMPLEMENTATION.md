# Guide implementation and visual review — v16

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
