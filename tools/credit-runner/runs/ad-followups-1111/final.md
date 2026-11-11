# ad-followups-1111: report

Branch build/ad-followups-1111 (worktree /home/mb/mb/wt-adfollow1111, off origin/station-gate 2060c1952). Not pushed. 0 MXN, no image model.

## STOP for the AD: stills in stills/
- crate-26x24-before-after-1x.png and -4x.png (left before, right after); home-bay-waiting-before.png / -after.png (Home Bay).
- before/ and after/: woods-low-day and woods-low-night (seed 13, cells 25-35, 48 px), marsh-day and marsh-night (seed 13, cells 13-41, 48 px).
- Woods day: identical before and after by construction (only the night table changed; the gen7 day goldens pass unchanged).

## 1. Crate seal
berth-crate-26x24.png: the 17 seal pixels (#a6420c, orange-brown after the snap) remapped to #c93440, the Station palette's nearest true red to the signed seal (mean of the signed crate-sealed seal reds #9e372a; the palette has no darker true red: #6b1e33 is wine, #a6420c is the orange the snap chose). Planks, lid and alpha untouched. File is now RGBA (1149 bytes, was 866 indexed). index.json and provenance.json updated (code remap of signed paint, AD follow-up).

## 2. Night table (dark2 only; 6 entries, no other table moves)
- Trunk: the four colours of the signed tree trunk (#b98b60, #8f6244, #664330, #d2ad7e) -> #6e5038, the darkest low-saturation trunk brown (same colour the bank earth took). The trunk is now one flat brown at night (its form steps are gone); the lit highlight was the red one (#d2ad7e -> #664330 before).
- Ripple glints: #7ac6bb -> #6a7b8e, #cdeee6 -> #8497a5 (cool pale grey-blues of the set). Before they went to #333b47 and #2c6c72.
- Side effect to judge: the same two colours draw the shoreline foam of the water edge, so that edge reads pale grey-blue at night too.
- Not changed, seen in the stills: the woods litter ground carries red specks (#6a2e41) at night; a separate item if the AD wants it.
Files: prototypes/places/src/lighttables.mjs (trunk, glint options), prototypes/places/tools/prepare-set.mjs (picks them), art/places/sets/ninja-test/palette.json (regenerated; only dark2 differs), prototypes/places/baked/ (re-baked, follows the palette).

## Goldens moved
- face home-rest-needs, home-focus-bay, home-bay-waiting, home-bay-portrait (+ home.json hashes): cause, the crate seal red (they show the Bay crates).
- places baked/ninja-test.mbtiles and baked/index.json: cause, the new night table.
- No night picture golden moved; the gen7 goldens (day) are unchanged.

## Tests run (only for what changed)
- ui masters.test + palette.test: 19/19 pass.
- face goldens --check home (4 fail before re-record, as above), then re-recorded home.
- places: ground, set-contract, haze, four-places, seams, sixteen, bake: all pass after re-bake except the marked-TODO seams case (pre-existing); bake --check failed before the re-bake, as expected.
- exploration gen7-goldens.test: pass.
- Not run: the full suite (CI on the release PR).
Setup notes: node_modules and face dist were symlinked from wt-relfix1111 (untracked, not committed).
