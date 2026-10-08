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
| Reads first what the guide names, within a second (SG checklist) — **no, for Pods (T1)**: the guide names the pod and its name. Unidentified, yes: the pod under the beam and "Unknown pod" are all the stage holds. Read, no: the open page's pictures sit on a bright cream ground (one 448×312, or six 144×112) and pull the eye before the pod, which has no inner glow and is drawn at about two thirds of its box (88×137 in 136×168); unread, the near-white frost on the tabs and pictures is the brightest thing on screen | 1024×600 at native 1× grain; no 2× upscaled chrome or text (SG Station; grain check) — **yes, for the frame size and the 1× drawing**: the frame is asserted 1024×600 at 25 screenshot points, the chrome is rectangles and sprites placed at integer pixels at their size, the type is blitted from atlases baked at 16, 20 and 28 px; **G2 not measured** (its CI recipe is not built; see failures) |
| The room's vibe; one warm living window; no wood, felt or lamp-lit bench (SS) — **no**: the bench should read as a modern digital lab on a deep blue-teal ground; it reads as a dithered dusk backdrop (night and deep teal in a checker, with banding rings) under moss-green bars. Wood on the art layer: the message plate (wood1, lampD edge), the "only" base (a wood3 and wood4 plank), the joined rings' wood0 outline; the "New species" ribbon was a lamp-yellow plate (corrected in the spec). No felt, no lamp-lit bench. The one warm thing is not yet warm: the pod has no glow and the read pictures' cream ground competes with it | Inter, smooth: 16 px body, 20 titles, 28 names, tabular figures (SG Type; DC A; type check) — **yes**: the type log has every string in Inter at 16, 20 or 28 px from the bundled atlases (hashes matched), no text API call on the page, the figures are Inter's own tabular ones (`1111` and `0000` measure alike at every size); on the screens not yet moved the 13 px strings are set at 16 (see failures) |
| Fine grain on creatures and world only; chrome and type crisp (SG Decided 3) — **no**: the type is crisp (Inter from the atlases) and the pod, pictures and seeds carry a 1 px grain; but the chrome carries grain too: the bench behind every region is an ordered-dither checker, and the beam is a cone of dithered scanlines, not light. The art layer is never dithered | Art layer on the Station palette's 62 colours, 0 off palette (UK §2; SS Palette and layers); off palette only on the painted and type layers and the stamp — **yes**: 0 off palette on the art layer at every screenshot point, against the settled 62 colours of `station.json` (the colour uses were renamed per the kit's migration table); the stamp is quantised to the same palette |
| Creature areas 300×310 or larger; never upscaled tokens (SS) — **yes**: on Pods the specimen is the pod at its layout box, not a creature; every trait picture, seed and pod is drawn at its listed size with a 1 px grain, none cropped and enlarged (checked on the captures at 1×). The pod drawn small inside its box is a layout failure, listed below | Placeholder only where no master exists, registered and labelled, waiting lamp shown (SB §3; PH §0) — **yes**: every Pods picture is registered in the asset manifest at its size with `status: placeholder` and what it waits for (the count on screen is printed by the checks); no sprite is unregistered or at another size (0 at every point); the waiting lamp is on Habitat, unchanged |
| All chapters shown, in ring order (SS Chapter rail) — **yes**: each species shows every chapter it has, in the catalogue's ring order: Untuva and Loika four, Belatz seven, Tuikis eight with Glow last (96 on a 104 pitch, centred); no fixed count, no second row, no clipped word. Station screens' "Loika shows seven" predates catalogue 9, where the Loika has four; that line is to be marked in place | Strings as decided: `✓ verb · price · ← where` \| subject \| what needs you (SS Frame) — **yes on Pods**: the line's three regions at the frame spec's rectangles with hairlines at x 396 and 628 (region check), the verbs, prices and subjects of the layout's §6 table, "something new here" without a star, "· half" on the line only; the other screens' strings are as built |
| No digits where a picture does: ring, leaves, seeds, Library (SS) — **no**: the ring, pips, seals and stars carry progress without a digit and the page has none, but the origin line sets "· expedition 2" (its digit wraps alone onto a second line on four of the seven captures); Compare's need line says "1 trait differ"; a well's subject reads "well 3 · …" (the view's line, not on these captures); the shared need line counts ("3 new pods wait") | Device keys only; one press per spend; arm-then-confirm where decided (PS Keys) — **yes**: the journey drives Pods through the page's key handler (identify, read, compare, the hatch armed by the first ✓ and disarmed by any other key, the focus walked with the pad); input is held for the seal and the wipe |
| Labels one word; never a text page (SS Pods, Library) — **no**: the rail and the page headings are one word, "Legs & tail" the decided exception; but the trait names on the page are two words ("Second colour", "Fur reach", "Cap colour", "Cap spots", "Leg colour"), some trait lines run past six words ("off · asleep: bands or patches, if they wake"), Identify's message plate is a twelve-word sentence, and a sealed tab's word is lost under its slats (corrected in the spec). The trait names are the catalogue's, for the copy owner to settle, not the builder | Key row fits a phone in one line and stays pressable (PS page) — **n/a**: the page's key row is unchanged by this work and was not re-measured |
| Motion from the vocabulary; a still frame reads (SG Motion) — **no**: a still frame reads (the seal's cut line, a wipe half done, the star on its tab and ring), and the seal and the wipe play over 2 s holding input; but the lift, the page turn and Compare's slide are instant, the glint does not twinkle (the builder's list), and the pod has no living glow | CI green, the journey extended through this screen, screenshots refreshed (SB §5) — **yes**: the journey runs Pods on the layer through seven new 1× captures (`prototypes/station/img/pods-*.png`), all earlier screenshots refreshed; CI run https://github.com/PacoCotera/miniaturebeasts/actions/runs/37835347189 (green, on 806e866; the code is identical to the commit that adds this link) |

### Section 3, Pods on the screen layer (T1): failures and departures, listed by the builder

Not measured: the pixel-grain check G2 per region (its CI recipe is owed, not part of T1's checks); the page's key row on a phone; the Companion page's palette check.

Departures from the layout document, each to be settled by the UI designer or the lead:

- **Derived** (listed under `derived` in `pods.json`, "derived, UI designer to confirm"): Compare's page grid for one and two traits (the document gives three to six; pictures 376×264 and 184×256, Read's scaled to 408 px) and its cell rows; the unread and read tab fills; the place of Compare's 12×12 difference bracket (since confirmed: inside the picture, top centre, 8 px in).
- **Motion not built:** the focused thing lifts at once (the pod 4 px, the rail's tab 2 px), not over 200 ms; wells and the hatch do not lift; the page turns at once, not over 200 ms; the glint star does not twinkle (a still frame shows it).
- **Tabs** for fewer than seven chapters are left-aligned from the rail's x, as the document says ("tab i is at x0 + 120i"); nothing is centred.
- **Behaviour changed to the document:** ✓ on an identified pod with nothing read moves the ring to the first unread tab (it moved to the last chapter looked at); the bottom line says "something new here" with no star; the tab and list words, the heading readout, "and n more", "n sealed", the aqua bar and the amber square are gone.
- **The screens not yet moved** (Home, Create, Incubator, Habitat, Library, Cross, Sitting, Idle): drawn through the adapter as before, with this change forced by the atlases: the 13 px strings (Cross, Habitat) are set at 16 px (the decided "✕" stays "✕": Inter has no such glyph, so it is a sprite in the text run, registered with the icons); their text sits on the type layer and their art on the art layer (0 off-palette). They still crop and enlarge trait pictures and draw 16 px emblems until T2.
- **Type:** the converter carries only the font's legacy kerning pairs (about 250 a face; none between figures, which stay tabular); the Mibi 7×9 atlas waits for the type designer's glyph sheet.
- **Close-ups** are placeholders rendered by the rig's camera at their size, centred on the part the trait names; the part table is the old one.
- **What the checks cover:** the palette, the type and the frame size are measured on every screen at every screenshot point; the regions check only on the screens on the layer (Pods, ten points); the job log names which points go through the adapter.

### Section 3, Pods on the screen layer (T1): the correction stage, by the builder

Built to the art director's list and the corrected spec; the art director re-checks it before the owner sees it.

- **The pod fills its box**: the shell is drawn to the box's height and as wide as the box allows (the pod renderer's parameters, never an image enlarged); a sealed pod has a plain shell and a plain dark band for its seal (no pattern dots, no red cross); the pattern shows once it is identified.
- **Crisp and flat**: the bench is one flat `deep` rectangle (no dither, no rings), the beam a flat cone of `tealD`; the plate, the "only" base and the ring outlines use the palette's migrated names (no wood); the ribbon is `tealD` with an `aqua` rim and `bone` words.
- **No digits**: the origin drops the expedition's number, a well's subject its number, Compare's need line is the spec's three strings, the empty rack's line follows the bay (away, docked with crates, docked with the bay empty); the shared need line on Pods says its counts in words ("three new pods wait", "two crates in the bay"), a rendering the layout document does not give (derived: UI designer to confirm). The name and origin carry `noDigits` and the checks read them.
- **Tabs and marks**: the focused tab lifts 2 px (component, its test, the regions check); a sealed tab's word is `mist`; the unread fill is `frostS`; the page pane is `deep`; Compare's rows are at y 56 and 248; the three- and four-trait picture is 216×112 with the 32×40 seed; the difference is a 2 px `aqua` edge on the picture and a 12×12 `aqua` bracket on an `ink` keyline, 8 px in at the top centre, with no cream ring.
- **Message plates on Pods** only for refusals and for the hatch's arming (Identify, a read and the return show none).
- **Placeholders that drifted**: the close-ups are drawn without the rig's eye parts on the page's own pane (no cream card, no sand band); the seeds follow.
- **Captured**: Compare with one, two, four and six traits (`pods-compare-*.png`, a difference on the page) and the empty rack (`pods-empty-rack.png`); the journey asserts each line and the checks read them.
- **Off the migration table, deliberately:** the Pods pictures' ground is `deep` (the page pane), not the table's `creamT` to `bone`; the seed pictures key out that ground, and a bone ground is the cream card the art director struck.
- **Not mine, listed as departures**: the trait names of two words ("Second colour", "Fur reach", "Cap colour", "Cap spots", "Leg colour") and the trait lines over six words ("off · asleep: patches, if they wake") are the catalogue's; the copy owner settles them. Motion (the 200 ms lift, the page turn, the glint, Compare's slide, the pod's glow) is not built.

### Section 3, Pods on the screen layer (T1): the art direction column and the layout, by the art director and the UI designer

Judged on the seven 1× captures (`prototypes/station/img/pods-*.png`) and Compare in `page-compare.png`, against [Station screens](station-screens.md) (Pods), [Station layouts](station-layouts.md) (Pods), its wireframe and `prototypes/ui/specs/station/pods.json`.

**Placeholders.** Plainly placeholders, and fine: the place squares, the hatch's slot and leaf, the rings, the emblems, the slats and the key, the stamp on its plain label. Not plainly placeholders: the trait close-ups draw the rig's eye parts as a face (white eyes with pupils, large on the Loika's 448×312 close-up) and faceted volumes on a paper-cream card, so they read as a finished toy render rather than a pass waiting for its painting (PH §0: no face, flat slots, a plain ground); the pod's candy dots under a red "+" seal read as a sweet with a first-aid cross. Nothing on the screen is childish by intent, but these two are where it drifts toward toy, and they must be plainer to read as stand-ins.

**Art direction failures, with the direction for each** (engineers do not make art: each is a plainer stand-in, not a master):

1. **The spotlight.** The pod is not the brightest, warmest thing. Draw it to fill its box's height (the layout's correction below); give it the soft inner glow the guide names, as a flat stand-in; clear the trait pictures' cream ground to the page's pane, so the warmth of a read page is the creature's own, low and inside the picture; bring the frost on unread pictures down to frosted glass over the pane (`frostS` and `frostD`), not near-white.
2. **The bench.** A flat `deep` ground (the settled palette's `ground`), no dither and no rings; the beam a flat cool cone, or none until its master. The bars, the message plate, the "only" base and the joined rings lose moss and wood by the palette commit's migration table (moss1 to `ground`, wood1 to `bar`, wood3 and wood4 to `bevel` and `metal`, lampD out).
3. **The placeholders' tells.** The close-ups without the eye parts (the plain pass as PH §0 describes it); the pod's seal a plain dark band, not a red cross.
4. **No digits:** the origin drops the expedition number; the well's subject drops its number; Compare's need line in words (the spec's strings); the shared need line's counts go to words or icons with the frame's next pass.
5. **Words:** the trait names of two words and the trait lines over six words go to the copy owner with the catalogue; Identify and a read show no message plate (the spec).
6. **Motion:** the 200 ms lift and page turn, the glint at 2 Hz, Compare's 300 ms slide, the pod's glow.

**The layout, confirmed by the UI designer.** Measured on the captures, as specified: the list and its hairline, the six wells, rings and place stamps, the hatch, the rail and its tabs (seven on the 120 pitch from x 176, eight at 96 on 104 from x 180), the pod's box by size class, the name, origin and stamp label, the open page and its heading, the grids for one, four and six traits, Compare's two pages with the one-trait picture at 376×264, the bottom line's separators. The automated regions check compares the scene with the spec file; these are the spec file and the screen against the document and the wireframe.

**Corrected in the spec** (`pods.json`, `station-layouts.md` and the wireframe; each derived note kept with the decision added):

- Compare's grid for one and two traits **confirmed** (pictures 376×264 and 184×256); its cell rows **corrected** from y 48 and 248 to y 56 and 248 on the page (cells 376 tall for one or two traits): the heading's 32×40 pod touched the first row.
- Read's picture for three or four traits from 216×120 to **216×112**: the name and two lines ran 4 px past the 184 cell. Its seed is the 32×40 one.
- Tab fills: read **confirmed**; unread `frostD` to **`frostS`**; a sealed tab's word in **`mist`**. The focused tab lifts **2 px**, the chrome lift (at 4 its ring met the top bar's rule at y 40).
- The difference mark: **inside the picture, top centre, 8 px in**, aqua on an ink keyline, with a 2 px aqua edge on the picture; **no cream ring**, which is the focus's alone. (The build's cream bracket at P.y + 4 vanished on the pictures' pale ground.)
- Colour roles **confirmed** but the ribbon (lamp and rust to deep teal, aqua and bone words), the page pane (`night` to `deep`, as the document names it), the unread and sealed tabs and the difference mark above.
- The empty rack's line: away "dock the Companion for its crates"; docked with crates "open the bay at Home"; docked with the bay empty "take the Companion exploring".
- The name and origin are marked `noDigits`; Compare's need line has its strings.

**Departures the builder follows next:** the pod drawn to fill its box (about two thirds of its width and four fifths of its height today); the view's empty-rack branch on the bay's crates and Compare's need line from the spec's strings; no well number in the subject; no message plate at Identify or a read; the rail's lift at 2 px in `chapterRail.mjs`, its test and the regions check; the bracket and edge from `colours.diff`; the sealed word from `colours.rail.sealedWord`; the `noDigits` check extended to the name and origin. Two assertions in `prototypes/station/tests/pods-view.test.mjs` hold the old numbers and strings (the picture size list with 216×120, and the empty rack's lines) and fail until then; the spec test in `prototypes/ui/tests/specs.test.mjs` follows the new 216×112. Not captured, so not confirmed on screen: Compare with two to six traits and a difference, and the empty rack; the journey adds a frame shot of each.

**Questions for the owner:** none. Every failure above is settled by the direction given or by the copy owner.

**Delivery: not signed.** The art director would not put it in front of the owner, and the UI designer confirms the geometry but not the build. It fails on: reads first; the room's vibe (wood, moss, the dithered ground); chrome grain; no digits; labels of one word; motion; and the layout's departures (the pod small in its box, the corrections above not yet built, Compare and the empty rack not captured).

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
