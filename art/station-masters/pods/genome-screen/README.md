# T-20261016-130: the genome screen (AD, 10-17, by hand in code)

The bench's main screen and its compact twin on the Incubator (`specs/station-genome-screen-spec.md`, wireframes `specs/station-genome-screen/01`–`07`, the CD's `specs/slip-visual-intent.md`).
- **The owner** (04:16): "this screen must feel like a research/crafting bench. advanced, you're editing life".
- **What it is in the world:** a dark matte slate display let flush into the sage housing, on which the machine shows the founder's genome live as it is edited.
- **The style:** `design/art-direction.md` and `design/style-guide/README.md`. No gloss, glow halo, scanlines, hologram or neon. Mint is the one lit hue, small and flat (at most a 1 px soft edge); red only for a clash.
- **Nothing is taken from `art/references/genome-field/`.** The structure is UI/UX's, and the marks are drawn in the house's own vocabulary: the device plate, the frost, the four-point glint, the house focus ring.
- No paid call.

## The masters (`make-genome.py`, and `../create-bench/make-create.py` for the bench family)
| Id | Size | What |
| --- | --- | --- |
| `create-genome-screen-512x312`, `incubator-genome-screen-208x312` | | The kit's sage bezel; the screen recessed in matte slate with grain (its top and left inner edges in shade); a 2 px rubber gasket at (6, 6); four screws. No picture |
| `genome-gene-open` | 24 × 24 | Can change: a ring with three tumbler ticks, its inside slate (so the tree's lines stop at the mark) |
| `genome-gene-open-lit` | 24 × 24 | Changed by you: the ring in mint, with the notch 3 × 6 at (21, 9) |
| `genome-gene-open-clash` | 24 × 24 | The ring's rim red |
| `genome-gene-closed` | 24 × 24 | Inherited-only: a shut disc with the joined rings |
| `genome-gene-self` | 24 × 24 | A small ring with four unlit step marks |
| `genome-pair-{front,blend,first,second}-{dim,lit}` | 16 × 10 | The copy pair at (4, 7) in a gene. Copy 1 bone, copy 2 sand; the front copy is edged in slate so the two never merge |
| `genome-frost-24x24`, `-160x128` | | The house frost on slate |
| `genome-hub-S01`…`S16` | 24 × 24 | Each species' own frame glyph (its 5 × 5 `glyph`) in a ring |
| `genome-lock-8x10` | 8 × 10 | The lock over the hub |
| `genome-cross` | 12 × 12 | A small x |
| `genome-glint-gold`, `-wish` | 10 × 10 | The house four-point glint |
| `genome-first` | 10 × 8 | A point-up triangle, cream on a gold edge |
| `genome-place-{meadow,pond,rock,wood,cave}` | 12 × 12 | Cut from the signed `place-*-32x32` |
| `genome-sealed-{crystal,pearl,shard}` | 24 × 24 | Cut from the signed `find-*-112x112`, their ground keyed out |
| `genome-veil-160x128` | 160 × 128 | Slate at 62 % |
| `genome-focus-32x32` | 32 × 32 | 2 px `focus`, radius 15 |
| `create-bench` (re-cut) | 1024 × 522 | No well seat; the dish cut-out at (88, 324) in the slice, 320 wide |
| `create-dish-320x28` | 320 × 28 | Cut from the signed `create-dish` (its ends, joined through the moss: its moss source can't be rebuilt byte for byte) |
| `create-port-128x122` | 128 × 122 | Pods' fitted well, reduced to 122: the pod's socket at the tray's left end |

**Geometry, not painted** (the face draws them as palette rectangles): the trunk, branches, the dotted cross line, the dashed red link, the gate bar and the loci dots, the bay's frames and the pulse. The proofs draw them in `sageD`, `stone`, `red` and `mint`.

**The emblems on slate:** all nine `rail-emblem-*-{read,unread}-24x24` read at 1× on the slate (`proof/emblems-on-slate-1x.png`, 3×), so no slate variant is made.

## Proofs (`proof/`, labelled inside, at the spec's rects)
- **`genome-create-S03-1x.png`:** Create, shape, S03.
  - **The tree:** a change (Scales), a first (Crest, focused), the Markings switch with its five sleeping loci, a blend, Feet inherited-only, and Movement toward the Cross. Stamina and Character are unread (frost; the gold glint), and Glow is self-changing with its place badge.
  - **The bay:** Crest's two copies, copy 1 dropped under the veil and copy 2 kept in the mint frame.
  - **The bank:** from x 240.
- **`genome-create-S03-clash-1x.png`:** Crest and Build clash, with two red rims and the dashed link.
- **`genome-incubator-S03-{cool,warm,glowing,ready}-1x.png`:** the compact screen in the slip's place, with Stamina just cleared (the mint pulse) and Character and Glow still frost.
- **`genome-marks-1x.png`, `-4x.png`:** the mark family.
- **`emblems-on-slate-1x.png`, `-3x.png`:** the emblems checked on the slate.
- **Stand-ins:** the pod (S03's shell), the founder (S03's painted adult), the contact shadow, the chapter words, the bottom line, the card and its words, and the drums with no close-up.

**Brightness (the Incubator)** (`proof/brightness.json`): the pod's p95 relative luminance against the screen housing's whole rect (88, 96, 208 × 312, bezel included), with every mark drawn:

| Step | Pod p95 | Screen p95 | Margin (≥ 0.08) |
| --- | --- | --- | --- |
| cool | 0.590 | 0.230 | 0.360 |
| warm | 0.539 | 0.230 | 0.308 |
| glowing | 0.668 | 0.230 | 0.438 |
| ready | 0.675 | 0.230 | 0.445 |

**Placement:** masters-pods has no `place-masters.mjs`, so the build places them with: `node prototypes/ui/tools/place-masters.mjs --from <masters-pods>/art/station-masters/pods --only --ids <the ids above> --group pods`.
