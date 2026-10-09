# Intents

A key on a focused target arrives from the face as `{ t: "intent", screen, target, verb }` (verbs: `confirm`, `back`, `room:<key>`, `step:<dir>`). Each module here is the rule call behind one screen's intents, with no DOM, no canvas and no clock of its own, so the page's host and the Node host call the same code.

Every function takes the host `h` first: `{ st, sv, settings, ui, now() }` (the Station's part, the Companion's part, the developer settings, the per-screen state, the time in ms) and the effects `h.say(text)`, `h.goto(screen)`, `h.play(event)` (an event for the face: `{ kind, target, ms, hold?, from?, to? }`), `h.save()`, `h.lock(ms)`. They change `h.ui` and call the rules in `state.mjs`; they decide nothing else.
