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

## T-20261016-138: the delta after the framework's fidelity fixes (T-136)
The genome engineer checked the screen against the real frames (T-135), and T-136 redrew the spec and wireframes 01–09. The art follows them.

**Changed or new** (all signed):
- **One look** (`only`), new: `genome-gene-only-24x24`, the ring without ticks (it does not turn), and `genome-pair-only-16x10`, two equal `fog` discs. It is the commonest configurable state.
- **Self-changing,** redrawn: `genome-gene-self-24x24` is now the inherited-only mark (the shut disc and joined rings) with four step marks round it, always unlit here. It is only on the traits the frame flags: S03 Glow, S15 Basking and S16 Phase.
- **Trigger places,** new: `genome-place-{cave,wood,meadow,pond-edge,rock-field}-10x10`, one per trigger place, stacked at (25, −2 + 11k). They are cut from the signed place pictures; pond edge and rock field are the pond and rock places.
- **The chapter's glint,** new: `genome-glint-gold-12x12`, once per unread chapter, on its emblem at (16, −4). On the compact Incubator it sits at the row's first gene. It is never on a gene.

**Withdrawn** (not deleted): `genome-place-*-12x12` and `genome-glint-gold-10x10`.

**Standing unchanged:** the housings, every other gene mark and pair, the frost, the hubs, the lock, the cross, the wish glint, the first mark, the sealed finds, the veil and the focus ring. They rebuild byte for byte.

**Geometry only** (the face's, no art): clash is now a set of red rims, mirrored on the drums, with no link. The switch's dots turn `bone` when the pod's switch is on. An unread row shows no bar or dots. The Cross line runs only from a breed-only last gene.

**Owed:** the storm badge for S16 Phase. No storm picture exists, and the badges are cut from place paintings, never invented symbols. Phase sits in a sealed chapter (Charge), so the badge is first seen when that chapter opens.

**Proofs, redone at 1×** against the redrawn wireframes (`proof/`):
- **`genome-create-S03-1x.png` (01):** S03 from its frame.
  - **Rows:** Colour changed (copy 1 kept); Markings the switch with its sleeping loci; Scales, Snout, Haunch and Tail one look; Eyes kept and new to the guide (focused); Topline with the wish glint; Claws inherited-only; Movement toward the Cross; Stamina frosted with its glint on the emblem; Character frosted; Glow self-changing (cave, wood) and Duration breed-only, carrying the Cross line.
  - **The bay:** the eye's copies show the gene's mark (S03's eyes have no picture yet), copy 1 under the veil and copy 2 in the mint frame.
- **`genome-create-S03-clash-1x.png` (02):** a clash set (Eyes, Build), red rims only, mirrored on the drums.
- **`genome-incubator-S03-{cool,warm,glowing,ready}-1x.png` (06):** Stamina just cleared, Character frosted with its glint at the row's first gene. The compact rows leave out the place badges, because the 28 px pitch has no room.
- **`genome-marks-1x.png` and `-4x.png`:** the mark family with the delta.

**Brightness (Incubator), re-taken:** margins of 0.388, 0.337, 0.466 and 0.473 (cool, warm, glowing, ready), against a minimum of 0.08.

## T-20261016-143: a Create proof the owner can read (S01); S03's owed looks
The review (`results/review-genome-screen-art.md` §1) passed the marks but found the S03 proof unreadable for the owner. S03's looks are mostly unpainted, so its bay showed two near-empty frames and four of its seven drums were blank.

**`proof/genome-create-S01-1x.png`, the owner's proof:** Create on S01, shape.
- **The changes:** Crown changed to the leaf crest (lit, with its notch on the drum), and the founder wears it.
- **The focus:** on Eyes. The bay shows its two copies as pictures: thin rings shown, in the mint frame; wide pale rings carried behind the veil.
- **The drums:** all five, at the spec's spacing (g 28). Each carries its close-up and its neighbouring faces; the two doings are pinned.
- **Nothing new is painted.**

**The S03 proofs stay as the deep-species check.** `genome-create-S03-1x.png` and `-clash-1x.png` are now labelled "NOT FOR THE OWNER: S03's looks owed".

**S03's owed looks (no painting yet), a separate art ask for the lead.** Read from S03's frame (its shapeable looks), against `slices/`.
- **Drum close-ups, `look-S03-{trait}-{look}-64x64`, 31 owed** (16 exist):
  - **Coat:**
    - Colour: lagoon, jade, marigold, periwinkle, two side by side;
    - Trim: milk-mint, cream, ice, slate, two side by side.
  - **Face:**
    - Eyes: small and close, between, big and wide;
    - Snout: short and narrow, between, long and broad.
  - **Shape:**
    - Build: slim, between, stout;
    - Haunch: small, between, full;
    - Topline: dipping, level, arched.
  - **Legs and tail:**
    - Legs: short and fine, between, long and stout;
    - Claws: round feet, pads, digging wedges. Claws is breed-only, so these are needed only if its pinned drum shows a face.
- **Copy faces for the bay, `trait-S03-{trait}-{look}-160x128`, 28 owed:** the same looks, less Claws, whose three crops exist.

## T-20261016-145: the framework check's fixes (`results/review-genome-screen-art.md` §3)
**Slices:**
- **Added:**
  - `genome-place-storm-10x10`: S16 Phase's storm, in the badge family, painted by hand because no storm painting exists. A dark cloud over a pale sky, rain and one flash.
  - `genome-gene-open-lit-clash-24x24`: a changed gene that clashes, lit mint with its notch under the red rim. Only changed traits clash, so the clash set needs it.
- **Renamed to the frame ids:** `genome-place-pond-10x10` and `genome-place-rock-10x10`. `genome-place-pond-edge-10x10` and `-rock-field-10x10` are withdrawn, not deleted.

**The marks sheet** now has the shard find, the storm badge and the lit clash mark.

**The proofs, re-rendered:**
- **The clash (02):** the set is Eyes and Build. Both are changed, so both are lit under their red rims. The tray is slid to Face and Shape, so the red drums are Eyes and Build; Crest is not red. "Grow it" shows without its ✓ (no cap in clash).
- **The bottom line:** "← Tuikis" on S03's Create screens.
- **The Incubator (06):** the chapters clear on (k + 1) / (n + 1).
  - **cool:** Stamina and Character are frosted with their glints, and the card shows Stamina's emblem before it clears.
  - **warm:** Stamina has just cleared ("goes long").
  - **glowing:** Character has just cleared ("unflappable").
  - **ready:** every chapter is known.
  - **The card's picture:** the doings have no picture, so it is the chapter's emblem, as the card's fallback (tabs ruling §5).
- **The owner's Incubator proof:** `proof/genome-incubator-S03-glowing-1x.png`.
- **Brightness, re-taken:** margins of 0.361, 0.337, 0.476 and 0.486 (minimum 0.08).

**T-140's additions, done in T-145's round** (by the lead's routing):
- **The lit marks on palette:** `genome-gene-open-lit`, `-open-lit-clash` and the four `genome-pair-*-lit`. Each pixel is opaque, so its alpha is 0 or 255. Covered pixels take the mark's own palette colour (mint, red, bone, sand, with `ink` inside the ring), and the soft edge is one painted ring of `aqua`. 0 off-palette pixels, measured.
- **The R mark, new:** `genome-key-research-12x12`, the shell's own Research key icon reduced 2:1 with its strokes held. It sits on the bay at (156, 4) in the Create proofs.

**Compact Glow on the Incubator (UI/UX):** the same 24 × 24 self-changing mark, with no place badges. The badges appear only on Create and in the detail view. The proofs already show this.
