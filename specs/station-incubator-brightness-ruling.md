# The Incubator brightness condition: ruling

Creative director, ticket T-20261016-14. Written 2026-10-16 (America/Mexico_City). It rules one conflict, raised by results/T-20261015-13.md: the gate condition "the chamber stays the brightest object in every Incubator state" against the recut machinery (results/T-20261015-07.md, X37: the machinery is not darkened).

## 1. The ruling: (b), a different metric

**The chamber is measured by its lit glass, not by its whole box.** The whole box (360, 200, 304, 272) is mostly the dark interior behind the glass. That darkness is the chamber's depth and is meant to stay dark, so its p95 says little about how bright the chamber reads. What the eye takes as "the chamber" is the glass's ink: the rim, the highlight and the lit edge. The numbers that parked T-13 also measured the wrong glass. The captures on station-gate 4c4e7df6 still draw the pre-T-01 `dome-front-304x272` (blob f8557064), whose ink p95 is 0.293. T-01's re-rendered glass (masters-pods e59d57f6 and later, blob 110ba0a6) measures 0.583 on its own, and 0.574 composed over each of the three captures. That is above every recut zone (L 0.459 the highest) by 0.115. So no brighter art is needed (not (a)), and the condition stays in force in all four states (not (c)). It is the metric that changes. The condition holds once T-20261015-08 places T-01's glass with the recut stage, and it is checked on the builder's captures.

## 2. Caps and condition (what a test checks)

**Luminance.** Relative linear luminance: sRGB decoded to linear, then 0.2126 R + 0.7152 G + 0.0722 B, on the 1× capture (1024×600). Percentiles use numpy's default (linear) method.

**Zone caps** (the zone rects of `specs/station-incubator-layout-spec.md` §2):

| Zone | Rect (x, y, w, h) | p95 ≤ | mean ≤ |
| --- | --- | --- | --- |
| L | 88, 104, 144, 296 | 0.48 | 0.287 |
| R | 792, 104, 144, 112 | 0.34 | 0.287 |
| LM | 248, 336, 80, 64 | 0.46 | 0.287 |
| RM | 696, 336, 80, 64 | 0.30 | 0.287 |

These are T-07's measured p95, rounded up to two decimals, plus 0.02. The mean cap stays 0.287, as before.

**The chamber mask.** The pixels where `dome-front-304x272` has alpha ≥ 128, with the slice placed at (360, 200). That is 34,194 px with T-01's slice. The mask is taken from the placed slice file, not from the capture.

**The chamber value.** The p95 of the capture's luminance over the chamber mask.

**The condition.** In each of the four states (`incubator-empty`, `-growing`, `-ready`, `-hatch-1100`), the chamber value minus the highest zone p95 measured in that state is at least **0.08**. The zone caps alone guarantee this whenever the chamber value is ≥ 0.56 (0.48 + 0.08). The test asserts the difference itself, not the floor.

**Where it is asserted.** `incubator.test.mjs` on station-gate. It runs once per state on the captures the build takes after `place-masters --only --ids room-bench-stage-incubator,dome-front-304x272,…` (T-20261015-08).

## 3. Numbers checked (the three captures named in the ticket)

Captures `prototypes/station/img/page-incubator-empty.png`, `page-incubator.png` and `fix14/incubator-growing.png` at station-gate 4c4e7df6. The zones are taken from the recut stage `room-bench-stage-incubator` at masters-pods 7731d77e (sha256 293b716f…) placed at (0, 40). The chamber is T-01's `dome-front-304x272` alpha-composed over each capture at (360, 200).

| Capture | Whole box p95 (old metric) | Chamber value, old glass | Chamber value, T-01 glass | Highest zone p95 (L) | Difference | ≥ 0.08 |
| --- | --- | --- | --- | --- | --- | --- |
| page-incubator-empty | 0.323 | 0.293 | **0.574** | 0.459 | **0.115** | yes |
| fix14/incubator-growing | 0.394 | 0.293 | **0.574** | 0.459 | **0.115** | yes |
| page-incubator | 0.394 | 0.293 | **0.574** | 0.459 | **0.115** | yes |

Recut zones (all three states; the stage does not change with state): p95 L 0.459, R 0.315, LM 0.437, RM 0.273; means L 0.163, R 0.130, LM 0.170, RM 0.099. All are under their caps. T-07's own proof mock (`proof-ia2/mock-incubator-growing-well48-1x.png`) gives the same four zones.

- **Unverified:** `-ready` and `-hatch-1100`. No capture exists. The glass is the same slice in every state (`derived["glass lift"]`: nothing lifts; drawOrder puts `domeFront` over `dome`). The ready interior is the brightest of the four, so the chamber value there should not be lower. The builder's test is the check.
- **Note:** composing over the old captures mixes the old glass under the new glass's semi-transparent pixels (alpha 128–254). The builder's captures, with T-01's glass placed alone, are the binding numbers. If the difference there falls under 0.08 in any state, the builder stops and reports. They do not lower the margin.
