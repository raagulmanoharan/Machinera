# Textile studies and implementation

This app renders procedural interpretations, not reproductions or certified traditional textiles. A weave structure (warp/weft interlacing) is distinct from a regional design vocabulary. These are woven yarns, not knitted loops.

## Sources

- **Bhavani Jamakkalam, Erode:** [Erode District: rural hand crafts](https://erode.nic.in/rural-handy-crafts-tourism/). Cotton handloom rugs; the district records GI registration in 2005. The app uses dense matte yarns and broad palette bands as its Bhavani-inspired starting point.
- **Kharad, Kachchh:** [Khamir: Kharad weaving](https://www.khamir.org/crafts/kharad-weaving). Historically camel/goat hair, coarse yarn and bold geometric desert-inspired designs. This informs the stepped/chevron design study. The app's twill ground is an artistic interpretation, not a claim that Kharad is twill.
- **Bhujodi / Kachchh:** [Khamir: Kachchh weaving](https://www.khamir.org/crafts/kachchh-weaving). Supplementary-weft motifs and community-specific design vocabulary. This informs small accent placement; the procedural basket/check option is a stylized study, not an authentic Bhujodi construction or named community motif.
- **Kilim:** [Kilim overview](https://en.wikipedia.org/wiki/Kilim), secondary reference. Weft-faced flatweave, often discontinuous coloured wefts with stepped geometry. This is a useful distinction from pile/knit/twill, not a label for the app's twill geometry.

## Four controls / drafts

1. Plain alternating interlacing with broad bands; Bhavani-inspired colour rhythm.
2. 2/2 twill with chevron palette placement; Kharad-inspired geometric design study.
3. 2×2 basket with small check/accent placement; Bhujodi-inspired accent study.
4. Diamond twill with reversing diagonal ribs and diamond palette placement; a structural option without a regional authenticity claim.

Every photo section keeps its chosen draft and source-pixel metadata. New choices do not change old sections. Colour and yarn-profile transitions occupy 0.42m at each join while maintaining warp pitch. The continuous profile blend is a visual approximation, not a yarn-topology/loom simulation.

## Pixels and detail

All pixels in the decoded original file or captured video frame are scanned at their native dimensions in bounded 256×256 tiles. No preview crop, image resize or pixel stride enters colour analysis. Alpha weights RGB contributions. A 32,768-bin weighted colour distribution is compressed into 1,024 proportional colour strands; this is not a claim to render a separate physical thread for each source pixel. Source/processed counts are retained with each section. Preview styling never modifies source colours.

Six-sided yarn tubes, five path samples per crossing, per-section over/under profiles and filtered ply micro-bump restore close detail while keeping the matte material. The fixed cloth grid uses local springs with four bounded distance-constraint passes and a free lower hem. Wall/floor bounds remain; no self-collision/pile solver was reintroduced.

## Material lock correction (v66)

Each section now bakes its colour motif into immutable RGB pixels and stores its crossing recipe once. All rendering uses a permanent material coordinate measured from the first rug's hem. New prints move the fabric through the room without rephasing existing motifs, ply twist or grain. The live atlas uses a shared absolute pick grid aligned through six mip levels; scrolling its cache window cannot change an existing pick. Older section bytes are regression-tested after further photos. New-section transition bands sample the already baked preceding edge, leaving the preceding section untouched.

Raised yarn paths now have five curve samples per crossing (41 rings per eight-crossing tile); the earlier 21-ring path only had 2.5 despite its comment. Ply bump was previously filtered out at ordinary view distance because its twist frequency was too high. The restored lower-frequency ply detail remains matte.

Drag targets now act locally against a softer resting spring, with corrected post-constraint velocities and a damped release. The free hem, wall/floor bounds and near-inextensible distance constraints remain. This is still bounded, guided cloth physics rather than a yarn-level material solver.

## Pick-by-pick transition (v67)

A join now selects one complete over/under draft per physical weft pick. Different structures begin with two plain binding picks, then use an ordered sequence of complete old/new picks before continuing in the new draft. Colours choose an old or a new yarn source per pick; no RGB crossfade or fractional draft blend is baked into the transition. The same-draft case changes yarn colours without inventing a binding structure.

Raised yarn vertices calculate the exact crossing sign at consecutive pick centres, then curve the continuous yarn between those crossings. Weft crossings use the complementary sign. This is a structural change in interlacing, not interpolation between two material profiles. Screen-space filtering at subpixel edges remains for antialiasing. Historical baked sections remain unchanged.

## Rounded playback and cotton surface (v68)

Playback previously shaded a sinusoidal grid with screen-dependent height derivatives. Replace that with elliptical yarn sections, complementary crossing heights and analytical normals driven by the archived discrete draft. A reused CC0 Poly Haven wool normal adds filtered fibre breakup; the live geometry also receives this normal and slight periodic radius variation without adding vertices. Both remain matte. Playback stays a single on-demand pass rather than running the full room renderer.

Remove the broad checkerboard colour-source offsets for newly baked basket sections and greatly reduce offsets for twill drafts. Their structural crossings remain distinct. Existing baked colours/drafts are never regenerated. This restores rounded detail but does not claim microscopic fibres or a pixel-perfect photographic match.
