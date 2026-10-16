# The Library spread: fix 14's one focus form, no shut door, the new art's marks (UI/UX spec)

UI/UX, ticket T-20261015-06. Written 2026-10-15 22:40 (America/Mexico_City). It covers layout, states, focus and numbers only.
- The art is T-20261015-05's (the AD's, done).
- The words are the copywriter's: every string marked **copywriter** below is owed, not written here.
- The build is the builder's (§7).

**Contract (read first).**
- Precedence: (recorded decision) and the docs and code on main win over every design document, this one included.
- The visible-change freeze and the whole-screen gate stand. This spec lands through a builder item on station-gate, and the goldens are taken once, last.
- "Every state composed" (station-layouts.md rules 1–5) applies.
- The verdict this answers is the CD's, 2026-10-15 19:17: "Library: fail. ... focus is a red rectangle, not fix 14's form; 'Its Book is not open yet' is a shut door (fix 8); the spread is flat clip-art, not the device's painted language (fix 2); the marks over the frames are under 12 px (fix 11)."
  - Fix 2 and fix 11 are closed by T-05's art.
  - This spec closes fix 14 (§1) and fix 8 (§2), and relays out what the new sizes require (§3).
- **Rule that stays** ((recorded decision) 2026-10-11 02:34): ✓ on a frame opens a species' Book only on a found frame. A met or unmet frame has no ✓ cap (`spread.keys.confirm`).
- No paid call; no art asked.
- **Supersedes** the paper ground of `specs/station-fix14-spec.md`:
  - the token `colours.paper` and FR6's "Today only the Library's frames say so";
  - §5's Library row: "rust ... no keys" becomes the default cased ring.
  - Every other fix 14 rule stands.

**Read at.**
- Public `station-gate` 93bff40f:
  - `prototypes/ui/specs/station/library.json` (`spread`) and `frame.json` (`focus.ring`, `screens.notBuilt.doors`);
  - `library-props.mjs`, `intents/library.mjs`, `screens/library.c`, `vocab/common/focusRing.c`, `screens.c`;
  - the tests `specs.test.mjs`, `intents.test.mjs`, `library-props.test.mjs`, `face/tests/library.test.mjs`, `ring.test.mjs` and `words.test.mjs`;
  - the tools `library-states.mjs`, `make-ring-vectors.mjs`, `focus-diff-mask.mjs` and `layer-check.mjs`;
  - `golden/journey-library.json`;
  - the wireframes 20, 20a and 20b.
- Public `masters-pods` f365361b (T-05):
  - `library-stage-spread-1024x522`, `clan-roundel-C01/04/07/09/13/16-16x16`, `spread-progress-full-12x12`;
  - the proofs `mock-library-spread-1x.png` and `-empty-1x.png`.
- Internal captures `plans/station/gate-library-idle-da22f323/face/golden/library/` (spread, empty, complete, book-shut).
- **"Both spreads"** is read as the two pages of the Library spread (left S01–S08, right S09–S16), in both its captures, filled and empty.
  - The Book's face and guide spreads are slot 8 and are not built: no target of theirs is drawn today.
  - §1.4 gives them the same rule, with their numbers owed by slot 8's spec.

## 0. What I measured on the new art

- **The frame's outline.** On `library-stage-spread-1024x522`, frame S01 at (48, 112, 96, 112):
  - The ink rule lies on the place's own edge: columns 48 and 143, rows 112 and 223.
  - The drop shade lies inside it (column 142, row 222). Nothing is painted outside the box.
  - So the object's outline **is** its place: a square-cornered rectangle, `{ rect: 0 }`, outline = place.
  - All sixteen frames are drawn by one script on one place table (T-05 `make-spread.py`), so the same holds for each.
- **The pages:** x 24–504 and 520–1000, y 56–544 (T-05's fit, as `stage.parts.pages`). The frames sit 24 px from the pages' left and right edges.
- **The cloth ribbon** (painted marker): ink x 491–532, y 54–329. `stage.parts.marker` today says (500, 48, 24, 264), so it is 17 px short and 18 px narrow.
- **The new marks:**
  - Roundels: 16×16, with ink in rows 0–15 (C16 rows 1–15).
  - The progress seed: 12×12, with ink in rows 1–11 and columns 1–10.
- **The ring today** (fix 14, paper ground): rust core 2 px at (x − 4, y − 4, 104, 120), no keys, box (x − 5, y − 5, 106, 122), r 5. It is the "red rectangle".
- **The roundel at T-05's suggested place** (x − 2, y − 20): its last ink row y − 5 lands on the cased ring's outer key (y − 5). That is a 1 px overlap, so it moves (§3).

## 1. Focus: fix 14's one form on the Library

### 1.1 The rule
- **The ground.** The frame's target drops `"ground": "paper"`. It takes the default cased ring like every other screen:
  - the outer key 1 px `void` #0c0a12 at +5;
  - the core 2 px `focus` #ffe6ad at +3 and +4;
  - the inner key 1 px `void` at +2;
  - a gap of 1 px of paper.
  - The `paper` colour set is retired from `frame.json` (§5).
- **Contrast** on paper (luminance 0.800):
  - each `void` key reaches (0.800 + 0.05) / (0.0034 + 0.05) = **15.9:1**, so every cross-section has 2 px at ≥ 3:1;
  - fix 14's F2 floor ((a) area and (b) no hole, rulings-3 §1) holds by construction, as on any light ground;
  - the cream core reads as the ring's body between two dark lines, the same mark as on Home and Pods.
- **The shape:** `{ rect: 0 }`. The ring box is the frame grown 5, with radii 5 / 4 / 2 (outer key / core / inner key), concentric with the square frame. It is never larger and never inside the frame.
- **The lift, 2 px, as chrome lifts on the other screens.**
  - The frame is printed into the stage, so it cannot lift. What lifts is the focused frame's **picture** (the plate if found, the study if met), 2 px up in its mat (y + 6 instead of + 8).
  - The ring is grown from the frame, which does not move, so it does not lift. A creature works the same way: it lifts 4 and its footprint ring stays.
  - An unmet frame has no picture, so only the ring marks it.
  - Moving focus away drops the picture back (a cut, as every lift today).
- **Drawn last**, over the frame's gilt corner and seal, as today (FR2's exception). It is clear of the roundel by 2 px (§3).
- **Focus-in and moves:** a cut. Unchanged.
- **The graph, the vectors, `lastOn`, the keys:** unchanged.

### 1.2 Every focusable object on both pages

Every one is a frame: 96 × 112, square, outline = place, `{ rect: 0 }`, ground default.

| Target | Page | Frame (x, y, w, h) | Ring box (reach 5), r 5 | Core box (4 out), r 4 | Picture when focused (lifted 2) |
| --- | --- | --- | --- | --- | --- |
| `frame.S01` | left | 48, 112, 96, 112 | 43, 107, 106, 122 | 44, 108, 104, 120 | 56, 118, 80, 96 |
| `frame.S02` | left | 160, 112, 96, 112 | 155, 107, 106, 122 | 156, 108, 104, 120 | 168, 118, 80, 96 |
| `frame.S03` | left | 272, 112, 96, 112 | 267, 107, 106, 122 | 268, 108, 104, 120 | 280, 118, 80, 96 |
| `frame.S04` | left | 384, 112, 96, 112 | 379, 107, 106, 122 | 380, 108, 104, 120 | 392, 118, 80, 96 |
| `frame.S05` | left | 48, 296, 96, 112 | 43, 291, 106, 122 | 44, 292, 104, 120 | 56, 302, 80, 96 |
| `frame.S06` | left | 160, 296, 96, 112 | 155, 291, 106, 122 | 156, 292, 104, 120 | 168, 302, 80, 96 |
| `frame.S07` | left | 272, 296, 96, 112 | 267, 291, 106, 122 | 268, 292, 104, 120 | 280, 302, 80, 96 |
| `frame.S08` | left | 384, 296, 96, 112 | 379, 291, 106, 122 | 380, 292, 104, 120 | 392, 302, 80, 96 |
| `frame.S09` | right | 544, 112, 96, 112 | 539, 107, 106, 122 | 540, 108, 104, 120 | 552, 118, 80, 96 |
| `frame.S10` | right | 656, 112, 96, 112 | 651, 107, 106, 122 | 652, 108, 104, 120 | 664, 118, 80, 96 |
| `frame.S11` | right | 768, 112, 96, 112 | 763, 107, 106, 122 | 764, 108, 104, 120 | 776, 118, 80, 96 |
| `frame.S12` | right | 880, 112, 96, 112 | 875, 107, 106, 122 | 876, 108, 104, 120 | 888, 118, 80, 96 |
| `frame.S13` | right | 544, 296, 96, 112 | 539, 291, 106, 122 | 540, 292, 104, 120 | 552, 302, 80, 96 |
| `frame.S14` | right | 656, 296, 96, 112 | 651, 291, 106, 122 | 652, 292, 104, 120 | 664, 302, 80, 96 |
| `frame.S15` | right | 768, 296, 96, 112 | 763, 291, 106, 122 | 764, 292, 104, 120 | 776, 302, 80, 96 |
| `frame.S16` | right | 880, 296, 96, 112 | 875, 291, 106, 122 | 876, 292, 104, 120 | 888, 302, 80, 96 |

The "picture" column applies to found frames (plate) and met frames (study); an unmet frame draws none.

### 1.3 Clearances (FR7), checked on the table
- **Ring to the next frame across:** 11 px (16 − 5). Ring to the frame below: 179 − 120 = 67.
- **Ring to the painted ribbon:** S04 and S08 at 485 against 491, so 6; S09 and S13 at 539 against 533, so 6.
- **Ring to its own roundel:** 2 px (the roundel's last ink row y − 8; the outer key at y − 5).
- **Ring to its own name box** (y + 120): 3 px.
- **Ring to a left neighbour's gilt corner** (x − 24 to x − 8): 4 px.
- **Inside the stage and the page:** the left-most ring x 43 ≥ 24; the right-most ring end 981 ≤ 1000; the top ring y 107 ≥ 56.

### 1.4 The Book's two spreads (slot 8, not built)
- `library.json focus.ring`, "frame.json focus.ring, ground paper: a rust core, no keys", becomes "frame.json focus.ring, the default cased ring (fix 14; specs/station-library-spec.md)".
- Their targets take the same rule when slot 8 builds them:
  - cell, plate and "more?" are `{ rect: 0 }`;
  - a carrier name is `{ rect: 0, chip: 4 }`;
  - each is grown 5, ground default, lift 2 on the object as drawn (FR5).
- Their rects come with slot 8's spec. Nothing is drawn today.

## 2. Shut doors (fix 8): every string, its state, what replaces it

The fix 8 rule (global fix plan row 8): no build words and no dead doors. A control that does nothing must not be drawn as pressable, or the line must say what to do. On the spread, ✓ has no cap on met, unmet and (until slot 8) found frames. So nothing is drawn as pressable there. What makes each a shut door is the message plate a press brings up anyway, naming a door the player cannot use.

| # | String (key) | Today | State it appears in | Replaced by | Final words |
| --- | --- | --- | --- | --- | --- |
| D1 | `spread.strings.bookShut` | "Its Book is not open yet" | ✓ on a **found** frame while `doorOpen("book")` is false (until slot 8). A 4 s message plate; golden `library-book-shut`; journey step 448 | **Silence:** no ✓ cap (as now, `line.found.shut`) and no plate; the press does nothing. From slot 8, ✓ Open its Book (`strings.open`, signed) opens the Book, as decided. The key and its note go | none needed |
| D2 | `spread.strings.met` | "Its Book needs its pod identified" | ✓ on a **met** frame. A plate; journey step 296 | **Silence on ✓** (no cap, no plate). **The line says what to do instead:** the bottom line's context for a met frame (`strings.subjects.met`, today "{species}, only seen") names the species and the one step that makes it found (bring back a pod of it and identify it). The key and its note go | **copywriter**: `subjects.met`, with {species}, ≤ 6 words, no digits, ≤ 208 px at Inter 16 (the context zone), measured by the real measurer |
| D3 | `spread.strings.unmet` | "Nothing is known here yet" | ✓ on an **unmet** frame. A plate; wireframe 20a; journey step 380 | **Silence** (no cap, no plate). The context "an empty frame" (`subjects.unmet`, signed) stays: it names the place and promises nothing. The key goes | none needed; the copywriter may keep or replace `subjects.unmet` under the same limits |
| D4 | `frame.json screens.notBuilt.doors` | "... with no ✓ cap and its screen's shut line (habitat.json strings.shut, library.json spread.strings.bookShut)" | the rule text that names D1 | The Library has no shut line. Drop ", library.json spread.strings.bookShut" from the parenthesis | none |
| D5 | The Book's "not built yet" composition (`host.mjs` :174, when `ui.lib.f` ≠ spread) | the frame's not-built line | **Unreachable** from the Library: `openBook` runs only when `doorOpen("book")`, and D1 makes the found press silent | No change. It must stay unreachable until slot 8 | none |

**Considered and not taken:** an interim "✓ Visit {mibi}" on a found frame until slot 8. `Lib.visitTarget` and the Habitat jump exist, but ✓ would then change meaning when slot 8 opens the Book, and a found species known only by an identified pod has no mibi to visit. Silence is the stable answer.

**Noted outside this screen:** Habitat still shows "the guide is not open yet", "crossing is not open yet" and "portraits are not open yet" (`habitat.json` :692–:694) on doors to slot 8 and other unbuilt screens. They are the same fix 8 class, for Habitat's owner.

## 3. Relayout: only what the new art requires

The new sizes are the roundel 12 → 16 and the seeds 8 → 12. Everything else keeps its rect: the frames, the plate and study (+8, +8, 80 × 96), the name (+0, +120, 96 × 20), the gilt (+88, −8, 16 × 16), the seal (+88, +104, 16 × 16), the pages, the turn corner.

| Part (`spread.item.*`, offsets from the frame's place) | Old | New | Why |
| --- | --- | --- | --- |
| `roundel.at` | 0, −18, 12, 12 | **−2, −23, 16, 16** | T-05's 16 px roundel on its centre x (x + 6). It rises 3 rows to keep **2 px** between its last ink row (y − 8) and the cased ring's outer key (y − 5). T-05's (−2, −20) touched it |
| `roundel.slice` | `clan-roundel-{Cnn}-12x12` | `clan-roundel-{Cnn}-16x16` | T-05 |
| `clanRule.at` | 16, −14, 80, 4 | **18, −17, 78, 4** | On the roundel's centre line (y − 15). It keeps 4 px of paper after the roundel (x + 14 → x + 18) and ends at the frame's right edge (x + 96). 13 px of paper above the frame (was 10) |
| `progress.at` | 26, 152, 44, 8 | **21, 150, 54, 12** | T-05's seeds, centred on x + 48 |
| `progress.seed`, `pitch`, `places` | 8 × 8, 12, (26/38/50/62, 152) | **12 × 12, 14, (21/35/49/63, 150)** | T-05 |
| `progress.slices` | `spread-progress-{full,empty}-8x8` | `spread-progress-{full,empty}-12x12` | T-05 |
| `lift` | 0 | **2** (the focused frame's picture only) | §1.1 |
| `regions.stage.parts.marker` | 500, 48, 24, 264 | **488, 48, 48, 288** | The painted ribbon measures 491–532 × 54–329. Still centred on 512, still clear of every frame and gilt corner (S04's gilt ends at 488) |
| `regions.stage.keepClear` | "... its clan rule's row (y 98 to 102 and 282 to 286) ..." | "... its roundel and clan rule rows (y 89 to 104 and 273 to 288) ..." | the new rows |
| `regions.leftPage.rect`, `regions.rightPage.rect` | 40, 88, 464, **368**; 536, 88, 464, **368** | 40, 88, 464, **376**; 536, 88, 464, **376** | "every part lies inside the region rect": row 2's seeds now end at y 458. 88 + 376 = 464, the margin life's top |

**Vertical budget between the rows** (row 1 at y 112, row 2 at y 296; offsets from row 1):

| Item | Rows | Gap to the next |
| --- | --- | --- |
| frame | 112–223 | 8 |
| name | 232–251 | 4 |
| caption rule | 256 | 5 |
| seeds | 262–273 | 5 to row 2's clan rule (279–282); row 2's roundel (273–288) sits 7 px to the left of the seeds' first column, so they never touch |
| row 2's roundel bottom (288) | — | 2 to the ring's outer key (291) when row 2 is focused, and 7 to the frame (296) |
| row 2's seeds | 446–457 | 6 to the margin life (464) |

**Margins and grid.**
- The frames stay on the 8 px grid: x 48 / 160 / 272 / 384 and 544 / 656 / 768 / 880, y 112 / 296, pitch 112 × 184.
- The outer margins from the pages are **24 left and 24 right** on both pages, within 16–24 and equal. Top: 33 (row 1's roundel at 89, page 56). Bottom: the margin life band 464–536 belongs to the stage.
- The part offsets are off the grid, as today (they hang from the frame's place, centred on its axis or its corners).

**Goldens and captures that move:**
- All four Library goldens and the hashes in `golden/library/library.json`:
  - `library-spread`, `library-spread-empty` and `library-spread-complete` move for the new art, the ring and the parts;
  - `library-book-shut` is retaken: it now shows the spread after ✓ on a found frame with **no plate**, which is the proof of D1's silence. Its id stays.
- The captures `page-library-spread` and `page-library-empty`.
- `golden/journey-library.json`: the three steps that carried a `plate` (today at :296 "Its Book needs its pod identified", :380 "Nothing is known here yet", :448 "Its Book is not open yet") carry none, and the met step's `subject` is the copywriter's D2 line. No other journey step moves.
- No other screen's golden moves. Home's Library module draws its own pictures.

**Dirty area.**
- `spread.events` is `{}`: the Library has no event and no redraw ceiling. Nothing here adds one. The numbers below are computed, because the face was not built here.

| Frame | Today | This spec |
| --- | --- | --- |
| A focus move (a cut) | the old and new ring boxes 2 × 12,932 + the context zone 208 × 24 = **30,856** | **30,856**: the same boxes. The picture's 2 px lift lies inside the new ring box, and its drop inside the old one |
| ✓ on a met, unmet or (until slot 8) found frame | the message plate's box on show and on hide (the plate up to 640 × 36) | **0**: nothing is drawn |

No ceiling exists to rise. The builder prints the focus-move number. If it exceeds 30,856, report.

## 4. Wireframes (SVG only)

The patch below applies to `20-library-spread.svg`, `20a-library-spread-empty.svg` and `20b-library-spread-nav.svg` at station-gate 93bff40f (`git apply --check` clean). Every part rect of the shown frames was checked against the specs test's `boxesOf` rule:
- found and met frames carry the new roundel, rule, plate and name, and found frames the progress;
- the empty spread carries none;
- the marker is (488, 48, 48, 288) in both.

What the patch changes:
- The rust ring becomes the cased ring: three rects, void / cream / void, at the reach-5 box, r 4.5 / 3 / 1.5 on the stroke centres.
- The roundels move to (−2, −23) at 16, the rules to (+18, −17) at 78 × 4, and the seeds to 12 at pitch 14 (+21, +150).
- 20 marks the focused plate's lifted place (dashed) and the "until slot 8, no cap and ✓ does nothing" note.
- 20a loses the message plate.
- 20b's notes say "no cap, no plate".

The builder re-renders the PNGs.

```diff
diff --git a/design/style-guide/station-layouts/20-library-spread.svg b/design/style-guide/station-layouts/20-library-spread.svg
index 04f50a1..33b5d8c 100644
--- a/design/style-guide/station-layouts/20-library-spread.svg
+++ b/design/style-guide/station-layouts/20-library-spread.svg
@@ -13,8 +13,8 @@
 <rect x="536.5" y="464.5" width="399" height="71" fill="none" stroke="#c9b48f" stroke-width="1" stroke-dasharray="3 3"/>
 <text x="44" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 40,464 448×72 (in the stage slice)</text>
 <text x="540" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 536,464 400×72</text>
-<rect x="500.5" y="48.5" width="23" height="263" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
-<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 500,48 24×264</text>
+<rect x="488.5" y="48.5" width="47" height="287" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
+<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 488,48 48×288</text>
 <rect x="48.5" y="112.5" width="95" height="111" fill="#fbf6ea" stroke="#7d5435" stroke-width="1"/>
 <path d="M56.5 120.5h79v95h-79z" fill="none" stroke="#e6c98c" stroke-width="1"/>
 <path d="M48 256h96v1h-96z" fill="#bf9157"/>
@@ -67,77 +67,81 @@
 <text x="44" y="77" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">leftPage 40,88 464×368: a tag, nothing clips; every part inside</text>
 <rect x="536.5" y="88.5" width="463" height="367" fill="none" stroke="#2b6cb0" stroke-width="1" stroke-dasharray="2 3" stroke-opacity="0.6"/>
 <text x="540" y="77" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">rightPage 536,88 464×368: a tag, nothing clips; every part inside</text>
-<rect x="64.5" y="98.5" width="79" height="3" fill="#0f4c50" stroke="none" stroke-width="0"/>
-<rect x="48.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="54" cy="100" r="5.5" fill="#0f4c50" stroke="#7d5435" stroke-width="1"/>
+<rect x="66.5" y="95.5" width="77" height="3" fill="#0f4c50" stroke="none" stroke-width="0"/>
+<rect x="46.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="54" cy="97" r="7.5" fill="#0f4c50" stroke="#7d5435" stroke-width="1"/>
 <rect x="56.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="96" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="96" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="48.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="96" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Loika</text>
-<rect x="74.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="78" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="90" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="102" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="114" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="69.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="75" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="89" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="103" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="117" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
 <rect x="136.5" y="104.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
 <path d="M136 104h16v16h-4v-12h-12z" fill="#bf9157"/>
-<rect x="176.5" y="98.5" width="79" height="3" fill="#1e5196" stroke="none" stroke-width="0"/>
-<rect x="160.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="166" cy="100" r="5.5" fill="#1e5196" stroke="#7d5435" stroke-width="1"/>
+<rect x="178.5" y="95.5" width="77" height="3" fill="#1e5196" stroke="none" stroke-width="0"/>
+<rect x="158.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="166" cy="97" r="7.5" fill="#1e5196" stroke="#7d5435" stroke-width="1"/>
 <rect x="168.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="208" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="208" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="160.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="208" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Untuva</text>
-<rect x="186.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="190" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="202" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="214" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="226" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<rect x="288.5" y="98.5" width="79" height="3" fill="#329245" stroke="none" stroke-width="0"/>
-<rect x="272.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="278" cy="100" r="5.5" fill="#329245" stroke="#7d5435" stroke-width="1"/>
+<rect x="181.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="187" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="201" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="215" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="229" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="290.5" y="95.5" width="77" height="3" fill="#329245" stroke="none" stroke-width="0"/>
+<rect x="270.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="278" cy="97" r="7.5" fill="#329245" stroke="#7d5435" stroke-width="1"/>
 <rect x="280.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="320" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="320" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="272.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="320" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Tuikis</text>
-<rect x="298.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="302" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="314" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="326" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="338" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<rect x="400.5" y="98.5" width="79" height="3" fill="#6f41c6" stroke="none" stroke-width="0"/>
-<rect x="384.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="390" cy="100" r="5.5" fill="#6f41c6" stroke="#7d5435" stroke-width="1"/>
+<rect x="293.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="299" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="313" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="327" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="341" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="402.5" y="95.5" width="77" height="3" fill="#6f41c6" stroke="none" stroke-width="0"/>
+<rect x="382.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="390" cy="97" r="7.5" fill="#6f41c6" stroke="#7d5435" stroke-width="1"/>
 <rect x="392.5" y="120.5" width="79" height="95" fill="#f1efe9" stroke="#8d8aa6" stroke-width="1" stroke-dasharray="2 2"/>
 <text x="432" y="168" font-size="8" fill="#5d5974" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">study</text>
 <text x="432" y="178" font-size="7" fill="#8d8aa6" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="384.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="432" y="247" font-size="16" fill="#5d5974" text-anchor="middle">Hiljan</text>
-<rect x="560.5" y="98.5" width="79" height="3" fill="#4b3023" stroke="none" stroke-width="0"/>
-<rect x="544.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="550" cy="100" r="5.5" fill="#4b3023" stroke="#7d5435" stroke-width="1"/>
+<rect x="562.5" y="95.5" width="77" height="3" fill="#4b3023" stroke="none" stroke-width="0"/>
+<rect x="542.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="550" cy="97" r="7.5" fill="#4b3023" stroke="#7d5435" stroke-width="1"/>
 <rect x="552.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="592" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="592" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="544.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="592" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Belatz</text>
-<rect x="570.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="574" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="586" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="598" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="610" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<rect x="565.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="571" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="585" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="599" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="613" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
 <rect x="632.5" y="216.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
 <circle cx="640" cy="224" r="7.5" fill="#e6c98c" stroke="#7d5435" stroke-width="1"/>
-<rect rx="6" x="269" y="109" width="102" height="118" fill="none" stroke="#a6420c" stroke-width="2"/>
-<text x="48" y="85" font-size="7" fill="#555" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">roundel 12×12 at +0,−18 (y 94 to 106) · clan rule 80×4 at +16,−14 (y 98 to 102)</text>
-<text x="544" y="85" font-size="7" fill="#555" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">the clan's colour by id; 10 px of paper between the rule and the frame</text>
+<rect rx="4.5" x="267.5" y="107.5" width="105" height="121" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<rect rx="3" x="269" y="109" width="102" height="118" fill="none" stroke="#ffe6ad" stroke-width="2"/>
+<rect rx="1.5" x="270.5" y="110.5" width="99" height="115" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<rect x="280.5" y="118.5" width="79" height="95" fill="none" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 2"/>
+<text x="48" y="85" font-size="7" fill="#555" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">roundel 16×16 at −2,−23 (y 89 to 104) · clan rule 78×4 at +18,−17 (y 95 to 98)</text>
+<text x="544" y="85" font-size="7" fill="#555" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">the clan's colour by id; 13 px of paper between the rule and the frame</text>
 <text x="48" y="281" font-size="7" fill="#7d5435" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">gilt 16×16 at +88,−8: a clay L · seal 16×16 at +88,+104: a sand disc · the ring draws over both</text>
-<text x="48" y="290" font-size="7" fill="#7d5435" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">progress: four 8×8 seeds, 12 pitch, at +26,+152; full = steps reached</text>
+<text x="48" y="290" font-size="7" fill="#7d5435" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">progress: four 12×12 seeds, 14 pitch, at +21,+150; full = steps reached</text>
 <text x="160" y="450" font-size="8" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">unmet: the stage's empty frame, no cue</text>
-<text x="544" y="281" font-size="7" fill="#a6420c" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">ring 268,108 104×120 on Tuikis: rust on paper, nothing lifts</text>
+<text x="544" y="281" font-size="7" fill="#a6420c" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">ring 267,107 106×122 r 5 on Tuikis: void key, cream core, void key; the plate lifts 2</text>
+<text x="544" y="290" font-size="7" fill="#555" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">until slot 8: no ✓ cap, and ✓ does nothing on any frame (fix 8)</text>
 <text x="544" y="452" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">frames 96×112 on a 112 pitch, rows y 112 and 296; plate at +8,+8 80×96; name at +0,+120 96×20</text>
 <rect x="0.5" y="0.5" width="1023" height="39" fill="#e6e6e2" stroke="#444" stroke-width="1"/>
 <rect x="16.5" y="8.5" width="23" height="23" fill="none" stroke="none" stroke-width="0"/>
diff --git a/design/style-guide/station-layouts/20a-library-spread-empty.svg b/design/style-guide/station-layouts/20a-library-spread-empty.svg
index 6d4d452..831d952 100644
--- a/design/style-guide/station-layouts/20a-library-spread-empty.svg
+++ b/design/style-guide/station-layouts/20a-library-spread-empty.svg
@@ -1,5 +1,5 @@
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 600" width="1024" height="600" font-family="Inter, sans-serif">
-<title>Library, the spread with the journal empty: sixteen empty frames, the ring on the first, no ✓ cap; the message plate on a press. 1024×600 at 1×, measured.</title>
+<title>Library, the spread with the journal empty: sixteen empty frames, the ring on the first, no ✓ cap; no plate on a press. 1024×600 at 1×, measured.</title>
 <defs><pattern id="g8" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#efefef" stroke-width="0.5"/></pattern><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#2b6cb0"/></marker></defs>
 <rect width="1024" height="600" fill="#ffffff"/><rect width="1024" height="600" fill="url(#g8)"/>
 <rect x="0.5" y="40.5" width="1023" height="521" fill="none" stroke="#ddd" stroke-width="1" stroke-dasharray="1 3"/>
@@ -13,8 +13,8 @@
 <rect x="536.5" y="464.5" width="399" height="71" fill="none" stroke="#c9b48f" stroke-width="1" stroke-dasharray="3 3"/>
 <text x="44" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 40,464 448×72 (in the stage slice)</text>
 <text x="540" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 536,464 400×72</text>
-<rect x="500.5" y="48.5" width="23" height="263" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
-<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 500,48 24×264</text>
+<rect x="488.5" y="48.5" width="47" height="287" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
+<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 488,48 48×288</text>
 <rect x="48.5" y="112.5" width="95" height="111" fill="#fbf6ea" stroke="#7d5435" stroke-width="1"/>
 <path d="M56.5 120.5h79v95h-79z" fill="none" stroke="#e6c98c" stroke-width="1"/>
 <path d="M48 256h96v1h-96z" fill="#bf9157"/>
@@ -63,10 +63,10 @@
 <rect x="880.5" y="296.5" width="95" height="111" fill="#fbf6ea" stroke="#7d5435" stroke-width="1"/>
 <path d="M888.5 304.5h79v95h-79z" fill="none" stroke="#e6c98c" stroke-width="1"/>
 <path d="M880 440h96v1h-96z" fill="#bf9157"/>
-<rect rx="6" x="45" y="109" width="102" height="118" fill="none" stroke="#a6420c" stroke-width="2"/>
-<rect x="399.5" y="514.5" width="224" height="35" fill="#23292f" stroke="#e6c98c" stroke-width="1"/>
-<text x="512" y="537" font-size="16" fill="#f1ebdf" text-anchor="middle">Nothing is known here yet</text>
-<text x="391" y="508" font-size="7" fill="#555" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">message plate on ✓: 225×36, centred on 512, bottom at y 550</text>
+<rect rx="4.5" x="43.5" y="107.5" width="105" height="121" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<rect rx="3" x="45" y="109" width="102" height="118" fill="none" stroke="#ffe6ad" stroke-width="2"/>
+<rect rx="1.5" x="46.5" y="110.5" width="99" height="115" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<text x="391" y="508" font-size="7" fill="#555" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ on an empty frame: no cap, no plate (fix 8)</text>
 <text x="160" y="452" font-size="8" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">a fresh world: no plate, no study, no name, no clan rule, no roundel</text>
 <rect x="0.5" y="0.5" width="1023" height="39" fill="#e6e6e2" stroke="#444" stroke-width="1"/>
 <rect x="16.5" y="8.5" width="23" height="23" fill="none" stroke="none" stroke-width="0"/>
diff --git a/design/style-guide/station-layouts/20b-library-spread-nav.svg b/design/style-guide/station-layouts/20b-library-spread-nav.svg
index 5091e0e..5fe9c84 100644
--- a/design/style-guide/station-layouts/20b-library-spread-nav.svg
+++ b/design/style-guide/station-layouts/20b-library-spread-nav.svg
@@ -13,8 +13,8 @@
 <rect x="536.5" y="464.5" width="399" height="71" fill="none" stroke="#c9b48f" stroke-width="1" stroke-dasharray="3 3"/>
 <text x="44" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 40,464 448×72 (in the stage slice)</text>
 <text x="540" y="476" font-size="7" fill="#a08a6a" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">margin life 536,464 400×72</text>
-<rect x="500.5" y="48.5" width="23" height="263" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
-<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 500,48 24×264</text>
+<rect x="488.5" y="48.5" width="47" height="287" fill="#d9c9a8" stroke="#a08a6a" stroke-width="1" stroke-dasharray="3 3"/>
+<text x="512" y="196" font-size="7" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace" transform="rotate(-90 512 196)">marker 488,48 48×288</text>
 <rect x="48.5" y="112.5" width="95" height="111" fill="#fbf6ea" stroke="#7d5435" stroke-width="1"/>
 <path d="M56.5 120.5h79v95h-79z" fill="none" stroke="#e6c98c" stroke-width="1"/>
 <path d="M48 256h96v1h-96z" fill="#bf9157"/>
@@ -63,68 +63,68 @@
 <rect x="880.5" y="296.5" width="95" height="111" fill="#fbf6ea" stroke="#7d5435" stroke-width="1"/>
 <path d="M888.5 304.5h79v95h-79z" fill="none" stroke="#e6c98c" stroke-width="1"/>
 <path d="M880 440h96v1h-96z" fill="#bf9157"/>
-<rect x="64.5" y="98.5" width="79" height="3" fill="#0f4c50" stroke="none" stroke-width="0"/>
-<rect x="48.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="54" cy="100" r="5.5" fill="#0f4c50" stroke="#7d5435" stroke-width="1"/>
+<rect x="66.5" y="95.5" width="77" height="3" fill="#0f4c50" stroke="none" stroke-width="0"/>
+<rect x="46.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="54" cy="97" r="7.5" fill="#0f4c50" stroke="#7d5435" stroke-width="1"/>
 <rect x="56.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="96" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="96" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="48.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="96" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Loika</text>
-<rect x="74.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="78" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="90" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="102" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="114" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="69.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="75" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="89" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="103" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="117" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
 <rect x="136.5" y="104.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
 <path d="M136 104h16v16h-4v-12h-12z" fill="#bf9157"/>
-<rect x="176.5" y="98.5" width="79" height="3" fill="#1e5196" stroke="none" stroke-width="0"/>
-<rect x="160.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="166" cy="100" r="5.5" fill="#1e5196" stroke="#7d5435" stroke-width="1"/>
+<rect x="178.5" y="95.5" width="77" height="3" fill="#1e5196" stroke="none" stroke-width="0"/>
+<rect x="158.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="166" cy="97" r="7.5" fill="#1e5196" stroke="#7d5435" stroke-width="1"/>
 <rect x="168.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="208" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="208" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="160.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="208" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Untuva</text>
-<rect x="186.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="190" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="202" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="214" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<circle cx="226" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<rect x="288.5" y="98.5" width="79" height="3" fill="#329245" stroke="none" stroke-width="0"/>
-<rect x="272.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="278" cy="100" r="5.5" fill="#329245" stroke="#7d5435" stroke-width="1"/>
+<rect x="181.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="187" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="201" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="215" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<circle cx="229" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="290.5" y="95.5" width="77" height="3" fill="#329245" stroke="none" stroke-width="0"/>
+<rect x="270.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="278" cy="97" r="7.5" fill="#329245" stroke="#7d5435" stroke-width="1"/>
 <rect x="280.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="320" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="320" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="272.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="320" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Tuikis</text>
-<rect x="298.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="302" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="314" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="326" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="338" cy="268" r="3.5" fill="none" stroke="#bf9157" stroke-width="1"/>
-<rect x="400.5" y="98.5" width="79" height="3" fill="#6f41c6" stroke="none" stroke-width="0"/>
-<rect x="384.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="390" cy="100" r="5.5" fill="#6f41c6" stroke="#7d5435" stroke-width="1"/>
+<rect x="293.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="299" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="313" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="327" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="341" cy="268" r="5" fill="none" stroke="#bf9157" stroke-width="1"/>
+<rect x="402.5" y="95.5" width="77" height="3" fill="#6f41c6" stroke="none" stroke-width="0"/>
+<rect x="382.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="390" cy="97" r="7.5" fill="#6f41c6" stroke="#7d5435" stroke-width="1"/>
 <rect x="392.5" y="120.5" width="79" height="95" fill="#f1efe9" stroke="#8d8aa6" stroke-width="1" stroke-dasharray="2 2"/>
 <text x="432" y="168" font-size="8" fill="#5d5974" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">study</text>
 <text x="432" y="178" font-size="7" fill="#8d8aa6" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="384.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="432" y="247" font-size="16" fill="#5d5974" text-anchor="middle">Hiljan</text>
-<rect x="560.5" y="98.5" width="79" height="3" fill="#4b3023" stroke="none" stroke-width="0"/>
-<rect x="544.5" y="94.5" width="11" height="11" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="550" cy="100" r="5.5" fill="#4b3023" stroke="#7d5435" stroke-width="1"/>
+<rect x="562.5" y="95.5" width="77" height="3" fill="#4b3023" stroke="none" stroke-width="0"/>
+<rect x="542.5" y="89.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="550" cy="97" r="7.5" fill="#4b3023" stroke="#7d5435" stroke-width="1"/>
 <rect x="552.5" y="120.5" width="79" height="95" fill="#ffe2bf" stroke="#c45f12" stroke-width="1.5"/>
 <text x="592" y="168" font-size="8" fill="#7d5435" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plate</text>
 <text x="592" y="178" font-size="7" fill="#a06a3a" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">80×96</text>
 <rect x="544.5" y="232.5" width="95" height="19" fill="none" stroke="#cfc6b4" stroke-width="1" stroke-dasharray="1 2"/>
 <text x="592" y="247" font-size="16" fill="#1a1725" text-anchor="middle">Belatz</text>
-<rect x="570.5" y="264.5" width="43" height="7" fill="none" stroke="none" stroke-width="0"/>
-<circle cx="574" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="586" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="598" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
-<circle cx="610" cy="268" r="4" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<rect x="565.5" y="262.5" width="53" height="11" fill="none" stroke="none" stroke-width="0"/>
+<circle cx="571" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="585" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="599" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
+<circle cx="613" cy="268" r="5.5" fill="#7d5435" stroke="#bf9157" stroke-width="0"/>
 <rect x="632.5" y="104.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
 <path d="M632 104h16v16h-4v-12h-12z" fill="#bf9157"/>
 <rect x="632.5" y="216.5" width="15" height="15" fill="none" stroke="none" stroke-width="0"/>
@@ -139,13 +139,15 @@
 <text x="32" y="272" font-size="8" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">◀ stops</text>
 <text x="984" y="104" font-size="8" fill="#2b6cb0" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">▶ stops</text>
 <text x="984" y="424" font-size="8" fill="#2b6cb0" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">▼ stops</text>
-<rect rx="6" x="541" y="109" width="102" height="118" fill="none" stroke="#a6420c" stroke-width="2"/>
-<text x="544" y="281" font-size="7" fill="#a6420c" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">ring 540,108 104×120 on Belatz, drawn last:</text>
+<rect rx="4.5" x="539.5" y="107.5" width="105" height="121" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<rect rx="3" x="541" y="109" width="102" height="118" fill="none" stroke="#ffe6ad" stroke-width="2"/>
+<rect rx="1.5" x="542.5" y="110.5" width="99" height="115" fill="none" stroke="#0c0a12" stroke-width="1"/>
+<text x="544" y="281" font-size="7" fill="#a6420c" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">ring 539,107 106×122 r 5 on Belatz, drawn last:</text>
 <text x="544" y="290" font-size="7" fill="#a6420c" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">over the gilt corner and the seal; their offsets stand</text>
 <rect x="552.5" y="480.5" width="399" height="63" fill="#ffffff" stroke="#2b6cb0" stroke-width="1"/>
-<text x="560" y="491" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ found: its Book (until slot 8 "not built yet": title Library, ← Library)</text>
-<text x="560" y="502" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ met: no cap; the plate "Its Book needs its pod identified"</text>
-<text x="560" y="513" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ unmet: no cap; the plate "Nothing is known here yet"</text>
+<text x="560" y="491" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ found: its Book from slot 8; until then no cap and no plate (fix 8)</text>
+<text x="560" y="502" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ met: no cap, no plate; the context line names the next step (copywriter)</text>
+<text x="560" y="513" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">✓ unmet: no cap, no plate</text>
 <text x="560" y="524" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">← Home (the ring on Home's Library module); ← on the Book: the spread</text>
 <text x="560" y="535" font-size="7" fill="#2b6cb0" text-anchor="start" font-family="DejaVu Sans Mono, ui-monospace, monospace">Library key, Home's module: the ring where it was (fresh: S01)</text>
 <rect x="968.5" y="512.5" width="23" height="23" fill="none" stroke="#2b6cb0" stroke-width="1" stroke-dasharray="2 2"/>
```

## 5. Spec edits (old → new)

**`prototypes/ui/specs/station/library.json`**

| Key | Old | New |
| --- | --- | --- |
| `spread.focus.targets.frame.ground` | `"paper"` | removed (default) |
| `spread.focus.targets.frame.colour` | "frame.json focus.ring.colours.paper (rust, no keys)" | "frame.json focus.ring.colours.default: void keys, a cream core (fix 14's one form; specs/station-library-spec.md)" |
| `spread.focus.targets.frame.ringBox` | "[x − 5, y − 5, 106, 122]" | unchanged; add `"core": "[x − 4, y − 4, 104, 120]"` |
| `spread.focus.targets.frame.lift` | 0 | 0 (the frame is printed; the ring does not lift) |
| `spread.item.lift`, `liftNote` | 0; "on paper nothing lifts …" | 2; "the focused frame's picture (plate or study) lifts 2 px in its mat, as chrome lifts on the other screens; the frame is printed into the stage and its ring stays (as a creature lifts and its footprint ring stays); an unmet frame has nothing to lift" |
| `spread.item.roundel` | `at [0,-18,12,12]`, slice `-12x12`, note "… 2 px clear of the ring's top edge …" | `at [-2,-23,16,16]`, slice `clan-roundel-{Cnn}-16x16`, note "… its centre on the rule's centre line (y 97 and 281); 4 px of paper before the rule; 2 px clear of the ring's outer key (y − 5) …" |
| `spread.item.clanRule` | `at [16,-14,80,4]`, note "y 98 to 102 … 282 to 286 … 10 px of paper" | `at [18,-17,78,4]`, note "y 95 to 98 on row 1, 279 to 282 on row 2, from x + 18 to the frame's right edge, beside the roundel; 13 px of paper between it and the frame" |
| `spread.item.progress` | `at [26,152,44,8]`, `pitch 12`, `seed [8,8]`, `places [[26,152],[38,152],[50,152],[62,152]]`, slices `-8x8`, note "… y 264 to 272 … 8 px under the caption rule, 8 px over the next row's roundel and 8 px over the margin life …" | `at [21,150,54,12]`, `pitch 14`, `seed [12,12]`, `places [[21,150],[35,150],[49,150],[63,150]]`, slices `spread-progress-{full,empty}-12x12`, note "… y 262 to 274 on row 1 and 446 to 458 on row 2, 5 px of paper under the caption rule, 5 px over the next row's clan rule, 7 px right of its roundel, 6 px over the margin life; clear of the gilt corner, the seal, the name, the rule and the roundel" |
| `spread.regions.stage.parts.marker`, `markerNote` | `[500,48,24,264]` | `[488,48,48,288]`; "the painted ribbon (ink 491–532 × 54–329, T-20261015-05), centred on x 512" |
| `spread.regions.stage.keepClear` | "… its clan rule's row (y 98 to 102 and 282 to 286) …" | "… its roundel and clan rule rows (y 89 to 104 and 273 to 288) …" |
| `spread.regions.leftPage.rect`, `rightPage.rect` | `[40,88,464,368]`, `[536,88,464,368]` | `[40,88,464,376]`, `[536,88,464,376]` |
| `spread.keys.confirm` | "… A found frame: until slot 8 … the press shows the message plate strings.bookShut, as a met frame does; … A met frame: … the press shows the message plate strings.met; … An unmet frame: … the press shows the message plate strings.unmet …" | "… A found frame: until slot 8 (doorOpen(book) false) no ✓ cap (line.found.shut) and the press does nothing; from slot 8, a cut to that species' Book, its face spread. A met frame: no ✓ cap (line.met.action null) and the press does nothing; its line says what to do (strings.subjects.met). An unmet frame: no ✓ cap and the press does nothing. No message plate on the spread (fix 8: no shut door; specs/station-library-spec.md)" |
| `spread.strings.met`, `metNote`, `unmet`, `bookShut`, `bookShutNote` | the three plates and their notes | removed |
| `spread.strings.subjects.met` | "{species}, only seen" | **copywriter** (D2): the species and the step that makes it found, ≤ 6 words, no digits, ≤ 208 px at 16. Until it lands, "{species}, only seen" stays |
| `spread.strings._note` | "… the plate one sentence" | "… no plate on the spread (fix 8)" |
| `spread.journey` | "… its press shows strings.met … strings.unmet … ✓ on a found frame shows strings.bookShut …" | "… a met frame has no ✓ cap and its press does nothing, its line says the next step; an unmet frame has no ✓ cap and its press does nothing; ✓ on a found frame does nothing until slot 8 …" |
| `spread.masters`, `spread.placeholders` | `clan-roundel-{Cnn}-12x12`, `spread-progress-{full,empty}-8x8` | `clan-roundel-{Cnn}-16x16` (placeholder: a 16×16 disc in the clan's colour with a 1 px `bark` edge), `spread-progress-{full,empty}-12x12` (placeholders: a 12×12 `bark` disc; a 12×12 disc outline, 1 px `clay`) |
| `spread.colours.ring` | `"rust"` | removed |
| `focus.ring` (the Book) | "frame.json focus.ring, ground paper: a rust core, no keys" | "frame.json focus.ring, the default cased ring (fix 14's one form; specs/station-library-spec.md §1.4)" |
| `status` | — | append "Fix 14 and fix 8 (specs/station-library-spec.md): the default cased ring on the frames, the picture lifts 2; no message plate on the spread; the 16 px roundels and 12 px seeds placed" |

**`prototypes/ui/specs/station/frame.json`**
- `focus.ring.colours`: remove `"paper"`, leaving `{ "default": { "core": "focus", "key": "void" } }`.
- `focus.ring.paperScreens`: removed.
- `screens.notBuilt.doors`: "(habitat.json strings.shut, library.json spread.strings.bookShut)" becomes "(habitat.json strings.shut)".

**Code** (the builder's; small, named):
- `prototypes/station/src/intents/library.mjs`:
  - :25 becomes `if (status === "found" && doorOpen("book")) openBook(h, id);`;
  - :26 (`else h.say(...)`) goes;
  - the header comment at :1–2 reads "✓ on a met or unmet frame, or a found one before slot 8, does nothing (no plate: fix 8)".
- `prototypes/face/src/screens/library.c` :45–48: the picture is drawn at `py − lift` when the frame is the current focus (`spread.item.lift`, read from the spec; `cur()` gives the frame). Nothing else moves with it.
- `prototypes/face/src/vocab/common/focusRing.c` :44 (`ground_of`): the ground is always `default`.
- `prototypes/face/src/screens/screens.c` :53–57: `ground` must be `"default"` when present. The error names this spec: "the paper ground is retired (specs/station-library-spec.md)".
- `library-props.mjs` needs no change: sizes come from the spec, and `roundel` and `slot` read `at.slice(2)`.

## 6. Tests to change (exact)

**`prototypes/ui/tests/specs.test.mjs`** (the Library block, :713–:785)
- :738:
  - `f[1] - (rule[1] + rule[3])`: 10 → **13**;
  - `roundel[1] + roundel[3] <= f[1] - 4` → `<= f[1] - 7`, titled "2 px clear of the ring's outer key (f − 5)";
  - the rule-after-roundel 4 and the centre line hold as written (18 − 14 = 4; −23 + 8 = −17 + 2 = −15).
- :742: `progress[1] === capRule + 8` → `capRule + 6`, titled "5 px of paper under the caption rule".
- :743: `gapOk(progress, at(g, a), 8)` → `gapOk(progress, at(g, a), 5)`, and `gapOk(progress, b, 8)` for the margin life → `5`. Titles: "5 px from the next row's marks", "5 px over the margin life".
- :751: `assert.equal(I.lift, 0)` → `assert.equal(I.lift, 2)`.
- :760:
  - `assert.equal(S.focus.targets.frame.ground, "paper")` → `assert.equal(S.focus.targets.frame.ground, undefined)`;
  - keep `lift 0`;
  - `frame.focus.ring.paperScreens.includes("library")` → `assert.ok(!("paperScreens" in frame.focus.ring) && !("paper" in frame.focus.ring.colours), "one form: no paper ground")`.
- :771: `assert.ok(S.strings.met && S.strings.unmet, "a plate for a met and for an empty frame")` → `for (const k of ["met", "unmet", "bookShut"]) assert.ok(!(k in S.strings), k + ": no plate on the spread (fix 8)")`.
- :778: `!Object.values(CC).includes(frame.focus.ring.colours.paper.core)` → `!Object.values(CC).includes("focus") && !Object.values(CC).includes("void")`, titled "no clan colour is a ring colour".
- Add, in the per-frame loop:
  - `inside([f[0] - 5, f[1] - 5, 106, 122], page)`;
  - the ring box apart from every other frame by ≥ 11;
  - `apart([f[0] - 5, f[1] - 5, 106, 122], P.marker)`;
  - `inside(progress, i < 8 ? R.leftPage.rect : R.rightPage.rect)`.
- Add, once: `assert.deepEqual(P.marker, [488, 48, 48, 288])`, and `assert.deepEqual([R.leftPage.rect[3], R.rightPage.rect[3]], [376, 376])`.

**`prototypes/station/tests/intents.test.mjs`** :144–151:
- :148 `assert.equal(h.said.at(-1), Sg.unmet)` → `assert.equal(h.said.length, n0)` ("nothing said"), with `const n0 = h.said.length` taken before.
- :149, likewise for the met frame.
- :151 `[h.ui.lib.f, h.ui.lib.i, h.said.at(-1)], ["spread", 0, Sg.bookShut]` → `[h.ui.lib.f, h.ui.lib.i, h.said.length], ["spread", 0, 0]` ("a found frame before slot 8: nothing opens, nothing is said").
- The title: "… on a met or an unmet frame says its plate …" → "… on a met, an unmet or (before slot 8) a found frame does nothing …".

**`prototypes/face/tools/library-states.mjs`**:
- :3–4 and :21: `library-book-shut` stays as a timed state.
- :62–71: the check becomes "no plate". `p.msg` is empty, and `p.type` has no `plate` region. The fail text is "library-book-shut: a plate was drawn (fix 8: no shut door)".

**`prototypes/face/tests/library.test.mjs`** :66–67: the departure bite still moves the roundel and seed 2 by one pixel. No number changes.

**`prototypes/station/tests/library-props.test.mjs`**: :61–62 match `/^clan-roundel-C\d\d-16x16$/` if they assert the size; otherwise no change.

**The ring word** (the paper ground retired):
- `prototypes/face/tests/ring.test.mjs` :79–81 → "the cased ring has its keys on every ground": drop the `paper` call, and keep `dflt` with `["key","core","key"]` and the S values 14 / 26.
- `prototypes/face/tests/words.test.mjs`:
  - :83 `core = rgbOf("focus")`;
  - :89 `key_n > 0` always;
  - :100 drop the paper case.
- `prototypes/face/tools/make-ring-vectors.mjs`:
  - :43 and :49 `for (const ground of ["default"])`;
  - :56 the "rect 0, on paper" vector becomes "rect 0, a Library frame", `{ shape: { rect: 0 } }`, box [60, 400, 96, 112].
  - Regenerate the ring vectors with this tool; never hand-edit them.
- `prototypes/face/tools/focus-diff-mask.mjs` :46: `{ ground: "default" }` for every screen.
- `prototypes/face/tools/layer-check.mjs` :62–72: drop the rust-on-paper branch. Only `focus` pixels are counted, on every screen.

## 7. Builder instructions (self-contained)

**Contract.**
- Build on your own branch off `station-gate`.
- Commits by Paco Cotera <paco@cotera.org>, no trailers, no model or session names. Push only your own branch, never force. Run `node .github/public-guard/guard.mjs --base station-gate` before every push.
- No paid calls. `place-masters` only with `--only --ids`.
- Precedence: (recorded decision) and main win. If a number here disagrees with the code, stop and report; do not choose.
- Do not write any string marked copywriter. `subjects.met` keeps "{species}, only seen" until the copywriter's line lands.
- Report in a few lines: the head, CI, the goldens that moved, and the focus-move number printed.

**Steps.**
1. **Masters** (T-05, `masters-pods` f365361b or later):
   - `place-masters --only --ids library-stage-spread-1024x522,spread-plate-S01-80x96,spread-plate-S02-80x96,spread-plate-S03-80x96,spread-plate-S09-80x96,spread-gilt-corner-16x16,spread-seal-16x16,spread-progress-full-12x12,spread-progress-empty-12x12,clan-roundel-C01-16x16,…,clan-roundel-C16-16x16` (all sixteen roundels).
   - Remove the 12×12 roundel and 8×8 seed ids from the register and `asset-policy.mjs` if they are listed there.
2. **`library.json`**, as in §5:
   - drop the frame's `ground` and add `core`;
   - `item.lift` 2; roundel `[-2,-23,16,16]` and its 16×16 slice; clan rule `[18,-17,78,4]`;
   - progress `[21,150,54,12]`, pitch 14, seed `[12,12]`, places 21/35/49/63 at 150, slices 12×12;
   - marker `[488,48,48,288]`; pages' region h 376; keepClear rows 89–104 and 273–288;
   - remove `strings.met`, `metNote`, `unmet`, `bookShut`, `bookShutNote` and `colours.ring`;
   - rewrite `keys.confirm`, `journey` and the Book's `focus.ring`;
   - masters and placeholders at the new sizes; append to `status`.
3. **`frame.json`**: remove `focus.ring.colours.paper` and `focus.ring.paperScreens`, and drop "library.json spread.strings.bookShut" from `screens.notBuilt.doors`.
4. **Code:**
   - `intents/library.mjs`: ✓ opens the Book only when found and `doorOpen("book")`, and says nothing otherwise;
   - `library.c`: the focused frame's picture is drawn at `y + 8 − lift`;
   - `focusRing.c` `ground_of`: default only;
   - `screens.c`: refuse `ground` other than `"default"`.
5. **Tests and tools** as in §6. Regenerate the ring vectors with `make-ring-vectors.mjs`.
6. **Wireframes and docs.**
   - Apply the SVG patch (§4 of specs/station-library-spec.md, embedded) to 20, 20a and 20b, and re-render their PNGs.
   - In `design/style-guide/station-layouts.md`, Library spread:
     - the ring sentence ("rust on paper, nothing lifts" and "frame outset 5, radius 5: 106×122, rust, no keys") becomes "the default cased ring, 106×122 r 5: void, cream, void; the focused picture lifts 2";
     - the roundel, rule and seed numbers as in §3;
     - the three message-plate lines go;
     - the marker's rect is 488, 48, 48 × 288.
7. **Goldens, last:**
   - Retake `library-spread`, `-spread-empty`, `-spread-complete` and `-book-shut` and their hashes, plus `page-library-spread` and `page-library-empty`;
   - re-record `journey-library.json` (three steps lose their plate).
   - No other golden may move, apart from the ring vectors you regenerated.
   - Print the focus-move dirty area; expect 30,856 or less.

## 8. Open points

1. **Copywriter (one string):** `spread.strings.subjects.met`, the met frame's line that says the next step (D2). Optionally `subjects.unmet` (D3). The limits are in §2.
2. **AD:** none required. The new layout numbers replace T-05's for two parts:
   - the roundel at (−2, −23), 3 rows higher than T-05's (−2, −20), for the ring's 2 px;
   - the clan rule at (+18, −17, 78 × 4) to stay on its centre line.
   
   The seeds are T-05's. The AD signs the three captures at 1× with the gate's checks.
3. **CD:** the ring on paper reads as two void lines with a cream body, the same mark as on Home and Pods. The CD judges it at 1× in `library-spread`. If the cream core reads as a gap on paper, that is fix 14's F2 watch point, not a reason to bring back rust.
4. **Not verified here:**
   - The face was not built (no emsdk). The dirty-area number and the goldens are computed or expected, not measured.
   - The frame outline was measured on S01 and is assumed for the other fifteen: one script, one place table (T-05 `make-spread.py`). The builder's `library-spread` capture confirms it.
   - Everything else was read on station-gate 93bff40f and masters-pods f365361b.

Signed: UI/UX, 22:40 (America/Mexico_City), Thu 2026-10-15
