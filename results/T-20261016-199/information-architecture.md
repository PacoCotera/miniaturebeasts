# Home: the information architecture (stage 2, the game designer)

Game designer, 2026-10-17. It answers the owner's 13:00 ruling: "the information architecture is wrong… what is the criteria… library is boring and relegated to the bottom, while the game designer mentioned that this will be the engine of the loop… the probe is a minor game mechanic." Sources: design/game.md (the loop, systems, engagement), design/research-and-breeding.md, specs/station-return-signals.md, and the code's limits (`RACK = 6`, `BAYS = 6`).

## The principle

**Home answers two questions in two seconds: what am I working toward, and what can I do now?** The first is the engine of the loop, and the second is today's step on it. Space follows how often a system matters *and* how much it carries the player's own thread. A system that matters only at a moment (a crate, a ready bud) takes space only at that moment. A system that matters always (the pursuit, the life) holds its space always.

## The ranking (weight in the loop, and what the player comes back to Home for)

| # | System | Weight | What the player comes back to Home for |
| --- | --- | --- | --- |
| 1 | **The Library (the pursuit)** | the engine: every arc but the trip ends here | To see how close they are to what they're working toward: a species' field guide filling look by look, and the pinned wish lighting piece by piece |
| 2 | **The vivarium (the life)** | the feel, always present | To see their mibis, each as itself, and what's new about one: it grew up, was born, or is back from a walk |
| 3 | **Pods (research)** | the mechanics' daily work: "optional, and the core of play" (design/game.md) | To find out what their pods carry: which still hide something, and where a glint says reading pays |
| 4 | **The Incubator** | high, but only while a bud grows | To check on the bud: its next reveal, and when it's ready to meet |
| 5 | **Cargo (the bay)** | an event, once per trip | To open what came home. It matters only while crates wait |
| 6 | **Cross** | a weeks-long arc, reached from the pursuit and the life | To try for the wish, or for a look they've seen in a parent. It has no home of its own on Home; it is reached through 1 and 2 |
| 7 | **The Probe bench** | minor: the dock mends two plates free | To fit an upgrade they can afford, or to mend before a trip. Its state belongs beside the Companion's dock status, not in a panel |
| 8 | **The sitting** | rare, and earned by the engine | To begin a portrait when one is held. It belongs with the Library: research earns it, and the portrait becomes the species' face there |

**What follows for space:**
- **The pursuit (1) and the life (2) hold the most space at all times.** They are the why and the who.
- **Pods (3)** hold a steady, readable strip, because it is the daily "what can I do".
- **The Incubator (4) and Cargo (5)** are **state-sized**: small and quiet when idle, and the forward thing when they hold something to act on. Neither may spend space on emptiness (the owner: "the incubator takes a lot of space just to show emptiness").
- **The Probe (7)** is a status mark, not a module.
- **Cross (6) and the sitting (8)** have no place of their own on Home.

## The criteria for what Home shows

### The pursuit (the Library's face on Home)

- **With a wish pinned:** the wished mibi as its pieces. Each pinned trait shows its look, lit where a resident or a pod already shows it, and unlit where not. The species' field guide fills behind it, look by look. A first, meaning a look new to the guide, wears its triangle as it lands.
- **With no wish:** the field guide nearest complete, as its looks, found ones painted and unfound ones as empty frames. The count is pictures, never a number.
- **The route:** ✓ on it opens that page. From the page, the wish leads to the pair to cross.
- **A held sitting** shows as its gilt frame on the pursuit, because research earned it, with the edge of a second frame when one is owed (specs/sittings-never-lost.md).

### Pods: which pods, and why

The case has **six wells**. Home shows **all six, every time,** as wells. The owner asked why only three, and the answer is that there is no criterion that leaves pods out.
- **Each pod** shows its species' shell, its chapter ring (filled as far as it is read) and, if a chapter holds something new, the gold glint.
- **Empty wells** show empty. That is the honest state of the case, and it tells the player whether the next crate's pods will find room.
- **Pods waiting in the bay** for a well show as a small count of shells by the case's edge. They are not hidden.
- **The order** is the case's own (the wells don't reshuffle). The bottom line names the one with the best next step: a glint first, then one that can be identified, then one that can be read, then one that can grow.

### The Incubator

- **Empty:** a small, quiet chamber. If a pod in the case can grow now, the chamber shows that pod's shell faintly in its well, as an invitation. It takes no more space than a module at rest. It never paints a large empty background.
- **Growing:** the player's own pod, candled, with its ring. It sits at rest, unlit (T-192's live tier), at a moderate size.
- **Ready:** it comes forward, lit, and is the ✓ target.

### Cargo: when a crate matters

- **It matters while crates wait in the bay:** docked and unopened, or a portrait crate arrived. Then it is forward: the crates themselves, the ✓ "Open the bay".
- **At any other time, it has no presence beyond a quiet door.** This applies when the Companion is away, docked with nothing waiting, or the bay is empty. The owner: "closed cargo is not the most important module."
- **While away,** the trip has a face: the partner's portrait on the Companion's status mark, not a closed bay.

### The life (the living window)

- **The residents,** each drawn as itself (T-190).
- **A name tag** only on an event (grown up, born from your cross, back from a walk), and only until visited.
- **The way down** is one press from a resident (the T-191 language, held until a direction is chosen).

### The Probe and the trip (a status mark)

The Companion's chip shows: docked or away, the partner with it, and the Probe's plates as a small readout. Mending and upgrading are reached from there. It takes no module of its own.

### What Home never shows

- the world turn as a bare number;
- a module whose picture never changes;
- an empty state painted large.

## How this checks in the gate: "prominence matches loop weight"

- At rest (nothing waiting), the pursuit and the life together hold most of the screen, and Pods reads as a strip.
- Cargo and the Incubator are small.
- The Probe is a mark.
- When something waits, it comes forward without moving the others' places.
