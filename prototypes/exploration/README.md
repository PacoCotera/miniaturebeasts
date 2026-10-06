# Companion Field Test (exploration round 3, prototype round 6)

Builds exploration round 3 ([`design/proposals/exploration-round-3.md`](../../design/proposals/exploration-round-3.md), its build scope, with the owner's condition that warm stones stay scarce) on top of round 2 ([`exploration-round-2.md`](../../design/proposals/exploration-round-2.md)) and the four-button control scheme ([`companion-controls.md`](../../design/proposals/companion-controls.md)), on an honest simulation of the Companion screen: a fogged 16×20 world map, living places under a survey veil, the action clock, storms and fog banks, materials with a purpose, the Station stand-in, partners by life stage, and Cargo → Station → world turn.

## Controls

Four buttons. The bottom line always reads in three parts: **✓ what Confirm does** (at most 24 characters), the middle context (the only part that shrinks), and **← where Back goes** (at most 20 characters, never dropped). The HUD's top right always shows what **Call** will do, beside the Energy number.

| | Pad | Confirm (Enter/Space) | Back (Esc/Backspace) | Call (C) |
| --- | --- | --- | --- | --- |
| Expedition choice, start map | Move between choices / glints | Choose; "Start here" | Menu (on the start map: back to the choice) | Nothing; its slot is empty |
| Map | Tap one cell; hold to keep walking | Go down | Menu: Wait, Send home, Probe, Cargo, Companions | Pin this cell (1 Energy), or remove your own pin (free) |
| Place | Tap: creep one step. Hold: walk. Off the edge: onto the next map cell | Act on what you face; "Nothing here" and "Veiled · Call to see" spend nothing | Menu: Wait, Leave this place, Send home, Probe, Cargo, Companions | Call: survey and pulse (1 action) |
| Menu | Move focus | Run the entry; after Wait the menu stays open | Close | Nothing |
| Probe / Cargo / Companions | Move focus | Patch the shield / Send home / bring a mibi along | Close | Companions: calls the riding mibi to the front (free) |
| Station | – | Continue, hatch, upgrade, next expedition | Menu (on the upgrade offer: not now) | Nothing |

- New world is offered only between expeditions (last menu entry).
- One-time pointer messages: first map entry ("Walk with the pad · ✓ goes down · ← Wait and Send home"), first place ("A veil hides what is here · ))) Call lifts it around you"), first edge crossing ("Onto the next cell · ✓ goes down into it"), the storm's arrow on the map ("▶ · the yellow arrow · the storm moves this way"), first pod, first warm stone, hold full, the four creature bubbles, nothing left ("Everything in reach is explored · ← Send home").
- The menu shows no action count. Its Send home entry reads "Surveyed N of M in reach" on the bottom line.
- The depicted shell has Call directly above Back, both left of a larger Confirm. Call is teal with a ring texture.
- The bottom line sets its glyphs 1 px apart (still 2× pixels) so the three parts fit 450 px.
- One-time lines count as shown only if they are still in the message box when the action ends; one pushed out by a more urgent line comes back next time.

## The loop

1. Choose Weather (or Deep ground, with a digging partner), pick a start: the first time a glint, later any seen cell. A dotted square shows the Probe's range from that start; the dot grid in the HUD's top-left corner is the same square.
2. Walk the map. Each step lifts the fog one ring around you (not inside a fog bank). Go down into a place: it lies under a veil. Call to survey it, quarter by quarter, and gather what the survey shows.
3. Walk off the place's edge onto the next cell, Confirm, and survey that one. Each surveyed cell fills its dot.
4. Send home from the menu (Cargo shows "Surveyed N of M in reach" and what the Station will do), or the Probe breaks. The Station spends what you bring, then the world turns once.

## Survey

- **The veil.** Every place (not the cave under the cliff) starts veiled: the ground shows through, one step darker with a 4×4 dot pattern, so you can see where to walk. Features, creatures, pods, fruit, tufts and charge on a veiled tile are not drawn. Facing one, Confirm reads "Veiled · Call to see" and spends nothing; bumping into one says "Something is there under the veil · ))) Call to see". Landmarks show anyway: the narrow burrow, the cave exit, the pod on the island. Fruit you put down yourself stays visible. A creature that walks onto unveiled ground in sight shows.
- **Call lifts it** in a 15×15 square around you (7 tiles; 3 in a fog bank unless a glowtail partner is along), matching its ring. Walking never lifts it. Tiles no Call could reach (more than 7 tiles from any walkable tile, like the far side of fast water) don't count and show plainly.
- **Quarters.** A place has four quarters of 14×16 tiles. A quarter is surveyed when 90% of its surveyable tiles are unveiled; a cell is surveyed when all four are. The line names it: "rock field · half surveyed".
- **Call reports** how much is surveyed and what is still there to take: "Surveyed · 1 pod, 2 dew left", "Half surveyed · 2 fruit left", "Survey begun · Call further on · nothing to take yet". It never says "Nothing here". A pod still lying in the place glints again.
- **The overview** draws each visited cell in quarters of 13 px: dotted (night dither) while unsurveyed, whole once surveyed. Pips (up to 3) count what is left to take in the unveiled part: pods, charge, warm stones, full dew cups, bushes with fruit, fruit on the ground, tufts, unclimbed cairns. The tick and the word "cleared" are gone. A located pod is a pip; its beat sign goes.
- **The world turn** veils again what changed: the quarter of a stone that took fresh storm charge, the whole place where a new pod arrived. A surveyed place that was not changed stays surveyed across expeditions.

## Completion

- **The reach grid.** One dot per reachable cell in the range square (5×5 at tier 1, 9×9 at tier 2): hollow while unsurveyed, filled (mint) once surveyed, your cell framed in amber, no dot for cells you can't reach (water, cliff, the island).
- **"Everything in reach is explored · ← Send home"** fires as the last dot fills (after the Call that completes it).
- **Cargo** shows "Surveyed N of M in reach" with the same grid beside it.
- **Wait** says what changed: "The storm edges east · two hoppers wander", "The fog bank rolls in", "The puffcap finished its meal", "Dew gathers in a cup"; or "Nothing is moving here".
- **Headings.** Beside the HUD bolts, ◀ or ▶ shows which way the storm heads; when a fog bank is within two cells, a small fog patch with its own ◀ or ▶. No sun arc, no day-part.

## Place edges

- Walking off a place's edge steps onto the neighbouring map cell that way (one map action, so the clock, storm and sweep move), with the map in view and the pawn facing the way you walked. One Confirm goes down into it from the matching side. That is 2 presses per crossing, against 5 before (Back, down, Confirm, a map step, Confirm).
- Past the range edge, off the map, or onto cliff or wide water, the Probe stays in the place with the reason ("Edge of the Probe's range · tier 2 reaches further").
- "Leave this place" is still in the menu. There is no minimap.

## Materials

Every source is an act you choose. Each caps at 20 carried.

- **Energy**: draw a stone's charge. A storm charge gives +2 (+3 if struck at the storm's peak) and is drawn as a yellow zigzag with a cream ring. A **warm stone** gives +1 and is drawn with a dim dotted ring of rust and amber on the ground around its foot and a small amber glint, no zigzag, so it is never confused with a storm charge or with the strike warning (a whole yellow tile with a bolt). Spent in the field on pins (1) and shield patches (3 for one bar, on the Probe screen). Spent at the Station on identifying or logging a pod (1), hatching (2) and the tier 2 Probe (12). Prices are unchanged; Essence never converts to Energy.
- **Warm stones.** At each world turn, every stone without storm charge is warm with a 45% chance, re-rolled every turn (warmth never piles up and never exceeds 1). Drawing it spends that stone's warmth until the next world turn. Warm stones give no map sign; the survey finds them. No warm stones in the cave.
- **Data**: only from creature moments you cause: a creature eats your fruit, or a glowtail settles because you kept still. +1, or +2 the first time ever for that species and moment and for the first moment with each species on an expedition; once per creature per expedition.
- **Essence**: dew from a full cup (+1), pressing a fruit instead of feeding it (+2), the tuft a hopper leaves when it shakes dry (+1).

## Storm and Shield

- **Energy never stalls.** Every expedition starts with at least one Energy source in reach: a storm charge or a warm stone. If there is none, the sun warms the stone closest to a place's way in near the start. (The round-2 rule of two lit stones on the first expedition is gone; warm stones cover it. In the scripted runs the guarantee never had to act.) On the first expedition the storm still starts two columns further away.
- The band is 3 columns wide; rain falls under its core. While it is over you it crawls 0.14 columns per action (elsewhere 0.25), with lulls of 3 actions in every 12. The HUD shows 1–3 bolts and, beside them, the way it heads.
- **Stray strikes**: each action in the open under rain, 1 in 12 (strong) or 1 in 6 (peak); none in shelter or inside a fog bank. **Warned strikes** aim at stones (or open tiles near you, never your own tile), one action ahead. A struck stone under the veil stays hidden until a Call: only Call lifts the veil.
- Stones charge at the world turn where lightning really struck or under one flash in four (60% of the stones there, +2), and that quarter of the place is veiled again.
- **Shield**: 3 bars at tier 1, 4 at tier 2. At 0 the Probe breaks: pods are kept, carried Energy, Data and Essence are lost; the next expedition starts mended.

## Range, tiers and the map

| Tier | Range from start | Pods carried | Shield | Also |
| --- | --- | --- | --- | --- |
| 1 | 2 (5×5) | 2 | 3 | – |
| 2 | 4 (9×9) | 3 | 4 | Reads the deep "?" (once: a sealed pod rises) |

- **Cell states**: fog (cloud) · seen (muted through the fade table) · visited (full colour, in quarters, dotted until surveyed, with pips for what is left).
- **Five signs**: paw (tracks), beat (a pod not found yet), bolt (a storm-charged stone; warm stones give none), pin (yours), and a gate's own shape. Signs on surveyed cells and inside a fog bank are not drawn, except gates and pins.
- The map's line names the cell you're on, how much of it is surveyed, and the one you face ("meadow · half surveyed · Ahead: wood").
- **Survey cairn**: climbing it reveals land 3 cells around, beyond range; the fog lifts ring by ring from it.

## Call

- **In a place** (1 action): lifts the veil (see Survey). Hidden pods and charged or warm stones in the square glint and stay outlined until taken. Curious creatures show "?" and come closer; wary ones show "!" for one action, then hide or run. A settling glowtail is startled. Your partner comes; a digger near the burrow digs it.
- **On the map**: pins your cell for 1 Energy, or removes your own pin for free.
- **On the Companions screen**: the riding mibi hops to the front. Free.

## Creatures and feeding

- **Four bubbles**, one at a time, each explained once the first time it shows in view: **!** startled ("stop, or it runs"), **?** curious ("it will come closer"), **fruit** (a red fruit on blush: "it eats what you carry · offer it, or put it down and back off"), **…** settling, with four pips under the creature that fill as it settles ("keep still with ← Wait"). The fruit bubble shows on every eater in view while you carry fruit. The partner-calm tilde from round 2 is kept.
- **Diet before you offer.** Facing a creature you can see, the line names it and its diet: "Hopper · eats fruit", "Glowtail · doesn't eat fruit · settles when you keep still" (an unidentified species reads "Creature"). With fruit in hand, Confirm reads "Offer fruit" only for eaters; for a non-eater it reads "Doesn't eat fruit" (dimmed) and a press says so and spends nothing.
- A shaken bush says who eats its fruit: "A fruit drops · hoppers eat these", or "no one here eats fruit". Putting fruit down explains itself once ("Fruit down · eaters come when you back off").
- Creeping never startles a creature unless you step right next to it. A startled creature flees 3 tiles, never off-screen, then watches; after 3 quiet actions it goes back to its routine.

## Fog bank

Cover: creatures notice walking 2 tiles later and creeping never startles; hand-feeding a wary creature works; dew cups refill about every 3 actions; no stray strikes; the map sweep stops and signs are hidden. **Sight is 4 tiles** (6 with a glowtail partner): beyond it the land takes the fog table and nothing on it is drawn. The veil and the fog look different: the veil is darker with night dots, the fog is pale with drifting puffs. Call reaches 3 tiles inside. The fog bank drifts with the field clock.

## Station stand-in

After each expedition the Station identifies each pod (1 Energy; the first pod ever is free), reads waiting studies (2 Data each), hatches one founder of a species you don't raise yet (2 Energy + 4 Essence), and offers the tier 2 Probe at 12 Energy + 4 Data. Whatever it can't pay for waits and says what it needs. Then up to three world-turn lines and a large **Next expedition** button.

## Partners by life stage

New pods hatch as juveniles (ride in the Companion), grow up after 2 world turns (can come along), and become elders after 6 more (double calming and sniffing radius, feel every stray strike, slow). A glowtail digs the narrow burrow and glows (Call keeps its reach and sight widens to 6 tiles in a fog bank); a hopper calms wary creatures; a puffcap sniffs out buried pods and flinches before stray strikes.

## Screen and budget assumptions (as if targeting the ESP32-S3 Companion)

- **Frame.** Offscreen 450×600 at 1:1 device pixels, blitted to the page with `image-rendering: pixelated`. Integer coordinates only; no anti-aliasing, gradients, alpha blending or blur. The page snaps its scale to a whole number of physical pixels per device pixel when that costs ≤15% size.
- **Palette.** 48 colours, kept as data (`PALETTE`) at the top of the script and shown in the Observer. `__mb.offPalette()` confirms every pixel of the frame is a palette entry (checked this round on the map, a veiled and an unveiled place, the storm, a fog bank, the Station and Companions). Blending effects use only palette lookup tables (storm light, cave dim and dark, fog, the fade table for seen cells and old signs) and the ordered 4×4 Bayer dither (fog bank, warnings, dimmed menus, transitions, the survey veil, unsurveyed quarters on the map). No new tables were added this round.
- **Layout.** HUD 26 px, view 450×540, bottom line 34 px. The HUD holds, left to right: the reach grid (3 px dots at tier 1, 2 px at tier 2, 1 px gaps; 9×9 at tier 2 is the full 26 px), shield bars, pod outlines, the partner (its name drops when space runs out); then the fog heading, storm bolts and heading, Energy, the Call slot, and at the far right a 30 px status slot for battery and connectivity. Text is a 5×7 bitmap font at 2× minimum (14 px caps), 3× for headings; the bottom line sets glyphs 1 px apart.
- **Tiles.** Places are 28×32 tiles of 32×32 px; at most 16×19 tiles in view (≤304 tile blits per full redraw), autotiled by 4-bit masks with 2–4 variants and 2 water frames.
- **The veil.** One bit per tile, stored as 32 row words per place (128 bytes), plus a 4-bit quarter mask per map cell. A veiled tile is drawn from a variant of the same tile baked once per tile and light level (the DARK table plus a 4×4 Bayer dot of night), so it costs no extra blit and no per-pixel work per frame. Canopies and overhang roofs over veiled tiles use the same variant. Inside a fog bank, tiles beyond sight use the existing fog-table variant.
- **Map.** 16×20 cells of 26 px. Terrain, its storm-dark copy, its faded copy and the fog cloud layer are baked once per world (4 × 216 KB at 8 bpp, or redrawn from cell tiles). Per-frame overlays: fog cells, faded seen cells, a 13×13 dither sprite per unsurveyed quarter of a visited cell (at most 4 per cell), pips, signs, the storm band, the range square, pins, the pawn and the trail.
- **Benchmark** (headless Chromium, mean ms per call over 300 calls, seeds 7, 13, 42, against main): drawMap 2.11–2.38 main vs 2.22–2.30 here (and 2.41–2.45 vs 2.31–2.47 with visited cells); drawPatch 0.89–0.90 vs 0.91–1.00 in a veiled place, 0.92–1.21 vs 0.94–1.03 half surveyed, 0.93–1.02 vs 0.98–1.06 in a fog bank. All within 1.15× of main.
- **Sprites.** Tokens are 32×32; features ≤32×32; canopies 88×76; overhang roofs 104×22. Budget ≤40 sprites per frame. New this round: the fruit bubble (11×13), the warm stone (32×32, a ring of dots baked in), the battery and radio icons (15×9, 9×9). The veil hides sprites, so a veiled place draws fewer.
- **Redraw.** The browser redraws every animation frame; the device would redraw on input or action, with 110–170 ms slides at full rate and 2–4 Hz idle cycles using dirty rectangles. No per-pixel effects.
- **Motion.** Hold-to-walk starts after 230 ms and repeats every 150 ms. A shield hit gives a 260 ms 3 px shake and a 90 ms bright border; Call sends an expanding ring. With reduced motion: no shake, flash, slides or blinking.

## Faked or simplified

- The battery and connectivity icons at the far right of the HUD and top bars are **static placeholders** drawn in palette (a battery two-thirds full, two of three radio bars). They reserve the space; nothing measures anything.
- The HUD keeps Energy as its only material number (whether it should show all three materials is open for the owner).
- The Station is a stand-in: instant identification, hatching and studies, one page each. Names are automatic.
- The cave under the cliff has no veil (it has its own darkness and lighting).
- Warm stones are computed, not stored: a stone is warm when a seeded roll for that turn and stone says so, unless it holds storm charge or was drawn this turn.
- Wait's report looks at the creatures in view, the storm, the fog bank and dew cups; it says at most two creature changes.
- Abilities come from species, not traits. Creatures are procedural tokens. The island across the fast water can't be reached.
- Buried pods lie 3–6 tiles from where you first enter a place.
- `__mb.TEST.calm` (test hook only) starts expeditions without a storm, to measure calm expeditions; `__mb.TEST.warmP` overrides the warm odds.

## Measured with scripted play (seeds 7, 13, 42)

A bot plays through the real controls (`__mb.act`): it walks to the tile whose Call would unveil the most of the unsurveyed quarters, Calls, repeats until the place is surveyed, gathers, then walks off the edge toward the nearest unsurveyed cell. The **scout** takes pods and Energy; the **thorough** bot also takes dew, shakes bushes and presses the fruit, picks up tufts and climbs cairns.

- **Energy home per calm expedition** (no storm; 60 expeditions, five in a row per world, ending after 130–370 actions, median 235, about two places): mean 1.9, median 2, range 0–6; 11 of 60 brought none. About two thirds of it is warm stones, the rest charge left by earlier storms. At 30% warm odds the mean was 1.6; at 8% it was under 1.
- **With a storm stay** (Calls while sheltering, draws struck stones, banks at shield 1; 15 Weather expeditions): median 4.5 Energy home when sent (0–11); 3 of 15 broke.
- **Calls per place**: mean 6.5, median 6 (a well-placed player needs 4–5; up to 14 under a fog bank, where Call reaches 3 tiles). A place takes about 100 actions to survey and gather.
- **Cells fully surveyed per expedition**: about 2 (1–3) in 230–280 actions.
- **Actions until "Everything in reach is explored"** (one expedition run to the end): scout 1,797 (15 reachable cells), 2,097 (18) and 3,975 (25, with a fog bank on the way); thorough 2,113, 2,626, and not reached by 4,128 actions (seed 7, 20 of 25 cells). A whole tier-1 reach brings home 10–20 Energy.
- **Edge-walk presses per crossing**: 2 (step off, Confirm) in every crossing measured.
- **Wait**: on the map with no storm or fog near, "Nothing is moving here"; in a place with creatures it almost always names one moving.

## Known issues

- **Completing a reach takes far too long** (1,800–4,000 actions; see above). With 28×32 places and a 15×15 Call a place needs 5–7 Calls and about 100 actions, so in a normal expedition only one or two dots fill. The proposal's own remedy (places of about 20×24 tiles, 3–4 Calls) is generator work outside this round's scope; a smaller Call threshold or fewer quarters are the other levers. Needs an owner decision.
- Calm Energy is about 2 per expedition only because a survey is slow: it scales with places visited (about 1 per place). Smaller places would raise it unless the warm odds drop with them.
- A place stays surveyed across expeditions, so its warm stones show on arrival without a Call; revisiting surveyed places nearby is a cheap source of +1s.
- Lightning striking a veiled stone leaves it hidden until a Call (only Call lifts the veil), which can read as a strike that did nothing.
- The veil has hard tile edges, as the ground types do. At 1× the map's dotted quarters on dark ground (wood) are subtle.
- Seen meadow cells fade only from grass to a darker green. The map line rarely fits the cell you're on and the one ahead in full.
- Tablet scale factors that don't snap give slightly uneven pixel widths. Some browsers block clipboard access; "Copy playtest notes" then shows the notes selected in a text box.

## Persistence and tools

- Saves to localStorage with save format v6; older saves (v1–v5) are discarded on load. Works without storage. `?seed=N` sets the seed of the next New world; a saved world keeps playing until you choose New world.
- The Observer shows expedition, world turn, actions, location, partner and rider, Probe, carried and Station materials, map counts (visited, surveyed, seen, fog; in reach), **Survey** (the current cell's four quarter percentages, its Calls, and "Surveyed N of M in reach"), **Energy** (warm and storm-charged stones in reach, how many unveiled, and Energy drawn from warm stones this expedition), seed, the last 8 events and the palette, plus "Copy playtest notes".
- Test hooks: `window.__mb` (state, `lineFor`, `capture`, `offPalette`, `act`, `press`/`release`, `reachCounts`, `surveyed`, `quarterFracs`, `unveiled`, `leftCounts`, `pipsOf`, `stoneWarm`, `stormCharge`, `sightR`, `bubbleOf`, `crossReason`, `stormLevel`, `sendPreview`, `mapCounts`, `TEST` and others).
- The build stamp reads `../../build.json` (written by CI); a local copy shows "local build". One self-contained file with no build step.
