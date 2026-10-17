# "Meanwhile, the world turned" as pictures: the world events a crate carries

Ticket T-20261016-151. Architect, 2026-10-17, as a proposal for the game designer to confirm. Read at batch/B-20261016-4 98fa6b09:
- `prototypes/exploration/index.html`: `worldTurn`, the crate it seals, `tripRecord` and `TRIP_KINDS`, `LAND_NAME`;
- `prototypes/station/src/state.mjs`: `mergeCare`, `tripCarried`, `openBay`;
- `specs/genome-screen-calls.md` T-137 (the self-changing trigger rules);
- design/proposals/technical-architecture.md §4.4 (the dock's seated event and the summary relay).

## Purpose

When a crate is opened, the Cargo report tells the player what came back and **what changed in their world while they were away**. Since T-144 the report leads with pictures, but the world's changes still arrive as free sentences ("A storm charged stones in the rock field."), so they had to leave the card. To show them as pictures, a place badge and a change mark, the crate must carry each change as a record, not a sentence. The same places drive the self-changing loci (Glow: cave and wood; Basking: meadow, pond edge and rock field; Phase: a storm over the partner), which the Companion already reports.

## 1. What already crosses the dock

- **The crate** (`sv.bay[]`, sealed at End expedition): `{ id, n, turn, at, e, d, s, pods, met, explored, of, lines }`. `lines` holds up to three of `worldTurn`'s sentences.
- **The trip record** (`sv.trips[]`, the last 40, written at the same moment): `{ v: 1, n, partner, places, storm, carried }`.
  - `places` holds the kinds of place the Probe entered, drawn from `TRIP_KINDS = [meadow, pond, rock, wood, cave]`.
  - `storm` is true when a storm was over the Probe at any point in the trip.
  - `mergeCare` reads every trip at the dock.
- **So the self-changing triggers are already reported.** T-137's facts (the partner, the place kinds entered, a storm over the partner) are exactly the trip record's `partner`, `places` and `storm`. Nothing new is needed for them; the Station applies the step and fade rule at the dock from these fields. The crate and its trip share `n`, the expedition's number, and that is the link.

## 2. The event record

The crate gains one field, **`world`**: the events `worldTurn` already chooses, at most three, in the same order as `lines`.

```js
world: { v: 1, turn: 7, ev: [ ["storm", "rock", null, 0], ["grown", null, 12, 0], ["fruit", "wood", null, 3] ] }
```

Each event is a four-slot array, `[kind, place, who, n]`:

| Slot | Values |
| --- | --- |
| `kind` | One of the change kinds below |
| `place` | A place kind or `null`. The trip's five `meadow`, `pond`, `rock`, `wood` and `cave`, plus the two lands with no trip meaning, `shallows` and `cliff` (`LAND_NAME`'s order mapped to these ids) |
| `who` | A mibi id (the Station's id, as `carried` uses), a species index (`S.cr`'s `sp`, the same index the crate's pods carry, which the Station maps with `speciesId`), or `null`, as the kind says |
| `n` | A count or a direction, as the kind says; 0 when unused |

**The change kinds**, one for each sentence `worldTurn` writes today, so nothing the player sees is lost:

| `kind` | Today's sentence | `place` | `who` | `n` |
| --- | --- | --- | --- | --- |
| `grown` | "{Name} has grown …" (the three care texts) | null | mibi id | 0 home, 1 leads, 2 can lead (which care text) |
| `elder` | "{Name} is an elder now …" | null | mibi id | 0 |
| `lampLow` | "The outpost in the {land} burns low." | the outpost's land | null | 0 |
| `lampOut` | "The outpost in the {land} has gone out." | the outpost's land | null | 0 |
| `herd` | "The {species} moved {dir}." / "… spread out." / "Unfamiliar creatures …" | null | species index, or −1 for unfamiliar | direction 1–8 (N, NE, E, SE, S, SW, W, NW), 0 spread out |
| `storm` | "A storm charged stones {where}." / "The storm reached stones {where}." | the main land among the charged cells (`placePhrase`'s choice) | null | 1 when it moved to a new place, else 0 |
| `fruit` | "Fruit is back on {n} bushes." | the bloom's centre land | null | the bush count |
| `stirring` | "Something new is stirring in {region}." | the main land of the new pods' cells | null | the new pod count |
| `young` | "Young {species} were born {where}." | the cell's land | species index, or −1 for unfamiliar | 0 |
| `quiet` | "A quiet turn. Little changed." | null | null | 0 |

- **Facts, not words.** The Companion decides which events happen and which three are kept, exactly as today. The Station only draws them.
- **`lines` stays** for one release, beside `world`, so a crate sealed before this change still opens. Once every save is past it, `lines` can go.
- **No picture names.** The record names what happened. The Station chooses the badge and the mark, so the art can change without touching a save.

**Size, for the Companion:** each event is four small values; as JSON at most about 26 bytes, and three events plus the wrapper about 100 bytes a crate. The bay holds at most three crates (`BAY = 3`), so that is about 300 bytes in the Companion's save. In a packed form for the relay it is 4 bytes an event (kind, place and n in a byte each, who in a byte for an id under 256 or a species), 14 bytes a crate. Either form is trivial against the Companion's 8 MB PSRAM and its flash.

## 3. The path (design/proposals/technical-architecture.md §4.2 and §4.4)

| Leg | Today (the sandbox) | On the devices |
| --- | --- | --- |
| The Companion seals the crate | `world` is written beside `lines` in `sv.bay[]` and the trip in `sv.trips[]`, in the shared save | The same records in the Companion's save (flash) |
| The Companion to the Caddy | — (the shared save) | Part of the crate summary the relay carries at a seat. The summary relay is still "not designed yet" (§4.4); this record joins it unchanged, and the Caddy passes it through without reading it |
| The Caddy to the Station | — | The summary message after the `seated` event (§4.4) |
| The Station opens the crate | `openBay` keeps `c.world` on the play; the report reads it | The same |
| The Station applies triggers | `mergeCare` reads `trips` (already) | The same |

## 4. What the Cargo card shows

The report's world block, which T-144 removed, comes back as **up to three picture rows**, one for each event, in the crate's order. Rects are UI/UX's (below). Each row is:
- the **place badge**: the place's existing master, at the card's size (`place-{cave|meadow|pond|rock|wood}`; `shallows` and `cliff` need badges);
- the **change mark**, one for each kind: a sprout (grown), a cane (elder), a lamp low or out, a hoof-trail arrow turned to `n` (herd; no arrow when spread out), a bolt (storm), a fruit, a glint (stirring), a small pair (young), a still mark (quiet);
- the **who**: the mibi's face where `who` is a mibi, the species' face where it is a species, the unfamiliar silhouette for −1;
- the **count** as the marks repeated, at most three (fruit, stirring), as the card counts pods.

The block keeps its heading picture (the world turn's sun mark) and no sentences. A crate with only `lines` (an old save) shows no world block, as the card does today.

**Self-changing:** nothing new on the Cargo card. The step shows where T-137 says: the gene's step marks on the Vivarium. If the game designer wants the trigger visible at the moment it happens, a `storm` event whose place the partner was in can wear the partner's face beside the bolt. The trip's `storm` flag and the crate's shared `n` give the Station that link without a new field.

## 5. Open, for the game designer

- **Confirm the kinds and their `n`** (§2), especially `grown`'s three variants, and whether `herd` keeps its direction.
- **The partner on the storm row** (§4, last point): wanted or not.
- **`shallows` and `cliff`:** they appear in outpost lines only. Either they get badges, or an outpost there shows the plain land mark.
