# T-20261016-27: the Incubator, option B (candling), in the house style (AD, 10-16, by hand in code)

The owner chose option B (12:51): the player comes to watch the pod they collected grow, and comes back to check on it. The rects are `specs/station-incubator-tabs-ruling.md` (T-20261016-23), on work-queue. The style is `design/art-direction.md` and `design/style-guide/README.md`, nothing added. No paid call.

## Step 1: the objects and their jobs (the concept's list; nothing else is drawn)

| Object | Its job, as a player reads it | Master |
| --- | --- | --- |
| The ground | The device's own matte slate: everything sits on it | `incubator-stage` |
| The ring's track and fill | How close the meeting is | `incubator-stage` (track), `incubator-ring-fill`, `incubator-ring-closed` |
| The cradle and moss nest | Holds my pod, in living moss | `incubator-cradle`, `-empty`, `-front` |
| The candling light | Lights my pod from below so I can see what is inside | the lens in `incubator-cradle`; `incubator-shell-*` on the pod |
| The pod | The one I collected and shaped (the build draws its species' shell) | (Pods' renderer) |
| The founder's shadow | What I am waiting to meet (the build derives it) | (the build) |
| The slip | What this is and what I made | `slip-208x408` |
| The just-cleared card | What is new since I last looked | `incubator-card-ground` (the build fills it) |
| The stamp | The genome, filling as chapters clear | `stamp-plate-120x120` (kept) |

**Cut:** every piece of the old machinery (risers, vents, boxes, hoses, gauges), the dome and its door and bulb, the base and plaque, the generic egg, and the leaves.

## Step 2: the ids

**Added (15):**
- `incubator-stage`
- `incubator-cradle`, `incubator-cradle-empty`, `incubator-cradle-front`
- `incubator-ring-fill`, `incubator-ring-closed`
- `incubator-card-ground`
- `slip-208x408`, and `slip-208x296` (Create's, T-20261016-41, the same paper)
- `incubator-shell-cool`, `-warm`, `-glowing`, `-seams`, `-crack-1`, `-crack-2`

**Retired from the Incubator** (B draws none of them; their files and status are kept until the build drops them, T-20261016-40):
- `room-bench-stage-incubator`
- `dome-front-304x272`, `dome-back-304x272`, `dome-inside-standby-304x272`, `dome-inside-ready-304x272`
- `base-336x96`
- `nest-208x48`, `nest-front-208x48`
- `bud-early-128x160`, `bud-late-128x160`, `bud-ready-128x160`, `bud-ready-front-128x160`, `bud-crack-1-128x160`, `bud-crack-2-128x160`
- `leaf-full-16x20`, `leaf-empty-16x20`

Only the Incubator uses these (station-gate 69ea1d23: `incubator.json` and `incubator-props.mjs`). Home's `dome-small-*`, `bud-small-64x80` and `home-chamber-*`, and Create's `chamber-*`, are not touched here.

**Kept:** `stamp-plate-120x120` (the stamp, at 772, 352).

## How each is made

- **`make-stage.py`:** Pods' clean stage, with the sage bezel pixel for pixel. The floor is repainted calm in its own large-scale tone and fine grain (Pods' dish, tag and prints are Pods' story). The ring's track is moulded in: 2 px deep, its near wall in shade, its far wall catching the top-left key.
- **`make-cradle.py`:**
  - the pedestal is moulded sage polymer in the housing's own sage, with a lit rim and a dark rubber foot;
  - the nest is the vivarium's own painted moss (`idle-vivarium-day-1024x568`, the moss bed at (760, 466));
  - the candling lens is a warm amber stadium in the pedestal's face, its light rising into the moss.
- **`make-ring.py`:** a matte sand inlay held dark so the pod stays the brightest. The build clips it to the wedge from 228° clockwise. `-closed` warms both ends where they meet the light.
- **`make-slip.py`:** Pods' paper tag shaded to toned paper (p50 (168, 150, 125)), fibre grain, a matte steel clip, a cast shade on the bench.
- **`make-shell-light.py`:** the light steps, seams and cracks, cut from the pod class's silhouette and seams redrawn at 224 × 272 (smooth curves on an 8× grid, not scaled pixels).
  - Every species of a class shares those, so one set works on every shell.
  - Re-run it on the class the build uses at 224 × 272 (see the gap below).
  - `incubator-shell-mask-224x272.png` is the silhouette it cut from.

## Step 4: the overlays, relative to the shell

All six are 224 × 272 at (0, 0) of the shell's own box (screen 400, 144), placed 1:1 over it:
- cool for f < 1/3, warm for f < 2/3, glowing for f ≥ 2/3;
- ready: glowing + seams;
- the hatch: + crack-1 at 600, + crack-2 at 800.

The nest's front (`incubator-cradle-front`, at screen 392, 392) sits over the shell's foot.

**Not painted, and why:** the origin dust or moss on the shell. Pods' renderer carries no such layer today (`podFromLayers`: shade, relief, body, accent, pattern, band).

## Step 5: proofs and measures (`proof/`)

**Proofs:**
- `incubator-b-{S01,S03}-{empty,growing,ready,hatch-1100}-1x.png`;
- `-growing-cool` is a measuring frame for the cool step;
- `comparison-{S01,S03}-half.png`: the four states beside Pods, the vivarium, `hero-kit` and `station-research-hands`.

**Stand-ins in the proofs (the build's, not masters):**
- the pod: the species' shell composed from the signed `pod-large` layers by `pods.json` `podLayers.compose`, then scaled to 224 × 272;
- the founder's shadow: the juvenile's silhouette, blurred;
- the stamp glyph: S01's, from the batch/B-20261016-1 capture.

**Brightness** (ruling §6; relative linear luminance, p95; `proof/measures.json`): the pod beats every other drawn region by at least 0.287 in every light step and ready, for both species (the rule asks 0.08).

| | S01 cool | S01 warm | S01 ready | S03 cool | S03 warm | S03 ready |
| --- | --- | --- | --- | --- | --- | --- |
| pod | 0.706 | 0.698 | 0.698 | 0.644 | 0.626 | 0.652 |
| highest other (slip) | 0.339 | 0.339 | 0.339 | 0.339 | 0.339 | 0.339 |
| margin | 0.367 | 0.359 | 0.359 | 0.305 | 0.287 | 0.313 |

The other regions:
- ring 0.259–0.338;
- cradle 0.27–0.30;
- card 0.138;
- stamp plate 0.233.

These are measured on the stand-in shells, so the build re-measures on its own.

**The stamp plate p95:** 0.233, under the R cap 0.34 (stamp ruling §3.1).

**The one test:**
- It reads as the same maker's field gear: the sage device frame and dark matte ground of Pods, the vivarium's moss, and one moulded sage device whose light visibly works on the pod. No pipes, vents, boxes, gauges, domes or wall fixtures remain.
- Weaker points:
  - in the proofs the slip and card are blank (their words and picture are the build's);
  - on a dark shell the warm step is subtle;
  - the cradle is modest beside a 224 × 272 pod.

## Gaps for the lead

1. **No pod class at 224 × 272.** Pods' renderer composes shells only at its classes: collection 88 × 112, medium 120 × 152, large 144 × 176 (`pods.json classes.pod`). At 224 × 272 it falls back to its palette drawing. Either a 224 × 272 layer set is painted (an art ticket), or the pod's rect changes to a class.
2. **The card's crops** (`trait-{species}-{trait}-{look}-160x128`, ruling §8) are not in this ticket's steps and are owed. They are cut from the trait paintings in `source/raw`, which are landscape enough.
3. **Home's module and Idle's tag** (concept §1) need their own ticket (ruling §7).
