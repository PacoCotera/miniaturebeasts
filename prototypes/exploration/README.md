# Companion Field Test (exploration round 2, prototype round 5)

Builds exploration round 2 ([`design/proposals/exploration-round-2.md`](../../design/proposals/exploration-round-2.md), its build scope plus §9 Fog bank) and the four-button control scheme ([`design/proposals/companion-controls.md`](../../design/proposals/companion-controls.md)) on an honest simulation of the Companion screen: a fogged 16×20 world map, living places, the action clock, storms and fog banks, materials with a purpose, the Station stand-in, partners by life stage, and Cargo → Station → world turn.

## Controls

Four buttons. The bottom line always reads in three parts: **✓ what Confirm does** (at most 24 characters), the middle context (the only part that shrinks), and **← where Back goes** (at most 20 characters, never dropped). The HUD's top right always shows what **Call** will do, beside the Energy number.

| | Pad | Confirm (Enter/Space) | Back (Esc/Backspace) | Call (C) |
| --- | --- | --- | --- | --- |
| Expedition choice, start map | Move between choices / glints | Choose; "Start here" | Menu (on the start map: back to the choice) | Nothing; its slot is empty |
| Map | Tap one cell; hold to keep walking | Go down | Menu: Wait, Send home, Probe, Cargo, Companions | Pin this cell (1 Energy), or remove your own pin (free) |
| Place | Tap: creep one step. Hold: walk | Act on what you face; "Nothing here" spends nothing | Menu: Wait, Leave this place, Send home, Probe, Cargo, Companions | Pulse (1 action) |
| Menu | Move focus | Run the entry; after Wait the menu stays open | Close | Nothing |
| Probe / Cargo / Companions | Move focus | Patch the shield / Send home / bring a mibi along | Close | Companions: calls the riding mibi to the front (free) |
| Station | – | Continue, hatch, upgrade, next expedition | Menu (on the upgrade offer: not now) | Nothing |

- New world is offered only between expeditions (last menu entry).
- One-time pointer messages: first map entry ("Walk with the pad · ✓ goes down · ← Wait and Send home"), first place ("))) Call sends a signal · things answer"), first pod ("Pods open at the Station · ← Send home when you're ready"), a settling glowtail ("… Keep still · ← Wait"), hold full ("Hold full · swap, or ← Send home"), nothing left ("Everything in reach is explored · ← Send home").
- The depicted shell has Call directly above Back, both left of a larger Confirm. Call is teal with a ring texture.
- The bottom line sets its glyphs 1 px apart (still 2× pixels) so the three parts fit 450 px. Every Confirm label is at most 24 characters ("Offer fruit · puffcap"); a longer one would be clipped, never the Back part.
- One-time lines (explanations, pointers, the storm odds) count as shown only if they are still in the message box when the action ends; one pushed out by a more urgent line comes back next time.
- Call on the Companions screen calls the mibi riding in the Companion; with nobody riding it only says "No one is riding".

## The loop

1. Choose Weather (or Deep ground, with a digging partner), pick a start: the first time a glint, later any seen cell. A dotted square shows the Probe's range from that start.
2. Walk the map. Each step lifts the fog one ring around you (not inside a fog bank). Go down into a place, press Call, gather.
3. Send home from the menu (Cargo shows a preview of what will happen), or the Probe breaks. The Station spends what you bring, then the world turns once.

## Materials

Every source is an act you choose. Each caps at 20 carried.

- **Energy**: draw a struck stone's charge (+2, +3 if struck at the storm's peak). Spent in the field on pins (1) and shield patches (3 for one bar, on the Probe screen). Spent at the Station on identifying or logging a pod (1), hatching (2) and the tier 2 Probe (12).
- **Data**: only from creature moments you cause: a creature eats your fruit, or a glowtail settles because you kept still. +1, or +2 the first time ever for that species and moment and for the first moment with each species on an expedition (tuning to confirm); once per creature per expedition. Spent at the Station on studies (2 each, one line per discovery) and the tier 2 Probe (4, tuning to confirm; the proposal says 8).
- **Essence**: dew from a full cup (+1), pressing a fruit instead of feeding it (+2), the tuft a hopper leaves when it shakes dry (+1). Spent at the Station on hatching a founder (4).
- Humming stones are gone. A shaken bush drops one fruit.

## Storm and Shield

- The band is 3 columns wide. Rain falls under its core; its edges are overcast only. While it is over you, on the map or in a place, it crawls 0.14 columns per action (elsewhere 0.25), so a storm rains on one place for about 15 actions, with lulls of 3 actions in every 12.
- The HUD shows 1–3 bolts: 1 approaching (or the dry edge, or a lull), 2 strong rain over you, 3 the peak (the band's centre, about 9 actions in a place).
- **Stray strikes**: each action in the open under rain, 1 in 12 (strong) or 1 in 6 (peak). Measured over 300 forced actions in the open: 0.077–0.093 strong, 0.167–0.177 peak. None in shelter: under a canopy, an overhang, in the cave, or on a wood cell on the map. None inside a fog bank. The odds are said in words once, the first strong storm and the first peak.
- **Warned strikes** aim at stones (or open tiles near you, never your own tile), one action ahead on a glowing tile. On the map they land on a neighbouring cell. Lightning lights the map cell it strikes for good, even in fog (about one in seven of the band's flashes, plus every warned map strike). Stones charge at the world turn only where lightning really struck (warned, stray, a stone in a place) or under one flash in four; at the world turn each stone in such a cell takes a +2 charge 60% of the time.
- **Shield** (renamed from hull): 3 bars at tier 1, 4 at tier 2. At 0 the Probe breaks: "The Probe breaks · your pods are safe". The expedition ends where you are; all carried Energy, Data and Essence are lost; pods, pins and revealed land are kept. The next expedition starts mended, free. The first time the shield drops to 1 the game says a break loses what you carry.
- A puffcap partner flinches one action before a stray strike; an elder partner of any species feels every one.

## Range, tiers and the map

| Tier | Range from start | Pods carried | Shield | Also |
| --- | --- | --- | --- | --- |
| 1 | 2 (5×5) | 2 | 3 | – |
| 2 | 4 (9×9) | 3 | 4 | Reads the deep "?" (once: a sealed pod rises) |

- Stepping past the square bumps: "Edge of the Probe's range · tier 2 reaches further". Sweep is one ring at both tiers.
- **Cell states**: fog (cloud) · seen (muted through the existing fade table) · visited (full colour, one white pip per thing left: a visible pod, a seen charged stone, fruit or a tuft on the ground; up to 3) · cleared (a small tick). A cell is cleared only after a Call inside it found nothing hidden anywhere in the place and nothing is left: no pod, charge, fruit or tuft, and no full dew cup, bush with fruit or unclimbed cairn. A Call says "Nothing hidden · nothing left here" only then; "Nothing hidden" otherwise, and if a pod is still lying in the place it glints and the line says where. A world turn that adds a pod or charge to a cell un-clears it. The cell above the cave can't tick while the cave still holds a pod; a pod that finds no room in a place is dropped and logged.
- **Five signs only**: paw (tracks), beat (a pod, buried or not), bolt (a charged stone), pin (yours), and a gate's own shape (narrow hole, fast water, deep "?"). A pod in the cave under the cliff shows as the narrow-hole sign ("needs a digger"), never as a beat. The map counts (Cargo's "In reach", the Observer) come from one function: visited includes cleared.
- The fog bank is in the Probe legend and has a first-sighting line ("Fog bank · creatures calm inside, nothing seen").
- On the start map the storm band is a dotted preview of where the storm would begin; the top bar says so. Rings are gone. Signs on cleared cells and inside a fog bank are not drawn. Each sign's one-line explanation shows once, the first time the line names it.
- The map's line names the cell you're on and the one you face ("wood · slow beat · Ahead: meadow"); when that is too long it keeps the part with signs.
- **Survey cairn** (included): rock fields (35%) and meadows (8%) may hold one. Climbing it reveals land 3 cells around the place, beyond range.

## Going home

- Hold full, "Everything in reach is explored" (every cell in reach visited and called in), "Nothing new until the world turns" (after that, once the storm has gone or on re-entering a cleared place), the first-pod line, and the banking line at shield 1.
- **Send home** is in the menu (second on the map, third in a place) and opens Cargo, which previews the Station's work ("two new pods to identify · a new pod can hatch · Probe tier 2 is ready").

## Call

- **In a place** (1 action): a ring spreads 7 tiles. Hidden pods and charged stones glint and stay outlined until taken. Curious creatures show "?" and come closer; wary ones show "!" for one action, then hide or run. A settling glowtail is startled. Your partner comes; a digger near the burrow digs it. If nothing hidden is left anywhere in the place, the cell is marked; otherwise "Nothing close · something may be further off".
- **On the map**: pins your cell for 1 Energy, or removes your own pin for free. At 0 Energy the slot dims and a press says "Pins cost 1 Energy · you have 0". Gate pins stay automatic and free.
- **On the Companions screen**: the riding mibi hops to the front. Free.

## Creatures and feeding

- Creeping never startles a creature unless you step right next to it (curious ones, and ones your partner calms, not even then). Walking startles anything within its notice range.
- A startled creature shows "!" for one action. If you keep coming it flees: 3 tiles over two actions, never off-screen, then stops and watches. After 3 quiet actions it goes back to its routine. Glowtails dive into a hole instead.
- **Put it down and back off**: fruit on the ground draws an eater within 10 tiles (it closes in fast, then slows: about 4 quiet actions) once you are 3 tiles from the fruit (1 for curious or calmed creatures). Sheltering creatures wait out the rain first. Coaching once: "The puffcap eyes the fruit · back off".
- **Hand-offer** works for curious creatures, with a calming partner near, or inside a fog bank; a wary one shows "!" and backs off, with a one-time hint.
- Carrying fruit: facing empty ground puts it down; facing anything solid presses it (+2 Essence). Facing a creature with empty hands: "✓ Bring fruit, or Call" (it says the creature is watching you; no action spent).

## Fog bank

Cover: creatures notice walking 2 tiles later and creeping never startles, even wary ones; hand-feeding a wary creature works. Dew cups refill about every 3 actions while the bank is over the place. Inside the bank the map sweep stops and signs are hidden. Call reaches 3 tiles and can't mark a place cleared, unless a glowtail (glowing) partner is along. No stray strikes. It drifts with the field clock.

## Station stand-in

After each expedition the Station works through its store in order: identify each pod (1 Energy), read each waiting study (2 Data; one line per discovery), hatch one founder of a species you don't raise yet (2 Energy + 4 Essence). A pod of a species you already raise is logged and stored, and the Station says so ("Hopper pod · you raise hoppers · stored"). Whatever it can't pay for waits and says what it needs ("Pod waits · needs 1 Energy to identify", "needs 2 more Essence"). When the store holds 12 Energy and 4 Data at tier 1, a page offers the tier 2 Probe (Confirm upgrades, Back declines). Then the world-turn lines.

## Partners by life stage

- New pods hatch as **juveniles**. A juvenile can ride in the Companion (Companions screen: "Let Dot ride along"); it doesn't join expeditions and changes nothing in the Probe. After 2 world turns it is an **adult** and can be brought along ("Pip is grown" in the world-turn lines).
- After 6 world turns as an adult a mibi becomes an **elder**: double calming and sniffing radius, feels every stray strike, trails two tiles behind, and needs two actions to dig.
- Deep ground starts at the narrow burrow under the cliff (it is revealed and pinned). Facing it with a digging partner, Confirm reads "Pip digs" and the cave opens. Facing an ordinary glowtail hole, the partner points to the burrow instead.
- Abilities by species as before: glowtail digs the narrow burrow (and glows, restoring a muffled Call), hopper calms wary creatures, puffcap sniffs out buried pods (and flinches before stray strikes).

## Screen and budget assumptions (as if targeting the ESP32-S3 Companion)

- **Frame.** Offscreen 450×600 at 1:1 device pixels, blitted to the page with `image-rendering: pixelated`. Integer coordinates only; no anti-aliasing, gradients, alpha blending or blur. The page snaps its scale to a whole number of physical pixels per device pixel when that costs ≤15% size.
- **Palette.** 48 colours, kept as data (`PALETTE`) at the top of the script and shown in the Observer. `__mb.offPalette()` confirms every pixel of the frame is a palette entry. Blending effects use only palette lookup tables (storm light, cave dim and dark, fog, the fade table for seen cells and old signs) and the ordered 4×4 Bayer dither (fog bank, warnings, dimmed menus, transitions). No new tables were added this round.
- **Layout.** HUD 26 px, view 450×540, bottom line 34 px. Text is a 5×7 bitmap font at 2× minimum (14 px caps), 3× for headings; the bottom line sets glyphs 1 px apart.
- **Tiles.** Places are 28×32 tiles of 32×32 px; at most 16×19 tiles in view (≤304 tile blits per full redraw), autotiled by 4-bit masks with 2–4 variants and 2 water frames.
- **Map.** 16×20 cells of 26 px. Terrain, its storm-dark copy, its faded copy and the fog cloud layer are baked once per world (4 × 216 KB at 8 bpp, or redrawn from cell tiles). Per-frame overlays: fog cells, faded seen cells, pips and ticks, signs, the storm band, the range square, pins, the pawn and the trail.
- **Sprites.** Tokens are 32×32; features ≤32×32; canopies 88×76; overhang roofs 104×22. Budget ≤40 sprites per frame. New this round: tufts (14×10), the cairn (32×32), pod outlines (dots, no sprite).
- **Redraw.** The browser redraws every animation frame; the device would redraw on input or action, with 110–170 ms slides at full rate and 2–4 Hz idle cycles using dirty rectangles. No per-pixel effects.
- **Motion.** Hold-to-walk starts after 230 ms and repeats every 150 ms. A shield hit gives a 260 ms 3 px shake and a 90 ms bright border; Call sends an expanding ring. With reduced motion: no shake, flash, slides or blinking.

## Faked or simplified

- The Station is a stand-in: instant identification, hatching and studies, priced but with no screens beyond one page each. A founder hatches only for a species you don't raise yet; other pods are stored and do nothing. Research is one line per discovery. Names are automatic (Pip, Dot, Moss).
- "Shakes dry" is not a Data moment: a hopper shakes because of rain, not because of you, so it gives a tuft (Essence) instead. Data moments are eating your fruit and a glowtail settling.
- A riding juvenile's "first training" is only the Call animation; nothing tracks it.
- Abilities come from species, not traits. Creatures are procedural tokens.
- The island across the fast water can't be reached; nothing swims yet.
- Buried pods lie 3–6 tiles from where you first enter a place, so the first Call can find them.
- Clearing a place checks for hidden finds across the whole place, so a Call far from a buried pod says "Nothing close · something may be further off" rather than marking the cell.
- Patching the shield spends 3 Energy but no field-clock action.
- Fog bank tuning (3-action dew refill, notice −2) is a first guess.

## Measured with scripted play (seeds 7, 13, 42)

- A thorough player (gathers everything, never shelters) fills the hold at a median of about 150–180 actions (100–440); a scout (enter, Call, take pods, leave) hears "Everything in reach is explored" at a median of 53 actions (37–112).
- Breaks: 4 of 21 storm expeditions for a player who stays in the open in a place the whole storm (0.10 hits per open storm action); 3 of 6 open storm passes for a player waiting on the map.
- New cells per expedition: median 18–20 for the thorough player, 36 for the scout (who walks the whole square and climbs no cairns).
- The first put-down feed without a partner succeeded on the first or second try (seeds 7, 42, 5, 99).

## Known issues

- Places are large (28×32 tiles): a thorough player spends 50–110 actions in one, so the hold usually fills before "Everything in reach is explored" appears, and some expeditions run past 300 actions.
- Energy is scarce unless the player stands by stones in a storm (median 2–3 per expedition), so pods often wait at the Station for Energy. Essence is plentiful (dew, pressing, tufts) and often caps at 20.
- Seen cells in meadows fade only from grass to a darker green through the existing fade table; wood, water and rock fade much more.
- The map line rarely fits both the cell you're on and the one ahead in full; it keeps the part that has signs.
- Ground types meet with hard tile edges. Tablet scale factors that don't snap give slightly uneven pixel widths.
- Some browsers block clipboard access; "Copy playtest notes" then shows the notes selected in a text box.

## Persistence and tools

- Saves to localStorage with save format v5; older saves (v1–v4) are discarded on load. Works without storage. `?seed=N` sets the seed of the next New world; a saved world keeps playing until you choose New world (last menu entry between expeditions).
- The Observer shows expedition, world turn, actions, location, partner and rider, Probe (tier, range, hold, shield, storm bolts), carried and Station materials, map state counts (seen, visited, cleared, fog, explored in reach), seed, the last 8 events and the palette, plus "Copy playtest notes".
- Test hooks: `window.__mb` (state, `lineFor`, `capture`, `offPalette`, `act`, `press`/`release`, `reachCounts`, `isCleared`, `pipsOf`, `stormLevel`, `sendPreview`, `mapCounts` and others).
- The build stamp reads `../../build.json` (written by CI); a local copy shows "local build". One self-contained file with no build step.
