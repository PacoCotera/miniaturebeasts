# The Probe bench: the stage, the cradle and the Probe in it (Oct 11)

By the plan in internal `boards/station-probe-bench-plan.md`. The Probe is the owner-approved concept
(`../concepts/station-probe-merge/`, 3f72186f), cut from the painting and never repainted. Only the cradle and the stage are
painted.

| File | Made by |
| --- | --- |
| `room-bench-stage-probe-1024x522.png` | One Pro request (`room-bench-stage-probe-a`), then by hand: fitted to 1024×522. A screwdriver, two gauges and a cable coil that crossed the cradle and slot zones are painted out from the collection stage's own floor, tone-matched. A gauge, a screwdriver and a wrench stay along the bottom left. |
| `bench-cradle-empty-480x288.png` | One Pro request (`bench-cradle-empty-b`, top-down), then by hand: cropped to keep the tray's trim, rows 0–3 empty |
| `bench-probe-t1-480x288.png` | By hand: tier 1 (three plates) keyed off the concept, laid on its back with its top to the right, at its true proportions, seated in the cut-out on a flat shadow |
| `bench-probe-t2-480x288.png` | By hand: tier 2 (four plates and the module), scaled to tier 1's length |
| `bench-proof-1x.png` | The three cradle states on the new stage at the cradle's place [56,104] (stage 56,64), 1× |

- **Superseded:** the first cradle, `bench-cradle-empty-a` (kept in `source/raw`). It was painted in a steep
  perspective, which made the Probe read squat. The programme lead flagged it, and the art director ruled it was not the view.
- **Guides:** `guides/cradle-guide-flat-480x288.png` (the Probe's outline lying flat) and
  `guides/stage-keepclear-1024x522.png` (the cradle, switch, slot and plate zones).
- **Flaws:**
  - Tier 2's loop end leaves a little of the notch showing.
  - A very faint seam is left where the upright screwdriver was painted out (x 112, y 300–390).
- Not signed and not placed. Shown to the programme lead at 1× first.

## The full set, signed (Oct 11)

`slices/` holds the 23 pieces bench.json `masters.list` names, under their ids, at their sizes. `slices/index.json` lists each
id, size and sha256. `bench-pages-1x.png` is the set at its spec places at 1×: docked tier 1 with one plate gone and the switch
off, docked tier 2 with the switch on, and away. The module panels there are a plain stand-in for the build's own chrome.

- **Painted (Pro):** `room-bench-stage-probe` and `bench-cradle-empty-480x288`.
- **Cut from the approved concept by hand:**
  - `bench-probe-t1/t2-480x288`. Tier 2's exposed recess is filled with the tray, and both are seated on a dark padding ring
    with smoothed edges.
  - `bench-plate-whole-32x64`: a real plate, kept at its own near-square shape (28×30) inside the box.
  - `bench-part-t2-ready/dim/fitted-128`: the module.
  - `icon-pod-16`: one speckled egg.
  - `icon-shield-16x32`: the plate.
- **Drawn by hand in the Probe's own colours, at 4× then reduced:**
  - `bench-plate-gone-32x64` and `icon-shield-gone-16x32`: the plate's empty seat;
  - `bench-socket-160`;
  - the switch track off/on and the knob;
  - `mark-dock-24x24`: the cradle from above;
  - `bench-reach-t2-40`: a wide sky sweep;
  - `bench-deep-t2-40`: a narrow beam through depth rings.
- **`-new` slices:** each is identical to its plain slice on this pass, as bench.json says.
- **Note for the UI designer:** the approved plate is close to square. The 32×64 and 16×32 boxes hold it at 28×30 and 15×16.
  The shield icons read as small white chips. Either tighten the boxes to the plate (32×32, 16×16), or accept the chips.
- **Signed** by the Station art director at 1×, 2026-10-11 for every hand piece.

## The boxes tightened (UI/UX ruling, internal boards/station-bench-boxes-ruling.md, ae23abd)

The plates and shield icons are re-exported, cropped and centred only, with no repaint:
- `bench-plate-whole-32x32`: ink 30×32.
- `bench-plate-gone-32x32`: ink 28×30. The seat's measured 35 rows were 30 rows of ink plus resampling dust at alpha ≤ 4.
  Only the dust was dropped.
- `icon-shield-16` and `icon-shield-16-new`: ink 15×16.
- `icon-shield-gone-16`: ink 14×14.

`bench-plate-*-32x64` and `icon-shield-*16x32` retire. `bench-pages-1x.png` is re-proved at the new places: plates 32×32 at
y 440, the switch icons at [152,68] and the slot's plate icons at [200,112]. `slices/index.json` is updated (23 ids).

## The plate strips, PA1 (Oct 15, by hand, no paid call)

`bench-plate-strip-t1-144x48` (three recesses, 1:1 at (264, 432)) and `bench-plate-strip-t2-192x48` (four, at (240, 432)), cut by `bench/make-plate-strips.py slices` from `bench-cradle-empty-480x288` (the foam, crop (100, 110, 192, 48)) and the alpha of `bench-plate-gone-32x32` (the recess), by the art director's notes (`plate-strip-notes.md`). Manifest and index rows are written directly (status new); `tools/status.py` was not run. Proof: `plate-strips-proof-1x.png` (each strip on the Probe bench stage at its place, one whole plate and one gone plate in recesses 0 and 1).

- **Checks run:** slice sizes exact; alpha only 0 and 255 in rows 0-44, rows 45-47 at 115, 76 and 38 (45, 30, 15 percent) from x 3; every recess's changed pixels span the gone mask's own bbox offset by (8 + 48 i, 8).
- **Readability at recess 0, 1x (luma 0-255, Rec.709):** the recess floor 42.2. The whole plate (p50 185.1) is +142.9 above it, WCAG contrast 7.3:1: it reads as a whole white plate. The gone plate's lit rim (p95 118.1) is +75.9 above it, 3.15:1: it reads as an outline.
- **Readings to confirm:** where two listed rules meet on one pixel they apply in the notes' order: the edge's top-right and bottom-left pixels take both multipliers (1.30 then 0.60 or 0.60 then 1.30), and a wall thin enough to be in both bands takes the shadow band. The corner radius 3 clears the one corner pixel whose centre lies outside the circle. Rounding is ties-to-even throughout, the shadow alphas 115, 76 and 38.
- **A layout fact:** the stage's painted screwdriver ends at about x 265, so t2 (placed from x 240) covers its tip; t1 starts where it ends.

## T-20261016-33: the field tools lifted, the plates and strips at 48 (signed)

The Probe bench's purpose (`specs/station-probe-purpose.md`, work-queue): the player gets the Probe ready for the next trip, and the plates are how many strikes it can take, the second read. The gauge, wrench, screwdriver and cable had no job, so they go. The plates move into the middle column at 48. Nothing new is painted.

| Id | Size | How |
| --- | --- | --- |
| `room-bench-stage-probe` | 1024×522 | PA2's own `stage-clean` (`stage-pa2/lift-tools.py` on the pre-PA2 stage, `git show c9261a63^:…/slices/room-bench-stage-probe.png`). Proven exact: `compose-zone.py` over it rebuilds the PA2 stage with 0 pixels differing. The 28,869 changed pixels are the old tools zone, the cable's run and their shadows only |
| `bench-plate-whole-48x48` | 48×48 | `plates-48/make-plates-48.py`: the signed 32 redrawn at 48 (its silhouette as a smooth curve on an 8× grid, its own measured tones, rims at 48's own widths), not scaled up |
| `bench-plate-gone-48x48` | 48×48 | the same, the empty seat with its screw hole |
| `bench-plate-strip-t1-176x64` | 176×64 | `plates-48/make-plate-strips-48.py`: PA1's construction (`plate-strip-notes.md`) at the new size; recesses at (8 + 56k, 8) from the gone-48 mask; foam crop (106, 122, 232, 61) of the cradle, luma 55.3, std 0.31 |
| `bench-plate-strip-t2-232x64` | 232×64 | the same, four recesses |

The 32 px plates and the 144/192 strips are retired from the bench only (they stay in this folder). `icon-shield-16` is Cargo's and is untouched.

Proofs (`plates-48/proof/`): `before-after-middle-1x.png` (station-gate 69ea1d23 golden `bench`, middle column, before and after; the after has the stage swapped and t1 with three whole plates at the spec places; the words "Shield" and the line are the build's, T-20261016-34), `after-bench-1x.png`, `mock-t2-1x.png`, `strips-2x.png`, `plates-32-vs-48-4x.png` and `stage-before-after-1x.png`.

Signed by the art director at 1× in these mocks, 2026-10-16; to re-check in the builder's captures.

## T-20261016-146: the fitted part as a clean cut-out
On the "Fit the upgrade?" panel, `bench-part-t2-fitted-128` showed a dark socket box and a flat beige slab (`results/T-20261016-53.md` note 2).

**Re-cut** under the same id and size (`t146/recut-fitted.py`): an alpha cut-out of the part.
- **Why it can be a cut-out:** inside the part's silhouette the fitted master was the ready master's painting (mean difference 1.1/255), so it holds no fitted-only detail.
- **What it keeps:** its own pixels inside the ready master's alpha, and the ready master's pixels where the slab covered the foot.
- **What it drops:** the box and the slab.
- **The contact shadow** is the panel's.

**Proofs** (`t146/proof/`, labelled):
- `bench-panel-upgrade-1x.png`: the panel by the T-70 composite rule, Fit it beside Not now's dim part;
- `bench-panel-upgrade-before-after-1x.png`.

## T-20261016-162: Fit the upgrade?, the Probe at tier 2 against tier 1, with their reach
These are for spec §1.6's "Fit the upgrade?" row (T-159), made by `t162/make-fit-cards.py`.
- **`bench-probe-t2-card-128x160` and `-t1-card-128x160`:** the whole Probe upright in its cradle, reduced from the upright painting's aligned cut with one transform, so the two differ only where the part is (the fourth plate, the sand module and the side lens).
- **`bench-reach-t2-160` and `-t1-160`:** a small field map, an 11 × 11 grid of land cells on the slate display with the start marked, and the Probe's reach ring.
  - **Tier 2:** reaches 4 cells (9 × 9, `design/play-manual.md`), radius 63 px, lit mint.
  - **Tier 1:** reaches 2 cells (5 × 5), radius 35 px, unlit (mist).
  - No glow.

**Proof** (`t162/proof/`): `bench-panel-upgrade-1x.png`, and the cards at 2×.
