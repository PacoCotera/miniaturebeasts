# Companion Field Test (exploration rough playable, round 4)

Tests the combined exploration design on an honest simulation of the Companion screen: a fogged 16×20 world map (start on any glint; placing reveals the 3×3), living patches with three token species, the action clock, storm and fog bank, partners hatched from pods, two partner gates, and Cargo → Station → world turn.

Controls: arrows/WASD or the pad (tap = creep one step, hold = walk); Enter/Space or orange = Confirm (does what the bottom line says); Esc/Backspace or grey = Back, which opens the mode list (in a place too). No other controls.

**Waiting.** During an expedition the mode list's first entry is **Wait**: one deliberate quiet action. The list stays open after waiting, so Confirm, Confirm… keeps waiting while the place stays visible behind the small list; Back returns. In a place the second entry is Leave (or Climb out); walking off an edge also leaves. Chosen over Back-then-Back, which would hide an action inside a navigation gesture.

## The loop
1. Expedition 1 has no partner. Bring a pod home with Cargo → Send.
2. The Station screen shows the cargo, one line per item, and identifies the pod ("unknown species → Hopper"). The first time a shed trigger brings a pod home, it adds one discovery line ("Hoppers shed when they shake dry."). Identified species leave tracks on the map.
3. A pod of a species you don't raise yet incubates: "Opened: a long-eared hopper. Name: Pip." The screen also lists the world-turn lines. That's 1 or 2 screens, with no menus.
4. From the next expedition, the Partner row on the expedition screen (or Companions) offers "Bring Pip along". Each species gives its partner one ability:
   - burrower (Glowtail): digs the narrow burrow under the cliff, which opens the cave and Deep ground;
   - Hopper: calms wary creatures. They notice you two tiles later, don't bolt when you walk close, and accept fruit. A small teal wave above a wary creature shows the partner is keeping it calm, and the first time it holds still because of the partner the line says so;
   - Puffcap: sniffs out buried pods within about 5 tiles.
   If the first pod is a hopper, the burrow stays shut until you bring home a burrower pod.
5. Gates: the burrow (needs a digger) and the fast water across from the river island (needs a swimmer; nothing swims yet). Bumping or pressing Confirm at a gate drops a pin. A partner goes to look at a gate it can handle and ignores the others.

## Round 3 (from the round-2 playtest)
- **Causes in the message line.** Results now show even when they happen offscreen: "Something dropped a pod near the overhang", "Something ate the fruit by a bush", "Pip keeps the hopper calm", "A glowtail is settling under a tree". In view they name the creature ("The hopper shook dry · a pod rolled loose"). The two or three most important notes share the line until your next action; Back and browsing the list keep it.
- **Glowtails settle where you can see it.** By its hole or in the cave, a glowtail with you at least 3 tiles away (2 with a calming or kin partner) gains one step per quiet action. You see four pips over it fill, and it lowers and then curls up. The rule is still 8 quiet actions. The first time it shows "The glowtail is settling. Keep still". Walking or coming too close resets it with a reason ("looks up · too close"). A pulse within 7 tiles startles it: "Your pulse startled the glowtail · it stopped settling".
- **An early burrower.** Every start glint has a rock or wood cell beside it with three glowtails and an overhang. A wet glowtail curls up in shelter during rain; after three curled actions one may drop a pod (one per place per storm). In the first two expeditions those glowtails are always ready, so the first storm can give a burrower pod without the burrow. New discovery: "Glowtails shed when they curl up out of the rain."
- **An informed start.** Each glint shows its strongest nearby sign (slow beat, tracks or rings), and the line names the land and the sign. Placing a Weather start also previews where the storm band will begin.
- **Fewer map signs.** Signs fade after one turn and disappear after two. Known-species tracks show only on each species' 3 strongest cells (2 or more creatures). All signs together cover at most 40% of revealed cells; pins and the deep "?" are always shown, and slow beats rank highest. Slow beats and pins are drawn larger. New pods from a world turn leave a beat on known land, so "something is stirring" can be found.
- **Pods.** Each species has a subtle shell mark: two ear stripes on a hopper pod, a glow dot on a glowtail pod, cap spots on a puffcap pod. Pods have a dark outline and are drawn above canopies and roofs.
- **Storm.** While the band is over your place it crawls, staying about 30 actions, and rains in spells with a 3-action lull every 12 ("The rain eases for a moment"; the line says "lull"). Elsewhere it moves at map speed, so it still arrives within about 12 actions. The lulls do not reset the shed cap (see Round 4). A direct strike costs a hull mark; the first hit explains the hull bars, and a "hull 2/3" tag shows for a few actions after any hit. The first warning tile is explained in words.
- **Confirm never silently pulses.** A spent bush, rung stone, empty cup, uncharged stone or blocked tile says "Nothing here", and Confirm then does nothing and spends no action. Pulse happens only when the line says Pulse: open ground, a creature, or a charged stone not yet seen.
- **Quieter HUD.** Supplies are unchanged, but their count shows only for a few actions after it changes ("+2"). The Cargo screen still has the totals.
- **Small fixes.** The partner row on the expedition screen is selectable (one press). The "swap" float fits its box. The right side of the bottom line drops trailing words instead of truncating.
- Save format v3 (superseded by v4 in round 4).

## Round 4 (tuning)
- **One shed per place per storm.** A place gives at most one hopper pod and one glowtail rain-curl pod per storm, however many spells of rain the lulls split it into. The lulls themselves stay.
- **Start signs vary.** Each start glint shows a sign it really has (slow beat, tracks or rings), choosing the one the other glints show least. Nothing is invented: a glint with only tracks still shows tracks.
- **World-turn storm line.** "A storm charged stones…" is said once. If the next turn's storm charged stones in the same place it is left out; if elsewhere it reads "The storm reached stones near the cliff."
- **Hopper partner is visible.** The first time a wary creature stays put because of a calming partner the line reads "The hopper would have noticed you. Pip keeps it calm"; later ones use the shorter "Pip keeps the hopper calm". A small teal wave bubble shows over wary creatures the partner is calming. The numeric effect is unchanged.
- **Softer cave light.** Where light levels meet, the ordered 4×4 Bayer pattern (fixed to the world, so it doesn't swim when the view scrolls) chooses per pixel between the two levels, through the same palette lookup tables. Light falls off smoothly over about one tile instead of per tile. No blending, no new colours.
- Save format v4; v1 to v3 saves are discarded.

## Screen and budget assumptions (as if targeting the ESP32-S3 Companion)
- **Frame.** Offscreen 450×600 at 1:1 device pixels, blitted to the page with `image-rendering: pixelated`. Drawing uses integer coordinates only. There are no anti-aliased lines, gradients, alpha blending or blur. The page snaps its scale to a whole number of physical pixels per device pixel when that costs ≤15% size (a phone at 3× gets exactly 2×).
- **Palette.** 48 colours, kept as data (`PALETTE`) at the top of the script and shown in the Observer. A check in the tests confirms every captured pixel is a palette entry. Effects that would need blending use one of two tricks instead. Storm light, cave dim and dark, fog and faded map signs are palette lookup tables (a 48-entry LUT each). "See-through" fog, warnings, dimmed menus and transitions use an ordered 4×4 Bayer dither. Both carry over directly to LVGL I8 images or to an RGB565 LUT.
- **Layout.** HUD 26 px, view 450×540, action line 34 px. Text is a 5×7 bitmap font drawn at 2× minimum (14 px caps) and at 3× for headings. On a 390 px phone that's about 9.6 CSS px caps; on the real 2.41" panel it's about 1.1 mm.
- **Tiles.** Patches are 28×32 tiles of 32×32 px; the view shows at most 16×19 tiles, so up to 304 tile blits per full redraw. Tiles are autotiled with 4-bit neighbour masks (shores, boulders, cliff lips), with 2–4 variants and 2 water frames. One play session used about 40 distinct tiles (40 KB at 8 bpp); the worst case is about 300 tiles (300 KB) in flash. Light levels are LUT swaps, not extra tiles.
- **Map.** 16×20 cells of 26 px (416×520). Terrain and the fog cloud layer are each baked once per world: 2 × 216 KB at 8 bpp in PSRAM, or redrawn from cell tiles. Per-frame overlays are fog cells, signs, the storm band (a darker copy of the same image), pins, the pawn and the trail.
- **Sprites.** Creature, partner and player tokens are 32×32. Features are ≤32×32, tree canopies 88×76 and overhang roofs 104×22. The budget is ≤40 sprites per frame: about 12 creatures, 1 partner, 1 player, about 15 features, pods and fruit, and ≤6 canopies. Canopies and roofs switch to a checkerboard version when something stands under them. About 70 sprite images (≈115 KB at 8 bpp) were built in one session; the prototype builds them procedurally at load, where the device would ship them as a baked atlas.
- **Redraw.** The browser redraws the full frame on every animation frame for simplicity. On the device: redraw on input or action; slides of 110–170 ms run at full rate (the camera scrolls, so the view redraws fully); between actions run only 2-frame idle cycles at 2–4 Hz using dirty rectangles around sprites, water and the warning tile. No per-pixel effects.
- **Motion.** Hold-to-walk starts after 230 ms and repeats every 150 ms, matching the 150 ms slide, so a held walk is smooth; a tap is exactly one creeping step. A hull hit gives a 260 ms 3 px shake and a 90 ms bright border; Confirm-pulse sends an expanding ring. With reduced motion: no shake, flash, slides or blinking; static rings and a steady border instead. Messages stay until the next action.

## Round-1 fixes (round 2)
- The storm band starts 3 columns upwind of the start, so it arrives in about 12 actions. A strike is warned one action ahead on a glowing tile, with a message when the strike is aimed at you. Lightning picks stones about 60% of the time and your tile about 8% (12% when there are no stones).
- Hoppers sheltering together: at most one sheds per place per storm. The others shake without shedding.
- The cave no longer gives pods freely with a partner. A glowtail needs 8 quiet actions with you at least 3 tiles away (2 with a calming or kin partner), and each cave gives at most one such pod per expedition.
- The world turn reads as 2–3 plain lines ("The hoppers moved north. A storm charged stones near the cliff. Fruit is back on two bushes.").

## Faked or simplified
- The Station is a stand-in. Identification and incubation are instant, mibis are named automatically (Pip, Dot, Moss), and a pod hatches only if you don't raise that species yet. Other pods are stored but do nothing. There is no care, bonding, research or Probe tiers.
- Abilities come from species, not traits. Creature behaviour is a small per-species state machine. Creatures are tokens: procedural pixel art built at load.
- The island across the fast water can't be reached; the pod on it is scenery.
- The deep "?" only pins (tier 2 doesn't exist). Probe range is not enforced.
- The Fredoka web font is used only for the page around the device; the device screen uses the bitmap font.

## Known issues
- Ground types meet with hard tile edges (no blended transitions).
- Tablet scale factors that don't snap (for example about 1.9× on an iPad in landscape) give slightly uneven pixel widths.
- The hopper partner's calming effect is real but modest; it is now visible, not stronger.
- Notes can crowd the line: up to about 78 characters fit, and lower-priority notes are dropped.
- Waiting takes two presses the first time (Back, Confirm), then one per action.
- Some browsers block clipboard access; "Copy playtest notes" then shows the notes selected in a text box.

## Persistence and tools
- Saves to localStorage with save format v4; older saves are discarded on load. The game works without storage (in memory only). New world is in the mode list. `?seed=N` makes the next new world reproducible.
- The Observer panel shows expedition, world turn, actions, location, partner, seed, the last 8 events and the palette swatches, plus a "Copy playtest notes" button.
- The build stamp reads `../../build.json` (written by CI); a local copy shows "local build". One self-contained file with no build step.
