#!/bin/sh
# Rebuild the candidates group, the six sheets, the contact sheets, the stills and the checks from the pieces in
# review-place/work. Run with: sh tools/build-all.sh   (from art/companion-48/; each script runs with python3 -I)
set -e
R=review-place; W=$R/work
rm -rf $W/candidates; mkdir -p $W/candidates
for n in tree bush bush-fruit stone stone-warm1 stone-charged1 outpost-lit pod; do
  s=$W/props/$n.png; [ -f $W/props-scripted/$n.png ] && s=$W/props-scripted/$n.png
  # scripted version: the props piece unless it was replaced by the pick (then the copy kept in props-scripted)
  cp $s $W/candidates/$n-a-scripted.png; cp $W/props-rd/$n-rd.png $W/candidates/$n-b-rd.png
done
for f in down up left right; do cp $W/pawn/pawn-$f-walk2.png $W/candidates/pawn-$f-a-scripted.png; cp $W/pawn-rd/pawn-$f-walk2-rd.png $W/candidates/pawn-$f-b-rd.png; done
python3 -I tools/pack.py ground tile $R/sheets $W/ground/*.png $W/shore/*.png
python3 -I tools/pack.py props sprite $R/sheets $W/props/*.png
python3 -I tools/pack.py pawn sprite $R/sheets $W/pawn/*.png
python3 -I tools/pack.py tokens sprite $R/sheets $W/tokens/*.png
python3 -I tools/pack.py ui chrome $R/sheets $W/ui/*.png
python3 -I tools/pack.py weather tile $R/sheets $W/weather/*.png
for sc in 1 3; do
python3 -I tools/contact.py $R/contact-sheet-${sc}x.png $sc "Meadow, pond and shallows (ground)=$W/ground=$R/round1/work/ground" "Shore corner set (16 masks x 2 frames)=$W/shore=$R/round1/work/shore" "Props and buildings=$W/props=$R/round1/work/props" "Retro Diffusion candidates (a scripted, b Retro Diffusion; picks listed in the README)=$W/candidates" "Pawn (4 facings, walk 3, creep 3, react)=$W/pawn=$R/round1/work/pawn" "Tokens (Pip as Loika; placeholders)=$W/tokens=$R/round1/work/tokens" "Weather (rain, 2 leans x 2 frames)=$W/weather=$R/round1/work/weather" "HUD icons, key caps, condition bolts, 9-slices=$W/ui=$R/round1/work/ui"
done
python3 -I tools/compose-still.py $W $R/still/companion-place-storm-48.png --light storm
python3 -I tools/compose-still.py $W $R/still/companion-place-storm-48-plain.png --light plain
python3 -I tools/compose-still.py $W $R/still/companion-place-storm-48-cool.png --light cool
python3 -I tools/beside.py $R/still/beside-concept-and-round1.png $R/still/companion-place-storm-48.png "round 2 still, storm table (450x600, 1x)" $R/round1/still-companion-place-storm-48.png "round 1 still, DARK table (450x600, 1x)"
python3 -I tools/meadow-check.py $W/ground $W/meadow-mixed
python3 -I tools/check.py $R/sheets/*.png --fourgray $R/sheets/four-gray
python3 -I tools/check.py $R/still/companion-place-storm-48.png $R/still/companion-place-storm-48-plain.png $R/still/companion-place-storm-48-cool.png --fourgray $R/still/four-gray
python3 -I tools/preview.py $W/preview-water-3x.png 3 $W/ground/water1.png $W/ground/water2.png $W/ground/deep1.png $W/ground/deep2.png $W/ground/shallows.png $W/shore/shore-03-1.png $W/shore/shore-01-2.png
