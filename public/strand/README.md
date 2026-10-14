# Strand — dense woven memories
A detailed 3D camera turns a captured moment into a tightly woven digital textile. Capture or photo upload opens a retro-future optical viewfinder; its processed image becomes the dye source for the fabric.

## Fabric
Choose Plain (1/1), Basket (2/2 grouped strands), Twill (2/2 diagonal), Chevron (point-reversed twill), or Satin (8-end, move 3). One repeatable binary over/under draft drives both the overview normal/occlusion maps and the actual yarn paths used in macro view and export. Long floats remain continuous rather than being drawn as separate coloured squares.

Colour ribbons, the default, are inspired by the flat reed/ribbon samples supplied as a reference. They use 100 warp and 80 weft strands, compressed elliptical sections, fine longitudinal grain and contact shading. Sixteen spatial samples of the captured image supply the ribbon dyes; four-strand bands and offset warp/weft colour sequences create the pattern. This is a deliberate colour-pattern interpretation, not preservation of every source pixel. Saturation is not artificially increased. A colourful photograph produces colourful ribbons; a muted one produces muted ribbons.

Photo cotton preserves the previous full-image approach: 320 warp yarns and 256 weft yarns, 81,920 crossings, twisted fibers, loose ends and fringe. Both directions use the entire captured image as an sRGB colour-managed dye texture without dominant-colour clustering. At normal scale, mipmapped woven maps avoid moiré; macro view switches to individual instanced yarn geometry. Studio lighting changes the rendered appearance. This is a visual textile simulation, not a physics solver.

### Weave study
The [Handweavers’ Guild of Connecticut glossary](https://www.handweaversguildofct.org/ratings-details) distinguishes plain over/under interlacement, diagonal twill, and dispersed satin binding points. [Handweaving.net’s two-thread basket draft](https://www.handweaving.net/draft-detail/14) provides a grouped-strand reference. The [Textile Structure weave index](https://www.textile-structure.com/weaves/) describes 2/2 basket, 2/2 twill, point reversals, and 8-end move-3 satin. The app uses original mathematical drafts consistent with those constructions, not copied commercial patterns. Chevron is a point reversal, not a claim to reproduce every herringbone variant. Cross-stitch overlays and open triaxial lattices in the supplied image are distinct constructions and are not implemented in this five-weave set.

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
