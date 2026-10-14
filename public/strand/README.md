# Strand — camera only
The page shows only a detailed 3D camera and, after capture, the woven fabric. There are no visible menus, headings, controls, or chrome. Brief notices appear only for errors.

Tap the camera to open live capture; tap again to photograph and weave. Hold the camera to choose a photo. Drag the camera or finished cloth to turn it. Pinch (or scroll) to inspect the yarns closely. Hold or double-tap the finished cloth to save a PNG. Double-tap the camera after weaving to start again. Keyboard: Enter capture, U upload, Space sample reveal, S save, Escape reset. Screen-reader controls are retained invisibly.

The camera is Poly Haven's Camera 01 by Rajil Jose Macatangay, CC0. Its original geometry and 1K base colour, normal, roughness, metalness, and ambient-occlusion textures are bundled in public/assets/camera.gltf. Provenance and verified source checksums are in camera-license.json. The strap is hidden and a loom attachment added at runtime.

Fabric consists of individual tubular warp and weft yarns, alternating over/under crossings, micro-bump fiber texture, loose fibers, and fringe. A moving shuttle inserts each row in alternate directions; a reed beats it into place as existing cloth feeds out of the slot. Lighting uses a studio environment, soft shadow maps, material AO maps on the camera, and a separate screen-space ambient-occlusion pass. This is a real-time visual weaving simulation, not a physics-accurate textile solver.

Every decoded source pixel contributes to spatial colour bins used for the textile; no dominant-colour clustering is used. Photos stay on-device. Images over 40 megapixels are rejected. Phone camera access requires HTTPS.

Run npm run dev, then open http://localhost:3000. Live: https://raagulmanoharan.github.io/Machinera/strand/.

Three.js and addons are pinned to 0.170.0 and load from unpkg. Reduced-motion settings shorten the printing sequence and stop ambient movement. Actual phone GPU performance and physical camera access still require device testing.

## Memory optics viewfinder
Capture and photo upload open an inset-glass, machined-housing viewfinder with an LCD readout and thumbwheel controls. Tap the glass to choose a focus region. Focus changes the field of defocus; Iris changes aperture size and circular-to-six-blade pupil shape; Grain changes film noise. Helios approximates off-axis pupil clipping and tangentially oriented bokeh, Anamorph stretches the pupil and bright-highlight streaks, and Prism adds radial spectral dispersion. Dither enables ordered colour quantization.

The shader integrates 40 pupil samples in linear light, then encodes sRGB for display. This is a lens-inspired 2D optical approximation: single-camera RGB has no measured depth map, so the selected focus region is spatial rather than true scene-depth focus. Processed capture uses the viewfinder's cropped, rendered image, not the original unfiltered feed, and is limited to its display resolution (up to 480px wide). Uploaded images are resized to at most 1600px before optical processing. Only the rendered photo determines the weave.
