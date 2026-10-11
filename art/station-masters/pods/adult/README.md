# Adult stand-ins, round 1 (Oct 11), painted bare

ad-adult-plan.md's form (`mibi-adult-SXX-{304x312,144x152,96x88,48x48}`), with the owner's 14:17 ruling: each picture is the species' **bare base**. Every switch is off and every outline part is at its smallest bin; the parts come later as overlays (bare-keys-plan.md §1, §4). Programme lead's go 14:32, hard stop 18 MXN. Inputs: the species' adult rig render (`juvenile/guides/adult-rig-SXX-304x312.png`) and its signed halo. Never a juvenile.

| Species | Request | Cost | Verdict |
| --- | --- | --- | --- |
| S09 Belatz | `mibi-adult-S09-a` | 3.64 | **Signed.** Low crest (the bare bin): a grown bird of the juvenile's blue, beak and legs |
| S13 Oskol | `mibi-adult-S13-a` | 3.64 | **Refused at 1×**: it copies the blockout (slab feet), and the face has no readable eyes. Not cut |
| S13 Oskol | `mibi-adult-S13-b` | 3.82 | **Signed.** The prompt names the slim jointed legs and the face, and says not to copy the blockout (programme lead's go 15:00, the line raised to 19 for it). Short closed wing cases, the bare bin |
| S16 Blikur | `mibi-adult-S16-a` | 3.64 | **Refused**: no face, pale lavender with white spots, unlike its juvenile |
| S16 Blikur | `mibi-adult-S16-b` | 3.89 | **Signed.** Face, purple skin with violet spots (fixed species look, painted into the base), floating over its shadow |

Round total **18.63 of 19** (the line was 18 until the S13 redo).

**Cut** (`cut-adults.py`): keyed on each raw's own magenta. The shadow is found by component, so S16's lilac neck stays whole, and a shadow joined to the feet is split in the lowest fifth. Height = the juvenile's solid height ÷ 0.67 (≤ 296), feet row 305. Then 144×152 (×0.4737, feet 145), 96×88 (×0.276, feet 85), and 48×48 refit to 44. Proof: `adult-round1-1x.png` over #D6CEBE.

Placement waits on the adult hook slot (pictures.mjs:74, the architect's spec).
