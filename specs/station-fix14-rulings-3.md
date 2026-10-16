# Fix 14: UI/UX rulings on builder 4's three findings (F2 floor, rule 6 holds, §5 examples)

UI/UX specification owner, for the Station lead and builder 4. Written Thu 2026-10-15, 18:30 to 18:50 (America/Mexico_City).
- **Ruled against:** the fix 14 spec (signed 07:06, amended 07:18) and the architect's two notes (06:57, 08:12). Decisions.md and the code on main win over the spec. The whole-screen gate and the visible-change freeze stand.
- **Read at:** public `main` `bd0e64c8` and `station-fix14` `cd3163ad` (gate `4e522a3e` merged in), in shallow read-only clones in my scratch space. Nothing pushed, no repository added, no spend.
- **Verified / not verified.** I read the code; I could not build the face or run `layer-check` here (no emsdk, no browser).
  - (1) The WARN path and `FLOOR_STRICT` are verified in `tools/layer-check.mjs` :31–:75. The counts "1–6 of 36–66 cross-sections" are the builder's and **not verified**.
  - (2) Verified on main and on `cd3163ad`.
  - (3) The Probe numbers are verified. The species x 595 is **not reproduced**: the face's code gives 599 (below).

**Verdict.** No ruling changes a golden, a pixel or §10's counts (80 of 138 goldens, 31 of 43 journey captures). No ruling needs the CD.
1. **F2: change the rule** to the WCAG 2.2 area measure, plus a no-hole guard. It gates by default, and `FLOOR_STRICT` goes.
2. **Rule 6: main wins.** The ring goes for a hold where main drops it, and it stays where main keeps it (the Probe's mend and install, every creature's footprint ring).
3. **§5: the face stands.** The spec's Probe example is corrected. The species example already matches the face's code (599), so it stays. A face that draws 595 would be applying the chip twice, which is a face bug.

## 1. F2, the 2 px floor on the rendered frame

**Finding.** The spec's floor is "at every point". It compares each band pixel with the single ground pixel under it. The by-construction argument (§2, §14.4) holds on a ground that is even across the ring's 4 px. On pixel-scale grain (moss speckle, soil), a cross-section can have its core on a bright grain (> 0.236) and a key on a dark one (< 0.110). That cross-section then gives 1 px, or rarely 0. No line drawn in the two palette roles can avoid this, so the rule as written is unattainable on painted ground, not a defect of the ring. A permanent WARN gates nothing, which is not acceptable either.

**Ruled: change the rule. F2 measures what WCAG 2.4.13 measures (the area of qualifying pixels), and adds one local guard.** For each F2 state, over the ring's visible cross-sections (as the tool already finds them, with those under the body skipped):
- **(a) Area.** The ring pixels that reach ≥ 3:1 against the ground frame's pixel beneath them number at least **2 × the visible cross-sections**. That is a 2 px line on average along the visible ring.
- **(b) No hole.** Every visible cross-section has **≥ 1 px** at 3:1, so the line never vanishes at any point.
- **(c) Report, not a gate.** The tool prints the count of cross-sections under 2 px and the longest run of neighbouring ones, as information for the CD's 1× judgement.

**Why this bound.**
- On even ground, every cross-section gives ≥ 2 px (dark ground: the core's 2; bright: the keys' 2; mid: all 4), so (a) and (b) hold by construction.
- On grain, a thin cross-section is offset by the mid-ground ones (4 px). The builder's 1–6 thin cross-sections of 36–66 sit well inside (a) unless the thin ones are 0 px.
- The light weight still fails (a) on any dark ground: its 1 px core is all that carries there. F1 (static, darkest ≥ 0.1102) is unchanged, so the CD's 07:07 ruling stands as it is: the light weight stays shut, and night is pinned to default.

**If a state fails (a) or (b) at `cd3163ad`, it fails CI.** The builder reports the state, the point and the ground values under that cross-section to UI/UX. It goes to the CD as the floor's watch point, with the frame. The weight is not changed and the rule is not tuned.

**Goldens and counts:** none. F2 runs on capture and layer-check states, not goldens. **CD:** not needed. This is how the CD's 2 px floor is measured, now aligned with the WCAG measure the CD cited. Recommend that the lead tell the CD in one line with the night frame.

### Spec edits (`specs/station-fix14-spec.md`, §14.4 addendum)

1. **"The floor, defined."**
   - Old: "**The floor, defined.** At every point of a creature ring, the bands that reach ≥ 3:1 against the ground pixels they cover add up to ≥ 2 px of line (WCAG 2.2 focus appearance: a 2 px perimeter at 3:1 against the unfocused pixels). The thresholds come from the palette:"
   - New: "**The floor, defined.** Over the visible length of a creature ring, the ring pixels that reach ≥ 3:1 against the ground pixel beneath them cover at least the area of a 2 px line, and at no point does the line vanish: every cross-section has ≥ 1 px at 3:1 (WCAG 2.2 focus appearance: the area of a 2 px perimeter at 3:1 against the same pixels unfocused). On ground that is even across the ring's 4 px, every cross-section gives ≥ 2 px by construction (below). On pixel-scale grain, a cross-section may give 1 px, and the area carries it (UI/UX ruling, `specs/station-fix14-rulings-3.md` §1). The thresholds come from the palette:"
2. **F2, "The assertion."**
   - Old: "**The assertion.** At least 2 pixels of every cross-section reach ≥ 3:1 against the ground frame's pixel beneath them. On failure: "<state>: n cross-sections under 2 px at …"."
   - New: "**The assertion** (it gates; there is no strict switch). (a) The ring pixels that reach ≥ 3:1 against the ground frame's pixel beneath them number at least 2 × the visible cross-sections. (b) Every visible cross-section has ≥ 1 such pixel. On failure: "<state>: floor area p of 2c px" or "<state>: a cross-section with no 3:1 pixel at (x, y), ground <L…>". It always prints "<state>: k of c cross-sections under 2 px, longest run r" for the CD's 1× judgement."

## 2. Rule 6 and holds: main wins

**Finding (verified).** Main drops the ring for a hold only on some screens. `cd3163ad` already follows main.

| On main | Code | Asserted |
| --- | --- | --- |
| **The ring goes for the hold.** Home's chrome targets (modules, knob, vivarium bezel) and its tiles: the knob's `rest` (hold 380) | `home.c` :563, :663; knob unlifted `home_builds.c` :81 | `home.test.mjs` :131 "no ring while the hold runs" |
| **The ring goes for the hold.** Habitat's chrome targets (name, species, plate, door, portrait, cross, wild) and tiles: the plate's `read` (300), the stage dithers (200, 180), the `named` flash (240) | `habitat.c` :295, :317 | — |
| **The ring goes for the hold.** The namer's keys (its opening and closing holds) | `namer.c` :77 | — |
| **The ring stays.** The Probe's chrome ring: on `plates` through the `mend` (hold 300) and on `slot` through the `install` (hold 900), with its lift | `bench.c` :159 (fix14 :174), no hold check | `bench.test.mjs` :106, :126 |
| **The ring stays.** Every creature's footprint ring: Habitat's `resident` through the `moment` (300), the asleep moment (300) and the resident `dither` (300); a Home or Vivarium resident or sleeper through any hold (the Vivarium's `back` landing, 180) | `habitat.c` :52 (fix14 :293–:294), `home.c` :438, :490, :492, no hold check | `habitat.test.mjs` :139 "the box, the tag and the ring stay" |

The other screens (Pods, the rail, the Library, Create's shape) have no hold on a ringed state. Create's `grow` holds 1080 but has no ring (`focus.grow` targets {}). Cargo, the Incubator and Idle are room-only.

**Ruled: main wins** (code on main over design documents, and the visible-change freeze). The principle is that the ring stays through a hold that plays on the focused thing in place, where focus will still be when it ends, and goes otherwise. The list below is binding, not the principle.

**Goldens and counts:** none. **Tests:** none change in substance. `rings.mjs` `ringDepartures` keeps its `hold` argument, read as "a hold that drops the ring". Callers pass `hold: true` only in the states rule 6 lists as dropping. `layer-check` passes `false` as today (settled states). **CD:** not needed.

### Spec edits

1. **§6, the "Pressed" row, "The ring" cell.**
   - Old: "no form of its own. It stays while the screen stays. It goes for the length of any event hold (`anim_holding`), as today: the knob's `rest`, Cargo's opening, the namer's opening"
   - New: "no form of its own. It stays while the screen stays. Through an event hold (`anim_holding`) it does what main does (§8 Tests, rule 6): it goes on Home's and Habitat's chrome targets and tiles and in the namer, and it stays on the Probe (mend, install) and on every creature's footprint"
2. **§8 Tests, rule 6, second bullet.**
   - Old: "   - There is no ring during a hold."
   - New: "   - Holds, as on main. **The ring goes** for the length of a hold on Home's chrome targets and tiles (the knob's `rest`), on Habitat's chrome targets and tiles (the plate's `read`, the stage dithers, the `named` flash) and in the namer (its opening and closing). **The ring stays, unchanged in rect and ops hash,** through the Probe's `mend` on `plates` and `install` on `slot` (with its lift), and on every creature's footprint ring through any hold (Habitat's `resident` through the `moment`, the asleep moment and the resident `dither`; a Home or Vivarium resident or sleeper, the Vivarium's `back` landing included). Asserted by `home.test.mjs` :131, `bench.test.mjs` :106 and :126, and `habitat.test.mjs` :139. A hold not listed here takes the rule of its screen's list, and a new kind of hold is UI/UX's to place."
3. **§8 Tests, rule 2.**
   - Old: "There are 0 such pixels when there is no focus region, and 0 when a hold is on."
   - New: "There are 0 such pixels when there is no focus region, and 0 during a hold that rule 6 says drops the ring."
4. **§8 Tests, rule 1** (the architect's 08:12 wording).
   - Old: "`focus` / chrome with n = 1 when the state has a focus target and no hold is on,"
   - New: "`focus` / chrome with n = 1 when the state has a focus target and no hold that drops the ring (rule 6) is on,"

## 3. §5's examples against the face

**Probe `plates` (verified).** §5 writes the plates unlifted, at main's old places: (232, 440, 128, 32) at 3, ring (227, 435, 138, 42). The face is right on both counts:
- FR5 and `bench.json` `focus.targets.plates.lift` 2 lift the plates, as main always did (`bench.test.mjs` :106, `plates.0` at y 438);
- the gate's places are fix 5 P3's (`bench.json` `regions.plates.places`: tier 1 at 272, 320, 368; tier 2 at 248, 296, 344, 392, y 440).

So the drawn union is (272, 438, 128, 32) at 3 and (248, 438, 176, 32) at 4, and the rings are (267, 433, 138, 42) and (243, 433, 186, 42).
- **FR7 holds:** the switch and slot modules start at x 616, and the right edges are 405 and 429.
- **The stage holds:** y 433 ≥ 40.

**Habitat `species` (not reproduced).** At `cd3163ad`, `habitat.c` :302–:305 passes the box at `regions.speciesLine.rect` x 608, and `focusRing.c` :48 subtracts the chip (4) and the reach (5): x = **599**, y 59, h 34. That is §5's example. I found no 595 in the face, its tools or its tests. If the builder's head draws 595, the chip is applied twice (screen and word). That breaks FR3 ("the text's drawn extent plus 4 px each side"), and the face is fixed, not the spec.

**Ruled: the face stands** (the spec example is corrected) for the Probe. The spec stands for the species. **Goldens and counts:** none. The bench goldens are already among §10's 4 Probe, and `bench` is in the capture list as drawn. **CD:** not needed.

### Spec edits

1. **§5, the Probe `plates` row.**
   - Old: "| Probe | `plates` | the union of the drawn plates: (232, 440, 128, 32) at 3; (208, 440, 176, 32) at 4 | the region box (188, 412, 216, 88) | `{rect: 0}`, box "the drawn plates' union" | (227, 435, 138, 42); (203, 435, 186, 42) | default |"
   - New: "| Probe | `plates` | the union of the drawn plates, lifted 2 (FR5), at fix 5 P3's places (`bench.json` `regions.plates.places`): (272, 438, 128, 32) at 3; (248, 438, 176, 32) at 4 | the region box (188, 412, 216, 88) | `{rect: 0}`, box "the drawn plates' union" | (267, 433, 138, 42); (243, 433, 186, 42) | default |"
2. **§5, the Habitat `species` row.** No change. Optional clarity, Ring cell:
   - Old: "(599, 59, text + mark + 18, 34)"
   - New: "(599, 59, text + mark + 18, 34): the line's x 608 − chip 4 − reach 5"

## Messages to builder 4

**F2 (floor).**
> F2 changes rule: gate on (a) 3:1 pixels ≥ 2 × visible cross-sections and (b) every cross-section ≥ 1 px at 3:1; drop `FLOOR_STRICT`, print "k of c under 2 px, longest run r".
> Run it on the nine F2 states at `cd3163ad`; if any fails (a) or (b), report state, point and ground values to UI/UX, and do not touch the weight or the rule.
> No golden, pixel or §10 count moves; spec edits in `specs/station-fix14-rulings-3.md` §1.

**Rule 6 (holds).**
> Main wins: keep the code as it is at `cd3163ad` (ring off for holds on Home/Habitat chrome, tiles and the namer; on through the Probe's mend/install and every creature footprint).
> Read `ringDepartures`' `hold` as "a hold that drops the ring" and pass true only in rule 6's dropping states; no other test changes.
> No golden, pixel or §10 count moves; wording in station-fix14-rulings-3 §2.

**§5 (examples).**
> The face stands for the Probe: the spec now says (267, 433, 138, 42) at 3 and (243, 433, 186, 42) at 4, lifted at fix 5's places; assert those.
> Species: the face's code gives x 599 (608 − 4 − 5), which matches §5; if your head draws 595 the chip is applied twice, so fix the face.
> No golden, pixel or §10 count moves; edits in station-fix14-rulings-3 §3.

Signed: UI/UX, 18:50 (America/Mexico_City), Thu 2026-10-15
