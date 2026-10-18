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
- **The master:** the shadow is a layer of the stand, so it is cut once at the art's scale and composed with the figure. It then always matches the figure's width and pose.
  - New layer: `S01-{adult,juvenile}-304x312-shadow.png`, with a new op `"under"` (drawn before the base, order 0) in `ui/assets/stands/index.json`.
  - **The art director signs and cuts it.** It sits under the feet at the art scale, so that at 54/40 it reads as a soft contact shadow about the figure's width and 4 to 6 px tall.
  - Until it is signed, residents draw without it (as now). The build carries the layer slot.
- **Draw order in a resident's slot:** shadow (now inside the picture), ring, picture, dither, lamp. The ring is drawn after the shadow and under the figure.
- **Sleepers:** the curl gets its own shadow layer, also signed by the art director (§5).

## 4. Walking on the ground (the art director's note 3)

**The rule:** a resident's feet are always on the walkable ground. The walk band's top (296) is replaced by a **ground profile** read from the painting: the moss floor's far edge, by x. Measured on `idle-vivarium-day-1024x568`, rows 120 to 560, in Vivarium screen y:

| F.x | 16–99 | 100–329 | 330–559 | 560–899 | 900–1008 |
| --- | --- | --- | --- | --- | --- |
| lowest feetY (`groundTop`) | 372 | 352 | 316 | 324 | 344 |

These cover the pipe and stones at the left, the burrow mound, the open floor, the plant ridge and the far right planting.

- **A point is walkable** when groundTop(F.x) ≤ feetY ≤ 471, and 16 + ⌊W/2⌋ ≤ F.x ≤ 1008 − ⌈W/2⌉.
- **Start and waypoint draws** use the current draw (`lcg`), rejecting a point that isn't walkable, with the same 8-draw limit and fallback (a fallback point is moved down to its column's groundTop).
- **A path** is rejected if any point on it, sampled every 8 px along the major axis, isn't walkable, or if it meets keepOut (§6). Paths therefore never cross the mound's step from above.
- **The art director signs the profile** against the dawn, dusk and night paintings. They share the day painting's layout, so one profile serves all four.
- **Idle:** the same profile, 80 px lower (Idle's screen y = Vivarium y + 80; its foot at 551).
- **Home:** Home's glass shows a different crop. The builder measures its profile the same way, and the art director signs it, before Home's walk changes. Until then, Home keeps its band.

## 5. Sleepers

- **The curl is reduced to the world size:** the nap picture at the adult's scale, 54 / 152 of today's 96 × 88 ink, about 34 × 31. It is cut offline by the art director from the nap master, with its own shadow layer (§3). The juvenile's curl is reduced by its own factor.
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

**The fix, in the mark layers** (no new look, no new colour, no size change): **small-size mark cuts** for the world sizes, made by the art director from the 304 masters and signed. They are used when the figure is ≤ 60 px tall (home, vivarium, idle).

- `S01-adult-304x312-stripes-small.png`: the same three bands, each drawn so that at 54 it lands as a **whole-pixel bar at least 2 px wide**, separated by **charcoal gaps at least 2 px wide**, with **a 1 px charcoal keyline** along each band's edge so the gaps survive the reduction. Stripes then read as bars.
- `S01-adult-304x312-patches-small.png`: the same patches, with the saddle kept as one mass at least 6 px across at 54 and a charcoal margin round it at least 2 px. Patches then read as a blob.
- `index.json` gains a `small` file per layer, `{ "file": …, "small": …, "smallAt": 60 }`, and `layeredStand` picks `small` when the figure height is ≤ `smallAt`.

**Gate:**
- the art director's sign-off on the two cuts;
- at 54 the two composed figures differ by a mean of at least **8** per channel over the figure box;
- the covered test: two residents side by side at 1×, read apart in two seconds.

Juveniles are exempt, by the ruling.

## 8. Masters

- **Exist and are used:** the S01 stands (`ui/assets/stands/`), the Idle and Vivarium paintings, `home-lamp-sky-12x12`, and the frame's ring and tag.
- **To be signed by the art director before their parts ship.** Each part falls back to today's drawing until then:
  1. `S01-{adult,juvenile}-304x312-shadow.png` (§3);
  2. the curl at world size, with its shadow (§5);
  3. `S01-adult-304x312-{stripes,patches}-small.png` (§7);
  4. the ground profile (§4), and Home's profile when it is measured.

## 9. Checks for the builder

- **Goldens:**
  - the Vivarium at rest with four adults and two juveniles (one crested with stripes, one bare with patches), with one focused near the window's foot (the tag flips);
  - a focused sleeper;
  - Idle;
  - Home with an event tag.
- **Tests:**
  - every start and waypoint over 10,000 seeds is walkable, and no path crosses a profile step from above;
  - the ring is (W + 10) × 16 on F, the tag top is at feetY + 16, and it flips to feetY − H − 36;
  - keepOut holds against the sleepers' tags;
  - the stripes/patches difference is ≥ 8 at 54 once the small cuts are placed.
- **Print** the per-frame dirty area of a walk step with the shadow layer (≤ 153,600 px).
