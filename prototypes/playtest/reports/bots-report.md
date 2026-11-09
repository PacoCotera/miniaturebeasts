# Bot runs

6 games a policy, 30 world turns each, up to 800 keys a turn (a policy may name its own), economy strict, native face, Playtest waits on (the Options panel's key, on). stub trips: Energy 2-4, Data 4-12, Essence 1-3, 0-2 pods of Loika/Tuikis/Untuva a trip, about 1 (assumed, not measured).

## The whole loop

A game walks the loop when it reaches every step: read, then grown, then hatched, then cared for, then crossed, then child hatched, then out with the Companion. Minutes of play are keys pressed x 1.5 s (assumed); the Companion's trips and the Station's waits are not play.

| policy | loops finished | at world turn, median (range) | minutes of play, median (range) | keys, median | stopped at (the first step missed) | the Sitting opened / held and begun |
|---|---|---|---|---|---|---|
| random | 0/6 | - | - | - | cared for 6 | 0/6 · 0/6 |
| greedy | 6/6 | 5.5 (5–11) | 14.1 (8.3–41.9) | 564 | - | 2/6 · 2/6 |
| hoarder | 6/6 | 5.5 (4–9) | 9.1 (6.8–22.3) | 362.5 | - | 1/6 · 1/6 |
| speedrunner | 6/6 | 5.5 (4–11) | 9.5 (6.7–25.5) | 379.5 | - | 0/6 · 0/6 |

Steps reached, games of 6 (random, greedy, hoarder, speedrunner):

| step | random | greedy | hoarder | speedrunner |
|---|---|---|---|---|
| read | 6 | 6 | 6 | 6 |
| grown | 6 | 6 | 6 | 6 |
| hatched | 6 | 6 | 6 | 6 |
| cared for | 0 | 6 | 6 | 6 |
| crossed | 0 | 6 | 6 | 6 |
| child hatched | 0 | 6 | 6 | 6 |
| out with the Companion | 0 | 6 | 6 | 6 |

## Economy and dead ends

STUB: the trips are the stand-in Companion's, so what comes in is an assumption; what the policies do with it, and what the Station does, is measured. The world turn is one trip; between two turns 20 minutes of Station time pass.

| policy | first hatch: turn median (range) · games | first elder | hatched at end (median) | Energy at end, mean (peak) | Data at end | Essence at end | pods held at end (median) · peak | pods never read | dead ends: games (events) | soft locks | crashed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 2.5 (1–3) · 6/6 | 7.5 (6–8) · 6/6 | 9 | 69.33 (peak 80) | 80.17 (peak 104) | 2.67 (peak 22) | 15.5 · 24 | 46% | 6/6 (141) | 0 | 0 |
| greedy | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 16 | 37.33 (peak 52) | 0 (peak 40) | 1.5 (peak 4) | 14.5 · 20 | 57% | 1/6 (6) | 0 | 0 |
| hoarder | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 15 | 51.67 (peak 63) | 267.33 (peak 289) | 6.33 (peak 24) | 14 · 18 | 100% | 1/6 (6) | 0 | 0 |
| speedrunner | 1 (1–3) · 6/6 | 6 (6–8) · 6/6 | 14 | 58 (peak 64) | 267 (peak 288) | 7.5 (peak 28) | 13.5 · 19 | 100% | 1/6 (6) | 0 | 0 |

Pods received a trip (mean): random 1.04, greedy 1.04, hoarder 1.04, speedrunner 1.04.

Dead ends (the stuck detector) by place: pods.read 50, habitat.rest 37, home.home 28, cargo.bay 11, vivarium.none 9, incubator.empty 6, library.family.close 4, incubator.growing 4, pods.inventory 4, vivarium.wall 2, library.family.compare 2, library.species.sheet 1, library.all 1.

Share of game-turns holding more than 20 (the old hold): random Energy 71%, Data 64%, Essence 1%; greedy Energy 61%, Data 4%, Essence 0%; hoarder Energy 65%, Data 92%, Essence 2%; speedrunner Energy 66%, Data 93%, Essence 3%.

Screens never reached by any bot: settings.

Energy, Essence and Data held turn by turn (mean, min, max over the games) are in the JSON under `policies.*.energy|data|essence.byTurn`.

Not measurable yet:

- Crosses: refusals by reason, the forecast against the draw, the line over time, samples: the bots cross and read the line's depth by the Sitting being earned; the refusals are plates the bots read only for the Vivarium being full and the Essence being short
- The house and the manager: free places by turn, bonded share, tuck-away and bring-out: the manager is not built (bot run 6)
- Pods in by source and out by exit (grown, let go, dried), turns held, Freshen: the new Pods screens are not built; only grown and let go through today's screens are counted (bot run 2)
- Data per trip by source and the Watch share, trips that hit the ceiling: the Companion is a stub, so the acts that pay Data are not played (bot run 1)
- Holdings with no cap: the time each pile is held and what the Companion's hold of 20 would have lost: the Station already holds more than 20 (the report counts the share of turns over 20); how long each pile stays and what the Companion's own hold of 20 costs are not measured (bot run 7)
