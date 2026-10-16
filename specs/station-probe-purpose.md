# The Probe bench: every object has a job (UI/UX)

Ticket T-20261016-30, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23 (`prototypes/ui/specs/station/bench.json`, goldens `prototypes/face/golden/bench/`, wireframes 11 to 11e). Input: `specs/purpose-audit.md`, "Probe bench" and gap 1. Follow-up tickets: art T-20261016-33, build T-20261016-34.

## 0. Purpose (what the player does here)

**Get the Probe ready for the next trip.** The player sees how whole its Shield is, mends a plate, sets whether the dock mends every plate, and fits the upgrade. They come back after a trip, when plates are worn, and when an upgrade becomes affordable.

The bench's own spec says the screen "reads first: the Probe; then its plates". Today the plates are the smallest thing on it: 32 px, at the foot of the middle column, under a gauge, a wrench, a screwdriver and a cable that do nothing.

What a plate is for comes from `design/play-manual.md`:
- "Each hit takes one Shield bar".
- When the Shield breaks, "the expedition ends where you are" and the carried pods fall.

That is why mending matters, and the screen never says it.

## 1. Every object: keep, change or cut

| Object (golden `bench`) | Job | Call |
| --- | --- | --- |
| The Probe, upright in its cradle (40, 96, 288 × 432) | The device you are preparing; the first read | **Keep** |
| Empty cradle (`bench-away`) | The Probe is out with you | **Keep** |
| Plates and their strip | How many strikes the Probe can take on the next trip; the second read | **Change:** they move into the middle column at 1.5× (48 px). There they get the word "Shield" above them and the reason under them (§2) |
| Mend module (switch, lamp, dock mark, the plates it leaves whole) | Set whether the dock mends every plate | **Keep** |
| Upgrade module (part, socket, pods row, plates row) | Fit the next tier, and see what it adds | **Keep** |
| Upgrade's two round dials (`reach`, `deep`, 40 × 40) | What the upgrade adds: a wider reach, the deep read (`bench.json regions.slot.adds`) | **Change:** they have a job, but at 1× nothing says it. Each gets a one-word caption under it (§2) |
| Brass stopwatch gauge | None | **Cut** (the stage recut, art T-33) |
| Wrench | None | **Cut** |
| Screwdriver | None | **Cut** |
| Cable from the Probe through the gauge to a loose plug | None: it connects nothing the player uses | **Cut.** It cannot become a "mending" line: the dock mends at the moment of docking (`state.mjs` dock, :324–338), so there is no progress to show |
| The tools zone (368, 96, 208 × 352) | It held the four props above | **Retired.** The middle column now holds the Shield block |

## 2. The new layout (on the 8 px grid; the axis x 472 as today)

The Shield block stands in the middle column (between the cradle's keep-clear at 328 and the column at 620), centred on the Probe's body. The old bottom-line rule shared by "the cradle's base, the strip, Upgrade" becomes **the cradle's base and Upgrade** only.

| Region | Old | New | States |
| --- | --- | --- | --- |
| `shieldWord` (new, text) | — | **344, 240, 256, 24**: "Shield", centred on 472, 16 px, weight 400, the module title's colour (`regions.switch.word`'s style) | docked, away |
| `strip` | t1 400, 472, 144 × 48; t2 376, 472, 192 × 48 (bound 376, 472, 192, 48) | **t1 384, 272, 176 × 64; t2 356, 272, 232 × 64** (bound 356, 272, 232, 64). t2's x is 4 off the grid, centred on the axis 472 (allowed on an axis) | docked, away (away: empty slots) |
| `plates` | 368, 464, 208 × 64; plate 32 × 32, pitch 48; t1 x 408, 456, 504; t2 x 384, 432, 480, 528; y 480 | **352, 264, 240 × 80**; plate **48 × 48, pitch 56**; t1 x **392, 448, 504**; t2 x **364, 420, 476, 532**; y **280** | docked |
| `shieldLine` (new, text, two lines) | — | **344, 344, 256, 40**: line tops 344 and 364, centred on 472, 14 px, weight 400, `mist`. Words: "each plate takes one strike" / "no plates: the trip ends" (copywriter to confirm; until then these) | docked, away |
| `slot.adds.reachWord` (new) | — | at **(192, 208), 56 × 16** in the slot (abs. 816, 480): "reach", centred on the dial (844), 12 px, `mist` | both |
| `slot.adds.deepWord` (new) | — | at **(248, 208), 56 × 16** (abs. 872, 480): "deep", centred on 900, 12 px, `mist` | both |
| Ring on the plates | 364, 458, 216 × 72 | **348, 258, 248 × 88** (4 px out, 2 px lift, as before) | docked, focused |
| `bench.keepClear.plates` | 364, 458, 216, 72 | **344, 232, 256, 160** (the Shield block, word to line) | — |
| `bench.tools` | 368, 96, 208, 352 | **deleted** | — |

- **The fit.** t2's run is 4 × 48 + 3 × 8 = 216 in a 232 strip; t1's is 160 in 176. The block spans y 240–384.
- **No dead field:** above the block in the middle column (y 96–240) and below it (384–528) are each 292 × 144. No bare 160 × 160 remains there, which is the same test as fix 5.
- **Text widths:** measure "each plate takes one strike" at 14 px with the real measurer; it must fit 256. "reach" and "deep" at 12 px must stay ≥ 8 apart (about 15 expected). If either fails, stop and report.
- **Focus:** unchanged. The plates are still one target, with the ring on the new box. The graph (plates ▶ the slot, ▲ ▼ switch and slot) stands.
- **Dirty area:** a plate seating redraws one 48 × 48 box (was 32 × 32). Every other ceiling stays. Print the plate frame.

## 3. Wireframes

`specs/station-probe-purpose-wireframes.patch` (`git apply -p1`, checked on 69ea1d23's files) changes 11, 11b, 11c, 11d and 11e:
- it removes the tools-zone box and its note;
- it moves and resizes the strip, the plates and the ring;
- it adds the Shield word and line, and the dials' captions;
- it rewrites the bottom-line note;
- it adds "No field tools" to the titles.

Re-render the five PNGs.

`design/style-guide/station-layouts.md` (lines at 69ea1d23):
- :1190 and :1868: "among field tools and small gauges" / "with the field tools and small gauges beside it in the tools zone" → "with its Shield beside it".
- :1860 "in the middle column under the tools zone" → "in the middle column, on the Probe's middle, under the word Shield".
- :1864: replace the tools zone and the plates' box with the Shield block, 344, 240, 256 × 144.
- :1885, :1886, :1898, :1899 and :1905: the new strip, plates and ring numbers from §2.
- :1948 and :1949: the new slice sizes (§4).

## 4. Art (T-20261016-33, the art director, by hand, no paid call)

| Id | Change |
| --- | --- |
| `room-bench-stage-probe` | Recut under the same id: lift the gauge, the wrench, the screwdriver and the cable with its plug. Repaint the wall and floor they leave in the stage's own grain. Nothing new is painted. The cradle, the column's ground and everything outside the old tools zone and the cable's run stay pixel for pixel |
| `bench-plate-whole-48x48`, `bench-plate-gone-48x48` | The existing 32 px plates redrawn at 48 (not scaled up) |
| `bench-plate-strip-t1-176x64`, `bench-plate-strip-t2-232x64` | The foam strips at the new sizes, plate recesses at x 8 + 56k, y 8 |

The 32 px plates and the 144/192 strips are retired from the bench only. The Cargo report's `icon-shield-16` is a different picture and is not touched.

## 5. Specs, code, tests (T-20261016-34)

- **`bench.json`:**
  - the regions and rects of §2;
  - `plates.plate` [48, 48], `pitch` 56, `places` as §2, `slices` the 48 ids;
  - `strip.byTier`, `strip.slices`;
  - delete `bench.tools`;
  - `bench.note` and `recut`, `notes.subject` and `notes.group`: drop "field tools and small gauges" and the tools zone;
  - `focus.lift` with the plates ring [348, 258, 248, 88];
  - `strings.shield` "Shield", and `strings.shieldLine` ["each plate takes one strike", "no plates: the trip ends"];
  - `strings.adds` gains `reach` "reach" and `deep` "deep";
  - `masters.list` with the new ids;
  - `drawOrder`: `shieldWord` and `shieldLine` after `plates`.
- **`bench.props.json` and `views/bench-props.mjs`:** the two strings, if the props carry words; otherwise the face reads them from the spec.
- **Code:** `screens/bench.c` draws `shieldWord`, `shieldLine` and the two captions with the existing text word. The plates and the strip come from the spec. If a size is hard-coded, stop and report it.
- **Tests:**
  - `prototypes/ui/tests/specs.test.mjs` :915–941: the tools-zone asserts go. Assert instead:
    - the block 344, 240, 256 × 144 clear of the cradle and the column keep-clears;
    - the plates on the axis 472;
    - each tier's plates inside its strip;
    - no bare 160 × 160 in the middle column;
    - the bottom line 520 shared by the cradle's base and Upgrade.
  - `prototypes/face/tests/bench.test.mjs` :74: the new plate boxes ([392, 280, 48, 48] …).
  - `prototypes/face/tools/bench-regions.mjs`: the new regions drawn in both states, the plates only docked.
- **Goldens:**
  - retake `bench`, `bench-armed`, `bench-away` and `bench-tier2` and their hashes;
  - Home's Probe goldens (`home-probe-*`) must not move;
  - `journey-bench.json` should not move (no key changes); a move is a departure to report.

## 6. Open

- The words ("Shield", the two-line reason, "reach", "deep") are the UI designer's placeholders, to be confirmed by the copywriter. They follow the play manual's own words ("Shield", "hit"/"strike", "the expedition ends").
- The audit's other missing signal, "mending progress", does not exist in play: the dock mends at the moment of docking. Nothing is drawn for it.
