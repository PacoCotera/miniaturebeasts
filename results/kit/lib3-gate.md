# Library 3 gate (architect, 2026-10-24 08:29 Mexico City), 172f164e

Ticket T-20261023-291 (the Level 2 sheet generator). Branch build/library-sheet 172f164e = b9f50a7f plus a merge of station-gate 3a1be07a. The whole diff is read: library-sheet.mjs, its test, pictures.mjs, requests.mjs, specimen-props.mjs, guard.mjs, library.json l2, bake-glyphs.mjs and the four glyph tables, and the metrics vectors.

## Verdict: FIX, then merge
One fix round on the branch: F1 to F4 below. There is one question for the art director (F1). The builder builds F1's recommended answer now and switches only if the art director answers B. Everything else holds: the geometry, the surfaces, the type, the cache, the requests, the guard line and golden-neutrality.

## What I ran (scratch worktree arch-lib3, private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS; all removed afterwards)
- `build.sh native` and `build.sh wasm` on 172f164e:
  - face_test 14647 checks, 0 failed;
  - layout 732 cases, 0 differ;
  - native hash 47e09df8.
- node --test, split into runs:
  - station + ui: 258 + 440 + 20 (library-sheet) = 718/718;
  - face: 327 + 278 = 605/605;
  - 0 failures.
  - (Before the face was built, arrival and caddy-view failed only because face/dist/metrics.json was missing.)
- `goldens.mjs --check`: library, home, habitat, vivarium, pods, cargo, create, incubator, bench and idle all match (10 of 10).
- Guards:
  - face guard: `75 removed paths, 331 files read, 0 failures`;
  - public guard `--base 3a1be07a`: ok, exit 0.
- Ratchet: kit-ratchet.json is unchanged (`"library": 0`). No file under face/src changed.
- The glyph tables were re-baked with lv_font_conv 1.5.3 (bake-glyphs.mjs, private prefix). The output is byte-identical to the committed tables (352 glyphs each).
- Merge with current origin/station-gate:
  - station-gate has moved to **47d77256** (Sitting P1: stand layers, index.json, two tests).
  - `git merge-tree --write-tree origin/station-gate origin/build/library-sheet` is clean (tree 065496bf). The two branches touch disjoint files.
  - Trial merge in the scratch worktree: pose-request, sitting-props, specimen-props and library-sheet pass, 58/58.
- Measurements, in my own probes:
  - leader radii over all 16 species;
  - the sheet edges against the flat ground, in the builder's render and in the art director's v5 mock;
  - a CPU profile of renderSheet;
  - the finish's parts at full screen, at the sheet rect and at formRoom ± 144.
- Not re-run: the node-record and props-record comparisons and the type log. Goldens 10/10 corroborate the builder's 182/0, 13182/0 and 44/0.

## Rulings

### (1) The finish numbers, the seam, and the placed ground
- **The numbers stand.** Grain 4, vignette 0.22 over 1024×600, bloom 0.8 and met bloom 0 are the v5 numbers. The form matches v5.
- **The seam is real.** It breaks the art director's own seam rule (the art director's kit ruling: the sheet "composite[s] over the ground master's own pixels for [its] rect"; "bloom falls back to the exact fill ≥ 4 px inside the picture edge").
  - The face draws flat libGround (33,27,26) around the sheet.
  - The sheet's ground carries the tone curve, the vignette and grain. Measured on the Loika at mid, the inside edge against the outside edge:

    | Edge | Inside, mean (min–max) | Outside |
    |---|---|---|
    | Right, x 676–679 | 36.9,30.3,29.3 (max 42,35,33) | 33,27,26 flat |
    | Top, y 40–43 | 35.0,28.9,27.8 | 33,27,26 flat |
    | Left, x 16–19 | 33.7,27.8,26.8 (30–39) | 33,27,26 flat |

  - At RGB565 the right edge is green level 8 against 6.
  - The met render shows the darker vignetted corner at bottom left.
  - The v5 mock has no seam (right edge 37.8 inside against 36.9 outside) only because the whole 1024×600 is finished there.
- **The placed ground would be finished twice.** library-ground-1024x522 is specified with its own fall-off and paper ("centre +3, corners −1; fibre mottle + fine tooth σ ≈ 2"). renderSheet composites it as `under` and then tones, vignettes and grains it again.
- **F1, recommended (A).** The ground passes through exactly. The finish adds only the form's light:
  - out = G + F(bg ⊕ light) − F(bg), with F = finish at the v5 numbers and G = the ground master's pixels (flat libGround until placed);
  - this applies to the found sheet, the lit variant and the met sheet;
  - the paper's noise cancels where there is no light, so the edge is exactly G: no seam, and no second vignette or grain on the master;
  - test: every sheet pixel more than 4 px from any ink equals G exactly (flat libGround today), on the 8 render states.
- **Art director question (through the lead):**
  > "On the Level 2 sheet (664×522 at [16,40]), the v5 finish (tone, vignette 0.22, grain 4) today darkens and grains the ground under the sheet. The face's ground around the sheet is flat libGround. That leaves a step at the sheet's edge: right edge mean (37,30,29) against (33,27,26), RGB565 green 8 against 6. library-ground-1024x522 already carries its own fall-off and paper. Which do you want? (A) Under the sheet the ground is exactly the ground master's pixels, flat libGround until it is signed, and the finish adds only the form's light and bloom on top: no seam, the master never finished twice, and the soft vignetted glow behind the form comes only from the master once it is placed. (B) The v5 full-screen look is kept: the vignette and grain go over the whole 1024×600, so the ground around the sheet must be the same finished pixels (the master signed with that finish baked in), and the sheet then passes it through."
- The builder builds A. If B is answered, the master becomes the carrier and the generator still passes its pixels through, so F2 is unchanged.

### (2) Render time: fix in this round (F2); the screen lines go to T-292
Measured here (4 cores, loaded):

| Picture | Time |
|---|---|
| Sheet, lit or met (test prints) | 2.5–3.2 s |
| Sheet, profiling run | 3.3–4.1 s |
| Page | 17 ms |

- The finish alone takes 2.70 s at 2048×1200:
  - the paper (mottle and tooth) 0.92 s;
  - the light composite and the four blurs 1.73 s;
  - the tone loop 0.22 s.
- Met's bloom 0 costs the same, because its blurs still run at alpha 0.
- The same finish over formRoom ± 144 px at 2x takes 1.42 s, or 1.10 s without the paper.
- The 2D layer (surfaces, leaders, type) adds about 0.3–0.4 s.

**F2 (library-sheet.mjs, in this round):**
- (a) The paper and the vignette are fixed functions of position (seed 7, 2048×1200). Compute them once per process at first use: the noise n, the factor v and, under F1, F(bg). This keeps the bytes exact.
- (b) Run the finish only on a crop: the form's light bounding box (inside formRoom) plus 144 px at 2x (3σ of the widest blur, 48), clipped to the sheet rect. Under A, every pixel outside the crop is G.
- (c) Skip the bloom and halation draws when bloom is 0. Adding at alpha 0 adds nothing, so this is exact.
- (d) Drop `fresh` and `sig` from sheetDigest. The glints and the other facts come from sheetFacts, which renders nothing. The id then names what sets its pixels: species facts, mode, found, shut, readOnce, sealedOpen and colours. Leaving the Library (libSeen) or a wish change then never re-renders a sheet. This amends the ticket's "what specimen-props' signature already holds" for pictures.
- **Target, printed by the test:**
  - ≤ 1.5 s here for the Loika at mid, the Loika Coat lit and the Belatz Coat lit complete;
  - ≤ 1.2 s for the Untuva met sheet;
  - the page unchanged.
  - That is about ≤ 5 s on a Pi 4 (3–4×). This is why the screen must never wait on a sheet.
- **Test:** under A, the crop's pixels equal a full-frame reference computed with the A formula on the same 8 states (byte-identical).

**T-292 gains:**
- **292-P1 (F5's line extended to Level 2).** The props never name an unmade sheet, lit variant or page. The host today sends the props only once every named picture is made.
  - Until a sheet is made, Level 2 shows that species' last made sheet. Cold, it shows a quiet stand-in: ground, surfaces, type and mosaic, with no form; target ≤ 150 ms here.
  - Until a lit variant is made, the current unlit sheet stands in. Each is swapped in when made.
- **292-P2: render ahead.** The found sheet is requested off the open path when its digest changes (a discovery, a read or sealedOpen) and when Level 1's focus rests on a found cell.
- **292-P3: proof on a Pi 4.**
  - The Level 2 open reaches its first frame within 1 s with nothing cached.
  - The sheet and lit swap-in times are printed.
  - If the lit swap-in exceeds 3 s, the next step is the bloom at 1x. That is an art change, and the art director signs it.
- **292-P4.** The host drops a superseded sheet, lit or page id on the face (face-lvgl `drop`). Today the face's 256-slot table recycles only by LRU, so up to about 170 MB of stale 664×522 sheets could stay resident. The 1.7 MB cache holds only on the logic side.

### (3) The leader-radius tolerance: accepted, tightened to 0.5 (F4)
- 57 leaders have their dot under 164, at 163.53–163.92. The worst is 163.527 (the Loika, Untuva and Peplos L/Z dots), from rounding a point on radius 164 to a pixel centre.
- The art director's measured dots stay as they are, for example the Loika's (194,231), (403,132), (502,341) and (293,440). No dot moves outward.
- **F4:** the test bound becomes `>= 164 - 0.5` (today 164 − √½), and the ticket's line reads "every leader pixel ≥ 163.5 from the centre (the dot on radius 164, rounded to a pixel centre)". That is still 3.5 px clear of the ticks at 160.

### (4) The builder's smaller readings
- **Lit outline on the lit chapter's found cells only: accepted.**
  - It matches the art director's v5 lit mock (loika-coat-lit-1x: the three found Colour cells and the two found Markings cells are outlined; the unknown cells are not).
  - It also matches sheet-art §3: "a lit trait reads as one ruled block". Found cells come first, so they are contiguous.
  - The Loika's found plain takes it with the Coat, as UI/UX ruled.
  - Ticket wording amended: "the lit chapter's *found* mosaic cells".
- **Colours band title never dimmed: not accepted (F3).**
  - The ticket and sheet-art §1 put "the colours band when Coat is not lit" in the 30 % list, and the title is that band's type. Only the surface stays undimmed.
  - The plates dim their head type the same way.
  - **F3:** when the colour trait's chapter is not lit, print the title in premix(fog, libHead, 0.3), and test it.
  - "Every look" belongs to no chapter and stays full.
  - The art director may overrule at the 1x compare.
- **Glint order: accepted.** The order is frame order, chapter then trait then the frame's look order (not discovery order), as the ticket writes "(chapter, trait, look)", at most 8.
- **The "plain" glint only when the request marks it new: accepted.**
  - newLooksOf stays the one definition of new, and it never counts a legacy look, so in play the plain does not glint.
  - UI/UX's centre (269,522) is where it would glint if that definition ever changed. The test proves the position.
- **The found-sheet digest scoped to this species' seen looks and wish: accepted for the scoping.** Another species' changes never re-make this sheet.
  - F2(d) then removes `fresh` and `sig` from the picture digest altogether, since neither sets a pixel.
  - The met digest (species facts and mode only, the same for every player) is right as built.

## Other review notes (no fix needed)
- The Loika's plain is its own trailing group at (252,522), and nothing is reserved before the find. This is as UI/UX ruled, and the test proves it.
- The tier comes from slot looks only, and the trait index follows the copywriter's row `sheet.index`. Both open items are reflected.
- The surfaces are ring_in_round bezel pixels (b 25 and 21). The test checks exact tokens.
- The page heights are 160, 453 and 98.
- The comma form and the wrap only at " · " are as specified.
- The cache keeps 1,694,432 bytes at RGB565: the sheet, one lit variant and one page, with older entries of each kind dropped from the manifest.
- pictures.mjs memoises through sheetPicture's KEPT, so assets' BUILT holds closures, not bytes.
- The guard adds library-sheet.mjs to CANVAS_OK by name and gives the reason; no other file is added.
- The metrics vectors gain only the new spec strings; the face's metrics test is green.
- The commits are by Paco Cotera <paco@cotera.org> with no trailers.

## Fix lines for the builder (one round, on build/library-sheet, merging station-gate 47d77256 first)
- **F1.** The finish as out = G + F(bg ⊕ light) − F(bg), for the sheet, lit and met. Test: every pixel more than 4 px from ink equals the ground exactly. Switch to B only if the art director answers B.
- **F2 (a)–(d)** as above, with the targets printed: ≤ 1.5 s for a sheet or lit variant and ≤ 1.2 s for met, here. The crop is proved byte-identical to the full-frame reference.
- **F3.** The colours band title dims to premix(fog, libHead, 0.3) when its chapter is not lit, with a test.
- **F4.** The leader test bound is 164 − 0.5, and the ticket line is amended as in (3).
- **Ticket amendments for the record:**
  - the lit outline is on the found cells;
  - the digest names pixel inputs only (F2(d));
  - T-292 gains 292-P1 to P4.
- **Proof for the round:**
  - node --test 0 failures;
  - goldens --check 10/10;
  - face and public guards exit 0;
  - the ratchet quoted unchanged;
  - fresh 1x renders of the 8 states for the art director's compare, with the edge measurement repeated (it should be 0 difference against flat libGround).

## Re-gate
(architect, 2026-10-24 09:22 Mexico City), 4412f1fc: 5789364d merges station-gate 47d77256; 4412f1fc is F1 to F4. The art director answered A and upheld F3.

### Verdict: PASS, merge
- 4412f1fc can be merged into station-gate.
- `git merge-tree --write-tree origin/station-gate 4412f1fc` is clean (tree 65c7765f), and 47d77256 is an ancestor.
- One line moves to T-292 (P5 below).

### F1 to F4 against my lines (the diff 5789364d..4412f1fc is read in full: library-sheet.mjs, requests.mjs, specimen-props.mjs, the test)
- **F1: held.**
  - formOnGround computes px = G + F(bg ⊕ light) − F(bg), each F reduced 2×2 and rounded, then clamped. It is used for the found, lit and met sheets. The `under` path is gone, so the master is never toned, vignetted or grained.
  - The builder's test ("ink" includes the light composite's reach): 0 pixels off the ground away from ink on all 8 states, and the 4 px edge rings 0 differ.
  - My own 6 states beyond the 8 (Igara all found, and lit on its last chapter; Peplos all found; Lehten lit on its first chapter; Tuikis 30 % found, lit on its last chapter; the Loika all found, Coat lit):
    - 0 bytes differ from the whole-screen reference;
    - the edge ring is 0 off G;
    - two of the six (Peplos, and the Loika Coat lit) ran on a **non-flat synthetic ground master** (±6 noise plus a fall-off). There too the edge ring equals G exactly, so the formula holds when the master is placed.
- **F2: held.**
  - (a) paper() makes F(bg) and the finish's own noise once, replaying its RNG from the probe's seed.
  - (b) The crop is the light box ± CROP_PAD 176 at 2x, on the 8 px reduction grid.
  - (c) The bloom draws are skipped at bloom 0.
  - (d) sheetDigest drops `fresh` and `sig`. The test proves the same id with `fresh` and `sig` set.
  - My times on this machine, loaded: sheet or lit variant 750–978 ms, one run at 1320 ms (Belatz half found); met 382–583 ms; page 19–32 ms; the whole-screen reference 2.44–2.95 s. All are inside the targets of 1.5 s and 1.2 s. The test prints the target and asserts < 3 s, which I accept, given the loaded machine.
  - The first sheet in a process pays paper() once: **3.08 s** here, about 10 s on a Pi 4 (P5).
- **F3: held.** The title prints in premix(fog, libHead, k). The test covers Face lit (dimmed), nothing lit (fog) and Coat lit (fog).
- **F4: held.** The bound is `164 - 0.5`, and the test title reads "at least 163.5 … rounded to a pixel centre".

### Renders (renders2, looked at)
- I looked at the Belatz half found with Movement sealed, and the Belatz Coat lit complete.
- The ground is flat to the sheet's edges, with no step and no dark corner.
- The lit variant dims the other plates' type, the leaders, the cells and the form sectors. The Coat title stays full because Coat is lit.
- The form keeps its bloom and halation. The vignetted glow behind it is gone, which is answer A; the master brings it back once placed.
- The art director's 1x compare is next.

### What I ran (scratch worktree on 4412f1fc, private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS, all removed)
- library-sheet.test: 23/23.
- Native face build: hash 47e09df8. It is needed only for the station tests' metrics.json.
- station + ui: 258 + 444 + 23 = 725/725.
- Face guard: ok. Public guard `--base 47d77256`: ok.
- My crop and ground probe (above).
- Face tests and goldens were not re-run: nothing under prototypes/face or ui/specs changed between 172f164e and 4412f1fc. The earlier 10/10 stands, beside the builder's 10/10.

### P5 (for T-292, not a fix here)
- paper() takes 3.1 s here (the builder measured 4.2 s for the first sheet) and holds about 11 MB (the Float64 noise over 1328×1044).
- It runs inside the first sheet's render.
- T-292 warms it off the open path, at the host's boot idle or when Level 1 opens, and counts it in the Pi cold-open proof.
- Optional and exact: paper()'s finish on an empty light can skip its blur draws.

### Ticket amendments (exact text, to be written into T-20261023-291 for the record)
1. Under **Lit variant**, replace "the lit chapter's mosaic cells get a 1 px `bone` outline, 1 px out;" with:
   "the lit chapter's found mosaic cells (the Loika's found plain with the Coat's) get a 1 px `bone` outline, 1 px out; unknown cells take none;"
2. Under **"Every look" band, Cells**, replace "The lit outline: 1 px `bone`, 1 px out." with:
   "The lit outline, on the lit chapter's found cells only: 1 px `bone`, 1 px out."
3. Under **Lit variant**, after the 30 % list, add:
   "The colours band's title dims with its chapter: premix(fog, libHead, 0.3) when the colour trait's chapter is not lit; "Every look" never dims."
4. Under **Leaders**, replace "Every leader pixel is ≥ 164 from the centre." with:
   "Every leader pixel is ≥ 163.5 from the centre (the dot on radius 164, rounded to a pixel centre)."
5. Under **The pictures**, replace "The digest includes the species facts (S_form below), the mode, the guide looks, `readOnce`, `sealedOpen`, the colours found, and what specimen-props' signature already holds." with:
   "The digest names what sets the picture's pixels: the species facts (S_form below), the mode, the guide looks, the chapters still shut, `readOnce`, `sealedOpen` and the colours found. The looks new this visit, the seen record and the wish set no pixel: the glints and the other layout facts come from sheetFacts, which renders nothing."
6. Under **Order inside the sheet picture**, replace items 1 and 2 with:
   "1. the ground master's own pixels for the rect, passed through untouched (flat libGround until `library-ground-1024x522` is placed);
    2. the form's light: out = G + F(bg + light) − F(bg), F the v5 finish (grain 4, vignette 0.22 over 1024×600, bloom 0.8; met bloom 0) at 2x, reduced 2×2; bloom and halation belong to the form only, and a pixel the light does not reach is G exactly (the art director, 2026-10-24: answer A; v5's full-screen vignette and grain are withdrawn for the Library);"
7. Under **Proof**, add:
   "The crop of the finish byte-identical to the whole-screen reference on the eight review states; a sheet or lit variant ≤ 1.5 s and a met sheet ≤ 1.2 s on the development machine, printed; the one-time paper's time printed."
8. Add to **T-20261023-292's Rules**: P1 to P4 from this gate's ruling (2), as written there, and P5 above.
