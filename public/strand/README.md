# Strand — textile material study
The default page now opens directly on the full-length textile. Camera capture and cloth simulation are paused while lighting, yarn scale and the supplied embroidery reference are studied. The previous camera entry is preserved at `camera.html`.

The study uses an original striped Jamakkalam-inspired weft-faced plain weave, rather than copying the reference motifs. Fine teal warp alternates over and under closely packed terracotta, teal, ochre and ivory weft. Each yarn contains three geometrically twisted plies, with fine flyaway fibres and a micro-bump material. There is no backing cloth or opaque fill sheet; the neutral plane behind the textile is the studio wall.

The flat textile has a 1:1.55 aspect ratio and thin loose warp ends. Camera and cloth deformation remain paused; dragging pans and pinch/wheel zooms up to 12×. The weave and its shadows are real geometry, not a photograph pasted on a plane.

A warm upper-left directional key supplies the main illumination, with weak HDR and hemisphere fill. The light slider adjusts exposure. Save exports the full textile at approximately 2643×4096 on GPUs supporting 4096 textures. Physical-phone performance and photographic fidelity remain unverified; this procedural material is not an exact reconstruction of the reference.

Run `npm run dev` and open http://localhost:3000. Live: https://raagulmanoharan.github.io/Machinera/strand/.

## Camera work (paused)
The previous capture, optical viewfinder and attached-cloth experience remains at `camera.html` for returning to it after the material study. Its brown backing has also been removed. The camera is neither loaded nor rendered by the default study entry.

## Assets
Studio lighting uses [Poly Haven Studio Small 08](https://polyhaven.com/a/studio_small_08) by Sergej Majboroda, CC0, bundled as linear-light-downsampled RGBE radiance in studio-environment.js. Provenance and checksum are in assets/studio-license.json. The paused camera uses Poly Haven Camera 01 by Rajil Jose Macatangay, CC0; see assets/camera-license.json. Three.js 0.170.0 and addons load from unpkg. The geometry and fibre bump texture in the study are generated locally in the browser.
