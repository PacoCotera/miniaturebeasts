# Design

These documents describe the game Miniature Beasts is meant to be. Each subject
has one home; the documents link to each other instead of repeating.

| Document | Covers |
| --- | --- |
| [Play manual](play-manual.md) | The rules of the current exploration build, written for players |
| [The game](game.md) | What the player does, the core loop, design principles and every mechanic's current status |
| [World and exploration](world-and-exploration.md) | The decided exploration design: the world, expeditions, the survey, weather, materials, creatures, partners and gates, and what is still open |
| [Creatures and genomics](creatures-and-genomics.md) | Species, genomes, inheritance, research, creating a mibi, breeding |
| [Interaction](interaction.md) | How the devices are operated (the Companion's four buttons, bottom line, HUD and menu), screen rules and accessibility |
| [Art direction](art-direction.md) | The accepted Miniature Lives look, its rules and the art still to make |
| [Devices](devices.md) | Companion, Station and Caddy: roles, reference hardware, evidence, open choices |
| [Architecture](architecture.md) | Where state lives, transfers between devices, recovery, sharing and rights |

The plan for building all of this is the [roadmap](../ROADMAP.md).

## Proposals

The [proposals](proposals/) folder holds design proposals as they were put to the
project lead, with a header saying what was decided. Once a proposal's decided
parts are written into the documents above, it is history: the documents are the
current design, and a proposal is read only for why something was chosen.

## How to read the status marks

Every rule in these documents carries one of these marks:

- **Decided**: chosen by the project lead. Changes go through the project lead.
- **Working rule**: carried over from the first prototype's specifications and
  consistent with the decisions, but never explicitly confirmed. Use it, and
  confirm it before building anything that depends on it heavily.
- **Built in v1**: exists in the [first prototype](../v1/README.md). Being built
  does not make it decided.
- **Proposal**: an idea worth testing. Not a rule.
- **Open**: needs a design decision.

Numbers in examples (costs, quantities, timers, odds) are illustrations unless
marked Decided.

## Words used here

| Word | Meaning |
| --- | --- |
| **mibi** | One creature. The game is about discovering, creating and living with them |
| **Companion** | The portable device: exploring, carrying finds, spending time with a travelling mibi |
| **Probe** | The Companion's exploring mode. Not a separate device |
| **Station** | The home device: research, creation, residents, families |
| **Caddy** | The shared dock: charging, quiet summaries, printing |
| **species** | An established kind of mibi. It sets what can vary and keeps every result a recognizable, viable pet |
| **sample** | Material found in the world that holds one complete, hidden genome of one species |
| **founder** | A mibi created from a sample. It has no parents |
| **carried / expressed** | A variant can be present in a genome without showing (carried) or showing (expressed) |
| **bonded** | A mibi the player has chosen to raise. Only bonded mibis need care |
