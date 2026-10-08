#!/bin/sh
# Rebuild the candidates group, the six sheets, the contact sheets, the still and the checks from the pieces in
# review-place/work. Run with: sh tools/build-all.sh   (from art/companion-48/; each script runs with python3 -I)
# The pawn comes from tools/pawn-draw.py through Aseprite (tools/aseprite-pawn.lua on the VM); the hand pass (tools/hand-pass.py) is
# run once after the builders, not here: it derives pieces from others.
set -e
# The outpost (hut B) is made by tools/rd-hut-b.py (Retro Diffusion), tools/hut-b-edit.py (seed 50's own pixels, the listed edits only) and tools/huts-assemble.sh (Aseprite on the VM), and lives in work/props/outpost-*.png.
# Round 11 pieces, through the pipeline (the record per piece is in the README): the tree: tools/gemini-gen.py (painting) + tools/rd-gen.py (Retro Diffusion at 136 x 152) + tools/tree-r11.py; the charged stone: tools/rd-gen.py (62 x 80) + tools/stone-r11.py; the hut: tools/hut-b-edit.py; the grass tufts: tools/ground-tufts.py round10/work/ground work/ground (run once).
# The pawn (study H, the owner's pick): tools/rd-pawn-h.py (Retro Diffusion img2img from H), tools/pawn-h-pass.py (the hand pass), tools/aseprite-pawn.lua (the VM), see the handover.
# The pawn studies: tools/pawn-study.py (A to F), tools/rd-pawn-studies.py + tools/pawn-study-snap.py (G, H), tools/pawn-studies-sheet.py (the sheets).
R=review-place; W=$R/work; P2=$R/round10/work
rm -rf $W/candidates; mkdir -p $W/candidates
for n in tree bush bush-fruit bush-shaken stone stone-plain2 stone-warm1 stone-warm2 stone-charged1 stone-charged2 pod; do
  s=$W/props/$n.png; [ -f $W/props-scripted/$n.png ] && s=$W/props-scripted/$n.png
  cp $s $W/candidates/$n-a-scripted.png; cp $W/props-rd/$n-rd.png $W/candidates/$n-b-rd.png
done
python3 -I tools/build-ripples.py $W/ripples
python3 -I tools/shoregrid.py $W/shore $W/ground $W/shore-test
python3 -I tools/pack.py ground tile $R/sheets $W/ground/*.png $W/shore/*.png
python3 -I tools/pack.py props sprite $R/sheets $W/props/*.png $W/ripples/*.png
python3 -I tools/pack.py pawn sprite $R/sheets $W/pawn/*.png
python3 -I tools/pack.py tokens sprite $R/sheets $W/tokens/*.png
python3 -I tools/pack.py ui chrome $R/sheets $W/ui/*.png
python3 -I tools/pack.py weather tile $R/sheets $W/weather/*.png
for sc in 1 3; do
python3 -I tools/contact.py $R/contact-sheet-${sc}x.png $sc "Meadow, pond and shallows (ground)=$W/ground=$P2/ground" "Shore set: 16 cardinal masks and 4 diagonal corners, 2 frames=$W/shore=$P2/shore" "Shore test: the 47 neighbourhood classes (mNN cardinal mask, dNN diagonal bits)=$W/shore-test" "Shore test: a random 10 x 10 pond outline, 1 frame=$W/shore-test-pond" "Props and buildings=$W/props=$P2/props" "Ripple overlay sprites (3 sizes x 2 frames; placed over the water, never in a tile)=$W/ripples" "Retro Diffusion candidates (a scripted, b Retro Diffusion before the hand pass; picks in the README)=$W/candidates" "Pawn (4 facings, walk 3, creep 3, react)=$W/pawn=$P2/pawn" "Tokens (Pip as Loika; placeholders)=$W/tokens=$P2/tokens" "Weather (rain, 2 leans x 2 frames)=$W/weather=$P2/weather" "HUD icons, key caps, condition bolts, 9-slices=$W/ui=$P2/ui"
done
python3 -I tools/ground-states.py $R/sheets/ground.json
python3 -I tools/compose-still.py $W $R/still/companion-place-storm-48.png --state rain
python3 -I tools/compose-still.py $W $R/still/companion-place-clear-48.png --state clear
python3 -I tools/ground-figure.py $R/still/companion-place-storm-48.png $R/still/companion-place-clear-48.png $R/still/ground-states-1x.png
python3 -I tools/beside.py $R/still/beside-concept-and-round11.png $R/still/companion-place-storm-48.png "round 11 still, rain (450x600, 1x)" $R/round10/still-companion-place-storm-48.png "round 10 still, rain (450x600, 1x)"
python3 -I tools/beside.py $R/still/beside-concept-and-round11-clear.png $R/still/companion-place-clear-48.png "round 11 still, clear (450x600, 1x)" $R/round10/still-companion-place-clear-48.png "round 10 still, clear (450x600, 1x)"
python3 -I tools/meadow-check.py $W/ground $W/meadow-mixed
python3 -I tools/preview.py $W/preview-water-3x.png 3 $W/ground/water1.png $W/ground/water1b.png $W/ground/water2.png $W/ground/water2b.png $W/ground/deep1b.png $W/ground/shallows.png $W/shore/shore-03-1.png $W/shore/shore-diag-ne-1.png
python3 -I tools/check.py $R/sheets/*.png --fourgray $R/sheets/four-gray
python3 -I tools/check.py $R/still/companion-place-storm-48.png $R/still/companion-place-clear-48.png --fourgray $R/still/four-gray
python3 -I tools/preview.py $W/preview-ripples-5x.png 5 $W/ripples/*.png
python3 -I tools/preview.py $W/preview-stones-5x.png 5 $W/props/stone.png $W/props/stone-plain2.png $W/props/stone-warm1.png $W/props/stone-warm2.png $W/props/stone-charged1.png $W/props/stone-charged2.png $W/props/stone-step.png
python3 -I tools/preview.py $W/preview-pawn-6x.png 6 $W/pawn/pawn-down-walk1.png $W/pawn/pawn-down-walk2.png $W/pawn/pawn-up-walk1.png $W/pawn/pawn-left-walk1.png $W/pawn/pawn-right-walk1.png $W/pawn/pawn-right-walk3.png $W/pawn/pawn-down-creep1.png $W/pawn/pawn-right-creep2.png $W/pawn/pawn-up-creep3.png $W/pawn/pawn-down-react.png $W/pawn/pawn-right-react.png
(cd . && python3 -I tools/pawn-compare.py $W/pawn $W/pawn-vs-concept)
python3 -I - <<'PY'
from PIL import Image
W = "review-place/work"; names = ["m00-d05", "m00-d13", "m03-d04", "m06-d08", "m07-d00", "m12-d01"]
im = Image.new("RGB", (480 + 20 + 3 * 148, 480), (40, 36, 50)); im.paste(Image.open(f"{W}/shore-test-pond/pond-outline-random.png").convert("RGB"), (0, 0))
for i, n in enumerate(names): im.paste(Image.open(f"{W}/shore-test/{n}.png").convert("RGB"), (500 + (i % 3) * 148, (i // 3) * 148))
im.save(f"{W}/preview-shore-test-1x.png")
PY
python3 -I tools/preview.py $W/preview-huts-bushes-6x.png 6 $W/props/outpost-lit.png $W/props/outpost-dark.png $W/props/outpost-dark2.png $W/props/bush.png $W/props/bush-fruit.png $W/props/bush-shaken.png

python3 -I tools/pawn-study.py $W/pawn-studies
python3 -I tools/pawn-chunky.py $W/pawn-studies
python3 -I tools/pawn-study-snap.py $R/sources/rd-pawn-studies $W/pawn-studies
python3 -I tools/pawn-studies-sheet.py $W
python3 -I tools/hut-b-figure.py $R/sources/rd-huts-b $W/hut-b $W/hut-b-process.png
python3 -I tools/hut-b-vs-raw.py $R/sources/rd-huts-b/C48-H-r7-B-lit-s50-rd.png $W/hut-b/hut-B-lit.png $W/hut-b-vs-raw-3x.png

python3 -I tools/pawn-h-figures.py $W $R/sources/rd-pawn-h
python3 -I tools/pawn-cycles-figure.py $W/pawn $W/pawn-cycles-3x.png
