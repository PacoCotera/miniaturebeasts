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
