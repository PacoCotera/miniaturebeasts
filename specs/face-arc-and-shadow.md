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

The founder is seen through the shell, showing **only what is known** (ruling §4):

- First, the founder's body as Create draws it.
- Then one layer more for each chapter that clears.
- The opacity steps with the light: cool 0.25, warm 0.45, glowing 0.65, and the whole known founder at 0.8 at ready.

Create already draws exactly this picture for a given set of read chapters. `founderArt(frame, genome, read, w, h, painted)` renders the founder and applies the calm unknown (`unknown.mjs`: ghost when nothing is read, a veil on each unread look, clear for each read one). So the shadow is **Create's picture at the shadow's size, for the chapters known now, with its alpha stepped.** It needs no new renderer and no new treatment. Each cleared chapter is "one layer per cleared chapter's looks" because the veil lifts from that chapter's looks.

### Input

- `st.bud`: the species, the genome (`env.budGenome()`, as the stamp request already uses), and `read`.
- **Known** = `bud.read` plus every chapter for which `state.budChapterKnown(st, chapter)` is now true. This is the same set the stamp and the slip use.
- **Step** = `cool | warm | glowing | ready`, from f, as the light (ruling §4).
- The painted adult `mibi-adult-{species}-160x192`, where it is placed (Create founder A, interim). Otherwise the rig pass, exactly as `founderArt` chooses.

### Output

A 160 × 192 picture with straight alpha, on the **painted layer**. It is drawn in `shadow` (432, 192, 160, 192), after `pod` and before `cradleFront` (T-40's draw order).

- Pixels = `founderArt(frame, genome, known, 160, 192, painted)`. The camera is fitted to the same scene, so it is Create's picture at this size.
- Alpha: a′ = floor((a · P + 50) / 100), with P = 25, 45, 65 or 80 for cool, warm, glowing or ready. The opacity is baked into the alpha, because the face has no opacity (prim.h). These are integer steps, never a fade.
- **A crossed bud** (ruling §4: "the species' outline only") uses known = [], so it is the ghost treatment, the body alone. The body is the species' painted adult where placed, else the rig pass of the species' type genome (`frame.typeSpecimen.genome`, the one `speciesArt` draws). It never uses the bud's own genome, so the shadow tells nothing a cross has not yet shown.
- **Status `derived`,** like the portrait: never in the placeholder register.

### The request

`incubator-props.mjs` sends:

```js
req({ kind: "shadow", id: `shadow:${bud.sha.slice(0, 16)}:${[...known].sort().join(",")}:${step}:160x192`,
      species: bud.species, read: [...known], step, cross: bud.kind === "cross", size: [160, 192] })
```

`pictures.mjs` gains `case "shadow"`, which calls `shadowArt(env.frameOf(r.species), r.cross ? null : env.budGenome(), r.read, r.step)`. That is a new function in `art.mjs`, about 15 lines, built on `founderArt` and the alpha step, and cached by its key like `founderArt`. An unknown step, a wrong size or a missing bud throws, as every other kind does.

### When it is recomputed

The id changes only when **known** or **step** changes, so a minute passing asks for nothing new.

- **At Grow:** the first picture (known = the chapters read before Grow, step cool). This is the "body mask derived once at Grow".
- **At each chapter clearing:** one new picture, when the cut turns read.
- **At each light step:** at f = 1/3, f = 2/3 and ready.

That is at most (u + 1) × 4 distinct pictures over a bud, for u clearings, and in practice about u + 4. Only the current one needs to be held. The previous one is released the way the host already releases pictures it has finished with (`face-lvgl.mjs`).

### Cost

- **Compute:** one `founderArt` pass at 160 × 192 plus one pass over 30,720 alpha bytes, at most about 9 times over a 20-minute bud. Create already runs this pass at its own size on every change of choices. It runs in the logic's process, off the face's frame. The build prints the time on the development machine; budget ≤ 50 ms per derive there.
- **Memory:** one 160 × 192 picture, 123 KB.
- **Redraw:** a new shadow redraws its box, 30,720 px. At a clearing, the shadow, card, slip, stamp and cut together stay inside T-40's clearing print, which is held to 153,600.

### Its tests

1. **Pure function** (`station/tests/shadow.test.mjs`): for a fixture founder, the alpha of each step is floor((a · P + 50) / 100) of `founderArt`'s, pixel by pixel. Two calls give the same bytes. Adding a chapter to known changes only pixels inside that chapter's look boxes, and the step's alpha. A cross ignores its genome: two crosses of one species give the same picture.
2. **Ids:** a minute passing inside one step asks for no new id; a clearing asks for exactly one; f crossing 1/3 asks for exactly one.
3. **Face:** in growing and ready, the `shadow` region shows a 160 × 192 painted picture and nothing outside its rect.
4. **The brightness condition** (ruling §6) is T-40's, on the captures. It stays UNVERIFIED until the shell and card art exist.

## 3. Not in this spec

- The look of the shadow beyond the existing calm unknown and the ruling's opacities. If the AD wants the shadow darker or tinted, that is a ruling for the AD, not a build choice. I recommend the AD signs it on a proof sheet of each species' worst cases, as was done for the portrait reducer.
- The pod's shell (T-28), the art itself (T-27), Home and Idle.
- An LVGL arc primitive. It is not needed; it is reconsidered only if a later screen needs an anti-aliased arc on the painted layer.
