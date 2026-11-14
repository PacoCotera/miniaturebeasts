# Fix 14, the focus-only delta check: the capture list (spec §14.2)

Whole 1× frames (1024×600) at the after head, taken by `node prototypes/face/tools/focus-diff-mask.mjs --captures prototypes/station/img/fix14` (the states are the goldens' own, and the eight light states beside them, which are captures and layer-check states, not goldens).
One frame per screen with the focus on its main target, and every painted creature with focus. `verdicts.json` and `diff/` are the diff mask's (`--before`, `--after`); `reasons.json` lists the states that re-gate whole and why.

| Frame | State | Screen | Focus target | Ring | Light, weight, ground (the 2 px floor) |
| --- | --- | --- | --- | --- | --- |
| home-cargo-empty.png | home-cargo-empty | Home | cargo | { rect: 6 }, (683, 41, 330, 98) |  |
| home-resident-focused.png | home-resident-focused | Home, painted creature | resident.<id> | footprint |  |
| home-sleeper-focused.png | home-sleeper-focused | Home, painted creature | the sleeper on the bed | footprint (the nap's curl) |  |
| vivarium-resident-focused-dawn.png | vivarium-resident-focused-dawn | Vivarium, painted creature | a juvenile resident | footprint | dawn, weight default, ground 0.004 to 0.534 in the ring zone |
| vivarium-resident-focused-day.png | vivarium-resident-focused-day | Vivarium, painted creature | a juvenile resident | footprint | day, weight default, ground 0.004 to 0.907 in the ring zone |
| vivarium-resident-focused-dusk.png | vivarium-resident-focused-dusk | Vivarium, painted creature | a juvenile resident | footprint | dusk, weight default, ground 0.004 to 0.733 in the ring zone |
| vivarium-resident-focused-night.png | vivarium-resident-focused-night | Vivarium, painted creature | a juvenile resident | footprint, default weight (night is pinned): the CD's frame | night, weight default, ground 0.004 to 0.401 in the ring zone |
| habitat-door.png | habitat-door | Habitat | door | { rect: 6 } |  |
| habitat-resident-focused-dawn.png | habitat-resident-focused-dawn | Habitat up close, painted creature | resident (the close picture) | footprint | dawn, weight default, ground 0.007 to 0.463 in the ring zone |
| habitat-resident-focused-day.png | habitat-resident-focused-day | Habitat up close, painted creature | resident (the close picture) | footprint | day, weight default, ground 0.007 to 0.839 in the ring zone |
| habitat-resident-focused-dusk.png | habitat-resident-focused-dusk | Habitat up close, painted creature | resident (the close picture) | footprint | dusk, weight default, ground 0.004 to 0.746 in the ring zone |
| habitat-resident-focused-night.png | habitat-resident-focused-night | Habitat up close, painted creature | resident (the close picture) | footprint, default weight (night is pinned) | night, weight default, ground 0.005 to 0.707 in the ring zone |
| habitat-namer.png | habitat-namer | Habitat, namer | act.done (the namer's focus) | { rect: 0 } |  |
| create-shape.png | create-shape | Create | roll | { rect: 0 } |  |
| overview-identified-pod-focused.png | overview, identified, pod focused | Pods | pod | oval |  |
| collection.png | collection | Pods | place.<i> | circle r 93 |  |
| chapter-page.png | chapter page | Pods | rail.<i> | tab |  |
| bench.png | bench | Probe | plates | { rect: 0 }, the drawn union |  |
| library-spread.png | library-spread | Library | frame.<i> | { rect: 0 }, paper (rust, no keys) |  |
| cargo-bay.png | cargo-bay | Cargo | the room | none: room-only focus; captured to show no ring was added |  |
| incubator-growing.png | incubator-growing | Incubator, painted creature (juvenile) | the room | none: room-only focus, no creature target; captured to show no ring was added |  |
| idle-docked.png | idle-docked | Idle, painted creature | the room | none: room-only focus, no creature target; captured to show no ring was added |  |

The ground range is the darkest and brightest luminance in the footprint ring's zone in that light, the stand-in shadow composited as the worst case. A key band reaches 3:1 on ground from 0.1102 up, the core on ground up to 0.2362 (frame.json focus.ring.shapes.footprint.floor). A frame is judged on the whole 1× screen by the creative director; UI/UX signs every painted-creature frame first.
