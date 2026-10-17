# The Station is a lab: the paper sweep (T-20261016-127)

Creative director, 2026-10-17 (America/Mexico_City).

**The owner** (04:07): "paper has a place in the library, the rest is a STATION, it's a LAB, it's a genome editing machine."

**The rule** (WORKER.md, and the style guide on `style/lab`):
- Paper, slips, tags and notes appear only in the Library.
- Every other screen shows information on the machine: its displays, lamps, readouts and moving parts.
- Not a workbench, not a desk.
- Anything that changes with the player's input or with time is on the device's own display.

**What was read:** every spec on work-queue, the open tickets, the style guide and goldens at station-gate da2260d4, and the masters at masters-pods head.

**Not paper:**
- **The Caddy's e-paper.** In `specs/dock-moments.md` and the Caddy concept, it is a real display (the device's hardware), so it stays.
- **The Caddy's printer.** It prints real paper in the player's hand, outside the screen, so it stays.
- **Name plates under a resident** (Home, Habitat, mibi up close) **and the Pods name pill.** The specs call them "tags", but they are drawn as dark device plates. They are not paper, so only the word changes: call them **name plates**.

## 1. Every paper, slip, tag, note, clipboard or desk element outside the Library

| # | Where | Element | Kind | Becomes | Owner of the fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Create (`specs/create-concept.md` mood note) | "A workbench in warm daylight, not a laboratory" | Framing | **A genome-editing instrument in the lab.** The gene bench is the lab's editing station, the device's own housing with the drums as its controls (amended here) | CD (done, §2) |
| 2 | Create (concept, bench spec §4, style guide Create entry) | The paper slip clipped to the bench; "Your changes / Still a surprise" in words; the stamp "printed onto the slip" at Grow | Paper, live text | **The machine's display** (`specs/slip-visual-intent.md`): picture chips with the drums' marks, at most 3 words. At Grow, the stamp appears on that display | UI/UX T-126, then art and build |
| 3 | Incubator (concept §3, tabs ruling §5, style guide Incubator entry) | The slip with the found-note, "Your changes", "Cleared while growing" | Paper, live text | **The same display**, set into the cradle's base or the stage's housing; cleared chapters as chips that clear | UI/UX T-126, then art and build |
| 4 | Pods overview and chapter page (`room-bench-stage-overview`, `room-bench-stage-chapter`; `specs/station-pods-purpose.md`) | A paper luggage tag on a string, painted beside the pod on the stage | Paper, painted | **Cut.** The pod's name is already on its device name plate. | Art T-128 |
| 5 | Pods overview (`specs/station-pods-purpose.md` "Found-note") | "Found at the pond edge, as a Loika shook dry." beside the place picture | A note, 10 words | **The place badge and its place word on the machine** (the overview's own readout). The sentence goes: it is a note and fails the words load (gate check 8). UI/UX sets the readout | UI/UX (in T-126's sweep, or its own ticket from the lead) |
| 6 | Cargo report (`label-plate-cream-216x32`) | "Home from the field" on a cream label plate | Reads as a paper label | **A device plate:** the report card's own engraved title, in the housing's materials. Re-cut, not cream | Art T-128 |
| 7 | Incubator concept (Idle) | "A small moulded tag on the bezel" | Named "tag", but moulded and lit | It is a moulded lamp plate, not paper. **Rename to "the bezel's lamp plate"** | CD (wording, §2) |
| 8 | Style guide Materials row (README "Rugged, matte, handled"; station-screens Materials) | "paper" in the Station's materials | Rule | **Paper only in the Library** (style/lab) | CD (style/lab) |
| 9 | Style guide Research rows ("the work tray … among field tools"; Create's and the Probe's "Vibe: Research: the work tray") | Workbench framing | Framing | **The lab's instruments:** the genome editor (Create), the splicer (Cross and Wish), the Probe's service dock | CD (style/lab) |
| 10 | Home, Habitat, mibi up close (style guide) | "the name is on the tag under the resident"; "its name on a tag under its feet" | Wording only (drawn as dark plates) | "name plate" | CD (style/lab) |

**The Library is exempt.** Its book, pages, paper labels, ink and the ring on paper stay as they are.

## 2. Amendments made with this ticket (work-queue)

- **`specs/create-concept.md`:** the mood note is reframed as a lab instrument. The slip rows point to the display (T-126). "Paper slip with clip" is withdrawn.
- **`specs/incubator-concept.md`:**
  - the slip rows point to the display (T-126);
  - "a paper tag" is cut from the style note;
  - the Idle "tag" becomes the bezel's lamp plate.
- **`specs/station-create-bench-spec.md` §4 and `specs/station-incubator-tabs-ruling.md` §5:** a superseded note at the head of each slip section. The display's rects come from T-126.
- **`specs/station-pods-purpose.md`:** the tag row is cut (T-128), and the found-note row becomes the place badge and word on the machine (UI/UX).
- **`specs/station-style-direction-incubator.md`:** "the pod's found-note, as on Pods" becomes "the pod's place, as on Pods (badge and word)".
- **`specs/station-return-signals.md`:** "the slip's line" becomes "the display's chip".
- **Open tickets:**
  - T-20261016-71 (build): no slip paper is placed; the slip region waits on T-126's display.
  - T-20261016-125 (build): its slip step 3 is superseded by T-126.

## 3. Art tickets

- **T-20261016-128:**
  - cut the paper tag from `room-bench-stage-overview` and `room-bench-stage-chapter`;
  - re-cut `label-plate-cream-216x32` as a device plate;
  - mark `slip-208x288` and `slip-208x408` to be withdrawn when T-126's display art lands.
