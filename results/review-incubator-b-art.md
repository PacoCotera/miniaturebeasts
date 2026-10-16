---
ticket: T-20261016-61
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict: FAIL

**What was reviewed.** The Incubator B art (T-20261016-27) at masters-pods 000db650, `art/station-masters/pods/incubator-b/proof/`:
- S01 and S03 in empty, growing-cool, growing, ready and hatch-1100, at 1×;
- the README and `measures.json`.

**What it was judged against:**
- the chosen concept (`specs/incubator-concept.md` §2 B and §3);
- the layout ruling (`specs/station-incubator-tabs-ruling.md` §§2–5);
- the owner's eleven points (T-20261016-25);
- `design/art-direction.md`, `design/style-guide/README.md` and the purpose-first rule.

**Why it fails.** The art removes everything the owner rejected, and its objects all have jobs. But it does not yet carry candling itself:
- the pod is still lit from the top left;
- its light steps barely differ;
- the lamp lights almost nothing;
- no shadow can read through the shell before ready.

Those are the art's to carry, not the build's. On today's proofs the screen still reads as "an egg on a stand", which is the owner's first point. Two pieces of art are also owed before the build can be judged whole (T-20261016-63).

## 1. B's three signature effects, measured

Measurement method:
- pod box (400, 144, 224, 272);
- relative linear luminance, mean;
- top half = rows 144–279, bottom half = rows 280–415;
- warmth = mean R − mean B in the bottom half;
- moss band (400, 400, 224, 40).

| Effect | Concept | Measured on the proofs | Whose job | Result |
| --- | --- | --- | --- | --- |
| **Under-light** | The pod "lit warm from below, as eggs are candled" | The bottom half is darker than the top in every step. S01: cool 0.124 vs 0.234; ready 0.165 vs 0.237. S03: cool 0.228 vs 0.264; ready 0.234 vs 0.264. The highlight is the top-left key on the cap. The moss under the pod barely brightens: S01 0.111 (cool) → 0.129 (ready). S03 0.129 → 0.143. The lens reads as an amber status slot on the cradle face, not as a light | **Art** (`incubator-shell-*` overlays and `incubator-cradle`) | **Missing** |
| **Translucency rising** | "As it grows the shell lets more light through" | Steps are near-identical until ready. The mean absolute change in the pod box, cool → growing, is 5.4/255 (S01) and 6.5/255 (S03). Only ready changes visibly (16.8 and 19.4). Warmth in the bottom half rises S01 −1 → 13.5 → 40, but S03 stays cool until ready (−52 → −30 → 8). On the dark S01 shell the warm step is invisible at 1× (the README says so too) | **Art** (the light steps) | **Missing** |
| **Shadow through the shell** | "the player's founder shows through it as a soft shadow" | In both growing proofs no shape reads at 1×. In ready there is a faint warm blob (S01) or a smudge (S03), not a creature. The ruling's opacity steps (cool 0.25, warm 0.45, glowing 0.65, ready 0.8) need a shell that transmits light where the shadow sits. These overlays paint the shell nearly opaque over it | **Split:** the mask and its layers are the **build's** (derive, T-20261016-60). A shell that lets it read is the **art's** | **Missing** (art half) |

## 2. The owner's eleven points

| # | Owner's words | On these proofs | Whose job | Result |
| --- | --- | --- | --- | --- |
| 1 | "decorating a screen and placing an egg in it" | Every object has a job (README step 1), but the pod doesn't change in a way worth seeing until ready, so it still reads as an egg on a stand | Art (§1), then build (shadow, card) | **Missing** until §1 is fixed |
| 2 | "tabs make no sense in the incubator" | None | Done | Pass |
| 3 | "retro mid-century industrial … not the style" | No machinery. Sage frame and slate ground as on Pods, the vivarium's moss, and one sage device | Done | Pass |
| 4 | "a lot of wasted space" | The slip (88, 96, 208 × 408) and card (728, 96, 208 × 240) are blank in the proofs, so the two columns read empty. Their words and picture are the build's; the card's crops are owed art (T-63). The proofs must show stand-in content at the longest strings so the composition can be judged | Build (content); art (crops, proof stand-ins) | **Not judgeable yet** |
| 5 | "the egg should be an egg that we collected" | The species' shell is used (stand-in scaled from `pod-large`). Two gaps: no 224 × 272 class, so it is a soft upscale, and no origin dust or moss layer in the renderer | Build (draws it); art (224 × 272 layers, T-63) | **Partly** |
| 6 | "the lamp is out of proportion and clipped, and casts no light" | In proportion and wholly in frame, but it still casts almost no light (§1) | **Art** | **Fail** |
| 7 | "the fixtures in the walls make no sense" | None | Done | Pass |
| 8 | "the gauges make no sense" | None | Done | Pass |
| 9 | "no sense of progress or wait time … the little leafs" | The ring's track and fill read at the stage's scale. The cut emblems, the fill clip and "ready in about n min" are the build's | Art done; build | Pass (art) |
| 10 | "a screen and experience poorly designed" | Judged whole only when §1 and the build's content are in | — | **Not yet** |
| 11 | "it needs to invite the user to check it" | The reason to look is the shadow getting clearer and the card's reveal. Neither reads yet | Art (shell lets it read); build (derive, card) | **Missing** |

## 3. What is fine and stays

- The stage, the bezel and the moulded ring track.
- The ring fill and its closed state.
- The cradle's form and the moss nest.
- The slip paper, the card ground and the stamp plate (0.233 p95, under 0.34).
- The crack and seam overlays.
- The retirements.
- Brightness: the pod beats every other region by 0.287 or more (rule 0.08). Keep it true after the fix.

## 4. Split: the art must carry / the build adds

**The art must carry** (T-20261016-62, T-20261016-63):
- under-light on the shell and in the nest;
- distinct light steps;
- a shell that lets the shadow read;
- the lamp's visible light;
- proofs with stand-in content in the slip and card;
- the 224 × 272 pod layers;
- the card's 160 × 128 trait crops.

**The build adds** (already ticketed; not fails of the art):
- the species shell from Pods' renderer at the pod rect (T-20261016-28 and its successor);
- the founder-shadow mask and its per-chapter layers, and the ring's arc fill (T-20261016-60, T-20261016-40);
- the cut emblems placed from clearing times;
- the slip's and card's words;
- "ready in about n min";
- the hatch ribbon;
- Home's module and Idle's tag (ruling §7).

## Fixes

- **T-20261016-62 (art):** candling carried by the art: under-light, distinct steps, a shell the shadow reads through, a lamp that lights, and proofs with stand-in content. Numbers to meet are in the ticket.
- **T-20261016-63 (art):** the owed pieces: the pod class at 224 × 272, and the card's `trait-{species}-{trait}-{look}-160x128` crops.

## Proof (commands run and their result lines)

- `git show 000db650:art/station-masters/pods/incubator-b/proof/<file>` for all 12 proofs and `measures.json`, read at 1× as 2 × 2 sheets.
- The measurements in §1 (numpy, relative linear luminance):
  - "S01 growing-cool pod mean 0.179 top 0.234 bottom 0.124 … moss 0.111";
  - "S01 ready … top 0.237 bottom 0.165 … moss 0.129";
  - "S03 growing-cool … top 0.264 bottom 0.228 … warmth −51.8";
  - "cool → growing mean abs diff 5.44 (S01), 6.48 (S03)".
