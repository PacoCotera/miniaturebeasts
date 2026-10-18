# T-222: UI/UX rulings on the builder's five fallbacks

These rule on the Incubator build spec (`results/T-20261017-incubator-object/build-spec.md` at 2ad0a09a), as asked by the build on `build/t-222-incubator-capsule` (eec772a8). The spec is amended to match in the same commit.

## 1. Type: the face's three sizes only, no new font cut

The face carries Inter 16, 20 and 28, in one weight each. A new cut would add a font and its metrics vectors for three small labels, so nothing new is baked.

| Where | Was | Rule |
| --- | --- | --- |
| `readyIn` (Incubator, growing) | 13, `mist`, rect 64, 384, 176, 20 | **Inter 16, `mist`**, rect **16, 384, 272, 24**, centred on x 152. "ready in about 40 min" measures about 165 px at 16, so the box widens to stay inside the plain wall (x 16 to 300) |
| panel header verb | 15 medium | **Inter 16, `bone`**, baseline at y + 21 |
| panel price figures | 13 | **Inter 16, `price`**. Icons stay 16, 4 between an icon and its figure, 12 between items, the 16 × 20 pod last |

The builder's fallback (16 everywhere) is therefore the ruling, with the `readyIn` box widened.

## 2. Glass highlight geometry: a cut master, not code

The highlights must match the closed painting's own reflections, and bands invented in code can't. **The art director cuts the glass as a master** for every view where the glass is closed: `capsule-glass-closed` in `room/` (530 × 532 at 344, 26) and `panel/` (296 × 459 at 116, 80), plus `create/` and `home/` at their sizes. It is an alpha image taken from the closed still's reflections, placed 1:1 over the pod. I've asked the art director for it.

**Until it lands, draw no glass layer.** The provisional cosine bands come out: the painted shell and interior read as closed without them, and invented highlights would be gated off later anyway.

## 3. The pod's height: 160, no up-scale

**The room pod is pod-large at its own 160 px content height,** with its foot on the moss line (512, 415). Nothing scales up, and 160 sits within the art director's "about 170" proof by eye. The panel's pod (147) and Create's (72) are reductions and stand as specified.

## 4. The crack: one layer

The renderer's single `crack` layer shows from 600 to the hatch's dither at 1000, so there is **no second crack step**: 800 becomes part of the same still beat. No new master. The hatch table now reads: 600 crack, 1000 dither to the hatched look.

## 5. The moving-set hatch: plain steps for now

**Accepted:** every juvenile hatches by the plain steps (the two lifts at 1400 and 1800 on the feet line 415). The moving set's close atlas would need boxes and a capsule-lit atlas at 146 tall, which is a later ticket once the capsule build has landed. `events.hatch.moving` is not used on the capsule until then.
