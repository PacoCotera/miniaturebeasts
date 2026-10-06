# Send home and the map trail

**Proposal**, answering two owner suggestions from build 1e53600: (a) send home
only from the start or a depot; (b) drop the map trail unless it serves a
mechanic. Current rules: [play manual](../play-manual.md).

## (a) Where you can send home

**Proposal: Send home works only on the start cell or on a lit depot.**

**Expedition shape.** It becomes a round trip. The way back is on the map only:
walking off a place's edge lands on the next map cell, and places are entered
only by choice (✓). The farthest cell in reach is 2 steps from the start at tier
1 and 4 at tier 2, so the walk back is at most 2–4 map actions, not commuting.
The start shows as a flag. Elsewhere, the map line names the nearest send point
("Start · 2 cells north-east"), and Send home shows greyed with that hint.

**The storm gamble gets sharper.** The walk back costs actions while the storm
moves. One more charge now also means walking home under it (open cells risk
stray strikes; wood shelters). A storm between you and the start is a visible
choice: shelter and wait, or cross.

**The broken-Probe rule stays.** A break still ends the expedition where you
are, and pods go home. If it didn't, a break would strand the player, which is
punishment without a choice. A break is never a cheap way home, because carried
materials are lost.

**Messages** point to a place, not a menu: "Hold full · head back (start: 2
cells west)", "Everything in reach is explored · head back".

**Range.** The start is inside the reach square by definition. A depot is usable
only while it is inside the current expedition's reach.

**Depots.**
- **What and where.** An old supply post (a hut-and-mast feature in a place).
  At most one in any 5×5 area, about six on the 16×20 map, leaning toward far
  regions.
- **Found** like any find, by walking or Call, never through fog. The map then
  shows a dark depot sign.
- **Lit** for 1 Energy, and lit for good, like a beacon. It is then a send point
  on every later expedition that has it in reach.
- **Offers** send home, Shield patches at the home price (1 Energy a bar, not 3)
  and map shelter from stray strikes. It reveals no land; that stays the
  beacon's job.

**Energy.** Lighting depots (1) and mending at them (1 a bar) add sinks, in line
with "Energy is sought-for and scarce". Home mending is unchanged (the Station
mends to at least two bars).

**Cost.** One more rule and a few map actions per expedition. A feature sprite,
a map sign, a greyed menu state and a line hint. A player who forgets the rule
can feel trapped, so the greyed entry and hint must teach it the first time.

**Alternative: send from anywhere, at a price.** Send home stays in the menu
everywhere, but costs 2 Energy unless you are on the start cell or a lit depot.
It is softer (no forced walk, and the round trip is still rewarded). But the
storm gamble gains little, a player at 0 Energy still has to walk, so the rule
still needs teaching, and sending home becomes a toll rather than a place.

## (b) The map trail

**Proposal: remove the drawn trail; keep its data.** Quarters already show where
you have been and signs show what is left, so the trail shows nothing to act on,
and on 26 px cells it competes with the signs. The data stays for the world-turn
guard (new things arrive away from where you walked) and for the mibi with you
remembering the land. With (a), what matters is the way back, not the way out.
The start flag, lit depots and the direction hint do that job without a line
across the map.

**Alternative: trim it to this expedition only** (drop the dim last-expedition
trail). It costs little, but it keeps clutter for no mechanic.

## Decisions for the owner

1. **Where to send home.** Only from the start cell or a lit depot, with a break
   still sending pods home from anywhere? Or from anywhere for 2 Energy, free
   at those points?
2. **Depots.** A found post, lit for 1 Energy and lit for good, at most one per
   5×5 area. It offers send home, Shield mending at 1 Energy a bar and shelter,
   but reveals no land?
3. **Trail.** Remove the drawn trail (data kept for the world turn), with the
   start flag, depots and a direction hint in its place?

**Build scope.** Send home greyed on the map with "Start · N cells" until you
stand on a send point. Start flag on the map. Depots (about six per world): lit
for 1 Energy; send home, mending at 1 Energy a bar and shelter on the map.
Updated Hold full and Explored lines. Drawn trail removed.
