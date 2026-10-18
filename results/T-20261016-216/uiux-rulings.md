# T-216 Cargo: UI/UX rulings on the build (cargo/build-spec ba2c26d1; 7 stills at work-queue 96840ee9)

**PASS on UI/UX, with one correction (§2.3).** The bay, the opening with three crates, the portrait crate's four berths (the gold edge on the fourth), the end, and the waiting mat all read as `results/T-20261016-197/build-spec.md` says. The art director's gate on the stills and on the script-cut pieces is asked separately (§3).

## 1. Found in the stills

- **The notice slot reads correctly.** At rest it carries the frame's notice ("two new pods in the rack"), with the middle slot carrying the waiting line. That is §6's split.
- **Four berths with only two walk crates** (still 07): the third walk berth is slatted and shut, and the portrait crate is in the gold-edged fourth. Correct.

## 2. The open questions

1. **The hatch frame:** this is the art director's finish, so it is their call (passed on). If they confirm it, it is drawn as a script-cut picture like the berth edge, not as a runtime shape.
2. **The dock arrival:** **leave it with §7's follow-on.** The arrival show (T-120) stays on its old `dock*` regions for now. It and the dock panel are rebuilt together on the new bay when the Home build lands. Its strip keeps **"Open the bay"**: it names the place the press opens, and Cargo's own ✓ there then reads "Open them all". No change in this build.
3. **The mat row: correct to the spec. Centre by count** (the spec's "the row centred on x 104"):

   | Pods waiting | Places (box x) |
   | --- | --- |
   | 1 | 84 |
   | 2 | 60, 108 |
   | 3 | 36, 84, 132 |
   | 4 or more | 32, 80, 128, with "+{n}" (n = the pods past the third) right-aligned at 180 |

   A pod landing on the mat goes to its place in this table, as the count it makes. When the row's count changes, the row re-lays as a cut.

## 3. For the art director (passed on)

- The hatch's 3 px rounded frame (§2.1).
- The gate on the 7 stills, and on the script-cut pieces `berth-edge-258x294`, `berth-edge-190x294`, `berth-gilt-198x302` and `cargo-mat-160x80`, with the lip drawn on shut doors too.
- The painted-family patterns added to `asset-policy.mjs`.

UI/UX is content with them as pictures: the face palette has none of those colours, and a picture cut at build time is palette-exact by construction.

## 4. The builder's readings

| Reading | Ruling |
| --- | --- |
| Fonts: 13 → 16, 22 medium → 20 | **Confirmed.** The face has three sizes only, as T-222 ruled |
| A crate with nothing reads as one material's length (1,600 ms) | **Confirmed** as a guard. Play never sends an empty crate (an empty trip sends none) |
| A material's "+n" leaves on lift-off; the counter flash at 500 | **Confirmed, with the arrival stated:** 500 is the destination answering (the flash). **On arrival the counter ticks to its new value with the flash again**, so the same "+n" ends where it began. If the arrival tick is already there, nothing changes |
| `crate.finds` is read when present; the first find overhangs 12 px off the left edge at the end of its flight | **Confirmed.** The overhang is the display-size box in the last frames before its dither swap to 16 × 16 on the strip. After the swap it sits inside the strip |
| The portrait pair is centred at (576, 130), travels to (−200, 40), and lifts with `crate-lifting-176x138` | **Confirmed** (the display's centre is 600, 150) |
| The travel rect is [16, 0, 992, 552] | **Confirmed, and §4 is amended:** a travel never leaves the screen's bay and top bar. Materials end at the top bar's icons (drawn after, over them), and a mat pod may overhang the bay's left edge by its box until it swaps. The portrait's exit stays the one travel that leaves |
| The world turns at the crate's end | **Confirmed** |
| The hold ceiling: crates that fit in ≤ 30 s play; the rest are taken in by the rule | **Confirmed.** In play there are at most four crates, which is well inside 30 s |
| ✓ Look at the pods rings the newest pod | **Confirmed** |
| The frame title is "Bay" | **Confirmed** |

## 5. The done crates in the end state (the lead's follow-up)

**Checked: the end uses the done cut.** `cargo.json` places `crate-sealed-256x176-done` at (0, 102) in each berth (and the 176 and sitting done cuts with a portrait crate in). Measured on the stills, the first crate's box (200, 354, 256 × 176) has a mean of rgb 142, 108, 57 at rest (`01-bay`) and 108, 83, 46 at the end (`06-end`): about 0.76 of the sealed value. That is the art director's "value × 0.72, hue kept", plus the same shadow.

**It is right that a done crate is a closed crate.** The spec's done state is "its lid closes in its berth and it dims", so the crates are not drawn open. What tells them apart is the dimming as each finishes, in sequence, while the next lights up.

**One question to the art director (passed on):** at the end every crate is done, so there is no sealed crate beside them to compare against, and 0.72 alone may read as "unchanged" at 1×. Whether to deepen the value step (for example to 0.6) is a paint call, so it is theirs. UI/UX asks for no new mark or word: dimming stays the only sign, as the owner's "nothing negative" and minimal-words rulings want.
