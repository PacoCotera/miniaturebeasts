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
| `geneLine` | 288, 192, 24, 208 | The braided line from the well's side into the bank: the drums are fed by this pod | all |
| `founder` | 360, 76, 304, 312, feet 388 (4 off the grid, so the top margin is 17, as the sides) | What they are making. Unread chapters' parts frosted, never guessed. The largest and warmest object | all |
| `dish` | 312, 364, 400, 28 | The moss pad in a shallow cut-out; the founder's contact shadow lies on it | all |
| `slip` | 728, 96, 208, 288 | "Your changes", then "Still a surprise", in words (§4). At Grow: printed with the stamp and code | all |
| `bank` | 88, 400, 848, 130 | The tray of drums along the front edge, grouped under chapter words (§3) | all |
| `travel` | from the pod's rect to (952, 160, 112, 136), clipped at the interior's right edge 953 | The closed pod carried out at the right toward the Incubator | grow 300–900 |

**Clearances:**
- the founder's top is 17 under the interior's top (59), the same margin as the sides; its feet (388) stand on the dish, 24 into it;
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

- **The tray** is 88, 400, 848 × 130. The **window** is x 104–920, the tray minus 16 each side.
- **Chapter words:** 16 px, `mist`, the rail's words ("Coat", "Legs and tail" …), lineTop 400 (ends 420, 4 above the drums), engraved on the tray's back rim, left-aligned at the group's first drum.
- **Drums:** 80 × 96, y 424–520, pitch 88 within a chapter, plus 16 between chapters, in chapter order, then the frame's trait order.
- **What a drum holds** (offsets from its origin):
  - the window, 64 × 64 at (8, 16), with the look's close-up (`look-{species}-{trait}-{look}-64x64`);
  - the round above and below it: a band 64 × 8 at (8, 8) showing the previous face's last 8 rows, and one at (8, 80) showing the next face's first 8 rows, both under the art's curvature shade (`create-drum-shade-80x96`). This is what says "turn me". A drum with one face shows its plain round there;
  - the changed notch, 8 × 16 at (72, 40), `cream`, on the right rim;
  - when focused, the turn marks: ▲ 16 × 8 at (32, 0) and ▼ 16 × 8 at (32, 88), on the rims.
- **The drum's states:**

| State | When | Drawn | ▲ ▼ |
| --- | --- | --- | --- |
| rest | the look as the pod is | `create-drum-rest`, the close-up | turns, if it has more than one face |
| changed | any other face | `create-drum-rest` and the notch | turns |
| one face | a trait the pod carries one look of | no turn marks | nothing |
| pinned | a doing ("breed to change") | `create-drum-pinned` (two joined rings), the close-up | nothing |
| capped | an unread chapter's trait | `create-drum-capped` (the frost veil), no close-up | nothing |
| clash | a clashing changed trait | `create-drum-clash` (red rim) and ✕ `icon:cross:16` at (56, 20), the window's top right | turns |

- **Faces:** a drum has one face per look this pod can give that trait, up to three ("as the pod is", "only the first copy", "only the second copy", as `roll.forms.roll.order`).
  - ▲ turns to the next face and ▼ to the previous, with wrap. Each turn is one cut on the drum, then the founder's roll event (the existing 200 ms dither, gated as now).
  - The concept's 200 ms tumbler is the art's to propose. Until it is signed, the drum is a cut.
- **Sliding:** while a drum is hidden past an edge, that edge shows a **more mark** (16 × 96, `create-bank-more-{left|right}`, at x 104 or 904, y 424), and drums draw only wholly inside the window minus the mark. When the focus moves onto a hidden drum, the tray slides as a cut:
  - the focused drum's chapter word aligns at the window's left (104) if its whole group fits;
  - otherwise the focused drum becomes the last whole drum shown.
  
  No animation. Dirty area: the tray's box, 848 × 130 = 110,240.
- **Counts:** S01 (5 drums) fits with no slide. A 9-drum, 4-chapter bank needs 9 × 88 − 8 + 3 × 16 = 832 > 816, so it shows 8 drums and the more mark. Most species slide.

## 4. The slip and the price

**The slip** (728, 96, 208 × 288). It uses the Incubator slip's paper and width at a shorter height, so the bank can span the bench. Padding 16; text at x 744:

| Block | Lines | Type |
| --- | --- | --- |
| Your changes | heading, then one line per changed trait, "{Trait}: {look}", newest first, up to 4; then "and {n in words} more" | 16 px, weight 500 heading; 16 px lines |
| | none changed: "none yet" (nothing read: "none: read a chapter first") | 16 px, `mist` |
| | a clash adds "✕ {A} and {B} clash", in `red`, under the changes; two lines when it does not fit (see the T-123 amendment) | 16 px |
| Still a surprise | heading, then the unread chapters' words, comma-joined, up to 2 lines | 16 px, weight 500 heading; 16 px, `plateText` (not `mist`: see the T-123 amendment) |
| | none unread: the block is not drawn | |

- **Fit:** the face has three type sizes, 16, 20 and 28 (lead, 13:08). The longest case at pitch 24 is 24 + 5 × 24 (4 changes and "and n more") + 24 (the clash) + 8 + 24 + 2 × 24 = 248 ≤ 256 (the slip minus padding). Every line must be ≤ 176 px, measured; otherwise cut at a word with "…" and report.
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
  - the slip's longest case ≤ 256, with lines ≤ 176 measured;
  - no `rail`, `roll`, `traitLine`, `dome`, `chamber` or `stampCase` region;
  - no `⧗` in the bottom line.
- **The Create face test and region tool:**
  - per state, the drum states of §3;
  - turning a drum redraws the drum, the founder's changed box, the slip's lines and the price, and nothing else (print the dirty area, ≤ 153,600);
  - a slide is ≤ 110,240 plus the ring;
  - the grow beats as now, with the new regions.
- **Focus vectors:** ◀ ▶ along the drums with stops; ▲ ▼ turns; ✓ from any drum; a capped drum ignores ▲ ▼.
- **Goldens:**
  - retake all 16 Create goldens (`create-*`) and `journey-create.json` (focus targets change: report the keys);
  - **add** `create-shape-slid` (S03, focus on its 12th drum) and `create-shape-many-changes` (5 changes: the "and n more" line);
  - no other screen's golden may move.

## 7. Art (T-20261016-41, the art director, by hand)

| Id | Size | What |
| --- | --- | --- |
| `create-bench` | 1024 × 522 | The bench inside the bezel: matte work surface, the well's seat, the dish's cut-out (312, 324 in the slice) and the tray recessed (88, 360 in the slice, 848 × 130), the chapter words' rim along its back edge |
| `create-well` | 192 × 192 | Pods' fitted well at this size |
| pod opened, pod closed | 112 × 136 per species | From the pod renderer, with the place's dust or moss |
| `create-gene-line` | 24 × 208 | The braided line, well side to tray |
| `create-dish` | 400 × 28 | The moss pad and rim |
| `create-drum-rest`, `-pinned`, `-capped`, `-clash` | 80 × 96 | The drum states: a rounded drum seen side-on, its round visible above and below; the window 64 × 64 at (8, 16) left empty |
| `create-drum-notch` | 8 × 16 | The cream changed notch, on the drum's right rim |
| `create-drum-shade-80x96` | 80 × 96 | The drum's curvature shade over the two face bands (8, 8, 64, 8) and (8, 80, 64, 8), so the adjacent faces read as turning away |
| `create-drum-turn-up`, `-down` | 16 × 8 | The turn marks |
| `create-bank-more-left`, `-right` | 16 × 96 | The edge marks |
| `look-{species}-{trait}-{look}-64x64` | 64 × 64 | Per look, per shapeable trait, per species: the flank close-up |
| founder per-look layers | 304 × 312 | Per trait, per look: the part only. Until these exist, a turn changes the drum and the slip but not the founder, and the screen does not pass (concept) |
| `slip-208x288` | 208 × 288 | The slip's paper with its clip, the same paper as `slip-208x408` (Incubator) |

## 8. Open

- **Copy:** "none yet", "none: read a chapter first", "and n more", "to the Incubator", the clash line.
- **For the lead:** the style guide's Create entry still names the rail, the dome and the stamp case (concept, "Open"). It changes with this spec.
- **For the CD:** removing `⧗ n` from Create applies owner ruling 3 literally. If the owner meant only "no other minute count than this kind", the CD should say so.

## Amendment (T-20261016-95): the drum at 80 × 96 (old → new)

At 80 × 80 the drum kept only 8 px of its round above and below its picture, so it read as a framed tile. At 96 tall it shows its round and the edges of the faces before and after, which is what says "turn me". The pitch (88), the chapter gap (16) and the window (x 104–920) do not change, so the paging in §3 is the same at the new height: S01 fits, the 9-drum, 4-chapter case shows 8, S09's 27 drums slide.

| Rect | Old | New |
| --- | --- | --- |
| `bank` (the tray) | 88, 408, 848, 122 | **88, 400, 848, 130** |
| Chapter words | lineTop 414 | **lineTop 400**, on the tray's back rim |
| Drums | 80 × 80, y 440–520 | **80 × 96, y 424–520** |
| Drum window | 64 × 64 at (8, 8) | **64 × 64 at (8, 16)** |
| Face bands (new) | — | **(8, 8, 64, 8) and (8, 80, 64, 8)**, under `create-drum-shade-80x96` |
| Changed notch | 12 × 8 at (34, 0) | **8 × 16 at (72, 40)** |
| Turn marks | ▲ (32, 0), ▼ (32, 72) | **▲ (32, 0), ▼ (32, 88)** |
| Clash ✕ | (60, 4) | **(56, 20)** |
| More marks | 16 × 80 at y 440 | **16 × 96 at y 424** |
| `dish` | 312, 372, 400, 28 | **312, 364, 400, 28** (8 above the tray) |
| `founder` | 360, 80, 304, 312, feet 392 | **360, 76, 304, 312, feet 388**. The top margin is 17, as the sides; 4 off the grid, as the layouts allow for an even margin |
| `slip` | 728, 96, 208, 296 | **728, 96, 208, 288** (16 above the tray). The longest case is 248 ≤ 256 |
| `geneLine` | 288, 192, 24, 216 | **288, 192, 24, 208** (ends at the tray's top) |
| `create-bench` tray in the slice | 88, 368, 848 × 122 | **88, 360, 848 × 130** |
| `create-bench` dish in the slice | 312, 332 | **312, 324** |
| Slide dirty area | 103,456 | **110,240** |

- **The Grow print:** the stamp at (772, 128) and the code at (744, 264) stay inside the 288 slip.
- **The wireframes:** `specs/station-create-bench-wireframes.patch` still draws the bank at the old rects. This table supersedes them, and the build edits the bank's SVG lines to match.

## Amendment (T-20261016-123): three notes from the art review (results/review-art-2026-10-17b.md)

**1. The slip's light words read on its paper.** `mist` is a light grey made for the dark chrome. On the slip's cream paper it is near-illegible at 1×. **Every line on the slip is `plateText`**: the changes, "none yet", "none: read a chapter first", the "Still a surprise" chapters, "and {n} more" and "to the Incubator". The headings tell the blocks apart. The clash line stays `red`. No `mist` is drawn on paper anywhere on this screen.

**2. The clash line fits the slip's 176 px row for every trait pair.**
- "✕ Crown and Eyes clash" is 180 px. The widest pair over all 57 trait names (16 species) is about 246 px ("✕ Translucency and Strength clash"), so no single-line wording fits every pair.
- **The rule:** one line, "✕ {A} and {B} clash", when it measures ≤ 176. Otherwise two lines: "✕ {A}" then "and {B} clash".
- **The worst cases at 16 px** (the metrics vectors' per-glyph widths, with the inline ✕ icon and its gap at 15 px): line 1 is 115 ("✕ Translucency") and line 2 is 175 ("and Translucency clash"). Both are ≤ 176.
- **The block keeps its height:** when the clash takes two lines, "Your changes" shows 3 changes then "and {n} more" (4 lines), plus the 2 clash lines. The longest case is still 248 ≤ 256.

**3. The tray is full for any count.**
- **The rule:** let n be the drums, w the gaps inside chapters, and b the gaps between chapters. The gap inside a chapter is g, and the gap between chapters is 3g (24 at g = 8, as today's 8 + 16). Then g = floor((816 − 80n) / (w + 3b)):
  - if g < 8, the bank slides as §3 says, with g = 8;
  - if 8 ≤ g ≤ 64, the drums are spread at g and the run fills the window (816), centred on what is left over (under one gap);
  - if g > 64, g is 64 and the run is centred in the window.
- **Per species** (frames at batch/B-20261016-3): S01 g 41 (run 810), S04 g 34 (808), S12 g 21 (812). Every other species slides, so its tray is full.
- **Sliding:** the slide never leaves the right side empty either. The run's end is never left of the window's end (904 when a left more mark shows, else 920). At the last drum the tray stops there, rather than aligning a chapter word at 104.
- **The chapter words** stay left-aligned at their group's first drum, at any g.
- **Tests:** for each species frame, the run fills the window within one g, or the bank slides; at the slide's end, the last drum's right edge is the window's end.

