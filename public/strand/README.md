# Strand — Blender textile room proof of concept

The default page is a hanging, striped cotton carpet on warm lime plaster, with a limestone floor, oak rail, skirting and small brass fixings. A centred, straight-on portrait camera views the hanging carpet. Upper-left directional sunlight and a broad window-like source with physical distance falloff supply the main illumination, with variance-filtered soft shadows, screen-space ambient occlusion at millimetre-to-centimetre scales and a Z-up-aligned studio HDR environment. Weak hemisphere bounce keeps cavities readable. Camera capture and cloth simulation remain paused while material quality is evaluated.

## Blender source and rendering

`blender/build_textile.py` authors a reusable 8×8 plain-weave tile. Both warp and weft contain three geometrically twisted plies, actual alternating over-under crossings and UVs following the yarn surface. Blender materials add fine directional fibre grooves, matte roughness and cotton sheen. The full room uses linked tile meshes and fine loose fibre curves.

Run with Blender 4.3+: `blender -b -t 5 --python blender/build_textile.py`. The script currently writes into `/workspace`; change `OUT` and the `.blend` save path for another workspace. It decodes the bundled CC0 HDR from `studio-environment.js` and packs it into the Blender scene. It produces the editable scene, a self-contained glTF weave tile and two 96-sample Cycles renders. The installed Blender build lacks OpenImageDenoise, so denoising is disabled.

## Browser proof of concept

Three.js loads the actual Blender-exported tile, using two instanced yarn meshes and per-instance stripe dyes. The distant view uses a reduced mesh derived from the exported topology; close-ups use the full authored geometry, with offscreen tiles culled. Fine fibres and fringe remain separate geometry. Directional fibre bump and plaster maps are generated in the browser; Blender's procedural shader nodes are not exported by glTF. The browser is a real-time approximation of the Cycles scene, not an identical path-traced render.

Drag to pan; pinch/wheel or the +/− controls to inspect. Rotation is disabled. Fit returns to the full hanging carpet. The light control adjusts exposure. Save refreshes visibility and uses full Blender yarn geometry for the current room view at up to 4096 pixels high, subject to GPU limits. Rendering runs on interaction, and stationary shadow maps are cached. The browser uses a linear half-float postprocessing chain with AO before tone mapping and FXAA after output conversion. Physical-phone frame rates and final photorealistic fidelity remain unverified.

`blender-preview.html` presents the offline room and yarn-detail renders for comparison and clearly labels them as offline Cycles output. `assets/blender-poc/provenance.json` records geometry hashes and checks.

Run `npm run dev` and open http://localhost:3000. Live: https://raagulmanoharan.github.io/Machinera/strand/.

## Camera work (paused)

The earlier capture, optical viewfinder and attached-cloth experience remains at `camera.html`. The default entry does not load the camera or run cloth simulation. No server rendering service or paid infrastructure has been deployed.

## Assets

The Blender weave, room geometry and procedural textures are original assets authored for this project. No image-generation service or extracted reference photograph is used. Studio fill uses [Poly Haven Studio Small 08](https://polyhaven.com/a/studio_small_08) by Sergej Majboroda, CC0, bundled in `studio-environment.js`; see `assets/studio-license.json`. The paused camera uses Poly Haven Camera 01 by Rajil Jose Macatangay, CC0; see `assets/camera-license.json`. Three.js 0.170.0 and addons load from unpkg.
