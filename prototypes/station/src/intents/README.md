# Intents

A key on a focused target arrives from the face as `{ t: "intent", seq, screen, target, verb }` and nothing else (verbs: `confirm`, `back`, `room:<key>`, `step:<dir>`, `wake`). Each module here is the rule call behind one screen's intents, with no DOM, no canvas and no clock of its own, so the page's host and the Node host call the same code. A module finds what it needs in the state (Create's pod is `h.ui.create.podId`), never in the message.

Every function takes the host `h` first: `{ st, sv, settings, ui, specs, now() }` (the Station's part, the Companion's part, the developer settings, the per-screen state, the spec files the rules read (`specs.pods`, `specs.frame`), the time in ms) and the effects `h.say(text)`, `h.goto(screen)`, `h.play(event)` (an event for the face: `{ kind, target, ms, hold?, from?, to? }`), `h.save()`, `h.lock(ms)`. They change `h.ui` and call the rules in `state.mjs`; they decide nothing else.

The host drops an intent while an event holds input (`TL.holding()`, lvgl-switch.md §2.1): nothing here checks it. The Dock key is not a face verb; the host calls `frame.dock(h)` itself.
