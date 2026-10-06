# World and exploration

Exploration is where curiosity starts. It supplies the samples every mibi comes
from, the materials research and care need, and the places a bonded partner can
help the player reach. If exploring isn't interesting, the rest of the game has
nothing to feed on. This is the least designed part of Miniature Beasts, and the
first one to design.

## Requirements

**Decided:**

- **Open map.** The player moves freely through a world seen from above, on the
  Companion's screen, and chooses where to go. The game does not lead them along a
  path.
- **Interaction-driven.** Discoveries come from doing things to the world: acting
  on objects, creatures and conditions and seeing what changes.
- **Played with the Companion's physical controls.** No touch shortcuts. The
  current control set is four directions, Confirm and Back (**Working rule**; see
  [interaction](interaction.md)).
- **In the Miniature Lives look**, readable at the Companion's screen size
  (currently 450×600, a **Working rule**; see [art direction](art-direction.md)).

In practice, walking to a marked spot and picking from a menu does not count as
interaction-driven.
- **Partners are optional gates.** A bonded mibi brought along opens events, map
  areas and expedition types that are otherwise unavailable, using its real
  abilities. Without one the player can still explore; partners unlock higher
  tiers, never exploration itself.
- **One map, two scales.** A large world map under fog holds places that come
  alive as small living patches when played: wild mibis, objects and conditions
  that react to what the player does. The fog lifts through progression: research,
  partners, items, Probe tiers and installed mods.
- **The world persists and turns.** It advances one turn per expedition:
  creatures roam and breed, weather leaves marks, and conditions bring new finds.
  Nothing refills.
- **Start anywhere you can see.** Any visible cell can be a starting point. Placing
  the pawn reveals the cells around it, so a new game starts with nine cells to
  explore.
- **The field clock counts actions, not seconds.** The world moves when the player
  moves or acts. Standing still changes nothing, and there's no real-time pressure.
- **Samples are seed-pods.** A pod shows its species if the player has met that
  species before, otherwise "unknown species". What's inside is only discovered at
  the Station.
- **No wild capture** for now.

## Direction already given

These come from the project lead's earlier direction. They shape the options;
the exact rules are **Open**.

- **No roads-only movement.** The player shouldn't be confined to paths.
- **Variety.** Generated maps, movement toward findings, and responsive encounters
  generated from rules rather than scripted scenes.
- **Expedition types.** Three to five types in V1, about ten kinds of event.
  - The type shapes which events and items turn up; basic supplies appear at
    fairly steady rates.
  - Example event: a storm during a weather expedition. Stay for extra Energy and
    risk damage that forces you home, or leave.
- **Open-ended gathering.** Stay out until you have a reason to return. No loot
  filters: the player manages what they carry and can discard.
- **Progress-shaped findings.** What you find is proportional to how far you've
  come. Probe tiers widen range, capacity and detection. Rare finds open more
  complex genomes.
- **Fiction is free.** Field events don't need real sensors: a radiation storm,
  rising water with a choice to escape or stay.
- **No waiting in the field.** Exploration is the most interactive part of the
  game.

## What was rejected, and why it matters

Three exploration presentations were rejected:

- a first-person, scenic view;
- screens built around header images;
- a top-down map drawn as one corridor (trailhead, marker, overlook, alcove),
  covered in labels.

The last one failed because the design it illustrated also specified a route. The
first prototype's walkthrough said "follow one proposed route", and the screens
drew exactly that. Better screens cannot fix this; the world and what the player
does in it have to be designed first.

## Constraints that still hold

**Working rules**, carried over and consistent with the decisions:

- Arriving, looking and waiting award nothing. Finds are finite: they don't refill
  when the game restarts or reroll when revisited.
- Collection is deliberate, and a full hold turns an item away without losing it.
- A sample shows nothing of its genome in the field. Its species is found out at
  the Station.
- Detours need a payoff: something to experience or discover.
- The first samples must be reachable with the tools a new player has. No
  rare-drop luck gating essential progress, and no species placed out of reach.
- No checklist of places to visit, no timed or passive gathering.
- No real-world travel, hazard or phone required. Optional real sensors may flavor
  the fiction but never turn directly into items or genes.
- The Station cannot watch the Companion's map while it is away. It only sees
  what was sent home.

## What the first prototype has

The [v1 simulator](../v1/README.md) has a small top-down grid. The player moves one
square per press, and at named places Confirm opens a menu of finite supplies or a
sealed sample. The plumbing is solid, and free movement on a grid is closer to the
goal than the rejected corridor. But places are menus, there are no creatures in
the world, and nothing reacts to the player.

## Questions this design must answer

All **Open**. Phase 1 of the roadmap compares alternatives that answer them.

1. **What is the world?** One persistent hand-built world, areas generated for
   each expedition, or a mix. How big an area is, how it scrolls or is revealed on
   a 450×600 screen.
2. **What lives in it?** Whether wild mibis are visible and react to the player,
   and what other creatures, objects and conditions exist.
3. **What can the player do?** The verbs. What directions, Confirm and Back do in
   the world beyond moving.
4. **Where do samples come from?** Picked up, earned from an encounter, left
   behind by a creature, captured. What a sample is in the fiction.
5. **Why go back?** What changes between visits. How a new research interest, a
   partner's ability or a new tool changes what a known place offers.
6. **How do partners change the world?** Which inherited abilities open which
   obstacles, and how the player sees that before trying.
7. **How does an expedition start and end?** Choosing where to go, leaving, sending
   the cargo home, interruptions.
8. **What does the world remember?** Which changes persist and for how long.

## Ideas on the table

All **Proposals** from the first prototype's design work. They are starting
material, not a design:

- Leave with an intention: restock a supply, follow a lead, or see what turns up.
- Move an obstruction to expose something; approach a creature from another side
  to change what's reachable.
- Responsive encounters whose outcome depends on understandable causes: reach,
  access, a compatible ability, a changing subject, a finite opportunity.
- Optional risk: trade an opportunity against a consequence shown in advance.
- A bonded partner retrieving something out of the player's reach.
- Leads and observations: a recorded clue that takes no cargo space; a physical
  reference that does, until studied.
- A familiar place offering a new approach once the player knows more.
- A finding that unlocks a new research method, never through rare-drop luck.
- Generated places and relationships that produce genuinely different actions,
  not reskinned reward menus. Not every place needs every kind of encounter.

Games the earlier work cited as inspiration, for hypotheses only:
- Outer Wilds (curiosity guiding where you wander);
- A Short Hike (detours worth taking);
- DREDGE (cargo with consequences);
- No Man's Sky (surveying);
- New Pokémon Snap (intervening to change what a creature does).

## Where this stands

The model is chosen: a fogged world map with living patches, as written up in
[the combined design](proposals/exploration-options/combined-design.md)
(**Proposal**, partly **Decided**; see the Requirements above for what is
decided). A rough playable of it runs at
[miniaturebeasts.com/sandbox/exploration/](https://miniaturebeasts.com/sandbox/exploration/)
(`prototypes/exploration/`). Once it has been played and the open questions in
the combined design are answered, this document absorbs the decided design.
