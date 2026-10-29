# Bot runs

20 games a policy, 30 world turns each, up to 60 keys a turn, economy strict, native face. stub trips: Energy 2-4, Data 4-12, Essence 1-3, 1-3 pods of Loika/Tuikis/Untuva a trip (assumed, not measured).

STUB: the trips are the stand-in Companion's, so what comes in is an assumption; what the policies do with it, and what the Station does, is measured. The world turn is one trip; between two turns 20 minutes of Station time pass.

| policy | first hatch: turn median (range) · games | first elder | hatched at end (median) | Energy at end, mean (peak) | Data at end | Essence at end | pods held at end (median) · peak | pods never read | dead ends: games (events) | soft locks | crashed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 3.5 (1–10) · 20/20 | 21.5 (19–28) · 20/20 | 8 | 67.5 (peak 80) | 210.45 (peak 247) | 16.05 (peak 33) | 52.5 · 60 | 94% | 20/20 (270) | 0 | 0 |
| greedy | 2 (1–2) · 20/20 | 20 (19–20) · 20/20 | 8 | 73.25 (peak 80) | 168.75 (peak 205) | 31.5 (peak 42) | 55.5 · 63 | 87% | 0/20 (0) | 0 | 0 |
| hoarder | never · 0/20 | never · 0/20 | 0 | 89.25 (peak 96) | 238.1 (peak 271) | 60.25 (peak 73) | 63.5 · 71 | 100% | 0/20 (0) | 0 | 0 |
| speedrunner | 2 (1–2) · 20/20 | 20 (19–20) · 20/20 | 1 | 87.25 (peak 94) | 235.1 (peak 265) | 59.5 (peak 70) | 62.5 · 70 | 100% | 0/20 (0) | 0 | 0 |

Dead ends (the stuck detector) by place: habitat.rest 81, vivarium.empty 63, create.nothingRead 59, home.home 20, pods.chapter 15, incubator.growing 6, create.shape 5, pods.compare 4, library.all 3, pods.overview 3, library.family.compare 2, cargo.bay 2, pods.collection 2, vivarium.rest 2, library.species.sheet 1, library.species.lit 1, bench.docked 1.

Share of game-turns holding more than 20 (the old hold): random Energy 71%, Data 92%, Essence 10%; greedy Energy 67%, Data 81%, Essence 20%; hoarder Energy 79%, Data 94%, Essence 66%; speedrunner Energy 76%, Data 93%, Essence 65%.

Screens never reached by any bot: sitting.

Energy, Essence and Data held turn by turn (mean, min, max over the games) are in the JSON under `policies.*.energy|data|essence.byTurn`.

Not measurable yet:

- Crosses beyond the first: crosses a trip, refusals by reason, the forecast against the draw, the line over time, samples: breeding (the breeding design) is not built; the game has one cross from a pod (bot runs 3, 4, 5)
- The house and the manager: free places by turn, bonded share, tuck-away and bring-out: the manager is not built (bot run 6)
- Pods in by source and out by exit (grown, let go, dried), turns held, Freshen: the new Pods screens are not built; only grown and let go through today's screens are counted (bot run 2)
- Data per trip by source and the Watch share, trips that hit the ceiling: the Companion is a stub, so the acts that pay Data are not played (bot run 1)
- Holdings with no cap: the time each pile is held and what the Companion's hold of 20 would have lost: the Station already holds more than 20 (the report counts the share of turns over 20); how long each pile stays and what the Companion's own hold of 20 costs are not measured (bot run 7)
