---
ticket: T-20261016-66
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict: nothing passes yet. Two are one small fix away

| Art | Verdict | Fix ticket | Once fixed, show the owner |
| --- | --- | --- | --- |
| Incubator candling (T-62) and the 224 × 272 pod class (T-63 step 1) | **FAIL, one fix:** the founder's shadow is drawn over the shell's opaque cap and band | T-20261016-68 | `incubator-b-S01-glowing-1x.png`, re-proofed (masters-pods `art/station-masters/pods/incubator-b/proof/`) |
| The card's trait crops, 160 × 128 (T-63 step 2) | **FAIL:** 11 of 40 crops are dirty at 1× | T-20261016-68 | (not shown alone; they ride in the Incubator proof) |
| Create, the gene bench (T-41) | **FAIL:** the drums don't read as turnable, the gene line reads as a post, and the proof's slip is blank | T-20261016-69 | `create-shape-S01-1x.png`, re-proofed |
| The decision panel look (T-47) | **FAIL:** no cream and little text, but not yet "very interesting". The subject floats over its stage, the chips are missing, and the Return outcome is a pasted square | T-20261016-70 | `panel-grow-over-create-1x.png`, re-proofed |

All four were judged at 1× on masters-pods 5fd943ae and in `results/T-20261016-{41,47,62,63}/`. The judges:
- the owner's points (the Incubator's eleven, T-25; Create's "floating" and "tweak genes"; the panels' 13:26 words);
- `design/art-direction.md` and `design/style-guide/README.md`;
- the purpose-first rule;
- the gate's seven checks (references, objects as used, one style, grounded, margins, purpose at a glance, owner's words).

---

## 1. Incubator candling (T-62, T-63 step 1)

**What now works.** All five of T-62's measures are met on both species (T-62 result; re-taken on the T-63 shells, S01's thinnest brightness margin is 0.103). At 1× it reads as candling:
- the pod is lit from below;
- the shell clears from cool to glowing in visible steps;
- the lens throws a pool into the moss;
- the shadow reads as a creature from glowing (S01) and from warm (S03).

The slip and card are now filled with stand-ins, so the columns read as used, and the owner's "wasted space" is answered. The 224 × 272 class (`pod-incubator-*`) is crisp beside the upscale it replaces (`results/T-20261016-63/pod-class-224x272-vs-upscale-1x.png`). Owner points 1, 6 and 11 (my FAIL of T-61) are now met.

**The one defect.** The shadow is composited over everything above the interior light (T-62's order: shell → light → shadow → seams → cradle front), so it darkens the shell's **opaque** parts:
- **S03:** a band of shadow crosses the gold cap's underside and both gold straps (glowing, ready).
- **S01:** a dark notch sits on the cap's right edge (glowing, ready).

Seen at 1× in `incubator-b-S01-glowing-1x.png` and `incubator-b-S03-glowing-1x.png`. Light can't pass through a cap or a strap, so a shadow on them breaks the candling read and gives the trick away. This is the art's to fix, because the art gave the composite order and owns the shell layers.

**Fix (T-68):**
- a body-only clip: the translucent body, minus band, cap and accent, from the class's own layers;
- the order shell → light → shadow (clipped) → band, cap and accent → seams → cradle front;
- re-proof.

**Not the art's:** the slip's "Found under the rock ledge," runs past the slip's right edge (the AD flagged it for the copywriter).

## 2. The card's crops (T-63 step 2)

The 40 crops in `results/T-20261016-63/card-crops-160x128-1x.png` were judged at 1× on the card's dark ground. Most are clean. **Eleven are not:**

| Ids | Defect at 1× |
| --- | --- |
| `trait-S03-scales-few-fine`, `-between`, `-many-coarse` | Washed-out square of the sheet's light ground with a feathered rectangular edge and specks of residue. They read as a smudged swatch, not a scaled animal |
| `trait-S03-claws-round-feet`, `-pads`, `-digging-wedges` | Legs cut by a blurred rectangle; specks on the wedges crop |
| `trait-S02-spots-bands`, `-spots`, `-bands-and-spots` | A ragged, blurred right edge where the cut runs through the body |
| `trait-S01-eyes-thin-rings`, `-wide-pale-rings` | A soft square frame of the plate's ground round the eye |

**Fix (T-68):** re-cut these 11 on the card's ground with no rectangular feather, no sheet ground and no residue. Where the painting can't give a clean crop at 160 × 128, take a wider window that holds a clean part (a whole foot, a whole flank). Never enlarge.

## 3. Create, the gene bench (T-41)

`results/T-20261016-41/create-shape-S01-1x.png` and `comparison-create-S01.png`.

**What works:**
- one bench, everything sits on it, nothing floats (the owner's "floating" is answered);
- the founder is large, lit from the top left, on the moss dish;
- the Pods well;
- the tray recessed along the front;
- the Pods frame and ground. One style.

**Why it fails the purpose test** (gate 6; the concept's own test: "a stranger, in three seconds, says 'you change the creature by turning those'"):
- **The drums read as buttons.** At 1× they are five flat square sage tiles with a picture in each, the same shape as a well or an inventory slot. Nothing says they turn: no curved face, no edge or rib of a cylinder, no sense of the next face above and below. The focused one's turn marks are two tiny notches. The concept's object is a drum "like a tumbler", and the art carries a tile.
- **The gene line reads as a post.** A straight vertical bar at the well's right, its ends capped. It doesn't leave the well or enter the tray, so it doesn't say "the drums are fed by this pod" (concept). The AD named it the weakest piece.
- **The proof's slip is blank.** The right third is empty paper, so the composition can't be judged as the player sees it (the same stand-in rule as T-62). The chapter words over the drum groups and the founder's contact shadow are also missing as stand-ins.

**Fix (T-69):**
- drums that read as drums you turn;
- a braided line that visibly runs from the well into the tray (UI/UX gives it a wider rect if the 24 × 216 can't hold a route);
- a re-proof with stand-in slip lines, chapter words and the contact shadow.

## 4. The decision panel look (T-47)

`results/T-20261016-47/panel-grow-over-create-1x.png` and `panel-return-over-vivarium-1x.png`.

**What works** (owner 13:26: "not sold on that cream color and lots of text"):
- no cream;
- one short line;
- the housing and wells from the device plate kit;
- the veil keeps the screen behind present.

**Why it fails** (owner: "visually we must make them very interesting"; gate 4, grounded):
- **The subject floats.** In the Grow tile the juvenile's feet are about 10 px above the stage's moss, and it doesn't stand on it. The stage reads as a flat coaster, not a plinth with depth.
- **There is no moment.** The "soft pool of warm light" (README) is a faint horizontal band behind the stage, not a lit pool. The subject has no rim light from it. Each tile is mostly empty dark well above a small figure, so it reads as a form with a thumbnail, not an event.
- **The cost chips aren't there.** The README's `panel-chip-40x20` ("icons on rubber chips") is absent from both proofs. The costs are bare icons and figures.
- **The Return outcome is a pasted square.** "Return it" shows the mibi in front of a flat square crop of meadow. The outcome ("it goes back to the wild") reads as a glitch, not a picture.

**Fix (T-70):**
- the subject stands on the stage (contact shadow) and is larger in its tile;
- the stage's pool is visibly lit and rims the subject;
- the chips are in;
- the Return outcome is one painted picture of the mibi going out into the meadow;
- re-proof both.

---

## Proof (commands run and their result lines)

- Incubator proofs: `git show origin/masters-pods:art/station-masters/pods/incubator-b/proof/incubator-b-{S01,S03}-{cool,warm,glowing,ready,hatch-1100}-1x.png` (masters-pods 5fd943ae), read at 1×. The pod boxes at 2× for the shadow-over-cap check.
- T-63, T-41 and T-47 proofs: `results/T-20261016-63/`, `results/T-20261016-41/`, `results/T-20261016-47/`, at 1×. The Grow tile at 2× for the floating subject.
- Measures: T-62's five, as reported in its result (re-taken by the AD on T-63's shells). Not re-measured here.
