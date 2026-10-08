# Sign-off checklist

Every art and screen delivery carries its kind's checklist, filled in. Each cell is one yes/no line (n/a needs a reason). The art director signs the left column, the builder the right.

**Sources.** AD [art direction](../art-direction.md) · SG [style guide](README.md) · CS [Companion screens](companion-screens.md) · SS [Station screens](station-screens.md) · UK [UI kit](../proposals/ui-kit.md) · DC [decisions](../proposals/decisions/README.md) · AP [art pipeline](../proposals/art-pipeline.md) · PH [placeholder](../proposals/plain-renderer.md) · SB [Station build](../proposals/station-build.md) · GR [Grow service](../../prototypes/workbench/grow/README.md) · PS [Station page](../../prototypes/station/README.md) · PE [Companion page](../../prototypes/exploration/README.md).

## 1. Concept round plate

| Art direction | Capabilities |
| --- | --- |
| Judged at device size, 1×: 1024×600 or 450×600 (AD Rules) | Labelled generated concept art, with its candidate id (SG Sign-off) |
| Miniature Lives: no cartoon, sticker faces, toy rendering, nursery colours or storybook ornament (AD) | Prompt, references, painter and cost logged; originals kept with hashes (AD) |
| The room's vibe; never a cottage; one warm living window (SS Four rooms; SG) | The brief cited; departures stated (SG Sign-off) |
| Accepted assets placed, never regenerated: Pip, the real stamp (SS Create) | No leaked or baked text (AD) |
| As many chapters as the species has, never a four-tab rail (SS Chapter rail) | Contact sheet at 1×, rejects with reasons |
| Only what is known drawn; the screen's "Pass when" answered (AD; SS, CS) | |

## 2. Painted master

| Art direction | Capabilities |
| --- | --- |
| From the accepted candidate, owner's notes applied (SS Decided) | Layered source, 1× exports, hashes kept (AD) |
| Station: painted light, soft shadows, no dither bands or flat fills (SG) | No text or numbers baked; text slots fit the decided strings at the guide's sizes (AD; SG Type) |
| Companion: hand-pixelled on the 48 ramps, ramp outline never black, no alpha, Bayer only (SG; UK §2) | Companion export has 0 off-palette pixels, by script (UK §3) |
| Creature at its area, 300×310+ Station, 280×300 Companion, same trait boundaries (SG Creatures) | One slice per state the screen draws (SS) |
| Same individual in four-gray and on paper; nothing childish (AD) | Placed 1:1, never scaled (SG Station) |

## 3. Station screen build

| Art direction | Capabilities |
| --- | --- |
| Reads first what the guide names, within a second (SG checklist) | 1024×600 at native 1× grain; no 2× upscaled chrome or text (SG Station; grain check) — **yes, for the frame size and the 1× drawing**: the frame is asserted 1024×600 at 25 screenshot points, the chrome is rectangles and sprites placed at integer pixels at their size, the type is blitted from atlases baked at 16, 20 and 28 px; **G2 not measured** (its CI recipe is not built; see failures) |
| The room's vibe; one warm living window; no wood, felt or lamp-lit bench (SS) | Inter, smooth: 16 px body, 20 titles, 28 names, tabular figures (SG Type; DC A; type check) — **yes**: the type log has every string in Inter at 16, 20 or 28 px from the bundled atlases (hashes matched), no text API call on the page, the figures are Inter's own tabular ones (`1111` and `0000` measure alike at every size); on the screens not yet moved the 13 px strings are set at 16 (see failures) |
| Fine grain on creatures and world only; chrome and type crisp (SG Decided 3) | Art layer on the Station palette's 62 colours, 0 off palette (UK §2; SS Palette and layers); off palette only on the painted and type layers and the stamp — **0 off palette on the art layer at every screenshot point, against the page's 69 colours; not yet the settled 62** (the palette commit renames and swaps the file; see failures); the stamp is quantised to the same palette |
| Creature areas 300×310 or larger; never upscaled tokens (SS) | Placeholder only where no master exists, registered and labelled, waiting lamp shown (SB §3; PH §0) — **yes**: every Pods picture is registered in the asset manifest at its size with `status: placeholder` and what it waits for (the count on screen is printed by the checks); no sprite is unregistered or at another size (0 at every point); the waiting lamp is on Habitat, unchanged |
| All chapters shown, in ring order (SS Chapter rail) | Strings as decided: `✓ verb · price · ← where` \| subject \| what needs you (SS Frame) — **yes on Pods**: the line's three regions at the frame spec's rectangles with hairlines at x 396 and 628 (region check), the verbs, prices and subjects of the layout's §6 table, "something new here" without a star, "· half" on the line only; the other screens' strings are as built |
| No digits where a picture does: ring, leaves, seeds, Library (SS) | Device keys only; one press per spend; arm-then-confirm where decided (PS Keys) — **yes**: the journey drives Pods through the page's key handler (identify, read, compare, the hatch armed by the first ✓ and disarmed by any other key, the focus walked with the pad); input is held for the seal and the wipe |
| Labels one word; never a text page (SS Pods, Library) | Key row fits a phone in one line and stays pressable (PS page) — **n/a**: the page's key row is unchanged by this work and was not re-measured |
| Motion from the vocabulary; a still frame reads (SG Motion) | CI green, the journey extended through this screen, screenshots refreshed (SB §5) — **yes**: the journey runs Pods on the layer through seven new 1× captures (`prototypes/station/img/pods-*.png`), all earlier screenshots refreshed; CI run ‹link› |

### Section 3, Pods on the screen layer (T1): failures and departures, listed by the builder

Not measured: the pixel-grain check G2 per region (its CI recipe is owed, not part of T1's checks); the page's key row on a phone; the Companion page's palette check.

Departures from the layout document, each to be settled by the UI designer or the lead:

- **Derived** (listed under `derived` in `pods.json`, "derived, UI designer to confirm"): Compare's page grid for one and two traits (the document gives three to six; pictures 376×264 and 184×256, Read's scaled to 408 px) and its cell rows; the unread and read tab fills; the place of Compare's 12×12 difference bracket (centred on the picture's top edge).
- **Motion not built:** the focused thing lifts at once (the pod 4 px, the rail's tab 4 px), not over 200 ms; wells and the hatch do not lift; the page turns at once, not over 200 ms; the glint star does not twinkle (a still frame shows it).
- **Tabs** for fewer than seven chapters are left-aligned from the rail's x, as the document says ("tab i is at x0 + 120i"); nothing is centred.
- **Behaviour changed to the document:** ✓ on an identified pod with nothing read moves the ring to the first unread tab (it moved to the last chapter looked at); the bottom line says "something new here" with no star; the tab and list words, the heading readout, "and n more", "n sealed", the aqua bar and the amber square are gone.
- **The screens not yet moved** (Home, Create, Incubator, Habitat, Library, Cross, Sitting, Idle): drawn through the adapter as before, with this change forced by the atlases: the 13 px strings (Cross, Habitat) are set at 16 px (the decided "✕" stays "✕": Inter has no such glyph, so it is a sprite in the text run, registered with the icons); their text sits on the type layer and their art on the art layer (0 off-palette). They still crop and enlarge trait pictures and draw 16 px emblems until T2.
- **Type:** the converter carries only the font's legacy kerning pairs (about 250 a face; none between figures, which stay tabular); the Mibi 7×9 atlas waits for the type designer's glyph sheet.
- **Close-ups** are placeholders rendered by the rig's camera at their size, centred on the part the trait names; the part table is the old one.
- **The Station palette** is the page's 69 colours until the palette commit renames to the settled 62.
- **What the checks cover:** the palette, the type and the frame size are measured on every screen at every screenshot point; the regions check only on the screens on the layer (Pods, ten points); the job log names which points go through the adapter.

## 4. Companion screen build

| Art direction | Capabilities |
| --- | --- |
| Reads first what the guide names, at 1× (CS) | 450×600 at 1:1, whole-number page scale (SG; PE Frame) |
| Tokens HiBit; the pawn reads in sun, storm, fog and veil (SG; CS Place) | HUD 32, view 532, bottom line 36 (SG Frame; UK §6) |
| Weather: lavender cloud bank, pale fog, one diagonal rain sheet (SG) | 48 colours, 0 off-palette pixels on every screen (SG; UK §2) |
| The 280×300 resident is the same individual as at the Station (CS; AP §1.1) | 48 px tiles, about 9×11, pawn in the middle third (DC B; SG Decided 4) |
| Play language; numbers only as prices and counts beside icons (CS) | Mibi 7×9 bitmap at 2× or 3×, never 1× (SG Type) |
| The screen's "Pass when" list (CS) | Resident, token and face derived on the Station; placeholder set until the painting lands (AP §1.1) |
| | Keys usable, presses during motion consumed, pressable on a phone (SG; PE) |

## 5. Generated creature painting or batch

| Art direction | Capabilities |
| --- | --- |
| The consistency recipe: prompt v8's house rendering for every species, notes only for differences, no species reference image (GR) | Controls from the genome, three-quarter and side (AP §4) |
| Nothing childish: a naturalist's study, never a vinyl collectible (AD; GR v8) | Validated: silhouette, every part, slot colours, markings in fields; one named retry, then the placeholder (AP §5) |
| Inside the cute envelope E1–E9; no part added, moved or recoloured (workbench; AP §4) | Small sizes derived, never painted small: 280×300, 48 px token, idle and walk frames (AP §1.1) |
| Same individual as its controls; only what is known shown (AP §5; AD) | No hidden copy in manifest or controls (AP §3); painter id in the cache key; never silently regenerated (AP §5) |
| Judged at device size beside Pip (AP §9) | Every call logged with cost, time and hashes; total against $0.35 a mibi and the daily ceiling (AP §8; SB §4) |
| Species pieces: the art director's pick (AP §1.1) | Labelled generated; originals kept (AD) |

## 6. Proposal with figures

| Art direction | Capabilities |
| --- | --- |
| Every figure captioned with its status (accepted, concept, generated, layout, placeholder, diagram) (SG) | Decided and Proposal marked; owner decisions with a recommendation (AP §13) |
| Figures at 1× (AD) | Every number measured, its script and inputs named (GR) |
| Nothing childish; nothing superseded shown as current (AD; SS) | Links and image paths resolve |
| Superseded text marked in place, not deleted (AP) | Plain English, the decided terms: Companion, partner, pod, crate, bay, Shield, beacon, outpost, mibi |

## What is automated

**Measured today**, by the site workflow on every push to main:

- **Parse:** every page's inline scripts compile.
- **Smoke:** three pages load without console errors; Station keys pressed.
- **Station rules:** `node --test` on the rules and the migration.
- **Station journey:** the founder loop through the keys, the save, the stamp; `offPalette() === 0` on the Read frame only, against the page's own 69 colours (wood and felt among them), not the 48 ramps.
- **Screen size:** implicit; the canvas is declared 1024×600, never asserted. CI never calls the Companion's `__mb.offPalette`.

**Measure next:** canvas size on both pages; the palette on every screen; the Companion's bands and tile pitch; rail chapters against the frame; digits on no-digit screens; the placeholder register; and these two.

**Pixel-grain check.** Crop the 1024×600 screen from each journey screenshot; split it into top bar (0–40), stage (40–562) and bottom line (562–600). Take 2×2 blocks at each of the four grid phases, counting only blocks whose 4×4 surround holds more than one colour. **G2** is the share of those blocks that are one colour, at the best phase. (The plain uniform share ranges 0.36–0.92 with flat fills, and separates nothing.) **G2 ≥ 0.60 fails** as 2× rendering; ≤ 0.40 is 1× grain; between, the art director looks. On the twelve M2 screenshots in `prototypes/station/img/`:

| Region | G2 |
| --- | --- |
| Stage, eleven screens | 0.17–0.36, passes |
| Stage, Library spread | 0.72, fails (2 px rules, 2× labels) |
| Top bar | 0.81–0.86, fails (2× counters, 3× title) |
| Bottom line | 0.97–0.99, fails (2× text) |
| Each shot upscaled 2× (control) | 1.00 |

**Type check.** Wrap `CanvasRenderingContext2D.prototype.fillText` before load, logging each string and `font`. Per screen, assert: Inter loaded from a bundled OFL file; every string the screen sets logged in Inter at 16, 20 or 28 px; the bitmap glyph path unused; the bottom line's G2 at most 0.40, since anti-aliased type is never block-uniform. Run the palette check on the art layer before the type, which is off palette by decision (DC A). Today the Station draws all its type with a 5×7 bitmap at 2×, 3× and 4×, so this fails.

## The delivery rule

No delivery reaches the owner without its checklist filled in, both columns signed, failures listed, and the programme lead's verification line: "Verified: checklist complete, failures listed, CI run ‹link›, ‹name›, ‹date›."
