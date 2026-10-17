---
ticket: T-20261016-94
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict: two pass, two fail, and the wood badge is recut

| Art | Verdict | Owner's proof | Fix |
| --- | --- | --- | --- |
| Incubator candling and crops (T-68) | **PASS** | `incubator-b-S01-glowing-1x.png` (masters-pods `art/station-masters/pods/incubator-b/proof/`, ef75bc97; copy in `results/T-20261016-68/`) | Two leftover crops, in T-98 (not blocking) |
| Decision panels (T-70) | **PASS** | `panel-grow-over-create-1x.png` (masters-pods `art/station-masters/pods/decision-panel/proof/`, 5d88a7c1; copy in `results/T-20261016-70/`) | none |
| Create bench (T-69) | **FAIL** (one fix) | none yet | T-95 (UI/UX: room for the drum) → T-96 (art: the drum at 80 × 96) |
| Dock arrival (T-57) | **FAIL** (the link light) | none yet | T-97 |
| Wood badge (T-36 finding) | **Ruled: recut** | none | T-98 |

**What was judged:** each piece at 1× against its fix list in `results/review-art-2026-10-16b.md`. The dock arrival was judged against `specs/station-dock-arrival-spec.md`. The binding style is `design/art-direction.md` and `design/style-guide/README.md`; purpose comes first.

## 1. Incubator (T-68): PASS

- **The shadow is clipped.**
  - At 1× in `incubator-b-S01-glowing-1x.png`, the cap, band and straps are clean.
  - The AD's 2× before and after (`shadow-clip-before-after-2x.png`) shows 0 shadow pixels on them, in S01 and S03, warm and glowing (before: 3 286 and 1 232).
  - The founder still reads through the body.
- **The five candling measures still hold** (T-68 table; tightest brightness margin 0.159, rule 0.08).
- **The whole screen reads as candling** (owner points 1, 6, 9 and 11): lit from below, the shell clearing, the shape inside, the ring at the stage's scale.
- **The slip and card fill the columns** (point 4).
- **There is no machinery, no tabs and no leaves** (points 2, 3, 7, 8).
- **The 11 re-cut crops are clean at 1×:** no rectangular feather, no sheet ground, no specks.
  - The three S03 scales crops now read as a clean close patch of scaled coat. The painting is a close-up of the flank, so this is the truthful crop, and few-fine and many-coarse differ visibly.
  - The S03 claws crops are whole feet in a soft fade.
- **Not blocking:** `trait-S01-eyes-between` still has its square frame, and `trait-S02-spots-bare` its cut bulb (the AD reported both; they were outside T-68). Neither is in the owner's proof. They are re-cut in T-98.

**Show the owner:** `incubator-b-S01-glowing-1x.png`.

## 2. Create bench (T-69): FAIL, one fix

**What is fixed:**
- **The gene line** is a braided hose that leaves the well's side through a ferrule, runs down with slack and enters the tray through a boot. It now says "the drums are fed by this pod".
- **The proof carries its stand-ins:** the chapter words, the slip at the longest case, and the founder's contact shadow.

**What still fails:**
- **The drums.** At 1× in `create-shape-S01-1x.png` they still read first as five framed picture tiles. The new ribs and axle bosses show at 2× (`drums-and-line-before-after-2x.png`) but barely carry at 1×, because the round has only 8 px above and below a 64 px window.
- **The AD's own report** says the three-second test "is not certain", and traces it to the size.
- **Why this blocks:** this is the exact read the owner said was missing ("a creation environment where you tweak genes"). So it does not go to the owner on a maybe.

**Fix:**
- **T-20261016-95 (UI/UX):** make room in the bank for the AD's proposed 80 × 96 drum, window at (8, 16).
- **T-20261016-96 (art):** repaint the drums to it, and re-proof.

**Noted, not the art's:**
- "✕ Crown and Eyes clash" is 180 px, over 176 (copy).
- "Still a surprise" in `mist` on paper is hard to read at 1× (UI/UX colour).
- The founder's feet end at 384, above the dish top (placement).

## 3. Decision panels (T-70): PASS

The owner's words (13:26) were "visually we must make them very interesting. not sold on that cream color and lots of text."
- **No cream, little text:** one question, a word per option, the costs on rubber chips, one short line.
- **It is a moment now.** Each outcome stands **on** its plinth, which has depth and a moss top, with a contact shadow. A warm pool lights the plinth and rims the subject, and the well's back wall catches the glow. The subjects stand 69–86 % of the picture slot.
- **"Return it" is one painted picture:** the mibi in the vivarium's own forest light, against "Keep Pip" on the plain lit stage. The choice reads from the pictures before the words.
- **Style:** the device plate kit, the vivarium's moss and painted light. Nothing new.

**Show the owner:** `panel-grow-over-create-1x.png` (it is the panel the player meets first). `panel-return-over-vivarium-1x.png` is the second, if the lead shows two.

**For UI/UX, from T-70's report:**
- the spec's Grow it picture (104 × 112) is under half the slot and should become `mibi-juvenile-S01-176x128`;
- "Return this pod?" is not yet proofed.

## 4. Dock arrival (T-57): FAIL (the link light)

- **The marks and faces pass at 1×:**
  - `mark-home-16` and `mark-out-16` read as a door with an arrow in and out;
  - `face-S01/S02/S03-24` read as each species' head.
- **The link light fails.**
  - I laid `cargo-link-light-976x8` on the bay goldens at its rect (24, 296), on `cargo-bay` and `cargo-bay-empty`.
  - At 1× it is a hard cream hairline across the whole bay. It has no falloff on the floor and no glow, so it reads as a rule drawn on the screen, not "a matte warm-white pool along the floor line".
  - In the empty state it cuts across the shutter's slats.
- **The proofs are isolated 4× crops,** so the arrival was never judged in place.

**Fix: T-20261016-97.**
- the light painted as light on the floor (a taller rect for UI/UX if 8 px can't hold it);
- which bay states it shows over;
- a 1× proof of the arrival in place, with the band.

## 5. The wood badge (T-36 finding): ruled RECUT

- **What it looks like:** at 1× in `pods-collection.png` (batch head cf6bc257), `place-wood-32x32` is a dark mass of round blobs. It reads as pebbles or leaf litter, as the reviewer found. Pond, rock and meadow read.
- **The ruling:**
  - **Not keep:** it fails its job of telling the pods apart.
  - **Not yet the word fallback:** the badges are pictures by design ("the art is the interface"), three of five already read, and the wood painting hasn't been tried for a part that says wood at 32.
  - **Recut:** a trunk with its bark, or a root with its lit edge, from the wood painting. **T-20261016-98.**
- **If no part reads at 32,** the AD says so, and the spec's §6 fallback (the place's word, UI/UX's call) applies. No invented symbol.

## Proof (commands run and their result lines)

- `results/T-20261016-{68,69,70,57}/*.png`, read at 1× (and the AD's 2× sheets).
- `git show origin/masters-pods:art/station-masters/pods/slices/cargo-link-light-976x8.png` → (976, 8). Alpha-composited onto station-gate 69ea1d23 `golden/cargo/cargo-bay.png` and `cargo-bay-empty.png` at (24, 296), and read at 1×.
- `git show cf6bc257:prototypes/face/golden/pods/pods-collection.png`, read at 1× for the badges.
- Measures are the ADs' (T-68's table), not re-taken.
