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
| Reads first what the guide names, within a second (SG checklist) — **no, for Pods (T1)**: the guide names the pod and its name. Unidentified, yes: the pod under the beam and its name are all the stage holds. Read, yes: the pictures now sit on the page's own `deep` pane and the pod under the beam leads. Unread, no: the frost over an unread page's pictures is still near-white (`frost` and `white`, about 0.8 relative luminance against the pod's 0.2 to 0.3), so the open page of a newly identified pod outshines it; the tabs' `frostS` is right. And the pod itself: drawn to about four fifths of its box's height (about 136 of 168, 160 of 192 and 114 of 144), its foot about 20 px above the box's foot at y 312 so it hovers over the cradle, and with no inner glow (a still stand-in was asked; it is not motion) | 1024×600 at native 1× grain; no 2× upscaled chrome or text (SG Station; grain check) — **yes, for the frame size and the 1× drawing**: the frame is asserted 1024×600 at 25 screenshot points, the chrome is rectangles and sprites placed at integer pixels at their size, the type is blitted from atlases baked at 16, 20 and 28 px; **G2 not measured** (its CI recipe is not built; see failures) |
| The room's vibe; one warm living window; no wood, felt or lamp-lit bench (SS) — **no, on one point**: the bench now reads as a modern digital lab: one flat `deep` ground, a flat `tealD` beam, the bars in `ground`, the list in `night` and `slate`; no wood, moss, felt or lamp pool on the art layer (the message plate is `bar` with the kit's `sand` rim, the migration table's place for the old `lampD`, and shows only for a refusal and the hatch's arming; the "only" base is `bar`, `bevel` and `metal`; the "New species" ribbon is `tealD` with an `aqua` rim and `bone` words). The one warm living window is not yet warm: with no glow, a grey or cool pod (every sealed pod, the Loika, the Belatz) leaves nothing warm on the bench (failure 2 below) | Inter, smooth: 16 px body, 20 titles, 28 names, tabular figures (SG Type; DC A; type check) — **yes**: the type log has every string in Inter at 16, 20 or 28 px from the bundled atlases (hashes matched), no text API call on the page, the figures are Inter's own tabular ones (`1111` and `0000` measure alike at every size); on the screens not yet moved the 13 px strings are set at 16 (see failures) |
| Fine grain on creatures and world only; chrome and type crisp (SG Decided 3) — **yes**: the bench is one flat rectangle and the beam one flat cone, no checker and no rings; tabs, wells, rings, hatch, cradle, ribbon and plate are flat with one bevel; the type is crisp (Inter from the atlases); the 1 px grain is on the pod, the close-ups and the seeds only | Art layer on the Station palette's 62 colours, 0 off palette (UK §2; SS Palette and layers); off palette only on the painted and type layers and the stamp — **yes**: 0 off palette on the art layer at every screenshot point, against the settled 62 colours of `station.json` (the colour uses were renamed per the kit's migration table); the stamp is quantised to the same palette |
| Creature areas 300×310 or larger; never upscaled tokens (SS) — **yes**: on Pods the specimen is the pod at its layout box, not a creature; every trait picture (448×312, 216×112, 144×112; Compare 376×264, 184×256, 184×104, 120×96), seed (40×52, 32×40) and well pod is drawn at its listed size with a 1 px grain, none cropped and enlarged (measured on the captures at 1×). The pod drawn short of its box is a layout failure, listed below | Placeholder only where no master exists, registered and labelled, waiting lamp shown (SB §3; PH §0) — **yes**: every Pods picture is registered in the asset manifest at its size with `status: placeholder` and what it waits for (the count on screen is printed by the checks); no sprite is unregistered or at another size (0 at every point); the waiting lamp is on Habitat, unchanged |
| All chapters shown, in ring order (SS Chapter rail) — **yes**: each species shows every chapter it has, in the catalogue's ring order: Untuva and Loika four, Belatz seven, Tuikis eight with Glow last (96 on a 104 pitch from x 180), the same on Compare; no fixed count, no second row, no clipped word. Station screens' "Loika shows seven" is marked in place as superseded by catalogue 9 | Strings as decided: `✓ verb · price · ← where` \| subject \| what needs you (SS Frame) — **yes on Pods**: the line's three regions at the frame spec's rectangles with hairlines at x 396 and 628 (region check), the verbs, prices and subjects of the layout's §6 table, "something new here" without a star, "· half" on the line only; the other screens' strings are as built |
| No digits where a picture does: ring, leaves, seeds, Library (SS) — **yes**: the ring, pips, seals and stars carry progress without a digit and the page has none; the origin has no expedition number ("cave · a Belatz had a full meal"), a well's subject no well number ("unknown pod · meadow"), Compare's need line is one of the spec's three strings ("they differ here"), the empty rack's line follows the bay ("take the Companion exploring"), and the shared need line says its counts in words ("three new pods wait", "a new pod waits"; confirmed below, with one correction for amounts beside an icon). The only figures are the top bar's counters and the price beside its icon, the frame's exception | Device keys only; one press per spend; arm-then-confirm where decided (PS Keys) — **yes**: the journey drives Pods through the page's key handler (identify, read, compare, the hatch armed by the first ✓ and disarmed by any other key, the focus walked with the pad); input is held for the seal and the wipe |
| Labels one word; never a text page (SS Pods, Library) — **no, on listed departures and one plate**: the rail and the page headings are one word ("Legs & tail" the decided exception), a sealed tab's word reads in `mist` on its slats, and Identify and a read show no plate. The trait names of two words ("Second colour", "Fur reach", "Cap colour", "Cap spots", "Leg colour") and the trait lines over six words are the catalogue's, with the copy owner (`design/proposals/trait-names.md`); one such line is cut at two lines on Compare with six traits and ends on a dangling "·" ("shows bushy tail and ears ·"). The build's own: the hatch's arming plate says "Return the Belatz pod to the cave? ✓ again", seven words before the key (failure 4) | Key row fits a phone in one line and stays pressable (PS page) — **n/a**: the page's key row is unchanged by this work and was not re-measured |
| Motion from the vocabulary; a still frame reads (SG Motion) — **no, a listed departure**: a still frame reads (the seal's cut line, a wipe half done, the star on its tab and ring, the armed hatch), and the seal and the wipe play over 2 s holding input; the 200 ms lift and page turn, the glint's 2 Hz, Compare's 300 ms slide and the glow's breathing are not built. Acceptable as a listed departure for this delivery once every other line holds | CI green, the journey extended through this screen, screenshots refreshed (SB §5) — **yes**: the journey runs Pods on the layer through twelve 1× captures (`prototypes/station/img/pods-*.png`, Compare with one, two, four and six traits and the empty rack among them), all earlier screenshots refreshed; CI run https://github.com/PacoCotera/miniaturebeasts/actions/runs/37844214989 (green, on 8608b99; the code is identical to the commit that adds this link) |

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

Judged again after the correction stage, on the twelve 1× captures (`prototypes/station/img/pods-*.png`: unidentified, identifying, reading, six traits, sealed, eight chapters, hatch armed, Compare with one, two, four and six traits, the empty rack), against [Station screens](station-screens.md) (Pods), [Station layouts](station-layouts.md) (Pods), its wireframe and `prototypes/ui/specs/station/pods.json`; positions and colours read by pixel from the captures against the palette's names. The screen layer's and the Station's tests pass (55 of 55, run locally on e24391f).

**Placeholders.** Plainly placeholders now: the close-ups (no eye parts, no card, on the page's own pane; with the old part table some, Compare's tails, read as abstract blocks, which is a stand-in's honesty, not a toy), the sealed pod (a plain shell under a plain dark band), the seeds, the place squares, the hatch's slot and leaf, the rings, the emblems, the slats and the key, the stamp on its plain label. One tell remains, on the identified pod: the stem is drawn over the top rows of the species glyph, so the glyph is cut, and what is left, black on the bone cap under a green block, reads as a small face (on the Loika a fanged mouth, on the Belatz and the Untuva a little figure in a green hat). That drifts toward a toy and goes (failure 3).

**Passing now, from the earlier list:** the bench and the beam (flat, no dither, no rings, no wood or moss on the art layer); the close-ups without the eye parts and on the pane; the sealed pod's plain band; the read pictures' cream ground gone; the tabs' `frostS`; every digit the earlier pass listed; no plate at Identify or a read; the ribbon's cool look; Compare and the empty rack captured.

**Art direction failures, with the direction for each** (engineers do not make art: each is a plainer stand-in, not a master):

1. **The pod fills its box.** It does not yet: the drawing runs about 136 of 168 px (medium), 160 of 192 (large) and 114 of 144 (small), from about 8 px under the box's top to about 20 px above its foot, so it hovers over the cradle; its width now fills the box. The fitted canvas keeps the renderer's old head-room and foot-room (`podArt` with `fit`, `prototypes/station/src/art.mjs`: the scale is the box's height over the shell plus eight units). Direction: the stem's top on the box's top and the shell's foot on the box's foot at y 312, so the pod sits in the cradle's ring; the width by the species' proportion, as now; the place's dust on the cradle at the foot, not floating under the shell.
2. **The spotlight: the glow and the unread frost.** The glow is a still, flat stand-in, not motion: two or three stepped ellipses of the shell's own lighter ramp, centred low inside the shell, no dither and nothing spilled on the bench; it is what makes a sealed or cool-coloured pod the one warm thing (its breathing is the motion departure). The frost over unread pictures goes down to frosted glass over the pane: `frostS` with `frostD` texture at most, no `frost` and no `white` sparkle, so an unread page sits below the pod; the tabs' `frostS` stays.
3. **The cap.** The species glyph whole, centred on the cap below the stem with a clear pixel between them, and lit: on identification the dark band goes and the glyph shows in `cream` on the cap's own `slate` (no bone disc), so it reads as a mark lit on the shell, never a face.
4. **Words the build sets.** The hatch's arming plate says "Back to the ‹place›? ✓ again" (six words or fewer for every place), the bottom line keeping `✓ Again: return it · +1 ❀`. Until the copy owner's shorter trait lines land, a line cut at two lines drops a trailing separator rather than end on "·".

**Departures, accepted for this delivery.** Motion not built (the 200 ms lift and page turn, the glint, Compare's slide, the glow's breathing) and the trait names and lines with the copy owner (the proposal is `design/proposals/trait-names.md` on main) are acceptable as listed departures for this delivery, provided everything else holds. They are not why it fails.

**The shared need line's counts, decided by the UI designer** (the builder's derived rendering). Confirmed: the shared need line says a count of things in words: "a new pod waits", "three new pods wait", "two crates in the bay" (the rack holds six pods; past twelve, "many"). One correction: an amount beside a material icon is a price or a shortfall, the frame's exception, and stays in figures: "a Loika pod waits · needs 3 ◆", never "needs three ◆". The build's `inWords` (`prototypes/station/src/views/pods.mjs`) turns every number; it is to leave a number that stands before its icon. The rule carries to the shared line on every screen as each moves to the layer.

**The layout, confirmed by the UI designer.** Measured on the captures, as specified: the focused tab lifts 2 px (its top at y 46, the ring's top at y 42, clear of the top bar's rule at y 39); the unread tab fill `frostS` and a sealed tab's word in `mist`; the page pane `deep`; Compare's rows at y 56 and 248 on the page (pictures from y 168 and 360 on screen), with pictures 376×264, 184×256, 184×104 and 120×96 in their cells; Read's three- and four-trait picture 216×112 (the "only" base ends at y 272 on the 160 row) with the 32×40 seed; the difference as a 2 px `aqua` edge on the picture and the 12×12 bracket at (P.x + P.w / 2 − 6, P.y + 8), `aqua` on its `ink` keyline, no cream ring, and only on the traits that differ (with six traits Sheen and Feathers stay unmarked; the one-, two- and four-trait captures mark every trait because those sibling pods differ in each); the ribbon in the origin's rectangle; the empty rack, the empty cradle under the beam and nothing else on the stage, "the rack is empty" and "take the Companion exploring" (the other two lines asserted by the view's test); the subject naming the pod and its place, no well number. The pod's box is right; its drawing in the box is not (failure 1).

**Questions for the owner:** none. Each failure is settled by the direction given; the trait words by the copy owner.

**Delivery: not signed.** The art director would not put it in front of the owner yet, and the UI designer confirms the corrected geometry on screen except the pod's drawing in its box. It fails on: reads first (the pod short of its box and hovering, no glow, the near-white frost on an unread page); the room's one warm window (the glow); the cap's glyph reading as a face; and the arming plate's seven words. Motion and the trait words are accepted as listed departures and would not hold the delivery back once these four are fixed.

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
