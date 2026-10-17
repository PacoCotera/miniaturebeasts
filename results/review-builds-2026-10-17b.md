---
ticket: T-20261016-142
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-4
head: a690e6b3 (T-51 c5b9c668, T-53 34827c05, T-54 a690e6b3)
ci: not run (the checks below were run locally on the head)
---
## Verdicts
| Build | Verdict | Capture for the owner |
|---|---|---|
| T-51 Return to the wild (mibi and pod) | **PASS** | `results/T-20261016-51/habitat-panel-wild.png` and `pods-panel-return.png` |
| T-53 Fit the upgrade | **FAIL** (art ticket T-20261016-146) | none yet |
| T-54 Grow it now | **FAIL** (builder ticket T-20261016-147) | none yet |

Judged at 1x on the three builds' captures against specs/station-decision-panel-spec.md (1.2 to 1.4, 1.6), the passed panel art results/T-20261016-70/panel-grow-over-create-1x.png and the reviewed Grow panel (results/review-builds-2026-10-17a.md); purpose first, then style (design/art-direction.md, design/style-guide/README.md), and gate checks 8 to 10.

## Checks run on the head a690e6b3 (a worktree of batch/B-20261016-4)
- `node --test prototypes/station/tests/*.test.mjs`: 488 tests, 488 pass, 0 fail (after `build.sh native`; before it 4 files failed only because `prototypes/face/dist/metrics.json` did not exist in a fresh checkout).
- `node --test prototypes/ui/tests/*.test.mjs`: 81 pass, 0 fail.
- `node --test prototypes/face/tests/*.test.mjs`: 512 tests, 34 file-level passes, 0 fail.
- `./build.sh native`: `face_test: 14966 checks, 0 failed`; layout 386 cases, 0 differ.
- `node .github/public-guard/guard.mjs --base origin/station-gate`: guard_exit=0, `public guard ok`.
- **Not run:** `goldens.mjs --check` and `tools/journey.mjs` (they need the WebAssembly build, which needs the pinned Emscripten SDK, not available here). The builders' lines on them stand unchecked. The T-51 result admits its own first journey run printed two FAIL lines that T-53's head fixed; the head I ran contains that fix, but I could not run the journey to confirm.

## T-51 Return to the wild: PASS
- **Purpose:** each panel shows the outcome of the choice. In habitat-panel-wild.png the Return it card shows the mibi walking out into the wild painting (the scene fills the glow's place, the creature on the plinth), a leaf mark for the Vivarium, the gain on a chip (leaf +2) and "gone for good" in the loss colour; Keep Fig shows the mibi as it is, no mark, no line, and holds the ring. In pods-panel-return.png it is the same with the pod, a Research mark and +1.
- **The default is the safe one:** the ring opens on Keep (the first card neither dimmed nor a loss), as the spec's 1.4 says. The bottom line reads "Keep Fig" / "Keep it" with Back.
- **Words (check 8):** "Return it" plus "gone for good" is 5 words in the Return card; Keep is 2. Nothing over 6. The titles "Return Fig?" and "Return this pod?" are 2 to 4 words.
- **Style:** the same housing, wells, plinths, chips and flat veil as the passed panel; the wild scene is the painted master (T-70). The "✓ again" arms are gone from the code per the result.
- One quiet note: behind the veil on the Vivarium the card text ("your Loika, adult") and the stamp remain faintly legible at the top right. The veil is the master as signed; not a fail.

## T-53 Fit the upgrade: FAIL
Fix ticket: **T-20261016-146** (art).
1. **The Fit it picture is a dark box.** In bench-panel-upgrade.png (zoomed 2x) the fitted part sits inside a hard-edged near-black rectangle (about 52 x 112 px) with a flat beige slab under it, standing on the plinth, while the Not now card shows the same part as a clean cut-out. It reads as a rendering fault. The builder's note 2 already says the master as placed carries its socket; it is placed 1:1 as the spec said, so the fault is the master. Wrong: `bench-part-t2-fitted-128` should be a cut-out with an alpha edge and no box.
2. The rest is right: the title "Fit the upgrade?", the two cards, the cost chips (energy 12, diamond 4) from the rules, "reaches further" (2 words), "Not now" with no cost, the ring on Fit it when affordable, the bottom line reading the focused card. Gate checks 8 to 10 do not bite.
- **Rulings owed (not build faults, for UI/UX):** the spec says "Fit it" is shown "with the adds' icons" and the card has one picture slot, so the icons are not drawn (the builder's note 1); and the install event still starts with "the armed part drops 8 px", though the part is now seated before the press (note 3).

## T-54 Grow it now: FAIL
Fix ticket: **T-20261016-147** (builder).
1. **The two cards show the same picture.** In incubator-panel-grownow.png Grow it now and Wait both show an orange egg, differing only by a little shading. The point of the panel is to show "ready at once" against "as it is now" as the things themselves; a stranger cannot tell the cards apart without reading. The builder notes the bud masters are placed stand-ins.
2. **It does not match the screen behind it.** The Incubator at this build's target (option B, results/T-20261016-40.md, golden/incubator/incubator-growing.png on batch 3) shows the bud as its species' blue spotted pod in candling light, not an egg. The spec itself says "the pod at its ready step" and "the pod at its current step". Wrong: the cards show an egg that exists nowhere else in the game.
3. The rest is right: title "Grow it now?", the cost chip (leaf 9) from the rules, "ready at once", and the one minute count only in Wait's line ("ready in about 18 min": 5 words), the bottom line reading the focused card; the dimming and threshold behaviour are the builder's tests and I did not see the dimmed state in a capture.

## Fix tickets
- **T-20261016-146** (art): recut the fitted part as a clean cut-out.
- **T-20261016-147** (builder): the Grow now cards use the bud's own pod at the two light steps (merge batch 3's Incubator B first).
