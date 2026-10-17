# T-20261016-57: the dock's Station masters (AD, 10-16, by hand in code)

When the Companion docks, the three devices react to one moment. The pictures carry it with little text (owner 13:26). The style is the house's: painted light, matte, the small-mark look. No paid call.

| Id | Place | Job |
| --- | --- | --- |
| `cargo-link-light-976x8` | (24, 296), the bay's floor line | The Caddy's link reaching the bay: a matte warm-white pool along the floor. The build reveals it in 4 steps of 244 px |
| `mark-home-16` | the home band, before the coming-home faces | Who came home: a sage door with an arrow going in |
| `mark-out-16` | the home band, before the leaving faces | Who left: a sage door with an arrow coming out |
| `face-S01-24`, `face-S02-24`, `face-S03-24` | the home band, pitch 32 | Each species' face, cut from its signed adult painting (head and crown), reduced to 24 |

**Not made here (see results/T-20261016-57.md on work-queue):**
- the residents' stand frames and walk cycles: new painted poses; only S01 has motion keys;
- faces for species with no painting;
- the Companion's "home" and "Off we go" frames: no layout is given;
- the Caddy's icons: there is no Caddy four-gray view in the repository to size them for or read them.

**Proofs** (`proof/`): `home-band-marks-faces-4x.png` and `link-light-on-floor-4x-tall.png`.

## T-20261016-97: the link light as light on the floor, and the arrival in place
The review (`results/review-art-2026-10-16c.md` §4) found that `cargo-link-light-976x8` read at 1× as a hard cream rule across the bay. It is withdrawn.

**`cargo-link-light-976x48`, at (24, 264, 976 × 48).** 8 px can't hold a pool, so the rect is taller. It is UI/UX's to adopt in the spec's §1 (was 24, 296, 976, 8).
- **The pool:** warm light lying on the floor along the crates' feet line (y 296, its row 32). A soft core sits on that line. The falloff is shorter above (the floor recedes) and longer below (toward the eye), and the pool is strongest at the bay's left, where the link comes in.
- **What it lights:** only the open bay's floor. Its alpha follows `cargo-bay-992x320`'s floor and takes the floor's grain, so the light is shown by what it lights.
- **Its bounds:** it ends at y 312, the home band's top. The crates are drawn over it.
- **The reveal:** `-step1`, `-step2` and `-step3` are the first 244, 488 and 732 px, each with a soft 24 px leading edge. The full master is step 4. A build that clips the full master instead gets a hard front on each cut.
- **Bay states:** over the open bay only, which is the arrival's bay state. It is never drawn over the shutter, so it can't cross the slats.

Made by `make-link-light.py`. `make-dock.py`'s 976 × 8 section is kept as the record.

**Proofs** (`proof/`, labelled inside):
- `arrival-in-place-1x.png`, **the owner's proof**: t = 1.5 s, the first moment the light (full from 0.9, it holds) and the home band are on screen together. Both crates are in their places, with the ribbon, and the band's shields, marks and faces at their rects.
- `link-light-on-open-bay-1x.png`: the light alone.
- `arrival-floor-2x.png`: the floor strip at 2×.
- **Stand-ins:** the ribbon (Cargo's style, typed), the band's words, which mibis came and went, and the golden's bottom line.

## T-20261016-105: the link light clipped to the floor
The review (`results/review-art-2026-10-16d.md` §2) found the light's rectangle spilling onto the dark side walls at both ends.
- **The clip:** `cargo-link-light-976x48` and its three step cuts are now clipped to the open bay's floor trapezoid. Its corners were read off `cargo-bay-992x320`: far (96, 238) and (927, 238), near (33, 323) and (990, 323). The clip is inset 6 px from each side's bevel, with a 4 px soft edge. No light lands on the walls.
- **The proofs** (`proof/`):
  - `link-light-on-open-bay-1x.png`;
  - `arrival-in-place-1x.png`, **the owner's proof**;
  - `link-light-on-open-bay-ends-3x.png` and `arrival-in-place-ends-3x.png`, both ends at 3× (x 16–184 and 856–1008, y 220–330).
- **The haze:** the pale haze higher on the walls is in the bay painting itself, not the light.
