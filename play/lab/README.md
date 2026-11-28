# The lab bench (grey greybox, Loikas only)

The lab as a deduction game on the real genetics engine (`prototypes/species/framework`): hidden traits worked out from samples, test crosses and hatches. Grey boxes, draft words, no art. It plays the four moments of the lab-pictures-4 pictures: the hatch that proves a parent, a sample that answers one question, a trait seen on an expedition, and a cross with its four children.

- Shown in the play page's Station frame when the Options row **Lab bench (Loikas only)** is on (Done reloads the page). Off: the Station as before. The page also opens on the Station with the row on.
- `src/engine.mjs`: the thin layer on the engine (draws, `children`, `forecast`, kinship), as `tools/lab-sim` used it (lab-sim-1). `src/rules.mjs`: ink, the kin logic (what the known copies force, after every clue), the expedition turn, the bench, the cross preview, the hatch. `src/main.mjs`: the screen, keys, taps and the clock. `src/words.mjs`: all draft words.
- Ink: Markings and Crown are sets of copy counts a Loika can still have (one left = solid); Eyes, Drive, Efficiency are known or not. A hunch (light square, value with "?") is a set whose likeliest value has 60% or more.
- Waits: bench 30 min (the first sample ever 2), bud 20 min; with Playtest waits on, 6 s, 2 s and 8 s. The save is `mb-save-v8-lab` (Start fresh erases it).
- Not here: wild pods, drops, seasons, art. The trait glyphs are wireframe schematics: the five trait pictures are an empty slot for the art desk.
- Tests: `node --test prototypes/lab/tests/rules.test.mjs`.
