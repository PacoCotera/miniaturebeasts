# Library 2 gate (architect, 2026-10-24 06:30 Mexico City), 6e969e8a

Ticket T-20261023-290, build/library-l1 6e969e8a on f1a932bc. One commit, Paco Cotera <paco@cotera.org>, no trailers. This gate is also the review: I read the whole diff (64 files).

## Verdict

**PASS. Merge,** with the two-file conflict resolution below. This gate has no fix lines. Five lines are folded forward (F1 to F5): one goes to the art director, one to UI/UX, three to T-292.

## Merge with station-gate

station-gate has moved past 113102c6. It is now **4588db5f** (e5db3859 Play page, 113102c6 Sitting S1, 4588db5f Sitting K-S). `git merge-tree` shows two conflicts. Everything else merges cleanly, including kit-ratchet.json and pictures.mjs.

- `prototypes/ui/tests/specs.test.mjs` (the SHAPES table, one line). Take `"library.json": { cell: { rect: 6 } }` from the branch and `"sitting.json": { card: { rect: 6 } }` from station-gate. The branch's `card: { rect: 0 }` is only its stale base.
- `prototypes/face/tests/vectors/metrics.json` (generated). Take either side, then run `build.sh all` and `node prototypes/face/tools/make-metrics-vectors.mjs`. That writes 11643 cases, and `--check` is current.

I ran a trial merge with exactly this resolution in my scratch worktree. Results:
- build: face_test 15214 checks, 0 failed
- node --test: station+ui 698/698, face 444+161, 0 failures
- face guard: ok
- Station journey: ok
- checks.mjs: layer checks ok
- goldens --check: library, habitat, home and vivarium match

## What I ran (on 6e969e8a, private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS)

- `build.sh all`: face_test 14495 checks, 0 failed; layout 732 cases, 0 differ.
- `node --test`, all three suites: station+ui 686/686, face 444/444 and 161/161. 0 failures.
- Face guard: `guard: 75 removed paths, 322 files read, 0 failures`. Public guard `--base f1a932bc`: ok.
- Ratchet: kit-ratchet.json `"library": 4` → `"library": 0`. A grep of library.c finds 0 direct v_rect/v_text/v_sprite*/prim_node calls.
- `goldens.mjs --check` on every screen: library (the five l1 goldens), home, habitat, vivarium, pods, cargo, create, incubator, bench and idle all match.
- Station journey: `journey ok`. checks.mjs: 1199 region boxes, ink in 138 regions over 25 frames, `layer checks ok`.
- Not re-run: the K10 props-record comparison and the node-record set comparison.
  - The builder's 330 props differences are accounted for by the diff. habitatBuild accounts for 318: the `species` target's `enabled: true` and its line, which follow from the live guide door. lib-seen-save accounts for 12: that test is rewritten.
  - Goldens --check is green on every other screen, which corroborates the node-record claim.

## The five new goldens at 1x (looked at myself)

- **l1-first**: Loika met (libQuiet, dashed stone rule, mist name, pencil study). The other 15 are unmet (libWell, seed). The ring is on the Loika. "Open Loika". The subject is empty (0 new). The readout is "All species".
- **l1-mid**: found, met and unmet are all clearly distinct. The face chip is on the Loika (18 px). The wish star is alone at (130,133) on Tuikis, a found species with no chip. The subject is empty.
- **l1-new**: glints top-right on Untuva and Tuikis only. The Loika is found but has nothing new, so it has no glint. "three new looks", centred.
- **l1-roomkey**: the ring is on Belatz, the last species visited.
- **l1-dither**: the Home → Level 1 midpoint, a clean lattice, the ring on Tuikis.

I see no clipping, no off-grid cells and no text colour breaking the warm-surface rule. The art director still owes the 1x sign that the ticket requires.

## Review findings (none blocking)

- library.c is a proper binding table on kit_stage, kit_tiles, kit_bezel, kit_hairline, v_slot, v_line_at, kit_glint and word_focusRing. Every cell has the same ten nodes in the same order. The glint clock resets through library_hidden and ticks only while a glint shows with motion on. Targets come from the tiles' boxes, not from the props.
- Seen is right.
  - Entering from outside takes `seenNote`, which uses the same shut-chapter rule as `newLooksOf`.
  - Leaving records it with `libRecord` (a union) and saves. Moves inside `library.*` do nothing.
  - The note is dropped on a new world or an adopted save. The `libOpened` call in goScreen is gone.
  - Home re-derives because `libSeen` is in specimen-props' memo signature. All four seen tests are present.
- Nits for T-292:
  - `S.libOpened` is now used only by specimen-props.test.
  - The two hidden hairlines hide in two different ways: the rule passes colour NULL and keeps its box; the lip passes len 0.

## Rulings on the builder's choices

1. **Pods "Open the guide" parked: upheld.** Making the figure a target needs a ring shape and graph edges. That is UI/UX's to rule (kit rule: a look no component draws parks). The re-target to `library` with the door kept shut is the right holding position, and the journey-pending entry names it. **F1 → UI/UX**: rule the figure's shape and edges. T-292 then opens it straight to Level 2.
2. **Asset-policy families: accepted provisionally; flag for the art director.**
   - Proposed as art (palette-exact): `species-mark-S\d{2}-(10|15)` and `wish-mark-12`.
   - Proposed as painted: `library-ground-1024x522`, `library-seed-24x24`, `library-cell-S\d{2}-[0-9a-f]{8}` (the generator's own RGB, like `specimen:`) and `face:\d+:(18|24|40|56|64)(:faded)?`.
   - The layer checks read 0 off-palette on the art layer across the journey.
   - asset-policy.mjs says a new family is the art director's to place. **F2 → art director**: confirm these six families, or move them.
3. **MAX_SRC 8 → 16: accepted.**
   - Face-owned sources are small: a bezel's is (2r+4) × (ti+bi+4), and a ring's is 20×20. Sixteen of them is a few KB, nothing on the Pi.
   - When the table is full, kit_bezel and focusRing already raise `v_error` ("source picture is refused"), so an overflow fails loudly, never silently.
   - The goldens of every other screen are unchanged.
   - The table never evicts, so later screens will grow it again. When that happens it is a measured raise in the same commit, not a contract change.
4. **S01 face windows from the art director's table, the others as labelled stand-ins: accepted, as the ticket says.**
   - The stand-ins are registered as placeholders with their `until`.
   - An elder takes the adult stand (stageKey).
   - Per the ticket, the result must list the 15 species that have no window yet.
5. **Cell recipe numbers taken from the approved render: accepted.**
   - The numbers: radius 54, centre (70,58), nodes ≤ 7, bloom 0.8, pencil 0.95, 4 px exact edge.
   - The harness (`renderCell`, `CELL`) is separate and default-neutral. RECIPE and Home's harness are unchanged, the specimen goldens are green, and Home's goldens match.
   - Note for later: `library-cell-…-{digest}` hashes status, looks and shut chapters but not `CELL`. That is harmless while pictures live only for the session. If the cell numbers ever change, the id gains a recipe version, like `specimen:…:v{RECIPE}`.
6. **Hidden parts: accepted.**
   - The dashed rule uses kit_hairline's own hidden form: its box stays, with no ops and no pixels.
   - The hidden glint is a zero-size v_slot at the glint's centre. Node order and ids are stable.
   - The clean form is a hidden form inside kit_glint itself, so the screen does not stand one in. That is a golden-neutral kit change for a later kit ticket, not this one.
7. **The other gaps.**
   - Ring falls to the first target when the named species is not a target: **accepted**. It is written into library.json `l1.focus.initial`. UI/UX countersigns the wording in T-292.
   - frame.json `library.species` (parent library, back "Library", notBuilt; title mark and title "Library"): **accepted**. It is T-292's screen, shaped as the ticket says.
   - The l1 grid form also carries kit_tiles' `first/pitch/grid/upTo`: **accepted**. specs.test.mjs:671 asserts that they equal cols, rows, cell, gap and origin, so the two cannot drift.
   - No `l1.focus.vectors`: **accepted for now**. face/tests/library.test.mjs plays the moves against ui/focus.mjs on the real targets. **F3 → T-292**: UI/UX authors `l1.focus.vectors`, including the gaps over unmet cells, so focus.c and focus.mjs are both held to them.
   - `face:{mibi}:{size}` without stage or looks: **a latent defect, folded forward, not blocking.**
     - The request draws the mibi's *current* stage (`S.mibiStage`), but the id does not name the stage.
     - A juvenile may sit (sitting.mjs:100), and the portrait keeps that stage forever (:153).
     - So a portrayed juvenile that grows during a session keeps the juvenile face from the in-session cache, while a reload draws the adult face. The same id would then have two sets of bytes.
     - It cannot happen in play today: the Sitting door is shut, so no portrait is delivered. **F4 → T-292** (which uses every face size): `stage: fm.portrait?.stage ?? S.mibiStage(st, fm, settings)` in library-props.mjs's face request, so the face is the portrait's stage and the id names its bytes. Add a test: a juvenile-portrait mibi grown adult gives the same face bytes. If the art director wants the current stage instead, the id gains the stage, and that id is UI/UX's to amend. Either way, an id names everything that sets its bytes.

## Render time on the Pi 4: needs a line

- **Per cell**, a found cell at 150–410 ms is acceptable. I measured 578 ms under parallel test load. A met cell takes about 40 ms, and a face 9–60 ms.
- **For the screen**, it is not acceptable as built.
  - The host sends the props only once every picture they name is made (screenProps `ids`), so a cold open renders every found cell first.
  - A Cortex-A72 runs this JS roughly 3–4× slower than the dev machine. That puts a found cell at about 0.5–1.6 s.
  - A mid-game cold open (6 found) would stall about 3–10 s. A late game (16 found) would stall about 8–25 s. That happens on the first Library visit after every boot and after every new look.
  - Home's specimen gets away with 1+ s because the discovery's reveal covers it. Level 1 has no such cover.
- **F5 → T-292 (or its own small ticket before the Pi build):**
  - Level 1's cold open, 16 found and no cell made, reaches its first frame within 1 s on a Pi 4.
  - A cell picture not yet made draws its quiet ground and is swapped in when made. Alternatively, cells are rendered ahead at each discovery, off the critical path.
  - The tool prints the total cold-open time next to the per-cell times, measured on a Pi 4.

## Cleanup

My scratch worktree (arch-lib2, including the trial merge), FACE_BUILD_DIR, TMPDIR and STATION_CHECKS copies are removed and the worktree is pruned. No /tmp/bake-* was touched.
