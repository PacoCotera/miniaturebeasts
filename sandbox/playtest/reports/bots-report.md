# Bot runs

6 games a policy, 12 world turns each, up to 800 keys a turn (a policy may name its own), economy strict, native face, Playtest waits on (the Options panel's key, on). stub trips: Energy 2-4, Data 4-12, Essence 1-3, 0-2 pods of Loika/Tuikis/Untuva a trip, about 1 (assumed, not measured).

## The whole loop

A game walks the loop when it reaches every step: read, then grown, then hatched, then cared for, then crossed, then child hatched, then out with the Companion. Minutes of play are keys pressed x 1.5 s (assumed); the Companion's trips and the Station's waits are not play.

| policy | loops finished | at world turn, median (range) | minutes of play, median (range) | keys, median | stopped at (the first step missed) | the Sitting opened / held and begun |
|---|---|---|---|---|---|---|
| greedy | 6/6 | 5 (4–10) | 9.7 (6–35.9) | 387.5 | - | 0/6 · 0/6 |
| hoarder | 6/6 | 5 (3–8) | 7.8 (5.1–18.9) | 311 | - | 0/6 · 0/6 |
| speedrunner | 6/6 | 5 (3–10) | 7.7 (5–22.2) | 307.5 | - | 0/6 · 0/6 |

Steps reached, games of 6 (greedy, hoarder, speedrunner):

| step | greedy | hoarder | speedrunner |
|---|---|---|---|
| read | 6 | 6 | 6 |
| grown | 6 | 6 | 6 |
| hatched | 6 | 6 | 6 |
| cared for | 6 | 6 | 6 |
| crossed | 6 | 6 | 6 |
| child hatched | 6 | 6 | 6 |
| out with the Companion | 6 | 6 | 6 |

## Economy and dead ends

STUB: the trips are the stand-in Companion's, so what comes in is an assumption; what the policies do with it, and what the Station does, is measured. The world turn is one trip; between two turns 20 minutes of Station time pass.

| policy | first hatch: turn median (range) · games | first elder | hatched at end (median) | Energy at end, mean (peak) | Data at end | Essence at end | pods held at end (median) · peak | pods never read | dead ends: games (events) | soft locks | crashed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 9.5 | 9.67 (peak 22) | 1 (peak 40) | 1.33 (peak 3) | 8 · 12 | 61% | 0/6 (0) | 0 | 0 |
| hoarder | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 10 | 13.67 (peak 22) | 107.5 (peak 120) | 1.17 (peak 6) | 7.5 · 12 | 100% | 0/6 (0) | 0 | 0 |
| speedrunner | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 9.5 | 15.67 (peak 22) | 108.67 (peak 121) | 1.33 (peak 3) | 8 · 12 | 100% | 0/6 (0) | 0 | 0 |

Pods received a trip (mean): greedy 0.99, hoarder 0.99, speedrunner 0.99.

Dead ends (the stuck detector) by place: none.

Share of game-turns holding more than 20 (the old hold): greedy Energy 1%, Data 6%, Essence 0%; hoarder Energy 1%, Data 81%, Essence 0%; speedrunner Energy 3%, Data 82%, Essence 0%.

Screens never reached by any bot: library, library.species, library.family, sitting, settings.

Energy, Essence and Data held turn by turn (mean, min, max over the games) are in the JSON under `policies.*.energy|data|essence.byTurn`.

Not measurable yet:

- Crosses: refusals by reason, the forecast against the draw, the line over time, samples: the bots cross and read the line's depth by the Sitting being earned; the refusals are plates the bots read only for the Vivarium being full and the Essence being short
- The house and the manager: free places by turn, bonded share, tuck-away and bring-out: the manager is not built (bot run 6)
- Pods in by source and out by exit (grown, let go, dried), turns held, Freshen: the new Pods screens are not built; only grown and let go through today's screens are counted (bot run 2)
- Data per trip by source and the Watch share, trips that hit the ceiling: the Companion is a stub, so the acts that pay Data are not played (bot run 1)
- Holdings with no cap: the time each pile is held and what the Companion's hold of 20 would have lost: the Station already holds more than 20 (the report counts the share of turns over 20); how long each pile stays and what the Companion's own hold of 20 costs are not measured (bot run 7)
