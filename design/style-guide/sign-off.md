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
| Reads first what the guide names, within a second (SG checklist) — **yes, for Pods (T1)**: the guide names the pod and its name, and on every capture the pod under the beam leads, its name under it. The pod is the signed placeholder sprite placed 1:1 and fills its box: the stem's top on the box's top row (y 120, 144 or 168 by class), the shell's foot on its last row, in the cradle's ring at y 312, the box's full width (compared pixel for pixel with the atlas's own composition; the focused pod rides 4 px higher, the focus's lift). Its still glow is the brightest point on the bench (a `bone`, `paper` or `white` core, relative luminance 0.83 to 1.0). The unread frost is frosted glass, `frostS` with `frostD` texture (about 0.5 on average, no `frost`, no `white`), cool and flat, and sits below the pod. One exception, the pod of a species not yet known, is the next line's | 1024×600 at native 1× grain; no 2× upscaled chrome or text (SG Station; grain check) — **yes, for the frame size and the 1× drawing**: the frame is asserted 1024×600 at 25 screenshot points, the chrome is rectangles and sprites placed at integer pixels at their size, the type is blitted from atlases baked at 16, 20 and 28 px; **G2 not measured** (its CI recipe is not built; see failures) |
| The room's vibe; one warm living window; no wood, felt or lamp-lit bench (SS) — **no, on two points**: the bench reads as a modern digital lab (a flat `deep` ground, a flat `tealD` beam, cool chrome; no wood, moss, felt or lamp pool on the art layer) and every identified pod is the one lit, living thing on it. (a) A pod of a species not yet known is grey with its glow's core in `frostS` (0.46, cool), so the first pods a new player meets leave nothing warm on the bench (failure 1). (b) On every identified well the progress ring's centre disc (`fog`, 11 px) sits on the pod's neck under the lit cap and reads as a pale head under a hat: a small figure, a toy's tell, and against the decision of 2026-10-07 that the ring carries chapters only (failure 2) | Inter, smooth: 16 px body, 20 titles, 28 names, tabular figures (SG Type; DC A; type check) — **yes**: the type log has every string in Inter at 16, 20 or 28 px from the bundled atlases (hashes matched), no text API call on the page, the figures are Inter's own tabular ones (`1111` and `0000` measure alike at every size); on the screens not yet moved the 13 px strings are set at 16 (see failures) |
| Fine grain on creatures and world only; chrome and type crisp (SG Decided 3) — **yes**: the bench and the beam are flat; the pod is flat bands (light, base, shade, a small highlight) with 1 px ramp outlines, crisp at 1× and never dithered; tabs, wells, rings, hatch, cradle, ribbon and plate are flat with one bevel; the type is crisp (Inter from the atlases); the 1 px grain is on the close-ups and the seeds only; the unread frost's `frostD` texture reads as frosted glass, not as a dither band | Art layer on the Station palette's 62 colours, 0 off palette (UK §2; SS Palette and layers); off palette only on the painted and type layers and the stamp — **yes**: 0 off palette on the art layer at every screenshot point, against the settled 62 colours of `station.json` (the colour uses were renamed per the kit's migration table); the stamp is quantised to the same palette |
| Creature areas 300×310 or larger; never upscaled tokens (SS) — **yes**: on Pods the specimen is the pod at its box, each the signed sprite 1:1, never scaled: 160×192, 136×168 and 112×144 under the beam (the captures match the atlas's composition at every pixel, apart from the focus ring and the Identify cut) and 32×40 in the wells and Compare's headings (every pixel but the ring's disc, failure 2); every trait picture (448×312, 216×112, 144×112; Compare 376×264, 184×256, 184×104, 120×96) and seed (40×52, 32×40) at its listed size, none cropped and enlarged | Placeholder only where no master exists, registered and labelled, waiting lamp shown (SB §3; PH §0) — **yes**: every Pods picture is registered in the asset manifest at its size with `status: placeholder` and what it waits for (the count on screen is printed by the checks); no sprite is unregistered or at another size (0 at every point); the waiting lamp is on Habitat, unchanged |
| All chapters shown, in ring order (SS Chapter rail) — **yes**: each species shows every chapter it has, in the catalogue's ring order: Untuva and Loika four, Belatz seven, Tuikis eight with Glow last (96 on a 104 pitch from x 180), the same on Compare; no fixed count, no second row, no clipped word | Strings as decided: `✓ verb · price · ← where` \| subject \| what needs you (SS Frame) — **yes on Pods**: the line's three regions at the frame spec's rectangles with hairlines at x 396 and 628 (region check), the verbs, prices and subjects of the layout's §6 table, "something new here" without a star, "· half" on the line only; the other screens' strings are as built |
| No digits where a picture does: ring, leaves, seeds, Library (SS) — **yes**: the ring, pips, seals and stars carry progress without a digit and the page has none; the origin has no expedition number, a well's subject no well number, Compare's need line is one of its three strings, the empty rack's line follows the bay, the shared need line says its counts in words ("a new pod waits", "three new pods wait") and an amount beside a material icon stays in figures. The only figures are the top bar's counters and the prices beside their icons, the frame's exception | Device keys only; one press per spend; arm-then-confirm where decided (PS Keys) — **yes**: the journey drives Pods through the page's key handler (identify, read, compare, the hatch armed by the first ✓ and disarmed by any other key, the focus walked with the pad); input is held for the seal and the wipe |
| Labels one word; never a text page (SS Pods, Library) — **no, on one point**: the rail and the page headings are one word ("Legs & tail" the decided exception); the trait names are now one word (Colour, Fluff, Sheen, Feathers, Tufts, Trim, Markings, Scales, Carriage, Tail, Curiosity, Nerve) and their lines six words or fewer; a line cut at two lines drops its trailing "·"; the hatch's arming plate says "Back to the cave? ✓ again"; Identify and a read show no plate. It fails on the bottom line's subject, cut with "…" on a sealed tab ("Character · sealed · opens …") and on the armed hatch ("the hatch · Belatz pod back …"): both strings are longer than the subject's 224 px (failure 3) | Key row fits a phone in one line and stays pressable (PS page) — **n/a**: the page's key row is unchanged by this work and was not re-measured |
| Motion from the vocabulary; a still frame reads (SG Motion) — **no, a listed departure, accepted**: a still frame reads (the seal's cut line between the sealed and identified sprites, a wipe half done, the star on its tab and ring, the armed hatch), and the seal and the wipe play over 2 s holding input; the 200 ms lift and page turn, the glint's 2 Hz, Compare's 300 ms slide and the glow's breathing are not built. It does not hold the delivery back | CI green, the journey extended through this screen, screenshots refreshed (SB §5) — **yes**: the journey runs Pods on the layer through twelve 1× captures (`prototypes/station/img/pods-*.png`, Compare with one, two, four and six traits and the empty rack among them), all earlier screenshots refreshed; CI run https://github.com/PacoCotera/miniaturebeasts/actions/runs/37844214989 (green, on 8608b99; the code is identical to the commit that adds this link) |

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
- **Second correction round, facts only** (the pod's drawing waits for the pixel artist's placeholder sprites, which replace `podArt`'s code): the pod's stem top is on row 1 and its shell's foot on the last row of its box, so the foot sits on y 312 in the cradle's ring; the unread picture's frost is `frostS` with `frostD` at most; the hatch's arming plate is `strings.hatchArm` with `strings.hatchPlace` ("Back to the cave? ✓ again", six words or fewer for every place); a trait line cut at two lines drops its trailing "·"; the need line's counts are in words but an amount beside a material icon stays in figures ("needs 3 ◆"); past twelve, "many".
- **The pod is the placeholder sprites** (signed by the art director, `prototypes/ui/assets/placeholders/pod/`): the two sheets are registered in the manifest from the atlas's own entries; `src/podsprites.mjs` composes a pod 1:1 from the atlas's sub-rectangles (no scaling): the body (sealed or identified) remapped to the species in one pass, the glow at `glowAt` remapped the same way, the glyph unmapped at `glyphAt` on identified pods only; the box is bottom-centred on (344, 312) and the well pod is the 32×40 class. The seal-break stays the still cut between the sealed and identified pictures (no motion). `podArt`'s drawing code and its old ids are deleted. A pod of a species not yet known is a quiet grey pod (the foot ring's ramp takes the shell's), a builder's rule the atlas does not give (derived, art director to confirm). Home's tray and arrival and Create's "from the pod" draw the 32×40 well-size pod until those screens move (T2): a departure from the scales they drew before.
- **Off the migration table, deliberately:** the Pods pictures' ground is `deep` (the page pane), not the table's `creamT` to `bone`; the seed pictures key out that ground, and a bone ground is the cream card the art director struck.
- **Closed by main:** the one-word trait names and the shorter Pods trait lines (d125c12) are merged; the captures show them. Motion (the 200 ms lift, the page turn, the glint, Compare's slide, the pod's glow) is still not built.

### Section 3, Pods on the screen layer (T1): the art direction column and the layout, by the art director and the UI designer

Judged a third time, after the placeholder pods were placed (the code of ebfb3b8, the captures on 563170e). The twelve 1× captures (`prototypes/station/img/pods-*.png`: unidentified, identifying, reading, six traits, sealed, eight chapters, hatch armed, Compare with one, two, four and six traits, the empty rack) were read against [Station screens](station-screens.md) (Pods), [Station layouts](station-layouts.md) (Pods), its wireframe, `prototypes/ui/specs/station/pods.json` and the signed [pod placeholders](../../prototypes/ui/assets/placeholders/pod/README.md). Every pod on the stage and in the wells was compared pixel for pixel with the atlas's own composition, and colours were read by name against the palette.

**The four failures of the second check:**

1. **The pod fills its box, with a still glow: closed.** The pod is the signed sprite of its class, placed 1:1: large 160×192 at (264, 120), medium 136×168 at (276, 144), small 112×144 at (288, 168). The stem's top is on the box's top row and the shell's foot on its last row, in the cradle's ring at y 312, across the box's full width. Five stage captures match the composition at every pixel; the identifying one splits at its cut; the unidentified one is the focused pod, 4 px up (the focus's lift), and differs only under the focus ring. The glow is the sprite's still stand-in, stepped ellipses low in the shell, nothing spilled.
2. **The unread frost: closed.** `frostS` ground with `frostD` texture (about 72 and 28 per cent on a tile), no `frost`, no `white`; about 0.5 relative luminance on average, against the pod's glow core at 0.83 to 1.0. It reads as cool frosted glass below the pod.
3. **The glyph clear on the cap: closed as directed.** The glyph is whole, `cream` on the cap's own `slate`, a clear pixel below the stem and above the neck, with no bone disc. The build draws no face. What some of the frames' glyphs look like once lit is the question for the owner below, not this build's failure.
4. **The hatch plate: closed.** "Back to the cave? ✓ again", the bottom line keeping `✓ Again: return it · +1 ❀`. A trait line cut at two lines drops its trailing "·", and an amount beside a material icon stays in figures.

**The geometry holds** (UI designer, measured): the list, wells, rings, place stamps and hatch; the rail at y 48, the focused tab 2 px up; the pod's box by class, bottom-centred on (344, 312); the cradle, name, origin and ribbon; the stamp label at (176, 432, 120, 120); the page at (528, 112, 480, 440) and its grids; Compare's pages, rows and difference marks; the bottom line's hairlines at x 396 and 628. All are as in [Station layouts](station-layouts.md) (Pods, Confirmed against the build).

**The pod of a species not yet known: decided by the art director.** Confirmed, with one correction. A pod whose species the player has not identified yet is drawn grey. The shell keeps the base ramp A and the foot ring takes the shell's ramp, because the species' colour pair would show what is not yet known. The correction: its glow's core is `bone` (in the grey remap, `frostS` → `bone`, one entry), as on the charcoal species, so every pod keeps a warm centre. A grey pod differs from a sealed Loika, Pesko or Oskol by its grey foot ring and its name, "Unknown pod". Pods of one known species still match.

**Art direction and layout failures, with the direction for each** (engineers do not make art: each is a stand-in, not a master):

1. **The unknown pod's cold core.** As built, the glow's core stays `frostS`, so a new player's first pods are cool and nothing on the bench is warm. Direction: the correction above. The pod keeps its grey shell and foot ring.
2. **The ring's centre disc on the well pod.** On every identified well, the progress ring's 11 px `fog` disc is drawn over the pod's neck, under the lit cap. Cap, disc and shell read as a hat, a head and a body: a small figure. Direction: the ring draws no centre fill. "Identified" shows on the pod itself (the band gone, the glyph lit), as decided on 2026-10-07 ("the progress ring sits around the pod's shell and carries chapters only"). The arcs, notches and stars are unchanged. After the fix, the wells match the sprites at every pixel. Station screens' and the research loop's "the centre fills at Identify" predate that decision and are superseded by it.
3. **Clipped subjects on the bottom line.** A sealed tab's subject ("Character · sealed · opens …") and the armed hatch's ("the hatch · Belatz pod back …") run past the subject's 224 px and end in "…". Direction (UI designer, set in [Station layouts](station-layouts.md) §6): a sealed tab's subject is "‹chapter› · sealed", because its page already shows what opens it; the hatch's subject is "the hatch · ‹the pod's name›" ("the hatch · Belatz pod"), because the arming plate says where it goes. Every subject fits its region at 16 px without "…", and the region check is to assert that no subject is clipped.

**Departures, accepted for this delivery:** motion not built (the 200 ms lift and page turn, the glint, Compare's slide, the glow's breathing; the seal-break is the still cut between the two sprites); the 32×40 well pod on Home's tray and arrival and on Create's "from the pod" until those screens move (T2); no shell pattern on any pod (the placeholder, signed so). None of them holds the delivery back.

**Question for the owner** (a big thing, because it touches an accepted asset): lit on the cap at the stage's size, some of the frames' species glyphs read as something other than a mark. S01, the Loika's, reads as an arcade alien, close to another franchise's creature; S02, the Untuva's, as a mushroom or a skull; S03, the Tuikis', as a grave cross. These are the same glyphs that sit at the centre of the accepted genome stamp and in the frames, so redrawing them changes the stamp. Recommendation: the frames' owner and the art director redraw the set as abstract marks (no figure, face or cross) after this delivery, and the stamp takes the new set. This delivery does not wait for that.

**Delivery: not signed.** The art director would not yet put it in front of the owner. The UI designer confirms the geometry, including the pod in its box, and sets the two subjects. The four failures of the second check are closed. Three small ones remain, each with its direction above: the unknown pod's cold glow core, the ring's centre disc on the well pods, and the clipped bottom-line subjects. Motion, the well pod on the screens not yet moved and the plain shell are accepted departures and would not hold the delivery back once these three are fixed.

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
