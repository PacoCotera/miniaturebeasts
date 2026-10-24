# K5.1 gate (architect, 2026-10-23 22:37 Mexico City), e55c9292

T-20261023-286, build/ui-kit 731f660f..e55c9292 (3 commits on 411ac310). Ruling: results/kit/k6-gate.md §4 "K5.1 must carry these lines". UI/UX's one-line confirmation (results/kit/uiux-stamp-leaves.md Q2: "Yes") was given, so the full leaves line applies.

**Verdict: PASS. Merge e55c9292.** There are no fix lines. The items left over are follow-ups (section 4), and none of them blocks the merge.

## 1. What I measured

I used my own detached worktree at arch-k51/W, with a private FACE_BUILD_DIR and TMPDIR under arch-k51, and two `git archive` copies (411ac310 and e55c9292) for the instrumented builds. All of it is removed afterwards (section 6).

- **`build.sh all`:**

  | | 411ac310 | e55c9292 |
  | --- | --- | --- |
  | layout cases, differ | 775, 0 | 732, 0 |
  | face_test checks, failed | 15223, 0 | 15129, 0 |
  | native hash | 47e09df8 | 47e09df8 |

  - The after side has 0 warnings in the build log.
  - face_test has 94 fewer checks: 43 leafArc layout cases + 3 leafArc refusal checks + 48 metrics strings (6 + 42) removed.
- **Layout vectors in both implementations:**
  - C (face_test): 732 cases, 0 differ.
  - JS: `make-layout-vectors.mjs --check` gives "current: 732 cases", and layout.test.mjs "the committed layout vectors are what derive.mjs gives today" passes.
  - layout.json loses exactly the 43 leafArc lines and nothing else.
  - `make-metrics-vectors.mjs --check` is current (12231 cases).
- **Node records:** I captured them on all golden states from an instrumented copy of each side (kit-proof instr.py, the builder's nodes.mjs and setcmp.mjs with an empty map).
  - Base against after: 181 states, 15767 nodes, **0 differ as sets** (10 differ in order).
  - Sized nodes: 11569 on each side.
  - Against the builder's captures, mine are also 0 as sets: base1 against my after, and my base against after1.
  - The order differences (10 and 13) are capture order, as at K6.
- **Goldens `--check` at e55c9292:** all 10 screens match.
- **Station journey, each side with its own private STATION_CHECKS file:**
  - "journey ok" on both sides.
  - layer-check output (191 lines) is **byte-identical**, whole and not stripped.
  - checks.mjs output (95 lines) is **byte-identical**, whole and not stripped.
  - Type log (tlcmp): **44 shots, 0 differ**.
  - Region sets: 1 shot of 44 differs: page-meet, where the resident is at y 72 on one side and 73 on the other. It is capture timing, not K5.1:
    - A second base run differs from the first base run in that same shot, and in pods-identifying.
    - The second base run matches the after run on page-meet.
    - The node records (held clock) are equal as sets.
- **Props records:** the K10 recorder, run in the worktree on each side.
  - 21 files, 13186 records, **0 differ**, every file byte-identical.
  - Every test file reported fail 0 on both sides.
- **focus.json:**
  - `make-spec-focus-vectors --check` says "not current" at 411ac310 and at e55c9292 alike.
  - Regenerated on each side (153 cases, 210 in all), the two outputs are byte-identical.
  - So the namer reader's move is neutral, and the stale file was already stale at the base, not a K5.1 effect.
- **`node --test` at e55c9292:**
  - face: 589 tests, 589 pass.
  - The rest (roadmap, ui, station, exploration, caddy, workbench framework, genome-stamp bins): 1026 tests, 1025 pass, 0 fail, 1 skipped.
  - Total 1615, 0 failures.
- **Guards:**
  - Face guard ok (75 removed paths, 318 files, 0 failures).
  - Public guard ok, `--base origin/station-gate`. It ran against a9e24215, which station-gate reached during the gate (section 3).
  - place-masters `--check`: 1006 placed, 0 problems.
- **Spec files, checked by parsing (my keydiff over the 8 changed specs):**
  - The specs change by removed keys only. No key is added and no value changes.
  - 47 keys go whose parent stays. That is the 46 ruled keys and incubator regions.leaves:

    | Spec | Keys removed |
    | --- | --- |
    | namer | 3 |
    | home | pods.slots 2, nameTag 4 |
    | habitat | cross.faces 5, nameTag 4 |
    | cargo | find 3, leaving 2, probe 2, fit.w 1 |
    | bench | meaning.plates at/pitch 2, adds pods/plates at/pitch 4 |
    | frame | panel.cards 5, strip.cards 5 |
    | vivarium | nameTag 4 |
    | incubator | regions.leaves 1 |

  - The builder's "34 keys" leaves out the 12 nameTag keys. Its commit message lists them, so this is a slip in the report, not in the tree.
- **The whole diff, read file by file:** 25 files, +92 −616.
  - Commit order is as ruled:
    - 731f660f moves the readers and adds the band-box assertions, and touches no spec.
    - 7789d0d8 removes the keys and rewrites tiles.test.mjs.
    - e55c9292 removes the leaves.
  - The band-box assertions land in commit 1, before tiles.test.mjs loses its old probe arithmetic in commit 2, as ruled.
- **Commits:** author and committer are both Paco Cotera <paco@cotera.org>, with no trailers. The chain is linear on 411ac310, whose tree is 80068625's (6457a60d).
- **Leftover leaves (grep over specs, face, station and ui):**
  - None left: leafArc keys, layout_leaf_arc, LAYOUT_LEAVES, a `"component": "leaves"` region, or leaves geometry.
  - What is left:
    - six closedList strings (Q3);
    - create.json:19, a provenance note (Q2);
    - two status strings, create.json:6 and incubator.json:5 (section 4);
    - specs.test.mjs:183 and WORDS (Q4);
    - absence checks that assert leaves are not drawn (create-regions, incubator-regions, incubator.test, create-props.test, journey);
    - the leaf pictures, which are the art director's to remove.
  - The face README has no leaves passage left.

## 2. Review: defects

- **No code defects found.** Each moved reader is equivalent to the arithmetic it replaces:
  - The bench forms are absolute: 776 = 624 + 152 and 824 = 624 + 200. `up()` subtracts the module's lift, as `m` did before.
  - The namer's keys use listPitch(K, 28, i) on forms.grid.
  - The nameTag readers use `.plate`.
  - The strip and panel cards use listPitch.
  - The Habitat cross-faces check rebuilds the rows from the forms.
  - The node records and props records confirm this.
- **One stale sentence the branch made false (not blocking):** incubator.json:5's status still says "(the leaf arc's layout rule and its vectors stay, with their data under regions.leaves, which is no longer drawn)". After e55c9292 none of that stays.
  - It is prose in a status field, and spec strings feed metrics.json, so changing it needs a metrics regeneration.
  - It goes to the docs pass (section 4) rather than a fix round.

## 3. Merges: both clean

- **With origin/station-gate:**
  - ae0afe65: `git merge-tree --write-tree ae0afe65 e55c9292` gives 45202ddc, exit 0.
  - station-gate moved during the gate to a9e24215 (one commit, design/devices.md only). `merge-tree a9e24215 e55c9292` gives ef1d20a5, exit 0.
  - K5.1 and station-gate since 411ac310 share no file.
- **With build/kit-rules db7ac61b (K7):** `git merge-tree --write-tree db7ac61b e55c9292` gives 87af5f21, exit 0. The two branches share two files:
  - **prototypes/face/README.md:** K5.1 changes the status paragraph, the Cargo/Create paragraph and the create.c row. K7 changes the vocab and guard rows.
    - In the merged README both sets of changes are present: e55c9292 → merged changes K7's 2 rows only.
    - No leafArc or leaves passage remains.
  - **prototypes/face/src/test/face_test.c:** disjoint hunks. K5.1 is at 207–221 in layout_vectors; K7 is at 427 in kit_words.
  - No semantic collision: neither merged tree has a reader of any removed key or of layout_leaf_arc, LAYOUT_LEAVES or leafArc (grep over prototypes; the hits are form names, metrics strings and the closedList quotes).

## 4. Rulings

### The builder's four questions

- **(1) "adds.* at/pitch/icon" means adds.pods and adds.plates only: accepted.**
  - adds.reach and adds.deep are single objects with at and size. They are not lists and have no forms, so the duplicated-key line has nothing to remove there.
- **(2) create.json:19 `"leaves": "retired by fix 6 …"` is kept: accepted, permanently.**
  - It sits in Create's provenance log (beside "pod", "chamber", "dome" and "code", each a dated ruling). It is the record of the retirement, not a key with geometry.
  - The ruled line covers leaves keys no reader is left for, meaning geometry. No follow-up.
- **(3) The closedList strings in six specs still name leafArc (bench, create, habitat, namer, sitting, vivarium): kept in K5.1, which is right.** They quote station-layouts.md, and the quote must follow its source.
  - Follow-up for **a later docs pass**:
    - Remove leafArc from station-layouts.md's closed list of derived rules (and the leaves word from its closed vocabulary).
    - Remove the leafArc and leaves passages from design/proposals/lvgl-switch.md (lines 95, 120, 121, 246, 391, 395).
    - Then the six closedList quotes follow.
    - With them go incubator.json:5's status sentence (section 2) and create.json:6's status "the leaves word, grid form, with the small leaf".
    - Then regenerate metrics.json (make-metrics-vectors).
- **(4) Three small leftovers:**
  - specs.test.mjs:183's comment ("leaves and leafArc: architect, 2026-10-09") and WORDS' "leaves" quote station-layouts.md's closed vocabulary, so they go **with the docs pass** in the same commit as station-layouts.md.
  - make-layout-vectors.mjs:11 still loads incubator.json, but no case uses it now, so the load is dead. **K5.2** removes "incubator" from that list; it is a face tool, and the vectors are unchanged.

### The keys kept

Each kept key is held equal to its form by tiles.test.mjs today, so the duplicates cannot drift before the follow-up.

- **Home companion.plates size/gap/at: the keep is accepted.**
  - Two readers were missed by the ruling, not one:
    - face/tools/home-regions.mjs:39, the region box;
    - ui/tests/specs.test.mjs:551, the H3 assertion that the plates are [12, 24], gap 4, at [12, 64], "each ruled in build spec section 14".
  - Keeping the keys instead of moving an unruled reader was the right call for a ruled ticket.
  - Follow-up for **K5.2**:
    - home-regions.mjs:39 takes the box from listPitch(companion.plates, max, 0) and listPitch(…, max − 1).
    - specs.test.mjs:551 asserts forms.row (first [.., .., 12, 24], pitch [16, 0]) in place of size, gap and at.
    - Then the three keys go, and with them tiles.test.mjs's companion equality case.
- **Bench meaning.plates icon, adds.pods icon and adds.plates icon: the keep is correct.**
  - station/src/views/bench-props.mjs:29 and :31 read them as the placeholder pictures' size. That file is a view, and K5.1 may touch no view.
  - Follow-up for **K5.2**, which may touch views:
    - bench-props.mjs takes the size from the form (forms.row.first.slice(2)).
    - Then the three icon keys go, and with them tiles.test.mjs's bench equalities.
- **band.probe size: kept as ruled** (cargo-props.mjs:114, a view).
  - Follow-up for **K5.2**, in the same line as the bench icons: cargo-props.mjs:114 reads band.probe.forms.row.first.slice(2), then size goes.
  - from, mend and words stay.

**K5.2, if the lead opens it:** "K5.2: home-regions.mjs:39 and specs.test.mjs:551 read companion.plates' form; bench-props.mjs:29, :31 and cargo-props.mjs:114 read the icon size from the forms; then companion.plates size/gap/at, the bench's three icon keys and band.probe size go; make-layout-vectors drops the incubator load. Golden-neutral, with the K5.1 proof lines (node records as sets, props records, layout vectors in both implementations, checks.mjs and layer-check, node --test, both guards)."

None of these items is for the Library tickets.

## 5. Aside (not K5.1)

- tests/vectors/focus.json is not current at 411ac310 or at e55c9292: `make-spec-focus-vectors --check` lists all eight screens.
  - Regenerated, it has 153 cases (210 in all), and both sides give the same output.
  - The face tests do not fail on it.
  - It needs its own small chore: regenerate, then read the diff to find which spec changed without a regeneration.

## 6. Cleanup

- The worktree arch-k51/W is removed and pruned.
- The two archive copies, the build directories (fb, kb-base, kb-after), the private TMPDIR (and the bake directories in it), the journey records, the node captures and the props records are removed.
- I created no /tmp/bake-* directory.
- The clone is unchanged: build/ui-kit at e55c9292, clean. The builder's scratch (k51/) was only read.
