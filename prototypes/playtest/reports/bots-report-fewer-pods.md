# Bot runs

20 games a policy, 30 world turns each, up to 60 keys a turn, economy strict, native face. stub trips: Energy 2-4, Data 4-12, Essence 1-3, 0-2 pods of Loika/Tuikis/Untuva a trip, about 1 (assumed, not measured).

STUB: the trips are the stand-in Companion's, so what comes in is an assumption; what the policies do with it, and what the Station does, is measured. The world turn is one trip; between two turns 20 minutes of Station time pass.

| policy | first hatch: turn median (range) · games | first elder | hatched at end (median) | Energy at end, mean (peak) | Data at end | Essence at end | pods held at end (median) · peak | pods never read | dead ends: games (events) | soft locks | crashed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 4 (1–9) · 20/20 | 22 (19–27) · 20/20 | 8 | 69.15 (peak 86) | 217.65 (peak 236) | 15.75 (peak 35) | 20.5 · 30 | 88% | 20/20 (342) | 0 | 0 |
| greedy | 2 (1–3) · 20/20 | 20 (19–21) · 20/20 | 8 | 72.65 (peak 86) | 171.45 (peak 205) | 30.3 (peak 38) | 22.5 · 30 | 75% | 0/20 (0) | 0 | 0 |
| hoarder | never · 0/20 | never · 0/20 | 0 | 90.45 (peak 102) | 242.85 (peak 263) | 60.15 (peak 70) | 30.5 · 38 | 100% | 0/20 (0) | 0 | 0 |
| speedrunner | 2 (1–3) · 20/20 | 20 (19–21) · 20/20 | 1 | 88.45 (peak 100) | 241.05 (peak 262) | 58.8 (peak 70) | 29.5 · 37 | 100% | 0/20 (0) | 0 | 0 |

Pods received a trip (mean): random 1.01, greedy 1.02, hoarder 1.02, speedrunner 1.02.

Dead ends (the stuck detector) by place: habitat.rest 87, vivarium.empty 85, create.nothingRead 62, home.home 41, pods.chapter 18, cargo.bay 9, incubator.growing 6, pods.overview 6, vivarium.rest 5, library.all 4, pods.compare 4, pods.collection 3, create.shape 3, library.species.sheet 2, library.species.lit 2, bench.docked 2, library.family.close 1, library.family.compare 1, incubator.empty 1.

Share of game-turns holding more than 20 (the old hold): random Energy 73%, Data 93%, Essence 10%; greedy Energy 66%, Data 86%, Essence 17%; hoarder Energy 79%, Data 94%, Essence 66%; speedrunner Energy 77%, Data 93%, Essence 64%.

Screens never reached by any bot: sitting.

Energy, Essence and Data held turn by turn (mean, min, max over the games) are in the JSON under `policies.*.energy|data|essence.byTurn`.

Not measurable yet:

- Crosses beyond the first: crosses a trip, refusals by reason, the forecast against the draw, the line over time, samples: breeding (the breeding design) is not built; the game has one cross from a pod (bot runs 3, 4, 5)
- The house and the manager: free places by turn, bonded share, tuck-away and bring-out: the manager is not built (bot run 6)
- Pods in by source and out by exit (grown, let go, dried), turns held, Freshen: the new Pods screens are not built; only grown and let go through today's screens are counted (bot run 2)
- Data per trip by source and the Watch share, trips that hit the ceiling: the Companion is a stub, so the acts that pay Data are not played (bot run 1)
- Holdings with no cap: the time each pile is held and what the Companion's hold of 20 would have lost: the Station already holds more than 20 (the report counts the share of turns over 20); how long each pile stays and what the Companion's own hold of 20 costs are not measured (bot run 7)
