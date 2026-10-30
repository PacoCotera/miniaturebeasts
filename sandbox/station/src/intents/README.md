# Intents

A key on a focused target arrives from the face as `{ t: "intent", seq, screen, target, verb }` and nothing else (verbs: `confirm`, `back`, `room:<key>`, `step:<dir>`, `wake`). Each module here is the rule call behind one screen's intents, with no DOM, no canvas and no clock of its own, so the page's host and the Node host call the same code. A module finds what it needs in the state (Create's pod is `h.ui.create.podId`), never in the message.

Every function takes the host `h` first: `{ st, sv, settings, ui, specs, now() }` (the Station's part, the Companion's part, the developer settings, the per-screen state, the spec files the rules read (`specs.pods`, `specs.frame`), the time in ms) and the effects `h.say(text)`, `h.goto(screen)`, `h.play(event)` (an event for the face: `{ kind, target, ms, hold?, from?, to? }`), `h.save()`, `h.lock(ms)`. They change `h.ui` and call the rules in `state.mjs`; they decide nothing else.

The host drops an intent while an event holds input (`TL.holding()`, lvgl-switch.md §2.1): nothing here checks it. The Dock key is not a face verb; the host calls `frame.dock(h)` itself.

## Library (`library.mjs`)

Targets are `cell.<SNN>` only, the met and found cells of Level 1; the host sets `ui.lib.l1` (the species of the ring) from the face's `focus` message (`focus(h, target)`). ✓ on a met or found cell opens that species, `library.species` (Level 2, which the frame draws as not built yet; its ← is Level 1 with the ring on that species); ✓ on anything else does nothing; ← sets Home's ring on the Library bezel and goes Home. `openAt(h, id)` is every way in that names a species: Home's Library bezel (the species its module is for) and Habitat's species word ("Open the guide").

Level 3 (`library.family`, the `family` export): `openFamily(h, mibiId)` is every way in (Level 2's family face and the card's origin lines, ✓ See the family): close on that mibi, its parent Level 2 of its species. Targets are `node.<mibi id>` and `node.bud`; the host keeps the ring in `ui.lib.l3[species].node` and notes a ▲ (a move onto the parent it answered) in `ui.lib.l3last` for the next selectors (`lineage.mjs resolveOf`). In far ✓ is Zoom in (close on the ring's node, under the 180 ms stage dither) and ← is Level 2; in close ✓ is Compare from {name} (compare, the ring's mibi held in `ui.lib.l3[species].held`; the bud has none) and ← is far while the tree exceeds the view, else Level 2; in compare ✓ on another mibi moves the hold, ✓ on the held mibi is Look at {name} (Habitat up close on it; nothing when it is released) and ← (Done) is close, the camera and the ring kept. In close and compare a ring move that would leave the comfort zone pans the camera.

## Probe bench (`bench.mjs`)

Targets: `plates`, `switch`, `slot`; the host sets `ui.bench.f` from the face's `focus` message (`focus(h, target)`). ✓ on the slot opens the Fit the upgrade? panel (`intents/bench.mjs` `fitNow` is its Fit it card). ← is Home with the ring on the Probe module.

| ✓ on | Does | Plays (numbers from `bench.json` `events`) |
| --- | --- | --- |
| `plates` | `state.mendPlate`: the first gone plate is whole for ⚡ 1; short, `strings.short` on the message plate and nothing spent | `mend` (from the whole before, to one more), held 300 ms (0 with reduced motion) |
| `switch` | `state.setMendFull(st, !mendFull)`: the dock mends every plate at its price, or two, free | `switch` (from 0/1 to 1/0), no hold |
| `slot` | Docked and tier 1: short says so and spends nothing; the first ✓ arms; the second `state.installTier2` | `install` (from the whole plates before, to 4), held 900 ms; `ui.bench.install` is set until it ends (the tier-1 cradle picture stays on the face) and not set with reduced motion |

The Dock key on the bench is a cut: lifted, a ring on the plates moves to the switch and the arm clears; docked, the ring stays and the plates show as the dock left them.


## Sitting (`sitting.mjs`)

Targets: `card.<i>` on the pose and place steps, `room` on the confirm step and the portrait; the mibi is Habitat's shown one (`ui.hab.id`) and the visit is `ui.sit` (`{ step, pose, place, focus, armed, from, prev }`), opened by `host.mjs` `enterSitting` (never on the portrait while its picture is not held). The host sets `ui.sit.focus` from the face's `focus` message (`focus(h, target)`). A room key and leaving the screen drop `ui.sit`; nothing is spent before the second ✓ of the confirm step. The door stays shut while `nav.mjs` `BUILT` does not list the screen.

| Key | Does | Plays (numbers from `sitting.json` `events`) |
| --- | --- | --- |
| ✓ on a pose card | the pose is chosen, the place step opens | `dither` on `glass` and on `resident` (`events.backdrop`, 200 ms; with `events.backdrop.resident` "cut" the resident's picture waits for the end) |
| ✓ on a place card | the place is chosen, the confirm step opens | none (cuts) |
| ✓ on the confirm step | the first arms (the lit gilt); the second begins: `beginSitting` at the screen change, Habitat with the plate (`strings.beganPlate`) and the ring on Portrait | `dither` on `gilt` from the lit gilt (`events.begin.steps[0]`), held `events.begin.hold`; then the screen change at `steps[1].at` |
| ← | a step back keeping the choice; from the pose step and the portrait, Habitat with the ring on Portrait | the backdrop's dither back on leaving the place step |
| the pad on the pose step | (the face's) a change to or from the curl | `dither` on `resident` (`events.pose`, 16 levels over 180 ms), cut by the next press |

Reduced motion: every change is a cut and begin lands on Habitat on the frame of the key.
