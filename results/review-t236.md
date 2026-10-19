# Review: T-236 release readiness — build/t-236-release-ready @ bb99fc54

Base: station-gate 0199563d. Twelve commits, all by Paco Cotera <paco@cotera.org>, no trailers or model/session names in any message. I built wasm and native face in fresh worktrees of head and base and ran everything myself at the final head: station, ui and the full face suite, both guards, place-masters, the all-screens goldens check, **both journeys** (the Station's and the play page's), `checks.mjs`, `layer-check.mjs`, the metrics vectors check, and the guard in tree mode and against main. I also ran the same set at the intermediate heads (96316446 and 2aa5556f) as the lead's notes arrived.

## Verdict: PASS

## Checks (head bb99fc54 vs station-gate 0199563d)
| check | head | base |
|---|---|---|
| station tests | 556 / 556 | 556 / 556 |
| ui tests | 80 / 80 | 80 / 80 |
| face tests (full) | **563 / 563** | 541 / 563 (22 failures: the Create set) |
| public guard (diff mode, vs station-gate) | exit 0 | exit 0 |
| face guard | ok | ok |
| place-masters | 1001 placed, 0 problems | 1001 / 0 |
| metrics vectors (`--check`) | current (12372 cases) | |
| all-screens goldens | **all ten sets match, pods included** | pods fail 9 |
| Station `journey.mjs` | **0 FAILs**, no "differs from the golden" line | 9 FAILs (the Loika v4 ones) |
| play `journey.mjs` | exit 0, 0 failures | |
| `checks.mjs` | exit 0 | exit 0 |
| layer-check | exit 0, no FAIL line | exit 0 |
| the builder's total | 556 + 80 + 563 = 1199 plus their 12 elsewhere = 1211: consistent | |

## What the lead asked me to check
- **The 22 Create fixes do not loosen the asserts.** The cause was real: the Loika v4 has two marking loci, so the first pod of seed 3 now has one look in its first reviewed trait and the scene's `assert.ok(opts.length > 1, "the trait rolls")` failed. The fix moves the fixture seed from gs 3 to gs 2 (a pod whose Markings are heterozygous, three looks) and leaves that assert as it was. The dome tests used to assert the old 88 × 112 collection-class box; they now assert the capsule's relit pod (96 × 91, foot (864, 268)) from `create.json`'s `regions.travel` and the props' `domeSize` and `domeAnchor` (`R.travel.to`, the anchor and size from props), with the same shape of assertion (box at 529, at 530, half way, at the end, the relit picture's id `relit:…:pod:day:96x91:v…`). The spec itself pins the foot, the pod height (72) and that the rest box lies inside the dome in `ui/tests/specs.test.mjs`, so the assertions are derived from a spec that is itself tested. No test was skipped, disabled or relaxed; face is 563 of 563.
- **The pictures-rgba change** drops "label mean under the specimen's mean" on all four screens, as UI/UX ruled (results/T-20261018-236/uiux-rulings.md §1: the v4 pod's pigment is darker than the label's mean, so the mean penalises pigment, not prominence). Kept: the label's 95th percentile under the specimen's, the cell contrast of at least 4.11, the sRGB mean caps (111, Create 115) and Habitat's absolute limits; the test's name and a comment say so and cite the ruling.
- **The journey goldens rewrite follows the Loika v4.** The Station journey now has 0 FAILs where the base had 9, and no golden diffs; `journey-create.json` shrinks (the old panel steps are gone), and `journey-incubator`, `journey-vivarium` and `journey-bench` change by a few lines each for the later rulings (the Release panel, the empty bottom-line middle).
- **The retaken pods goldens match my own rendering.** All of pods, including the nine (and the three more the later rulings moved), pass `goldens.mjs --check` in my environment. This also settles what the nine long-standing pods failures were: stale goldens (the Loika v4 pod), not an environment difference. The art director gates the art.
- **The guard edits are wording only.** The diffs are: station-layouts.md loses dated attributions and internal references (text only), and comments or status strings change in `home-props.mjs`, `home.json`, `pods-page.test.mjs`, `pods-props.test.mjs` and `specs.test.mjs` (the stamp-label test's name excepted, which follows the UI/UX ruling). No code behaviour in those files changes.
- **`BENCE = false` hides the bench without breaking the tiers.** In `shell.mjs` the tab list, the shelf, the sheet, the handle and the tab order all read the constant; the frame is never loaded. The play journey's assertions are rewritten to the hidden bench (display none, no `src`, the focus key cycles Station and Companion, no Bench tab, the stage never inert, the Caddy shelf logic unchanged for H ≥ 1072) and it passes at 0 failures in every tier it covers (wide, standard, short and narrow). The README table follows.
- **The full-tree guard against main.** `guard.mjs --tree` on the head reports 13 hits, identical by file and line to main's own 13, all in `v1/native` (host-credential and cost-prose items already on main); none in `prototypes/` or `design/`. `guard.mjs --base origin/main` reports 71 hits, **all commit trailers** (31 commits authored as Claude or carrying a Co-Authored-By or Claude-Session line); no content hits. The clean-commit release drops those commits' trailers, so what is left to resolve at release is exactly that.

## The later rulings in the range (checked, not asked)
- **Dock (§2a):** Later returns to the screen the player was on; the play journey's B2 asserts Pods with its ring where it was, C (a dock from Home with an empty bay) asserts Home with the ring on the room and now skips the no-choice show; the spec text in `frame.json` and `station-layouts.md` follows; the helper's ReferenceError that had made C's arrival check dead code is fixed.
- **Pods Colour and Markings tiles (art director):** composed from the layered stand in the logic process (`traitTile`, reduced once), carried as pictures in the layered stands' family; the face source is untouched in the whole range, so there is no scaling on the face.
- **UI/UX §3:** "free until Incubate"; the Release panel (no title, its fact in the text colour, the ring on Release, `loss` false); "Unknown" for an unidentified pod (rewritten GB1 C4 test: Unknown even when the species is known, in both the overview and the collection; the species once identified); card-form panels have an empty bottom-line middle (the dock strip keeps its subject), including the Fit panel, with the metrics vectors and its golden retaken.

## Not covered
- The art of the nine retaken pods goldens and the tiles is the art director's gate.
- The play page layout at the four screen sizes (the ticket's item 4) is a report for UI/UX, not code, and I did not review the screenshots.
