# The Incubator, option B (candling): the layout (UI/UX)

UI/UX, ticket T-20261016-23, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23. It specs the concept the owner chose:
- `specs/incubator-concept.md` §2 B and §3 (game designer, T-25);
- `specs/owner-rulings-2026-10-16.md` (B; one rounded minute count in the context line only; the founder's shape shows inside the pod, only what is known);
- `specs/station-style-direction-incubator.md` (CD, T-24) for materials, and for the brightness rule.

**Supersedes:**
- this file's earlier version (no rail, the band left bare). Its finding stands: the tabs are the shared `chapterRail`, which Pods, Create and Cross keep;
- `specs/station-incubator-layout-spec.md` §§1–3 (grid, paint zones, the IA2 recut);
- the zone caps of `specs/station-incubator-brightness-ruling.md` §2 (the condition is restated in §6 below);
- my earlier build ticket for the no-rail version (removed from the queue in ff2b2a37). The build for this spec is T-20261016-40.

**The wireframes:** `specs/station-incubator-tabs-wireframes.patch` replaces 04, 05, 05b and 05c.

## 0. Purpose (from the concept)

The player has made a founder and wants to **meet it**. The Incubator is the wait. It shows two things at the stage's scale:
- **how close the meeting is:** the ring;
- **what they have learned about their mibi so far:** the shadow inside the pod, the just-cleared card, the slip and the stamp.

Each chapter that clears is a reveal, and the reason to come back. Every object below has that job or it is not drawn.

## 1. The grid

- **Interior:** x 71–953, y 59–548, the bezel's inner edges, measured on 69ea1d23's `incubator-empty` golden. With no rail, the top edge is the bezel's top rail at 59.
- **Margins:** 17 left and right (x 88 and 936), 21 top (y 80, the 8 grid), 18 bottom (y 530).
- **Three columns, mirrored on x 512, with 16 gutters:**
  - left 88–296 (208);
  - centre 312–712 (400);
  - right 728–936 (208).
- **Rows:** the side columns run y 96–504. The centre runs 88–488, the ring's box.

## 2. Objects, rects and jobs

| Region | Rect | Job | States |
| --- | --- | --- | --- |
| `stage` | 0, 40, 1024, 522 | The slate ground inside the bezel (art `incubator-stage`; the ring's track is recessed in it). Replaces `room-bench-stage-incubator` | all |
| `ring` | box 312, 88, 400, 400 | How close the meeting is (§3) | empty (bare track), growing, ready |
| `ring.cuts` | 24 × 24 on the track (§3) | The moment each chapter clears, as that chapter's emblem | growing, ready (founder only) |
| `pod` | 400, 144, 224, 272 | The bud's own pod: its species' shell from Pods' renderer, with the dust or moss of its place. The subject. Lit from below in steps (§4) | growing, ready, hatch to 1000 |
| `shadow` | 432, 192, 160, 192 (inside the pod) | The founder, seen through the shell: only what is known (§4) | growing, ready |
| `cradle` | 392, 392, 240, 96 | The moulded cradle, the moss nest and the candling light under it. It holds the pod (contact shadow); the light is the screen's one device and it visibly works | all |
| `cradleFront` | 392, 392, 240, 96 | The nest's near lip, drawn over the pod's foot (as Pods' dish) | growing, ready, hatch |
| `slip` | 88, 96, 208, 408 | What this is and what they made: the Create slip (§5) | growing, ready, hatch |
| `card` | 728, 96, 208, 240 | What is new since they last looked (§5). A focus target | growing, ready (founder) |
| `stamp` | 772, 352, 120, 120 | The genome, filling chapter by chapter as they clear (stamp-plate ruling; `stampCase` look). x 772 centres the label on the right column's axis 832, 4 px off the grid, as the shared slot allows | growing, ready, hatch |
| `code` | 744, 480, 176, 25 | The bud's code, live text: lineTop 480, baseline 496, rule y 504 from x 728 to 936 (the column) | growing, ready, hatch |
| `juvenile` | 360, 144, 304, 312, feet 456 | The young mibi standing on the nest | hatch from 1000 |
| `ribbon` | 312, 96, 400, 40 | "Fig, a young Loika" | hatch from 1200 |

**Clearances:**
- **The ring:**
  - its open bottom (§3) leaves 20 px each side of the cradle;
  - the pod's ink stays inside the ring's inner radius minus 8;
  - the ring's box top (88) is 8 under the top margin;
  - the side columns are 16 from the ring's box.
- **The hatch:** the ribbon ends at 136, 8 above the juvenile's box (144).
- **The bottom edge:** the code's rule (504) and the slip's foot (504) end 26 above the bottom margin.

**Gone from the screen:** the chapter rail (tabs and well), the leaves, `dome`, `domeFront`, `nest` (the old moss bed), `base`, `plaque`, `base.lamp` and `bench.paint`. The `keepClear` and `floor` blocks go too, along with every piece of machinery and the hoses and gauges.

## 3. The ring

- **The arc:**
  - centre (512, 288); radii 176 to 200 (track 24; centre line 188);
  - **open 96° at the bottom**, so the cradle stands in the gap: it runs clockwise from 228° to 132°, with angles measured clockwise from 12 o'clock, 264° in all;
  - its end caps lie at (372, 414) and (652, 414), 20 px clear of the cradle.

  A closed ring of a size that reads at the stage's scale cannot clear the cradle: the cradle would hide its bottom, and with it the fill in mid-wait. So the arc is open. This is the one departure from the concept's picture.
- **The fill:**
  - it runs from 228° clockwise, in proportion to the wait: f = (now − start) / (end − start), the bud's own times;
  - the arc is drawn in whole-degree steps, so each refresh redraws only the new degrees' box;
  - empty: the bare track; ready: full.
- **The cuts** (a founder only):
  - one per chapter that clears while it grows (`state.budChapterKnown`; chapter k of u at f = (k + 1) / (u + 1), as now);
  - each is that chapter's rail emblem, `rail-emblem-{chapter}-{unread|read}-24x24` (existing), centred on the track's centre line at angle 228° + 264° × f;
  - unread until it clears, then read. A chapter known before Grow, or a shut sealed chapter, has no cut.
- **A crossed bud:** no cuts.
- **Ready:** the fill is full, and the art's `incubator-ring` closed state is placed (the AD paints the ends meeting the light).
- **When a chapter clears:** its cut pulses once (its read emblem, then a cut: no animation beyond the swap), the card and the slip take the trait, and the stamp redraws.

## 4. The pod and its light

- **The picture:** the bud's own pod picture (`st.bud.species`, `st.bud.from`), at 224 × 272 from Pods' renderer, with its place's dust or moss. A crossed bud uses its species' shell with the home moss (concept §3, "A crossed bud").
- **The light steps:** per-species shell overlays, placed and never tinted.
  - **cool** for f < 1/3, **warm** for 1/3 ≤ f < 2/3, **glowing** for f ≥ 2/3;
  - at ready, glowing plus the seam light.
- **The shadow** (owner ruling 4), only what is known:
  - the founder's body mask from Create, derived once at Grow (a build-time derive, not painted per mibi);
  - then one layer per cleared chapter's looks, in the 160 × 192 box;
  - opacity steps with the light (cool 0.25, warm 0.45, glowing 0.65; ready the whole known founder, 0.8). These are steps, not a fade.
  - A crossed bud's shadow is the species' outline only.
- **The hatch:** the existing beats, retimed to these regions.
  - At 0 the ring and the card go and the shadow stays.
  - At 600 and 800 the shell cracks along its seams (the CD's crack overlays).
  - At 1000 the pod goes and the juvenile stands at feet 456.
  - At 1200 the ribbon.
  - At 1400 and 1800 the steps.
  - At 2600 the dither to the meet.
  - The slip, the stamp and the code stay.

## 5. The slip and the card

**The slip** (88, 96, 208 × 408). It is the Create slip at one size for both screens; T-20261016-38 uses this size. Paper ground, padding 16; text left at x 104:

| Block | Lines | Type |
| --- | --- | --- |
| Name | the species name ("Loika") | 24 px, weight 500 |
| Found-note | Pods' found sentence, up to 2 lines (a cross: "laid at home, of {A} and {B}") | 14 px, `mist` |
| Your changes | heading, then up to 3 lines "{Trait}: {look}" (none for a cross; the block is not drawn) | 16 px heading; 14 px lines |
| Cleared while growing | heading, then one line per cleared chapter, newest first, "{Chapter}: {look words}", up to 6; then "{n in words} still to come" while any remain (a founder); a cross: "read it when it's out" | 16 px heading; 14 px lines, the last in `mist` |

- **Fit:** line pitch 20 for 14 px and 24 for 16 px, with 8 between blocks. The longest case (2 found lines, 3 changes, 6 cleared and the "still to come" line) is 32 + 40 + 8 + 24 + 60 + 8 + 24 + 120 + 20 = 336 ≤ 376 (the slip minus padding). Measure every line at its size with the real measurer: ≤ 176 px, or the line is cut at a word with "…" and reported.
- **States:** shown in growing, ready and hatch; not drawn when empty.

**The card** (728, 96, 208 × 240), panel ground. Offsets are from the card's origin:

| Part | At | Content |
| --- | --- | --- |
| Heading | (16, 12), 176 × 24, 16 px, `sand` | "Just cleared". Before the first clearing: "Next to clear" |
| Picture | (24, 44), 160 × 128 | The cleared chapter's first trait that has a picture: `trait-{species}-{trait}-{look}-160x128`, a new crop at this size (art), 1:1. Before the first clearing: that chapter's emblem `rail-emblem-{chapter}-unread-24x24`, centred |
| Trait | (16, 188), 176 × 24, 16 px, weight 500, `bone` | The chapter word ("Movement") |
| Look | (16, 212), 176 × 20, 14 px, `mist` | The look in words ("a quick trot"). Before the first clearing: nothing |

- **When it is shown:**
  - a founder with at least one chapter to clear, in growing and ready;
  - ready shows the last chapter cleared;
  - a founder with every chapter known before Grow has no card (nothing will clear; the right column is the stamp and code only);
  - a crossed bud has no card (its slip says "read it when it's out").
- **Focus:** the card is a target only when it is drawn.

## 6. Focus, keys, bottom line, brightness

- **Targets:**
  - `pod`, initial: the ring is an oval, the pod box + 4 (396, 140, 232, 280), with no lift;
  - `card`: the ring 4 px out (724, 92, 216, 248), with no lift.
  - ▶ goes pod → card and ◀ goes card → pod; ▲ and ▼ do nothing. This replaces "no focus ring in any state". Two subjects now exist, but the pod alone stays the main one.
- **✓ on the pod:**
  - empty: Choose a pod;
  - growing: Grow now ❀ n (unchanged price rule);
  - ready: Open (unchanged).

  ✓ on the card: no ✓ cap, nothing happens.
- **The context line** (owner ruling 3):
  - growing: **"ready in about {n} min"**, with n = the minutes left rounded to the nearest whole, at least 1. This is the only minute count anywhere on the Station.
  - On the card: "{Chapter}: {look words}" (before the first clearing, "{Chapter} clears next").
  - Empty: "the nest is empty".
  - Ready: `strings.bud`, unchanged.
  - The hatch: as now.
- **Brightness** (CD rule, restated for these objects):
  - the pod is the brightest object;
  - in growing (each light step) and in ready, the p95 of relative linear luminance over the pod's mask exceeds the p95 of every other drawn region (slip, card, stamp, cradle, ring) by at least **0.08**;
  - the slip's paper and the card's ground are toned for that: a shaded paper, never white;
  - **UNVERIFIED** until the art lands. `incubator.test.mjs` asserts it on the builder's captures, and if it fails the builder stops and reports.

## 7. Home and Idle (from the concept)

The Home module, the Idle tag and their lamps are in the concept (§1). They are not in this ticket's rects: Home and Idle are their own screens, and they need their own ticket. **The lead should write one.** This spec only gives the event the Incubator raises: a chapter cleared, not yet seen (a `seen` flag set when the Incubator is shown with the card for it).

## 8. Art (for T-20261016-27, the queued Incubator art ticket; by hand)

| Id | Size | Notes |
| --- | --- | --- |
| `incubator-stage` | 1024 × 522 | Slate ground in the bezel; the arc's track recessed (centre 512, 248 in the slice, which is 288 on screen; radii 176–200; open 96° at the bottom) |
| `incubator-cradle` | 240 × 96 | Moulded sage polymer cradle, moss nest, candling light under it; empty and with-pod variants; `incubator-cradle-front` for the near lip |
| `incubator-ring-fill` | 400 × 400 | The fill's art as degree pieces or a mask the build steps (the AD and builder agree the form); `incubator-ring-closed` for ready |
| shell light | 224 × 272 per species | cool, warm, glowing, seam light, crack-1, crack-2 overlays |
| `trait-{species}-{trait}-{look}-160x128` | 160 × 128 | Studio crops at the card's size |
| `incubator-card-ground`, the slip paper | 208 × 240; 208 × 408 | The panel and the toned paper (§6 brightness) |

The founder's shadow is derived by the build from Create's picture, not painted.

## 9. Build: T-20261016-40

The edit list (incubator.json regions, states, focus, strings, events; props; face; tests; goldens; wireframes) is in the ticket. T-20261016-28 (already queued) draws the pod's shell in `pod`; T-40 builds everything else here.
