---
ticket: T-20261016-100
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict

| Art | Verdict | Owner's proof | Fix |
| --- | --- | --- | --- |
| The founder's shape (T-99) | **PASS** | `shadow-steps-S01-1x.png` (masters-pods 8c141b5c `art/station-masters/pods/incubator-b/proof/`; copy in `results/T-20261016-99/`) | Build note: anti-alias the edge at ready (T-106) |
| The card crops `eyes-between`, `spots-bare` (T-98) | **PASS** | (inside the Incubator proof) | none |
| The dock link light (T-97) | **FAIL**, one small fix | none yet | T-105 |
| The wood badge (T-98) | **FAIL** | none | T-105 (a whole tree; if none reads, the word fallback) |

**What was judged:** each piece at 1× against its ticket. The binding style is `design/art-direction.md` and `design/style-guide/README.md`; purpose comes first.

## 1. The founder's shape (T-99): PASS

The owner said, 18:20: "sharpen the founder shape".

**What reads now:**
- **S01 growing** (`incubator-b-S01-glowing-1x.png`): a Loika, not a blob. It shows the body, the head facing left and the crown's leaves, inside the translucent body and clear of the cap and straps.
- **The step rows** (`shadow-steps-S01-1x.png`, `-S03-1x.png`): the purpose "see more of your own mibi each time you look" is visible as a sequence:
  - nothing cleared: a soft body;
  - 2 chapters: S01's crown appears with Face;
  - 4 chapters: tighter;
  - ready: a crisp silhouette.
- **S03:** reads by its ears, legs and tail.

**What it keeps true:**
- **Only what is known:** the crown is absent until Face clears.
- **Never an embryo:** one flat warm dark.
- **Lit from below:** the top edge stays softer.
- **T-62's five measures:** met for both species (S01 thinnest brightness margin 0.205, rule 0.08).

**Notes (not fails):**
- **2 → 4 chapters** is a modest step at 1× (σ about 3.5 → 2.3). The crown's arrival is the strong reveal, and the steps are what the rules give.
- **The ready edge is hard-aliased:** stair-steps show on S03's legs and S01's crown at 1×. It reads a little like a cut-out rather than a shadow. The proof is still right for the owner (the direction is approved, and this is a one-parameter polish). The build must not ship the aliasing: **T-106** carries T-99's derive into the face spec with a penumbra of at least σ 0.7 px at every step.

**Show the owner:** `shadow-steps-S01-1x.png`, the step row (as the ticket asks). `incubator-b-S01-glowing-1x.png` is the frame in place, if the lead shows two.

## 2. The dock link light (T-97): FAIL, one small fix

**What is fixed:**
- The light is now a warm pool on the open bay's floor (rect 24, 264, 976 × 48), soft, strongest at the left where the link comes in. It reads as light, not a rule.
- It is drawn only over the open bay, never the shutter.
- The in-place proof (`arrival-in-place-1x.png`) shows the moment with the crates and the home band.

**The defect:** the floor is a trapezoid, but the light is a rectangle. At both ends its corners paint a hazy band onto the dark side walls:
- left, x ≈ 24–70, y ≈ 240–300;
- right, x ≈ 930–1000.

At 1× in `link-light-on-open-bay-1x.png` it shows as a smear on the walls with a vertical edge, which gives away the rectangle. The AD's own claim, "it lights only the open bay's floor", isn't met at the ends.

**Fix (T-105):** clip the master and its step cuts to the floor's trapezoid. Re-proof, with 3× crops of both ends. Once fixed, show the owner `arrival-in-place-1x.png`.

**For UI/UX, from T-97's report:** the new rect (24, 264, 976 × 48), the step masters, and the light holding after 0.9 s.

## 3. The wood badge (T-98): FAIL

- **Not pebbles any more,** but at 1× on `pods-collection` (`badges-on-pods-collection-1x.png`) it doesn't read as wood either. It is a low-contrast tan smear with diagonal streaks: a close-up of a trunk's base, all texture and no shape.
- **Its neighbours read by silhouette:** pond (a ring of water), rock (two stones), cave (a dark mouth). Meadow reads by its grass. Wood has no silhouette. The AD reports it as "less instant".
- **The ruling:**
  - one more cut, with a different idea, not a third close-up: a wider window holding **one whole tree, trunk and crown, against lighter ground**, so it reads by its silhouette like the others (T-105);
  - if no whole tree reads at 32, the AD says so and the spec's §6 word fallback applies (UI/UX), with no further cut.

**The two crops** (`trait-S01-eyes-between`, `trait-S02-spots-bare`) are now clean: the eye in its own ring with no square frame, the bulb whole. PASS.

## Proof (commands run and their result lines)
- `results/T-20261016-99/*.png`, `results/T-20261016-97/*.png` and `results/T-20261016-98/*.png`, read at 1×.
- The link light's ends cropped from `link-light-on-open-bay-1x.png` at 3× (x 24–184 and 864–1004, y 220–330).
- The two crops cropped from `card-crops-160x128-1x.png`.
- Measures are the ADs' (T-99's), not re-taken.
