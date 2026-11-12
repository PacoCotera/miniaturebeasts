# ad-followups-1111 1b: report

Branch build/ad-followups-1111, worktree /home/mb/mb/wt-adfollow1111. Not pushed. 0 MXN, no image calls. Night table (dark2) only.

## Palette entries
- Trunk shade side (the two darker trunk colours #664330, #8f6244) -> #584b46 (palette index 51, a dull taupe-brown, saturation 0.2).
- Trunk lit side (the two lighter, #b98b60, #d2ad7e) -> #6e5038 (index 53, the brown the bank earth takes). No trunk colour reads red/rust at night.
- Woods litter orange specks (#96703e, #aa8c46 of the litter fill and over sheet; the loose leaves share them) -> #584b46 (index 51), a dull brown.
- Honest note: the palette has no darker low-saturation brown, so the two trunk steps are close in lightness (78 vs 86); the form steps are there but quiet. A third brown would need a new palette colour (AD call).

## Files
prototypes/places/src/lighttables.mjs (options trunkShade/trunkLit and litter), prototypes/places/tools/prepare-set.mjs (picks them), art/places/sets/ninja-test/palette.json (regenerated, dark2 only), prototypes/places/baked/ (re-baked).

## Goldens moved
None. Day pictures and the face goldens are unchanged (only night table entries changed); baked/ninja-test.mbtiles and baked/index.json moved, cause: the new night table. No night picture golden exists.

## Stills (1x, seed 13, cells 25-35, same frame as before)
stills/woods-low-night-seed13-cells25-35-48px-1b.png

## Tests (once, only what I touched)
bake --check (match); places set-contract + ground, exploration gen7-goldens: 25/25 pass.

## Last commit
See `git -C /home/mb/mb/wt-adfollow1111 log -1` (commit follows this report).
