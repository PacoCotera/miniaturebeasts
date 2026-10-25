# Library 5 gate (architect, 2026-10-24 20:00 Mexico City), 11c31548

T-20261023-293, build/library-family 11c31548 (dbcce5a6 AD4-3, 46d90f47 Level 3 far, 11c31548 follow-ups) on station-gate ffb1fd37. One gate for code and goldens.

## Verdict
**One short fix round, then merge.** The screen, the kit rule, the ways in, the selectors, the pictures, the goldens, golden-neutrality and every check hold; the merge is a fast-forward (merge-tree tree 9a8432b9 = 11c31548's tree). Two small defects (F1, F2).

## Fix lines
- **F1. crossDepth keys on the shed origin, not on `m.parents`.** station/src/lineage.mjs:28–32. A shed child recorded as the game designer ruled (`parents [X, X]`, `from.how "shed"`) counts +1 today (Thistle measured 2 instead of Ivy's 1). Body:
  ```js
  if (!m || seen.has(m.id)) return 0; seen.add(m.id);
  const ps = parentsOf(st, m); if (!ps.length) return 0;
  if (m.genome?.origin?.kind === "shed") return crossDepth(st, mibiById(st, ps[0]), new Set(seen));
  return 1 + Math.max(0, ...ps.map((id) => crossDepth(st, mibiById(st, id), new Set(seen))));
  ```
  Fixture depths unchanged. Test (lineage.test.mjs): Thistle with parents [Ivy, Ivy] and from.how "shed": crossDepth = Ivy's, generation = Ivy's + 1, one link from Ivy, lineKey = Ivy's.
- **F2. Level 3's pictures supersede, as Level 2's sheets do (292-P4).** station/src/pictures.mjs: beside `SHEET_IDS` (:26) add `const LINEAGE_IDS = {};`; at :192 after `if (hasAsset(r.id)) break;` add `const old = LINEAGE_IDS[r.kind]; if (old && old !== r.id) { dropAsset(old); DROPPED.push(old); } LINEAGE_IDS[r.kind] = r.id;`. Test (library-pictures.test.mjs): two `lineagefar` requests with different digests drop the first; the same id twice drops nothing; same for `lineagemini`.
- **Proof:** node --test 0 failures; goldens --check with no golden moving; face guard; public guard after committing.

## Rulings
1. The card's `family` target in its own group `family`: confirmed (the graph is keyed by group). UI/UX corrects its line to group `family`.
2. Empty subject on ✓ See the family: accepted; question for UI/UX and the copywriter whether it carries one.
3. syMin refuses only on the rows' own fit (from 18 rows): confirmed. Question for UI/UX before T-294 draws the mini: wide shallow trees put mini rows 4.5–5.3 px apart and sx 16–21 puts mini siblings 3–4 px apart for 4 px dots; one option sy = min(max(round(1.5·sx), 30), rowsFit).
4. Mini scale: kx = s·(sx/2)/48 (sx per sibling step, as the mock); measured: a CLOSE sibling maps to 9.04 mini px = a FAR sibling at s. ky = s·sy/120 stands; UI/UX's line is corrected.
5. Released dots fade by `faces.faded`: confirmed.
6. A new founder goes right of every node in its block: confirmed. (A cross joining two blocks re-places the later family inside the earlier block: the one event that moves placed nodes, from the ticket's block rule.)
7. The host answers every selector, with the ring's own node where it has none: confirmed. Carried kit line: a selector with no answer yields nothing and the next entry is tried.
8. A `line:` key counts toward a species only when all its founders are in the save and of that species: confirmed.
9. CLOSE sent as notBuilt with this level's bar and line: confirmed; T-294 owns `l3.close`; the saved camera becomes an offset from its node in T-294.
10. The one-family fixture (8 siblings, 776 px > 744 view) is a reachable state: confirmed.
11. journey-vivarium.json +51 lines (three steps from the species ▼ family edge): confirmed.
12. Node records outside Level 3: the 12 Level 2 states differ by the 8 zero-size family.4–7 nodes moved y +8 (AD4-3's pitch); no pixel or target moved: accepted.

**Carried:** W2 the lineage walks are exponential (31/50/195 ms at 12/14/16 generations; momentsEarned 47/98/407 ms): memoise per call before T-294 or the Pi. W3 lineage size: focus arrays hold 64 targets, props budget 32,768 B (~170 nodes): T-294 names the cap and tests 65; game-design question whether a lineage is bounded. Kit: the picture-box focus loop becomes a v_* helper before T-294. Type pass: habitat.c's px-form text count is 5 after this merge; familyBuild's subject fit becomes measureRole in the type pass. Nit: the 180 ms zoom dither moves into spec events when next touched.

## Checked
Diff ffb1fd37..11c31548 (47 files) read whole. Own build: face_test 15249/0; layout 732/0; node --test 1780/0 (1 skip); journeys ok; face guard (344 files); layer-check; goldens every screen (library-l3-far 02a8740c, -one-family fbf798e5); checks; place-masters 1054/0; library-times; public guard exit 0. Ratchet library_family 0, 0 px-form text calls. Generator lineage-far 21.5 ms, mini 0.8 ms. Zoom dither = whole stage for 10 frames, then 0. Type log 44/44 identical.

## For the art director at 1x (sign)
library-l3-far, library-l3-far-one-family; the remade review shot library-l2-review-full (second Families row at Y_F + 130). The neutral open ring shows in no golden (every fixture mibi has read its Coat).
