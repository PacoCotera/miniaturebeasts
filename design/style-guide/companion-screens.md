# Companion screens

450×600 portrait, judged at 1×. The shared rules are in the [style guide](README.md). Every screen here uses the same frame.

## The frame

- **HUD, 32 px, ink.** Left to right: reach grid; Shield plates; pod slots, with the crate count beside them; the partner's face on its teal ring. Then Energy, Data and Essence as 16 px icons with 2× numbers; Call's slot in teal when Call means something here; the world turn ("T7" with a small sun). At the far right, battery and radio.
- **View, 532 px.** One picture to act on. Margins 6–8 px.
- **Bottom line, 36 px, ink.** Three parts split by 1 px muted rules: `✓ verb · ← where` | the place and its survey (mist, the only part that shrinks) | conditions (1–3 bolts with ◀ or ▶, a fog patch with its drift). ✓ is an orange cap with the verb in orange, ← a grey cap. A read-only screen draws no ✓ cap.
- **Panels.** *Ink*: dark fill, a darker line, a lighter top bevel. *Paper*: warm cream, a brown line, a white top bevel, a darker foot. Radius 4 px; drop shadow from the dark table at (+2, +3).
- **Focus.** Orange corner brackets; the focused row or card lifts 2 px.

<table><tr><td valign="top"><img src="../../art/concept-homepage/companion-map-hands.png" width="440" alt="Map concept in hands"><br><em>companion-map-hands. Approved concept, generated. Take the HUD's weight and the bottom line's calm; its strings are not specs.</em></td></tr></table>

---

## Expedition choice

**Purpose.** Choose this expedition's kind. **Reads first:** the focused card and what it promises.

- **Composition.** "Expedition 4" at 3×, top left. Under it a quiet 2× strip: world turn, Probe tier, Shield. Two full-width paper cards (about 434×120), each with a 96 px round painted vignette at the left, the name at 3× and one 2× hint. A gated card dims through the fade table and shows what opens it (a digger's paw), never a bare lock. Below: the partner card, the mibi with you as a 64 px HiBit face on its teal ring, name and stage. At the foot: the whole-world inset and "Explored N of 320".
- **Lively / quiet.** Lively: the focused card's vignette (a bolt flickers, a burrow glints) and the partner's idle. Quiet: the strip, the inset, the other card.
- **Light and weather.** No weather on the screen. Each vignette carries its own, lit from the top left.
- **Palette.** Paper cards on ink. Vignettes use full ramps: blue and violet storm cloud, yellow bolt; warm soil and a dark mouth for the burrow.
- **Type.** 3× title and card names; 2× hints and strip.
- **Chrome.** Paper cards, orange brackets, ✓ `Choose Weather`, `← menu`. Call's slot is empty.
- **Motion.** Focus slides in 110 ms; vignettes 2 frames at 2–4 Hz.

**Pass when**
- [ ] The two kinds are told apart by their vignettes alone.
- [ ] A gated kind shows what opens it.
- [ ] The partner reads as that individual (volume, eyes, markings) at 64 px.
- [ ] Docked, Start reads "Lift to explore", dimmed, with the reason.
- [ ] No more than two type sizes in the view.

<img src="../../art/concept-homepage/companion-storm.png" width="200" alt="Storm concept">

*companion-storm: the storm light the Weather vignette carries. Approved concept, generated. No approved art for this screen yet.*

---

## Start map

**Purpose.** Pick where the expedition starts. **Reads first:** the glints, then the dotted range square around the focused cell.

- **Composition.** The whole map at 26 px a cell (416×520), centred. Unseen land under the cloud bank. The focused cell in orange brackets with the 5×5 range square dotted around it. Glints as four-point stars on good starts.
- **Lively / quiet.** Lively: glints twinkle, the focus moves. Quiet: cloud and land.
- **Light and weather.** Daylight from the top left. A storm already over the map shows as its diagonal rain sheet.
- **Palette.** Cloud in lavender-grey with a lit rim; land in its own ramps, seen cells through the fade table.
- **Type.** Nothing on the map. The bottom line names the cell: `✓ Start here · ← back | meadow · slow beat`.
- **Chrome.** Bottom line only; no panels over the map.
- **Motion.** Glints 2 frames at 2 Hz; the range square moves with the focus in one step.

**Pass when**
- [ ] The glints are the brightest things in the view.
- [ ] The range square reads as "this far" before any text.
- [ ] Cloud has volume and a lit rim; no flat grey slabs.
- [ ] Nothing is written on the map.
- [ ] The cell under focus is legible at 26 px: wood, meadow, rock, water.

<img src="../../art/concept-homepage/companion-map-hands.png" width="320" alt="Map concept">

*companion-map-hands: the cloud bank and lit rim the start map shares. Approved concept, generated.*

---

## Map (full)

**Purpose.** The whole world during an expedition, from the menu. **Reads first:** the pawn, then the start flag.

- **Composition.** 16×20 cells at 26 px. Cloud over unseen land: big heaps, lit on the side facing explored land, darker away from it. Seen cells faded. Visited cells in full colour, in quarters (dotted, nearly, whole). Signs at 16 px: paw, beat, bolt (hollow for a warm stone), pin, gate, outpost flame (big, medium, small, dark hut), beacon, skull, start flag. The pawn at 16 px with a 1 px dark silhouette. The range square dashed.
- **Lively / quiet.** Lively: the rain sheet, outpost flames, the pawn. Quiet: land and cloud.
- **Light and weather.** One diagonal rain sheet over the storm's columns; cells under it storm-dark, toward blue.
- **Palette.** As the reach view, at a smaller scale. Signs keep their colours: yellow bolt, teal pin, orange flag.
- **Type.** None on the map. The bottom line names your cell and the one ahead.
- **Chrome.** HUD and bottom line only.
- **Motion.** Rain drifts 1 px per action; flames 2 frames at 4 Hz; the pawn steps one cell in 110 ms.

**Pass when**
- [ ] The pawn and the flag are found in under a second.
- [ ] Fog, seen and visited are told apart without colour.
- [ ] Signs keep one silhouette at every size.
- [ ] The outpost's flame size reads at 16 px.
- [ ] No sign covers the pawn.

---

## Reach view

**Purpose.** Walk the Probe's reach. The default map in an expedition. **Reads first:** the pawn and the cell it faces.

- **Composition.** The 5×5 reach at 78 px a cell (390 px), centred; 9×9 at 48 px at tier 2. Only explored and seen cells show ground, cut from the place's real tiles. Everything else is one cloud bank of large heaps, lapping unevenly over the island's edge. A band below the reach: the flag with the way home and "Explored N of M in reach" at the left, the whole-world inset at the right.
- **Lively / quiet.** Lively: the rain sheet, the cloud's lit rim, the pawn, flames. Quiet: ground, band, inset.
- **Light and weather.** The island sits in a bright clearing; cloud lit on the side facing it, shaded below. Rain is one clean diagonal sheet of pale streaks with a straight soft edge, no cells drawn under it.
- **Palette.** Lavender-grey cloud from the violet and cool neutral ramps; ground in its own ramps; seen cells faded; unsurveyed quarters under the Bayer dot.
- **Type.** Nothing on the cells. The band in 2×.
- **Chrome.** Dashes frame the reach; orange brackets on the pawn's cell.
- **Motion.** Clouds drift 1 px per action; rain leans with the storm's heading; the pawn walks 3 frames.

**Pass when**
- [ ] Reads like the concept at arm's length: a lit island in soft, layered cloud.
- [ ] Signs are 24 px, large and simple, in corner slots; never over the pawn.
- [ ] The pawn is 48 px with a 2 px dark silhouette and reads on every ground.
- [ ] Only explored and seen cells show terrain.
- [ ] The cloud is built from drawn pieces, not circles.
- [ ] The inset and band never cover the reach.

<table><tr><td valign="top"><img src="../../art/concept-homepage/companion-map-hands.png" width="440" alt="Map concept"><br><em>companion-map-hands: the north star. Approved concept, generated. Its range square is 3×3; the reach is 5×5.</em></td>
<td valign="top"><img src="../proposals/ui-kit/companion-reach.png" width="300" alt="Reach view mock-up"><br><em>Reach view, 450×600 at 1×. Accepted as passable, to be refined.</em></td></tr></table>

---

## Place

**Purpose.** Act in a place: walk, gather, meet creatures. **Reads first:** the pawn and what it faces.

- **Composition.** 48 px tiles, about 9 across and 11 down. The camera keeps the pawn in the middle third. The partner on its teal ring with a name tag; creatures with their bubbles (`?` blue, `!` red, fruit, `…`). The message box at the foot of the view, or at the top when the pawn is in the lower third.
- **Lively / quiet.** Lively: creatures and their routines, water, flames, a charged stone's crackle, rain. Quiet: the ground and the veil.
- **Light and weather.** Daylight from the top left; trees cast shade down-right. **Storm:** every colour through the dark table toward blue, slanted rain with the storm's heading, a charged stone in blue-white crackle, a warned strike as a yellow tile outline only. **Fog bank:** colours washed toward pale bone, white puffs only over the fogged part, a soft round edge of sight. **Veil:** ground one step darker with night dots, a 16 px dithered edge. Cave: dark with a lantern circle. The pawn and mibis are never darkened.
- **Palette.** Grass, warm earth and cool stone ramps; storms go blue, never brown-grey; red only for danger and fruit.
- **Type.** Only the name tag and bubbles in the view; everything else in the message box and the bottom line.
- **Chrome.** Message box (paper), name tag (ink with a pointer).
- **Motion.** Idle 2 frames at 2 Hz; walk 3 frames, 150 ms a step; the Call ring 3 frames over 300 ms, its last contour held a moment; a hit is a 260 ms 3 px shake.

**Pass when**
- [ ] The pawn reads at once in sun, storm, fog and veil.
- [ ] Shelter reads as shelter: overhangs, caves, a lit outpost. A tree never looks like one.
- [ ] A charged stone, a warm stone and a warned strike are told apart at 1×.
- [ ] Fog reads as fog: pale and soft, not lavender.
- [ ] Creature tokens keep volume, eyes and markings at tile size.
- [ ] One clear light direction across tiles, sprites and shadows.

<table><tr><td valign="top"><img src="../../art/concept-homepage/companion-storm.png" width="300" alt="Storm concept"><br><em>companion-storm: the north star for a place. Approved concept, generated. Take the green, the rain, the crackle and the warned tile; not the tree as shelter.</em></td>
<td valign="top"><img src="../proposals/ui-kit/companion-place-storm.png" width="300" alt="Place mock-up"><br><em>Place in a storm, 450×600 at 1×. Accepted as passable, to be refined.</em></td></tr></table>

---

## Menu

**Purpose.** The field menu behind the ← key. **Reads first:** the focused entry.

- **Composition.** A paper card at the lower right, above the bottom line, about 260 px wide. Rows 40 px: a 16 px icon and a 2× label. A dimmed entry gives its reason in the bottom line ("Start · about 2 cells"). A rule before New world. The view stays visible behind, darkened through the dark table.
- **Lively / quiet.** Lively: the focused row only. Quiet: everything else; the world behind holds still.
- **Light and weather.** The view behind keeps its weather, one step darker. The card is lit from the top left like any object.
- **Palette.** Paper on a darkened view; orange for focus; dimmed rows through the fade table.
- **Type.** 2× labels; no title.
- **Chrome.** Paper card, focused row lifted in orange brackets. Bottom line: `✓ Wait one action · ← close`.
- **Motion.** The card rises in 110 ms; focus moves in one step. After Wait the menu stays open.

**Pass when**
- [ ] The focused entry is found without reading.
- [ ] The pawn stays visible behind the card.
- [ ] Each entry has its own icon shape.
- [ ] A dimmed entry says why, in the bottom line.
- [ ] One way out (← close).

<img src="../proposals/ui-kit/companion-place-storm.png" width="225" alt="Place mock-up">

*The view the menu darkens, never hides. Accepted as passable, to be refined. No approved art for the menu yet.*

---

## Message box

**Purpose.** One note that stays until the next action. **Reads first:** its first words.

- **Composition.** Paper, the view's width less 8 px margins, up to three 2× lines (about 80 px). At the foot of the view, or at the top when the pawn is low; never over the pawn's row.
- **Lively / quiet.** Quiet. It appears at once and waits.
- **Light and weather.** None; it is paper over the world.
- **Palette.** Brown body text on cream; the lead word in its role colour: red for a warning, orange for an action, teal for Call.
- **Type.** 2×, 22 px pitch. Key glyphs (✓ ← )))) drawn as the key caps in their colours.
- **Chrome.** Paper panel, drop shadow.
- **Motion.** None beyond appearing. Under reduced motion, the same.

**Pass when**
- [ ] Reads in one glance; three lines at most.
- [ ] Never covers the pawn or the thing being discussed.
- [ ] Never clips a word.
- [ ] The key it names is shown as that key.
- [ ] Play language, no numbers but prices.

<img src="../proposals/ui-kit/companion-place-storm.png" width="300" alt="Place mock-up with message box">

*Message box at the foot of a place. Accepted as passable, to be refined.*

---

## Cargo

**Purpose.** What the hold carries, what Head home will seal, and the bay. **Reads first:** the pods carried.

- **Composition.** "Cargo" at 3×. The hold: each pod as a 64 px HiBit shell in its place colour, with where it came from in 2× ("from a hole"); empty slots as outlines. The three counters with icons. The bay: three sealed crates side by side (about 120×96), each stamped with its expedition number and its contents as icons; an empty place is a dashed outline. At the foot: "Explored N of M · fully surveyed K" with the reach dot grid.
- **Lively / quiet.** Quiet. The pods glint once on opening.
- **Light and weather.** Indoors; no weather. Objects lit from the top left.
- **Palette.** Ink panel. Pod shells in place colours; crates in cool neutrals and teal with an orange seal tag.
- **Type.** 3× title; 2× everything else.
- **Chrome.** In the field `✓ Head home · ← close` where it is allowed; at home read-only, no ✓ cap.
- **Motion.** None but the glint, 2 frames.

**Pass when**
- [ ] Pods read as pods (rounded, ribbed, leaf mark) and their place colour shows.
- [ ] Sealed crates never read as spendable; the counters show only the hold.
- [ ] Three crate places, full or dashed.
- [ ] One way out.
- [ ] Every count is beside its icon.

<img src="../../art/concept-homepage/station-research-pod.png" width="320" alt="Pod concept">

*station-research-pod: the pod's shape and leaf mark, drawn here in HiBit. Approved concept, generated.*

---

## Probe legend

**Purpose.** The Probe's state and what the signs mean. **Reads first:** the Shield plates.

- **Composition.** The Probe drawn at about 160 px, top left; its Shield plates large beside it (24×40 each, three or four), the tier, and "Energy in reach: N". Below, the legend: one row per thing, its tile at 1× and one 2× line. Stones: plain, warm, charged, warned strike. Storm: 1–3 bolts with the exact odds. Fog bank. This is the only screen with exact odds.
- **Lively / quiet.** Lively: the charged stone's crackle and the warm stone's ring in the legend. Quiet: the rest.
- **Light and weather.** None on the screen; the tiles keep their own light.
- **Palette.** Ink panel; plates white when whole, an outline when gone; legend tiles in their field colours.
- **Type.** 2×; the Probe's name at 3×.
- **Chrome.** `✓ Patch a plate · 3 ⚡` (first press arms, second patches) when hurt; read-only otherwise.
- **Motion.** Legend tiles animate as in the field; a patched plate fills in 170 ms.

**Pass when**
- [ ] Shield state reads from the plates alone.
- [ ] Each legend tile is the same art as in the field.
- [ ] Odds appear here and nowhere else on screen.
- [ ] The arm-then-confirm state is visible.
- [ ] One way out.

<img src="../../art/concept-homepage/companion-storm.png" width="240" alt="Storm concept">

*companion-storm: the charged stone and the warned tile the legend shows. Approved concept, generated.*

---

## Companion mode / active mibi

**Purpose.** Be with the mibi with you. **Reads first:** the mibi.

- **Composition.** The mibi at 280×300 in HiBit, centred in the upper two thirds, on a soft painted ground (grass, clover, cream light) quieter than the mibi. Name at 3×, a stage chip, species and ability at 2×, one status line ("with you · joins the Probe"). Page dots below, the mibi with you ringed; ◀ ▶ when there are others.
- **Lively / quiet.** Lively: the mibi (idle, answering Call, the Spend time moment). Quiet: the ground and every label.
- **Light and weather.** Soft daylight from the top left; a contact shadow under the mibi. No weather.
- **Palette.** Greens and cream for the ground, two steps lower in contrast than the mibi.
- **Type.** 3× name; 2× the rest; no meters.
- **Chrome.** Call's slot reads `))) call Dot`. `✓ Spend time with Dot · ← Mibis`, or `✓ Walk with Dot · +1 ◆` once a world turn, undocked.
- **Motion.** Idle 2 frames at 2 Hz; Call: a hop to the front and a chirp; docked, the mibi sleeps and the line says "Lift to explore".

**Decided 2026-10-08 ([the portrait](../proposals/the-portrait.md) §5).** The Companion calls nothing; it learns at the dock. **The delivery notice:** when a portrait's crate lands while docked, the docked screen shows a message box, "**Fig's portrait** has come · see it at the Station", the name in orange; away, the notice waits for the next dock and joins the link sheet ("The Station has them · a portrait for Fig"). One notice per portrait, never repeated. At that dock the Companion takes Fig's painted set, derived to HiBit on the Station, if Fig is one it carries; the field token stays generic. **The card:** on a portrayed mibi this screen adds `✓ Show Fig's card`: the portrait card at 450×600, Fig's portrait in HiBit, its name and place, and the postmark large enough for a phone camera; the phone opens Fig's page on the website. A plain mibi has no card.

**Decided 2026-10-08 (the standard painting, [art pipeline](../proposals/art-pipeline.md) §1.1).** The 280×300 HiBit resident on this screen, the 48 px field token, the 64 px partner face and the HUD ring face are all **derived on the Station from the mibi's standard painting** (the cloud painting every mibi gets at Grow) and synced at the dock; nothing is painted at these sizes and the token is no longer generic per species. "The field token stays generic" above is superseded: a portrait's derived set replaces the standard set, token included. A mibi whose painting has not landed yet (grown offline) carries the **placeholder** set, the stylised rig pass at the same sizes, until the next dock after the painting lands; the species' generic token serves only a silhouette the Companion has no painting for (a wild creature in the field). The pass line "the same individual as at the Station" is then by construction.

**Pass when**
- [ ] The mibi is the same individual as at the Station: anatomy, markings, eyes.
- [ ] The ground never competes with the mibi.
- [ ] Stage reads from proportion, not only the chip.
- [ ] No needs or meters drawn.
- [ ] Draws only what is known.

<table><tr><td valign="top"><img src="../../art/concept-homepage/companion-resident-home-450x600.png" width="300" alt="Resident at home concept"><br><em>companion-resident-home, 450×600 at 1×. Approved concept, generated.</em></td>
<td valign="top"><img src="../../art/miniature-lives/exports/companion-resident.png" width="300" alt="Miniature Lives Companion"><br><em>The accepted HiBit Pip at 280×300. Accepted appearance reference (creature only).</em></td></tr></table>

---

## Send home (Head home)

The menu entry and screen read **Head home**: it seals the hold into the bay.

**Purpose.** End the expedition and seal the hold. **Reads first:** the outcome: Sealed, Bay full, Nothing explored, or The Probe broke.

- **Composition.** The outcome at 3×, top. The bay's three crates large across the middle; the new crate slides in and its seal stamps. Up to three world-turn lines at 2×, each with a small icon (a low flame, a moving storm). "2 consignments sealed · dock to transfer". A break shows the skull sign and the pods left behind.
- **Lively / quiet.** Lively once: the crate sliding in and the seal. Then quiet.
- **Light and weather.** Indoors; the crates lit from the top left.
- **Palette.** Ink panel; crates as on Cargo; the seal tag orange; a break in red with its skull.
- **Type.** 3× outcome; 2× lines.
- **Chrome.** `✓ Next expedition · ← menu`.
- **Motion.** The slide in 170 ms, the seal stamp in 110 ms; still under reduced motion.

**Pass when**
- [ ] The outcome reads from the picture before the words.
- [ ] Bay full shows the finds staying in the hold.
- [ ] Nothing suggests the cargo reached the Station.
- [ ] A break is plain, not punishing.
- [ ] One action, one way out.

*No approved art for this screen yet.*

---

## Station link states

**Purpose.** Show whether cargo is still aboard and whether the Station has it. **Reads first:** the crate count and the link mark.

- **Where.** The HUD's right slot (a link mark beside battery and radio), the expedition choice strip, the active mibi's bottom line, and a short docking sheet.
- **States.**
  - *Away:* a crate icon with its count; "2 sealed · dock to transfer".
  - *Docked, transferring:* the crates leave one by one toward a Station mark; "Transferring 2…". No progress bar.
  - *Docked, done:* the crates are gone, a ✓ beside the Station mark; "The Station has them · 3 pods".
  - *Docked, not answering:* the crates stay, the link mark broken; "Docked · the Station isn't answering · the bay stays sealed".
  - *Docked, idle:* the mibi with you asleep; "Lift to explore".
  - *Docked, a portrait waiting* (2026-10-08): the done line gains the notice, "The Station has them · a portrait for Fig", once per portrait.
- **Lively / quiet.** Lively only while crates move. Otherwise quiet.
- **Light and weather.** None.
- **Palette.** Teal for a live link, grey for none, orange seal tags; never colour alone.
- **Type.** 2×.
- **Chrome.** The sheet is ink, read-only, `← close`.
- **Motion.** One crate per 300 ms; the bay clears only after the Station confirms.

**Pass when**
- [ ] Each state has its own shape: crate count, moving crates, ✓, broken link, sleeping mibi.
- [ ] Sealed cargo never shows in the counters.
- [ ] Nothing claims a transfer before it is confirmed.
- [ ] Reads in four-gray.
- [ ] The Companion draws nothing of the Station's state beyond these.

*No approved art for these states yet.*
