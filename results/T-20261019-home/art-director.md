# T-20261019-home: art director (build spec §9)

The two missing console masters are drawn below, the window crop is checked, and the specimen's tone is signed with one correction to §4.2.

## 1. The Companion, upright (H3)

`art/companion-upright-docked-28x46.png` and `art/companion-upright-away-28x46.png`

- **Source:** drawn by code (`art/make-console-pictures.py`) in the Station palette. Every pixel is a palette colour, with no partial alpha.
- **The design:** the house mark (`frame-companion-*-16x24`, `mark-out-with-companion-64x96`) at station size. It stands upright, with the screen at the top, the d-pad and two buttons on the grip, the knob on the left, and a cradle under it (rows 42 to 45).
- **Docked:** the device stands solid in its cradle: `paper` shell, `ink` edge and the screen lit `sageD`/`sage`.
- **Away:** the cradle is empty, and the device is the mark's line drawing in `mist`, with the dotted ground under the cradle, as the out-with-companion mark has it.
- **Placement:** right-aligned 12 in and vertically centred (§4.3). Line 2's shields at (12, 64) stay well clear of it.

## 2. Bay berths (H3)

`art/berth-shut-26x24.png`, `art/berth-crate-26x24.png`, `art/berth-portrait-18x24.png`

They are drawn the same way, in the Cargo room's colours:

| Berth | Picture |
| --- | --- |
| shut | the sage slatted shutter of `berth-shut`, under a dark lintel |
| waiting crate | the open recess of `berth-recess` holding a closed, sealed crate (`gold`, `ink` latches and handle), with a 2 px `amber` underline at its foot |
| portrait | a gilt frame with a covered portrait in it. It is **18 wide, not 26**, because the room's portrait berth is narrower than a crate berth, and the narrow shape is what tells it apart at this size |

- **One change to §4.3: a 2 px gap between berths, not 4.**
- With four berths at a 4 px gap, the picture is 108 wide and starts at x 106, where it meets line 1 ("3 crates in" at 20). At a 2 px gap it is 102 wide, starts at x 112, and sits within the Pods station's six wells (104). Line 1 then has the same budget on both stations.
- Three berths are 82 wide.
- See `art/console-proof-3x.png` for the Incubator beside both Companion states, the Bay clear, and the Bay waiting with a portrait. Text there is shown as blocks.

## 3. The Vivarium window's crop (H2): cx = 64

- **The ground formula is right as written.**
  - The Vivarium shows painting rows 120 to 560 at screen y 40 to 480, so painting y = viv y + 80. Home shows row 194 at y 78, so painting y = home y + 116.
  - Together these give groundTop_home(x) = groundTop_viv(x − 24 + cx) − 36.
  - The Vivarium's floor (471) lands on Home's feetY 435.
- **Drawn on the crop,** the profile sits on the moss floor's far edge at every cx tried (`art/window-cx-proof-day.png`: magenta is the profile, cyan the foot).
- **Why move cx:**
  - At cx = 0 the window's left 40 px are the wall and the pipe. That is hard machinery at the window's edge, where no resident can stand (F.x ≥ 32 + W/2).
  - **cx = 64** drops it, keeps the burrow whole, and closes the right side on the plant ridge and the pond.
  - The open floor (painting 330 to 559) is in the window either way.
- **Set cx = 64.** Everything in §3 follows it, and nothing else changes.

## 4. The Library specimen at the Home tone (H4)

> **Superseded by §4b:** the lead confirmed v3 (specimen3) for Home, so §4b applies. The v2 numbers below are no longer used. The §4.2 correction below still holds: painted RGB, not palette-snapped.

- **Tone: signed, for the generator's own output.** I rendered the Home module's generator locally at 344 × 362 (centre at H/2 + 4, scale 1.08, finish with grain 4 and vignette 0.45) for early, mid, late and new states.
- **Why it passes:**
  - The deep moss ground sits well beside the warm Idle crop in the next window.
  - The found beads read in their own colours, the open rings read as unknown, and nothing competes with the residents.
- **"Palette-exact" in §4.2 does not hold, and should go.**
  - The generator is a painter: it supersamples at 2×, and draws with gradients, alpha strands, bloom and grain. Each render has about 4,500 to 9,200 colours.
  - Its ground (24, 32, 28) and the catalogue pigments are not Station colours.
  - Snapped to the palette, the ground turns a cold navy, the grain blotches, and the pigments shift (russet goes orange). That fails the tone.
  - The specimen is painted art, like the capsule and the Idle crop, and the Station palette's own note keeps painted art out of it.
- **Correct §4.2 to:** "the output: the generator's RGB image, ported as-is, plus a list of bead centres". The four breathing levels are made the same way.
- **The window's edge:** the generator's composer softens the panel's edge with its own near-black gradient. On Home, use the window's inner shade (§3: radius 6, inner shade) instead, so both windows share one edge.
- **Re-check:** I check the first public-build render against this once H4 lands.

## Open

- The S01 curl build still.
- T-20261016-230's wording, once applied.

## 4b. The specimen on the v3 rules (re-check)

UI/UX reads the owner's ruling as: Home uses the specimen3 rules, so that the Loika matches the Library's first level. I re-rendered the same four states on specimen3.js with the same finish (grain 4, vignette 0.45, the generator's own ground).

- **Tone: signed again.** The ground, grain and light are the same as on v2, and the render sits beside the Idle crop as v2 did.
- **Fit: not at v2's numbers.**
  - At scale 1.08, centred at (W/2, H/2 + 4), the v3 arch reaches x 4 and a bottom of y 342 in the latest state (late).
  - That puts beads against the window's left edge, inside its radius-6 inner shade.
- **Set:** scale **1.0**, centre **(W/2 + 5, H/2 + 4)**.
  - Measured over early, mid, late, new and the whole-collection state, the form's extent then keeps at least 21 px from every edge (late: x 22 to 322, y 29 to 330).
  - The hub stays a little above centre, with the arch's weight low and left.
- **For the H4 test:** assert, for every state fixture, that the render's drawn extent keeps 12 px from each edge of the 344 × 362 window. A species whose found looks reach further fails the test rather than clipping on screen.
