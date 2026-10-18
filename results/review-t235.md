# Review: T-235 Vivarium polish — build/t-235-vivarium-polish @ 1be7ffed

Base: station-gate 5c7e5101. Four commits (three "WIP" ones and the last), all by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I built wasm and native face in fresh worktrees of head and base and ran everything myself: station, ui and the full face suite, both guards, place-masters, the all-screens goldens check, `journey.mjs`, `checks.mjs`, `layer-check.mjs` and `make-metrics-vectors.mjs --check`. The lead has told me a fix round (the figure measured without the under layers, keepOut derived, moving residents' figure geometry, the reduced nap for species without a nap master) is coming on top of this head; this review is of 1be7ffed.

## Verdict: FAIL on one item (T-20261018-237); the rest of what I checked holds

The **public guard fails**: `node .github/public-guard/guard.mjs --base origin/station-gate` exits 1 with 19 hits on 1be7ffed, all `internal-ref/b-section`: code comments that cite the UI/UX document by section ("build-spec §0", "§3", "§4", "§5", "§6") in 13 files (home.c, home_builds.c, screens.h, focusRing.c, words.h, vivarium.test.mjs, layered-stand.mjs, pictures.mjs, home-props.mjs, vivarium-props.test.mjs, place-stand-shadows.mjs). Station-gate passes it (exit 0). The builder's "guard ok" is the face guard, which passes; the public guard is a separate step. The fix is comments only; T-237 lists every file and line. The fix round's new code needs the same rewording.

## Checks (head 1be7ffed vs station-gate 5c7e5101)
| check | head | base |
|---|---|---|
| station tests | 551 / 551 | 550 / 550 |
| ui tests | 80 / 80 | 80 / 80 |
| face tests (full) | 539 / 561, 22 failures | 536 / 558, 22 failures |
| face failures by name | identical to the base's 22 (all Create) | |
| the builder's total | 551 + 80 + 561 = 1192: matches | |
| public guard | **exit 1, 19 hits** | exit 0 |
| face guard | ok | ok |
| place-masters | 1001 placed, 0 problems | 1001 / 0 |
| metrics vectors | current (12369 cases) | |
| `checks.mjs` | exit 0 | exit 0 |
| layer-check | exit 0, no FAIL line | exit 0 |
| `journey.mjs` | no "differs from the golden" line; 9 in-page FAILs (the base's 9) | 9 |
| goldens, all screens | vivarium (14), idle (9), home, cargo, create, incubator, habitat, library, bench match; pods fail 9 (the known drift, identical on station-gate) | pods fail 9 |

## Against the spec (UI/UX build spec §0–§9, the art director's four signatures)
- **The figure is measured, not the slot (§0):** the props carry each resident's `figure` [dx, dy, W, H], the drawn bbox (ink alpha ≥ 128) of the composed figure in its picture, computed in the logic process and kept with the stand's cache entry. The shadow is left out: I composed the S01 adult and juvenile at the Home, Vivarium and Idle views and the figure is the shadow-less bbox (43 tall against 44 with the shadow for the adult at bare head; 35 against 37 for the juvenile). The focus target is the figure box.
- **The ring (§1):** the footprint ellipse (W + 10) × (fh + 10), fh = 2·⌊(W+6)/12⌋ held to 6–16 (67 × 20 at W 57), on the feet point, never lifted; the test sweeps 40 seeds and holds the ring, the lift and the focus box.
- **The tag (§2):** centred on F.x, slid 8 px inside the window, top at feetY + 16, flipped over the figure at feetY − H − 36 past the window's foot; a sleeper's tag over its ink at top − 32 with no lift. Held by the tests.
- **Contact shadows (§3):** the art director's four 304 × 48 shadows are placed byte for byte beside the stands (`place-stand-shadows.mjs`; each hash is in the index), as a new `under` layer drawn before the base with its row 24 on the stand's feet row 305; composed on a canvas extended below and reduced once with the figure. The picture id carries `+u`.
- **The ground profile and the walk (§4):** the profile x bands 16, 100, 330, 560, 900 with groundTop 372, 352, 316, 324, 344 (Idle 80 lower) are in `vivarium.json`; starts, waypoints and every path sampled every 8 px along the major axis must be on the ground; the eight-draw fallback moves the point down to its column's groundTop; Home keeps its band, as the spec says until its profile is signed. The test runs over 10,000 seeds and holds starts, waypoints and 2 px path samples walkable and off the keep-out.
- **The sleepers (§5):** the nap picture is reduced by the standing figure's factor (54 / 152 adult, 40 / 112 juvenile), about 34 × 31, with the curl's own shadow; the ring and the tag follow its bbox; the old fixed 96 × 88 ink box goes. The goldens show it.
- **keepOut (§6):** `[752, 353, 256, 119]`, with the rule's text updated.
- **Budgets:** the walk's worst frame is under 153,600 in every printed case (twelve adults 133,368 px at 16 ms here; the builder saw 131,646: the same order, my environment); the late frame with the top bar live is 123,346 px. No new overflow.
- **No scaling on the face; no pictures in props:** the new C has no scale, zoom or transform call or literal colour; the shadow and the curl are composed in the logic process and carried as pictures by id; the props carry the figure's four numbers, ids and strings, no rectangle or measure.

## Not blocking
- **Draw order of the ring and the shadow (§3):** the spec says shadow, ring, figure; the shadow is baked into the resident's picture, so the ring is drawn before it. The builder lists it; the shadow is about 5 px tall under the feet inside a 67 × 20 ring, so the visible effect is small. For UI/UX and the art director to accept or ask to split.
- **Moving-set residents and residents with no layered stand have no figure** and keep the old slot geometry (the builder's open question); the fix round the lead mentioned covers moving residents.
- **Home's event tag** does not exist in code yet, so §2's Home event-tag rule is not built (the spec carries it for the built Home).
- **The covered test for stripes against patches (§7)** is the game designer's, on the device; no build change, as the ticket says.
- I looked at the builder's 13 fallbacks in their report; none breaks a rule I checked beyond the first two above.

## Not covered
- The nine pods failures and the 22 Create face failures are the base's.
- I read the Vivarium goldens (the out-with-the-Companion state and the sleeper state, zoomed on the focused sleeper's ring) against the spec; I did not review all 14 + 9 + home states for art.
