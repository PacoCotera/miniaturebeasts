# Adult stand-ins, round 1 (Oct 11), painted bare

ad-adult-plan.md's form (`mibi-adult-SXX-{304x312,144x152,96x88,48x48}`), with the owner's 14:17 ruling: each picture is the species' **bare base**. Every switch is off and every outline part is at its smallest bin; the parts come later as overlays (bare-keys-plan.md §1, §4). Programme lead's go 14:32. Inputs: the species' adult rig render (`juvenile/guides/adult-rig-SXX-304x312.png`) and its signed halo. Never a juvenile.

| Species | Request | Verdict |
| --- | --- | --- |
| S09 Belatz | `mibi-adult-S09-a` | **Signed.** Low crest (the bare bin): a grown bird of the juvenile's blue, beak and legs |
| S13 Oskol | `mibi-adult-S13-a` | **Refused at 1×**: it copies the blockout (slab feet), and the face has no readable eyes. Not cut |
| S13 Oskol | `mibi-adult-S13-b` | **Signed.** The prompt names the slim jointed legs and the face, and says not to copy the blockout (programme lead's go 15:00, the line raised to 19 for it). Short closed wing cases, the bare bin |
| S16 Blikur | `mibi-adult-S16-a` | **Refused**: no face, pale lavender with white spots, unlike its juvenile |
| S16 Blikur | `mibi-adult-S16-b` | **Signed.** Face, purple skin with violet spots (fixed species look, painted into the base), floating over its shadow |


**Cut** (`cut-adults.py`): keyed on each raw's own magenta. The shadow is found by component, so S16's lilac neck stays whole, and a shadow joined to the feet is split in the lowest fifth. Height = the juvenile's solid height ÷ 0.67 (≤ 296), feet row 305. Then 144×152 (×0.4737, feet 145), 96×88 (×0.276, feet 85), and 48×48 refit to 44. Proof: `adult-round1-1x.png` over #D6CEBE.

Placement waits on the adult hook slot (pictures.mjs:74, the architect's spec).

## Re-cut after the programme lead's 1× note (15:02)

The first cut left magenta key residue under S13's feet and belly (1,163 px at 304×312), with smaller amounts on S09 (182) and S16 (28). My sign missed it. The cut now removes body pixels whose green sits far below their red and blue (under 0.6×, i.e. magenta and its painted shadow; S16's lilac skin keeps more green). Such pixels in the lower half become the shadow, and the 2 px edge is defringed. Re-cut from the raws. **Measured: 0 magenta pixels on S09, S13 and S16 at 304×312, 144×152 and 96×88.** Re-signed at 1× on #D6CEBE (`adult-round1-1x.png`).

## S01 is Pip (fix 1a of the Station global fix plan)

`cut-pip.py` makes S01's four stands from the accepted Pip, `art/miniature-lives/assets/rich-plain-300x310.png`. No generation; the plan's "S01 = Pip, placed 1:1".

- **Body:** alpha 192 and up, one component, holes filled, made opaque with its own colour. The soft edge is un-premultiplied so it doesn't grey.
- **Shadow:** Pip's soft painted shadow under the feet becomes the house shadow (#1e1a22 at alpha 110), as on the other adults. 2,482 px of stray soft specks are dropped.
- **Sizes:** 304×312 at 1:1 (Pip is 289 px tall, under the 296 cap). The ground row is on 305, as the other adults stand, so Pip sits at (−6, 9) rather than the plan's (−5, −2). Then 144×152 (×0.4737), 96×88 (×0.276) and 48×48 (refit to 44), each by the family's fit in `cut-adults.py`.
- **Checks:** 0 px of magenta at every size. Alpha is 0, 110 or 255 at 304 and 48, with the family's graded shadow at 144 and 96.
- **Proofs:** `S01-pip-sizes-1x.png` (the four sizes on #D6CEBE) and `S01-pip-vivarium-1x.png` (144 and 96 on the day glass beside the signed S01 juvenile at 104).
- **Signature:** candidate until the art director signs it in builder 2's whole-screen captures (the fix plan's gate).
- **Known look:** the S01 juvenile stand-in is teal and cream, and Pip, the canonical adult, is charcoal and cream. A Loika darkens as it grows, until the coat layers carry each mibi's own colour.

## S03 (2026-10-12), the S09/S13/S16 recipe

- **Request a, refused:** the first request (`mibi-adult-S03-a`) was refused by the model's filter (PROHIBITED_CONTENT, no image). It was not reworded or retried. By the programme lead's word, S03 was made by the recipe that had passed for S09, S13 and S16.
- **Request b, signed:** `mibi-adult-S03-b`. Inputs were the rig and the silhouette only, with no juvenile image and no young or grown wording, and the bare base asked for: a plain mint-white coat, a teal head and ears, a short antenna, and a short tail with its bulb unlit.
  - Cut by `cut-adults.py`: 0 magenta at every size.
  - Then `match-juvenile.py S03 teal,gold` moved the head and the bulb onto the signed juvenile's teal and gold, keeping the painting's shading. The coat was already the juvenile's mint and was left alone. A mint pass made it bluer, so it was dropped.
  - Proof: `S03-vivarium-1x.png` (the juvenile at 104, the adult at 144 and 96, on the day glass).
  - Signed beside the juvenile at 1×; the whole-screen sign follows in builder 2's captures.

## S02 (2026-10-12), the same recipe

`mibi-adult-S02-a`, one request, signed.
- **Inputs:** the rig and the silhouette only. The bare base: a warm brown bean body under a small pale tan cap, rosy cheeks, a round tail puff, no spots, bands or flecks, short fuzz.
- **Cut:** by `cut-adults.py`, 0 magenta at every size.
- **Colour match:** `match-juvenile.py S02 brown,cap` moved the body's brown and the cap onto the signed juvenile's.
- **Proof:** `S02-vivarium-1x.png`.
- **Sign:** signed beside the juvenile at 1×; the whole-screen sign follows.


## S03's value pass (programme lead's note: the adult read nearly white mint, flat, low in contrast)

The mint is canon, so the hue is kept and the values drop. `value-pass.py` moves only the coat, weighted softly at its edges. The coat is the pale, low-saturation pixels with a green-cyan hue. Each is taken to OKLab, where:
- its lightness is mapped from the coat's own percentiles (5, 50, 95) onto 0.62, 0.76 and 0.88;
- its chroma is lifted ×1.9, capped at 0.10.

The body's lowest 30 % then shades a further 0 to 12 %. The teal, the bulb and the face stay the juvenile's. The coat's median luminance falls from 0.92 to 0.70 on the adult and from 0.85 to 0.67 on the juvenile.

Two earlier tries were discarded: a plain RGB scale greyed the coat, and mapping the whole picture crushed the ears to black. The adult and juvenile go through the same pass, so the two stages still match. Signed beside S02 at 1× on the day glass: `S03-value-vivarium-1x.png` (S02 adult, S03 adult, S03 juvenile, S02 juvenile). All eight files: 0 px magenta. They are in slices/ with manifest and status entries; the whole-screen sign follows in builder 2's captures.
