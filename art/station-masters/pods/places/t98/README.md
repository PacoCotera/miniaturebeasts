# T-20261016-98: the wood badge re-made; two card crops re-cut

**`place-wood-32x32`** (`make-wood-32.py`). The review (`results/review-art-2026-10-16c.md` §5) found the canopy cut read as pebbles at 1×.
- **Why a different painting:** the two wood place paintings (`place-wood`, `place2-wood`) are top-down tree canopies, with no trunk or root in them. The wood place's sitting backdrop (`source/raw/sitting-backdrop-wood.jpg`) has both.
- **The cut:** its left trunk's base fanning into roots, lit on their edges, (10, 450, 170, 610). It went through the badges' own recipe, with the mean grey graded to 70 (the recipe's wood 60 left the roots too dark at 32).
- **How it was chosen:** at 1× on `pods-collection`, over four other trunk and root cuts from both backdrops.
- **How it reads at 1×:** a woody trunk with roots, warm brown with lit edges, not pebbles. It is less instant than pond or rock, which have simple silhouettes. If the owner still can't read it, the spec's §6 word fallback is UI/UX's call.

**The crops:** `trait-S01-eyes-between-160x128` and `trait-S02-spots-bare-160x128` are re-cut by `../../pod-incubator/recut-card-crops.py` (one line each), the same way as T-68's eleven. The eleven rebuild byte for byte. The sheet `../../pod-incubator/proof/card-crops-160x128-1x.png` is rewritten.

**Proofs** (`proof/`):
- `badges-on-pods-collection-1x.png`: the five badges on the batch's `pods-collection` (cf6bc257), labelled. The cave badge is set in the last well for the proof.
- `badges-old-wood-then-five-4x.png`: the old wood badge, then the five.

## T-20261016-105: a whole tree? None reads at 32
The review (§3) asked for one whole tree, trunk and crown, against lighter ground, read by its silhouette.

**Where I looked:** every wood painting in the repository.
- **The sitting backdrop r1:** its trees stand in mist, but their crowns merge into one dark canopy. At 32 a window holding a whole tree reads as muddy trunk columns.
- **r2:** it crops above the trunks, so no crown is in it.
- **The two canopy paintings:** they show crowns from above, with no trunk.
- **`placeref-wood`:** a pixel-art reference, not the place's painting.

**The tries:** `proof/t105-whole-tree-candidates-4x-and-1x.png` shows six windows at 4× and 1×.

**The outcome:** no whole tree reads at 32, so I make no further cut, and `place-wood-32x32` stays T-98's. The spec's §6 word fallback is UI/UX's to rule.

**For the record:** the closest is a single crown from above (the canopy painting, "crown, top left"). At 1× it reads as a round leafy top, but it has no trunk and wasn't the ruled idea.
