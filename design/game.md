# The game

Miniature Beasts is a game about bringing something mysterious home, finding out
what it could become, and living with the creature that results. Players explore
on a portable Companion, carry samples back to a home Station, learn what those
samples' inherited traits can do, create a mibi, and, if they choose, raise it and
breed families within its species. Each part gives the others a reason: a trip
feeds the research bench, research leads to a new pet, and that pet and its family
give the next trip a purpose.

Underneath, it runs on a real genetics system. Appearance and abilities follow
inherited traits, and the player can learn how through pictures, comparison and
consequences, or go all the way down to the loci and the rules.

**How this page is built.** It is written for the designers, artists and developers who make the game, in the order they need it. It opens with the **pillars**, the few things the game must always be, which settle arguments, and the **rules** every mechanic keeps. Then it covers the **loop**, the moment-to-moment play and its verbs, and the **systems** that loop runs on. After that come the **economy** that paces them, the **progression** that makes them add up, **engagement** (why players come back, and what we refuse to do to make them), and the **devices**, where all of it is played. It ends with the **mechanics reference** and the **open questions**. Each section says what the game does and why, and links to the document that holds the rules and numbers. When something here and a rules document disagree, the rules document is fixed. The game is a prototype and changes as it is played; the direction of the game's owner overrides anything on this page.

## Who it is for: two motivations, often in one person

The game serves two motivations, not two kinds of player:
- **The cozy motivation is about the feel.** It is the warmth of a home full of life, the walk, the reveal, a name, a creature that is yours.
- **The intellectual motivation is about the mechanics underneath.** It is how traits are carried and inherited, what a cross will give, how the world and the machines work.

One person moves between them, often within a single sitting. They come home for the feel, notice something odd about a coat, want to know why, and end up planning a cross three generations deep. Then they enjoy the result as a pet. The game is designed for that movement, not for a segment.

That is why the effort goes to both sides. The art and the loop carry the feel. The genome framework, the breeding mechanics and the hardware carry the depth, and the hardware carries the feel as well, in the dock's ritual and the keys in the hand.

**What serving both means:**
- **Each motivation gets a whole game.** A player who never opens a detail view has a complete, rewarding game. So does a player who reads every locus. Neither is the "real" game, with the other a reduced version of it.
- **One truth, two depths.** Both see the same facts. The feel layer shows them as pictures, the mechanics layer as rules and values. The surface never says anything the depth contradicts, and the depth never holds a secret that changes the surface.
- **Every surface has a way down, and every depth pays off on the surface.** A look the player loves invites the question "how do I get more of it?" A cross worked out on paper arrives as a living mibi with a name.
- **Neither motivation is taxed by the other.** The cozy side never has to learn notation or optimise. The mechanics side is never blocked by ceremony or told "it's magic".

It is never a text-heavy school lesson, and never childish, in tone or in reward. It is a sandbox: a pretty mibi, a rare one and a capable one are all valid goals.

## Pillars

Every design decision is checked against these four. A feature that serves none of them is cut; a feature that breaks one needs a very good reason.

1. **Discover something alive.** The world is full of creatures and secrets, and the player finds them by going out and looking. Exploration rewards curiosity, never reflexes. *Rules out:* combat, timed challenges, grinding for drops. *The feel:* living places, the walk, the find. *The mechanics:* a world with rules the player can read (the weather, the turn, what each place holds).
2. **Author life you understand.** The player reads real genetics as pictures and shapes a creature from what a pod really carries. Every result is explained by what was inherited, never by luck at the moment of creation. *Rules out:* random rolls on creation, hidden stats, notation the player must learn. *The feel:* turning a gene and watching the body answer. *The mechanics:* every locus, its copies and its inheritance, inspectable and true.
3. **Live with what you made.** Each mibi is an individual with a name, an origin and a family. It grows, walks with you, opens places and has children. Attachment comes from its story. *Rules out:* disposable units, rarity tiers as the point, mibis as currency. *The feel:* a name, a home and a bond. *The mechanics:* a pedigree, and a line that carries what you bred into it.
4. **Respect the player's time.** The game rewards attention and never demands attendance. Nothing is lost by being away, and every choice is shown before it is made. *Rules out:* decay, streaks, FOMO, paid speed or randomness, hidden costs. *The feel:* coming back is a pleasure, never a chore. *The mechanics:* a long plan is never broken by being away.

## The rules every mechanic keeps

These hold across every system, below the pillars.

- **One truth, two depths.** Every system has a surface that is good to feel and a depth that is good to understand. The surface is complete without the depth, the depth is one press from the surface, and both describe the same facts.
- **Curiosity must be actionable.** Show enough of a place, creature or clue to
  support a choice. Variety must change what you can do or what happens, not just
  the scenery or the wait.
- **Discoveries accumulate.** Findings, origins and learned possibilities are kept.
  Running out of supplies changes what you can afford, never what you know.
  Looking again is always free.
- **Explain by showing.** Players compare, see the result of an action and
  recognize individuals. Short text covers uncertainty and cost. No chemistry
  lessons, quizzes or hidden-answer puzzles.
- **Variety must still make good pets.** Every result must be coherent, viable and
  appealing. Rare, complex, powerful and personally loved are different kinds of
  value, all valid goals.
- **Commitments are deliberate.** Browsing, previewing and docking spend nothing.
  Before anything is spent or created, the player sees what, with what, and what
  follows.
- **Reward attention without demanding attendance.** A glance should show what
  matters. No punishment for being away, and no reflex challenges.
- **Players choose their goals.** An attractive pet, an unusual ability, a complete
  collection and a beloved lineage are equally valid. Performance is not the only
  measure.
- **Any wait has a purpose.** A minigame must add a decision or a discovery, not
  an input ritual. Waiting never happens in exploration, the most interactive part;
  if the game has waits, they belong to research or incubation running in the
  background.

## The core loop

One trip and what comes of it: **go out, bring something home, find out what it is, make a mibi from it, live with it.** Each step is a verb the player does, on a device:

```mermaid
flowchart TD
  Explore[Explore the world on the Companion] --> Gather[Deliberately collect samples and supplies]
  Gather --> Return[Send the cargo home; the Station accepts it once]
  Return --> Identify[Identify the sample's species]
  Identify --> Create[Create a founder: unedited, or with researched changes]
  Identify --> Research[Optionally research what the sample carries]
  Research --> Create
  Create --> Open[Incubate, then open to meet that same mibi]
  Open --> Live[Keep it, or bond with it and raise it]
  Live --> Help[A bonded partner helps you reach new places]
  Live --> Breed[Breed within the species for new individuals]
  Help --> Purpose[A new question, need or species to pursue]
  Breed --> Purpose
  Purpose --> Explore
```

| Step | The player… | Device | Pillar |
| --- | --- | --- | --- |
| Explore | picks a start, walks the reach, calls, reads the weather, enters places | Companion | 1 |
| Gather | digs up pods, gathers materials, causes creature moments for Data, lights outposts and beacons | Companion | 1 |
| Send home | ends the expedition; the hold seals into a crate; docking brings it home | Companion, Caddy | 1, 4 |
| Open | opens the bay, crate by crate | Station | 1 |
| Identify and read | breaks a pod's seal, reads chapters, follows glints, compares | Station | 2 |
| Shape and grow | turns genes, sees the founder change, grows it | Station | 2 |
| Incubate and hatch | checks on the candled pod, sees what clears, opens it | Station | 2, 3 |
| Live | names, greets, tends, takes mibis out, returns them to the wild | Station, Companion | 3 |
| Partner | brings a grown mibi on the next trip; it opens places and finds | Companion | 1, 3 |
| Cross | pairs two adults toward a wish; reads the forecast | Station | 2, 3 |

**Both motivations in one loop.** The loop is the same for everyone, but each step has a quick way through and a deep one:
- **Identify and read:** grow a pod unedited in one press, or read every chapter and follow every glint.
- **Shape and grow:** turn genes until the founder looks right, or plan a founder for the cross it will make later.
- **Live:** name it and keep it company, or watch whether the cross came out as forecast.

Neither way through is the right one, and a player takes whichever suits them today.

**The arcs around the loop.** The loop repeats inside longer arcs, each with its own question: the **trip** (what's out there?), the **pod** (what does it carry?), the **mibi** (who is this one?), the **species** (what looks can it have?), the **family** (can I breed what I imagine?) and the **world** (what changed while I was away?). Every arc is optional except the trip. A player who only explores and hatches is playing the game.

## Systems

The loop runs on these systems. Each has one purpose; its rules are in the linked document.

| System | Its purpose | What it takes in, and what it gives | Rules |
| --- | --- | --- | --- |
| **World and exploration** | A living, fogged world worth walking | Probe reach and Shield in; pods, materials, finds, Data, map knowledge out. The world turns once per expedition | [World and exploration](world-and-exploration.md) |
| **The Probe** | The player's reach and risk | Mending and upgrades in; reach, pod capacity and survival out | [World and exploration](world-and-exploration.md) |
| **Cargo** | The trip coming home as an event | The sealed hold in; crates opened once at the Station | [Architecture](architecture.md) |
| **Research** | Knowing what a pod carries | Data in; chapters read, glints, the field guide out | [Research and breeding](research-and-breeding.md) |
| **Creation** | Making one fixed founder from one pod | An identified pod, Energy, Essence and Data in; a committed genome out | [Research and breeding](research-and-breeding.md) |
| **Incubation** | The wait between choice and meeting | A bud in; time, reveals and a hatch out; Grow now spends Essence for time | [Research and breeding](research-and-breeding.md) |
| **Life** | Mibis as individuals over time | Growth stages, care, bonding, the carried set, partners, self-changing traits | This page's table below; [Genomics](creatures-and-genomics.md) |
| **Breeding** | Families toward a wish | Two adults, Energy and Essence in; one child with real parents out | [Research and breeding](research-and-breeding.md), [Genomics](creatures-and-genomics.md) |
| **Genomics** | The truth underneath everything | Species frames, loci, copies, inheritance; never required as notation; letters only in the detail view, one press away | [Genomics](creatures-and-genomics.md) |
| **Collection** | The record of what the player knows | The Library and field guides, wishes, portraits earned by research | [Research and breeding](research-and-breeding.md) |

**What each system offers each motivation:**

| System | The feel | The mechanics |
| --- | --- | --- |
| World and exploration | a living place to walk, finds, creature moments | the turn, the weather and what each place kind holds |
| Research | the glint, a chapter clearing, a picture of a look | the chapters, copies and loci; the field guide as a dataset |
| Creation | the founder changing under the player's hand | which copies a pod carries, and which to fix |
| Incubation | the candled pod, the reveal, the hatch | the same individual, never a reroll; what clears as it grows |
| Life | a name, a home, care, a partner on walks | growth stages, self-changing traits and their triggers |
| Breeding | a child, a family, a wish coming true | the forecast, kinship, hidden copies surfacing |
| Collection | the Library filling, portraits arriving | complete field guides, every look found |

**How the systems connect.** Exploration feeds research (pods, Data). Research feeds creation (read genes can be shaped). Creation feeds life (a mibi). Life feeds exploration (partners open places) and breeding (adults cross). Breeding feeds research (children to read) and collection (looks never seen). Every system both receives and gives, so no part of the game is a dead end.

## Economy

Three supplies pace the game. Each has one job, so the player learns what each is for by using it.

| Supply | Its job | Comes from | Spent on | The pressure it creates |
| --- | --- | --- | --- | --- |
| **Energy** (bolt) | runs the machines | charged and warm stones, found and caused in the world | growing, crossing, mending, upgrading, lighting outposts | The scarce one: it makes the player choose between growing now and preparing the next trip |
| **Data** (diamond) | buys knowledge | creature moments the player causes; a little each day at the bench | identifying, reading, shaping | Where curiosity goes: read this pod or that one; the glint says where it's worth it |
| **Essence** (drop) | builds bodies | dew, pressed fruit, tufts; returning pods and mibis to the wild | growing, crossing, Grow now | The body budget: more mibis or faster ones |

- **Knowledge never costs twice.** What is read stays read; looking again is free.
- **Running out limits what you can do, never what you know.**
- **Time is a resource the player can trade for Essence,** never for money.
- **Nothing in the economy is ever sold.** The paid cloud layer adds services, never supplies, speed or randomness.
- Prices and waits are set low so the loop can be played through quickly. Their final pacing is an open question.

## Progression

Progression is the world and the collection getting richer, never levels, experience or scores. The only numbers on screen are prices, supplies and the turn figure ("Turn 5"). The same play moves both motivations forward. A player who spent a month on the feel and turns to the mechanics finds their field guides already half full, and a breeder who turns to the feel finds a vivarium of mibis with names and histories. Switching never means starting over.

| What grows | How the player sees it |
| --- | --- |
| **Knowledge** | pods' rings fill chapter by chapter; species' field guides fill look by look; the Library's frames go from empty to met to found |
| **The collection** | the vivarium fills; mibis grow from juvenile to adult to elder |
| **Capability** | the Probe's tier (reach and capacity); partners that open places and finds; outposts and beacons lit |
| **The world** | the map clears of fog; the world turns, with consequences the player can read |
| **Lineage** | families traced across generations; a wish coming closer as its pieces light up |
| **Recognition** | portraits earned by research, arriving as an event |

## Engagement

### Why players come back

| Span | The pull of the feel | The pull of the mechanics |
| --- | --- | --- |
| **Minutes** | a bud's next reveal; crates waiting in the bay | a chapter clearing; what a glint was pointing at |
| **A day** | a trip to take; a young mibi growing up | the bench's small daily Data; a partner's self-changing trait moving after a trip |
| **Weeks and longer** | a place a grown partner can open; a portrait on its way | a field guide nearly complete; a wish one generation away |

The Station shows what is new or ready at a glance, from Home and Idle, so the reason to come back is visible without opening anything. The return is always to something new, never to repair a loss.

### The hooks we use

- **The curiosity gap, honestly paid.** A sealed pod, a frosted chapter, a glint that says "something new is here" but never what. The answer is fixed when the pod is found; reading reveals, it never rolls. (The opposite of a loot box.)
- **Authorship.** The player shapes their founder and sees it change under their hand. People care most about what they made.
- **Ownership and origin.** Every mibi has a name, a pod it came from and a place where that pod was found.
- **Collection with meaning.** Each field guide entry is something the player found and understood.
- **Mastery of a real system.** Learning the genetics makes better breeding; the game teaches by results.
- **A gentle appointment.** A bud grows in real time and rewards each visit with a reveal.
- **Goals the player sets.** The wish turns the player's dream mibi into a long goal the game helps with.
- **Physical ritual.** Docking makes three devices react together; the trip comes home as an event.
- **The bridge between the two.** A look the player loves is the most common way into the mechanics, and a mibi bred to a plan is the most common way back to the feel. Both crossings are invited, never forced: a glint, a wish, a forecast picture, a resident with its own story.

References for these patterns, not to copy: the check-in pleasure of *Neko Atsume*, the genetic pets of *Creatures*, and the partner bond of the *Pokémon* games, without their battling.

### The hooks we refuse

- **Punishing absence:** nothing dies, sickens, decays or leaves while the player is away (the Tamagotchi pattern).
- **Streaks and daily-login rewards.**
- **Fear of missing out:** no limited-time events, vanishing offers or countdowns to loss.
- **Paid randomness and paid speed.**
- **Nagging:** the devices signal what is new; they never hurry, scold or guilt.
- **Comparison pressure:** no global rankings and no "first to find".
- **Manipulative choices:** no pre-ticked options, no shaming the "no", no hidden cost.

## Devices and interactions

**Three devices, one world.** Each does what only it can:
- **The Companion** is for going out. Play there is active and in the moment: the place, the pawn, the creatures, the mibis walking with you.
- **The Station** is home. Play there is reflective: reading, shaping, growing, living with mibis and deciding with time to think.
- **The Caddy** is the bridge. It charges both handhelds, carries the cargo across at the dock, and prints.

**The dock is the shared moment.** When the Companion docks, all three react in step and the trip comes home as an event. Cargo moves only then, and nothing is accepted until the player opens it.

**Input.** Both handhelds use a few physical keys, and each means one thing everywhere. The pad moves (and on Create turns the focused gene). ✓ does exactly what the bottom line says. ← goes back. The Companion adds Call, which sends a signal that things answer. The Station adds room keys that jump to Home, Research, the Library and the Vivarium. Details are in [Interaction](interaction.md).

**How decisions are communicated.**
- **Browsing is free.** Looking, comparing and previewing never spend.
- **Every choice shows its options, its cost and its outcome before the press,** with the outcome as a picture.
- **Only real decisions ask.** A spend, a commitment, something irreversible or a fork opens a decision panel. Everything else is one press with no confirmation.
- **Irreversible is said once, plainly.** It is never asked twice and never meant to frighten.
- **The player chooses where they land.** No choice drops them somewhere they didn't pick.

## Feel and tone

A naturalist's expedition that ends in a home full of life: curious, unhurried and warm, a hobby you return to rather than a job. The look and the voice are in [art direction](art-direction.md), "The look and feel".

## What it is not

- Not a care chore: no needs meters, decay or guilt.
- Not a slot machine: no paid randomness, and no randomness at the moment of creation.
- Not a lesson: no quizzes, no required notation, no wall of text.
- Not a race or a ladder: no leaderboards and no punishing timers.
- Not a battler: mibis are companions and partners, never fighters ranked by power.
- Not childish: never babyish in tone, art or reward.
- Not a veneer: nothing on a mibi is decoration its genome doesn't explain, and the depth is complete for a player who wants it.

## Mechanics

| Mechanic | How it works |
| --- | --- |
| **Exploration** | A fogged world map of living places that turns once per expedition. The player starts on any cell they can see; the Probe's tier sets the reach; walking and Call survey a place; storms, fog banks, outposts and beacons shape the trip ([world and exploration](world-and-exploration.md)) |
| **Gathering** | Collecting is deliberate, in whole items. A full hold offers a swap, and nothing is lost. The Probe carries 2 pods at tier 1 and 3 at tier 2, and up to 20 of each material |
| **Return** | End expedition works only on the start cell or a lit outpost, and it ends the expedition. It seals the hold into a crate that travels in the Companion's bay until it docks; the player may keep exploring with crates aboard. The Station opens each crate exactly once. A break sends nothing home: the pods drop where the Probe broke |
| **Identification** | Shows the species, not the pod's hidden traits; an identified pod can be grown unedited ([research and breeding](research-and-breeding.md#identify)) |
| **Research** | Optional, and the core of play. A chapter at a time, as pictures; glints say where something new is; findings are kept; sealed chapters open with finds ([research and breeding](research-and-breeding.md#reading-a-chapter)) |
| **Creation** | One pod makes one fixed founder, unedited or shaped among the copies that pod carries ([research and breeding](research-and-breeding.md#creating-a-founder)) |
| **Incubation** | Reveals the same individual, never a reroll; Grow now shortens the wait for Essence; opening is a press ([research and breeding](research-and-breeding.md#the-bud)) |
| **Life and bonding** | A mibi grows from an embryo in the bud into a juvenile, an adult and an elder. Care happens only on the Companion: **Tend** works on any carried mibi once a day, and a few Tends (three) bond it; expeditions turn the world, and a walk neither grows nor bonds a mibi. An unbonded juvenile grows on the clock; a bonded juvenile grows through care, and waits at home, not growing, until it is carried and tended. Missing care loses nothing. There is no limit on bonds, and a bond is never lost. Bonding is not needed to breed. A bonded mibi cannot be returned to the wild |
| **Partners** | The Companion carries up to three mibis. One of them at a time is the partner on expeditions: an adult or elder, never a juvenile. Partners use their species' abilities to open events, places and finds. They gate the higher tiers of exploring and never block exploring alone ([world and exploration](world-and-exploration.md#partners-and-gates)) |
| **Breeding** | Two adults or elders of one species make one child with real parents; the forecast shows pictures of what is read; a wish guides it ([research and breeding](research-and-breeding.md#the-cross), [genomics](creatures-and-genomics.md)) |
| **Supplies** | Three supplies in whole units, each spent for its function: Energy runs the machines, Data reads genomes, Essence grows bodies. Energy comes from struck and warm stones and stays scarce; Data from creature moments the player causes; Essence from dew, pressed fruit and tufts ([world and exploration](world-and-exploration.md#materials), [research and breeding](research-and-breeding.md#data-and-the-other-supplies)) |
| **The vivarium** | *Decided, not yet built.* The vivarium is a set of rooms of eight living mibis each. The player starts with one room; more rooms cost 4, 8 and 12 Energy, up to four rooms, so 32 living mibis at most. Crosses and moves between rooms are free, and the Library keeps every mibi ever bred. Returning an unbonded mibi to the wild frees its place at once and gives 2 Essence; a young mibi may be returned too, and a bonded mibi may not (a bond is for good). A returned mibi leaves one shed pod, made from the mibi's own two copies, found on an expedition at least two world turns later (for a young mibi, once it would have grown up). *The current build still keeps six places at the start, with upgrades of two at a time up to twelve.* |
| **Crafting** | Discovery with clues. Recipes are personal once learned; a failure wastes the ingredients or returns a fraction. It runs deep over the long term and stays simple at first |
| **Wild capture** | Not in the game |
| **Upgrades** | Tiered upgrades for the Station, the Probe and the Companion. The tier 2 Probe reaches further and carries 3 pods. The Station takes virtual research chips, which are found, crafted or traded; whether some mibis drop them, and which, is not designed yet |
| **Sharing and paper** | One household kit serves several players, each with their own progress. Sampling someone else's mibi needs its owner's consent. There is no global ranking of who found something first. A mibi's stamp and its code can be shared; a scanned stamp shows what its keeper has read, and never creates or moves a mibi ([research and breeding](research-and-breeding.md#stamps-and-scans)). Only portrayed mibis can be traded |
| **Online play** | The kit plays standalone, with no account or internet. The cloud is an optional, paid layer on top, never needed to play |

## Not designed yet

- What bonding involves and gives the player beyond growth, what care looks like, what missing it means, and how
  long a mibi lives.
- Which ability each species brings as a partner, and how traits shape it. This carries the mibi arc's "what can it do with me?": until it is designed, a mibi has no payoff on the Companion beyond company.
- Fertility. A cross of two valid parents always builds: failure is made unreachable in the framework and tested for every species, so no failed-cross screen is designed.
- **The mechanics player's tools beyond the detail view:** how far the forecast shows odds, and whether pedigrees and kinship are drawn. They must stay one press from the surface, never on it.
- What crafting makes: its recipes, feed and habitat items.
- Probe tiers beyond 2, mods, chip slots and Station upgrades.
- The cloud layer's contents: sync, an exchange, mini-games, lineage and
  printer play.
- The real transfer of crates between devices.
- Research and breeding's open questions, prices among them, are in
  [research and breeding](research-and-breeding.md#not-designed-yet).
- Vivariums beyond the first as living ecosystems: food, light and environmental constraints that shape a mibi population.
- **The long term:** what a player does after completing a field guide or reaching a wish, beyond new species in drops.
- **The first session:** how a new player meets the loop, and how soon their first mibi arrives.
- **Printing in play:** whether the Caddy's print and scan are part of play or keepsakes only.
- **The economy's pacing** in the finished game.
- **The pod a returned mibi's place sheds:** chosen, not built yet. It is a new genome drawn from the mibi's own two copies, by an explicit selfing path at a fixed, mild kinship, and redrawn if it would copy the parent. Its origin records the mibi as both parents. It carries no self-changing mark and is identified and read like any pod. When the place sheds it is not designed yet.
