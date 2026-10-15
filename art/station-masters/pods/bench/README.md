# The Probe bench: the stage, the cradle and the Probe in it (Oct 11)

By the plan in internal `boards/station-probe-bench-plan.md`. The Probe is the owner-approved concept
(`../concepts/station-probe-merge/`, 3f72186f), cut from the painting and never repainted. Only the cradle and the stage are
painted.

| File | Made by | Cost |
| --- | --- | --- |
| `room-bench-stage-probe-1024x522.png` | One Pro request (`room-bench-stage-probe-a`), then by hand: fitted to 1024×522. A screwdriver, two gauges and a cable coil that crossed the cradle and slot zones are painted out from the collection stage's own floor, tone-matched. A gauge, a screwdriver and a wrench stay along the bottom left. | 3.64 MXN |
| `bench-cradle-empty-480x288.png` | One Pro request (`bench-cradle-empty-b`, top-down), then by hand: cropped to keep the tray's trim, rows 0–3 empty | 3.61 MXN |
| `bench-probe-t1-480x288.png` | By hand: tier 1 (three plates) keyed off the concept, laid on its back with its top to the right, at its true proportions, seated in the cut-out on a flat shadow | 0 |
| `bench-probe-t2-480x288.png` | By hand: tier 2 (four plates and the module), scaled to tier 1's length | 0 |
| `bench-proof-1x.png` | The three cradle states on the new stage at the cradle's place [56,104] (stage 56,64), 1× | 0 |

- **Superseded:** the first cradle, `bench-cradle-empty-a` (3.61 MXN, kept in `source/raw`). It was painted in a steep
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
- **Signed** by the Station art director at 1×, 2026-10-11, 0 MXN for every hand piece.

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
