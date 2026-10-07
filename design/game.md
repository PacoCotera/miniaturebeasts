# The game

Miniature Beasts is a game about bringing something mysterious home, finding out
what it could become, and living with the creature that results. Players explore
on a portable Companion, carry samples back to a home Station, learn what those
samples' inherited traits can do, create a mibi, and, if they choose, raise it and
breed families within its species. Each part gives the others a reason: a trip
feeds the research bench, research leads to a new pet, and that pet and its family
give the next trip a purpose.

It is also a genetics toy. Appearance and abilities follow inherited traits, and
the player learns how through pictures, comparison and consequences rather than
lessons or notation.

**Decided:** it should work for two audiences at once. Children explore, uncover
and pursue possibilities visually, without needing genetics vocabulary; loci stay
under the hood. Curious parents and STEM enthusiasts can dig into a real genetics
framework underneath. It is a sandbox: players choose their own goals.

## The loop

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

This is the intended shape. Its main steps come from decisions: open-map
exploration, optional research, one fixed founder per creation, optional bonding,
partners who help, same-species breeding. How each step works, and its status,
is in the table below. Exploration is decided and built as a prototype; see
[world and exploration](world-and-exploration.md).

## What a session feels like

A short session might be checking on a familiar mibi, looking again at a finding,
choosing what to research next or collecting a needed supply. It ends at a natural
stopping point with nothing lost. A long session might follow a promising place,
compare two samples competing for the same supplies, or investigate how a family's
traits split across a generation.

There is no minimum session, no care schedule for unbonded mibis, and no need to
research every sample immediately. **Decided** for unbonded mibis; bonded care
timing is **Open**.

## Design principles

These are **Working rules**: they come from the first prototype's design work and
fit every decision so far.

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
  background (**Decided**).

## Mechanics and their status

| Mechanic | What holds now | Still open |
| --- | --- | --- |
| **Exploration** | A fogged world map of living places, permanent and turning once per expedition; start anywhere seen; reach by Probe tier; survey by walking and Call; storms, fog banks, outposts and beacons (**Decided**, **Built** in the exploration prototype). Arriving, looking and waiting award nothing (**Working rule**) | Reach and place size tuning, more expedition types and events, items and mods. See [world and exploration](world-and-exploration.md) |
| **Gathering** | Collection is deliberate; whole items; a full hold offers a swap without loss (**Decided**, **Built** in the exploration prototype). Pods carried: 2 at tier 1, 3 at tier 2 (**Decided**); materials cap at 20 (**Built** in the exploration prototype) | More kinds of finds |
| **Return** | Send home only from the start cell or a lit outpost; it ends the expedition, with no banking; a broken Probe sends nothing home (**Decided**, **Built** in the exploration prototype). Send seals the cargo; the Station accepts it exactly once (**Working rule**, **Built in v1**) | The real transfer between devices |
| **Identification** | Establishes species and enough material, not hidden traits; then an unedited founder is allowed (**Decided**). 1 Energy a pod, the first free (**Built** in the exploration prototype) | Method |
| **Research** | Optional. Reveals a sample's evidence and reusable understanding; never changes the sample; no locus checklist; no drowning in near-identical samples (**Decided**) | Study variety, costs, value of repeat samples |
| **Creation** | One sample makes one fixed individual; changes only at researched, permitted traits, using variants that sample carries (**Decided**) | Which traits are configurable per species |
| **Incubation** | Reveals the same individual; never a reroll; opening is deliberate (**Decided**). v1 uses a 20-second timer (**Built in v1**) | Duration, purpose of the wait, what the player does meanwhile |
| **Bonding and care** | Optional; only bonded mibis need care to mature; wild and unbonded need nothing; not required for breeding (**Decided**). Learning changes behavior, never genes (**Working rule**). Forgiving care (**Proposal**) | How bonding happens, what care looks like, what missing it means, lifespan |
| **Cooperative gathering** | Bonded partners use their real abilities to help the player discover and progress; one "with you" slot; juveniles don't join the Probe (**Decided**). Digging, calming and sniffing open gates and events (**Built** in the exploration prototype) | Abilities from traits, the swimmer, more gates |
| **Breeding** | Same species only; shared species is necessary, not sufficient; every offspring is a viable new individual with real parents (**Decided**) | Eligibility, fertility, cost, forecasts, failure presentation |
| **Supplies** | Three supplies, Data, Energy and Essence, as broad building blocks for very different creatures; whole units, interchangeable only within a type (**Decided**). Energy from struck and warm stones, Data from creature moments the player causes, Essence from dew, pressed fruit and tufts; Energy stays scarce (**Decided**, **Built** in the exploration prototype) | Recipes, what each one does in an experiment, final prices |
| **Crafting** | Discovery with clues; learned recipes are personal and reliable; a failure wastes the ingredients or returns a fraction; deep in the long run, simple in V1 (**Decided**) | Scope, recipes, feed and habitat items |
| **Habitats** | Places with populations, resources and conditions that can make an ability useful (**Working rule**) | Space, cohabitation, competition, freezing while away |
| **Wild capture** | Not in the game for now (**Decided**) | Whether to add it later |
| **Upgrades** | Limited, removable, reusable virtual research chips for the Station, found, crafted, traded or dropped by rare mibis; tiered upgrades for Station, Probe and Companion (**Decided** as direction). Probe tiers 1 and 2 (**Decided**, **Built** in the exploration prototype) | Later tiers, mods, slot counts |
| **Sharing and paper** | One household kit serves several players, each with their own progress. Sampling someone else's mibi needs its owner's consent. No global first-discoverer rankings (**Decided**). Scanning or printing never grants ownership or breeding rights; shared research clues carry no genes (**Working rule**) | Rewards for scanning, trades, loans, printer gameplay |
| **Online play** | Optional; core play never needs a phone, account or internet (**Working rule**) | Whether to build any of it before the core game proves itself |

## What the first prototype proves

The [v1 simulator](../v1/README.md) plays one narrow version of the loop on
simulated devices: move on a small grid map, take finite supplies and one sample,
send them home, accept once, research, choose a supported form, incubate, open and
visit the resident. It proves the bookkeeping underneath: nothing duplicates,
nothing is lost on interruption, findings survive shortages, an opened mibi is the
one that was created.

It does not prove that exploring is interesting, that research creates curiosity,
that the creatures are appealing, or that the devices work physically. Those are
the questions the [roadmap](../ROADMAP.md) is built around.
