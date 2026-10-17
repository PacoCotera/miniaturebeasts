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


## T-20261016-62: candling (AD, 10-16)

The creative director's review (`results/review-incubator-b-art.md`, work-queue) failed the light: the pod was not lit from below, the steps barely changed, the lamp lit almost nothing and the shell was too opaque for the shadow. Repainted:
- **`incubator-shell-cool`, `-warm`, `-glowing`:** each step darkens the shell's top (the room is dim; the top-left key stays for form only) and shows the interior light through the shell from the foot upward, warm, falling off toward the top and sides.
  - cool: just on, pale, from the lower third;
  - warm: amber, from above the middle, with a core;
  - glowing: pale amber, through the whole shell, with a bright core low in the body.
- **The cradle, per step (new):** `incubator-cradle-cool`, `-warm`, `-glowing` and `incubator-cradle-front-cool`, `-warm`, `-glowing`. The lens's light rises through the moss round the pod's foot and the rim nearest the nest catches it (strength 0.5, 1.3, 2.6; ready uses glowing). `incubator-cradle-empty` is re-cut with the lamp on at cool.
- **Withdrawn:** the single `incubator-cradle` and `incubator-cradle-front` (superseded; never placed).
- **Unchanged:** `-seams`, `-crack-1` and `-crack-2`.

**The composite order (the build's):**
1. the shell (Pods' renderer);
2. `incubator-shell-{step}` (the interior light through the shell);
3. the founder's shadow, at the ruling's opacity (cool 0.25, warm 0.45, glowing 0.65, ready 0.8);
4. `incubator-shell-seams` (ready);
5. `incubator-cradle-front-{step}`.

The shadow goes over the light: it is where the founder blocks it.

**The five measures** (`proof/measures.json`):
- **Method:** relative linear luminance; pod box (400, 144, 224, 272); top rows 144–279, bottom rows 280–415; moss band (400, 400, 224, 40).
- **Inputs:** the steps and the shadow are measured on the `-noshadow` frames against the full ones. Brightness is the pod's p95 against the visible part of every other region (a later object takes its pixels).

| Species | Under-light (bottom ≥ top; bottom warmer than cool) | Steps distinct (cool→warm; warm→glowing, ≥ 12/255) | Lamp (moss glowing ÷ cool, ≥ 1.5) | Shadow (warm, inside the silhouette, ≥ 15/255) | Brightness margin (≥ 0.08) |
| --- | --- | --- | --- | --- | --- |
| S01 | warm 0.163 ≥ 0.146; glowing 0.206 ≥ 0.15; ready 0.194 ≥ 0.159. R−B: cool 4.0 → warm 43.0, glowing 43.2, ready 41.3 | 16.9; 16.1 | 1.89× | 48.7 | cool 0.206, warm 0.082, glowing 0.256, ready 0.262 |
| S03 | warm 0.232 ≥ 0.174; glowing 0.274 ≥ 0.181; ready 0.261 ≥ 0.19. R−B: cool -44.0 → warm 15.6, glowing 27.3, ready 25.9 | 17.4; 14.3 | 1.7× | 57.7 | cool 0.202, warm 0.136, glowing 0.241, ready 0.243 |

- **The shadow reads as a creature shape at 1×:** on S03 from warm on, and clearly in glowing and ready; on S01 (the dark shell) from warm, clearly from glowing.
- **Proofs** (`proof/`, both species): `incubator-b-{S01,S03}-{empty,cool,warm,glowing,ready,hatch-1100}-1x.png`, and the `-noshadow` frames for each growing step.
  - The slip and card carry stand-in content at the ruling §5 longest case.
  - **Lines over 176 px at 16:** "Found at the pond edge,", "Found under the rock ledge,", "Movement: a slow wade". The first is Pods' real found sentence's first line, so it is for the copywriter or the build's cut at a word.


**Re-taken on the 224 × 272 class (T-20261016-63):** the shells in the proofs are now the `incubator` class 1:1 and the overlays are cut on its own silhouette; the five measures in `proof/measures.json` are all still met (see `../pod-incubator/README.md`).

## T-20261016-68: the founder's shadow clipped to the translucent body

The shadow was drawn over the whole shell, so it darkened the opaque cap and straps (S03's gold cap and straps; a notch on S01's cap). Light can't pass through them, so neither can a shadow.

**The clip:** `incubator-shell-body-clip` (224 × 272, at the pod's rect 400, 144), made by `make-body-clip.py` from the `incubator` class's own layers. White; alpha = `pod-incubator-mask-body`, zero wherever `pod-incubator-mask-accent` (the cap and straps) or `pod-incubator-band` is half opaque or more, inside the `shade` silhouette.

**The composite order (the build's, replacing the one above):**
1. the shell body;
2. `incubator-shell-{step}` (the interior light);
3. the founder's shadow, at the ruling's opacity, clipped by `incubator-shell-body-clip` (its alpha multiplied by the clip's);
4. the band, cap and accent;
5. `incubator-shell-seams` (ready);
6. `incubator-cradle-front-{step}`.

Pods' renderer (`pods.json podLayers.compose`) draws the shell in one pass. The build splits nothing out: multiplying the shadow's alpha by the clip in step 3 is the same as drawing step 4 over it, and the proofs do exactly that. If the build prefers to split, the layers that go after the shadow are the `B · mask-accent` term of the compose and `pod-incubator-band`.

**The 2× check:** `proof/shadow-clip-before-after-2x.png` (S01 above S03; warm, glowing and ready; each before | after).
- **What was measured:** on the frames, the pixels of the cap, band and straps (accent or band alpha ≥ 0.5; 10 417 px), changed by the shadow (with the shadow against without).
  - Before: S01 glowing 3 286, S03 glowing 1 232.
  - After: 0 in S01 warm and glowing, and 0 in S03 warm and glowing.
  - Ready uses the same clip.
- **On the body the shadow is kept:** body pixels darkened, S01 glowing 17 368 before and 17 315 after; S03 glowing 15 369 before and 15 354 after.

**The five measures, re-taken** (`proof/measures.json`): all met.

| Species | Under-light (bottom ≥ top in warm, glowing, ready; R−B rises from cool) | Steps (≥ 12/255) | Lamp (≥ 1.5) | Shadow (≥ 15/255) | Brightness margin (≥ 0.08) |
| --- | --- | --- | --- | --- | --- |
| S01 | 0.171 ≥ 0.162; 0.218 ≥ 0.171; 0.206 ≥ 0.181. R−B 4.1 → 43.5, 43.8, 42.0 | 17.0; 16.2 | 1.88× | 41.2 | 0.260, 0.204, 0.288, 0.303 |
| S03 | 0.238 ≥ 0.182; 0.281 ≥ 0.191; 0.269 ≥ 0.201. R−B −44.6 → 15.8, 28.0, 26.7 | 17.5; 14.3 | 1.71× | 54.2 | 0.222, 0.159, 0.251, 0.261 |

- **Shadow:** lower than T-63's 48.8 and 58.0, because the silhouette's pixels on the straps no longer change.
- **Brightness margin:** higher, because the pod's brightest pixels (the lit cap) are no longer darkened.

**The owner's proof:** `proof/incubator-b-S01-glowing-1x.png`.

## T-20261016-99: the founder's shape, sharpened
The owner: "sharpen the founder shape". The shadow in the T-62/T-68 proofs was the juvenile's silhouette, fitted to the full 160 px box and blurred σ 3. In the shell it read as a soft blob, and the straps and cap cut its head away.

**The look, for the build's `shadow` derive** (`specs/face-arc-and-shadow.md` §2 leaves the look to the AD). It is in `shadow.py`, `derive(alpha, q, step)` with `PARAMS`, and the proofs use it as written.
- **The input:** the founder's alpha as Create draws it (S01: `founder-S01-base`, plus its crown layer once Face is known; S03: its painted adult). An unread look adds nothing, so its part keeps the species' plain body (ruling §4). q = known chapters ÷ chapters.
- **The fit (`FIT_W` 124, `LIFT` 10):** fitted to 124 px wide on the union of its layers, centred, feet 10 px above the box's foot. The whole outline (head, crown, legs, tail) then lies in the translucent body under the cap, and a clearing never moves it.
- **The mask (`MASK_LO` 0.47, `MASK_HI` 0.62):** a smoothstep of the alpha, so a painting's own soft ground shadow drops out and only the body casts.
- **The penumbra:** σ = 4.6 − 4.0 q (`SIG0`, `SIG_Q`), so the shape crispens with each cleared chapter: 4.6 at nothing known, 0.6 at everything (×1.0 at ready, `READY_K`).
- **Lit from below:** the far (top) edge blurs at σ × 1.45 and the near (lower) edge at σ × 0.7, mixed by row.
- **The core and colour:** the core is solid (`CORE` 1.3). The colour is `SHADOW_RGB` (36, 22, 14) at the ruling's steps: a′ = floor((a · 255 · P + 50) / 100), P = 25, 45, 65, 80.
- **The order:** still clipped by `incubator-shell-body-clip` and drawn under the band, cap and accent (T-68's order).

**The five measures, re-taken** (`proof/measures.json`; the proof's bud: cool nothing known, warm 2 of 7 with Face, glowing 4 of 7, ready all): all met.

| | Under-light (bottom ≥ top: warm, glowing, ready; R−B from cool) | Steps ≥ 12 | Lamp ≥ 1.5 | Shadow ≥ 15 | Brightness ≥ 0.08 |
| --- | --- | --- | --- | --- | --- |
| S01 | 0.179 ≥ 0.160; 0.238 ≥ 0.172; 0.235 ≥ 0.184; R−B 3.8 → 44.0, 44.9, 43.5 | 17.0; 16.2 | 1.88 | 54.8 | 0.269, 0.205, 0.310, 0.312 |
| S03 | 0.270 ≥ 0.176; 0.344 ≥ 0.183; 0.351 ≥ 0.195; R−B −47.2 → 16.3, 30.5, 30.3 | 17.5; 14.3 | 1.71 | 57.0 | 0.268, 0.207, 0.289, 0.304 |

**Proofs** (`proof/`, labelled inside):
- `incubator-b-S01-glowing-1x.png`, the growing frame;
- `shadow-steps-S01-1x.png` and `shadow-steps-S03-1x.png`: nothing cleared, 2 chapters, 4 chapters, ready, at one light (glowing; ready at ready), so only the knowing changes.

## T-20261016-124: the closed ring re-cut to differ only at the ends
The face redraws only where `incubator-ring-closed` differs from `incubator-ring-fill` (`specs/face-arc-and-shadow.md` §1). The old closed ring's warmth fell off exponentially and never reached zero, so the two differed all round the ring: 16,471 px in a 394 × 332 box.

**The change** (`make-ring.py`): the warmth now falls smoothly to exactly zero 12° from each end. Everywhere else the closed ring is the fill, pixel for pixel. The fill rebuilds byte for byte.

**The difference:**
- **Pixels:** 1,451, none by 64 or more.
- **The box:** (30, 291, 340 × 41) in the picture, which is **(342, 379, 340 × 41) on screen**. That is 13,940 px to redraw at ready (ceiling 153,600). The two ends sit 280 px apart, so a box holding both warmed caps is 340 wide.

**Proof:** `proof/ring-closed-recut-1x.png`. The ring's bottom at 1× (fill, the old closed, the re-cut), each closed one with its differing pixels in red.

**Lab sweep (T-20261016-128):** `slip-208x408` (this screen) and `slip-208x288` (Create): withdraw when T-126's display art lands (T-20261016-130 has painted it). Not deleted.
