# Type system: one role table for the whole application

UI/UX designer, Miniature Beasts. Written Sat 2026-10-24 16:59 (America/Mexico_City). Read-only on station-gate (sg at ffb1fd37); nothing committed.

Answers the owner's asks of 2026-10-24 ~16:21 ("font weight, what is the style for titles, labels, descriptions, eyebrows … size, color, weight … consistent across the whole application") and ~16:23 ("text also must respect spacing, inline spaces, margins, bleed").

**Case assumption.** Sentence case per the copywriter's ruling (results/T-20261024-type/case.md): one capital at the start of every drawn line, names always capitalised, eyebrows one capital with no colon and no caps, "Legs & Tail". It also follows the game designer's Bay / berth / bay ruling (gd-rulings.md §1). Every width below is measured with the capital.

## What I measured

- **Every Station golden at 1×.** I replayed the goldens' own state tools (face/tools/*-states.mjs) on the WebAssembly face. For each state I took:
  - the face's type log (string, px, region);
  - the ink of every region, by hiding the region and diffing the frame;
  - for every string, its ink box, its exact palette colour and the ground under it.
- **What was measured that way.** 167 states replayed cleanly, with 2,053 string placements across the runs: Home, Pods, the Habitat, the Vivarium, Cargo, the Incubator, Create, the Probe bench, Idle and Library Level 1. My captures match the committed goldens pixel for pixel (checked on Home, the bench and Level 1). Fifteen states did not replay under measurement, and I read them from their golden PNGs: the namer's six, four Home Library points and five light points of the Habitat.
- **What was measured from the golden PNGs instead.** Library Level 2 and the Sitting. The built face in dist (Oct 24 12:34) predates their specs: "props for the screen library.species, whose spec is not loaded". For these two I read the golden PNGs and the specs (library.json l2, sitting.json).
- **The Companion.** Read from prototypes/exploration/index.html (its `text()` calls and the bottom line at lines 4083–4088), companion-screens.md and ui-kit.md.
- **Widths.** Measured with the face's own rule, (adv_w + kern + 8) >> 4 summed over the baked glyphs. It agrees with ui/specs/measure.mjs to the pixel ("Legs & Tail" is 103 at 20 px). For the proposed Medium 16 I baked the font with the repo's converter, lv_font_conv 1.5.3.
- **Contrast.** WCAG ratio on the 68-colour palette.

**What the screens do now, in one paragraph.**
- Size and weight are one setting: 16 is always Regular, 20 always Medium, 28 always SemiBold. So every 16 px string (labels, eyebrows, figures, the ✓ verb, quiet lines) has the same voice, and only colour separates them. The colour is used five ways for one job:
  - eyebrows are `fog` on Home, `metal` on the Habitat and Probe-bench plates, and `fog` on Library L2;
  - the genome code is `bone` on the Habitat card, `mist` on Create and `ink` in the Incubator;
  - the pod's origin is `bone` on Pods and `sand` on Create;
  - quiet lines are `mist` on panes, at 4.0 : 1, which the guide forbids.
- Three places switch size by length: Home's module line (20 → 16), the Sitting's portrait heading (20 → 16) and Cargo's material amount (a 22 px spec value the face cannot set).
- The decision panel's question is 28 SemiBold, while the guide says 20 Medium.
- Library L2 prints 12 and 14 px Inter into its sheet picture (library-sheet.mjs: regular-12, regular-14, medium-12, medium-14). That is under the 13 px floor and outside the face.
- Every frame sets its bar type 2 to 4 px above the bar's centre: the bottom line's words sit 4 px above their own key caps.

## §1 The role table

**Three weights, each with one job.**
- **Regular (400):** words you read.
- **Medium (500):** words that name, count or act: titles, headings, eyebrows, figures, the ✓ verb and name tags.
- **SemiBold (600):** only a name being given or met, at 28.

**The rest of the system.**
- **Sizes:** 16, 20 and 28 stay the only sizes. Nothing is ever at 13 px or smaller.
- **Colour per ground:** colour carries rank (bone > fog > mist) and signals (orange, amber, focus, gold, coral).
- **Grounds:**
  - **field:** `ground`, `libGround`, the decision panel's `stageGround`, the Idle strip;
  - **pane:** `panel`, `libPanel` and the painted device plates (the Habitat card and modules, the bench plates and the panel cards; their painted fills measure #312924 to #463c35, as dark as `libPanel`);
  - **band:** `bar` (the top bar, the bottom line, name-tag plates, the message plate) and `libHead`;
  - **painted:** text straight on a painting.
- **Letter spacing:** 0 for every Station role. Inter is set as cut, tabular figures on. Tracking never stands in for caps.

| Role | What it is, where it is used now | Size · weight | field | pane | band | painted | Pitch | Case |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Display name** | A name being given or met: the namer's field | 28 · SemiBold | `bone` | `bone` | `bone` | on a `bar` plate | 36 | as typed |
| **Screen title** | The top bar, after the room's mark; Home's clock is set the same | 20 · Medium | — | — | `bone` | — | one line | the room's name |
| **Heading** | The title of a pane, a step, a page or a panel: "Pick a pose", "Ready to sit", "Coat", the panel's question, an option's name ("Release it", "Incubate"), Home's module line ("2 in the case"), a ribbon | 20 · Medium | `bone` | `bone` | `bone` | on its plate or ribbon | 28 | sentence |
| **Name tag** | A creature's or pod's name on its plate over art | 20 · Medium on a close-up (Habitat, Sitting, Pods' plates, Cargo's dock ribbon); 16 · Medium in a crowd (Home's window, the Vivarium) | — | — | `bone` on `bar`/`panel` plate | — | one line | as typed |
| **Eyebrow** | The small label over or beside a group: Home's "Pods", "Incubator", "Vivarium" and "Library" heads; the Habitat's "Companion", "Portrait", "Cross" and "Wild"; the bench's "Mend" and "Upgrade"; L2's "Unlocked", "Families", "Face", "Sittings", "Coat colours found" and "Every look" | 16 · **Medium** | `fog` | `fog` | `fog` | `fog` + shadow | its own line 20, then **8** to the group | one capital, no colon, no caps, no tracking |
| **Label** | The word of a thing: a rail tab, a chapter cell's trait, a key, a step, a Library cell's species, a badge | 16 · Regular | `bone`; state words `mist` | `bone`; state words `mist` | `bone`; `ink` on an open (light) tab | — | one line | the frame's name |
| **Body** | A description or fact: the pod's origin, the card's species line, the trait line, the message plate | 16 · Regular | `bone` | `bone` | `bone` | `bone` + 1 px `void` shadow (+1, +1) | 20 in a wrapped paragraph; **24** between stacked separate facts (the Habitat card) | sentence |
| **Code** | The genome code ("0SV EV6 7ZF") | 16 · Regular, tabular | `bone` | `bone` | — | `bone`; on a light painted wall `ink` (the Incubator, ruled for 4.5 : 1) | one line | as is |
| **Quiet** | Context and secondary lines: "This pod", "Every Loika", "From the meadow", "3 at home", the top bar's readout and date, a card's consequence line | 16 · Regular | `mist` | **`fog`** | **`fog`** | `fog` + shadow | as body | sentence |
| **Figure** | Supplies, prices and counts beside their icon; a figure inside a sentence keeps that sentence's role | 16 · **Medium**, tabular; 20 · Medium beside a picture ≥ 72 px (Cargo's amounts) | `bone` | `bone` | `bone`; a price `focus`; a price you cannot pay `amber` | — | — | digits |
| **✓ verb** | The bottom line's action, Home's line action | 16 · **Medium** | — | — | `orange` on `bar`; dimmed `mist` | — | — | sentence |
| **Subject** | The bottom line's context; Home's line subject after " · " | 16 · Regular | — | — | **`fog`** | — | — | sentence |
| **← word** | Where ← goes | 16 · Regular | — | — | `fog` | — | — | a name |
| **Notice** | What needs you, after its 12 px amber lamp | 16 · Regular | `amber` | `amber` | `amber` | — | — | sentence |
| **New** | "20 new" | 16 · Regular | `gold` | `gold` | — | `gold` + shadow | — | figure-led |
| **Loss** | "Gone for good." | 16 · Regular | `coral` | `coral` (on `ground` wells only) | — | — | — | sentence |

**Rules that go with the table.**
1. **One weight per run.** A run is one slot's words. The bottom line's action slot is one run (the verb and its price figures, both Medium). Home's bar line is two zones joined by " · ", per the copywriter. "Never two weights in a line" becomes "never two weights in a run".
2. **A role never changes size with length.** If a string does not fit its role, the copy or the ladder changes. The 16 px fallbacks go.
3. **State words** (a tab still unread, a step ahead, a key dimmed, a met but not found species) are `mist` on every ground. They are the one exception to 4.5 : 1 (4.0 on `panel`), because they name a state and do not carry content. Each also keeps its shape per §6 (pips, frost, slats).
4. **Readable quiet text on a pane is `fog`, never `mist`.** Measured: `mist` is 4.0 on `panel`, 4.1 on `libPanel` and 3.8 on `libHead`. Quiet on the bar is `fog` too, because `mist` on `bar` is 4.4, under the guide's 4.5. `mist` stays for the field (4.8 on `ground`), Level 1's met cells (4.6 on `libQuiet`) and dim states.
5. **Housing colours are never type.** `metal`, `sand` and `frost` (the unknown state) carry no words.
6. **Eyebrows are told from quiet lines by weight and place.** They are both 16 `fog` on a pane. The eyebrow is Medium and leads its group, and the quiet line is Regular and follows its subject. On the field the colours differ as well (`fog` against `mist`).

**Contrast, measured** (the type colours on each ground; 4.5 : 1 is the floor for reading):

| | `ground` | `bar` | `panel` | `libGround` | `libPanel` | `libHead` | `libQuiet` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bone` | 13.3 | 12.4 | 11.2 | 14.3 | 11.5 | 10.7 | 13.0 |
| `fog` | 9.3 | 8.6 | 7.8 | 9.9 | 8.0 | 7.4 | 9.0 |
| `mist` | 4.8 | **4.4** | **4.0** | 5.1 | **4.1** | **3.8** | 4.6 |
| `orange` | 5.1 | 4.7 | 4.3 | — | — | — | — |
| `amber` | 8.2 | 7.6 | 6.9 | — | — | — | — |
| `focus` | 12.9 | 12.0 | 10.9 | — | — | — | — |
| `gold` | 6.5 | 6.0 | 5.4 | — | — | — | — |
| `coral` | 5.3 | 4.9 | 4.4 | — | — | — | — |

Specimen: `type-specimen.png` (a design specimen at 1×). It is rendered with PIL/FreeType from the repo's Inter TTFs, not by the face, so glyphs may differ by a pixel. It shows the field roles, a pane, a Library shelf with its `libHead` band, a decision option on the `ground` panel, and both bars with every centring rule below applied.

## §1b Spacing rules for text, the whole application

**The scale.**
- **Station:** 4 px steps, using 4, 8, 12, 16, 24 and 32.
- **Companion:** its 4 px unit, with text and icon edges on the 2 px font-pixel grid.

**How text is measured.**
- **Horizontal:** from the string's advance box (x to x + width). Inter's side bearing adds about 1 px of air.
- **Top:** from the cap top. Accents may rise above it.
- **Bottom:** from the baseline. Descenders (4 px at 16, 5 at 20, 7 at 28) hang into the bottom clearance; they never count against it, and they never cross an edge.
- **Measuring tool:** the checker measures ink, which agrees with these within ±1 px.

| # | Rule | Station | Companion |
| --- | --- | --- | --- |
| T1 | **Safe margin (bleed).** Painted art may bleed to the screen's edge; text never does. | Text ≥ 16 from the left and right edges (x 16 to 1008). No text in rows 0–8 or 592–599. | Text ≥ 8 from the left and right edges (x 8 to 442); never in the HUD's or bottom line's outer 4 rows |
| T2 | **Bars.** Every run, icon, key cap and lamp in a bar is centred on the bar's middle row. | Top bar: content rows 1–38, centre 20. Cap top 13 at 20 px, 14 at 16 px; 16 px icons at y 12. Bottom line: content rows 564–599, centre 582. Cap top **576**, icons and caps at y 574. | HUD rows 0–31: 2× caps on rows 9–22 (as companion-screens.md). Bottom line: caps on rows 576–589 |
| T3 | **Pane.** A section 48 px tall or more: a pane, a card, a bezel, a decision panel, a painted device plate. | Cap top ≥ 12 below the top edge; baseline ≥ 12 above the bottom edge; text ≥ 12 from the left and right edges (16 is the layout target for a pane's column, as §4 Pane). | ≥ 8 inside a panel (ink, message box, cards) |
| T4 | **Band.** A box under 48 px made for its text: a head band, a name tag or plate, a ribbon, a chip, a tab, a key. | The cap is centred: cap top = top + floor((h − cap) / 2), `v_cap_in`, ±1 px. Text ≥ 12 from each end (chips and keys ≥ 8). A name tag is the text + 2 × 12, rounded up to 8. | Cap centred; ≥ 8 from each end (6 on a 22 px chip, as now) |
| T5 | **Neighbour picture, mark, disc or lamp** (not inline). | ≥ 8 from the thing it labels (a caption under its tile or picture); ≥ 16 from anything else. Measured to the picture's visible ink, not its box. | ≥ 4 from the thing it labels; ≥ 8 from anything else |
| T6 | **The focus ring** counts as a component. | Text ≥ 4 from the ring's outer edge. The ring is 2 px, 4 out, so a caption under a focusable thing starts ≥ 10 below the thing's edge. | Corner brackets: text ≥ 4 from a bracket |
| T7 | **Rules and separators** (1 px hairlines). | Text ≥ 8 from a 1 px rule. The bottom line's separators move to x **400** and **624** (from 404 and 620). | ≥ 6 from a rule (the menu's rule) |
| T8 | **Inline gaps inside a run.** | Key cap or lamp → word: 4. A 16 px icon → its figure: 4. A figure → the next icon group: 16 in a price, 24 between the top bar's supplies (as `materials.between`). Verb → its first price icon: 12. A title → its readout: 12 at 20 → 16; 8 at 16 → 16 (Home's window heads). Facts joined in one run: " · " (U+00B7 with a space each side). A star or mark → its disc → its word: 4. | ✓ glyph → verb: 5 (as now); groups 8; " · " with 7 px each side (as now) |
| T9 | **Pitch.** | 28 → 36; 20 → 28; 16 → 20 inside one wrapped text; 16 → **24** between stacked separate statements; eyebrow line → its group 8; group → group 16. | 2× → 22, 3× → 33 (11 font pixels at either scale) |
| T10 | **Other text.** | Another string on the same row: ≥ 16, unless inline (T8). Lines in a column: by pitch (T9). | ≥ 8 on a row |
| T11 | **Clipping and the ellipsis.** | No text is ever cut by a clip rect, a pane edge or a window. A string that does not fit takes its ladder's next rung (copy), then a second line where the role allows one (body, quiet). An ellipsis "…" is allowed only on a player's name inside a composed line: Home's line subject, Home's module line name, L2's family names (72 px), the Sitting's step word. The clip width is the slot less its clearances, so the "…" keeps the slot's clearance (frame.c:174 clips the subject to the full 208 today; that stays correct only because the separators move, T7). A player's name on its own tag, field or shelf row is never clipped; its slot holds the widest (160 at 16, 200 at 20, 290 at 28). | As now: `clipText` only on names and the bottom line's middle, keeping 4 px |

**Where text now sits too close or off centre.** Each line gives the measured value, then what is required. These are fixed in the build pass alongside the roles.

| Where (screen · node or spec key) | Measured | Required |
| --- | --- | --- |
| **Every frame's bottom line** (frame.c:163–200, `v_cap_top(sr[1] + 2, CAP)`; Home's own line too) | Cap top 572: the cap's middle sits 4 px above the ✓ and ← caps' middle (582). Price icons at 570 | Cap top 576 (`v_cap_in(564, 36, 16)`); icons at 574 (T2) |
| **Every frame's top bar** (frame.c:68 title `+2` anchor; :78 readout; :107 figures; :132 turn) | Title cap top 10 (3 high); readout, figures and turn cap top 12 (2 high), while their icons are centred at 20 | Title 13; 16 px runs 14 (T2) |
| **Home's bar** (home_frame.c:32–38, `regions.bar.*`; line at :59 `z[1] + 4`) | "Station" cap top 9 (4 high); clock 10; date 12; line 12 | 13, 13, 14 and 14 (T2) |
| **Bottom-line subject** (frame.json `regions.subject` 408–616, separators 404/620) | In the goldens at least 13 px (the widest subject, "the dock mends two, free", spans 417–606). But the slot lets a full 208 px subject reach 4 px from a rule | Separators at 400 and 624: 8 clear (T7). The subject slot stays 408–616 (208) |
| **Notice slot** (`regions.need` [624, 570, 272, 24], right 896) | — (it moves with T7) | [632, 570, 272, 24], right **904**: 16 before the ← cap's widest place (922). The 272 holds |
| **Decision panel cards** (frame.json `regions.panel.card.name.at` [16, 184]) | Option name cap top 342, 6 px under the stage picture's ink (336), on Pods' release, the Habitat's wild and the bench's upgrade | `name.at` [16, 186]: 8 (T5) |
| **Panel cost chips** (panel.c:71 `v_run(... y ...)`) | Chip 20 tall; the figure's cap at the chip top (0 above, 8 below) | Cap centred: chip top + 4 (T4) |
| **Rail tabs with no pips** (Pods, the Incubator, Compare; frame.json `rail.full_layout.labelY` 43) | Word cap top 49 in the 40–80 tab: 9 above, 19 below (the pips' room is empty) | Cap top 54, centred (T4). Create keeps 43 with its marks under it |
| **Home's window heads** (home.json `regions.bezel.title` [12, 7], a 30 px head) | Cap top 59 (2 low) | Cap top 57 (`v_cap_in(48, 30, 16)`) (T4) |
| **Home's away caption** (home.json `regions.away.caption.y` 418; tile `away.rect` y 352) | Baseline 437, 3 px above the window's lower edge (440). Over the painting, in `frost` | Tile y 344 and caption lineTop 412: cap 416, baseline 428, 12 clear (T3). `fog` with the 1 px shadow |
| **Pods collection name plates** (pods.json `regions.collection.name`) | Plate top 3 px under the focused ring's outer edge (252 → 256) | +1: 4 clear (T6) |
| **Vivarium and Home name tags** (vivarium.json and home.json `regions.nameTag`) | Ends 8–12 px from the text ("Moss" 9/8, "Bean" 10/9) | Pad 12, width rounded up to 8 (T4), as the Habitat's |
| **The Incubate and Hatch-now bezels** (panel.json `incubate.header` h 30, baseline 21, px 16) | Option name at 16 Regular (the spec asked for 15 Medium, which the face could not set) | 20 Medium, cap centred in the 30 head: cap top +8, baseline +22. The price run 16 Medium on the same middle row |
| **Library L2 sheet** (library-sheet.mjs:278–350; library.json `l2.sheet.plates`, `colours`, `every`) | Printed 12 and 14 px text, baked into the picture, from 6 px off the plate edges | Face text at the roles (§3). Plates 160 × 72; T3 and T4 |

**The copywriter's slots, re-measured at the new roles with capitals** (16 Regular unless stated):

| Slot | Room | Longest now (with capital) | Verdict |
| --- | --- | --- | --- |
| Bottom-line subject | 208 (kept) | Ladders' last rungs: "Carried by more than one" 190, "Carried by one of yours" 177, "In the wild" 75, "None of yours carries it yet" 201; first rungs with typical names ("Carried by Bean and Dot" 184) fit, and with W×10 names they fall to later rungs as designed | Holds; the ladders still decide |
| Notice | 272 (kept, moved to 632–904) | "Then the Untuva pod needs ⚡◆❀" 268; "An Untuva pod, ready to incubate" 249; Create's "Needs more ⚡◆❀: watch your mibis" 290 and "Needs ⚡◆❀: go out or return pods" 278 | The two Create shortFrom notices overflow with three icons today and after: copy |
| ← word | 68 of 88 | "Vivarium" 66 | Holds (Regular, unchanged) |
| L2 wish word | 170 now | "{Trait}: {look}" goes over 170 in 38 of the 248 pairs in the frames; the widest is "Markings: stripes and patches" 222 | Does not hold, so the row changes (§3, Library L2): 244 px |
| Habitat story, "Bred from {A} and {B}" one line | 248 (`regions.story.rect`) | "Bred from Dot and Bean" 181; with ten-letter names 436 | One line does not hold a name pair. Two lines, one name each: "Bred from " is 80, which leaves 168 for a name (widest 160). Copywriter to word line 2 |
| Rail tab, "Legs & Tail" | 136-wide tab, word at 16 | 81 at 16 (103 is at 20) | Holds |
| Home's module line at 20 Medium | 142 (text x 12 to 8 before the picture) | "The bud is ready" 159, "A pod can incubate" 183, "A bud growing" 138, "Empty" 61 | Two Incubator lines overflow once the 16 fallback goes: copy (≤ 142 at 20 Medium) |

## §2 Fonts the face bakes, and the cost

Bake four: the three now plus **Inter Medium 16**. The architect rules the build side; this is what the roles need.

| Font | Roles | File (lv_font_conv 1.5.3, 4 bpp, kerning, no compress) | Bitmap | Glyph table (353 × 8 B) | Kerning pairs | Flash, total |
| --- | --- | --- | --- | --- | --- | --- |
| Inter Regular 16, tnum | label, body, code, quiet, subject, ← word, notice, new, loss | face_inter_16.c (now) | 18,605 B | 2,824 B | 244 (732 B) | **22.8 KB** |
| **Inter Medium 16, tnum** (new) | eyebrow, figure, ✓ verb, crowd name tag | baked in my scratchpad from Inter-Medium-tnum.ttf | 18,967 B | 2,824 B | 253 (759 B) | **23.2 KB** |
| Inter Medium 20, tnum | screen title, heading, name tag, Home's clock, Cargo's amount | face_inter_20.c (now) | 27,821 B | 2,824 B | 253 | **32.1 KB** |
| Inter SemiBold 28, tnum | display name | face_inter_28.c (now) | 57,018 B | 2,824 B | 253 | **61.3 KB** |

- **Flash.** 116.2 KB now; **139.4 KB** with Medium 16, so **+23.2 KB (+20 %)**. These are the bitmap, glyph-descriptor, kerning and cmap arrays counted in the .c files. The .c files on disk are 161 to 395 KB because of their hex text.
- **RAM.** 0 per font: the tables are `const` and draw from flash. LVGL turns a 4 bpp glyph into A8 in a transient draw buffer of at most one glyph box: 256 B at 16 px and 784 B at 28 px, shared, freed after the glyph.
- **Glyph range.** The same for all four, as bake-fonts.sh now has it: 0x20–0x7E, 0xA0–0x17F (Latin-1 and Latin Extended-A, for typed names), 0x2010–0x2027, U+2212, 0x2190–0x2193, ★ U+2605, ▲ ▶ ▼ ◀, ✓ U+2713. That is 352 glyphs. Medium 16 needs the full range because crowd name tags carry typed accents.
- **Width cost of Medium at 16.** It is +0 to +4 px a string ("Open the Bay" 100 → 102, "Return to the wild" 129 → 132). Figures are tabular, so the same width.
- **Not baked.** Regular 20 (31.3 KB), SemiBold 20 (32.9 KB) and Medium 28 (59.3 KB): no role needs them. Library L2's 12/14 px glyph tables (ui/fonts/inter/glyphs/*-12, *-14) retire with the printed sheet text.
- **API the roles imply (for the architect).** prim's `font_of(px)` (prim.c:69) keys by px alone. The roles need (px, weight): either `v_line_*` takes a role id from a frame token (`type.roles.<role>` → px, weight, colour by ground, pitch), or px and weight separately. measure.mjs and face/dist/metrics.json gain a "16m" table, so views measure verbs and figures at Medium.

## §3 Per-screen change list and the goldens it retakes

"→" means now → becomes. The roles are §1 and the spacing is §1b. **AD** marks a colour change on a painted ground that needs the art director's eyes at 1×.

**Every screen with the frame** (frame.json, vocab/common/frame.c, panel.c): the Probe bench, Cargo, Create, the Habitat, the Incubator, Library L1 and L2, Pods, the Sitting and the Vivarium.
- F1, top bar.
  - `regions.title`: 20 Medium bone (no change); cap top 10 → 13.
  - `regions.top.readout` ("All species"): `mist` → `fog`, Regular; cap top 12 → 14.
  - `regions.materials` and `regions.time` figures: 16 Regular → **16 Medium**; cap top 12 → 14. **AD** for `fog` on `bar`.
- F2, bottom line.
  - The verb (`colours.verb` orange): Regular → **Medium**.
  - Price figures (`colours.price` focus, and amber for a price you cannot pay): Regular → **Medium**.
  - `regions.subject` (`colours.subject` = `mist`): → **`fog`**.
  - Every run's cap top 572 → 576. Inline price icons 570 → 574.
  - Separators `regions.separators.x` [404, 620] → [400, 624]. `regions.need.rect` [624, 570, 272, 24] → [632, 570, 272, 24], right 896 → 904. **AD** for `fog` on `bar`.
- F3, decision panel.
  - `regions.panel.title`: px 28, weight 600 → **20, 500** (the guide's own rule); cap centred in its 36 px rect (cap top 107).
  - `card.name.at` [16, 184] → [16, 186].
  - Cost chips: the figure centred in its chip (panel.c:71); figures Medium.
  - `card.line.colour` `subject` (mist) → `fog`. The cards are painted plates of #443a33 to #463c35, so the pane rule applies. **AD**.
- F4, rail tabs.
  - `rail.full_layout.labelY` 43 → 48 where no pips draw (Pods, the Incubator, Compare), so the cap is centred.
  - Unread tab words stay `mist` as a state word (§1 rule 3). **AD**: confirm `mist` at 4.0 on the tab's `panel`, with the read pips gone on Pods.

**Home** (home.json, home_frame.c, home_builds.c):
- Its bar.
  - Title cap top 9 → 13; clock 10 → 13; date `mist` → `fog`, cap top 12 → 14; line cap top 12 → 14.
  - The line's verb is Medium; its subject `mist` → `fog`.
- Window heads: `regions.bezel.titleColour` bone → **`fog`**, weight Regular → **Medium** (eyebrow); cap top 59 → 57.
- Module eyebrows: `regions.station.nameColour` fog, Regular → **Medium**.
- Module line:
  - `line1Px` 20 stays and **`line1Px2` 16 goes** (no size by length).
  - Copywriter: the Incubator's "The bud is ready" (159) and "A pod can incubate" (183) must fit 142 at 20 Medium.
  - `line2Colour` `mist` → **`fog`** (on `panel`).
- Library window caption `captions.genome.colour` `mist` → `fog` with the 1 px shadow. **AD**: over the painted window.
- `regions.away`: rect y 352 → 344; caption lineTop 418 → 412; `frost` → `fog` with the shadow. **AD**.
- `regions.nameTag`: 16 Regular → **16 Medium**, pad 12.

**The Vivarium** (vivarium.json):
- `regions.nameTag`: 16 Regular → 16 Medium, pad 12 each side (measured 8–12).
- F1 and F2.

**The Habitat, up close, and the namer** (habitat.json, namer.json, habitat.c, namer.c):
- Module labels `door`, `portrait`, `cross` and `wild` ("Companion", "Portrait", "Cross", "Wild"): `metal` → **`fog`, Medium** (eyebrow). Clearance 16 is kept. **AD**: on the painted plates.
- Card story lines (habitat.c:170, the card's quiet colour): `mist` → **`fog`** on the painted card. **AD**.
- `story.bred` becomes two lines, one name each (§1b slots); pitch 24 is kept.
- `speciesLine` and `code`: 16 Regular bone (no change).
- `nameTag` 20 Medium (no change).
- The namer: `colours.say.reason` `mist` → `fog` (on `panel`); key `labelDim` stays `mist` (state). The field 28 SemiBold bone is the display name (no change).
- F1, F2, F3 and F4.

**The Sitting** (sitting.json, sitting.c):
- `regions.heading.portrait.px` [20, 16] → **20 only**. The copywriter fits the portrait heading in 248 at 20 Medium.
- Step words: current and done `bone`, ahead `mist` (state, no change).
- nameTag 20 Medium (no change).
- F1 and F2.

**Pods** (pods.json, vocab/station):
- `overview.thisPod.colour` and `overview.figure.caption.colour` `mist` → **`fog`** with the 1 px shadow (on the painted bench). **AD**.
- `collection.name` plates +1 px down (ring clearance).
- The name plate stays 20 Medium (the owner's Pods exception, 2026-10-08 17:08).
- Origin 16 bone, pitch 20 (no change).
- Chapter page cells: read `bone`, unread `fog`, doing lines `fog` (no change).
- F1, F2, F3 and F4.

**Create** (create.json, create.c):
- `colours.origin` `sand` → **`bone`** (body; as on Pods).
- `colours.code.text` `mist` → **`bone`** (code; as on the Habitat).
- The Incubate | Keep shaping bezel headers: 16 Regular → **20 Medium** (heading); price figures Medium (as the Incubator's below).
- `traitLine` 16 bone (no change).
- F1, F2 and F4 (Create keeps labelY 43). **AD** for `bone` on the painted bench.

**The Incubator** (incubator.json, panel.json):
- `incubate.header`: px 16 → **20, Medium**, baseline 21 → 22 (cap centred in the 30 head).
- `incubate.price` figures Medium.
- `hatchnow.caption` `fog` (no change).
- `code` and `readyIn` stay `ink` on the light wall (the recorded exception).
- The ribbon is 20 Medium bone (no change; its `bark` fill is the art director's).
- F1, F2 and F4.

**Cargo** (cargo.json, cargo.c):
- `regions.display.material.big.px` 22 (not a face size) → **20 Medium**; `small.px` 16 → 16 Medium.
- `waiting.pods.more` `fog`, Regular → Medium (a figure).
- `arrival.band.probe.words.colour` `subject` (mist on the painted bay) → `fog` with the shadow. **AD**.
- Arrival cards: verbs 20 Medium, lines `mist` on `ground` (no change).
- F1 and F2.

**The Probe bench** (bench.json, bench.c):
- `switch` and `slot` labels ("Mend", "Upgrade"): `metal` → **`fog`, Medium** (eyebrow). **AD**.
- F1, F2 and F3.

**Library Level 1** (library.json `l1`):
- Cell names: found `bone` on `libHead`, met `mist` on `libQuiet` at 4.6 (no change).
- F1 and F2.

**Library Level 2** (library.json `l2`, library-sheet.mjs, library_species.c):
- Shelf and family band titles, "Unlocked" and "Families" (`shelf.title`, `families.title`): fog Regular → **fog Medium** (eyebrow), cap centred in the 30 band (cap top 59, as now).
- Row labels "Face" and "Sittings": fog Regular → **fog Medium**.
- **The wish rows.**
  - The word "Your wish" goes, because the five-point star already says it (the register's mark).
  - Each row starts at x 712: star (12) at 712, centred on the cap row; disc (16) at 728; word at 752 as **"{Trait}: {look}"**, 16 Regular, carried `bone`, not carried `fog`; clip 170 → **244** (to 996, 12 inside the shelf).
  - **Game designer to confirm** dropping the word. If the word stays, it becomes an eyebrow line above the rows, which overflows the shelf column by 14 px in the fullest case (4 wishes, a face, sittings and 8 families).
- **The sheet's printed text moves into the face at the roles; nothing stays printed into the picture.**
  - Plates 156 × 70 → **160 × 72**:
    - head band 28 (`libHead`), with "01" `fog` and the chapter name `bone`, both 16 Regular, cap centred;
    - the trait index: one line, 16 Regular `fog`, room 136, then "+n" (copy);
    - "Sealed": 16 Regular `fog`.
  - Tops (5 a side) are 50, 132, 214, 296, 378, as now; the last ends at 450, 12 above the bands at 462. L x 16; R x 520 → 680, 20 clear of the shelf.
  - "Coat colours found" and "Every look": eyebrows, 16 Medium `fog`, on their head band.
  - Swatch names 12 → 16 Regular `fog`. They do not fit 57 px swatches ("Periwinkle," is 81): that is **a follow-up layout spec (UI/UX, with the AD)** for the two bottom bands. My recommendation there: the names leave the band, and the focused swatch's colours go in the bottom line's subject.
- F1 and F2.

**Idle**: nothing from the type pass. Its line is Quiet `mist` on the strip's `ground`, cap centred (584).

**Goldens the type pass retakes.**

| Screen | Retaken | Why |
| --- | --- | --- |
| bench | 4 of 4 | F1, F2 and F3, labels |
| cargo | 29 of 29 | F1, F2, amounts |
| create | 21 of 21 | F1, F2, origin, code, bezel headers |
| habitat | 30 of 30 | F1, F2, eyebrows, story, the namer |
| home | 32 of 32 | its bar, heads, eyebrows, lines, tags |
| incubator | 25 of 25 | F1, F2, F4, bezel headers |
| library | 17 of 17 | F1, F2 (L1); shelf, wish rows and sheet (L2) |
| pods | 13 of 13 | F1, F2, F3, F4, captions |
| sitting | 12 of 12 | F1, F2, heading |
| vivarium | 14 of 14 | F1, F2, name tags |
| idle | 0 of 9 | (the copywriter's case pass retakes these for its strings) |

That is **197 of 206** Station goldens, and the seven journey files (face/golden/journey-*.json) for every changed string, ok and subject line. The test vectors face/tests/vectors/{frame-words,pods-words,metrics}.json regenerate (metrics gains "16m").

On the Companion, every screen with a caption, a ✓ verb or a dimmed verb changes (§4).

**Needs the art director's eyes at 1×.**
- `fog` replacing `mist` on the bar, on the painted cards, plates and benches, and over the windows.
- `fog` replacing `metal` on the painted module plates (the Habitat, the bench).
- `bone` replacing `sand` on Create's bench.
- `mist` kept as the state colour for the unread tab words (4.0 : 1).
- The 1 px `void` shadow on text over paintings (Home's window captions, the away caption, Pods' captions, Cargo's band).
- The Medium weights against the paintings.
- The L2 plate re-layout.

## §4 The Companion on the same roles

**The faces.** Mibi 7×9 caps are 7 font pixels: 14 at 2× and 21 at 3×. Inter's caps on the Station are 12 at 16, 14 at 20 and 21 at 28. So the Companion's two steps land on the Station's two upper sizes by cap height: 2× = 20's cap and 3× = 28's cap.

**The mapping is by role:**
- every Station role at 16 is 2×;
- every role at 20 or 28 (title, heading, name, display name) is 3×;
- the Companion has one weight, so a Medium role is carried by colour alone;
- each role keeps the same colour on both devices where the ground allows it.

| Role | Station | Companion now (exploration/index.html) | Companion becomes |
| --- | --- | --- | --- |
| Display name, heading, title | 28 SemiBold or 20 Medium, `bone` | 3× `bone` (names, card names, "Cargo"), and 3× `ink` on paper cards | **No change.** 3× `bone` on ink; `ink` on paper |
| Eyebrow | 16 Medium `fog` | 2× **`mist`**: the captions "Partner", "With you" and "At home" (companion-screens.md lines 461–469) | **2× `fog`**, so it reads apart from quiet lines (`mist`), as weight does on the Station |
| Label, body | 16 Regular `bone` | 2× `bone` | **No change** |
| Quiet, subject | `mist` on the field; `fog` on panes and bars | 2× `mist` on ink (5.3 : 1); the bottom line's middle in two colours, `mist` + `fog` (line 4088) | 2× `mist` on ink. **The middle in one colour, `mist`** |
| Figure | 16 Medium `bone`, a price `focus` | 2× `bone`; the counter ticks `Y2` | **No change** |
| ✓ verb | 16 Medium `orange` | The ✓ glyph `orange`, but **the verb `bone`**; dimmed `stone` (2.6 : 1 on ink) (line 4083) | **The verb `orange`** (5.6 : 1 on ink), the style guide's "✓ cap and Confirm's verb" and the ui-kit's O3. **Dimmed `mist`** |
| ← word | `fog` | `fog` (line 4084) | **No change** |
| Notice | `amber` | 2× `amber` | **No change** |
| Loss | `coral` | 3× `coral` on one line | 2× `coral` (a loss line is body-sized) |
| Pitch and tracking | T9 | 2× 22, 3× 27; the bottom line in "tight" setting at 1 px a glyph (line 3146, `textWT`) | 2× 22, 3× **33**. Tracking is one font pixel (2 px at 2×) everywhere (the ui-kit's rule); a bottom line that does not fit takes its shorter copy, not a tighter setting |

**Spacing** follows §1b's Companion column: the 4 px unit, text ≥ 8 from the screen's sides, ≥ 8 inside a panel, and the bands' caps centred.

**Change list for the Companion build:**
1. Captions → `fog`.
2. The verb → `orange`; the dimmed verb → `mist`.
3. The middle → one colour.
4. Tight setting → normal tracking, with copy for any line that then overflows.
5. 3× pitch 33.

The Companion lives in prototypes/exploration (and in the game repo); its captures retake wherever these appear.

## §5 Questions

**For the owner** (2):
1. **Weights by job.** Words you read are Regular. Words that name, count or act are Medium: titles, headings, eyebrows, figures and the ✓ verb. A name being given is SemiBold. This needs one more font on the Station (Inter Medium 16, +23 KB). *I recommend yes:* it is what makes eyebrows, numbers and the action read apart at arm's length, which colour alone does not do today.
2. **Eyebrows stay quiet, not capitals.** An eyebrow is the small label over a group ("Companion", "Unlocked"). It is the same size as the text, made firmer by weight and quieter by colour, with no small caps and no tracking, because the guide rules out capitals for emphasis and nothing goes below 16 px. *I recommend yes.* Capitals at 16 would shout louder than the headings they sit under.

**For the art director:**
1. Quiet text on the bars, from `mist` (4.4 : 1, under the guide's 4.5) to `fog`, for the bottom line's subject and the top bar's readout and date. Or keep `mist` and darken `bar` a step; I recommend `fog`.
2. `metal`, `sand` and `frost` are no longer type. They become `fog`, `bone` and `fog` on the Habitat and bench plates, Create's bench and Home's away caption.
3. `mist` stays as the state colour for unread tab words on `panel` (4.0 : 1), now that Pods draws no pips. Or `fog`, with a shape for the state.
4. The 1 px `void` shadow for text on paintings, and the `fog` it carries there.
5. The Medium weights on the specimen at 1× (type-specimen.png); please sign the roles' look.
6. The Library L2 plates at 160 × 72 and the bottom bands' follow-up spec.

**For the architect:**
1. Bake Inter Medium 16 (§2): +23.2 KB flash, no RAM per font.
2. The face's text API keyed by role, or by (px, weight), instead of px (prim.c:69 `font_of`). Frame tokens `type.roles.*` (px, weight, colour per ground, pitch) replace the `px` and `colour` keys scattered through the specs.
3. metrics.json and measure.mjs gain Medium 16.
4. Library L2's printed text becomes face nodes (library-sheet.mjs stops printing type; the 12 and 14 px glyph tables retire).
5. checks.mjs gains the §1b clearances. My measuring scripts are in my scratchpad: type/ink.mjs, analyse2.py and check.py, which hide each region, diff the frame and measure the ink against the rules.

**For the game designer:** drop the words "Your wish" on the L2 shelf, because the star is the register's mark for "a piece of your wish" (§3, Library L2).

**For the copywriter:**
- Fit Home's Incubator module lines in 142 at 20 Medium.
- Fit the Sitting's portrait heading in 248 at 20 Medium.
- Shorten Create's two `shortFrom` notices, which are over 272 with three icons.
- Word the two-line "Bred from {A}" / "{…} {B}" (168 px for each name).
- Write the L2 plate index's "+n" form.
