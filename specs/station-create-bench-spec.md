# Create, the gene bench: the layout (UI/UX)

Ticket T-20261016-38, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23 (`prototypes/ui/specs/station/create.json`, goldens `prototypes/face/golden/create/`, wireframes 03 to 03e). It specs the concept the owner chose: `specs/create-concept.md` and `specs/owner-rulings-2026-10-16.md` (12:51). Wireframes: `specs/station-create-bench-wireframes.patch` replaces 03, 03b, 03c and 03e. Follow-up tickets: art T-20261016-41, build T-20261016-42.

## 0. Purpose (from the concept)

The player came from a pod with `✓ Shape a founder`. They decide what their new mibi will look like, within what this pod carries, and commit. **They change the creature by turning the drums.** Every object below sits on the bench and has a job, or it is not drawn.

## 1. Measured facts that shape the layout

- **The interior** is the Incubator's: x 71–953, y 59–548 (`specs/station-incubator-tabs-ruling.md` §1). The margins are the same too: x 88–936, y 80–530.
- **Shapeable traits per species run from 5 to 27**, not "up to 10" as the concept assumed (`prototypes/workbench/frames/species-S01..S16.json`: S01 5, S04 5, S05 9, S02 13, S03 25, S09 27). At a readable drum size, the bank cannot show every trait at once. **The bank slides** (§3).
- **The bottom line shows the wait today** as `⧗ n` (create.json `bottomLine`). Owner ruling 3 allows a minute count in the Incubator's context line "and nowhere else", so **Create drops `⧗ n`**. The price stays.

## 2. Objects, rects and jobs

| Region | Rect | Job | States |
| --- | --- | --- | --- |
| `bench` | 0, 40, 1024, 522 | One matte work surface inside the bezel (art `create-bench`): everything sits on it or in it. Replaces `room-bench-stage-create` | all |
| `well` | 96, 96, 192, 192 | The pod's fitted well, as on Pods: the source of every look | all |
| `pod` | 136, 128, 112, 136 | The player's own pod: open in shape, closed from Grow 300; its species' shell from Pods' renderer, with its place's dust or moss | all; carried out by `travel` |
| `name` | 104, 304, 176, 24 | The species name on a name plate (Pods' `plate-name` series, max 176), centred on 192 | all |
| `found` | 88, 336, 208, 48 | Pods' found sentence, 2 lines, 16 px (pitch 24), `mist`, centred on 192 | all |
| `geneLine` | 288, 192, 24, 216 | The braided line from the well's side into the bank: the drums are fed by this pod | all |
| `founder` | 360, 80, 304, 312, feet 392 | What they are making. Unread chapters' parts frosted, never guessed. The largest and warmest object | all |
| `dish` | 312, 372, 400, 28 | The moss pad in a shallow cut-out; the founder's contact shadow lies on it | all |
| `slip` | 728, 96, 208, 296 | "Your changes", then "Still a surprise", in words (§4). At Grow: printed with the stamp and code | all |
| `bank` | 88, 408, 848, 122 | The tray of drums along the front edge, grouped under chapter words (§3) | all |
| `travel` | from the pod's rect to (952, 160, 112, 136), clipped at the interior's right edge 953 | The closed pod carried out at the right toward the Incubator | grow 300–900 |

**Clearances:**
- the founder's top meets the top margin (80); its feet (392) stand on the dish;
- the dish ends 8 above the bank;
- the slip ends 16 above the bank;
- the gene line ends at the bank's top edge;
- the side columns (88–296, 728–936) are 16 from the centre column (312–712) where they share rows.

**Gone from the screen:**
- `rail` (the chapter tabs) and `roll`;
- `traitLine` and its tag;
- `chamber`, `chamberFront`, `dome`, `domeFront` and `bud`;
- `stampCase` and `stampCaseFront`; the stamp is on the slip now, at Grow only;
- `cradle` and `cradleFront`, replaced by the well;
- `podShadow` and `origin`, replaced by `name` and `found`;
- the bottom line's `⧗ n`.

## 3. The gene bank

- **The tray** is 88, 408, 848 × 122. The **window** is x 104–920, the tray minus 16 each side.
- **Chapter words:** 16 px, `mist`, the rail's words ("Coat", "Legs and tail" …), lineTop 414 (ends 436, 4 above the drums), left-aligned at the group's first drum.
- **Drums:** 80 × 80, y 440–520, pitch 88 within a chapter, plus 16 between chapters, in chapter order, then the frame's trait order.
- **What a drum holds** (offsets from its origin):
  - the window, 64 × 64 at (8, 8), with the look's close-up (`look-{species}-{trait}-{look}-64x64`);
  - the changed notch, 12 × 8 at (34, 0), `cream`;
  - when focused, the turn marks: ▲ 16 × 8 at (32, 0) and ▼ 16 × 8 at (32, 72), inside the rim.
- **The drum's states:**

| State | When | Drawn | ▲ ▼ |
| --- | --- | --- | --- |
| rest | the look as the pod is | `create-drum-rest`, the close-up | turns, if it has more than one face |
| changed | any other face | `create-drum-rest` and the notch | turns |
| one face | a trait the pod carries one look of | no turn marks | nothing |
| pinned | a doing ("breed to change") | `create-drum-pinned` (two joined rings), the close-up | nothing |
| capped | an unread chapter's trait | `create-drum-capped` (the frost veil), no close-up | nothing |
| clash | a clashing changed trait | `create-drum-clash` (red rim) and ✕ `icon:cross:16` at (60, 4) | turns |

- **Faces:** a drum has one face per look this pod can give that trait, up to three ("as the pod is", "only the first copy", "only the second copy", as `roll.forms.roll.order`).
  - ▲ turns to the next face and ▼ to the previous, with wrap. Each turn is one cut on the drum, then the founder's roll event (the existing 200 ms dither, gated as now).
  - The concept's 200 ms tumbler is the art's to propose. Until it is signed, the drum is a cut.
- **Sliding:** while a drum is hidden past an edge, that edge shows a **more mark** (16 × 80, `create-bank-more-{left|right}`, at x 104 or 904, y 440), and drums draw only wholly inside the window minus the mark. When the focus moves onto a hidden drum, the tray slides as a cut:
  - the focused drum's chapter word aligns at the window's left (104) if its whole group fits;
  - otherwise the focused drum becomes the last whole drum shown.
  
  No animation. Dirty area: the tray's box, 848 × 122 = 103,456.
- **Counts:** S01 (5 drums) fits with no slide. A 9-drum, 4-chapter bank needs 9 × 88 − 8 + 3 × 16 = 832 > 816, so it shows 8 drums and the more mark. Most species slide.

## 4. The slip and the price

**The slip** (728, 96, 208 × 296). It uses the Incubator slip's paper and width at a shorter height, so the bank can span the bench. Padding 16; text at x 744:

| Block | Lines | Type |
| --- | --- | --- |
| Your changes | heading, then one line per changed trait, "{Trait}: {look}", newest first, up to 4; then "and {n in words} more" | 16 px, weight 500 heading; 16 px lines |
| | none changed: "none yet" (nothing read: "none: read a chapter first") | 16 px, `mist` |
| | a clash adds "✕ {A} and {B} clash", in `red`, under the changes | 16 px |
| Still a surprise | heading, then the unread chapters' words, comma-joined, up to 2 lines | 16 px, weight 500 heading; 16 px, `mist` |
| | none unread: the block is not drawn | |

- **Fit:** the face has three type sizes, 16, 20 and 28 (lead, 13:08). The longest case at pitch 24 is 24 + 5 × 24 (4 changes and "and n more") + 24 (the clash) + 8 + 24 + 2 × 24 = 248 ≤ 264. Every line must be ≤ 176 px, measured; otherwise cut at a word with "…" and report.
- **At Grow 0:**
  - the lists cut away, and the slip is printed;
  - the stamp prints at **772, 128, 120 × 120**, row by row as the existing `events.grow` step (0–300);
  - at 300, the code at **744, 264, 176 × 25** (lineTop 264, baseline 280, rule y 288 from 744 to 920);
  - "to the Incubator" at lineTop 316, 16 px, `mist`, centred on 832.
- **The bottom line:**
  - ✓ Grow it, then the price as now (`state.growCost`, icon before figure), **without `⧗ n`**;
  - the context: the focused drum's "{Trait}: {look}", or as the drum's state says ("Stamina is still a surprise", "breed to change", "{A} and {B} clash");
  - a clash withdraws the ✓ cap, as now; ← the pod.

## 5. States, focus, events

| State | The bench |
| --- | --- |
| `nothingRead` | Every drum capped; the founder frosted to its outline (as now); the slip "none: read a chapter first" and every chapter under "Still a surprise". ✓ Grow it at the base price |
| `shape`, nothing changed | Drums at rest; the slip "none yet" |
| `shape`, changed | Notches, slip lines, the price up a ◆ a change (as now) |
| `shape`, clash | The clash drums, the slip's clash line, no ✓ cap |
| `shape`, unread chapters | Those drums capped; "Still a surprise" names them |
| `grow` | Drums lock (no turn marks, no ring); the slip printed (§4); at 300 the pod closes and `travel` carries it out at the right to 900; the jump to the Incubator at the event's end (as now) |

- **Focus:**
  - **Targets:** `drum.<i>` in bank order. The ring is the drum's rect 4 px out, with rx 10 and a 2 px lift. No other target.
  - **Initial:** the first drum that is not capped; with nothing read, the first drum.
  - **Moves:** ◀ ▶ go to the previous and next drum, stopping at the ends (the tray slides as §3). ▲ ▼ turn the focused drum (§3). ✓ Grow it from any drum; ← back to the pod (the unpaid turns drop, as now).
- **Events:**
  - `roll` is unchanged: the founder's dither and the cuts on the drum, the slip and the price;
  - `grow` keeps its timing (900 ms, hold 1080) with the regions above;
  - `travel` keeps its ease, with the new from and to.

## 6. Tests and goldens (build T-20261016-42)

- **`prototypes/ui/tests/specs.test.mjs`** (the Create blocks):
  - the rects of §2;
  - the side columns mirrored on 512 (88 to 296 against 728 to 936);
  - the clearances of §2;
  - the bank's window and pitch, and the slide rule run on every species frame: no drum outside the window, and the more mark exactly when drums are hidden;
  - the slip's longest case ≤ 264, with lines ≤ 176 measured;
  - no `rail`, `roll`, `traitLine`, `dome`, `chamber` or `stampCase` region;
  - no `⧗` in the bottom line.
- **The Create face test and region tool:**
  - per state, the drum states of §3;
  - turning a drum redraws the drum, the founder's changed box, the slip's lines and the price, and nothing else (print the dirty area, ≤ 153,600);
  - a slide is ≤ 103,456 plus the ring;
  - the grow beats as now, with the new regions.
- **Focus vectors:** ◀ ▶ along the drums with stops; ▲ ▼ turns; ✓ from any drum; a capped drum ignores ▲ ▼.
- **Goldens:**
  - retake all 16 Create goldens (`create-*`) and `journey-create.json` (focus targets change: report the keys);
  - **add** `create-shape-slid` (S03, focus on its 12th drum) and `create-shape-many-changes` (5 changes: the "and n more" line);
  - no other screen's golden may move.

## 7. Art (T-20261016-41, the art director, by hand)

| Id | Size | What |
| --- | --- | --- |
| `create-bench` | 1024 × 522 | The bench inside the bezel: matte work surface, the well's seat, the dish's cut-out (312, 332 in the slice) and the tray recessed (88, 368 in the slice, 848 × 122) |
| `create-well` | 192 × 192 | Pods' fitted well at this size |
| pod opened, pod closed | 112 × 136 per species | From the pod renderer, with the place's dust or moss |
| `create-gene-line` | 24 × 216 | The braided line, well side to tray |
| `create-dish` | 400 × 28 | The moss pad and rim |
| `create-drum-rest`, `-pinned`, `-capped`, `-clash` | 80 × 80 | The drum states; the window 64 × 64 at (8, 8) left empty |
| `create-drum-notch` | 12 × 8 | The cream changed notch |
| `create-drum-turn-up`, `-down` | 16 × 8 | The turn marks |
| `create-bank-more-left`, `-right` | 16 × 80 | The edge marks |
| `look-{species}-{trait}-{look}-64x64` | 64 × 64 | Per look, per shapeable trait, per species: the flank close-up |
| founder per-look layers | 304 × 312 | Per trait, per look: the part only. Until these exist, a turn changes the drum and the slip but not the founder, and the screen does not pass (concept) |
| `slip-208x296` | 208 × 296 | The slip's paper with its clip, the same paper as `slip-208x408` (Incubator) |

## 8. Open

- **Copy:** "none yet", "none: read a chapter first", "and n more", "to the Incubator", the clash line.
- **For the lead:** the style guide's Create entry still names the rail, the dome and the stamp case (concept, "Open"). It changes with this spec.
- **For the CD:** removing `⧗ n` from Create applies owner ruling 3 literally. If the owner meant only "no other minute count than this kind", the CD should say so.
