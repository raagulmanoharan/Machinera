# Strand — dense woven memories
A detailed 3D camera turns a captured moment into a tightly woven digital textile. Capture or photo upload opens a retro-future optical viewfinder; its processed image becomes the dye source for the fabric.

## Fabric
The weave represents 320 warp yarns and 256 weft yarns, with 81,920 over-under crossings. Compressed cotton profiles pack closely together, with small variations in thickness, twisted surface fibers, loose fiber ends, and fringe. At normal viewing distance, a mipmapped woven surface avoids subpixel moiré. Macro inspection switches to individual instanced yarn geometry and draws only the visible region. This is a visual textile simulation, not a physics solver.

Both yarn directions use the full captured image as an sRGB colour-managed dye texture. No dominant-colour clustering, beige warp tint, synthetic band substitution, or palette quantization is applied to the fabric. The optional viewfinder dither affects the captured image when enabled. Studio lighting and shadows affect its rendered appearance.

Pinch or use + / − to zoom up to 12×. Drag to pan when zoomed in; drag to turn the cloth at normal scale. Fit resets the view. Save exports the full fabric and fringe at up to 4096 × 3277 pixels, using detailed geometry irrespective of the current zoom. The camera is omitted from the export. Export dimensions depend on the GPU texture-size limit.

## Optical capture
The viewfinder has focus, aperture, film-grain, lens-character, and ordered colour-dither controls. Helios approximates tangential bokeh and off-axis pupil clipping; Anamorph adds vertical oval bokeh and horizontal highlight streaks; Prism adds radial spectral dispersion. The shader integrates 40 pupil samples in linear light. This is a lens-inspired 2D approximation: RGB camera video supplies no measured depth map, so focus selects a spatial region.

The preview stays at modest display resolution. Capture renders the processed image separately at up to 2048 pixels on its longest edge, bounded by source resolution, instead of enlarging the preview. Uploads retain up to 4096 pixels before optical processing. Camera requests prefer 3840 × 2160, with browser/device fallback. All photo processing stays on-device; images over 40 megapixels are rejected.

## Use
Tap the camera to open capture. Hold it to choose a photo. Use the viewfinder shutter to weave. Keyboard: Enter capture, U upload, Space sample, S save, Escape reset. Screen-reader controls are retained.

Run `npm run dev` and open http://localhost:3000. Live: https://raagulmanoharan.github.io/Machinera/strand/. Phone camera access requires HTTPS.

## Assets and rendering
Poly Haven Camera 01 by Rajil Jose Macatangay is CC0 and bundled with original 1K PBR textures. Provenance and verified checksums are in public/assets/camera-license.json. The strap is hidden and a loom attachment added at runtime.

Three.js 0.170.0 and addons load from unpkg. Lighting uses a studio environment, soft shadows, material occlusion, and a separate screen-space ambient-occlusion pass. Reduced-motion settings shorten the reveal. The cloth renders on interaction rather than continuously while still. Actual phone camera capabilities, colour display, and GPU performance require device testing.
