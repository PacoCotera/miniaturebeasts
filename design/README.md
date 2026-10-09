# Design

These documents describe the game Miniature Beasts and the devices it runs
on, for anyone building it. Each subject has one home; the documents link to
each other instead of repeating. They are written to the
[documentation standard](../docs-standard.md).

| Document | Covers |
| --- | --- |
| [Play manual](play-manual.md) | The rules of the current exploration build, written for players |
| [The game](game.md) | What the player does, the core loop and the design principles |
| [Research and breeding](research-and-breeding.md) | Reading a pod, creating a founder, shaping, the wish, crossing two mibis, and what each costs |
| [World and exploration](world-and-exploration.md) | The world, expeditions, the survey, weather, materials, creatures, partners and gates |
| [Genomics](creatures-and-genomics.md) | How genes work: species frames, kinds of locus, copies, inheritance in a cross, the genome stamp |
| [Interaction](interaction.md) | How the devices are operated (the Companion's four buttons, bottom line, HUD and menu), screen rules and accessibility |
| [Art direction](art-direction.md) | The Miniature Lives look, its rules and the art still to make |
| [Devices](devices.md) | Companion, Station and Caddy: roles, reference hardware, open choices |
| [Architecture](architecture.md) | Where state lives, transfers between devices, recovery, sharing and rights |

The plan for building all of this is the [roadmap](../ROADMAP.md).

## Proposals

The [proposals](proposals/) folder holds changes that are not part of the
design yet, and the build specifications that builders follow. A design
document never depends on a proposal; where a subject is still open, the
document says so in its **Not designed yet** section.

## Words used here

| Word | Meaning |
| --- | --- |
| **mibi** | One creature. The game is about discovering, creating and living with them |
| **Companion** | The portable device: exploring, carrying finds, spending time with a travelling mibi |
| **Probe** | The Companion's exploring mode. Not a separate device |
| **Station** | The home device: research, creation, residents, families |
| **Caddy** | The shared dock: charging, quiet summaries, printing |
| **partner** | The grown mibi that comes on an expedition with the Probe |
| **pod** | A sealed seed found in the world that holds a new mibi |
| **crate** | One expedition's cargo, sealed when the player heads home |
| **bay** | The Companion's sealed bay, which holds the crates until the Station opens them |
| **expedition** | One trip out with the Probe, from its start cell until the player heads home or the Shield breaks |
| **Shield** | How many hits the Probe can still take |
| **outpost** | A hut that, once lit for Energy, lets the player head home, mend the Shield and shelter |
| **beacon** | A post that, once lit for Energy, reveals the land around it |
| **species** | An established kind of mibi. It sets what can vary and keeps every result a recognizable, viable pet |
| **sample** | Material found in the world that holds one complete, hidden genome of one species |
| **founder** | A mibi created from a sample. It has no parents |
| **carried / expressed** | A variant can be present in a genome without showing (carried) or showing (expressed) |
| **bonded** | A mibi the player has chosen to raise. Only bonded mibis need care |
