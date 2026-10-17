# The face: an arc fill for the ring of time, and the founder's shadow

Ticket T-20261016-60. Architect, 2026-10-16. Read at station-gate 54bde362: `prototypes/face/src/prim/prim.h` and `prim.c` (the closed primitive set, the composed ops, `bayerPick`), `vocab/station/leafarc.c` (the leaves word: a node for every leaf in every state), `prototypes/station/src/pictures.mjs` (the request kinds), `art.mjs` `founderArt`, `unknown.mjs` (the calm unknown), `derive.mjs` (a Station-side derive, same bytes everywhere), design/proposals/lvgl-switch.md §2.10 (dirty area per frame ≤ 25% of the screen: 153,600 px), specs/station-incubator-tabs-ruling.md §§3–4 and §8, and results/T-20261016-40.md.

## Purpose

The Incubator shows the player two things while they wait for their founder (ruling §0):

- **The ring:** how close the meeting is.
- **The shadow:** what they have learned about their mibi so far.

T-40 parked because the face cannot draw either one. No word draws an arc, and swapping the ring's sprite redraws 160,000 px, which is over the ceiling. The host also has no request kind that derives the founder's shadow. This spec gives both, using the face's closed primitive set plus **one new composed op** and **one new request kind**. Nothing here changes a rect, a colour, a word or a piece of art in the ruling.

## 1. The ring's fill: `arcFill`, in 12 masked segments

### The form

The fill is **12 composed pictures, one for each 22° segment of the 264° arc.** Each one copies the fill art's pixels whose angle lies inside the filled part of that segment, and leaves every other pixel clear.

When a degree fills, only the segment holding that degree recomposes. Only its box is redrawn.

The other candidates, and why they lose:

| Form | Redraw per degree | Nodes | Verdict |
| --- | --- | --- | --- |
| Swap the whole 400 × 400 sprite | 160,000 px | 1 | Over the 153,600 ceiling (T-40's finding) |
| One clip per degree | 361 px at most | 264 clips and 264 sprites | Over the 400-object budget the face tests hold |
| An LVGL arc with an image source (`lv_draw_arc` `img_src`) | the new degrees' box | 1 | LVGL anti-aliases the moving radial edge, so blended pixels land on the art layer, which must be 0 off palette (design/proposals/lvgl-switch.md §2.8). It also adds a seventh primitive kind |
| **12 segments masked by angle (chosen)** | **≤ 4,331 px** | **12** | Exact pixels from the art, no anti-aliasing, within both budgets |

### The art: one picture

The AD paints `incubator-ring-fill` (400 × 400, the ruling §8 id) as the **whole fill**: the track full, clear outside it. The build does the stepping, and the art never holds degree pieces. This settles §8's "degree pieces or a mask" in favour of a mask.

The ring's inner and outer edges come from the art's alpha, so the face never computes a circle edge.

### The new composed op: `anglePick`

This op goes beside `bayerPick` in `prim_compose`, with the same window convention.

```
["anglePick", from, to, cx, cy, a0, a1, fsx, fsy, tsx, tsy]
```

- **What it does:** for each pixel (x, y) of the w × h picture, it takes the pixel of asset `to` (read at tsx + x, tsy + y) when the pixel's centre lies in the angular span [a0, a1). Otherwise it takes asset `from` (at fsx + x, fsy + y), or clear when `from` is −1.
- **cx, cy:** the centre, in the picture's own coordinates.
- **a0, a1:** whole degrees, clockwise from 12 o'clock, with 0 ≤ a1 − a0 < 180 (taken mod 360). When a1 = a0 the picture is all `from`.
- **The test is integer-only,** so the sandbox (WebAssembly), the Pi (native) and the JavaScript reference give the same bytes:
  - P = (2(x − cx) + 1, 2(y − cy) + 1) is the pixel centre, doubled.
  - D(a) = (S[a], C[a]), where S[a] = round(32767 · sin a) and C[a] = round(−32767 · cos a), from one 360-entry table. The table is generated once and checked in, in `prim/angle_table.h` and `station/src/angle-table.mjs`, never computed at run time.
  - The pixel is in the span when cross(D(a0), P) ≥ 0 and cross(D(a1), P) < 0, where cross(u, v) = u.x · v.y − u.y · v.x in screen coordinates (y down). The pixel exactly on a0's ray is in; the pixel exactly on a1's ray is out.
- **Like `bayerPick`, it copies pixels and never blends them.** The palette check holds whenever the fill art is on palette.
- **Refused** (−1, as for any op) when the span is ≥ 180°, an asset is missing, or a window falls outside its asset.

### The word: `word_arcFill`

```c
void word_arcFill(const char *spec, const char *region, const char *fillPic, const char *closedPic, int deg, int closed);
```

- **spec / region:** the ring region of `incubator.json`, with a new block `arc`:
  `{ "center": [512, 288], "radii": [176, 200], "start": 228, "sweep": 264, "segments": 12, "fill": "incubator-ring-fill", "closed": "incubator-ring-closed", "box": [312, 88, 400, 400] }`. These are the ruling §3 numbers.
- **deg:** degrees filled, 0–264. The view sends `ring.f`; the face takes deg = floor(264 · f), clamped, so the ring redraws only when a whole degree is reached. For a 20-minute bud that is about once every 4.5 s.
- **Segment k (0–11)** covers [228 + 22k, 228 + 22(k + 1)) mod 360. Its node is a composed picture at its **segment box**: the tight box of the arc's pixels in that span, computed once by `layout.c` from the spec and cached. Its ops are one `anglePick`, with from −1, to the fill, the centre minus the box's origin, a0 = 228 + 22k, a1 = a0 + clamp(deg − 22k, 0, 22), and the fill's window at (box.x − 312, box.y − 88).
- **All 12 nodes exist in every state,** at their boxes; an empty segment composes to clear. A degree filling never adds or removes a node (the leaves word's rule, design/proposals/lvgl-switch.md §2.2). Segments whose ops did not change are not redrawn, because the face changes only what differs.
- **The closed ring (ready, ruling §3):** all 12 segments stay full. One more sprite node shows `incubator-ring-closed` **as a window over its difference box**: the box where the closed art differs from the full fill, measured by `prim_asset_diff_box` when both pictures are held. Its rect is that box, and its source window starts at that box minus the ring box's origin. In every other state the node has no size. **So ready redraws only the gap where the ends meet the light, never the 400 × 400 box.**
- **growNow** (ruling §3; T-40 step 2): a cut to deg = 264. The face recomposes every segment that was not full, in one frame.
- **The cuts** (the chapter emblems on the track) are separate 24 × 24 sprites and unchanged by this word. They are drawn after it.

### What it redraws (the dirty area, from the ruling's numbers, measured with the pixel test above)

| Event | Redrawn | Ceiling |
| --- | --- | --- |
| One degree fills | the one segment box holding it: **≤ 4,331 px** (the largest box, segments 3 and 8, 61 × 71) | 153,600 |
| A degree crossing a segment boundary | two boxes, ≤ 8,662 px | 153,600 |
| growNow from empty | the union of the 12 boxes, inside the arc's box (312, 88, 400 × 334): ≤ 133,600 px. The sum of the boxes is 42,066 px | 153,600 (and T-40's 162,432 for growNow's key frame with the rest) |
| Ready | the closed art's difference box (the gap at the bottom, about 280 × 110; measured when the art exists) | 153,600 |

The 12 segment boxes, as (x, y, w, h): (324, 348, 57, 74), (312, 281, 34, 75), (312, 207, 39, 75), (329, 145, 61, 71), (373, 103, 73, 58), (437, 88, 75, 37), (512, 88, 75, 37), (578, 103, 73, 58), (634, 145, 61, 71), (673, 207, 39, 75), (678, 281, 34, 75), (643, 348, 57, 74). The build computes them from the spec. These numbers are the test's expected values.

**Cost.** Each recompose is at most 4,331 integer tests and copies, done once per whole degree. Resident pictures are the 12 segment pictures (42,066 px, about 168 KB) and the fill (640 KB), well inside the face's picture limit.

### Its tests

1. **Vectors:** `prototypes/face/tests/vectors/anglepick.json` holds 24 cases (spans crossing 0°/360°, a1 = a0, 1°, 22° and 179°, pixels on each ray), each with its picture's bytes from the JavaScript reference `anglePick` in `station/src/angle-table.mjs`. The C op must match byte for byte (face_test).
2. **Coverage:** for deg ∈ {0, 1, 21, 22, 23, 131, 132, 263, 264}, every pixel of the ring box in the framebuffer equals the reference. That means the fill's pixel where the fill art is opaque and the pixel is within deg of 228°, and the stage beneath everywhere else.
3. **Nodes:** the ring's node count is the same in empty, growing, ready and hatching (12 segments, the closed window and the cuts), and `prim_unknown()` is 0.
4. **Dirty area, printed and asserted:** each single-degree step is ≤ its segment box (≤ 4,331), growNow ≤ 133,600, and ready ≤ the closed art's difference box. With a placeholder fill, the ready assertion is UNVERIFIED until the art exists.
5. **Palette:** 0 off palette in the ring's region on the art pass, with an on-palette placeholder fill.

## 2. The founder's shadow: the `shadow` request kind

### What it is

The founder is seen through the shell, showing **only what is known** (ruling §4). As chapters clear, the player sees more of their own mibi: the body at first, then each known look's part, with the edge sharpening from a soft body to a crisp shadow at ready. The opacity steps with the light: cool 0.25, warm 0.45, glowing 0.65, and the whole known founder at 0.8 at ready.

**The look is the art director's, approved** (T-20261016-99; review-art-2026-10-16d §1, PASS): a shadow through a shell lit from below, never an embryo. It is one flat warm dark, clipped to the body. The derive and its parameters are masters-pods 8c141b5c `art/station-masters/pods/incubator-b/shadow.py` `derive(alpha, q, step)`, which is the oracle. The build ports it with one added rule, the edge (below).

### Input: the founder's alpha, fitted

- **The bud:** `st.bud` gives the species, the genome (`env.budGenome()`, as the stamp request uses) and `read`.
- **Known** = `bud.read` plus every chapter for which `state.budChapterKnown(st, chapter)` is now true. It is the same set the stamp and the slip use. **q** = known chapters ÷ the species' chapters (`frame.chapters`).
- **Step** = `cool | warm | glowing | ready`, from f, as the light (ruling §4).
- **The layers, as Create draws the founder,** all at 304 × 312:
  - its base `founder-{species}-base-304x312` (the body, the head bare);
  - then one layer `founder-{species}-{part}-{look}-304x312` for each of the founder's own looks that has a layer (today only S01's `founder-S01-crown-leaf-crest-304x312`).
  - **An unread look contributes nothing.** Its layer is left out, so its part keeps the species' plain body (S01's bare head until Face clears). No veil is used, so no unread part's shape shows.
- **Where Create draws one flat picture** (the painted adult `mibi-adult-{species}-304x312`, Create founder A; else the rig pass, `founderArt` at 304 × 312), that picture's alpha is the whole input. It has no look to leave out, and the rig pass's unread Glow and Charge are not shape.
- **The fit**, as the oracle's `proof.py` `founder_alpha` does:
  - the box is the bounding box of alpha > 0.5 over the **union of the base and all the founder's look layers, read or not**, so a clearing never moves the body;
  - the scale is k = min(FIT_W ÷ box width, 192 ÷ box height);
  - the crop of the known layers' alpha (the per-pixel maximum) is resampled to floor(w · k) × floor(h · k) by Lanczos-3, in Pillow's `Image.LANCZOS` convention (the kernel widened by 1/k when reducing);
  - it is placed centred, at x = (160 − w') div 2, with its feet LIFT px above the box's foot (bottom row at 192 − LIFT).
- **A crossed bud** (ruling §4: "the species' outline only") uses the base layer alone, or the species' flat picture, with q = 0. It never uses the bud's own looks.

### The treatment: shadow.py's `derive`, plus the edge rule

`PARAMS = { FIT_W 124, LIFT 10, MASK_LO 0.47, MASK_HI 0.62, SIG0 4.6, SIG_Q 4.0, READY_K 1.0, TOP_K 1.45, BOT_K 0.7, CORE 1.3, SHADOW_RGB (36, 22, 14) }` and `P = { cool 25, warm 45, glowing 65, ready 80 }`. These are the oracle's, unchanged. Per pixel, on the fitted alpha (0 to 1):

1. **The mask:** a smoothstep from MASK_LO to MASK_HI, so a painting's own soft ground shadow (alpha about 0.43) drops out and only the body casts.
2. **The penumbra:** σ = (SIG0 − SIG_Q · q), times READY_K at ready. The light is below, so the far (top) edge is softer:
   - two Gaussian blurs of the mask, σ_top = σ · TOP_K and σ_bot = σ · BOT_K;
   - mixed by row, top · (1 − t) + bot · t, with t = row ÷ 191.
3. **The core:** a = min(1, mixed · CORE).
4. **The colour:** every pixel is SHADOW_RGB. The alpha is a′ = floor((rint(a · 255) · P + 50) ÷ 100), where rint rounds half to even.

**The edge rule (added here; review-art-2026-10-16d §1):** at every step, ready included, **each blur's σ is at least 0.7 px**: σ_top = max(0.7, σ · TOP_K) and σ_bot = max(0.7, σ · BOT_K).

- At ready with every chapter known, the oracle's σ is 0.6, so its lower edge would blur at 0.42 and show stair-steps at 1× on S03's legs and S01's crown. With the floor, the lower edge blurs at 0.7 and the top at 0.87, so the edge reads as a shadow, not a pasted cut-out.
- Wherever σ · BOT_K ≥ 0.7 (σ ≥ 1, that is q ≤ 0.9) nothing changes: 2 chapters of 4 blur at 2.6 · 0.7 = 1.82. When every chapter is known before ready, the glowing step has σ 0.6 too and is floored the same way.
- The anti-aliasing lives in the derived picture's alpha. **The face does nothing new:** it draws the 160 × 192 picture 1:1 on the painted layer, with straight alpha, as §2 already says, so the face's cost does not change.

**Determinism.** The derive runs in JavaScript in the logic's process (Node on the Pi, the page in the sandbox), so its bytes must not depend on the engine:

- Each Gaussian is separable. Its taps run to ceil(4σ) on each side (scipy's `truncate = 4.0`), with the edge mirrored (scipy's `mode = "reflect"`: d c b a | a b c d).
- The weights are computed once per σ with `Math.exp`, normalised, and rounded to integers in 1/65536 that sum to 65536 (the centre tap takes the remainder). The blur then sums integer weights in float64.
- Lanczos-3 weights are rounded the same way.

**Against the oracle:** for S01 and S03 at nothing cleared, 2 chapters, 4 chapters and ready, every alpha byte is within ±1 of `shadow.py`'s at the same input. The oracle is run with the same σ floor, which changes only ready: by up to 68 alpha levels at the edge, and nowhere else.

### Output

A 160 × 192 picture: every pixel SHADOW_RGB, the alpha as above. It is drawn on the **painted layer** in `shadow` (432, 192, 160, 192), after `pod`'s shell and light and before the shell's cap, band and straps, so they stay over it, clipped to the body (the composite order of T-20261016-68, unchanged here). Its status is `derived`, like the portrait, never in the placeholder register.

### The request

`incubator-props.mjs` sends:

```js
req({ kind: "shadow", id: `shadow:${bud.sha.slice(0, 16)}:${[...known].sort().join(",")}:${step}:160x192`,
      species: bud.species, read: [...known], step, cross: bud.kind === "cross", size: [160, 192] })
```

`pictures.mjs` gains `case "shadow"`, which calls `shadowArt(env.frameOf(r.species), r.cross ? null : env.budGenome(), r.read, r.step)`. That is a new function in `art.mjs`: the input above, then `deriveShadow(alpha, q, step)`, a port of `shadow.py` in about 40 lines with the edge rule. It is cached by its key. An unknown step, a wrong size or a missing bud throws, as every other kind does. The fitted alpha of one known set is cached as well, so a light step re-runs only the treatment.

### When it is recomputed

The id changes only when **known** or **step** changes, so a minute passing asks for nothing new.

- **At Grow:** the first picture (known = the chapters read before Grow, step cool). This is the "body mask derived once at Grow".
- **At each chapter clearing:** one new picture, when the cut turns read.
- **At each light step:** at f = 1/3, f = 2/3 and ready.

That is at most (u + 1) × 4 distinct pictures over a bud, for u clearings, and in practice about u + 4. Only the current one needs to be held. The previous one is released the way the host already releases pictures it has finished with (`face-lvgl.mjs`).

### Cost

- **Compute, per derive:**
  - the fit: one Lanczos-3 resample of the cropped alpha, cached per known set;
  - the treatment: two separable Gaussian blurs of 160 × 192. The widest is σ = 4.6 · 1.45 ≈ 6.7 (2 · 27 + 1 = 55 taps), so about 2 × 2 × 30,720 × 55 ≈ 6.8 million multiply-adds, a few milliseconds to a few tens in JavaScript.
  It runs at most about 9 times over a 20-minute bud, in the logic's process, off the face's frame. The build prints the time on the development machine; the budget stays ≤ 50 ms per derive there. The edge rule adds no work: it only floors two σ values.
- **Memory:** one 160 × 192 picture, 123 KB.
- **Redraw:** a new shadow redraws its box, 30,720 px. At a clearing, the shadow, card, slip, stamp and cut together stay inside T-40's clearing print, which is held to 153,600.

### Its tests

1. **Against the oracle** (`station/tests/shadow.test.mjs`, vectors `station/tests/fixtures/shadow-vectors.json` made by `shadow.py` with the σ floor): S01 and S03 at nothing cleared, 2, 4 and every chapter (ready), each alpha byte within ±1. Two calls give the same bytes. Every RGB is (36, 22, 14). An unread look adds nothing: S01 before Face has the bare head's alpha. The fit is the same box for every known set of one founder. A cross ignores its looks.
2. **The edge at ready** (the edge rule): on the 1× ready picture, no fully hard pixel run is longer than 2 px on a diagonal. The face draws the picture 1:1, so this is what the ready frame shows in the shadow's region.
   - A **hard pixel** is one at the step's full alpha (a′ = 204 at ready) with a 4-neighbour at or below a quarter of it (51): a near-full to near-clear jump inside one pixel.
   - A **diagonal run** is a chain of hard pixels, each one step left or right and one step up or down from the last.
   - The test prints the longest run and the steepest one-pixel step.
   - Measured on the T-99 founders with the oracle's fit (`shadow.py` and the masters at 8c141b5c):
     - without the floor, the longest runs are 6 (S01) and 9 (S03), with 248 and 418 hard pixels, and the steepest step is 190;
     - with the floor, both are 0 hard pixels, and the steepest step is 147.
   - The steps before ready are byte-identical with and without the floor.
   - "Hard" cannot mean full beside zero: a blur never leaves a zero next to a full pixel, so on that reading even the unfloored derive passes.
3. **Ids:** a minute passing inside one step asks for no new id; a clearing asks for exactly one; f crossing 1/3 asks for exactly one.
4. **Face:** in growing and ready, the `shadow` region shows a 160 × 192 painted picture and nothing outside its rect.
5. **The brightness condition** (ruling §6) is T-40's, on the captures. It stays UNVERIFIED until the shell and card art exist.

**Which build carries them.** Tests 1 and 3 belong with the `shadow` kind, T-20261016-64. Tests 2, 4 and 5 belong with the build that places the shadow on the Incubator and takes its captures, T-20261016-40.

## 3. Not in this spec

- The shadow's look beyond T-20261016-99's derive and the edge rule above. A change to PARAMS is the art director's, made in `shadow.py` first and carried here.
- The pod's shell (T-28), the art itself (T-27), Home and Idle.
- An LVGL arc primitive. It is not needed; it is reconsidered only if a later screen needs an anti-aliased arc on the painted layer.
