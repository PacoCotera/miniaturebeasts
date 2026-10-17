# Pods: tell the pods apart; every object has a job (UI/UX)

Ticket T-20261016-31, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23 (`prototypes/ui/specs/station/pods.json`, `pods.props.json`, `views/pods-props.mjs`, goldens `prototypes/face/golden/pods/`). Input: `specs/purpose-audit.md`, "Pods" and gap 3. Follow-up tickets: art T-20261016-35, build T-20261016-36.

## 0. Purpose (what the player does here)

**Know each pod you brought home, read its chapters, and choose one to create from.** The player opens a pod, identifies it, reads chapters, compares two, creates from one, or returns it to the wild. They come back when Cargo brings new pods, and for unread chapters.

## 1. What makes each pod its own (the collection)

What a well can say, from the data each pod carries (`state.mjs` pod: `species`, `idd`, `read`, `g`):

| Fact | Data | Shown today | Call |
| --- | --- | --- | --- |
| Species | `species` | the shell picture and the name plate | Keep |
| Sealed or identified | `idd` | the sealed shell vs the species' own shell; the bottom line "sealed until identified" | Keep: it reads (the golden's Tuikis against the sealed Loikas) |
| Chapters read | `read` | the ring's arcs, one per chapter, filled when read (`collection.ring`) | Keep |
| Something new to read | `podGlints` | the glint star (`collection.glint`) | Keep |
| Can be grown | `growBlock` | the can-grow mark (`collection.grow`) | Keep |
| **Where it was found** | `g`: meadow, pond, rock, wood, cave | **only on the overview** (`originPicture`, `origin`) | **Add to the well:** the place badge |

**The gap.** Two sealed pods of one species have the same shell, name and idle ring. Nothing on the well tells them apart, though the player found them in different places. The one fact that differs is where each was found, and it is the fact that makes a pod *yours* (the audit's "Found-note: keep"). So each well carries its place.

**The place badge** (`collection.origin`, new):
- **Where:** `at` [192, 144, 32, 32] in the place's own coordinates (first place: 256, 216, 32 × 32; the others by `pitch` [300, 240]).
- **Picture:** `place-{g}-32x32`, a new master painted from the same painting as `place-{g}-64x64`, never scaled (art T-35).
- **Clearances:** right of the ring (the ring's outer edge 176: 16 clear), under the can-grow mark (it ends at y 120: 24 clear), above the name plate (184: 8 clear), inside the place (288 × 224).
- **When:** every pod whose `g` is a known place (`PLACE_KEYS`), in both sealed and identified. No pod, no badge. An unknown `g` draws none.
- **Not a target:** focus stays on the place's ring, which the badge is outside of.

No "new" mark is added. A pod is fresh until identified (`fresh` clears at Identify, `state.mjs` :449), and the sealed shell already shows exactly that.

## 2. Every object: keep, change or cut

| Object | Where | Job | Call |
| --- | --- | --- | --- |
| Wells with the shell, the ring and the name | collection | Which pods you have, and how far you've read each | **Keep**, plus the place badge (§1) |
| The selected pod on its dish, with its tag | overview | This pod | **Keep** |
| Found-note: the place picture and the sentence | overview | Where it came from | **Keep** |
| Chapter rail | overview, chapter, compare | Choose the chapter to read | **Keep** |
| Kin row | overview | The Compare targets | **Keep** |
| Stamp label in its case | overview | The pod's stamp | **Keep** |
| Leaf plate (`hatch`, 600, 480, 80 × 56) | overview | Return the pod to the wild (`strings.hatchArm` "Back to the {place}? ✓ again") | **Change:** it has a job, but the sprig alone does not say it until it is focused. Add a caption (§3) |
| Hose from the top left into the ground | overview and chapter stages | None | **Cut** (art T-35) |
| Wall gauge and louvred vent, top right | overview stage | None: equipment that works for nothing | **Cut** (art T-35) |
| Compare's two pages | compare | See how two pods differ | **Keep** |

## 3. The leaf plate's caption

`overview.hatchWord` (new, text):
- **Rect:** 600, 448, 176, 24, left-aligned at 600.
- **Text:** 16 px, weight 400, `mist`. Words: "back to the {place}", with `{place}` from `strings.hatchPlace[g]` (`strings.hatchWord`, new; the copywriter confirms).
- **When:** in the same states and conditions as the `hatch` plate. When the plate is not drawn, neither is the caption.
- **Clearances:**
  - above the plate (480): 8;
  - left of the stamp case (788): 12;
  - under the kin row (280): 168, and the kin row may grow to 5 × 64 = 320 wide, still above it;
  - the longest place word ("back to the meadow") must fit 176, measured with the real measurer.
- **When focused:** the plate's existing confirmation does not change; the caption stays.

## 4. Art (T-20261016-35, the art director, by hand, no paid call)

| Id | Change |
| --- | --- |
| `room-bench-stage-overview` | Recut under the same id: lift the hose (top-left wall to the ground) and the wall gauge and vent (top right). Repaint the wall and floor in the stage's own grain. The dish, the shelf, the pool of light and the found-note's place stay pixel for pixel |
| `room-bench-stage-chapter` | Recut under the same id: lift the hose. The rest is as above |
| `place-{meadow,pond,rock,wood,cave}-32x32` | Five new masters from the same paintings as the 64s, painted at 32 (not scaled down). Each must read as its place at 1× on the well's ground: the AD's call. If one cannot, say so; do not invent a symbol |

## 5. Specs, code, tests (T-20261016-36)

- **`pods.json`:**
  - `regions.collection.origin` = { "at": [192, 144, 32, 32], "slice": "place-{place}-32x32", "when": "a pod whose place is known (PLACE_KEYS)", "note": "where it was found: tells two pods of one species apart (specs/station-pods-purpose.md)" };
  - `regions.overview.hatchWord` = { "rect": [600, 448, 176, 24], "px": 16, "weight": 400, "colour": "mist", "align": "left", "text": "strings.hatchWord", "with": "hatch" };
  - `strings.hatchWord` "back to the {place}";
  - the stage notes (if any) that name the hose, gauge or vent.
- **`pods.props.json`:** the place object gains `origin` (string or null). The overview gains `hatchWord` (string or null).
- **`views/pods-props.mjs`:**
  - the collection's place gets `origin: PLACE_KEYS.includes(q.g) ? req({ kind: "place", id: "place:" + q.g + ":32", place: q.g, size: 32 }) : null`;
  - the overview gets `hatchWord` when the hatch plate is drawn.
- **Face:** the screen code draws the badge (a picture) and the caption (the existing text word). If a size is hard-coded, stop and report it.
- **Tests:**
  - `prototypes/ui/tests/specs.test.mjs`: the badge inside the place, clear of the ring's box, the grow mark, the glint and the name plate's max box ([−16, 184, 224, 24] in place coordinates); `hatchWord` clear of `hatch`, `stampCase` and the kin row at its max.
  - The props test: a sealed pod from `pond` has `origin` set to the pond 32 picture, and a pod with an unknown `g` has `origin: null`.
  - The face test: two sealed pods of one species from different places draw different badges.
- **Goldens:**
  - retake `pods-collection` (badges), the six `pods-overview-*` (stage recut and caption), and the four `pods-chapter-page*` (stage recut);
  - `pods-compare` must not move;
  - no other screen's golden may move;
  - the journeys are expected unchanged.
- **Wireframes:** `02a-pods-collection` and `02b-pods-overview` exist only as PNGs, with no SVG source on 69ea1d23. This spec's rects are the reference. The builder records in the result that the PNGs were not redrawn. The style guide's Pods section (`design/style-guide/station-layouts.md`, Pods §5 and §6) gains the badge and the caption rows.

## 6. Open

- Words: "back to the {place}" (copywriter).
- **The wood badge (ruled, T-20261016-111): option (c), the single canopy crown, no word.**
  - **What it is:** `place-wood-32x32` becomes the crop T-105 recorded as "canopy: one crown" (from the wood's canopy painting: one lit round crown among darker ones, seen from above). The art director cuts and signs it at 32 from that painting, never scaled. No whole tree reads at 32 after three tries; this crop does read as an object.
  - **Why not the word:** "wood" under one well alone (a) would make one badge of five a word, breaking the all-picture rule the owner asked for ("little text", 13:26). A word under every well (b) adds the most text.
  - **Why it is enough:** the badge's job is to tell two pods of one species apart, and the crown does that at 1×. It is the only badge that is a lit round form. Beside meadow it differs in form and contrast, not in brightness: mean relative luminance 0.111 against 0.101, luminance spread 0.069 against 0.026, and a bluer green. Where the pod was found is said in words on the overview (the 64 px place picture and the found sentence), one ✓ away.
  - **Checked:** at 1× and 2× in the wood well's slot on `results/T-20261016-98/badges-on-pods-collection-1x.png`, beside rock and meadow.
  - **The build:** no change; the badge's slot, size and rule stand. One test is added to the Pods face test: the five place badges are pairwise different pictures, and wood's luminance spread is at least twice meadow's (form, not field).
  - **If it does not read in play:** if the owner or the CD reads it as a bush in play, the fallback is (a), with the word "wood" in 16 px `mist` at (192, 150, 64, 20) in the place's coordinates, in the badge's slot (not under the ring, where the name plate is). That would be a separate ruling.
