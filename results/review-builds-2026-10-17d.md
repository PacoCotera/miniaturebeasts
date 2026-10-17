---
ticket: T-20261016-174
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-4 (T-154), work-queue (T-167)
head: 32179012 (T-154); the commit that moved T-167 (tools/device-sheet.py)
ci: not run (the checks below were run locally)
---
## Verdicts
| Build | Verdict |
|---|---|
| T-154 Companion world events | **PASS** |
| T-167 the device sheet tool | **FAIL** (one small fix, T-20261016-175): it omits two Station screens |

## T-154 Companion world events: PASS
Checked against specs/world-events.md and the code diff of 32179012 (prototypes/exploration/index.html).

**Run (a worktree of 32179012):**
- `node --test prototypes/exploration/tests/*.test.mjs`: 309 tests, 308 pass, 0 fail, 1 skipped.
- `node --test prototypes/exploration/tests/world-events.test.mjs`: 7 tests, 7 pass, 0 fail.
- `node --test prototypes/station/tests/*.test.mjs` after `./build.sh native` (`face_test: 14981 checks, 0 failed`): 511 pass, 0 fail (the builder says 511). Before the native build 5 station tests failed only because `face/dist/metrics.json` did not exist in a fresh checkout.
- `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?`: `public guard ok`, guard_exit=0.

**Against the spec:**
- **Ten kinds, one per sentence:** `grown`, `elder`, `lampLow`, `lampOut`, `herd`, `storm`, `fruit`, `stirring`, `young` and `quiet` are each emitted by the same line that writes the sentence, through one helper (`say(line, event)`), with the four-slot `[kind, place, who, n]` shape. `grown`'s `n` is 0 home, 1 leads, 2 can lead; `herd` carries the species index or -1 and the 1 to 8 direction code (0 when it spread out); `storm`'s `n` is 1 when it reached a new place and 0 for the first; `fruit` carries the bush count; `stirring` the new pod count. All as the spec's table says.
- **At most three, in order:** `return { lines: lines.slice(0, 3), ev: ev.slice(0, 3) }` cuts both the same way, so each event is the one for its line, in the lines' order; the test runs 80 turns with 0, 1, 2 and 4 mibis growing and checks the count, the shape and the order.
- **Old saves untouched:** the crate gains `world: { v: 1, turn, ev }` beside `lines`; `lines` stays; `rep.lines` is unchanged; nothing migrates a crate sealed before this (a crate without `world` is left as it is, asserted by the trips test). `worldTurn` now returns an object; its only caller is `endExpedition`, which the diff updates.
- **Places:** `PLACE_KIND` is LAND_NAME's order; `placePhrase` is rebuilt from `placeKind` plus a phrase table with the same words ("near the cliff", "by the river"), so the sentences read as before.
- **Small observations (no change asked):** an outpost's place is `PLACE_KIND[G.land[c]]`, which is undefined for a land id outside the six; JSON serialises it as null, which the spec's shape allows (a land kind or null). `fruit` and `stirring` take their place from `mainLand`, which would answer "meadow" for cells whose land is unreadable; the cells come from walkable lands, so this does not arise today.

## T-167 the device sheet tool: FAIL
Fix ticket: **T-20261016-175** (mechanical).

**Run:** `git fetch` of both heads, then `python3 tools/device-sheet.py /tmp/.../sheet.png` from work-queue: `4232 x 7872, 39 frames`, exit 0, about 13 s.

**What is right:**
- One command renders the sheet from the committed goldens (git show, no checkout), every frame unscaled at 1024 x 600 with its label inside the image (`cell id · state`), each family with its heading and the head it was read from.
- The order follows the flow: Home, Vivarium, a mibi up close, Pods, Probe bench, Create, Incubator, Cargo, Library, then the decision panels (continued on a second row because there are five).
- The proof slot works as described (a refused unknown cell; a PROPOSED frame beside the one it replaces).

**What fails:**
1. **It does not hold every Station screen.** The Station's navigation lists Idle (frame.json navigation.screens, golden/idle with nine captures) and the namer (golden/habitat/habitat-namer*.png, six captures); neither is on the sheet. The builder's note 2 says so. Wrong: 9 families, expected 11 (Idle and the namer missing); the fix adds 7 frames (39 to 46).

**Worth knowing, not a fail:**
- The two heads have diverged, so the sheet reads Probe, Create and Incubator from batch B-3 and everything else from B-4. The Create row therefore still shows the wireframe-outline Create (lavender ground, empty drums) while the panels row shows the finished B-4 panels; the sheet is a picture of two heads, not of one build. The tool labels each row's head, so this is visible, but anyone reading the sheet as "the product now" should know.
- The Probe bench and Incubator rows show the B-3 state (the Incubator with the T-125 shadow; the earlier build without the slip); the sheet is exactly as current as the last golden retake on each head.

## Fix tickets
- **T-20261016-175** (mechanical): add the Idle and namer rows to tools/device-sheet.json.
