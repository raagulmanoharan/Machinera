# Strand

Tap the viewfinder to turn a photo into an interactive, continuous woven carpet. Every decoded pixel contributes to weighted, perceptually distinct dye lots. No photo is uploaded.

The core path is:

1. `photo-colours.js` and its worker scan every source pixel.
2. `yarn-palette.js` merges similar colours and preserves their weights.
3. `yarn-contrast.js` arranges and splits dyed yarn inventories for contrast.
4. `weaving-patterns.js` creates immutable, seeded loom plans from the randomly shuffled draft library.
5. `rug-archive.js` locks each print; `stream-yarn.js` renders the actual crossing yarns.

Camera capture, animation/audio, cloth dragging, native history scrolling and matte lighting use the active runtime modules. See [weaving-patterns.md](./weaving-patterns.md) for the callable API.

Run locally from this folder with `python3 -m http.server 3000`. Run retained checks with `node --test *.test.mjs`.
