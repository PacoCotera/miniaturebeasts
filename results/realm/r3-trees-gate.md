**SIGNED.** I found no defects on any of the ten checks. One thing to know is that trees only reach generator 4 worlds, and `NEW_GEN` is 3, so nothing in the live page shows them yet. That matches the lead ruling.

1. **Generators 1–3 untouched.** I hashed 200 worlds per old generator with every place layout and feature. For generator 3 I used three region kinds, so 600 worlds.
   - Base `origin/station-gate` and branch gave identical digests: `{"1":"dbd5e4068c5ff0c8","2":"4ae3afdc3d8ffad6","3":"c7c22dfd6b03578a"}`.
2. **Tree rule.**
   - The kind comes from `hash(seed,'tree',lay.key,i) % 6` and the region's kind list. `trees.test` test 2 (seed-fixed) passes.
   - Maps: I hashed the map pixels of base and branch for generators 1–4, seeds 3, 4, 9, 12 and 31. Everything is identical except the generator 4 Woods maps, where hollow trunks and the teal Shade are meant to change. That includes generator 4 Meadows (region 1) and Hills, which are pixel-identical.
3. **Fruit tree.** `trees.test` tests 4, 5 and 6 pass: it is a `b` feature using `shakeBush`, bare until `{ripe:1}`, a shake drops one fruit and leaves it bare, and a bloom ripens exactly the trees within 3 cells. The saved `ripe` state goes through the page's feature-state store (`setFS` on `S.cells`), which the old-save test also reads.
4. **Hollow trunk.** The new stop-beside-and-go-in-next-tick rule only applies when the target has `tree` set. I put a shy one beside an ordinary hole on 5 worlds (generators 3 and 4), at distance 1 and at distance 2 or more, on base and on the branch. The step-by-step traces are byte-identical.
   - Distance 1: the shy one goes in and hides.
   - Distance 2 or more: it wanders and never hides, on both base and branch. I did not look into why.
   - The hollow-trunk hide test passes on the branch.
5. **Shade place.**
   - `REMAP_SHADE` carries `SHADE_WASH` with id 11, and `REMAP_PLACE` is untouched at id 1. `treeSig` adds `|m` only when `lay.shade` is set.
   - Moss is applied only under `if (lay.shade)`. Tile keys change only where a tree or the Shade is present. `trees.test` test 8 passes.
6. **Old save with walked places.** I loaded `old-save-walked.json` on both base and branch. All 4 walked layouts match the fixture's tiles and non-tree features, the 81-character cell state is the same, and the generator is 4. The old-save test passes: the bush is still bare and the slab is where it was pushed. The branch only adds tree features with new ids.
7. **Goldens.** Of the 6 files changed, none is a golden, and the tests, fixtures and digests were not touched. Confirmed.
8. **Full gate.** Lines verbatim:
   - `public-guard                 rc=0    0s | public guard ok`
   - `vivarium: ok: 5 log(s), 61 tests ran, 0 skipped by the file itself`
   - `TOTAL 519s; 169 jobs, 0 failed; logs /tmp/gate-nNZjV6`
   - Nothing needed a re-run. `git checkout prototypes/station/img` updated 0 paths, `git status` is clean, and no pictures were left.
9. **Public guard.** `public guard ok`, `exit=0`.
10. **Three deliberate breaks.** Each was reverted, and `git status` was clean after each.
    - **Tree kind depends on visit order** (a global counter added into the hash): `trees.test` test 2, "the kinds are seed-fixed", fails.
    - **A generator 3 world takes trees** (`< 4` changed to `< 3`): `trees.test` test 3, "generators 1 to 3 are untouched", fails. The full exploration run (481 tests) also fails the vector test, "a new world writes gen 3, and its world and first place match generator 3's vectors". My digests would catch it too.
    - **Drop the `|m` cache key:** `trees.test` test 8, the Shade place test (its cache-key assertion), fails.

My digest and trace scripts are scratch files in `/tmp/mb-run-realm-r3-gate`.

Merged as 744a3da3f.
