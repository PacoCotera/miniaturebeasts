---
ticket: T-20261015-12
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-1b
head: 02960dfdb059636780eb884563ba9f46f6b81307
ci: not run (review only)
---
## Verdict (round 2)
- incubator-empty: **PASS**
- incubator-growing: **PASS**
- incubator-ready: **PASS**
- incubator-hatch-1100: **PASS**

Captures: prototypes/face/golden/incubator/{incubator-empty,-growing,-ready,-hatch-1100}.png at 02960dfd, whole 1x. Compared pixel by pixel against round 1 (bc866c71), and the growing and hatch-1100 captures viewed whole beside Home (golden/home/home-knob-focused.png).

## What changed since round 1 (measured)
| Capture | Pixels that differ from round 1 | Bounding box |
|---|---|---|
| incubator-empty | 0 | none (it has no stamp plate) |
| incubator-growing | 7,839 | 804, 232 to 923, 351 (the plate rect) |
| incubator-ready | 7,839 | same |
| incubator-hatch-1100 | 7,839 | same |

Nothing outside the plate rect moved, so round 1's measurements stand: margins left 17, right 17, bottom 18; the three columns; the feet standing on the sill with paw pads at y 464 (round 1 table in results/review-incubator.md).

## The failing check, re-judged
| Check | Round 1 | Round 2 evidence |
|---|---|---|
| 3 One rendered style | no (flat grey plate) | The plate is now a painted bezelled box: lit rim at the top and left (luminance 205 at x 804 to 805, falling to about 125 in the face), a recessed face and a drop shade on the wall at the right and bottom (luminance 91 to 75 at x 922 to 923, wall 60 beyond). It reads as the same sage, lit, shaded family as the vents and junction boxes beside it. The stamp is drawn dimmed on it, as the ruling says. **yes** |
| 7 Owner's words | no | "looks flat": no flat object remains on the screen. "Margins": unchanged and held. **yes** |

Plate tone over (804, 232, 120, 120), relative luminance: p95 0.233, mean 0.158 in growing, 0.157 in ready and hatch-1100 (ruling cap 0.34). The chamber is 0.608 in growing and ready, so the difference is 0.375, well over 0.08. The plate sits below the right machinery's p95 (0.315), so it is slightly darker than its neighbours but not out of family.

## The seven checks, all four captures
| # | Check | Result |
|---|---|---|
| 1 | References first | yes. Laid beside Home's Incubator module. The concept board 18c17261 is not in this repository, so frame 3 was not laid beside it. |
| 2 | Objects as used | yes |
| 3 | One rendered style | yes. The machinery and the plate read as the same style as Home. |
| 4 | Grounded | yes. Plate has a shade on the wall. |
| 5 | Margins and grid | yes, 17 / 17 / 18, plate inside the right column (804 to 923 within 792 to 936) |
| 6 | Purpose at a glance | yes |
| 7 | Owner's words | yes |

## Fixes
None.

## Not judged
Motion, the wipe, other hatch beats, and the history problem the builder reported in round 1 (the lead's).
