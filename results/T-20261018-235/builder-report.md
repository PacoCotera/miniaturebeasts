# HANDOFF T-20261018-235 (Vivarium polish)
Repo: scratchpad/pq, branch build/t-235-vivarium-polish (base station-gate 5c7e5101). Build dir /tmp/claude-0/bld-t235.
Baseline (station-gate): node tests 1188 / 22 fail (the Create "trait rolls" asserts); list in viv-build/base-fail.txt; goldens baseline: pods drift 9 only (viv-build/base-gold.log).
## Plan
1 masters (shadows into ui/assets/stands + index)  2 figure geometry+ring+tag  3 shadows composed  4 ground profile+walk  5 sleepers+keepOut  6 goldens+stills
## Status
- commit 9d15656c (M1): shadows placed (ui/assets/stands + index, tool station/tools/place-stand-shadows.mjs), under layer + figure in layered-stand.mjs
- uncommitted: curl (layered-stand curlPicture, home-props curlOfMibi/figureOf, pictures.mjs case curl), props schemas `figure`
- next: spec JSON (keepOut, profile, tag numbers), C: figure geometry in home.c, ring figure fn, tag fn, ground profile, sleepers; tests; goldens; stills
## Rulings
- ring: UI/UX answered (pwq 583b0d09): formula rules, fh=2*floor((W+6)/12) held 6-16, ring (W+10)x(fh+10) (W57 -> 67x20). Tag stays feetY+16.
## Open questions
- Moving-set residents (atlas) and residents with no layered stand have no figure: slot geometry kept (ring footprint, old rules).
- Sleepers take the world-size curl only when the nap master (96x88) is placed; else the old nap picture.
- Ring-under-shadow draw order: shadow is baked into the picture so it draws after the ring (spec §3 says shadow, ring, figure).
- Home's event tag does not exist in code yet; nothing built for it.
