# Callable loom-pattern API

The photo supplies dye lots. A loom recipe supplies shaft threading, treadling and tie-up. Their intersection decides which physical yarn is on top; this same decision drives colour, relief and directional self-shadowing.

## Call from the app

`StrandWeaving` is available in the browser console. It is also an ES module:

```js
import {createWeavePattern, listWeavePatterns, generateLoomDraft}
  from './weaving-patterns.js?v=95';

const pattern = createWeavePattern({
  seed: 240731,
  family: 'basket', // omit to choose among all eligible families
  palette: [
    {rgb: [27, 75, 72], share: 0.6},
    {rgb: [202, 177, 125], share: 0.3},
    {rgb: [157, 66, 40], share: 0.1}
  ],
  warpEnds: 48,
  weftPicks: 120
});
pattern.draft.threading;
pattern.draft.treadling;
pattern.draft.tieUp;
pattern.warp.sequence;       // indices into pattern.palette
pattern.weft.sequence;
pattern.crossing(12, 8);     // true: warp above weft
pattern.yarnAt(12, 8);       // RGB of the visible dyed yarn
```

The seed replays the same recipe for the same inputs. The returned `id` identifies the draft and seed; it is not a palette-content cache key. Everything in the returned recipe is frozen. Default selection requires mirrored threading, a repeat dividing 48 ends, and maximum floats of seven yarns on either face. The warp colour inventory is mirrored too. Shared-system designs use largest-remainder quotas; mirrored pairs approximate dye shares within two yarns. Geometric designs split the palette between contrasting warp/weft systems, preserving the combined dye shares across the two equally weighted systems. No per-yarn colour randomisation or RGB gradients are used. Individual fibre irregularity remains a separate shading detail.

`listWeavePatterns()` lists the 41 compiled drafts: 24 original recipes, six generated mirrored recipes and eleven geometric lift plans. The automatic photo workflow shuffles the 18 eligible symmetric recipes without adjacent repetition. An explicit `draftId` can select another compiled study and overrides family/symmetry/float selection filters; the result reports its actual symmetry.

## Generate and validate a draft

```js
const draft = generateLoomDraft({
  family: 'twill', shafts: 3, over: 1, symmetry: true
});
```

Generators support twill, point twill, basket and rib. Basket/rib accept `block: 1..3`; twills accept lifted-shaft counts. `compileLoomDraft` also accepts explicit threading, treadling and tie-up matrices. The compiler rejects unbound ends/picks, malformed shaft assignments, repeats beyond 16×16 and cyclic floats longer than seven yarns. The automatic catalogue additionally rejects floats above four and widths that do not divide the 48-end carpet.

A generated draft is a data recipe, not automatically a GPU registration. Rendering uses the bounded compiled catalogue to avoid runtime shader rebuilds or growing shader complexity as photos accumulate. Add approved recipes to that catalogue during development. CPU and GPU crossing rules are generated from the same drawdown bits.

## Sources and limits

See [weave-library-notes.md](./weave-library-notes.md) for public Handweaving.net study references. These algorithms implement structural principles, not downloaded subscription drafts. No claim is made to reproduce a named cultural carpet solely through a twill or basket interlacing. Pile knotting, double cloth, leno and supplementary-weft structures need additional yarn systems and are not simulated here.

## Composition symmetry

`createWeavePattern` accepts `symmetry: 'warp' | 'weft' | 'both' | 'radial' | 'auto'`. Warp means left/right colour mirroring, weft means top/bottom, both mirrors both yarn inventories, and radial builds a centred medallion with 180-degree rotational colour composition. The long rectangular strip is not a circular rug or a 90-degree rotational weave. Underlying twill binding and directional lighting can remain directional; `colourSymmetry` reports the composition separately from structural symmetry.

The photo workflow now chooses a seeded composition mode automatically. The selected mode and counted yarn sequences are locked in the archive. Mirroring either yarn inventory uses paired quotas with less than two yarns of error per dye, without changing the source palette.

Automatic composition always retains left/right colour symmetry and mirrored structural threading. It may add top/bottom mirroring or a centred medallion; top/bottom-only plans remain an explicit API option. Warp colour bands use one broad half-plan reflected around the centre, instead of repeating small blocks across the width.

## Geometric block motifs and source colours

`geometric-drafts.js` generates eleven distinct 16-shaft lift plans: diamond rings, stepped crosses, nested squares, diamond eyes, hourglasses, stepped chevrons, four-petal forms, window grids, cross medallions, diamond lattices and corner diamonds. A mandatory binding lattice limits cyclic floats to six yarns or fewer. These are independently generated single-layer structures, not printed reference images. The compiler now accepts up to 16 shafts, while repeats remain within 16×16 and CPU/GPU bitmask precision.

Geometric plans use complementary dye allocations: each source colour's combined share across both systems is preserved, with mirrored integer rounding, while warp and weft contrast enough to reveal the lift pattern. This avoids placing the same dominant dye on both systems everywhere. The photograph still supplies every dye colour. Studio lights are neutral white and the renderer uses neutral tone mapping. Near-hue shade merging is conservative; empty/transparent images fail explicitly instead of producing a brown default.

## Contrast-aware yarn planning

`yarn-contrast.js` uses OKLab lightness and chromatic separation to score neighbouring dyes, and scores candidate warp/weft inventory splits by their expected crossing contrast. Only up to five source dyes are considered, so exhaustive evaluation is bounded. Weights and RGB dyes stay unchanged. Randomness remains in the shuffled structural draft deck and seeded whole-layout choices. Mirrored layouts put the dominant system dye at the centre; accent bands are paired away from the centre.

The active extraction modules are `photo-colours.js` and `photo-colours-worker.js`. Sorted image-gradient strands, legacy palette painting, retired room/collision/tear-off prototypes and their tests are removed. Camera capture, the two-floor transition, scrolling and interactive cloth remain in the current dependency graph.
