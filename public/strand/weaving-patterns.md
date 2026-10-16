# Callable loom-pattern API

The photo supplies dye lots. A loom recipe supplies shaft threading, treadling and tie-up. Their intersection decides which physical yarn is on top; this same decision drives colour, relief and directional self-shadowing.

## Call from the app

`StrandWeaving` is available in the browser console. It is also an ES module:

```js
import {createWeavePattern, listWeavePatterns, generateLoomDraft}
  from './weaving-patterns.js?v=91';

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

The seed replays the same recipe for the same inputs. The returned `id` identifies the draft and seed; it is not a palette-content cache key. Everything in the returned recipe is frozen. Default selection requires mirrored threading, a repeat dividing 48 ends, and maximum floats of four yarns on either face. The warp colour inventory is mirrored too. Weft quotas use largest remainders; mirrored warp pairs approximate each dye share within two ends. No per-yarn colour randomisation or RGB gradients are used. Individual fibre irregularity remains a separate shading detail.

`listWeavePatterns()` lists the 30 compiled drafts: 24 original recipes and six generated mirrored recipes. The automatic photo workflow shuffles the seven eligible symmetric, short-float recipes without adjacent repetition. An explicit `draftId` can select another compiled study and overrides family/symmetry/float selection filters; the result reports its actual symmetry.

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
