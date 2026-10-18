# T-222: UI/UX rulings, round 2 (the 30 stills, work-queue 41cb9c70; build 1ac848e0)

These rule on the Incubator build spec (`results/T-20261017-incubator-object/build-spec.md`), which is amended to match in the same commit. The room, the incubate moment, Hatch now's fill and Create's Incubate panel read as specified. The changes are below.

## A. Found in the stills (not asked)

1. **Text on the painted wall is too faint.** The code ("C7E WCA V1H") and "ready in about {n} min" are in `mist` on the sage wall (about rgb 170, 178, 155). Light grey on a light wall fails at 1×.
   - **Rule:** the left column's text is **`ink`** (#1a1725), Inter 16. That is about 7:1 on the wall.
   - The face test asserts at least 4.5:1, measured against the wall master under each text box.
2. **The Hatch now | Wait panel is the old card, not the house panel.** The stills show a slate pane with the title "Hatch the Loika now?", an egg on a dish in both windows, and a "hatches now" fact line. None of that is the capsule or the panel frame. It is rebuilt as §D below.

## B. The open questions

1. **Home placement:** confirmed. The 56 × 86 capsule is centred on the Incubator module's picture box at (808, 257).
   - Built Home has no arc, so this build shows the state only: the glass with the pod (growing), the door open (ready), or empty. The lamp carries "ready".
   - The arc in the spec belongs to the redesigned Home, which is a separate build. Nothing is added here.
2. **Create's chamber mirrors the Incubator,** at its scale (145 × 224):

   | The Incubator | Create's chamber |
   | --- | --- |
   | empty | door open (`create/capsule-door-open`), no pod, no glass, bar off |
   | a bud growing (so Incubate is refused) | glass closed, **that** bud's pod, bar lit (the whole bar, never a fraction). The picture shows why Incubate is refused |
   | a bud ready | door open, that bud's pod, bar lit |
   | Incubate's travel (Create's `grow`) | glass closed over the new pod once it lands, bar lit |

   - **The glass** is drawn only when the glass is closed, never with the door open.
   - **The pod at rest** in the dish on the bench is not in the chamber; the chamber stays as the table says.
3. **The opened pod's cap placement:** the art director's call (passed on). The cap in the stills covers the juvenile's left side and reads as a large plate. Until the art director answers, the cap stands **beside** the bowl, not over it: its right edge 4 px left of the bowl's left edge, its foot on the moss line, with no overlap with the juvenile's box.
4. **Stamp contrast:** **the glass stops short of the plate.** The stamp case's front glass covers the frame only, never the 120 × 120 stamp plate, so the cells read at the old rule.
   - The 4.11 assertion goes back in for the Incubator.
   - The case master's change is the art director's (passed on). Until it lands, the build draws the case without its front glass over the plate area.

## C. The builder's readings

| Reading | Ruling |
| --- | --- |
| The panel price as the kit's price run (Inter 16, its icon spacing) | **Confirmed.** It is the same run as the bottom line, which is better than my 4/12 px |
| The panel axis at x 264 | **Confirmed.** 116 + 296 / 2 = 264; my 261 was an estimate |
| The bar at max(1, floor(158 × progress)) | **Confirmed.** The first pixel shows from the start, matching §4.1 |
| The Hatch now \| Wait panel is kept (the game designer's 10-18 correction) | **Confirmed, and §6 is amended:** the panel is built in the house frame, as §D |
| "Cross them" is not built, so only Incubate plays the incubate moment | **Confirmed.** §4.1 applies to Cross when it is built |

## D. The Hatch now | Wait panel (replaces the old card)

- **Where it lives:** a state of the Incubator, `confirm`, drawn by the same panel overlay as Create's (the architect's ruling).
- **The way in:** the Incubator's ✓ **Hatch now** while growing. A refusal (short of Essence, no bay) shows the refusal plate, as now, and the panel does not open.
- **The frame, focus, keys, dither and holds** are §6a's exactly (bezels 16, 46 and 518, 46, each 490 × 506; windows 24, 76 and 526, 76, each 474 × 468). There is no title.

| | **Hatch now** (left, focused first) | **Wait** (right) |
| --- | --- | --- |
| header price | the Essence it costs (`instantGrowCost`), as the kit's price run | none |
| window | **the hatched look at the panel's reduction (×0.733):** the day room crop, the day interior, this bud's species' **opened pod**, the **juvenile** it becomes (about 126 tall), and the open door. This is the room's hatch at 1000, framed as the panel frames the incubate look | **the growing look at the panel's reduction:** the day room crop, the day interior, the bud's sealed pod, the closed glass, and **the bar lit to its current progress** |
| caption | none | none. "ready in about {n} min" is Wait's header readout (round 3 §1) |

- **✓ Hatch now:** the panel goes as a cut, and §4.2 plays (the bar fills, the door opens, the hatch).
- **✓ Wait, or ←:** the dither back to the Incubator, unchanged.
- **The guard:** ✓ Hatch now is taken only once the dither in has ended, as §6a.
- **Masters for the panel's day looks:** `panel/` currently holds the dusk set only. The day set (room crop 474 × 468, interior-day, shell, door-open, bar-lit, glass) at ×0.733 is asked of the art director (passed on). Until it lands, the panel uses the room view's look and no window art, and is not shipped.

## E. The art director's answers (625a1b52): the interims end

1. **The cap** replaces §B.3's interim. It is recut to its true size, about 0.62 of the pod's width, pre-tilted 14° outward offline: `opened/pod-opened-cap-*` at 89 × 88 pod-large.
   - **Draw order:** cap, then bowl, then juvenile.
   - **In the room:** the bowl is 131 × 136 at (447, 283) and the cap 81 × 80 at (377, 339). The cap stands behind the bowl's left side, its bottom-right corner 11 px inside the bowl's left edge, its foot on the moss line. Its right edge (458) is clear of the juvenile's box (461 to 604).
   - Proof: `opened/proof-hatch-room.png`.
2. **The stamp case:** place `stamp-case/room-stamp-case-152x152-front.png` **for the Incubator only, as `capsule-stamp-case-front-152x152`**. Create and Pods keep station-gate's master: on their dark benches the old veil reads right, and the recut would brighten their labels (a mean of .192 rising to .534). It is the same veil with alpha 0 over the 120 × 120 plate (16 to 135), so it covers the frame band only. The 4.11 assertion is back in.
3. **The Hatch now | Wait panel's day set** is in `panel/` (×0.733), so the panel ships:
   - `capsule-room-day-474x468`, the same crop as dusk;
   - `capsule-shell`, `capsule-interior-day`, `capsule-bar-lit` and `capsule-glass-closed`, each 296 × 459 at (116, 80);
   - `capsule-door-open-457x459` at (116, 80). It is wider than the window, so the window clips its far edge.
   - **Inside:** the juvenile is 126 tall and the bowl about 113, with the cap in the same relation as the room's.
