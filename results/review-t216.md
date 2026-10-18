# Review: T-216 Cargo (build spec sections 1 to 6) — cargo/build-spec @ ba2c26d1

Base: station-gate 12878132, merged into the branch at cdef3666. Eight commits on it, all by Paco Cotera <paco@cotera.org>, no trailers or model/session names in any message (the five "WIP" ones included). I built wasm and native face in fresh worktrees of head and base and ran everything myself: station, ui and the full face suite, both guards, place-masters, the all-screens goldens check, `journey.mjs`, `checks.mjs`, `layer-check.mjs`, `make-metrics-vectors.mjs --check`, and the cut script's `--check` against the art director's cleaned cuts.

## Verdict: PASS

## Checks (head vs station-gate)
| check | head | base |
|---|---|---|
| station tests | 550 / 550 | 550 / 550 |
| ui tests | 80 / 80 | 80 / 80 |
| face tests (full) | 535 / 557, 22 failures | 529 / 551, 22 failures |
| face failures by name | identical to the base's 22 (all Create) | |
| the builder's total | 550 + 80 + 557 = 1187, 1165 pass: matches | |
| public guard | exit 0 | exit 0 |
| face guard | ok | ok |
| place-masters | 1000 placed, 0 problems | 980 placed, 0 problems |
| metrics vectors | current (12366 cases) | |
| `checks.mjs` | exit 0 | exit 0 |
| layer-check | exit 0, no FAIL line | exit 0 |
| `journey.mjs` | no "differs from the golden" line (journey-home.json is regenerated and agrees); 9 in-page FAILs, the same 9 as the base | 9 |
| goldens, all screens | cargo (29 states), create, incubator, home, habitat, idle, vivarium, library, bench match; pods fail 9 | pods fail 9 (the 8 and pods-panel-return: the known drift) |
| `cargo.test.mjs` | 52 / 52 | |

## The cuts are the art director's, byte for byte
- `cargo-cuts.py --check --cleaned results/T-20261016-197/finish/cuts`: exit 0; the placed `crate-lifting-256x200`, `crate-lifting-176x138` and `pods-hatch-open-160x260` are the art director's cleaned cuts byte for byte; the 176 px crate masters are the reductions of the 256 ones (sitting, lifting, shadow); the two crops masters-pods already holds are what the rule gives.
- I regenerated every cut the script writes (cargo-bay-992x506, berth recess, shut and edge, berth-gilt, cargo-mat, well-lit, the three done crates) and compared each to the file in the tree: all twelve are pixel-identical.

## Against the authority
- **Build spec sections 1 to 6** (section 7 is the follow-on, not built, as ruled): the regions and rects, the display row (order, 16 and 24 gaps, feet 220, centred x 600, the glint star, the 48 x 64 fallback when wider than 800), three berths of 256 at x 200, 472, 744 or four of 188 with the portrait crate in the fourth and the gold edge, the per-crate timeline (0 lifting, 200 display, 500 the materials answer, 700 and 150 apart the materials travel, 1500 the hatch, 1700 and 300 apart the pods and finds, the end at the last item + 300), the crate length formula, the portrait crate's out-of-bay travel to (-200, 40), the states (bay, opening, end), ✓ Open them all / Open it / Skip / Look at the pods, no ✓ cap when nothing is in, no focus ring, and the strings (Bay, Open them all, Open it, Skip, Look at the pods; the retired done, ribbon, crates, empty, away, opening and report are gone; waiting and waitingOne stay). The face tests hold each of these (52 tests: exact rects, the departure check bites, the mat's three places and the fourth's "+n", the swap, the finds, the end).
- **The architect's dither ruling:** no Cargo stage exemption. The display dither is `v_dither_window` from clear on each item's own box, and the test holds its dirty rects inside (200, 60, 800, 180). A pod's size swap is two `v_dither_window` nodes on one level clock (travel picture out, well pod in); the test holds at levels 0, 8 and 16 every pixel of the 40 x 48 rect is the travel's or the pod's, never clear, that at 16 it is the plain sprite, and that each swap frame redraws at most 11,776 px. The opening's worst frame is printed and asserted: 97,352 px (15.8%) at both 16 ms and 40 ms sampling, under 153,600; the builder's number is exact. The lvgl-switch.md row no longer has "Cargo's crate and end dithers": it now reads "the stage dither (the screen change, 180 ms, which a dither at a run's end to another screen stays)", keeping the Incubate exemption's figure.
- **No scaling on the face:** the new C (`cargo.c`, `frame.c`, `prim`, `vocab`, `screens.c`) has no scale, zoom or transform call and no literal colour; every picture is placed 1:1. The two new `prim` and `vocab` words only report a held picture's size. The mat and the berth edges are pictures cut at build time, so no off-palette pixel is drawn in code.
- **No pictures in props:** `cargo-props.mjs` carries state, counts, asset ids, strings, flags and which crate's pod goes to which well or mat place; no rectangle, measure or colour; the pictures are requests the host makes ready. The props are held by `cargo.props.json` and its test.
- **Budgets:** the dock show's worst refresh is 99,638 px (16.2%) at 16 ms, also under the quarter; the hold's ceiling is 30,000 ms (`HOLD_MAX`, lvgl-switch §2.7).
- **The rule is applied crate by crate** (`openCrates`, so the crates not yet opened stay sealed in the bay if the player leaves), and Skip, ← and a room key during the opening are said on `room` by the face and end the face's hold (the pad says nothing): held by the host-hold and intents tests.
- I looked at the head's bay and opening goldens against the art director's `finish/cargo-rest.png`: the bay matches the finish (the berth composition, the hatch and ring, the mat with its waiting pod), and the opening frame shows the pods in flight to the hatch, the materials in the display and the top-bar counters lit.

## Builder's fallbacks (with UI/UX; none breaks a rule I checked)
Each is stated in `results/T-20261016-216/builder-report.md`. The ones worth the lead's eye:
- The face carries Inter 16, 20 and 28 only: the mat's "+n" (spec 13) is 16 and the display amounts (spec 22 medium) are 20.
- The mat (spec: drawn in code) and the portrait crate's gold edge and keyline (spec: drawn in code) are cut as pictures at build time, because the face palette has none of those colours. Either the spec should say so or the palette should gain them.
- The dock arrival (T-120) is not in the new spec and keeps its old bay, crates, rack and ribbon under `dock*` regions, so section 6's "a Dock while the bay shows: each crate cuts in, sealed, no slide and no door" holds only after the arrival show.
- A crate that holds nothing is read as holding one material for its length (1,600 ms), where the spec's formula would give a negative term.
- The art director's still draws a 3 px frame round the shut hatch that section 1 does not list; it is not drawn.
- In the opening frames the find (the pearl) is shown with its master's opaque dark blue 112 x 112 backdrop; that is the placed master, for the art director to look at.

## Not covered
- The 22 Create face failures and the pods drift are the base's; I did not look for their cause.
- Section 7 (Open the bay) is not built and not reviewed.
- I did not review all 29 Cargo goldens for art; I read the bay and the opening-pod frames.
