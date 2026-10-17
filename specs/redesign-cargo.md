# Cargo reception, redesigned from purpose (UI/UX)

Ticket T-20261016-164, 2026-10-17. The owner rejected the Cargo report (picture 23) at 06:38 UTC. This document gives the purpose, the owner's lines as acceptance tests and three concepts. Sketches for the art director to paint (art T-20261016-171) are in `specs/redesign-cargo/`. They are composition only, not specs.

## What went wrong (UI/UX's own reading)

T-144 fixed the word count but not the meaning:
- The reach pips were a code that needs a legend.
- The material figures did not say whether they were one crate's, the sum, or the stores'.
- The goal line ("fit the Probe upgrade") is Home's business.
- The six-well pod rack below the door is Pods' tray, not reception.

The screen still explained itself in text and 16 px icons.

## Purpose

Cargo is where the crates the Companion carried home are opened. The player sees each crate open and what came out of it: pods and materials. They also see where each thing goes: pods to the Pods room's wells, materials into the Station's stores.

## Acceptance tests (the owner, 06:38, verbatim)

| # | The owner | Answered by |
| --- | --- | --- |
| 1 | "You show three portfolios, and color bars, it is impossible to know what the color bar mean." | No colour bars. The explored-land reach leaves Cargo (it belongs to the Companion's map). Every mark is a thing: a crate, a pod, a pile of a material |
| 2 | "you show a row of materials but it is impossible to understand if they are combined, at the station, or part of a portfolio." | Each crate's materials lie in front of it as piles with "+n". The stores are drawn as three tanks on the bay wall, filling as the piles flow in. The top bar's counters are those stores |
| 3 | ""fit the probe upgrade" is not the place either for probe configurations." | No goal line and no Probe on Cargo |
| 4 | "The lower half ot the screen shows 6 pod spaces, why? wasn't this the cargo reception." | The pod rack leaves Cargo. The pods go out through a Pods hatch that shows how many wells are free; a pod that finds no well waits on the bay floor, as R4 says |
| 5 | "Again, this screen doesn't communicate easily its intent, and relyes more on text and tiny icons." | Intent carried by painted things at size (open crates, pods, material piles, store tanks) and by drawn flow, with a few words |

## Three concepts

| Concept | Sketch | What it is | Strength | Risk |
| --- | --- | --- | --- | --- |
| **C1, the unloading bay** (UI/UX's pick) | `C1-unloading-bay.png` | The crates open side by side on the bay floor. In front of each lie its pods and material piles. The materials pour into the store tanks on the wall, then the top bar ticks (the game designer, `specs/purpose-briefs-b20261017-1.md` §6.2). The pods go out through the Pods hatch, which shows its free wells; with no free well, they wait sealed on the bay floor and land oldest first, and the hatch shows that it is full. No standing pod rail |
| **C2, crate by crate** | `C2-crate-by-crate.png` | One crate opens big; its contents lie out front; then the next; the stores fill as each empties | The largest pictures; the most ceremony | Slow with three crates; the whole haul is never seen at once |
| **C3, the manifest** | `C3-manifest.png` | The door's display lists each crate as a row of painted contents, with the tanks beside it | Closest to today | Still a list; the weakest at "where things go" |

**Reach and the world events leave Cargo** (the game designer, §6.2): reach goes to the Companion's map. `grown` and `elder` go to the Station's return signals (Home's line and the name-tag mark). The world's events go to the Companion's map as place markers, the first time it opens after the dock (`specs/world-events.md`: the record stays, only the reader changes).

## Asks

- **The game designer:** confirm that reach and world events leave Cargo, and where they go; confirm the pods' destination (the Pods hatch, with waiting pods on the floor).
- **The creative director**: what the bay is in the world (a dock, a hold, a receiving bay of the lab), and C1 against C2.
- **The art director** (T-20261016-171): paint C1 and C2 at 1024 × 600, labelled, to the research-hands bar.
- **The lead:** builds on Cargo stay parked until the owner chooses.
