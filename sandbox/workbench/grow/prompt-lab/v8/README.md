# Prompt v8: the service's prompt

The frozen copy of the art director's v7 (`../v7/`) with the lab's 7D change: the Finish line in both steps reads "a naturalist's study of a small living animal, rendered with the Miniature Lives finish: tactile, softly modelled, grounded, with real weight and real anatomy under the charm" in place of "a soft vinyl collectible, matte with one highlight" (step 2 keeps "never clay, glossy plastic, paper or brushwork"). Everything else is v7 as written: the house rendering (light, shading, contour, the house eye, surface touches, framing, ground), the species notes saying only what differs, no species reference image in either step. Owner-approved on the v7 consistency sheet (`../../sheets/lab-consistency-v7.png`): the first row where the three species read as one pack, and 7D's finish for charm without childishness.

`grow/service.py` reads this set as its default (`PROMPT_SET`): step 1 sends the part map and the colour key with `art-direction-step1.txt`, the species notes and the description (the loader's plan lines appended once); step 2 sends the drawing and the colour key with `art-direction-step2.txt`, the species notes and the description. The lab runs it with `--set v8`.

Not to be edited in place: a change is a new set beside it.
