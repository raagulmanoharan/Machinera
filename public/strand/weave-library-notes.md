# Loom draft library

30 single-warp/single-weft recipes: 24 original studies and six generated mirrored drafts. Each records the threading sequence (shaft per end), treadling sequence (treadle per pick), and tie-up (lifted shafts). The resulting binary drawdown generates both the CPU crossing lookup and the GPU bitmask rules. These rules also drive yarn relief and directional self-shadowing.

## Study references

Public catalogue pages and drawdown previews inspected on 16 October 2026:

- [Handweaving.net archive](https://www.handweaving.net/drafts): distinguishes repeat size, shaft/treadle count, point/straight threading and treadling, and front/back float lengths.
- [Glossary of Weaves Serial 501, ICS Staff, 1905](https://www.handweaving.net/collection-drafts/collection/16/glossary-of-weaves-serial-501-ics-staff?page=0): plain, extended rib/basket and diagonal binding structures. Public examples 12871 (2×2 repeat, single floats), 12982 (2×4 repeat, two-pick floats), 13093 (2×6 repeat, three-pick floats), and 13204 (2×8 repeat, four-pick floats) illustrate how extending the same two-shaft interlacing changes the surface.
- [Twills, Ralph E. Griswold](https://www.handweaving.net/collection-drafts/collection/10/twills?page=0): diagonal progression, altered threading and reversing/pointed derivatives.
- [Satins, Ralph E. Griswold](https://www.handweaving.net/collection-drafts/collection/11/satins?page=0): isolated binding points distributed with a step coprime to the shaft count; five-end step two and eight-end step three.

The app's recipes are original implementations of these structural principles, not imported WIF files or copies of catalogue images. Satin describes the interlacing here; yarn stays matte. Granite is explicitly a study. Supplementary-weft overshot, double cloth, knotted pile, and leno are excluded because the current model does not simulate their additional yarn systems or crossing topology.

## Application behaviour

The automatic photo deck uses the seven compiled drafts with mirrored threading and cyclic floats of at most four yarns; it exhausts those before reshuffling. All 30 drafts are callable explicitly through the [pattern API](./weaving-patterns.md). Adjacent photos never repeat a draft, including across deck boundaries. A finite library will eventually repeat. Each section stores its chosen ID permanently; later photos cannot rerandomise old sections.

Transitions insert two plain binding picks and progressively exchange complete old/new picks. They never interpolate the crossing rules or blur one pattern into another. Palette extraction, natural thread irregularity and cloth interaction remain independent of draft selection.

## Programmatic compiler

`loom-draft.js` constructs twill lift progressions, point threading, grouped basket and rib structures. Mirroring threading produces a symmetric drawdown, rather than merely symmetric colours. Candidate repeats are compiled and checked across cyclic boundaries on both faces. Six new distinct candidates pass the automatic float/width constraints. Recipes are capped at 16×16 to keep row bitmasks exact in the shader. The bounded catalogue is compiled once at module startup, never per frame or per photo.
