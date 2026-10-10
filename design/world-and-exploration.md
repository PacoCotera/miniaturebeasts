# World and exploration

Exploration is where curiosity starts. It supplies the pods every mibi comes from,
the materials the Station needs, and the places a grown partner helps the player
reach. The player sends the Companion's **Probe** out on **expeditions** across a
large, foggy world, goes down into the places they choose, and acts on creatures,
stones and weather to see what changes.

Status marks follow the [design README](README.md); **Built** means the
[exploration prototype](../prototypes/exploration/README.md) has it, with its
numbers as current tuning unless marked **Decided**. Players' rules are in the
[play manual](play-manual.md); controls and screens in [interaction](interaction.md).

## An expedition, in short

The player chooses a Weather expedition and places the Probe on a meadow at the
edge of known land. A dotted square shows how far the Probe reaches from there.
They walk the map east, lifting fog, and go down into a wood that shows a slow
beat. The wood lies under a veil; walking lifts it a little, and a Call lifts much
more: a buried pod glints, an Untuva comes closer, a Loika hides. They shake a
bush, set the fruit down and back off; the Untuva eats it (+2 Data, the first
time). A storm moves in. A warned strike charges a stone in the open: +2 Energy.
One more charge is a gamble on the Shield. They dig up the pod, walk off the
wood's edge onto the next cell, and head back to the start flag to send home. At
the Station the pod is identified and hatches; then the world turns once.

## The world

- **One map, two scales.** A large fogged world map holds places that come alive
  as living patches when played (**Decided**). One map cell is one place
  (**Decided**). The map is 16×20 cells; a place is 28×32 tiles of four land
  templates (meadow, pond edge, rock field, wood), plus a cave under a burrow
  (**Built**).
- **Open map.** The player moves freely and chooses where to go; no route, no
  roads-only movement (**Decided**). Wide water and cliffs block the map
  (**Built**).
- **Generated once, then permanent.** Each world is generated from a seed when
  the save starts and then persists: land, landmarks and obstacles change only by
  events and the player (**Decided**). Storage is the seed plus changes; places
  are rebuilt from them, never stored whole (**Built**). Hand-authored landmark
  templates are a **Proposal**.
- **The world turns once per expedition**, when it ends (**Decided**). Creatures
  roam within their habitat and have young; storms leave charged stones; new pods
  and warm stones arrive (**Built**). Floods and rockfalls are a **Proposal**.
- **Nothing refills; new things arrive** (**Decided**). Every find has its own
  identity; once taken it is gone. A pushed slab stays pushed, a shaken bush stays
  bare (**Built**).
- **The arrival guard.** New things, warm stones included, arrive only away from
  where the player just was: never in a place entered on the expedition that just
  ended (**Decided**; **Built** for warm stones).
- **The turn clock** ("T7") counts world turns from 1 (**Decided**) and flashes
  when the world turns (**Built**).
- **Fog lifts through progression**: walking, research, partners, items, Probe
  tiers and installed mods (**Decided** as direction). Walking lifts one ring of
  map cells around each step; a lightning strike on the map lights its cell; a
  lit beacon reveals 3 cells around (**Built**). Revealed land never closes
  (**Decided**).

## Expeditions

- **Start anywhere seen.** Any seen cell can be a starting point; placing the Probe
  reveals the cells around it, so a new game starts with nine cells (**Decided**).
  The very first start is chosen among glints (**Built**).
- **Reach.** Range is measured from the expedition's start: a dotted square on
  the map; stepping past it the Probe stops, "Edge of the Probe's range · tier 2
  reaches further" (**Decided**). 5×5 is the minimum reach, and a higher tier
  grants at least one more ring (**Decided**).

  | Probe | Reach from the start | Pods carried | Shield |
  | --- | --- | --- | --- |
  | Tier 1 | 2 cells, a 5×5 square (**Decided**) | 2 (**Decided**) | 3 bars (**Built**) |
  | Tier 2 | 4 cells, a 9×9 square (**Decided**) | 3 (**Decided**) | 4 bars, reads the deep "?" (**Built**) |

- **Expedition types** shape which events and finds turn up; basic materials
  appear at fairly steady rates (**Decided** as direction, three to five types in
  V1). Built: **Weather**, open to all, and **Deep ground**, which needs a digging
  partner and starts at the burrow (**Built**).
- **The field clock counts actions, not seconds.** The world moves only when the
  player moves or acts; no timers and no time sinks in the field (**Decided**).
  No day/night cycle and no day-part light (**Decided**).
- **Sending home** works only from the expedition's start cell (a flag on the
  map) or a lit outpost in reach (**Decided**). Elsewhere Send home is dimmed and
  the line names the nearest send point, "Start · about 2 cells" (**Built**).
  Cargo previews what the Station will do first (**Built**). Sending from an
  outpost ends the expedition exactly as from the start: no banking (**Decided**).
- **What ends an expedition** is the player's choice, pushed by a full hold, a
  fully explored reach, nothing refilling, the risk to what is carried, and a pod
  waiting at the Station (**Decided** as direction). Gathering is open-ended and
  the player manages what they carry; no loot filters (**Decided**).
- **A break.** When the Shield reaches 0 the expedition ends where the Probe is
  and nothing goes home (**Decided**). The pods carried drop at random spots in
  that place, the cell gets a skull on the map, and the skull goes once the cell
  is visited again (**Decided**). Carried Energy, Data and Essence are lost; pins,
  revealed land and what was learned stay (**Decided**). Repair at home is free
  (**Decided**). There is no paying to send from anywhere (**Decided**; a later
  upgrade, item or Companion feature is **Open**).
- **At the Station** the Shield is mended (1 Energy a bar, always to at least two
  bars: **Decided**), pods are identified, one is hatched if paid for, and the
  world turns (**Built**).

## The survey

- **The veil.** Every place starts under a veil: the ground shows through darker
  and dotted, creatures always show, but pods, fruit, stones and other finds on a
  veiled tile stay hidden (**Decided**). Facing one, Confirm reads "Veiled · Call to
  see" and spends nothing (**Built**). The cave has its own darkness instead
  (**Built**).
- **Walking lifts a short line of sight** through open ground; **Call lifts
  more**; what is lifted stays lifted (**Decided**). Walking lifts about 4 tiles,
  a Call a circle of 11 (6 in a fog bank) for one action; only Call hears what is
  buried and makes creatures react (**Built**).
- **Quarters.** A place has four quarters. A quarter is **surveyed** when every
  tile in it is uncovered; the map draws each visited cell in quarters, dotted
  while veiled, lightly dotted when almost done, whole once surveyed (**Decided**).
- **Explored** means visited and Called in at least once; **finished**
  ("surveyed · nothing to take") means surveyed, Called, nothing left (**Built**).
- **Call reports** how far the survey is and what is left, with directions: "Half
  surveyed · a pod east, a warm stone north-west"; a Call that finds Energy leads
  with "Energy nearby" (**Decided**). It never says "Nothing here" (**Built**).
- **Completion as a picture.** The HUD's reach grid has one dot per reachable
  cell: hollow, filled once explored, the current cell framed, no dot for cells
  that cannot be reached (**Decided**). When the last one fills, the grid turns
  bright with a tick and the line says "Everything in reach is explored"; Cargo
  reads "Explored N of M" (**Decided**). No action count anywhere (**Decided**).
- **The world turn veils again what changed**; an unchanged place stays
  surveyed (**Built**).
- **Wait** passes one action and says what changed, or "Nothing is moving here"
  (**Decided**).
- **Place edges.** Walking off an edge lands on the neighbouring map cell; one
  Confirm goes down into it; no minimap (**Decided**).

## Signs and map states

- **Cell states**: fog (never seen), seen (muted), visited (full colour, in
  quarters) (**Decided**). The map line names the current cell, its survey and
  the cell ahead: "meadow · half surveyed · Ahead: wood" (**Built**).
- **Five signs**, each explained the first time it shows: paw (tracks of a known
  species), slow beat (often a pod not yet found), bolt (stored Energy: filled for
  a storm charge, hollow for a warm stone found by Call), pin, and the gate's own
  shape (**Decided**). Signs on surveyed cells and inside a fog bank are hidden,
  except gates, pins, pods and Energy (**Built**). Signs show what was last seen
  and fade as turns pass (**Built**).
- **Pins.** Call on the map pins the current cell for 1 Energy (**Decided**).
  Call on your own pin removes it, refunding the Energy if placed this
  expedition; gates pin themselves for free (**Built**).
- **Markers**: a pod seen and left behind, the start flag, outposts (dark, or a
  flame showing the light left), lit and unlit beacons, and the skull of a break
  (**Built**). No trail is drawn (**Decided**).
- **Map views**: the reach view with a whole-world inset, and the full map as a
  menu entry (**Decided**); see [interaction](interaction.md#controls).

## Beacons and outposts

- **A beacon** is a stone post with a lamp in a place. Light it for 1 Energy to
  reveal the land 3 cells around on the map, beyond reach; the Probe stays where
  it stood, and the beacon stays lit on the map for good (**Decided**). Beacons
  stand at least 3 cells apart (**Built**).
- **An outpost** is a hut with a mast lamp, found by walking or Call (**Decided**).
  About six stand in a world, never two in one 5×5 area (**Built**).
- **Lit for 3 world turns.** Lighting costs 1 Energy and lasts the expedition it
  is lit on and the next two; the light changes only when the world turns, never
  during an expedition (**Decided**). A dark outpost can be relit for 1 Energy
  (**Decided**). No ruins and no new outposts for now (**Decided**). The light left
  shows as a flame in three sizes, then a dark hut (**Decided**); the world-turn
  lines say when one burns low or goes out (**Built**).
- **While lit** an outpost lets the player send home from its cell, mend the
  Shield, and gives shelter from storms (**Decided**). Mending costs 1 Energy a bar;
  shelter covers 3 tiles around it (**Built**). It reveals no land (**Decided**).

## Weather

- **Storms** are bands that cross the map, shown as 1 to 3 bolts with their
  heading; staying is a real gamble (**Decided**).
- **Warned strikes** aim at stones (or open ground near the Probe, never its own
  tile), the tile marked one action ahead. A struck stone holds +2 Energy, +3 at
  the peak (**Built**). The first hit of a storm pass is always a warned strike
  (**Decided**).
- **Stray strikes** can hit the Probe on any action spent in the open under rain:
  1 in 20 in strong rain, 1 in 10 at the peak, never two hits within six actions;
  a pass over a place lasts at most 20 actions (**Decided**). Each hit takes one
  Shield bar (**Decided**). On screen the odds are said in play language ("stray
  strikes can hit you in the open"); exact odds only in the Probe legend and the
  play manual (**Decided**).
- **Shelter** is an overhang, a cave or a lit outpost. **Trees are not shelter**,
  in a place or on the map: the game must not teach otherwise (**Decided**).
- **The Shield** takes the hits; 3 Energy patches one bar in the field (**Decided**).
- **Fog banks** are the storm's safe opposite: creeping never startles, so wary
  creatures take food by hand; dew cups refill; no stray strikes; the map sweep
  and signs stop; Call is shortened; sight is 4 tiles, 6 with a glowing partner
  (**Decided**). Its other numbers stay open to tuning.

## Materials

Three materials, gathered only by acts the player chooses (**Decided**). Each caps
at 20 carried; Essence never turns into Energy (**Built**).

| Material | What it is | Gathered from (**Decided**) | Amounts (**Built**) |
| --- | --- | --- | --- |
| **Energy** | Charge; in the field, the Probe's own | Storm-struck stones; warm stones | +2 (+3 at the peak); warm +1 |
| **Data** | Records of creatures doing things | Creature moments the player causes | +1, or +2 for a first |
| **Essence** | Living matter | Dew, pressed fruit, shed tufts | dew +1, fruit +2, tuft +1 |

- **Warm stones.** At each world turn an unstruck stone can hold a warm charge of
  +1 Energy, never more (**Decided**). They are not abundant: Energy, and pods,
  stay somewhat scarce (**Decided**). The sun warms 6 to 8 stones in reach, leaning
  toward the start, so a calm 15-minute walk brings home about 3 Energy
  (**Decided 2026-10-09**, [research economy](proposals/research-economy.md) §9;
  built at 3 to 5, which measured a median of 2); only Call finds one, and the map
  then marks it with a hollow bolt (**Built**). Every expedition starts with at
  least one Energy source in reach (**Built**).
- **Prices.** An unaffordable pod waits at the Station and says what it needs;
  a button never makes an action free (**Decided**).

| Where | Spend | Price (**Built** unless marked) |
| --- | --- | --- |
| Field | Pin | 1 Energy (**Decided**) |
| Field | Light a beacon; light or relight an outpost | 1 Energy (**Decided**) |
| Field | Patch one Shield bar / mend at a lit outpost | 3 / 1 Energy a bar |
| Station | Identify a pod | 1 Energy (the first pod ever free) |
| Station | Hatch a founder | 2 Energy + 4 Essence |
| Station | Grow now (the instant grow) | 1 Essence per 2 minutes left on the bud, rounded up (**Decided 2026-10-09**) |
| Station | A study | 2 Data |
| Station | Mend the Shield | 1 Energy a bar (**Decided**); a break free |
| Station | Tier 2 Probe | 12 Energy + 4 Data |

## Creatures

- **Wild mibis** are individuals with a home cell that react to the player; no
  wild capture for now (**Decided**).
- **Four bubbles**, one at a time, each explained once: **!** noticed you (stop, or
  it runs), **?** curious (it comes closer), **fruit** (it eats what you carry),
  **…** settling, with four dots filling (keep still) (**Decided**).
- **Approach.** Creeping (a tap) never startles a creature unless the Probe steps
  right next to it; walking (a hold) startles those that notice. A startled
  creature runs 3 tiles, stops and watches, and after 3 quiet actions goes back to
  its routine (**Built**). Call draws curious creatures and hides wary ones, and
  startles a settling one (**Decided**).
- **Feeding.** The sure way is to put the fruit down and back off about 3 tiles;
  an eater comes within a few quiet actions. Offering by hand works with a curious
  creature, a calming partner near, or inside a fog bank (**Built**).
- **Diet before you offer.** Facing an identified species names its diet
  ("Loika · eats fruit"); an unidentified one reads "Unknown creature · watch what
  it does" and can't be offered anything (**Built**). A fruit bubble marks eaters
  in view while the player carries fruit (**Decided**).
- **Moments.** Data comes only when a creature does something because of the
  player: eats their fruit, settles because they kept still (**Decided**). Each
  creature gives Data once per expedition; just looking earns nothing (**Built**).
- **Pods.** Samples are seed-pods: a pod shows its species if the player knows it,
  otherwise "unknown species"; its contents are found out at the Station
  (**Decided**). Pods lie buried or under slabs, or are shed by creatures (a
  Untuva after a full meal, a Tuikis that feels safe, a Loika shaking dry)
  (**Built**). A full hold offers a swap; the pod left behind stays and the map
  remembers it (**Built**).

## Partners and gates

- **Life stages.** A mibi is an **embryo** while incubating; a **juvenile** can be
  with the player in the Companion but doesn't join the Probe; an **adult**, the
  longest stage, helps on expeditions; an **elder** is still a partner, with
  shifted strengths and weaknesses (**Decided**). Juveniles grow up after 2 world
  turns and become elders after 6 more; elders calm and sniff twice as far and feel
  every stray strike, but are slow (**Built**).
- **The carried set.** Up to three mibis are with the player in the Companion.
  One at a time is the expedition partner, and only a grown one can be; a
  juvenile is never the partner. Choosing is one press between expeditions; it
  can't change during one. A partner is never hurt.
- **Partners are optional gates.** A partner opens events, map areas and
  expedition types otherwise unavailable, using its real abilities; without one the
  player still explores (**Decided**). Built abilities: the Tuikis digs narrow
  burrows and glows (full Call and wider sight in a fog bank); the Loika calms
  wary creatures; the Untuva sniffs out buried pods and flinches before stray
  strikes (**Built**). Abilities come from species for now; from traits later
  (**Proposal**).
- **Gates** are obstacles drawn as what they are, signed on the map, and not
  counted against the reach until they can be opened: a narrow hole (a digger),
  fast water (a swimmer), the deep "?" (a tier 2 Probe, which reads it once: a
  sealed pod rises) (**Built**). A first-time player without a partner reaches
  all starter content (**Decided**).

## Constraints that still hold

**Working rules**, consistent with the decisions:

- Arriving, looking, waiting and lifting fog award nothing.
- The first samples are reachable with a new player's tools; no rare-drop luck
  gates essential progress, and no checklist of places to visit.
- No real-world travel, hazard or phone required; field events can be fiction.
- The Station sees only what was sent home, never the map while the Probe is out.

## Open

- **Reach size tuning.** Completing a tier 1 reach takes about 540–850 actions for
  a quick player; whether the reach, or the count of cells in it, should shrink.
- **Place size.** At 28×32 tiles the walk through each place sets the pace; a
  smaller place is the main lever.
- **Stepping back** into an adjacent, already visited cell just outside the reach
  square: an idea to design.
- **Research "studies"**: what a study is and what it reveals (today a 2 Data
  placeholder at the Station).
- **The swimmer**: the fast-water gate has no species that opens it yet.
- **Night and Waterside** expedition types (Night needs a glowing partner, uses
  short sight and nocturnal routines); the rest of the three to five V1 types and
  about ten kinds of event.
- **Items, mods and Probe tier 3**; a clearer look for charged stones; bonded
  care on the active mibi screen (no needs or meters until care is designed).

## What was rejected

Three exploration presentations were rejected (**Decided**):

- a first-person, scenic view;
- screens built around header images;
- a top-down map drawn as one corridor (trailhead, marker, overlook, alcove),
  covered in labels.

The last one failed because the design it illustrated also specified a route.
Better screens could not fix it; the world and what the player does in it had to
be designed first.

Also set aside (**Decided**): a fresh world every expedition; one hand-built
world for everyone; seamless crossing between places; a day-part clock; a Probe
battery draining per step; sending from anywhere for a price; outposts that burn
out within an expedition or fall to ruin; banking at outposts; the map trail.
