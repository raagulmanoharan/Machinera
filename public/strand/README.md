# Strand — interactive photo to cloth

Take or choose a photo to colour real woven yarns in a browser-based hanging carpet. Drag the cloth to pull it; release to let it settle. Pinch with two fingers to zoom, or drag beside the cloth to pan. The top edge stays attached to the rail. The wall prevents the fabric passing into the plaster.

Native camera and library inputs share one local processing path. Photo pixels colour the warp and weft directly at up to 4096 pixels on the longest edge, rather than being reduced to dominant palette colours. Replacing a photo reuses the same geometry, light rig and simulation. No photo upload, server render or offline processing job is needed.

## Guide-based renderer

The supplied hyperrealism guide informed the v16 revision. [GUIDE-IMPLEMENTATION.md](GUIDE-IMPLEMENTATION.md) maps its sections to implementation, checks and remaining limits. The original stripe design and proportions are retained; the generated photographic target remains a visual reference, not an exact match claim.

- A fixed-step position-based 25×39 cloth grid drives a shared position/normal deformation field. The surface, yarns, loose fibres, fringe and depth shaders follow that field. A CPU-deformed proxy supplies touch picking and broad moving wall shadows.
- Full view uses a subdivided cloth surface with normal, role/coverage and local AO maps baked at startup from the actual Blender weave tile. Medium view uses reduced instanced yarn geometry. Close-up enables full geometry, nearby fibres and self-shadowing. The surface and yarn LODs never overlap.
- Tile boundaries use matching ply twist phases and endpoint normals, avoiding disconnected yarn ends. Yarn materials combine real three-ply geometry, correlated thickness/dye variation, directional fibre normals, matte roughness variation and dye-tinted sheen. Fringe length and curl vary subtly.
- The photographic rig uses a broad rectangular window light, an aligned directional shadow caster and the bundled real HDR environment. AgX, linear half-float composition, sRGB output and FXAA handle display. AO is local and baked, not a dark full-screen outline filter.
- The room has off-white plaster, a beveled wooden rail, brass pins, wood-grained skirting and oak flooring. Camera rotation remains disabled.

This is a real-time approximation with bounded local dragging, not a full yarn mechanics or self-collision solver. Physical-phone capture and frame rates remain unverified. Full reference-level photorealism has not been demonstrated.

## Run and checks

In the standalone workspace, `npm run dev` serves `public/` at http://localhost:3000. In the Machinera repository, use its existing dev server and open `/strand/`; the entry is `public/strand/index.html`. Live: https://raagulmanoharan.github.io/Machinera/strand/.

`node --test --test-isolation=none public/strand/hanging-physics.test.mjs` (or `public/hanging-physics.test.mjs` in the standalone workspace) checks invariant rail pins, finite bounded stretch, settling and wall collision. Browser checks cover mouse/touch drags, touch pinch, photo replacement, LODs, narrow-screen controls, shader compilation and 4K export. Save refreshes culling and uses full yarn geometry with the live photo and current cloth pose.

## Assets and earlier experiments

`blender/build_textile.py` is the reproducible Blender 4.3 authoring source for the reusable 8×8 three-ply weave tile. The glTF buffer is embedded in `assets/blender-poc/weave-tile.gltf`. The browser applies the v16 material, geometric variation and cloth simulation directly; Blender is not required at runtime. The older `blender-preview.html` contains historical v14 offline Cycles renders and is outside the current photo workflow.

The weave, room geometry and procedural textures are original project assets. Studio fill uses [Poly Haven Studio Small 08](https://polyhaven.com/a/studio_small_08), Sergej Majboroda, CC0; see `assets/studio-license.json`. Three.js 0.170.0 and addons load from unpkg. The earlier 3D camera/printing scene remains separately at `camera.html`; the current entry uses native photo capture and the wall-hanging simulation.
