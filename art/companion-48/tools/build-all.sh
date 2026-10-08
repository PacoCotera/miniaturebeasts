#!/bin/sh
# Rebuild the candidates group, the six sheets, the contact sheets, the still and the checks from the pieces in
# review-place/work. Run with: sh tools/build-all.sh   (from art/companion-48/; each script runs with python3 -I)
# The hand pass (tools/hand-pass.py) is run once after the builders, not here: it derives pieces from others.
set -e
R=review-place; W=$R/work; P2=$R/round2/work
rm -rf $W/candidates; mkdir -p $W/candidates
for n in tree bush bush-fruit stone stone-plain2 stone-warm1 stone-warm2 stone-charged1 stone-charged2 outpost-lit pod; do
  s=$W/props/$n.png; [ -f $W/props-scripted/$n.png ] && s=$W/props-scripted/$n.png
  cp $s $W/candidates/$n-a-scripted.png; cp $W/props-rd/$n-rd.png $W/candidates/$n-b-rd.png
done
for f in down up left right; do cp $W/pawn/pawn-$f-walk2.png $W/candidates/pawn-$f-a-scripted.png; cp $W/pawn-rd/pawn-$f-walk2-rd.png $W/candidates/pawn-$f-b-rd.png; done
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
python3 -I tools/compose-still.py $W $R/still/companion-place-storm-48.png --light storm
python3 -I tools/beside.py $R/still/beside-concept-and-round2.png $R/still/companion-place-storm-48.png "round 3 still, storm table (450x600, 1x)" $R/round2/still-companion-place-storm-48.png "round 2 still (450x600, 1x)"
python3 -I tools/meadow-check.py $W/ground $W/meadow-mixed
python3 -I tools/preview.py $W/preview-water-3x.png 3 $W/ground/water1.png $W/ground/water2.png $W/ground/deep1.png $W/ground/deep2.png $W/ground/shallows.png $W/shore/shore-03-1.png $W/shore/shore-diag-ne-1.png
python3 -I tools/check.py $R/sheets/*.png --fourgray $R/sheets/four-gray
python3 -I tools/check.py $R/still/companion-place-storm-48.png --fourgray $R/still/four-gray
