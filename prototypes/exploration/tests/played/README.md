# The played-game tests

These play the game that ships: no page-harness, no generator 5, no calls into game code. `played.mjs` builds the bundle with `ops/sandbox/bundle-pages.sh`, serves it as `/play/`, and opens it at 412x915 (dpr 2.625) and 522x935 (dpr 3) with touch on.

- A test drives the page only by pressing its on-screen buttons (d-pad, ✓, ←, Call, short or held).
- His save loads as the live page loads it (`mb-save-v8@<companion id>`). Saves are in `saves/<issue>.save`, copied from the internal repo's bug-assets branch.
- `saves/sleep-dusk-<seed>.save` are arranged once (a seed with a late Loika, the explorer a few tiles from her bed, the clock at light 525) and committed; s7 loads one and presses only the d-pad.
- The verdict is read off the screenshot (pixels in a region, a region against a shot from the same test). Reading state only asserts the case is reached.
- Each test's first comment quotes the ruling it holds. Run: `PW_DIR=<dir with node_modules/playwright> node --test "prototypes/exploration/tests/played/*.mjs"` (quote the glob; Node 22 reads a bare directory as a file). `PLAYED_SHOTS=<dir>` keeps the shots of s2.
- The machine's load stretches s2 (the land next door takes 20 s or more to draw); it waits up to 40 s.
- s4/s5 (one scale, code-audit step 6) also open 390x844 (dpr 3). s5 needs the Station face: copy a built prototypes/face/dist (face.mjs, face.wasm, metrics.json) into the tree first; CI has it from the face build.
