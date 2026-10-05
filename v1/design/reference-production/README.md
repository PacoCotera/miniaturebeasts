# Reference-to-production art workbench

An isolated art-production exercise for the C18 concept direction under refinement. This is
part of the product repository; it does not replace the live renderer or create a
second visual authority. Editable sources, deterministic exports and native-size
proofs belong here. The scope is editable product artwork, exports and visual proofs.

Reference: [C18 concept](../game-art-proposals/35-vault-composition/18-c-refined.png)
and its [clean inspection crop](../game-art-proposals/37-lab-extracted-kit/screen-reference.png).
The [screen standard](../screen-design-standard.md) governs visual meaning.

The exercise covers frame/header components, quiet and focused navigation treatment,
Data card / Energy crystal / Essence resource family, applied in one 1024×600
Overview composition. Lab-wide information and console semantics are retained;
the rejected text-heavy card layout is replaced by four illustrated status anchors.
No facts, resources or specimen knowledge may be implied by decorative art.

Output is an **offline art proof**, not a native runtime export or deployed UI.
The current family contains 15 editable SVG masters and their RGBA exports;
12 are used in the proof and three useful prior variants are retained separately.
Inspect the [native asset sheet](exports/sheet-native.png),
[empty Overview](exports/overview-offline.png) and
[populated Overview](exports/overview-populated.png), both 1024×600.
The pair passes a bounded information/layout check but does **not** pass the
approved reference's material-craft standard. Keep these as experimental sources;
they are not approved native art masters.

The [Gemini Research sprite trial](gemini-research-trial/README.md) preserves two
actual browser-generated PNGs and intended-size comparisons. Browser acquisition
works; neither concept is accepted as the Research master. It does not change
the live renderer or the approved reference.

The subsequent [coherent Gemini destination family](gemini-overview-family/README.md)
supplies Explore, Research, Incubator and Habitat to the native Overview candidate.
It preserves generated material character through explicit crop preparation;
the original local SVG family remains useful unfinished source.

## Production command

The editable masters are `src/*.svg`, authored directly at their intended draw
dimensions. `build.cjs` reads them without modifying them, rasterizes with Sharp,
and composes the proof and sheets from the resulting PNGs. The manifest records
each source/export hash, native dimensions, alpha contract and occupied bounds
measured at half alpha. Current resource masters are 56×68. The four topic masters
are 136×144; their visible silhouettes have different widths to balance unlike
forms, rather than assuming equal canvases establish equal optical weight. The
topic illustrations identify destinations, not owned items or current activity.
The retained 80×80 capsule and two prior status frames appear separately on the
sheet; this composition does not consume those earlier variants.

| Placement | Native footprint / anchor |
| --- | --- |
| Screen perimeter and inter-panel gutter | 24px outer inset; 16px gutter |
| Header | 976×100 at 24,24; resource starts 404/602/800,40 |
| Navigation | 208×416 at 24,140; 184×60 row masters |
| Shared read-only field | 752×416 at 248,140; 24px title/field inset |
| Explore / Research art | 136×144 at 272,213 / 642,207 |
| Incubator / Habitat art | 136×144 at 272,377 / 642,377 |
| Topic text | x422 / x790; actual ink groups centered at y283 / y447 |

The measured visible topic bounds are 108×114 (Explore), 114×110 (Research),
98×112 (Incubator), and 108×110 (Habitat). Header resource bounds are 45×62 (Data),
48×63 (Energy), and 49×54 (Essence). They are authored at those sizes; no bitmap
rescaling is used in the proof. The next-unit line is subordinate 14px type with
its nominal baseline at 104, clear of the header's bottom contour.

Topic masters use deliberately authored 2px contour and reflection clusters with
upper-left lighting. This is a production choice, not a claimed source grid for
the compressed C18 reference. The inspection lens contains no specimen; the habitat
niche contains no resident. Their identity remains unchanged between fixtures.
Type roles are 22px brand, 28px context title, 20px navigation, 18px topic labels,
22px main readouts and 16px supporting facts. Readout blocks are placed using their
rendered ink height, rather than giving unlike text blocks identical top anchors.

`fixtures.json` supplies both compositions. It records the existing populated
native capture and its hash, with two samples, five findings and one revealed
resident. Its raw stock1240/840/1240 uses the current `stock_amount` conversion:
12/8/12 whole units, each40% toward the next unit. No running expedition or
incubation is implied. The manifest hashes this fixture source alongside the art.

With Node.js and Sharp available, run from this directory:

```sh
node build.cjs
```

No package installation is part of this exercise. Text loads the repository's
licensed `native/shared/fonts/Vera.ttf` and `VeraBd.ttf` explicitly. This preserves
the existing font family; the reference's exact type identity remains unresolved.
Some hosts report an unwritable fontconfig cache; rendering still uses the explicit
font files. The art PNGs themselves contain no type or live game facts.

Inspect `exports/sheet-native.png` at1×, `exports/sheet-3x.png` at its labeled
nearest-neighbor3×, and both `exports/overview-offline.png` (empty) and
`exports/overview-populated.png` at1024×600. Both compositions retain
five navigation choices, four read-only status regions and whole supply counts;
only the Overview row is focused. It is an offline composition, not runtime or
physical-display evidence. No screenshot matting or large-image downsampling is
used to construct the masters.

## Findings and reproduction evidence

The [reference comparison](reference-analysis.md) records the exact reviewed pair
and remaining craft failures at the recorded source/export hashes.
Research now reads separately from Data, and the four icon/readout groups use
consistent optical alignment. The exported pair retains navigation meaning, supported counts and margins. The populated Explore hint
could be more state-aware: it still says “Bring a sample home” with two retained
samples. No active expedition or incubation is claimed.

The pair falls short of native-master readiness: thick stepped perimeters
surround small busy interiors, with insufficient modeled depth and saturated
character relative to C18. A layout/meaning pass does not override that verdict.
Before propagating this approach, prove one destination sprite beside the reference
at its intended displayed size. No further revision or runtime integration is
implied by retaining this experiment.

Run `node verify.cjs` to regenerate once and inspect actual exported files.
[Verification](verification.json) records source/export hashes, real RGBA silhouette
transparency, native dimensions, exact 3× nearest-neighbor enlargement and unchanged
files after regeneration. Pixel-level reproducibility is established on the recorded
tool versions, not promised across every font/raster library version.

The reference's exact type identity remains unresolved; this proof retains the
licensed bundled font. Native integration requires accepted art and actual dynamic
state review. These static compositions establish neither.
