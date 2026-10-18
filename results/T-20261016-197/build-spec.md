# Cargo: the build spec (T-20261016-197)

This spec is for the builder. It replaces the layout and the opening in `prototypes/ui/specs/station/cargo.json` on station-gate. Everything not named here keeps its current rule there: the Dock rules, `conditions`, the hand-off to Pods, the oldest-first landing and the frame.

**Sources:**
- UI/UX's crate-by-crate structure (`ui-ux.md`): the hand-off, no focus and the bottom line.
- What a crate holds and where each thing goes (`results/T-20261016-197/game-designer.md`), and the follow-up truth rulings on the whole-screen layout:
  - the fourth berth for a portrait crate;
  - no place badge, because a crate records no place;
  - one shared waiting spot.
- The art director's finish pass and masters list (`finish/art-director.md`, with its stills and `finish/make-cargo-finish.py`).
- The owner approved Cargo at 21:51.

All rects are `[x, y, w, h]` in screen pixels at 1× on 1024 × 600. The stage is the frame's `(0, 40, 1024, 522)`; the top bar (40) and the bottom line (38) are the frame's own (`frame-top-bar-1024x40`, `frame-bottom-line-1024x38`). Every image is placed at 1:1. Nothing is scaled, and nothing is anti-aliased.

## 1. Regions

| Region | Rect | Draws |
| --- | --- | --- |
| `bay` | 16, 46, 992, 506 | one image, `cargo-bay-992x506` (to cut, §5): the back wall, the floor and the bay's one light from the top left. Radius 6, with the frame's inner shade, as every window |
| `hatch` | 24, 150, 160, 260 | shut: `hatch-shut-160x260` (to cut), with `ring-hatch-80x56` at (64, 166). Open: `pods-hatch-open-160x260` (to promote) |
| `hatch.wells` | centres, from the hatch's origin: (49, 60), (103, 58), (49, 120), (103, 119), (50, 180), (104, 182), in rack order | a stored pod is the `list` class, 40 × 48 (`pod-well-*` layers), its box at (cx − 20, cy − 26) |
| `hatch.wellLit` | a 64 × 64 box centred on the well | `well-lit-64x64` (to cut): the mint ring (2 px, radius 25) and its pool, one image |
| `hatch.strip` | 32, 382, 144, 20 | the find strip. A find is `find-{kind}-16x16`, at (36 + 20 i, 384) |
| `waiting` | 24, 424, 160, 80 | the mat, drawn in code: radius 8, fill `#383e36`, a 1 px outline `#546052`, a 1 px top line `#282c26` from x + 8 to x + w − 9 |
| `waiting.pods` | on the mat | up to three stored pods (40 × 48, `pod-well-*`), oldest at the left, 8 apart, the row centred on x 104; each box's top at 434, with `cargo-store-shadow-48x14` at (box x − 4, 474). A fourth or more: the row starts at x 32 (boxes at 32, 80, 128), and "+{n}" (13, `fog`) right-aligned at x 180, centred on y 458 |
| `display` | 200, 60, 800, 180 | the open crate's contents, in one row (§2) |
| `berths` | 200, 252, 800, 292 | the berths (§3) |

The top bar's left zone reads **"Bay"** (`title.word`). Its materials (`frame.json regions.materials`, 384, 8, 256, 24) are where materials land.

## 2. The display row

Contents rise into the display when a crate opens. They sit in one row, centred on x 600, in this order, 16 apart within a kind and 24 between kinds. Every item's feet are on y 220.

| Kind | Image | Box | Extra |
| --- | --- | --- | --- |
| pods | the `collection` class, 88 × 112 (`pod-collection-*`) | top at 108 | a species new to the player: `glint-star-12x12` at (box x + 78, 104) |
| finds | `find-{crystal,pearl,shard}-112x112` | top at 108 | — |
| materials: Energy, Data, Essence | `cargo-{energy,data,essence}-72x96` | top at 124, with `cargo-store-shadow-72x21` at (x, 210) | its amount "+{n}" (22 medium, `bone`), 8 right of the object, centred on y 180. One object per material, whatever its amount |

**When the row is wider than 800:**
1. The materials use `cargo-*-48x64` (top at 156), `cargo-store-shadow-48x14` at (x, 214), and "+{n}" at 16 px.
2. If the row is still wider, the finds after the first stay in the crate, unseen. They rise into the display once the materials have left (they leave first, §4).

## 3. Berths

- **Walk crates (at most three):** three berths of 256 × 292 at x 200, 472 and 744 (16 apart), y 252, in arrival order.
- **With a portrait crate in:** four berths of 188 × 292 at x 200, 404, 608 and 812. The portrait crate takes the fourth, and opens last. A sitting's crate does not count against the three (`design/proposals/the-portrait.md` §8).

| Berth state | 256 berths | 188 berths |
| --- | --- | --- |
| the recess (always under a crate) | `berth-recess-256x292` (to cut) | `berth-recess-188x292` (to cut) |
| empty: slatted and shut | `berth-shut-256x292` (to cut) | `berth-shut-188x292` (to cut) |
| crate sealed | `crate-sealed-256x176`, its top at berth y + 102 (feet 14 above the berth's foot); `crate-shadow-256x24` at berth y + 260 | `crate-sealed-176x121` at (berth x + 6, berth y + 157); `crate-shadow-176x16` at (berth x + 6, berth y + 266) |
| crate lifting | `crate-lifting-256x200` at berth y + 91: its foot is 13 above its canvas foot, so the feet line holds (to promote) | `crate-lifting-176x138` at (berth x + 6, berth y + 132) |
| crate done | `crate-sealed-256x176-done` (to cut: the sealed crate at value × 0.72, hue kept) | `crate-sealed-176x121-done` and `crate-sitting-176x121-done` (to cut, the same way) |
| portrait crate | — | `crate-sitting-176x121`: the signed sitting crate, the same object as Home's portrait crate (`crate-sitting-48x40`), placed as the sealed crate. **The fourth berth carries the difference,** drawn in code: a 2 px edge in `gold`, a rounded rect from (berth x − 3, berth y − 3) to (berth x + 190, berth y + 294), radius 9; outside it a 1 px keyline `#5a400c`, from (berth x − 5, berth y − 5) to (berth x + 192, berth y + 296), radius 10 (`finish/make-portrait-in.py`, `finish/cargo-portrait-in.png`) |

## 4. The opening, per crate (replaces `events.opening.crate`)

Times are in ms from the crate's start. Each travel is one sprite at 1:1, on a straight line, eased in and out with `cargo.json regions.travel.ease` and a 600 ms duration, never leaving the bay.

| At | Does |
| --- | --- |
| 0 | the crate's sealed image cuts to its lifting image in its berth |
| 200 | its contents appear in the display: the 180 ms stage dither |
| 500 | **the materials answer:** each present material's top-bar icon flashes (`frame.json` flash, 240 ms) |
| 700 | **the materials go,** 150 apart, Energy, Data, Essence: each object travels from its display box to its top-bar icon's centre. On arrival it cuts out, and the counter ticks with the flash, showing the same "+{n}" |
| 1500 | **the hatch answers:** it cuts from shut to open, showing the free wells. Only if the crate has a pod or a find |
| 1700 | **the pods go,** one at a time, 300 apart, in display order. Each travels at 88 × 112 to its well (target box: the well centre minus (44, 90), so its feet meet the well pod's). As it lands, it swaps to the 40 × 48 well pod by the 180 ms dither, and `well-lit-64x64` shows on that well |
| — | **no free well:** the pod travels instead to the waiting row's next place (target box: that place minus (24, 64)) and swaps there by the dither. The middle slot reads `strings.subjects.waitingOne` (or `waiting` for several) |
| after the pods | **the finds go,** 300 apart, the same way, to the strip, swapping to 16 × 16 by the dither |
| last item + 300 | the hatch cuts to shut (it stays open after the last crate if any pod came, §6). The crate cuts to its done image. The display is empty |

- **The crate's length:** `1700 + 300 × max(0, pods + finds − 1) + 600 + 180 + 300`. With no pod and no find: `700 + 150 × (materials − 1) + 600 + 300`. The host sends each crate's length, and their sum is the event's `ms`, with the hold 20 longer (the current `byCrates` table goes).
- **Order:** crates open left to right, the portrait crate last.
- **The portrait crate:** at 200 its painting appears in the display's centre: the 48 × 40 frame with its 40 × 30 picture, as §8.5 says. At 700 it travels to (−200, 40), the one travel allowed to leave the bay, out at the top left; the screen does not follow it. Nothing else is in it; its length is `700 + 600 + 300`.
- **Reduced motion:** every travel is a cut to its end, and every dither is a cut (§8.3).

## 5. Masters

**Placed** (station-gate `prototypes/ui/assets/masters/pods/`, used as they are):
- `cargo-bay-992x320`;
- `crate-sealed-256x176`, `crate-shadow-256x24`;
- `cargo-{energy,data,essence}-72x96` and `-48x64`;
- `cargo-store-shadow-72x21`, `-48x14`;
- `find-{crystal,pearl,shard}-112x112` and `-16x16`;
- the `pod-collection-*` and `pod-well-*` layers;
- `glint-star-12x12`, `ring-hatch-80x56`;
- the frame's top bar, bottom line and caps.

**To promote** (from `art/station-masters/pods/concepts/panels-cargo/`, registered at the anchors above):
- `crate-lifting-256x200`;
- `pods-hatch-open-160x260`.

**To cut** (from placed art or code, with no painting; each made by a script beside `finish/make-cargo-finish.py` and checked against the stills):
- `cargo-bay-992x506`: `bay_base()` plus `bay_light()`, with no berths;
- `hatch-shut-160x260`: `cargo-bay-shut-976x304` cropped at (40, 20);
- `berth-recess-256x292` and `-188x292`: `berth()` with no crate;
- `berth-shut-256x292` and `-188x292`: from the same slatted door;
- `well-lit-64x64`;
- `crate-sealed-256x176-done` and the 176 done cuts.

**Placed as 176 reductions** (masters-pods 10f46a5a: the signed 256 masters reduced at build time, with no painting):
- `crate-sealed-176x121`;
- `crate-lifting-176x138`;
- `crate-shadow-176x16`;
- `crate-sitting-176x121`.

There is no painting request: the masters list is complete.

## 6. States, keys and the bottom line (replaces `states`, `keys`, `line` and `strings` where named)

**States:**
- `bay`: at rest;
- `opening`;
- `end`: after the last crate, until a key.

`report`, the `report` region, the `ribbon` and the `rack` region all go.

| State | Shows | ✓ | Middle | ← |
| --- | --- | --- | --- | --- |
| `bay`, crates waiting | the crates sealed; the hatch shut; any waiting pods on the mat | **"Open them all"** (one crate: **"Open it"**): `events.opening` | empty, or the waiting line | Home, the ring on the Bay module |
| `bay`, nothing in | every berth slatted and shut; the hatch shut; the mat bare | none (no ✓ cap) | empty, or the waiting line | Home |
| `opening` | §4 | **"Skip"**: the current crate cuts to its end (everything arrived), and the next crate starts | the waiting line when a pod has just gone to the mat, else empty | lets the current crate finish as a cut, then Home |
| `end`, pods came | every crate done; the hatch open, the arrived pods' wells lit | **"Look at the pods"**: the jump to Pods, the ring on the newest pod | empty, or the waiting line | Home |
| `end`, no pods | every crate done; the hatch shut | none | empty, or the waiting line | Home |

**Strings:**
- `open` becomes "Open them all", with `openOne` "Open it";
- new: `skip` "Skip";
- `newPods` becomes "Look at the pods" (one and few);
- `done`, `ribbon` and the subjects `crates`, `cratesOne`, `empty`, `away`, `opening` and `report` go. The middle slot is empty unless a pod waits;
- `waiting` and `waitingOne` stay.

**Other rules:**
- **No focus ring** in any state (`focus` unchanged).
- **A Dock while the bay shows:** each crate cuts in, in its berth, sealed. There is no slide and no door.
- **A Dock during the opening** waits for `end`, as now.
- **The end state** goes back to `bay` on the next key, after that key's action.

## 7. The dock panel's windows (T-20261016-195)

**Not in this build: the whole of §7 is a follow-on.** No dock-panel code exists on station-gate yet (the dock's choice strip is not in `prototypes/station` or `prototypes/caddy`), so "Open the bay" goes with "Later" into the follow-on that builds the two-window panel (T-20261016-195), after the Home build. This build ships §1–§6. The window specs below stand for that follow-on.

The panel is "Open the bay | Later", with two windows of 474 × 468 at (24, 76) and (526, 76).

- **Open the bay:** `crate-open-432x272` at (45, 236), centred, its feet 36 above the window's foot (y 508), with `crate-shadow-432x24` at (45, 496). The crate's inner light takes the lifting crate's warm colour (the art director's note).
- **Later:** Home's own screen at 1:1, clipped to the window and offset so that Home's Bay module's right and bottom edges sit 16 px inside the window's right and bottom edges. Its lamp is amber (`home-lamp-amber-12x12`), with the crates' fronts in its berths, as Home draws them.
  - There is no new painting.
  - It waits on the Home build, like the rest of §7.

## 8. Build answers (the builder's questions on 28143fb2)

Question 1 ("Open the bay") is answered in §7: it moves to the follow-on. Question 2 is the architect's, and 6–8 are the art director's.

### 8.3 Per-crate lengths and reduced motion
- **Yes:** the host sends a per-crate start table in the props, `regions.opening.starts` (ms from the event's start, one per crate, the first 0), built from §4's lengths. The event's `ms` is the last start plus the last length, with the hold 20 longer.
- **`opening_clock`** takes crate k as the last with `starts[k] <= elapsed`, and `lt = elapsed − starts[k]`. `perCrate` goes.
- **Reduced motion:** the event ends at once, as now. The host stages `regions.opening.crate` and `.at`, stepping `at` through the same step times as §4 (0, 200, 500, 700 and each material's 150 after it, 1500, each pod's and find's start, last + 300). Each step is a cut to its end state: an item that travels is drawn at its destination from its start time, already swapped to its stored size. The total time is the same, so Skip and ← behave alike in both modes.

### 8.4 Skip and ← during the opening

This amends `focus.held`.
- **While the opening holds,** the face sends `confirm` and `back` on "room" as well as `room:<x>`. The pad still sends nothing.
- **`confirm` (Skip):** the host applies the current crate's end state at once:
  - every content at its destination;
  - the counters at their final values;
  - its pods in their wells or on the mat;
  - the crate done.
  
  It then restarts the event for the remaining crates, with `starts` rebased to 0. On the last crate, Skip goes to `end`.
- **`back` (←):** the host applies the current crate's end state exactly as Skip does, opens no further crate, and goes to Home with the ring on the Bay module. The crates not yet opened stay sealed in their berths, so Home's Bay lamp stays amber, and the next visit opens them.
- **A room key** during the hold does the same as ←, then opens its room.
- **A Dock** during the hold waits for `end`, as now.

### 8.5 The portrait crate's data path
- **The fourth berth** comes from `sitting.mjs readyCrates(st, settings, now)`. The berth shows the oldest ready crate (by `start`), and at most one at a time. A second ready crate takes the berth on the next visit, after the first is opened.
- **cargo-props** gains `sittingCrate`: that crate's id, its mibi, and the picture request below. It also gains the layout flag `berths: 4` whenever `sittingCrate` is set, docked or away. Away, the walk berths are slatted and shut, and the portrait crate alone is ready: ✓ "Open it".
- **`walkCrates`** is unchanged.
- **The opening** (`intents/cargo.mjs` `openRun`) adds the portrait crate as the last crate of the run. Its end step calls `openSittingCrate(st, id, settings, now)`, which marks the portrait delivered. Its ribbon value is unused, since the ribbon is gone (§6).
- **The display's painting:**
  - with a digest: the Habitat card's portrait request, `{ kind: "portrait", id: "portrait:<digest first 16>:40x30", digest: mibi.portrait.digest, size: [40, 30] }`, placed inside `sitting-frame-portrait-48x40` (the picture at the frame's (4, 4)), the pair 48 × 40 centred in the display;
  - with no digest (the first build paints none): the frame `sitting-frame-portrait-48x40` alone.
  
  The pair travels and leaves as §4 says.

