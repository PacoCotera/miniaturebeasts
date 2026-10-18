# Cargo: the art director's finish pass, and the masters for the build (T-20261016-197)

The owner approved Cargo (21:51). It covers two things: UI/UX's crate-by-crate structure with its three stills, and the dock's "Open the bay | Later" panel. This pass finishes the stills without changing that structure. It then lists every master the build needs. The stills are composites of signed masters and the studio's two Cargo elements (`make-cargo-finish.py`, on UI/UX's kit), with no generated pixels.

| Still | Shows |
| --- | --- |
| `cargo-rest.png` | three crates in their berths, the hatch shut, one older pod waiting |
| `cargo-crate-open.png` | the first crate's lid lifting, its contents in the display, the waiting pod already in a well, the crate's Loika pod mid-arc to the last free well |
| `cargo-end.png` | every crate closed and dimmed, the two arrivals lit in their wells, the Tuikis pod waiting |

## What the pass changed

1. **One pod scale for everything stored.** In the gated stills, a pod was 96 px in the display, 40 in the wells and 96 again in the waiting spot. The structure says nothing scales, so those sizes contradicted each other. Now:
   - **The display is the close-up:** pods show at their display size there.
   - **Everything stored is at the wells' size,** the waiting spot included. It is a shelf beside the wells, not a second display.
   - **A pod travels whole at its display size,** and swaps to the well's size with the house dither as it lands. One sprite, one arc, one swap; nothing is resized in motion.
2. **The counts add up.** One pod waits at rest, and the crate brings two. The oldest pod takes the first free well, and the crate's Loika pod takes the last. So one pod, the Tuikis, waits at the end. The gated end still showed two waiting, and the open still showed the travelling pod twice (in the display and mid-arc).
   - A pod that has just landed lights its well mint, the waiting pod included.
3. **The berths are recesses, not cards.** Each has a shadow under its top lip, a floor that catches the light where the crate stands, a lit left side toward the bay's light, and a dark inner edge. The crates stand on the floor with their contact shadow.
4. **Done crates dim by value only** (to 0.72), so they stay the crates' yellow. At 0.5 they turned olive, which read as dirty, not done.
5. **The bay's one light** falls faintly from the top left over the back wall, as on Home.

## The masters list

**Placed already** (`prototypes/ui/assets/masters/pods/` on station-gate), used as they are:
- **The bay:** `cargo-bay-992x320`.
- **Crates:** `crate-sealed-256x176`, `crate-shadow-256x24`, and for the panel `crate-open-432x272`, `crate-sealed-432x272`, `crate-shadow-432x24`.
- **Materials:** `cargo-energy-72x96`, `cargo-data-72x96`, `cargo-essence-72x96`, `cargo-store-shadow-72x21`, `cargo-store-shadow-48x14`.
- **Finds:** `find-crystal/pearl/shard-112x112` (the display) and `-16x16` (the hatch's strip).
- **Pods:** the pod renderer's layers, `pod-collection-*` (the display) and `pod-well-*` (stored).
- **Marks:** `glint-star-12x12` (a species new to the player), `ring-hatch-80x56` (the shut hatch's plate).
- **The frame:** `frame-top-bar-1024x40`, `frame-bottom-line-1024x38`, `frame-cap-confirm-16`, `frame-cap-back-16`, and Home's `home-lamp-amber-12x12`.

**To promote** from the studio's Cargo concepts (masters-pods `art/station-masters/pods/concepts/panels-cargo/`). Each needs registering at its measured anchors:
- `crate-lifting-256x200`: its foot sits 13 px above the canvas foot.
- `pods-hatch-open-160x260`: well centres at (49, 60), (103, 58), (49, 120), (103, 119), (50, 180), (104, 182).

**To cut** from placed art, with no painting:
- `hatch-shut-160x260`: the stills crop it live from `cargo-bay-shut-976x304` at (40, 20).
- `berth-shut-256x292`: an empty berth is "slatted and shut", and no still draws it yet. Cut it from the same slatted door.

**The portrait berth: no painting needed** (`cargo-portrait-in.png`, `make-portrait-in.py`). With a portrait crate in, the four berths are 188 px wide, so every crate in the bay is a 176 px reduction of its signed 256 px master. These are cut once at build time, the same way stands are reduced, with the cuts in `cuts/`:
- `crate-sealed-176x121`;
- `crate-lifting-176x138` (from the promoted lifting crate);
- `crate-shadow-176x16`;
- `crate-sitting-176x121`.

**The portrait crate is the signed sitting crate,** the same yellow case with the frame mark on its plate. It is already Home's portrait crate (`crate-sitting-48x40`), so the crate is one object on both screens. **Its berth carries the difference:** a 2 px edge in the house gold with a dark keyline, drawn in code. That edge is the "frame-shaped berth".

**Not taken: the studio's proposed new case** (about 176 × 220, a blank card in a slim frame):
- It would be a second portrait-crate design beside the signed one, a new object in the bay and on Home.
- A blank card on a case reads as a paper label.
- It costs a paid call that the reductions make unnecessary.

**Drawn in code** (in the house palette, no master needed):
- the berth recess;
- the waiting mat;
- the lit well (a mint ring and pool);
- the dimming;
- the counters and their +n.

## The panel, "Open the bay | Later"

- **Open the bay** stands: the crate open from above, the cushions empty, the light rising from inside. One note for the build: its inner light should take the lifting crate's warm colour, so it reads as lamplight, not grey haze. Not redrawn here.
- **Later doesn't yet show what the structure says** ("Home's console, with the Bay lamp amber and the crates in its berths"). The still shows a closed crate up close, with a name plate and lamp laid over the picture.
  - The finished window is a crop of Home's console: the Bay module with its lamp amber and the crates' fronts in its three berths, as Home's deck draws it.
  - It uses the Home build's own Bay module, with no new painting. It is drawn once Home's Bay module is built.

## Open

- **Waiting spot: settled with UI/UX.** It is now 24, 424, 160 × 80, the floor under the hatch. Three stored pods sit in a row, oldest at the left, and a newcomer settles at the right. A fourth or more shows as "+n". The stills are redrawn to it.
- **The back wall:** at rest and at the end, the upper third of the bay is its back wall alone, and `cargo-bay-992x320` is soft there. It holds, since this is a quiet room between crates, but a sharper painted back wall would be the first master to upgrade. It is one request, not made.
- **A find with no page** stays parked with the creative director, as the structure says.
