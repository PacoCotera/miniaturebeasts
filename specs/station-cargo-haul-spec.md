# Cargo: the larger haul on the shelf (UI/UX layout spec)

UI/UX, for the Station lead. Written 2026-10-15 21:20 (America/Mexico_City). Placement, states and rules only. The art is the art director's and is ready; the build is the builder's.

**Contract (read first).**
- Precedence: (recorded decision) and the docs and code on main win over every design document, this one included.
- The visible-change freeze and the whole-screen gate stand.
- "Every state composed" (design/style-guide/station-layouts.md rules 1–5) applies.
- The judge is `specs/gate-recalibration.md` (f4126b0), all seven checks. The ones this answers are:
  - 2: containers that show what they carry, at a size that reads beside the 432 crate;
  - 4: each on the floor with its own contact shadow;
  - 5: even gaps, measured.
- station-layouts.md "Gaps: at least 8 px between regions; no region touches another" is a doc on main, and it binds the rects below.
- No paid call; no new art is asked.
- Amends R5 "Containers" and "Containers' shadows" of `specs/station-fix5-cargo-spec.md`, as amended 08:05 (the report in the housing). Every other rule there stands.
- The open crate's pods are not this spec's: the art is the AD's (masters-pods 51cb3c98, the found field egg). Their places stay:
  - the three wells in the open crate at (364 / 468 / 572, 104), 88 × 112;
  - the rack wells at (184 + 112 i, 408), the pod at well + (4, 8).

**Read at.**
- Code: public `station-gate` b6e2d6b: `cargo.json`, `cargo.c`, `cargo-props.mjs`, `cargo.test.mjs`, `specs.test.mjs`, `cargo-props.test.mjs`, `policy-families.test.mjs`, `asset-policy.mjs`, the wireframe `17a-cargo-opening.svg`, and the goldens `cargo-opening-*`.
- Masters: `masters-pods` 51cb3c98, which contains 4651d3e1, where the haul pieces were cut. Measured pixel by pixel: `cargo-energy-72x96`, `cargo-data-72x96`, `cargo-essence-72x96`, `cargo-store-shadow-72x21`, and the reworked `crate-open-432x272` / `crate-sealed-432x272`.

## 0. What I measured

| Piece | Box | Ink (x in the slice) | Last ink row | Note |
| --- | --- | --- | --- | --- |
| `cargo-energy-72x96` | 72 × 96 | 12–59 | 95 | the battery cell |
| `cargo-data-72x96` | 72 × 96 | 5–65 | 95 | the cartridge |
| `cargo-essence-72x96` | 72 × 96 | 18–53 | 95 | the vial |
| `cargo-store-shadow-72x21` | 72 × 21 | 6–71 (alpha > 0) | — | core row 11, centroid x 37.7: it falls slightly right, as the light asks |
| `crate-open-432x272` (reworked) | 432 × 272 at (296, 72) | 20–405 in rows 168–264, so **screen 316–701** beside the containers | 260, screen 332 | sealed: last ink row 261, screen 333 |

- **The bay floor** (cargo.json): from about y 240 to 352, the lip to 356. The door is 24, 56, 976 × 304.
- **Where the haul is drawn at that scale:** only `regions.stores`, the opening, from the 800 ms counter tick to the crate's end. The report's Gathered row uses 16 px icons, and Home draws no haul. No other place changes.

## 1. Placement

The containers grow from 48 × 64 to 72 × 96 and keep their feet line, **y 336**: the front of the floor, the closer's feet within 3 px. The order follows the top bar, read left to right: energy left of the closer, then data and essence right of it.

| Region / place | Rect (x, y, w, h) | Id | Shadow (rect, id) |
| --- | --- | --- | --- |
| `stores` (bound) | **216, 240, 672, 96** | — | — |
| energy | **216, 240, 72, 96** | `cargo-energy-72x96` | 216, 325, 72, 21, `cargo-store-shadow-72x21` |
| data | **736, 240, 72, 96** | `cargo-data-72x96` | 736, 325, 72, 21, same |
| essence | **816, 240, 72, 96** | `cargo-essence-72x96` | 816, 325, 72, 21, same |
| (reserved, not built) a find | 136, 240, 72, 96 | — | — |

- Each shadow's core row (11) lies on the feet line 336, so its rect is (place.x, 336 − 11). It reaches y 345, inside the floor (352) and the door (360).
- **The region rule.** Every rect is on the 8 px grid and 8 px from its neighbour: energy's right edge 288 to the closer at 296, the closer's right 728 to data at 736, and data's right 808 to essence at 816.
- **The ink gaps** (what the gate measures):

  | Between | Gap |
  | --- | --- |
  | Energy (ink right 275) and the closer (316) | **40** |
  | The closer (701) and data (ink left 741) | **39** |
  | Data (ink right 801) and essence (ink left 834) | **32** |

  The haul stands nearly symmetric about the closer, with even gaps. Essence's ink ends at 869, 131 px inside the bay's inside right (1000).
- **Why the order changed.** Today data stands left, beside energy.
  - At 72 px with the 8 px rule, the old order (energy, data | closer | essence) measures ink gaps 25, 34 and 52. That is the uneven spacing the gate fails, and it comes from the vial's narrow ink and the crate's wider right pad.
  - The order still follows the top bar's ⚡ ◆ ❀ from left to right.
  - The reserved find place mirrors data across 512, so a future find makes it 2 + 2.
- **Travel and pods:** unchanged. The pods travel over the containers, as now ("the travelling pods draw over the containers"). `regions.travel` stays 176, 72, 672 × 472 and still holds the closer and the wells. It no longer has to hold the containers: energy starts at 216, inside it, while essence reaches 888, outside it. The invariant moves to the bay's inside.

## 2. States and frames touched

| State / frame | Main object | The haul |
| --- | --- | --- |
| Bay (crates, waiting, shut, away) | as fix 5 | Not drawn (opening only) |
| Opening 0–799 (sealed, lid lifting, ribbon at 500) | the closer | Not drawn |
| **Opening 800 → the crate's end (3000)** | the closer, open | Each material this crate brought, cut in at 800 with the counter tick (also with reduced motion), each with its shadow, at the places above; still to the end; pods travel over them from 1200 |
| Next crate (a cut at k × 3000) | the next closer, sealed | Cut out; back at that crate's 800 |
| Report (a cut at crates × 3000) | the plate on the door | Not drawn |

The show rule is unchanged: a container shows only when the crate brought that material (`play.gained.k > 0`). No digits; never kept.

**Goldens that move:**
- `cargo-opening-800`, `cargo-opening-1200` and `cargo-opening-1650`, and `golden/cargo/cargo.json`'s hashes.
- No other golden moves: the bay states, `-0`, `-200`, `-500`, `-end` and the reports draw no haul.
- Home is untouched. The Cargo journeys hold no haul rects and are expected unchanged.
- If the Cargo containers drop-in (the 20:49 brief, plus the 20:58 pods addendum) is not yet merged, take these three once, on top of it.

## 3. Dirty area

These are computed, not measured: the face could not be built here (no emsdk). LVGL joins a container and its shadow (union 72 × 106 = 7,632 < 6,912 + 1,512). It does not join data and essence (union 16,112 > 15,264).

| Frame | Ceiling | Today (computed) | This spec (computed) |
| --- | --- | --- | --- |
| **The 800 ms cut** (`cargo.test.mjs` "the 800 ms cut") | 12,288 → **24,576** | 3 × 48 × 71 = 10,224 | 3 × 72 × 106 = **22,896** (+12,672) |
| The cut to the next crate (k × 3000): the open closer and haul → the next sealed closer | not asserted today → **add ≤ 306,064** (the closer cut's ceiling) | closer 117,504 + haul 10,224 + ribbon | closer 117,504 + haul 22,896 + ribbon ≤ 24,320, so about 165,000 |
| The last crate → the report (≤ 346,478) | unchanged | — | Unchanged: the haul (y 240–346) lies inside the door's rect (24–1000 × 56–360), which the report cut repaints anyway |
| The bay → the first closer (≤ 306,064) | unchanged | — | Unchanged: no haul at 0 |
| crateIn: the Dock cut ≤ 303,454, a slide refresh ≤ 153,600 | unchanged | — | Unchanged: crateIn draws no haul |

- The AD estimated +11,500. The computed delta is +12,672, on the 800 ms frame, which is not crateIn.
- 306,064 and 346,478 are the opening's two cut ceilings. The 98,944 in the rework brief is the Incubator's hatch ceiling, and 173,056 is the Probe's install cut: neither is Cargo's.
- If the measured 800 ms frame passes 24,576, stop and report; do not raise the ceiling further.

## 4. Spec edits (old → new)

**`prototypes/ui/specs/station/cargo.json` `regions.stores`**

| Key | Old | New |
| --- | --- | --- |
| `rect` | `[184, 272, 600, 64]` | `[216, 240, 672, 96]` |
| `size` | `[48, 64]` | `[72, 96]` |
| `feetY` | 336 | 336 (unchanged) |
| `places` | energy `[184,272,48,64]`, data `[240,272,48,64]`, essence `[736,272,48,64]` | energy `[216,240,72,96]`, data `[736,240,72,96]`, essence `[816,240,72,96]` |
| `shadow` | `cargo-store-shadow-48x14`, `at [0,57]`, `size [48,14]`, "centred on 336" | `cargo-store-shadow-72x21`, `at [0,85]`, `size [72,21]`, `core 11`, `offGrid "its core row 11 on the feet line 336"` |
| `pictures` | `cargo-*-48x64` | `cargo-energy-72x96`, `cargo-data-72x96`, `cargo-essence-72x96` |
| (add) | — | `"ink": { "energy": [12,59], "data": [5,65], "essence": [18,53] }`, `"closerInk": [316, 701]`, `"order": "energy left of the closer; data, then essence, right of it: the top bar's order read left to right; 8 px between rects, ink gaps 40, 39, 32 (specs/station-cargo-haul-spec.md)"` |

**Docs**
- `design/style-guide/station-layouts.md`, Cargo opening table (:934), the "Containers" row: "48×64 at (184, 272), (240, 272), (736, 272), feet on 336, each with `cargo-store-shadow-48x14` at y 329" becomes "72×96: energy (216, 240) left of the closer, data (736, 240) and essence (816, 240) right of it, feet on 336, each with `cargo-store-shadow-72x21` at y 325 (its core on 336)". The ids become `cargo-energy-72x96`, `cargo-data-72x96`, `cargo-essence-72x96`.
- The masters table (:1000): `cargo-store-shadow-48x14` becomes `cargo-store-shadow-72x21` (72×21).
- `specs/station-fix5-cargo-spec.md` R5: the "Containers" and "Containers' shadows" bullets are superseded by this spec (addendum line added).

**Wireframe (SVG only).** `specs/station-cargo-haul-wireframes.patch` applies to `design/style-guide/station-layouts/17a-cargo-opening.svg` at station-gate b6e2d6b (`git apply --check` clean). It encodes the three containers at their new rects and their shadows at y 325, with the label.

## 5. Tests to change

- `prototypes/ui/tests/specs.test.mjs` :661, the stores loop:
  - `inside(p, R.travel.rect)` becomes `inside(p, R.bay.inside)`;
  - the shadow check becomes `p[1] + R.stores.shadow.at[1] + R.stores.shadow.core === R.stores.feetY`;
  - keep `gapOk(p, R.crate.rect)` (8 px) and `p[1] + p[3] === 336`;
  - add: the ink gaps (energy to `closerInk[0]`, `closerInk[1]` to data, data to essence) each between 24 and 48; the rects 8 px apart pairwise; each shadow's bottom ≤ 352.
- `prototypes/face/tests/cargo.test.mjs`:
  - :276: the ids become `["cargo-energy-72x96", "cargo-essence-72x96"]`;
  - :282–284: the 800 ms ceiling 12288 → 24576, in the title and the assert;
  - :297: the logged container rect becomes `[R.stores.places.data[0], R.stores.places.data[1], R.stores.size[0], R.stores.shadow.at[1] + R.stores.shadow.size[1]]`, which is `[736, 240, 72, 106]`; the "off its place" example becomes `[744, 240, 72, 96]`;
  - new: with two crates, the cut at 3000 (crate 0 open with all three containers → crate 1 sealed) printed and ≤ 306,064.
- `prototypes/station/tests/cargo-props.test.mjs` :215, :220, :221, :229: the ids `cargo-*-48x64` → `cargo-*-72x96`.
- `prototypes/station/tests/policy-families.test.mjs` :70: `cargo-store-shadow-48x14` → `cargo-store-shadow-72x21`.
- `prototypes/face/tools/cargo-regions.mjs`: reads cargo.json; no number changes. Re-run it.

## 6. Builder instructions (self-contained)

You place the larger haul on Cargo's opening on your own branch off `station-gate`. Build it after the Cargo containers drop-in, or on top of it.
- Commits by Paco Cotera <paco@cotera.org>, no trailers, no model or session names. Push only your own branch, never force.
- No paid calls. `place-masters` only with `--only --ids`, never `--status`.
- Report in a few lines: the head, CI, the goldens that moved, the measured 800 ms frame and the crate-to-crate cut.

1. **Masters.** Place from `masters-pods` (4651d3e1 or later):
   ```
   node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods --only --ids cargo-energy-72x96,cargo-data-72x96,cargo-essence-72x96,cargo-store-shadow-72x21
   ```
   - In `prototypes/ui/asset-policy.mjs` (PAINTED), change `/^cargo-(energy|data|essence)-48x64(:\d+x\d+)?$/` to `…-72x96…` and `/^cargo-store-shadow-48x14$/` to `/^cargo-store-shadow-72x21$/`.
   - Remove the four retired ids (`cargo-energy-48x64`, `cargo-data-48x64`, `cargo-essence-48x64`, `cargo-store-shadow-48x14`) from `prototypes/ui/assets/masters/index.json` with their files. No screen names them after step 2.
   - In `prototypes/station/src/art.mjs` :34, the shadow row names `cargo-store-shadow-72x21`.
2. **`prototypes/ui/specs/station/cargo.json` `regions.stores`.**
   - `rect [216,240,672,96]`, `size [72,96]`, `feetY 336`.
   - `places { energy: [216,240,72,96], data: [736,240,72,96], essence: [816,240,72,96] }`.
   - `shadow { slice: "cargo-store-shadow-72x21", at: [0,85], size: [72,21], core: 11, offGrid: "its core row 11 on the feet line 336", when: "with its container" }`.
   - `pictures { energy: "cargo-energy-72x96", data: "cargo-data-72x96", essence: "cargo-essence-72x96" }`.
   - Add `ink { energy: [12,59], data: [5,65], essence: [18,53] }`, `closerInk [316,701]`, and the `order` note: energy left of the closer, data then essence right of it, 8 px between rects.
   - Everything else is unchanged: the show rule, the 800 ms cut, the travel, the pods.
3. **Code.** No change is expected: `cargo.c` and `cargo-props.mjs` read the size, places, shadow and pictures from cargo.json. If a 48, 64, 57 or 14 is hard-coded for the containers, stop and report it.
4. **Tests.**
   - `specs.test.mjs` stores loop: inside the bay's inside, not the travel; the shadow core on 336; the ink gaps 24 to 48; 8 px between rects; the shadow's bottom ≤ 352.
   - `cargo.test.mjs`: the ids, the 800 ms ceiling 24,576, the container's logged rect `[736,240,72,106]`, a new assert that the crate-to-crate cut is ≤ 306,064.
   - `cargo-props.test.mjs`: the ids.
   - `policy-families.test.mjs`: the shadow id.
   - If the metrics vectors check names the new ids, regenerate them with the house measurer.
5. **Wireframe and docs.**
   - Apply the SVG patch to `design/style-guide/station-layouts/17a-cargo-opening.svg` and re-render its PNG. The patch puts the containers at 216, 736 and 816 (y 240, 72 × 96) and the shadows at y 325, 72 × 21.
   - In `design/style-guide/station-layouts.md`, the Cargo "Containers" row and the masters table row take the ids and rects of step 2.
6. **Goldens, last.**
   - Retake `cargo-opening-800`, `cargo-opening-1200`, `cargo-opening-1650` and the hashes. No other golden may move; stop and report if one does.
   - Print the 800 ms frame (expect about 22,896, ≤ 24,576) and the crate-to-crate cut (≤ 306,064).
   - Produce the whole 1× Cargo captures at opening 800 and 1650 for the art director's sign-off beside ref-1…10.

The SVG patch for step 5 is `specs/station-cargo-haul-wireframes.patch`, 27 lines.

## 7. For the art director and the creative director

- **CD:** the haul's order changes (data moves right of the closer) to even the gaps. The ink gaps are 40, 39 and 32, against 25, 34 and 52 for the old order at 72 px. The CD judges it at 1× beside ref-1…10.
- **AD, the closer's feet** (from the drop-in, not this spec): the reworked crate's last ink row is +261 sealed and +260 open, so its feet are at y 333 and 332. Its shadow `crate-shadow-432x24` stays centred on 337, the signed crate's feet. The haul's feet are on 336. Check at 1× that the closer does not float about 4 px over its shadow. If it does, nudge the shadow (a placement change, the builder's), or recut the shadow's core to 333 (AD).
- **Not verified here:** the dirty-area numbers (computed) and the rendered goldens. The face could not be built in this environment. Everything else was measured on the files at b6e2d6b and 51cb3c98.

Signed: UI/UX, 21:20 (America/Mexico_City), Thu 2026-10-15

## Ribbon gap ruling

UI/UX, 2026-10-16. Asked after the art director moved `crate-sealed/opening/open-432x272` down 4 px inside their canvases (the closer's rect stays 296, 72, 432 × 272) and `pods.places` y went 104 → 108.

**Ruling: (b), keep the ribbon.** Moving it to y 60 (option a) puts a rect off the 8 px grid with no centring axis to excuse it; R9 allows 4 px off only on x. It also lifts its top 4 px off the door's top edge (56), where it is flush today. y 64, the next grid line, would leave 4 px to the pods and break the 8 px region rule. Nothing in the opening sits above the ribbon (no heading, lamp or title; the top bar ends at 40), so the ribbon is placed by the bay, not by the crate, and the crate's rect did not move.

- **Ribbon:** unchanged. Bound `[208, 56, 608, 40]`, fitted `(512 − w/2, 56, w, 40)`, bottom 96.
- **Asserts** (`specs.test.mjs`, "the ribbon's bottom above the crate's pods"): pods y 108 − 96 = **12** (was 8); the open closer's ink top 72 + 56 = 128, so 128 − 96 = **32** (was 28). Keep the 8 px region rule as a floor (≥ 8) beside the exact 12.
- **Text:** R9's clearance line in `station-fix5-cargo-spec.md` reads "ink starts at +56 (y 128) … 32 px above that ink and 12 px above the pods' boxes (108)".
- **Unchanged:** the dirty-area numbers (no ribbon move; the ceilings in §3 stand), the wireframe's ribbon, `design/style-guide/station-layouts.md`'s ribbon row, and the goldens: none moves beyond the haul's three frames and the crate-shift goldens already listed.
