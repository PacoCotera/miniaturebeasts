# The Vivarium at world size: the build spec (UI/UX)

This spec is for the builder, on station-gate after #236 and #237. It finishes the 54/40 figures that T-201 placed.

**Scope:**
- the Vivarium full screen (`vivarium.json`);
- Idle, which shares the same painting (`frame.json idle`);
- the built Home's living window (`home.json`), where its rules are shared code.

The Habitat and Sitting rects are a separate Habitat ticket. They reuse §1–§3's functions, and nothing else here touches them.

**Sources:**
- UI/UX's figure-based ring and tag ruling (2026-10-17 22:19);
- the art director's T-201 notes 1 to 3 (`results/T-20261016-201/art-director.md`, work-queue 1d77a7e7);
- the game designer's ruling on stripes and patches (checked in §7);
- the size table: `design/art-direction.md` "Size and pose", and `ui/specs/station/stand-sizes.json` (54/40 for home, vivarium and idle).

All rects are `[x, y, w, h]` in screen pixels at 1×. Nothing is scaled at runtime, and every picture is composed in the logic process and placed 1:1.

## 0. Measuring from the figure, never the slot

A resident's picture stays its place's size (144 × 152 adult, 104 × 112 juvenile), with the figure composed at 54/40 and bottom-centred in it, transparent around it (`layered-stand.mjs`). Everything below is measured from the figure, never the picture box.

**The props carry each resident's figure**, `figure: [dx, dy, W, H]`: the drawn bbox of the composed figure within its picture (ink alpha ≥ 128), computed by the logic process when it composes the stand. It is part of the stand's cache entry. From it:

- **F, the feet point:** F.x = picture x + dx + ⌊W/2⌋; F.y = feetY = picture y + dy + H − 1 (the last ink row).
- **The figure box:** `[F.x − ⌊W/2⌋, feetY − H + 1, W, H]`.

## 1. The ring (`frame.json focus.ring.shapes.footprint`, applied to the figure)

- **Shape:** an ellipse of (W + 10) × (fh + 10), centred on F, with fh = 2·⌊(W + 6) / 12⌋ held to 6–16. At these sizes fh = 6, so the ring is (W + 10) × 16, spanning feetY − 8 to feetY + 8. It keeps the same bands (key/core/key) and the same cut in and out.
- **Lift:** the focused figure lifts 4 px. The ring stays on the ground at F.
- **The focus target box** (for `nearestIn`) is the figure box (§0), not the picture.

## 2. The name tag (h 24, Inter 16, width rule unchanged)

- **x:** centred on F.x, slid to stay 8 px inside the window.
- **y:** its top at **feetY + 16**, 8 px under the ring's lower edge.
- **Flip:** if its bottom would pass 8 px inside the window's foot, it sits over the figure, its top at **feetY − H − 36** (the 4 px lift included).
- **Home's event tag** (grown up, born, until visited) shows without focus, so it takes no lift: its flipped top is feetY − H − 32.

## 3. Contact shadows (the art director's note 1)

- **Each standing figure gets its signed contact shadow, drawn before the figure, at the figure's width, under its feet.**
- **The master (signed by the art director):** `shadows/S01-{adult,juvenile}-304x48-shadow.png` (beside this spec), a stand layer with a new op **`"under"`** (drawn before the base, order 0) in `ui/assets/stands/index.json`.
  - It is its own 304 × 48 canvas, because the stand ends 7 rows below its feet line. Its row 24 sits on the feet line (stand row 305), and it is reduced with the figure.
  - At 54 it is about 5 px tall, and 4 at 40, as wide as the body's foot extent: warm near-black at 0.8, nudged 2 px right.
- **Draw order in a resident's slot:** shadow (now inside the picture), ring, picture, dither, lamp. The ring is drawn after the shadow and under the figure.
- **Sleepers:** the curl's own shadow, `shadows/S01-*-curl-304x48-shadow.png` (§5).

## 4. Walking on the ground (the art director's note 3)

**The rule:** a resident's feet are always on the walkable ground. The walk band's top (296) is replaced by a **ground profile** read from the painting: the moss floor's far edge, by x. Measured on `idle-vivarium-day-1024x568`, rows 120 to 560, in Vivarium screen y:

| F.x | 16–99 | 100–329 | 330–559 | 560–899 | 900–1008 |
| --- | --- | --- | --- | --- | --- |
| lowest feetY (`groundTop`) | 372 | 352 | 316 | 324 | 344 |

These cover the pipe and stones at the left, the burrow mound, the open floor, the plant ridge and the far right planting.

- **A point is walkable** when groundTop(F.x) ≤ feetY ≤ 471, and 16 + ⌊W/2⌋ ≤ F.x ≤ 1008 − ⌈W/2⌉.
- **Start and waypoint draws** use the current draw (`lcg`), rejecting a point that isn't walkable, with the same 8-draw limit and fallback (a fallback point is moved down to its column's groundTop).
- **A path** is rejected if any point on it, sampled every 8 px along the major axis, isn't walkable, or if it meets keepOut (§6). Paths therefore never cross the mound's step from above.
- **Signed by the art director for all four lights:** dawn, dusk and night correlate with day's edges at 0.86, 0.96 and 0.94, at zero offset.
- **Idle:** the same profile, 80 px lower (Idle's screen y = Vivarium y + 80; its foot at 551).
- **Home:** Home's glass shows a different crop. The builder measures its profile the same way, and the art director signs it, before Home's walk changes. Until then, Home keeps its band.

## 5. Sleepers

- **The curl is reduced to the world size:** the nap picture at the adult's scale, 54 / 152 of today's 96 × 88 ink, about 34 × 31. It is reduced by the standing figure's factor for its stage (signed by the art director), with its shadow `shadows/S01-*-curl-304x48-shadow.png`.
- **The bed** is unchanged: `regions.bed`, with sleepers' feet on y 456 at the places 840, 888 and 936.
- **Ring and tag:** the same rules (§1–§2) on the curl's drawn bbox. The tag is always over the ink: its top at **ink top − 32**, with no lift. The old fixed 96 × 88 ink box and 112 × 24 ring go.

## 6. keepOut, recomputed

A walker's tag now spans feetY + 16 to feetY + 40. Near the bed it must stay above the sleepers' tags.

- **The sleepers' tag top** = 456 − curlH − 32, with curlH the curl's drawn height (about 31): about 393.
- **A walker's feet keep out** when F.x + ⌈W/2⌉ > 752 (the leftmost sleeper's tag reach, 840 − 88, unchanged) **and** feetY > sleepers' tag top − 40 (about 353).
- The keepOut rect therefore becomes **[752, 353, 256, 119]** (to the window's foot at 472), recomputed from the measured curlH.
- `keepOutRule`'s text is updated to say this.

## 7. Stripes against patches at 54 (the game designer's ruling)

**The check, on station-gate after T-203** (#234): the S01 adult, bare head, charcoal base, with the `stripes` layer against the `patches` layer, composed and reduced to 54 px tall (57 × 58) as `layered-stand.mjs` does.

**At 1× they do not read apart** (`stripes-patches-54-1x-2x.png`, `stripes-patches-54-8x.png` beside this file). Both are cream marks on the back (mark rgb about 202,173,151 and 214,187,160 on a charcoal body at about 66,56,62). The mean difference between the two composed figures is only **3.9** per channel. Their shapes differ (three thin bands against one saddle and a spot), but at 54 the bands are 1 to 2 px with 1 to 2 px gaps, so they blur into a saddle-like light area. The colour ramps add no cue, because both marks take the same cream.

**The art director's ruling: no small-size cut.** At 1× the stripes are separate bars and the patches two rounded masses. The 3.9 mean measures paint area, which is equal by design, not shape. A size fork would double the mark layers. UI/UX accepts this: the metric was the wrong instrument for shape.

**So the gate is the covered test, on the device:** two adult residents side by side at 54 on the charcoal bare head, one with stripes and one with patches, read apart in two seconds. The game designer, who ruled on it, judges it.

**If it fails,** the fix is the art director's: wider gaps between the stripes in the shared layers, at every size. No size fork and no new look.

Juveniles are exempt, by the ruling.

## 8. Masters

- **Exist and are used:** the S01 stands (`ui/assets/stands/`), the Idle and Vivarium paintings, `home-lamp-sky-12x12`, and the frame's ring and tag.
- **Signed by the art director** (`results/T-20261018-vivarium/art-director.md`, `shadows/`):
  1. the contact shadows `shadows/S01-{adult,juvenile}-304x48-shadow.png` (§3);
  2. the curl at world size, with `shadows/S01-*-curl-304x48-shadow.png` (§5);
  3. the ground profile for all four lights (§4).
- **Still to come:** Home's profile, signed when it is measured.
- **No new mark layers** (§7).

## 9. Checks for the builder

- **The covered test** for stripes against patches, on the device (§7), for the game designer.
- **Goldens:**
  - the Vivarium at rest with four adults and two juveniles (one crested with stripes, one bare with patches), with one focused near the window's foot (the tag flips);
  - a focused sleeper;
  - Idle;
  - Home with an event tag.
- **Tests:**
  - every start and waypoint over 10,000 seeds is walkable, and no path crosses a profile step from above;
  - the ring is (W + 10) × 16 on F, the tag top is at feetY + 16, and it flips to feetY − H − 36;
  - keepOut holds against the sleepers' tags;
- **Print** the per-frame dirty area of a walk step with the shadow layer (≤ 153,600 px).
