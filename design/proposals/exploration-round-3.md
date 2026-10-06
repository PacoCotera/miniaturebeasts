# Exploration, round 3: energy, survey and reading the world

**Decided 2026-10-06:** all five decisions below were taken as recommended, with
one condition on Energy: warm stones must not be abundant. Energy stays a
sought-for resource, and Energy and pods both stay somewhat scarce, so a player
does not end up with a multitude of mibis.

**Proposal**, building on the decided and built [round 2](exploration-round-2.md),
after the owner's second play and playtest r4. **Decided** marks owner decisions.

## 1. A worked moment

Expedition 6, calm. The HUD corner shows the reach as 5×5 dots, 4 filled.

1. **Map.** The rock field cell shows two clear quarters and two dithered ones:
   "rock field · half surveyed".
2. **In the place,** that half lies under a light veil. Call at its edge unveils
   a 15×15 square; a warm stone glints, and drawing it gives +1 Energy.
3. **A fruit drops.** The line says "puffcaps eat these". When the player picks
   it up, a puffcap shows a fruit bubble; the glowtail shows nothing.
4. **One more Call:** "Surveyed · 1 dew, 1 fruit left". Walking off the east edge
   lands on the next map cell; the rock field draws whole, and a fifth dot fills.

## 2. Energy economy

**Decided:** Energy comes from storm-struck stones. Prices: identifying a pod 1,
hatching 2 + 4 Essence, a pin 1, a shield patch 3, tier 2 at 12. **The
problem:** a calm expedition yields 0–3 Energy, so pods wait and pins never
happen.

**Proposal: warm stones.**
- **The trickle.** At each world turn, every stone lightning didn't strike gains
  a warm charge of 1 (never more): sun is a condition, like rain. It glints on
  Call like a charged stone; drawing it (Confirm) gives +1. Nothing refills
  within an expedition (**Decided**).
- **Yield.** A calm expedition finds 3–5 Energy in reach: enough to identify pods
  and pin once or twice. Storms stay the big payout (+2 or +3 per strike,
  restruck: 8–15 per expedition), so tier 2 and shield patches remain storm
  goals. Prices are unchanged; Essence never converts to Energy.

**Cost.** One world-turn rule, plus a third stone look (a dim amber ring) that
must not be confused with a storm charge or the strike warning (r4 defect 4).

**Alternative: identification is free.** It fits "looking is free", since
identifying only reveals what a pod is. But it removes the most frequent Energy
sink, and calm expeditions still yield nothing for pins.

## 3. Clearing a cell: Call as the survey

**Proposal: the owner's sub-cell fog, made into a rule.**
- **The veil.** A place starts under a light veil, drawn with the existing fog
  table and 4×4 dither. Terrain shows through. Creatures, bushes and dew stay
  visible; hidden finds (buried pods, charged and warm stones) can't be found
  until unveiled.
- **Call unveils** every tile within 7 tiles of you: a 15×15 square, matching
  its ring. In a fog bank it reaches 3 tiles (**Decided:** Call is shortened
  there). Walking never unveils. A place of 28×32 tiles takes 4–6 well-placed
  Calls.
- **Quarters and clearing.** A place has four quarters of 14×16 tiles. A quarter
  is surveyed at 90% unveiled, and a cell is cleared when all four are. Things
  still there show as pips. The tick and the word "cleared" go; the picture is
  the meaning.
- **The overview** draws each visited cell in quarters, about 13 px each:
  dithered while unsurveyed, whole and bright when done. A located pod swaps its
  beat sign for a pip (owner request).
- **Call reports** what is left ("Surveyed · 1 dew, 1 fruit left"), never
  "Nothing here" while things are visible.

**Cost.** A few more actions per place, one lookup per tile when drawing, and a
4-bit mask per cell (fine on the ESP32). Places are already long (50–110
actions); shrinking them to about 20×24 tiles keeps a survey to 3–4 Calls.

**Alternative: no veil.** Draw a cleared cell with a bright frame instead of a
tick, and show Call's progress as four arcs on the HUD. It is cheaper, but Call
stays a one-off check and "cleared" stays an abstract word.

## 4. Completion and time

**Decided:** the field clock counts actions; no timers, no time sinks.

**Proposal: completion as a picture.**
- **A reach grid in the HUD corner:** one dot per reachable cell in range (5×5
  at tier 1, 9×9 at tier 2; 2 px dots, 1 px gaps). Hollow is unsurveyed, filled
  is surveyed, your cell is framed, and gated cells get no dot. "Everything in
  reach is explored" arrives as the last dot fills.
- **Totals.** Cargo reads "Surveyed 7 of 21 in reach"; the menu loses the
  action count.

**Proposal: time shows through things that move, never a counter.**
Wait says what changed ("The storm edges east · the hopper grazes again"), or
"Nothing is moving here", which ends pointless waiting honestly. Storm and fog
bank show their heading as ◀ or ▶ beside the bolts, and the map's edge triangle
gets a first-sighting line ("The storm moves this way"). Creature routines close
with a line ("The puffcap finished its meal"). No sun arc or day-part: light
that changes with the action count reads as a clock.

**Alternative: a day-part clock**, with morning, noon and evening every 40
actions, changing only the light. It gives a strong feeling of time, but it is
a timer in all but name and reads as "the day is ending".

## 5. Place edges

**Proposal: walking off an edge steps onto the neighbouring map cell** (one map
action), with the map in view and the pawn facing the way you walked. One
Confirm goes down into the next place, from the matching side. Past the range
edge or into an obstacle, you stay put with the usual bump line. No minimap:
the map shows at every crossing, and the reach grid (§4) always shows your
cell.

**Cost.** One extra press per crossing. The map stays where you choose by
signs, and range and clock rules stay as built.

**Alternative: seamless crossing into the next place.** The map is skipped at
crossings, so signs and fog weigh less. The range edge needs walls inside
places, neighbouring places must match at their borders (rivers, cliffs), which
is real generator work, and a minimap becomes necessary.

## 6. Fog of war and day/night

**Decided:** the fog bank is safe cover (creeping never startles, dew fills,
sweep and signs off, Call shortened). Night is an expedition type that needs a
glowing partner.

**Proposal: the fog bank limits sight in a place to 4 tiles.**
Beyond 4 tiles the terrain takes the fog table, and creatures, pods and fruit
aren't drawn (the prototype already dims sprites there; make it hide them). It
mirrors cover: they notice you late, you see them late. A glowtail partner
widens sight to 6 tiles. Rain, storm and fog in one cell stays possible, and
stray strikes stay off inside the bank.

**Proposal: no day/night cycle.** Night stays an expedition type you choose. It
will reuse the same sight rule (3 tiles, 6 with a glowing partner) and add
nocturnal routines later. A cycle within an expedition is a clock (§4). A cycle
across world turns makes Night a matter of luck instead of choice and partner.

**Alternative: add Night now.** It reuses the sight code, but adds a third type
to tune while Deep ground still fails in play (r4: no dig prompt at the
burrow).

## 7. Creature intent

**Proposal: four bubbles, each explained once in the line when first seen.**

| Bubble | Means | What to do |
| --- | --- | --- |
| **!** | Startled | Stop, or it runs |
| **?** | Curious | It will come closer |
| Fruit | It eats what you carry | Offer it, or put it down and back off |
| **…** and pips | Settling | Keep still (Wait) |

**Proposal: diet shows before a fruit is wasted.**
When a fruit drops, the line names who eats it ("A fruit drops · puffcaps eat
these", or "· no one here eats fruit"). While you carry fruit, eaters in view
show the fruit bubble for one action. Facing a non-eater gives "Glowtails don't
eat fruit" and spends nothing: refusal is never silent. Putting fruit down
explains it once ("Fruit down · eaters come when you back off"). Facing any
creature names its state and your options ("Hopper · watching you · bring fruit,
or Call"), never "Nothing here".

**Cost.** One bubble sprite (about 11×13) and line text; `eats` already exists.

## Decisions for the owner

1. **Energy.** Warm stones (+1 per world turn) with prices unchanged, or free
   identification?
2. **Survey.** Veiled places; Call unveils 15×15; cleared means all four
   quarters surveyed, drawn in quarters on the overview (tick removed)?
3. **Completion.** Reach dot grid, "Surveyed N of M", Wait reporting changes,
   no day-part clock?
4. **Edges.** Walking off a place steps onto the next map cell (no seamless
   crossing, no minimap)?
5. **Sight.** Fog bank sight of 4 tiles; Night a later expedition type; no
   day/night cycle?

## Build scope for the next prototype round

**Changes:**
- **Energy.** Warm stones (+1 per world turn when unstruck), drawn with a dim
  ring distinct from storm charge and from the strike warning.
- **Survey.** A per-tile veil lifted only by Call (radius 7, 3 in fog); a quarter
  mask per cell, surveyed at 90%; the overview draws quarters; a located pod's
  beat becomes a pip; Call reports what is left.
- **Completion.** The reach dot grid; "Surveyed N of M" in Cargo; no action count
  in the menu; Wait reports changes; a storm and fog heading mark and the
  edge-triangle line.
- **Edges.** Walking off a place lands on the neighbouring map cell, or bumps back.
- **Fog sight.** 4 tiles in a fog bank, 6 with a glowtail.
- **Creatures.** Four bubbles explained once, the fruit bubble on eaters, diet
  lines, and a line when facing a creature.
- **Fix the r4 defects these depend on:** the dig prompt at the burrow, beat
  signs on emptied cells, mismatched counts, and returning to the same world
  after the Station.

**Watch for in a playtest:**
- **Energy.** Does a calm expedition bring home 3–5 Energy, so pods stop
  waiting? Does the player still seek out storms?
- **Survey.** Is Call used to survey on purpose? Can players point at a fully
  surveyed cell unaided? Count Calls per place.
- **Completion.** Can they say how much of their reach is done? Does
  "Everything in reach is explored" ever appear? Is Wait still spammed?
- **Edges and fog.** Count presses per crossing; listen for "I want to walk
  straight on". Does the fog bank feel tense or merely blind?
- **Feeding.** How many fruits are wasted on non-eaters? Can players say what
  "!" and "?" mean?
