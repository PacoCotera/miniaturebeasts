# T-20261016-63: the Incubator's owed art (AD, 10-16, by hand in code)

The pod is the player's own and the subject of the Incubator, so it is drawn at its size, not upscaled. The just-cleared card is the reveal the player comes back for, so it shows the trait as a picture. The style is `design/art-direction.md` ("Pods come from one renderer with species parameters") and `design/style-guide/README.md`, nothing added. No paid call.

## 1. The pod class at 224 × 272: class key `incubator`
For `pods.json classes.pod`: `"incubator": [224, 272]` (the build adds it).

`make-pod-incubator.py` runs Pods' own builder (`tools/build.py pods()`) for this one box. It reduces the signed pod painting (the 1328 × 1472 crop) with Lanczos, never enlarging, exactly as every other class is made; no other class is touched.
- **Check:** the same call rebuilds all 13 signed `large` layers byte for byte, and the band rebuilds the signed `pod-large-band` with 0 px differing.

**Layers (14):**
- `pod-incubator-band`, `pod-incubator-crack`, `pod-incubator-mask-accent`, `pod-incubator-mask-body`, `pod-incubator-pattern-bands`, `pod-incubator-pattern-dots`, `pod-incubator-pattern-plates`, `pod-incubator-pattern-plates-relief`, `pod-incubator-pattern-ribs`, `pod-incubator-pattern-segments`, `pod-incubator-pattern-segments-relief`, `pod-incubator-pattern-stripes`, `pod-incubator-shade`, `pod-incubator-shadow`
- `pod-incubator-shadow` keeps the builder's Pods-position rect; the Incubator places it by its own spec.
- The flat `identified`, `sealed` and `unknown` sprites are not made: the renderer does not use them (`podFromLayers`), and a bud always has its species.

**The light overlays:** `incubator-shell-*` (T-20261016-62) are re-cut on this class's own silhouette and seams (`incubator-b/make-shell-light.py … incubator`), so they fit it exactly. The silhouette is now the `shade` layer's alpha (the renderer's), not the `identified` sprite's.

**T-62's five measures, re-taken on these shells** (`incubator-b/proof/measures.json`): all still met.
- **Steps (cool→warm; warm→glowing):** S01 17.0, 16.2; S03 17.5, 14.3.
- **Lamp:** S01 1.88×; S03 1.71×.
- **Shadow:** S01 48.8; S03 58.0.
- **Brightness margins (cool, warm, glowing, ready):** S01 [0.222, 0.103, 0.267, 0.276]; S03 [0.203, 0.137, 0.243, 0.252].
- **Under-light (bottom ≥ top in warm, glowing, ready):** S01 [[0.148, 0.164], [0.153, 0.208], [0.164, 0.197]]; S03 [[0.178, 0.234], [0.185, 0.276], [0.195, 0.264]].

## 2. The card's crops at 160 × 128 (40)
`make-card-crops.py` cuts every look that has a trait painting with Pods' own trait cutter (`tools/traitcut.py`: its hand-set windows and its `cut()`).
- **The rule:** the owner's 75 percent rule, reduced and never enlarged, on the cell ground `#162a37`, a 12 px fade. 160 × 128 is a wide cell, so each look's landscape window is used, as traitcut does for its wide cells.
- **Cleaning:** the key's residue is removed by the house rule (`tools/defringe-plates.py`'s, applied to these files only; that script rewrites every plate in `slices/` and changes three S02 plates if run whole). The six S03 scales and claws crops also had `trait-clean/clean-s03-residue-2.py` run twice, as the other sizes were.
- **A check, reported:** today's traitcut re-cuts `roll-S01-crown-leaf-crest-128x72` within 80 px of the signed one (its windows were retuned after wave 1). So these crops follow today's table.
- **Left after cleaning, for the 1× check:** a small dark notch on the lower edge of the S03 scales crops (the sheet's panel border) and a spot on one claws leg.

**The ids:** `trait-S01-crown-bare-head-160x128`, `trait-S01-crown-leaf-crest-160x128`, `trait-S01-eyes-thin-rings-160x128`, `trait-S01-eyes-between-160x128`, `trait-S01-eyes-wide-pale-rings-160x128`, `trait-S01-markings-plain-160x128`, `trait-S01-markings-pale-patches-160x128`, `trait-S03-markings-plain-160x128`, `trait-S03-markings-stripes-160x128`, `trait-S03-markings-spots-160x128`, `trait-S03-markings-stripes-and-spots-160x128`, `trait-S03-crest-low-crest-160x128`, `trait-S03-crest-between-160x128`, `trait-S03-crest-tall-crest-160x128`, `trait-S02-spots-bare-160x128`, `trait-S02-spots-bands-160x128`, `trait-S02-spots-spots-160x128`, `trait-S02-spots-bands-and-spots-160x128`, `trait-S02-span-small-cap-160x128`, `trait-S02-span-between-160x128`, `trait-S02-span-wide-cap-160x128`, `trait-S03-tail-short-thin-160x128`, `trait-S03-tail-between-160x128`, `trait-S03-tail-long-thick-160x128`, `trait-S03-carriage-hangs-160x128`, `trait-S03-carriage-straight-160x128`, `trait-S03-carriage-curls-up-160x128`, `trait-S03-claws-round-feet-160x128`, `trait-S03-claws-pads-160x128`, `trait-S03-claws-digging-wedges-160x128`, `trait-S03-scales-few-fine-160x128`, `trait-S03-scales-between-160x128`, `trait-S03-scales-many-coarse-160x128`, `trait-S02-flecks-bare-160x128`, `trait-S02-flecks-spots-160x128`, `trait-S02-fluff-short-straight-160x128`, `trait-S02-fluff-long-swept-160x128`, `trait-S04-stripes-faint-160x128`, `trait-S04-stripes-between-160x128`, `trait-S04-stripes-bold-160x128`.

**Not cut (no trait painting):** S01's doings (Drive, Efficiency: their 128 × 160 plates come from motion keys, not a look) and every look of S03's Colour, Trim, Eyes, Snout, Build, Haunch, Topline and Legs. The card falls back as ruling §5 says (the chapter's emblem) until they are painted.

## 3. Proofs (`proof/`)
- `pod-class-224x272-vs-upscale-1x.png`: S01 and S03 at 224 × 272 beside today's upscaled stand-in.
- `card-crops-160x128-1x.png`: all 40 crops.
- The Incubator proofs in `../incubator-b/proof/` now use these shells 1:1.

**Not in scope:** the origin dust or moss (the renderer has no layer for it).
