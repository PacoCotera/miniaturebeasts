# The played-game tests

These play the game that ships: no page-harness, no generator 5, no calls into game code. `played.mjs` builds the bundle with `ops/sandbox/bundle-pages.sh`, serves it as `/play/`, and opens it at 412x915 (dpr 2.625) and 522x935 (dpr 3) with touch on.

- A test drives the page only by pressing its on-screen buttons (d-pad, ✓, ←, Call, short or held).
- His save loads as the live page loads it (`mb-save-v8@<companion id>`). Saves are in `saves/<issue>.save`, copied from the internal repo's bug-assets branch.
- The verdict is read off the screenshot (pixels in a region, a region against a shot from the same test). Reading state only asserts the case is reached.
- Each test's first comment quotes the ruling it holds. Run: `PW_DIR=<dir with node_modules/playwright> node --test "prototypes/exploration/tests/played/*.mjs"` (quote the glob; Node 22 reads a bare directory as a file). `PLAYED_SHOTS=<dir>` keeps the shots of s2.
- The machine's load stretches s2 (the land next door takes 20 s or more to draw); it waits up to 40 s.

## Part 2 (played2.mjs; code-audit step 1, job 2)
`lib/harness.mjs` holds the shared bundle, server, `open()` and the judging helpers (the glob does not match it). `played.mjs` is s1-s3, `played2.mjs` is s4-s8.
- s4 the Call on a west, north, east and south edge tile and on an inner tile (#143): a short press never zooms out (the hero is as large as before in every frame the browser paints for 2.2 s), a long press always does.
- s5 cliffs (#146: tiles 0,7 and 0,8 stop at the wall). s6 the east edge of a place walks out after a Call (#159). s7 night beside day at one spot, by luminance in named regions (#113; #127's no-marks reading is an extra there). s8 the Companion's drawn width read off the screenshot: 343 px at 412, 410 px at 522 (#27, #134, #135).
- Each was run against the break it holds: s4 with PR 578 reversed (572's edge view back), s5 with 579 reversed, s6 with 601 reversed, s7 with the night level set to day's, s8 with the whole-multiple rule of 540 (171 px at 412, 300 px at 522).
- A press that takes the hero into a place not yet baked can wait 20 s or more: tests poll the screen, they never sleep a fixed time.
