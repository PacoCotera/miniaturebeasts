---
ticket: T-20261016-153
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-3 (T-125), batch/B-20261016-4 (T-58)
head: 13288c18 (T-125), 28a41289 (T-58)
ci: not run (the checks below were run locally on each head)
---
## Verdicts
| Build | Verdict | Captures for the owner |
|---|---|---|
| T-125 Incubator B shadow fix | **PASS** | `results/T-20261016-125/incubator-growing-late.png` and `incubator-ready.png` |
| T-58 dock arrival and send-off | **FAIL** (builder ticket T-20261016-161) | none yet; the show frames are fine, the choice strip is not |

Judged at 1x against results/T-20261016-99/shadow-steps-S01-1x.png and specs/face-arc-and-shadow.md (T-125), and against specs/station-dock-arrival-spec.md and the passed art results/T-20261016-120/ (T-58). Purpose first, then style (design/art-direction.md, design/style-guide/README.md), then gate checks 8 to 10.

## Checks run (each head in its own worktree, `./build.sh native` first so `face/dist/metrics.json` exists)
- **T-125, 13288c18:** station 468 pass, ui 80 pass, face 513 tests (35 file passes), 0 fail; `face_test: 14818 checks, 0 failed`; guard exit=0. All equal the builder's numbers.
- **T-58, 28a41289:** station 512 pass, ui 81 pass, face 526 tests (36 file passes), 0 fail; `face_test: 15074 checks, 0 failed`; guard exit=0. All equal the builder's numbers.
- **Not run:** `goldens.mjs --check` and `tools/journey.mjs` (they need the WebAssembly build and the pinned Emscripten SDK); `layer-check` (the builder reports three failures on `incubator-hatch-skip`, a point named for the Incubator that lands on another screen after the skip; I did not look at them).

## T-125 Incubator B shadow: PASS
The T-121 fail is closed.
- **It is the passed shadow.** In incubator-ready.png the founder inside the pod is one flat warm-dark silhouette (ears, head, back, legs), smooth-edged, with no colour, no eyes and no dither, like the "ready: all known" panel of shadow-steps-S01-1x.png. In incubator-growing-late.png (7 minutes left, about four chapters known) the same shape is softer and lighter, lit from below by the amber glow, like the passed "4 chapters" panel. The sharpening from soft to crisp is visible across the states, as the spec says.
- **It shows from nothing cleared.** In incubator-growing.png (cool step, nothing cleared, 0.25 opacity) the body is a faint darker smudge in the lower half of the shell, hard to read as a shape at 1x. That is what the ruling's 0.25 at the cool light gives; the passed art's first panel is lit at a higher step for all four panels. If the owner wants the body legible from the start, the cool step's opacity needs a ruling (UI/UX or the CD); it is not a build fault.
- **The slip is not drawn** (the lab sweep; T-126 gives the machine's display), so the left column is empty dark ground in all captures. The screen is lopsided until T-126 lands; correct per the sweep, and the builder asked for a call on it. The slip's mid-word cut, my T-121 third fail, is moot while it is not drawn (the builder built and tested the word-cut anyway).
- **Words and materials (checks 8 to 10):** the card is a dark display with the chapter word and one look word (3 to 4 words); the ring, the pod and the stamp are unchanged from the earlier review. Nothing paper is drawn.
- The builder's own notes stand: the ready frame still redraws 270,362 px (44%) until the recut ring art (T-124) is placed; the hatch's first frame redraws 188,330 px (30.7%).

## T-58 dock arrival and send-off: FAIL
Fix ticket: **T-20261016-161** (builder).
**What passes** (cargo-arrival-2200.png, cargo-arrival-empty-trip.png, home-sendoff-800.png, the frame strip in results/T-20261016-58/):
- The show reads as "these came home": the big Loika stands on the apron in front of the two crates, with the second mibi dithering in, the ribbon "The Companion is home", the mended plates top left, the one who leaves top right, and "Skip" in the bottom line. The apron and its shadow are as in the passed T-120 proof. An empty trip shows the ribbon, the one mibi and "the bay is empty" with no strip.
- The send-off on Home (home-sendoff-800.png) shows a resident dithering out at the bottom right with the plate "the crates went out with the Companion"; the screen does not change.
- The link light is drawn as a thin bright line across the bay at y 299 in the 2.2 s frame; it is the spec's element (a light running in from the left), noted only because at 1x it reads as a hairline.

**What fails** (cargo-arrival-choice.png):
1. **The cards' pictures are flat lavender-grey squares** (each 96 x 96) where the crates should be, in both cards. The builder labels them placeholders. The player is offered "Open the bay" and "Later" with no picture of either. Wrong: two flat squares, expected the open and the sealed crates (spec section 2, picture-led).
2. **The strip is a flat dark-navy plate** with a thin outline, not the sage housing and brown wells of the passed frame (arrival-end-1x.png) or of the other decision panels (Create, Return, Fit, Grow now). It is the code-drawn plate the build used because "no 840 x 160 master exists". Station style: device plates placed 1:1, never a fill (style guide, The Station). Wrong: it does not look like the same kit as every other panel in the game.
- **Findings, not fails of this build (UI/UX):**
  - The first card holds 8 words ("Open the bay" plus "two crates to the rack") against gate check 8's 6; the line repeats the bottom line and the crate picture. UI/UX should cut it (raised in results/review-art-2026-10-17c.md).
  - The ribbon is a brown label plate whose words change by case (check 10); for the lab sweep.
  - The dock arrival now always plays on the Dock, including an empty trip (2.5 s); that is per the spec's section 3.

## Fix tickets
- **T-20261016-161** (builder): the choice strip drawn from the panel kit, with the crate pictures.
