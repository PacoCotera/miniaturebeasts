---
ticket: T-20261016-121
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-3
head: 2195d320
ci: not run (review only)
---
## Verdict: FAIL (fix tickets T-20261016-125 builder, T-20261016-124 art)
No capture is named for the owner: the screen does not pass.

| Capture | Verdict |
|---|---|
| incubator-empty | **PASS** |
| incubator-growing (nothing cleared) | **FAIL** |
| incubator-growing-late, incubator-ready | **FAIL** |
| incubator-hatch-1100 | **PASS**, except the slip cut (same fix) |

Judged at 1x on golden/incubator/*.png at 2195d320, against specs/station-incubator-tabs-ruling.md, specs/face-arc-and-shadow.md and the passed art results/T-20261016-99/shadow-steps-S01-1x.png. Purpose first, then style (design/art-direction.md, design/style-guide/README.md).

## What is right
- **The ring with arcFill (T-64) works on screen.** Growing shows a short tan fill from the 228 degree start (at about 8 percent); growing-late fills to about 60 percent (ready in 7 min); ready shows the whole 264 degree arc filled and the ends open at the cradle. The four chapter emblems sit on the track at their positions (Coat left, Face top, Movement top right, Stamina right) and take the fill under them as they clear. This is the first 1x look at the word, and it reads as a ring of time.
- **Purpose of the layout:** how close the meeting is (the ring and "ready in about 18 min" / "7 min", the one minute count the ruling allows), and what the player has learned (the slip's "Cleared while growing", the card "Just cleared" / "Next to clear", the stamp and code). The columns are as specced: slip 88 to 296, pod and ring centre, card 728 to 936, stamp and code below it.
- **Focus:** the oval on the pod is the cased ring. Sampled across the left edge at y 288: (12,10,18), (255,230,173), (255,230,173), (12,10,18) at x 395 to 398, and the same on top at y 139 to 142. The pod is clearly the brightest object (the builder's p95 margins are 0.20 or more).
- **Empty:** a bare recessed track and the empty nest, "the nest is empty", "Choose a pod". No leftover machinery. Clean.
- **Hatch (1100):** the juvenile stands on the nest, the slip, stamp and code stay, the ring's fill and the card have gone, as the ruling says. The juvenile's paws sit on the nest lip.

## Fails
1. **The shadow is absent while nothing has cleared.** incubator-growing.png shows the shell and nothing inside it: no silhouette at all. The passed art's first panel ("nothing cleared") shows the founder's soft body shadow; the ruling says the shadow shows from the start (cool, 0.25). Wrong: no shadow, expected the body at the cool step.
2. **From the first clearing it is the wrong picture.** In incubator-growing-late.png and incubator-ready.png (zoomed 3x) the figure in the pod is a desaturated, semi-transparent colour creature with eyes, a green leaf, a lighter belly and **a visible Bayer dither pattern**, which is not the approved shadow. The passed art is one flat warm dark (36, 22, 14), smooth, with the penumbra tightening from a soft body to a crisp shadow, "never an embryo" (results/T-20261016-99.md). The build reads as a third rendering (the dithered token), and the style guide forbids dither on a painted layer. At ready it shows the whole figure with its eyes where the passed art shows a clean silhouette. The fix is to port the T-99 derive (spec section 2) in place of T-64's colour-keeping shadowArt.
3. **A slip line is cut inside a word.** "Face: leaf crest, thin ri…" in growing-late, ready and hatch-1100. The spec says cut at a word. Wrong: the cut is after "ri".

## Findings that are not builder work
- **The card's picture is a 24 px emblem in a 160 x 128 slot** (ready: "Just cleared", Stamina), because the 160 x 128 trait crops do not exist (art owed; the spec's section 8). It reads as a mostly empty dark box until they do. Not a fail of this build.
- **Three frames exceed the 153,600 dirty-area ceiling** (the builder's finding 1: growing to ready 270,362 px, growNow landing on ready 389,779, growNow's key frame 332,968): `incubator-ring-closed` differs from the fill over 394 x 332 px instead of only at the gap. That is an art fix (T-20261016-124). The builder loosened three assertions to the measured values; they must be put back when the art is fixed.
- **The hatch's first frame is 188,330 px** (the ring and the card leave together). The builder did not stagger it; the architect or UI/UX decides whether to stagger one of them by a frame.
- The slip paper is light tan and its text is set in ink and stone, as the builder found; the same paper in Create is untouched.

## Not judged
Motion (the pulse of a cut, the hatch beats), the moving hatch captures, and the build's tests; the numbers above are the builder's.

## Fix tickets
- **T-20261016-125** (builder): the shadow per section 2, from nothing cleared; the slip cut at a word.
- **T-20261016-124** (art): recut incubator-ring-closed to differ only at the gap.
