# Companion Field Test (exploration round 3 + Companion mode, prototype round 7)

Builds exploration round 3 ([`design/proposals/exploration-round-3.md`](../../design/proposals/exploration-round-3.md), its build scope, with the owner's condition that warm stones stay scarce) on top of round 2 ([`exploration-round-2.md`](../../design/proposals/exploration-round-2.md)) and the four-button control scheme ([`companion-controls.md`](../../design/proposals/companion-controls.md)), and Companion mode ([`companion-mode.md`](../../design/proposals/companion-mode.md): one "with you" slot, the active mibi screen, Energy via the Probe, the ← key), on an honest simulation of the Companion screen: a fogged 16×20 world map, living places under a survey veil, the action clock, storms and fog banks, materials with a purpose, the Station stand-in, the mibi with you, and Cargo → Station → the Companion's home view → world turn.

## Controls

Four buttons. The bottom line always reads in three parts: **✓ what Confirm does** (at most 28 characters), the middle context (the only part that shrinks), and **← what the ← key does** (at most 20 characters, never dropped). The key is engraved with the ← glyph only ("Back" stays its internal name); the bottom line names what it opens on every screen by the menu's top entry: "← Leave" in a place ("← Climb out" in the cave), "← Send home" on the map, "← close" on screens. Wait is not on the ← label: ✓ waits when you face nothing, and Wait sits lower in the menu (after Leave and Send home). The first time in a place a line says "← opens the menu · Leave is first". A screen never offers two ways out: read-only screens (Probe without a patch to make, Cargo at home) leave the ✓ part empty. The middle carries the place and its survey state, with what is left named ("meadow · surveyed 2/4 · 3 to take: fruit · dew · tuft"; the list is cut on a narrow line, never the count), then the **conditions**: storm bolts (1–3) with the storm's heading ◀/▶, and the fog bank's patch with its drift, explained once on first sighting ("Bottom line: bolts are the storm · it moves ◀ west"). It drops the place name first and never drops below the survey words. **Call** has no slot in the top bar and no engraving on the shell (the teal button is told apart by colour and its ring texture); one-time lines explain it: "The teal CALL button pulses: it lifts the veil and finds things" the first time in a place, "CALL here drops a pin for 1 Energy" the first time on the map, and at 0 Energy a Call on the map says "Pins cost 1 Energy · you have 0".

| | Pad | Confirm (Enter/Space) | ← (Esc/Backspace) | Call (C) |
| --- | --- | --- | --- | --- |
| Expedition choice, start map | Move between choices / glints | Choose; "Start here" | Menu (on the start map: back to the choice) | Nothing; its slot is empty |
| Map | Tap one cell; hold to keep walking | Go down | "← Send home" on the start cell or a lit outpost, "← menu" elsewhere: the menu (Send home, dimmed away from a send point with "Start · about N cells", Wait, Probe, Cargo, Mibis) | Pin this cell (1 Energy), or remove your own pin (the Energy comes back if you pinned it this expedition) |
| Place | Tap: creep one step. Hold: walk. Off the edge: onto the next map cell | Act on what you face; facing nothing, **✓ Wait** (one action, the same as the menu's Wait); "Veiled · Call to see" spends nothing. A pod with a full hold opens the swap chooser | "← Leave": the menu (Leave this place, Send home, Wait, Probe, Cargo, Mibis) | Pulse: survey further (1 action) |
| Menu | Move focus | Run the entry; after Wait the menu stays open | Close | Nothing |
| Probe / Cargo | Move focus | Patch the shield (two presses: the first arms it) / Send home | Close | Nothing |
| Mibis (roster) | Move between mibis | "Take Moss" (one press; the previous one goes home, Moss's screen shows) / "Visit Dot" on the mibi with you | "← menu" | The mibi with you answers (free) |
| Active mibi (home view) | Left/right: the other mibis' screens | "Spend time with Dot" on the mibi with you; "Take Moss" on a mibi at home | "← Mibis" | The mibi with you answers; from another mibi's screen the view comes back to it first (free) |
| Station | – | Continue, hatch, upgrade, Done (to the home view) | Menu (on the upgrade offer: not now, to the home view) | Nothing |

- New world is offered only between expeditions (last menu entry).
- **Edges and messages.** A held walk stops on a place's edge tile ("Edge of the place · tap again to step off"); stepping off needs a fresh tap. The message box never clips words: notes that don't fit in two lines wait for the next action, and one long note may take three lines.
- One-time pointer messages: first map entry ("Walk with the pad · ✓ goes down · the flag is your start: send home from there"), first place ("The veil lifts as you walk · Call sweeps further"), first edge crossing ("Onto the next cell · ✓ goes down into it"), the storm's arrow on the map ("▶ · the yellow arrow · the storm moves this way"), first pod, first warm stone, hold full, the four creature bubbles, nothing left ("Everything in reach is explored · ← Send home").
- The menu keeps the same rows everywhere: on the map the Leave row shows dimmed ("Leave · in a place") and focus skips it. The tier 2 upgrade also takes two presses.
- The menu shows no action count. Its Send home entry reads "Explored N of M in reach" on the bottom line.
- The depicted shell has Call directly above the ← key (engraved ← only; Call has no engraving), both left of a larger Confirm. Call is teal with a ring texture.
- The bottom line sets its glyphs 1 px apart (still 2× pixels) so the three parts fit 450 px.
- One-time lines count as shown only if they are still in the message box when the action ends; one pushed out by a more urgent line comes back next time.

## The loop

1. Choose Weather (or Deep ground, with a digging partner), pick a start: the first time a glint, later any seen cell. A dotted square shows the Probe's range from that start; the dot grid in the HUD's top-left corner is the same square.
2. Walk the map. Each step lifts the fog one ring around you (not inside a fog bank). Go down into a place: it lies under a veil, which lifts a little around you as you walk. Call to survey it further, quarter by quarter, and gather what the survey shows.
3. Walk off the place's edge onto the next cell, Confirm, and survey that one. Each place you Call in fills its dot.
4. Head back and send home: **Send home works only on the expedition's start cell (a flag on the map) or on a lit outpost.** Elsewhere the menu's Send home is dimmed and the line names the nearest send point ("Start · about 2 cells", or "Outpost · about 1 cell" when one is nearer); Hold full and Everything explored say "head back to the start (about N cells)". Cargo shows "Explored N of M · fully surveyed K" and what the Station will do. If the Probe breaks instead, nothing goes home (see Storm and Shield). The Station spends what you bring, then the world turns once.

## Survey

- **The Call ring is the unveil.** A Call sends a ring that spreads over 300 ms; the veil lifts behind it as it passes, and its final contour (held a moment, dotted) is exactly the Call's range: a round 11 tiles (6 in a fog bank unless a glowtail partner is along). Hidden finds count only inside that circle. Just outside the ring, a veiled sliver up to 3 tiles deep with unveiled land right behind it (outward) lifts too, so a Call closes thin gaps against land already seen. Survey pace (a player walking a serpentine through the place, rows 8 tiles apart, then Calling where it lifts most): 33 of 33 places fully surveyed with at most 6 Calls, 3–5 each, mostly 4 (seeds 7, 13, 42). "Surveyed" still means 0 veiled tiles (re-checked: 6 places, 0 failures).

- **The veil.** Every place (not the cave under the cliff) starts veiled: the ground shows through, one step darker with a 4×4 dot pattern, so you can see where to walk. Creatures always show (in sight); features, pods, drops (fruit, tufts) and stones on a veiled tile are not drawn. Facing one, Confirm reads "Veiled · Call to see" and spends nothing; bumping into one says "Something is there under the veil · ))) Call to see". Landmarks show anyway: the narrow burrow, the cave exit, the pod on the island. Fruit you put down yourself stays visible.
- **Call lifts it** in a round 11 tiles around you (6 in a fog bank), the ring's own edge. **Walking lifts it too**, in a circle of 4 tiles around the pawn (like the cave light), spreading only through open ground: it lifts the first shore, trunk or cliff tile it meets but nothing behind it, at every step and on arrival; whatever is lifted stays lifted. Quarters and "fully surveyed" count walked tiles, so walking a place thoroughly can survey it; "explored" (the reach dot) still needs one Call there. A Call that adds nothing new reads "· walk or Call further on". Walking does not dig up buried pods or make creatures react: that is still Call's. Lightning striking a veiled stone lifts the 3×3 around it. Tiles no Call could reach (more than 7 tiles from any tile you can stand on) don't count and show plainly.
- **Quarters.** A place has four quarters of 14×16 tiles. A quarter is **surveyed** only when every tile in it that a Call could reach is unveiled, so the words never run ahead of the picture; the overview draws a quarter that is 75% or more unveiled with a lighter "almost" dot tint, and the Call tally names what is left ("3/4 surveyed · a corner north-east still veiled"). Checked by script: on 31 places across seeds 3, 5, 7, 13 and 42 (a bot surveying to 100%), every time the line or the tally said "surveyed" the place had 0 veiled tiles. A cell counts as **explored** (its reach dot fills) once it is visited and at least one Call was made inside it; the overview still draws all four quarters, so a partial and a full survey stay visible. The bottom line names it in words a child reads, one step brighter than the rest of the middle: "rock field · surveyed 2/4 · 3 to take" while things remain, "rock field · surveyed · nothing to take" when done, "rock field · not surveyed" before any quarter is. Walking alone never hears what is buried: a place surveyed by walking reads "surveyed · Call to hear below" until a Call is made there, and a place counts as finished ("nothing to take", the one-press "← Leave", its slow beat hidden on the map) only after a Call there and with no pod still buried.
- **Call reports** how much is surveyed and what is still there to take, each kind with the way to its nearest one ("Half surveyed · a pod east, a warm stone north-west"); announced pods keep the dotted outline until taken. Earlier examples: "Surveyed · 1 pod, 2 dew left", "Half surveyed · 2 fruit", "Survey begun · Call further on · nothing to take yet". It never says "Nothing here". A pod still lying in the place glints again.
- **The overview** draws each visited cell in quarters of 13 px: dotted (night dither) while a quarter is under 75% unveiled, a lighter "almost" dot tint from 75% until every tile is unveiled, whole once surveyed. It marks only what is worth coming back for: a pod you saw and left behind shows the pod sign, a found charged stone the bolt, a found warm stone the hollow bolt. Fruit, dew, tufts and unlit beacons never mark the map (no pips); the Call tally, Cargo and the map line still count them ("Ahead: wood · 3 to take"). The trail is not drawn; the start shows a flag, and a skull marks where the Probe broke until you go back.
- **The world turn** veils again what changed: the quarter of a stone that took fresh storm charge, the whole place where a new pod arrived (its reach dot empties: it needs a Call again). A surveyed place that was not changed stays surveyed across expeditions.

## Completion

- **The reach grid.** One dot per reachable cell in the range square (5×5 at tier 1, 9×9 at tier 2): hollow until explored, filled (mint) once you have been in the place and Called there, your cell framed in amber, no dot for cells you can't reach (water, cliff, the island).
- **Completion is unmistakable.** As the last reachable cell is explored (after the Call that completes it; gated cells don't count), the message box leads with "Everything in reach is explored · ← Send home" (plus "· 1 cave needs a digger" when a gated cell remains) until the next action; the HUD reach grid turns bright (white dots in a mint frame) and gains a small mint tick that stays; the menu opens on Send home (its top entry on the map) for the rest of the expedition; Cargo's totals read "Explored 21 of 21 ✓". Checked by script on seed 13 (18 of 18) and seed 7 with the cave gated (19 of 19 · 1 gated).
- **Cargo** shows "Explored N of M · fully surveyed K" with the same grid beside it; the menu's Send home entry reads "Explored N of M in reach".
- **Wait** (the menu's, or ✓ facing nothing in a place) visibly passes time: a pale dithered band sweeps down the view for about 200 ms (palette only; none under reduced motion), the storm and fog move a step, and if no creature in sight moved, one idle creature takes a visible routine step (toward you when it can). The line says what changed: "The storm edges east · two hoppers wander", "The fog bank rolls in", "The puffcap finished its meal", "Dew gathers in a cup"; or "Nothing is moving here · ← Leave" in a place ("· ← Send home" on the map). In the menu the strip stays: ✓ waits again.
- **Conditions** on the bottom line, after the place words: 1–3 bolts with ◀ or ▶ for the storm's heading; when a fog bank is within two cells, a small fog patch with its own ◀ or ▶. No sun arc, no day-part.
- **Pending and gated cells.** On the map each unexplored cell in reach has a faint dotted outline (fog colour, 1 px, blinking slowly; steady under reduced motion). A **gated** cell (the cell above the cave under the cliff while its burrow is closed, no digger is your partner, and the cave still holds a pod) shows only its gate sign, the reach grid draws it as a hollow dot with a notch, and it is left out of the count: "Explored 8 of 8 · 1 gated". Facing it the line says "Ahead: cave · needs a digger". "Everything in reach is explored · 1 cave needs a digger · ← Send home" fires when only gated cells remain.

## Place edges

- Walking off a place's edge steps onto the neighbouring map cell that way (one map action, so the clock, storm and sweep move), with the map in view and the pawn facing the way you walked. One Confirm goes down into it from the matching side. That is 2 presses per crossing, against 5 before (Back, down, Confirm, a map step, Confirm).
- Past the range edge, off the map, or onto cliff or wide water, the Probe stays in the place with the reason ("Edge of the Probe's range · tier 2 reaches further").
- "Leave this place" is still in the menu. There is no minimap.

## Materials

Every source is an act you choose. Each caps at 20 carried.

- **Energy**: draw a stone's charge. A storm charge gives +2 (+3 if struck at the storm's peak) and is drawn as a yellow zigzag with a cream ring. A **warm stone** gives +1 and is drawn with a 2 px amber and yellow ring on the ground around its foot and a small glint, blinking slowly until you have been within 3 tiles of it, no zigzag, so it is never confused with a storm charge or with the strike warning (a whole yellow tile with a bolt). Spent in the field on pins (1) and shield patches (3 for one bar, on the Probe screen). Spent at the Station on identifying or logging a pod (1), hatching (2) and the tier 2 Probe (12). Prices are unchanged; Essence never converts to Energy.
- **Warm stones.** At each world turn the sun warms 3 to 5 stones in the Probe's reach (seeded, chosen among stones without storm charge when the expedition sets out, leaning toward cells near the start), never more than +1 each and never piling up from turn to turn. The 3×3 around each warm stone is veiled again, so a surveyed place doesn't show it on arrival: a Call finds it. Drawing it spends that stone's warmth until the next world turn. Warmth never arrives in a place you entered on the expedition that just ended (new things arrive away from where you just were), and the start guarantee skips those places too, so Send home can't be spammed for Energy. A found warm stone gets the hollow bolt on the map. No warm stones in the cave.
- **Data**: only from creature moments you cause: a creature eats your fruit, or a glowtail settles because you kept still. +1, or +2 the first time ever for that species and moment and for the first moment with each species on an expedition; once per creature per expedition.
- **Essence**: dew from a full cup (+1), pressing a fruit instead of feeding it (+2), the tuft a hopper leaves when it shakes dry (+1).

## Storm and Shield

- **Energy never stalls.** Every expedition starts with at least one Energy source in reach: a storm charge or a warm stone. If there is none, the sun warms the stone closest to a place's way in near the start. (The round-2 rule of two lit stones on the first expedition is gone; warm stones cover it. In the scripted runs the guarantee never had to act.) On the first expedition the storm still starts two columns further away.
- The band is 3 columns wide; rain falls under its core. While it is over you it crawls 0.2 columns per action (a pass of rain over you lasts about 15 actions, never more than 20) (elsewhere 0.25), with lulls of 3 actions in every 12. The HUD shows 1–3 bolts and, beside them, the way it heads.
- **Stray strikes**: each action in the open under rain, 1 in 20 (strong) or 1 in 10 (peak); none in shelter or inside a fog bank, none within 6 actions of any hit, and none before the first warned strike of each pass over you lands (the first hit of a pass is always one you could see coming). **Warned strikes** aim at stones (or open tiles near you, never your own tile), one action ahead. A strike on a veiled stone lifts the veil 3×3 around it, so its fresh charge shows. A stone takes charge at most once per storm pass over the place and isn't aimed at again during it. A stray strike says so as it lands ("A stray strike hit the Probe · Shield 2/3", with the shake and flash) and stops a held walk.
- Stones charge at the world turn where lightning really struck or under one flash in four (60% of the stones there, +2), and that quarter of the place is veiled again.
- **Shield**: 3 bars at tier 1, 4 at tier 2. At 0 the Probe breaks and the expedition ends, and nothing goes home: the pods you carried fall at random free spots in the place where it broke (or the place of the map cell you stood on), carried Energy, Data and Essence are lost, and that cell gets a **skull** on the overview; going down into that cell again clears the skull, and the pods lie there to be picked up (the Observer's events log both); a break is mended free. Otherwise the Station mends the Shield on arrival: up to 2 bars for free, then **1 Energy a bar** from its store ("Shield mended · 1 bar free · −1 Energy" on Cargo arrives) the next expedition starts with what was mended. The Send home preview states it.

## Range, tiers and the map

- **The reach view.** During an expedition the map shows only the Probe's reach: 5×5 cells at 3× (78 px cells) at tier 1, 9×9 at 2× (52 px, cropped 9 px each side) at tier 2. It is the same map drawing, scaled by whole pixels, so quarters, signs, pending outlines, gates, the start flag, skulls, outposts and beacons all read at that size; the reach square's dashes frame it. Below it (tier 1): the flag with the way home ("Start · about 2 cells", or "Send home here"), "Explored N of M in reach", and a 96×120 inset of the whole world at 6 px a cell (fog dark, seen cells faded, visited cells in colour, the reach in amber, the Probe blinking, pins, outposts and skulls as dots, the storm's edges in mist); at tier 2 the inset sits over the view's bottom-right corner. Walking off the reach, edge crossings, Call pins and the way-home hint work as before.
- **Full map** (a menu entry on the map) shows the whole 16×20 map at 26 px as its own screen; ← closes it. Picking a start still uses the whole map, and a beacon's sweep shows on the whole map.
- **Cost:** drawMap mean 2.13–2.34 ms per call; the reach view (drawMap plus one scaled blit plus the inset) 2.88–2.91 ms (seeds 7, 13, 42; within 1.4×).

| Tier | Range from start | Pods carried | Shield | Also |
| --- | --- | --- | --- | --- |
| 1 | 2 (5×5) | 2 | 3 | – |
| 2 | 4 (9×9) | 3 | 4 | Reads the deep "?" (once: a sealed pod rises) |

- **Cell states**: fog (cloud) · seen (muted through the fade table) · visited (full colour, in quarters: dotted, "almost", or whole).
- **Five signs**: paw (tracks), beat (a pod not found yet), bolt (a storm-charged stone; hollow for a warm stone a Call has found), pin (yours), and a gate's own shape. Signs on surveyed cells and inside a fog bank are not drawn, except gates, pins and found Energy. The sweep alone never shows a warm stone: only a Call finds one.
- The map's line names the cell you're on, how much of it is surveyed, and the one you face ("meadow · half surveyed · Ahead: wood").
- **Slabs** spawn only where some push works (a free tile beyond, a reachable tile to stand on opposite) and water or cliff touches at most one side; the generator moves any that fail to the nearest spot that passes.
- **Beacon** (was the survey cairn; at least 3 cells apart, never side by side: checked on seeds 1–12, 0 pairs within 2 cells): a stone post with a lamp cage, dark until lit. "✓ Light the beacon · 1 Energy" (at 0 Energy it dims and says why) reveals land 3 cells around, beyond range; the map shows the fog lifting ring by ring, then (after the sweep, or at any press) you are back exactly where you stood, facing it. The log says "Lit the beacon · −1 Energy · N cells". Lit, it burns with a 2-frame flame in the place and shows a lit-beacon sign on the overview for good.

## Call

- **In a place** (1 action): lifts the veil in a round 11 tiles around you, as its ring spreads (see Survey). Hidden pods and charged or warm stones in the square glint and stay outlined until taken. Curious creatures show "?" and come closer; wary ones show "!" for one action, then hide or run. A settling glowtail is startled. Your partner comes; a digger near the burrow digs it.
- **On the map**: pins your cell for 1 Energy, or removes your own pin for free.
- **At home** (Mibis and the active mibi screen): the mibi with you hops to the front and chirps; a juvenile looks the wrong way first on two calls in three. Free.
- **Finding Energy.** A Call that leaves any charge or warm stone showing in the place leads its tally with it: "Energy nearby · a warm stone north · Half surveyed". The stone's map cell keeps a bolt until it is drawn, surveyed or not: solid for storm charge, hollow (yellow rim, dark inside, a little fatter) for a warm stone. The Probe screen reads "Energy in reach: N" (Energy in found, undrawn stones in the reach).

## Creatures and feeding

- **Four bubbles**, one at a time, each explained once the first time it shows in view: **!** startled ("stop, or it runs"), **?** curious ("it will come closer"), **fruit** (a red fruit on blush: "it eats what you carry · offer it, or put it down and back off"), **…** settling, with four pips under the creature that fill as it settles ("keep still with ✓ Wait"). The fruit bubble shows on every eater of an identified species in view while you carry fruit. The partner-calm tilde from round 2 is kept.
- **Diet before you offer.** Facing a creature of a species you have identified, the line names it and its diet: "Hopper · eats fruit", "Glowtail · doesn't eat fruit · settles when you keep still". An unidentified creature reads "Unknown creature · watch what it does", and Confirm reads only "Unknown creature" (dimmed, nothing offered), whatever it eats. The fruit bubble shows only on eaters of identified species. For an identified eater with fruit in hand, Confirm reads "Offer fruit"; for an identified non-eater "Doesn't eat fruit" (dimmed), and a press names only identified eaters ("Glowtails don't eat fruit · hoppers do") and spends nothing.
- A shaken bush names only identified eaters you can see: "A fruit drops · hoppers eat these"; "no one here eats fruit" when every creature in sight is identified and none eats it; otherwise "watch who comes for it". Hidden creatures and those beyond fog sight don't count. Putting fruit down explains itself once ("Fruit down · eaters come when you back off").
- Creeping never startles a creature unless you step right next to it. A startled creature flees 3 tiles, never off-screen, then watches; after 3 quiet actions it goes back to its routine.

## Fog bank

Cover: creatures notice walking 2 tiles later and creeping never startles; hand-feeding a wary creature works; dew cups refill about every 3 actions; no stray strikes; the map sweep stops and signs are hidden. **Sight is 4 tiles** (6 with a glowtail partner): beyond it the land takes the fog table and nothing on it is drawn. The veil and the fog look different: the veil is darker with night dots, the fog is washed out to pale, low-contrast colours (the fog table now mixes 62% toward bone) with gentle white puffs drifting over the fogged part only, never over what you see. The edge of sight is soft: each seen tile beside fogged ones fades into the fog table over a whole tile with the 4×4 Bayer dither, from cached edge variants (the cave light's method), so the boundary reads round-ish. Rain stays visible. Call reaches 6 tiles inside. The fog bank drifts with the field clock.

## Station stand-in

After each expedition the Station identifies each pod (1 Energy; the first pod ever is free), reads waiting studies (2 Data each), hatches one founder of a species you don't raise yet (2 Energy + 4 Essence), and offers the tier 2 Probe at 12 Energy + 4 Data. Whatever it can't pay for waits and says the full price and what is short ("costs 2 Energy + 4 Essence · short 2 Essence", "logging costs 1 Energy · short 1 Energy"); a second pod of a species already waiting to hatch says "one hopper pod hatches first" ("already raised" only when you really raise that species). Before anything else it mends the Shield (1 Energy a bar, see Storm and Shield). Then up to three world-turn lines and a large **Done** button to the Companion's home view.

## Outposts

- **Outposts** (the name is one constant, `DEPOT_NAME`, so it can change): about six per world, never two in one 5×5 area (seeds 1–12: 6 each, none closer than 5 cells), a small hut with a mast lamp in a place. Found like any find (walking or Call); the map then shows an outpost sign, dark until lit.
- **"✓ Light the outpost · 1 Energy"**, lit for good (the lamp glows; the map sign lights). A lit outpost offers: **Send home** from its cell (in the place or on the map cell), **Shield mending at 1 Energy a bar** ("✓ Mend a bar · 1 Energy", two presses), and **shelter**: no stray strikes while you stand within 3 tiles of it in its place (checked: 0 stray hits in 49 rain actions standing by it). It reveals no land; that is the beacon's job.
- **The trail is no longer drawn** on the map (its data stays for the world-turn guard and the mibi's memory); the start flag, outposts and the line's hint show the way back.

## The mibi with you

- **One slot.** Exactly one mibi is **with you** in the Companion; everyone else is **at home**. Grown (adult or elder), it is also the expedition partner. A juvenile with you comes along in the Companion but is no partner: the expedition screen's partner row reads "Dot is with you · too young for the Probe". Grown, it becomes the partner with no press ("Dot is grown · your Probe partner now").
- **Choosing is one press**: ✓ "Take Moss" on Mibis, on Moss's own screen, or on the expedition screen's partner row ("Take Moss instead", cycling through grown mibis at home). The message says "Dot stays home · Moss is with you". Deep ground with a digger at home reads "Take Fig · go deep": one press takes it and goes.
- **Edge cases.** No mibis: an empty pod outline, "No mibi yet · Bring a pod home, it hatches at the Station", Call's slot empty, ✓ Next expedition. A hatch takes the slot only when no one is with you; otherwise it waits at home. Mid-expedition the roster is read-only ("Moss is with you until you're home"). The slot is saved and carries across expeditions and world turns.
- **The active mibi screen** (the Companion's home view, after the Station's ✓ Done, or ✓ Visit on Mibis): the token art at 8× (256×256, pixel for pixel) on a stage, a slow two-frame idle (still under reduced motion), name, stage chip, species and ability, and the status ("with you · joins the Probe", "with you · too young for the Probe (1 world turn)", "at home · grown this turn"). Page dots below (the mibi with you ringed in amber); ◀ ▶ when there are others. No needs, meters or mood until bonding and care exist (the slot is left empty).
- **Spend time** is action-less and gives nothing: a short species moment (a hopper leans on the glass, paw marks; a glowtail glows, dithered halo and sparks; a puffcap puffs) and one line from its last expedition ("Moss remembers the meadow", the land it saw most), or "hasn't been out yet".

## Pods and the swap

- With a full hold, Confirm on a pod ("✓ Swap the pod") opens a two-line chooser over the bottom line: **Hold** lists each pod you carry (shell, "Hopper pod" if its species is identified or "Unknown pod", and where it came from: "from a hole", "under rain", "under a slab", "cave", "shed, shaking dry", …), the one to leave framed; **Ground** names the pod you face. Pad left/right picks, ✓ "Swap for Hopper", ← keeps. Nothing is spent until you swap.
- After the swap the dropped pod lies there with its dotted outline, the HUD slot flashes with the new shell, and the line says "Swapped · Hopper pod left here".

## The partner in a place

- Your partner stands on a 2 px bright teal ring with a 1 px dark outline (wild creatures never have one) and shows a small name tag above it, with a pointer down to it, for the first 3 actions in each place and for 3 actions after each Call. The tag is drawn after every sprite and moves sideways off the player if it would cover them. The HUD token sits on the same ring.

## Partners by life stage

New pods hatch as juveniles (with you in the Companion if the slot is free, too young for the Probe), grow up after 2 world turns counted from the turn after they hatch, so the hatch card and the mibi screen both say "2 world turns" (can be your partner), and become elders after 6 more (double calming and sniffing radius, feel every stray strike, slow). A glowtail digs the narrow burrow and glows (Call keeps its reach and sight widens to 6 tiles in a fog bank); a hopper calms wary creatures; a puffcap sniffs out buried pods and flinches before stray strikes.

## Screen and budget assumptions (as if targeting the ESP32-S3 Companion)

- **Frame.** Offscreen 450×600 at 1:1 device pixels, blitted to the page with `image-rendering: pixelated`. Integer coordinates only; no anti-aliasing, gradients, alpha blending or blur. The page snaps its scale to a whole number of physical pixels per device pixel when that costs ≤15% size.
- **Palette.** 48 colours, kept as data (`PALETTE`) at the top of the script and shown in the Observer. `__mb.offPalette()` confirms every pixel of the frame is a palette entry (checked this round on the map, a veiled and an unveiled place, the storm, a fog bank, the Station, the Mibis roster, the active mibi screen and the Probe screen). Blending effects use only palette lookup tables (storm light, cave dim and dark, fog, the fade table for seen cells and old signs) and the ordered 4×4 Bayer dither (fog bank, warnings, dimmed menus, transitions, the survey veil, unsurveyed quarters on the map). No new tables were added this round.
- **Layout.** HUD 26 px, view 450×540, bottom line 34 px. The HUD holds, left to right: the reach grid (3 px dots at tier 1, 2 px at tier 2, 1 px gaps; 9×9 at tier 2 is the full 26 px), shield bars, pod outlines, the partner token on a 2 px teal ring (its name drops when space runs out), each group 2 px apart, the reach grid in a 1 px frame, shield bars with a 1 px dark outline, empty pod outlines one step brighter; then the three material counters (Energy, Data, Essence: icon and number; a gain counts up one per 90 ms with a 260 ms amber flash on that counter, a spend drops at once), and at the far right a 30 px status slot for battery and connectivity. Text is a 5×7 bitmap font at 2× minimum (14 px caps), 3× for headings; the bottom line sets glyphs 1 px apart.
- **Tiles.** Places are 28×32 tiles of 32×32 px; at most 16×19 tiles in view (≤304 tile blits per full redraw), autotiled by 4-bit masks with 2–4 variants and 2 water frames.
- **The veil.** One bit per tile, stored as 32 row words per place (128 bytes), plus a 4-bit quarter mask per map cell. A veiled tile is drawn from a variant of the same tile baked once per tile and light level (the DARK table plus a 4×4 Bayer dot of night), so it costs no extra blit and no per-pixel work per frame. Canopies and overhang roofs over veiled tiles use the same variant. Inside a fog bank, tiles beyond sight use the existing fog-table variant. Where an unveiled tile meets veiled ones, it fades into the veil's dots over 16 px at the shared sides and corners: a pre-dithered edge variant chosen from an 8-bit side/corner mask, built on first use and cached (the cave light's method; unveiled bits are read once per tile per frame). The walk lift is a 7×7 OR into the row words per step.
- **Map.** 16×20 cells of 26 px. Terrain, its storm-dark copy, its faded copy and the fog cloud layer are baked once per world (4 × 216 KB at 8 bpp, or redrawn from cell tiles). Per-frame overlays: fog cells, faded seen cells, a 13×13 dither sprite per unsurveyed quarter of a visited cell (at most 4 per cell), pips, signs, the storm band, the range square, pins, the start flag and the pawn (no trail).
- **Benchmark** (headless Chromium, mean ms per call over 300 calls, seeds 7, 13, 42, against main): drawMap 2.11–2.38 main vs 2.22–2.30 here (and 2.41–2.45 vs 2.31–2.47 with visited cells); drawPatch 0.89–0.90 vs 0.91–1.00 in a veiled place, 0.92–1.21 vs 0.94–1.03 half surveyed, 0.93–1.02 vs 0.98–1.06 in a fog bank. All within 1.15× of main.
- **Sprites.** Tokens are 32×32; features ≤32×32; canopies 88×76; overhang roofs 104×22. Budget ≤40 sprites per frame. New this round: the fruit bubble (11×13), the warm stone (32×32, a ring of dots baked in), the battery and radio icons (15×9, 9×9). The veil hides sprites, so a veiled place draws fewer. Companion mode adds the mibi at 8× (256×256, baked once per species, pose and frame by integer upscale of the 32×32 token), its floor shadow (180×22), the glowtail's dithered halo (300×220, checkerboard), the hollow bolt (14×17) and the hopper's paw marks (27×27, the 9×9 icon at 3×); the active screen draws at most about 10 sprites plus text.
- **Redraw.** The browser redraws every animation frame; the device would redraw on input or action, with 110–170 ms slides at full rate and 2–4 Hz idle cycles using dirty rectangles. No per-pixel effects.
- **Motion.** Hold-to-walk starts after 230 ms and repeats every 150 ms. A shield hit gives a 260 ms 3 px shake and a 90 ms bright border; Call sends an expanding ring. With reduced motion: no shake, flash, slides or blinking.

## Faked or simplified

- The battery and connectivity icons at the far right of the HUD and top bars are **static placeholders** drawn in palette (a battery two-thirds full, two of three radio bars). They reserve the space; nothing measures anything.
- The Station is a stand-in: instant identification, hatching and studies, one page each. Names are automatic (Dot, Moss, Bean, Fig, Nib, Tuft, Pebble, Wren).
- The cave under the cliff has no veil (it has its own darkness and lighting).
- Warm stones are chosen, not grown: the expedition stores which 3–5 stones in its reach are warm this turn; stones outside the reach are never warm while you can't reach them.
- Wait's report looks at the creatures in view, the storm, the fog bank and dew cups; it says at most two creature changes.
- Abilities come from species, not traits. Creatures are procedural tokens. The island across the fast water can't be reached.
- Buried pods lie 3–6 tiles from where you first enter a place.
- `__mb.TEST.calm` (test hook only) starts expeditions without a storm, to measure calm expeditions.

## Measured with scripted play (seeds 7, 13, 42)

A bot plays through the real controls (`__mb.act`): it walks to the tile whose Call would unveil the most of the unsurveyed quarters, Calls, and repeats; the **scout** Calls once per place (explored) and takes pods and Energy it sees; the **thorough** bot surveys all four quarters and also takes dew, shakes bushes and presses the fruit, picks up tufts and lights beacons. Then it walks off the edge toward the nearest unexplored cell.

Survey pace, tuned in steps (radius 11, then 75%, then explored at 3 of 4 quarters, then explored = visited and one Call):

| | Calls per place (median) | Scout to "everything explored" | Thorough |
| --- | --- | --- | --- |
| Round 3 as first built (7, 90%, 4/4) | 6 | 1,797–3,975 | 2,113–not reached by 4,128 |
| Radius 11 | 4 | 1,174–2,280 | 1,580–3,117 |
| + 75% | 3 | 858–1,714 | 1,305–2,803 |
| + explored at 3/4 | 2 | 743–1,540 | 1,295–2,796 |
| Explored = visited + one Call (thorough still surveys all four quarters) | scout 1, thorough 3 | 548–837 | 1,288–2,783 |
| + warm stones 3–5 in reach (current) | scout 1, thorough 3 | 538–845 | 1,274–2,675 |

The reach holds 15, 18 and 25 cells on the three seeds; a scout spends about 33–37 actions per cell (walking in, one Call, picking up what it shows, walking out), so the target of 200 (scout) and 450 (thorough) actions is not met.

- **Warm supply**: 3–5 warm stones in reach every expedition (30 of 30: twelve with 3, ten with 4, eight with 5), none visible on arrival without a Call.
- **Energy home per calm expedition** (no storm; 30 expeditions, five in a row per world, median 226 actions): mean 2.4, median 2, range 0–6; 2 of 30 brought none. The bot drew a median of 1 warm stone; the rest is charge left by earlier storms. Before the pick leaned toward the start, the same supply gave a median of 1.
- **With a storm stay** (measured before the survey tuning; Calls while sheltering, draws struck stones, banks at shield 1; 15 Weather expeditions): median 4.5 Energy home when sent (0–11); 3 of 15 broke.
- **Edge-walk presses per crossing**: 2 (step off, Confirm).
- **Wait**: on the map with no storm or fog near, "Nothing is moving here"; in a place with creatures it almost always names one moving.

## Measured this round (seeds 7, 13, 42)

- **Veil by walking, thorough bot** (Calls at the best tile, then gathers; calm; 3 expeditions of about 300 actions each). Cells surveyed to the 75% mark per expedition (measured before the 100% rule below), before → after: seed 7: 3, 3, 4 → 3, 3, 4; seed 13: 4, 4, 3 → 4, 4, 3; seed 42: 4, 4, 4 → 4, 4, 4. Calls: 15, 9, 12 → 13, 9, 12 (seed 7), 12, 12, 13 → 12, 12, 12 (seed 13), unchanged on 42. A bot that places its Calls optimally gains little from walking (its walks run through tiles a Call is about to lift); the gain is for a player who walks a place instead of calling.
- **drawPatch** (mean ms over 300 calls, four runs, before → after the whole round, ratio of means per seed): veiled 0.84–1.33 → 0.86–1.14 (median 1.0×); walked, veil edges in view, 0.81–1.26 → 0.86–1.42 (1.0×); called 0.85–1.27 → 0.92–1.56 (1.2×); fog bank 0.83–1.24 → 0.97–1.57 (1.2×); storm 1.12–1.79 → 1.25–2.02 (1.1×). Medians stay well within 1.5×; single samples reach 1.8× on a shared machine (their reruns 1.0–1.4×). Edge variants (veil and fog) are built once and cached; the per-frame work is a lookup of unveiled and in-sight per visible tile.
- **Send-home spam** (a bot that knows where every charged or warm stone is, goes down into the start cell, draws one if it lies there, sends home; 10 expeditions × 5 seeds): before, seed 3 brought 1 Energy on 4 of 10 expeditions; after, each seed brings at most 1 Energy on the first expedition and 0 on all later ones.

- **Slabs** (generator check over every place of seeds 7, 13, 42, 3, 5: 1,319 places with slabs, 1,483 slabs): before, 15 slabs could not be pushed at spawn or had water or cliff on two sides; after, 0. A slab pushed into a spot it can't leave says once "The slab is wedged".

- **Lightning, tuned** (a bot standing in the open through 20 storm passes per seed, seeds 7, 13, 42, 3, 5): stray hits 15 of 860 strong-rain actions and 32 of 640 peak actions in the open; Shield lost per pass 0 or 1 bar in all 100 passes (before the tuning: 0–4 bars, 3–4 on seed 13). A 3-bar Shield now survives two full passes standing in the open; the Station mends it to at least 2 bars for free.

## Known issues

- Left from playtest r6: an empty dew cup still looks much like a full one (art); creatures that crowd you after a Call can hem you in for a few actions (tuning); the fog arrow against the Wait words ("drifts south-west" with ▶) was not reproduced: both read the same drift; a second creature meal in an expedition gives no Data and says nothing.

- **Completing a reach is still long** (538–845 actions for a scout; see above): with places at 28×32 tiles the walk through each place sets the floor, whatever the Call does.
- Calm Energy scales with places visited (about 1 per place); faster surveys would raise it unless the warm odds drop.
- A place stays surveyed across expeditions; only its warm stones (3×3 each) and changes from the world turn are veiled again.
- At 1× the map's dotted quarters on dark ground (wood) are subtle.
- Seen meadow cells fade only from grass to a darker green. The map line rarely fits the cell you're on and the one ahead in full.
- Tablet scale factors that don't snap give slightly uneven pixel widths. Some browsers block clipboard access; "Copy playtest notes" then shows the notes selected in a text box.

## Persistence and tools

- Saves to localStorage with save format v7 (one `with` slot replaces `along` and `rider`); older saves (v1–v6) are discarded on load. Works without storage. `?seed=N` sets the seed of the next New world; a saved world keeps playing until you choose New world.
- **Reset game** (a page button beside the Observer toggle, not a device control) asks once ("Erase this world and start fresh?"), then erases every save version and reloads into a new world; `?seed=N` applies to it. Keys go back to the game afterwards.
- The Observer shows expedition, world turn, actions, location, the mibi with you (and whether it is the partner) and who is at home, Probe, carried and Station materials, map counts (visited, surveyed, seen, fog; in reach), **Survey** (the current cell's four quarter percentages, its Calls, and "Explored N of M in reach"), **Energy** (warm and storm-charged stones in reach, how many unveiled, and Energy drawn from warm stones this expedition), seed, the last 8 events and the palette, plus "Copy playtest notes".
- Test hooks: `window.__mb` (state, `lineFor`, `capture`, `offPalette`, `act`, `press`/`release`, `reachCounts`, `surveyed`, `quarterFracs`, `unveiled`, `leftCounts`, `pipsOf`, `stoneWarm`, `stormCharge`, `sightR`, `bubbleOf`, `crossReason`, `stormLevel`, `sendPreview`, `mapCounts`, `TEST` and others).
- The build stamp reads `../../build.json` (written by CI); a local copy shows "local build". One self-contained file with no build step.
