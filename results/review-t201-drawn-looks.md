---
ticket: T-20261016-209
status: done
branch: PacoCotera/miniaturebeasts:build/t-201-drawn-looks
head: 1f779d6b
ci: not run (the checks below were run locally)
---
## Verdict: FAIL (fix ticket T-20261016-210)
The logic is sound: (a) holds, (b) holds, and (d) is confirmed. But the branch exits the public guard with a hit, four goldens were left behind, and the art director has not passed the base. This review was asked for in a message from the lead; I wrote and claimed T-20261016-209 for it.

## What I ran (worktrees of 1f779d6b and of its base, station-gate 5cc0bbc4; the pinned Emscripten SDK 4.0.23 installed in my scratch space so the wasm face and `goldens.mjs` ran)
- Station 469 pass, ui 81 pass, both 0 fail.
- `node prototypes/face/tools/guard.mjs` (the removed-paths guard): `guard ok` (75 removed paths, 281 files, 0 failures).
- **Public guard: FAIL.** `node .github/public-guard/guard.mjs --base origin/station-gate`: exit 1, `prototypes/station/src/pictures.mjs:106 internal-ref/b-section M1 §*`, "public guard: 1 hits". It reproduces against base 5cc0bbc4. The result says "Guard ok".
- **Face tests with the wasm built:** base 5cc0bbc4: 506 tests, 483 pass, 23 fail; this branch: 506 tests, 483 pass, 23 fail. Without the wasm build every face test skips (472 skipped), so only a built face shows them.
- **`goldens.mjs --check home habitat idle vivarium`:**
  - base 5cc0bbc4 in my environment: home 8 failures, habitat 23 failures, idle and vivarium match (so my Chromium also disagrees with some of base's own goldens, 31 states).
  - this branch: home match, idle match, vivarium match, habitat 4 failures.

## (a) No new work in the deprecated JS drawing layer: holds
The removed-paths guard passes. `drawnLooks` is in `station/src/looks.mjs`, a pure function of the frame and the mibi; the stand is composed once in the logic process (`layered-stand.mjs`, `pictures.mjs` `registerLayered`, `registerAsset` guarded by `hasAsset`, keyed by the variant id, the light graded from the day picture); the face is untouched (no file under prototypes/face/src changes; the only face-side change is a capture state in the tool `vivarium-states.mjs`). The new page code uses the decoder already named in `masters.mjs` (the one allowed canvas read) and `createImageBitmap`, and the guard accepts it.

## (b) Hidden copies never show: holds
`drawnLooks` takes the look from `traitState(...).shows` for a read chapter. I checked it: for 600 seeded Loikas I replaced every hidden copy of each look trait by its shown partner (`hiddenCopy` from cross.mjs) and re-read: 302 traits had a hidden copy, **0 changed the drawn look**. An unread chapter draws the species' common look from `stand-looks.json`, never this mibi's own.

## (c) The 68 regenerated goldens
- The regenerated ones reproduce in my environment: home, idle and vivarium all match, and habitat matches except four. So the builder's 68 are right, and the drift is the environment's, as they said (base alone fails 31 of those states here).
- **The four that fail are `habitat-moment-S01-0`, `-450`, `-900`, `-1350`.** They are not among the 68 PNGs of the commit. This branch changes their hash (07dead86 and 3e204ec9) from what station-gate gives in the same environment (3059dfde and 09d55811), because the S01 adult in those states is now drawn through the layered stand; their golden hashes (128e5bba, 98ca5a41) were not updated. On station-gate they already fail in my environment, so I cannot say what CI computes, but a hash that moved with the golden unchanged will fail in CI's `goldens.mjs --check`. They need regenerating where CI's Chromium is.

## (d) The 23 face Create failures pre-exist on base: confirmed
23 failures on 5cc0bbc4 and 23 on this branch (506 tests each) once the wasm face is built. I did not diff the failing test names between the two runs; the counts are equal.

## The art director's gate (a message to me, 2026-10-18 03:25, from the art director's session)
1. **Layered adult base: not yet.** The base is the accepted Pip proof stand with T-190's proof layers (bare head and rings are proof edits); it should be T-200's signed v4 masters (masters-pods floor/S01/keys plus crest overlays, and the layers in results/T-20261016-200/layers/: masks, patches, stripes, ramps.json, register.json, as composed in make-window-masters.py). At 1x in the proof, all four Loikas are charcoal (no colour difference), one overlaps another's head, one has no contact shadow.
   I looked at results/T-20261016-201/vivarium-four-loikas.png at 1x and see the same: four charcoal Loikas that differ only by markings and crest, a crowded pair, and the right-hand one standing without a visible contact shadow.
2. **The LAYERED family, painted in any status: confirmed, with two changes:** extend the pattern to `(juvenile|adult)`, and keep the 16 eye-ring layers listed as stand-ins in the placeholder register until they land.

## Findings that are not fails
- Looks the Loika frame now has with no layer (Colour, stripes, stripes and patches) draw as the base, as the result says; T-200 owns them. The unread common Markings look is "stripes and patches", so an unread Loika draws plain until those layers land.
- Juveniles, the sleeper's curl, the moving-set atlases and other species are unlayered (no art).

## Fix ticket
**T-20261016-210** (builder): (1) reword the comment on pictures.mjs:106 so the guard exits 0; (2) regenerate the four habitat-moment-S01 goldens in CI's environment; (3) switch the base and layers to T-200's signed v4 art, with contact shadows, and retake the proof and the goldens that move; (4) extend LAYERED to `(juvenile|adult)` and keep the 16 eye-ring layers in the register.
