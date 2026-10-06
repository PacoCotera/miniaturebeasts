# Exploration, round 2: purpose, stakes and progress

**Proposal.** This builds on the [combined design](exploration-options/combined-design.md)
and the round-3 rough playable (`prototypes/exploration/`). It answers seven
questions raised by the first owner play and the round-2 playtest. Lines marked
**Decided** restate owner decisions; everything else is a **Proposal**.

The target is an expedition where choices matter: what you gather has a purpose,
staying out is a gamble, the map opens up through progress rather than by
walking everywhere, and you always know what you have found and what is left.

## 1. The experience: one expedition

Expedition 4, Weather. The player has Pip, an adult hopper, as a partner, and
Dot, a juvenile glowtail, riding in the Companion. At the Station a puffcap pod
is waiting to hatch; it needs 2 more Essence. The Probe is tier 1: it reaches 2
cells from the start, has 3 shield and carries 2 pods.

1. **Start.** The player places the pawn on a seen cell at the edge of known
   land, beside the fog. A dotted square shows how far the Probe reaches from
   here. A storm band sits to the west.
2. **Map.** Walking east lifts the fog one ring around each step. The map shows
   at a glance which cells were only seen (muted), which were visited with
   something left (bright, with a white pip) and which are cleared (a tick). The
   bottom line names the cell ahead: "Ahead: wood · slow beat (often a pod)".
3. **Down into the wood.** The player presses **Call**, the new fourth button. A
   ring spreads out: a buried pod glints, two puffcaps show "?" and come closer,
   a hopper shows "!" and hides. Pip trots over to the player.
4. **A choice about fruit.** Shaking a bush drops a fruit. Pressing it gives 2
   Essence, exactly what the waiting pod needs. Instead the player puts it down
   and backs off three tiles. A puffcap comes and eats: "+2 Data · first time you
   saw a puffcap eat". Then the player presses a second fruit for the Essence and
   digs up the buried pod ("unknown species"). One pod slot is left.
5. **The storm.** The sky darkens and the HUD shows two bolts: "Strong storm · 1
   in 12 each action in the open". Lightning charges a stone in the clearing:
   +2 Energy. A stray strike hits the Probe: shield 2. The storm peaks (three
   bolts, 1 in 6). The stone is charged again, out in the open. The player risks
   one more action, takes +3, and stops at 5 Energy. A break would lose every
   unit carried.
6. **Back on the map.** The wood now shows a tick, because the Call found nothing
   more. A nearby cell shows a glowtail hole the player wants to try once Dot is
   grown. The player presses Call on the map to pin it, which costs 1 Energy.
7. **The edge.** The pawn bumps the range edge ("tier 2 reaches further"). Every
   cell in reach is visited, the storm has gone, and the line says "Nothing new
   until the world turns".
8. **Send home.** The Cargo screen previews what follows: "1 pod to identify ·
   puffcap pod can hatch". The puffcap hatches, the new pod turns out to be a
   glowtail, and the Probe's tier 2 bar fills a little. The world turns.
9. **Later, at home.** In Companion mode the player presses Call. Dot looks up
   and hops to the front of the screen; answering the call is part of a
   juvenile's first training.

## 2. Materials

**Decided:** supplies stay in the field and are needed for research. **Decided:**
three broad building blocks, whole units, fungible only within a class.

**Proposal: keep Energy, Data and Essence.** Change where each comes from, so
each one means something in genetics. **Energy** powers machines, **Data** is what the Station reads a genome
against, and **Essence** is what a body is grown from.

Every source is an interaction you choose, never a pickup you walk over.

| | Energy | Data | Essence |
| --- | --- | --- | --- |
| **What it is** | Charge. In the field it is the Probe's own charge | Records of creatures doing things. The Station matches behaviour to genome to learn what a stretch of genome does | Living matter: sap, dew, pulp, shed tufts |
| **Gathered by** | Drawing the charge from a stone after a strike (+2, +3 at a storm's peak). Mostly from storms | Causing a creature moment: it eats your fruit, settles, shakes dry or sheds because of you. +1 each, +2 the first time ever for that species and moment, once per creature per expedition | Taking dew from cups after rain (+1). Pressing a fruit instead of offering it (+2). Picking up the tuft a hopper leaves when it shakes dry (+1) |
| **Spent in the field** | Player pins (1). Patching the shield (3 for 1 bar) | Nothing | Nothing directly. The choice comes earlier: feed the fruit, or press it |
| **Spent at the Station** | Identifying a pod (1). Incubating (2). Probe upgrades | Research studies (2 each). Setting a researched trait at creation (+2). Probe upgrades | Growing a founder (4 for a small species; more for bigger or more complex bodies) |

**Starting prices, to tune.** An unedited founder costs about one expedition of
gathering: 4 Essence and 3 Energy. Probe tier 2 costs 12 Energy and 8 Data,
about three or four expeditions. A pod that can't be afforded waits at the
Station and says what it needs ("needs 2 more Essence"), which gives the next
expedition a purpose.

**Proposal: humming stones stop giving Data.** A stone has no genome to read.
They can stay as scenery, or be cut.

**Why this fits genomics.** Bigger bodies need more Essence. Complex genomes need
more Data to read, which matches "genomes grow more complex". Energy runs every
machine, and the Probe is one of them.

The screen says "+2 Data · first time you saw a puffcap eat", never
"observation". Looking still awards nothing: only moments you cause count.

**Alternative: keep today's sources** (humming stones for Data, dew for Essence,
stones for Energy) and add only the sinks above. It is cheaper to build, but Data
stays a token with no link to creatures or genomes. Feeding then earns nothing
beyond a possible pod.

## 3. Stakes: the storm gamble

**Decided:** staying in a storm is a real gamble with higher odds of damage.
Player pins cost something.

**Proposal: rename "hull" to "Shield".** It reads like a game, a child knows what
losing a shield means, and it ties to Energy, because Energy recharges it. The
three bars get a shield icon and the word "Shield" the first time.

**The odds.** A storm shows its strength as bolts on the HUD. A stray strike can
hit you on any action you spend in the open while it rains over you:

| Storm | HUD | Stray strike per action in the open | Charge per struck stone |
| --- | --- | --- | --- |
| Approaching | 1 bolt, no rain | none | none |
| Strong | 2 bolts | 1 in 12 | +2 |
| Peak (band centre, ~8 actions) | 3 bolts | 1 in 6 | +3 |

- **Shelter.** Under a canopy, an overhang or in a cave you are safe, but there
  is no charge there. On the map, wood cells count as shelter.
- **Warned strikes.** The strikes aimed at stones stay, warned one action ahead.
  They are the opportunity; stray strikes are the risk.
- **What a greedy player risks.** About 15 actions in a strong storm and 6 at its
  peak means roughly a 40% chance of losing all 3 bars. Staying is a real bet,
  and leaving or sheltering is always one step away.
- **Showing the odds.** The first strong storm says the odds in words once;
  after that, the bolt count carries them.

**When the Probe breaks** (shield 0): "The Probe breaks · your pods are safe".
The expedition ends where you are and the cargo goes home.
- **Lost:** every unit of Energy, Data and Essence carried this expedition.
- **Kept:** pods (they're sealed), pins, revealed land and what you learned.
- The world turns as usual, and the next expedition starts with a mended Probe
  at no cost, so a break never locks anyone out. The lesson: send home to bank
  your gains before you push your luck.

**Tie to pins.** The Energy you carry is the Probe's charge. Pins (1) and shield
patches (3) spend it, and whatever is left goes home. So a player who wants to
pin, or to patch the shield and stay out, has to charge up in a storm. Every unit
carried is also at stake.

**Partners** are never hurt. An adult with keen senses (puffcap) flinches one
action before a stray strike near you, turning some luck into reading your
partner. An elder senses every stray strike (§8).

**Alternative: a break also loses one pod, chosen at random.** It is a sharper
stake, but losing the main prize to luck will feel cruel to children. It also
pushes players to bank every single pod, which shortens expeditions.

## 4. Fog and map progress

**Decided:** Probe range limits how far an expedition reaches, and that is a
reason to upgrade. Any seen cell can be a start. Fog lifts through research,
partners, items, Probe tiers and mods.

**Proposal: range is measured from the expedition's start.** A dotted square
shows the edge on the map. Stepping past it bumps: "Edge of the Probe's range ·
tier 2 reaches further". Starts stay free, so each expedition pushes the frontier
outward by about range + 1 cells from known land.

| Probe tier | Range (cells from start) | Sweep while walking | Pods carried | Shield | Also |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 (a 5×5 area) | 1 ring | 2 | 3 | – |
| 2 | 4 (9×9) | 1 ring | 3 | 4 | Deep "?" can be read |
| 3 | 6 (13×13) | 2 rings | 4 | 5 | Later; not in the next build |

**Rate.** A tier 1 expedition can show at most 49 cells and in practice adds
15–25 new ones. On the prototype's 16×20 map, the land reachable on foot at tier
1 should take 6–8 expeditions to reveal; the last third needs tier 2 or a
partner, since water, cliffs and the burrow network stay gated. Clearing most of
the map in one expedition is no longer possible.

**What lifts fog beyond walking:**
- **Lightning.** A strike on the map lights its cell for good, even in fog: one
  more reason to stay out in a storm.
- **Survey cairn** (an item in a place). Climbing it reveals land for 3 cells
  around that cell, beyond range. You can see it but not reach it yet, so it
  gives the next expedition a destination.
- **Partner senses.** A glowing partner lifts one extra ring at Night; a keen
  nose shows tracks one ring into the fog.
- **Research.** It never reveals land. It makes signs appear on land you've
  already revealed (identified species leave tracks), as now.

**Alternative: range measured from the landing**, one fixed home cell. Progress
is easier to read, but it conflicts with starting anywhere seen, and the far map
would need camps.

## 5. Knowing where you stand

**Proposal: four cell states on the map,** told apart by shape as well as colour:

| State | Looks like | Means |
| --- | --- | --- |
| Fog | Cloud | Never seen |
| Seen | Land drawn muted, using the existing fade table | Swept from next door, never visited |
| Visited, something left | Full colour, plus a white pip per thing you saw but didn't take, up to 3 | A pod, fruit or charge is still there |
| Cleared | Full colour, plus a small tick | You visited, called, and took or used everything shown |

- **Clearing needs a Call.** A cell can be marked cleared only after a Call
  inside it has found nothing hidden. Calling is how you check.
- **Signs on cleared cells disappear,** which removes most of the clutter.

**Proposal: a minimal view of cargo and discoveries.**
- **HUD, always shown:** the shield bars; two pod outlines, filled with each
  pod's shell mark as you take pods; and the Energy number, because Energy is
  spent in the field. Data and Essence float "+2" when they change; their totals
  live in Cargo.
- **The Cargo screen** gains one strip, "This expedition": species met as tokens
  (an unknown one is a silhouette with "?", a new one has a dot), moments
  recorded, and one line, "In reach: 6 visited · 2 cleared · 3 seen". No log
  screen.

**Proposal: signs explain themselves.**
- **One picture per thing, and only five signs** on the map: paw (tracks); beat
  (a slow pulse, often a pod; today's "antenna with waves"); bolt (storm charge);
  pin; and the gate's own shape (narrow hole, fast water, deep "?"). Rings
  (supplies) leave the map; supplies are found inside places.
- **The line names what's ahead.** On the map it names the cell you stand on and
  the cell you face: "Ahead: wood · slow beat".
- **The first sighting of each sign** adds a short explanation once ("slow beat ·
  something pulses underground, often a pod"). After that, just the name.
- **No legend screen.** The legend on the Probe screen can stay, but play
  shouldn't need it.

**Alternative: a map cursor** (a mode-list entry, "Look around") that moves over
any revealed cell and names its state and signs. It is more complete, but it adds
a mode and costs presses for something the line can do for free.

## 6. Going home

**Decided:** the field clock counts actions; no timers and no time sinks.

**Proposal: an expedition ends when staying stops paying.** Five pressures, none
of them a clock:

1. **A full hold.** Tier 1 carries 2 pods. A third pod is turned away without
   being lost ("Hold full · swap, or send home"). Materials cap at 20 of each.
2. **Range.** Inside a 5×5 area, everything in reach gets visited and cleared.
   When nothing is left, the line says so: "Everything in reach is explored".
3. **Nothing refills.** **Decided:** the world turns once per expedition. New
   finds arrive only then, and the line says "Nothing new until the world turns".
4. **Banking.** What you carry is lost if the Probe breaks. The more you hold,
   the stronger the pull to send it home.
5. **The Station pulls.**
   Hatching costs Essence and Energy, so a pod waiting at home sends you out
   with a purpose. **Send home** moves into the mode list, one press from
   anywhere, and previews what follows ("1 pod to identify · puffcap pod can
   hatch"). The first pod ever taken adds one line: "Pods open at the Station ·
   send it home when you're ready".

Nothing selects itself or forces a return. A player can still wander, but cannot
gain more by wandering.

**Alternative: a Probe battery** that drains by one per map step and recharges
from Energy. It ties tightly to "charge the Probe in a storm", but it is an action
timer in all but name, and it punishes looking around.

## 7. The fourth button: Call

**Decided:** a fourth button only if it is also useful in Companion mode, and a
button doesn't make an action free.

**Proposal: add Call,** a whistle-shaped button beside Back and Confirm. It
always means "send a signal", and things answer it.

| Where | What Call does | Cost |
| --- | --- | --- |
| **In a place** (Probe) | The pulse (§8). Hidden finds glint. Curious creatures come, shy ones hide. Your partner comes to you and uses its ability on what you face | 1 action |
| **On the map** (Probe) | Places a pin on your cell, or removes your own pin there. Automatic gate pins stay free | 1 Energy; removing is free |
| **Companion mode** | Calls the riding mibi to the front of the screen; it answers in its own way. A juvenile learning to answer the call is part of its first training, and the same call later brings it on expeditions | Free |

Confirm stays the only act key: it acts on what you face, goes down on the map,
and does nothing on open ground ("Nothing here"). Wait stays in the mode list; it
is rare and deliberate, and a dedicated key would invite spamming.

**Alternative: no fourth button.** Pins become a mode-list entry, "Pin this
cell", costing 1 Energy; the pulse stays on Confirm on open ground. It costs no
hardware, but misfires stay possible, the partner has no command, and Companion
mode gains nothing.

## 8. Pulse, creatures and partners

**Proposal: keep the pulse as Call, with felt effects.**
- **Hidden finds glint** (buried pods, charged stones) and stay outlined until
  taken. Before, they glinted once and were easy to lose.
- **It completes the count,** so the map can mark the cell cleared (§5).
- **It is the lure** when you have no partner. Curious creatures ("?") walk
  toward you, bringing them into feeding range. Wary ones ("!") hide: that's the
  cost, along with startling a settling glowtail.
- **It commands your partner.** The partner comes, and if you face a gate or
  target it can handle, it acts.

**Alternative: cut the pulse** and scan on entry: hidden finds glint as you go
down. It is simpler, but loses the lure, the partner command and the deliberate
"check if anything's hidden".

**Proposal: approach and feeding without a partner.**
- **How you move matters.** Creeping (tap) never startles a creature unless you
  step next to it; walking (hold) startles anything within its notice range.
- **A warning before flight.** A creature shows "!" for one action before it
  flees, so you can stop.
- **Fleeing is short.** A creature runs 3 tiles, stops and watches. After 3
  quiet actions it goes back to what it was doing. It never runs off-screen.
- **Put it down and back off.** This is the reliable way. Set the fruit down and
  move 3 tiles away. An eating species comes within about 4 quiet actions and
  eats, unless something startles it. The line coaches once: "The puffcap eyes
  the fruit · back off".
- **Offering from your hand** works for curious creatures, or for any creature
  while a calming partner is near.
- **What feeding earns:** Data (§2), and for a puffcap a chance of a pod after
  its meal. Pressing the fruit for Essence is the other choice.

**Partners by life stage.** **Decided:** juveniles ride in the Companion but
don't join Probe expeditions; adults help; elders keep helping with shifted
strengths and weaknesses.

| Stage | On an expedition | Proposal |
| --- | --- | --- |
| Juvenile | Rides in the Companion, not the Probe | Learns to answer Call in Companion mode. A riding juvenile changes nothing in the Probe |
| Adult | Full partner | Its species ability (dig, calm, sniff) at full strength. Comes on Call |
| Elder | Partner | Wider senses: double calming and sniffing radius, and it feels every stray strike coming. Slow: trails two tiles behind and needs 2 actions to dig |

## 9. Fog bank

Today the fog bank only changes the picture: it dims the place and stops the map
sweep. **Proposal: make it the storm's opposite, a safe event that trades
sight for closeness.**

- **Cover.** Inside the bank, creatures notice you 2 tiles later (as now), and
  creeping never startles even wary ones. You can hand-feed a wary creature
  without a partner, and the moments you cause earn Data as usual. Fog gives
  nothing for being in it.
- **Wet air.** Dew cups fill while the bank is over a place, as after rain;
  taking the dew (Confirm) gives Essence. Fog is the steady Essence event, as
  storms are the Energy event.
- **Blindness.** Inside the bank the map sweep stops, so no fog lifts, and
  signs there are hidden. Call reaches 3 tiles instead of 7, and a muffled Call
  can't mark a cell cleared. A glowing partner restores the full Call.
- **No Shield risk.** Leaving is free, and the bank drifts with the field clock.
  Nothing makes you wait for it; you act inside it or walk out.
- **The choice.** In a fog bank you can see and map less, but you get closer to
  creatures and gather Essence. Do you go in or go around?

**Cost.** One new rule (creeping in fog never startles) and dew refilling under
fog, both small. It may make feeding too easy; watch how often a partner's
calming still matters.

**Alternative: cut the fog bank for this round.** Weather expeditions become
storm-only. It saves build and tuning time and keeps the playtest focused on the
storm gamble. The cost is less variety between expeditions, and nothing to show
Essence as its own weather event yet.

## Decisions for the owner

1. **Materials.** Keep Energy, Data and Essence, with Data coming from creature
   moments you cause and humming stones retired as a source? Or keep today's
   sources and only add sinks?
2. **Station prices.** Should hatching a founder cost 4 Essence and 3 Energy, so
   an unaffordable pod waits and says what it needs?
3. **Shield.** Rename "hull" to "Shield", let 3 Energy patch 1 bar in the field,
   and show storm odds as 1–3 bolts (1 in 12, then 1 in 6 in the open)?
4. **Breaking.** Does a broken Probe lose every unit of Energy, Data and Essence
   carried but keep pods, with no repair cost? Or does it also lose one pod?
5. **Fourth button.** Add Call: pulse in a place, a pin for 1 Energy on the map,
   and calling the riding mibi in Companion mode? Or no button, with pins in the
   mode list?
6. **Reach and hold.** Tier 1 reaches 2 cells from the start and carries 2 pods
   (tier 2: 4 cells, 3 pods). Is that the right size for an expedition?
7. **Fog bank.** Make it a safe cover event (wary creatures approachable, dew for
   Essence, sight and Call cut to 3 tiles), or cut it for this round?

## Build scope for the next prototype round

**Changes:**
- **Materials.** Data from caused creature moments (+1, +2 the first time);
  humming stones no longer give it. Pressing a fruit gives 2 Essence, hopper
  tufts 1. Energy carried is the Probe's charge. The Station stand-in charges for
  identifying, hatching and the tier 2 upgrade; unaffordable pods wait.
- **Storm.** Bolts on the HUD; stray strikes at 1 in 12 and 1 in 6 in the open,
  none in shelter; +3 charge at the peak; lightning reveals map cells. Shield
  replaces hull, with a 3-Energy patch. A break loses carried materials, keeps pods.
- **Range and tiers.** A range square from the start with an edge bump. Tiers 1
  and 2 as in the table; the tier 2 upgrade reads the deep "?".
- **Map states.** Seen, visited-with-pips and cleared (needs a Call); five signs
  only; the line names the cell ahead and explains each sign once.
- **Cargo.** Pod outlines and Energy on the HUD; a "This expedition" strip and an
  "In reach" line; Send home in the mode list, with a preview.
- **Call.** A fourth key (C on the keyboard, a whistle button on the shell): the
  pulse, the partner command, map pins at 1 Energy, and the riding mibi on the
  Companions screen. Confirm on open ground does nothing.
- **Creatures.** A one-action "!" before fleeing, short flight, put-down feeding,
  the curious response to Call.
- **Partners.** An optional elder flag (slow, keen); juveniles selectable as
  riders only. Save format v5; older saves are discarded.
- **Fog bank.** Creeping never startles inside it, dew cups refill under it, no
  sweep and hidden signs inside it, Call at 3 tiles with no clearing.

**Watch for in a playtest:**
- **Length.** Do expeditions end on their own (about 60–150 actions), and does
  the player send home within the first two? Note the reason given for ending.
- **Storm.** Does the player stay "for one more charge", and can they say the
  odds? Aim for breaks in about 1 in 4 storm expeditions, not 0 and not most.
- **Purpose.** Can the player say what each material is for? Do they choose
  between feeding and pressing a fruit on purpose?
- **Map.** Can they point at a cleared cell and one with something left? Does
  the map still look cluttered? How many new cells per expedition, and does the
  range edge make them want tier 2 or feel like a wall?
- **Call.** Pressed for a reason (luring, checking, commanding) or spammed? Do
  pins get placed and revisited? How many tries does the first feed without a
  partner take?
