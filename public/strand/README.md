# Strand — textile material study
The default page now opens directly on the full-length textile. Camera capture and cloth simulation are paused while lighting, yarn scale and the supplied embroidery reference are studied. The previous camera entry is preserved at `camera.html`.

The study traces nested arch, returning-curve and coil motifs in teal, terracotta, ochre and ivory. Satin-fill bands use tightly spaced individual three-ply yarns; lattice sections remain open. Fine fibres, micro-bump and real yarn shadowing supply surface detail. All yarn plies retain the same dye: there is no contrasting warp tint or brown secondary body. There is no backing cloth or opaque fill sheet; the neutral plane behind the artwork is the studio wall. The brown backing was also removed from the preserved camera fabric generator.

The full portrait uses the reference's 714:1280 proportions. The piece is flat and unfolded, without the hanging loop that shortened its visible length. Individual stitch fills are substantially finer than the previous large yarn grid. Crossing motifs use separated shallow height levels to prevent intersecting fill surfaces. There is no cloth deformation in this material study; dragging pans and pinch/wheel zooms up to 12×.

Lighting uses the bundled CC0 Studio Small 08 HDR environment, neutral fill and a warm upper-left key, against a brighter neutral studio background. The light slider adjusts exposure. Save exports the full textile at 2285×4096 on GPUs supporting 4096 textures. The geometry is an original procedural interpretation traced from the supplied reference, not a photograph used as a flat texture or a claim of an exact scan. Physical-phone frame rates and exact photographic fidelity remain unverified.

Run `npm run dev` and open http://localhost:3000. Live: https://raagulmanoharan.github.io/Machinera/strand/.

## Camera work (paused)
The previous capture, optical viewfinder and attached-cloth experience remains at `camera.html` for returning to it after the material study. Its brown backing has also been removed. The camera is neither loaded nor rendered by the default study entry.

## Assets
Studio lighting uses [Poly Haven Studio Small 08](https://polyhaven.com/a/studio_small_08) by Sergej Majboroda, CC0, bundled as linear-light-downsampled RGBE radiance in studio-environment.js. Provenance and checksum are in assets/studio-license.json. The paused camera uses Poly Haven Camera 01 by Rajil Jose Macatangay, CC0; see assets/camera-license.json. Three.js 0.170.0 and addons load from unpkg. The geometry and fibre bump texture in the study are generated locally in the browser.
