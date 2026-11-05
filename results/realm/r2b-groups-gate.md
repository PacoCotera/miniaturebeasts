**SIGNED.** All nine checks pass. The worktree is clean at 1050ae05b, and I reverted every break.

1. **Version 1 unchanged.**
   - My digest covered `slotBiome` for 200 seeds × 25 slots, with `biomeV` 1 and with no version.
   - It is `38b7f9b742aa500c` on both origin/station-gate and the branch.

2. **Version 2.**
   - Green per ring over seeds 1–200 is 54.8 / 46.4 / 51.1 against 55 / 46 / 51, so within 3 points.
   - I broke the cache in `realmSlots` so it returned the first seed's slots for every seed. The cache-free test, the order-independence test and the many-calls test all failed, along with 7b, 7b2 and 7c. They are still meaningful.
   - I checked the code: the group is drawn equally among the allowed groups, then the kind by rarity inside it.

3. **Names.**
   - `BIOME_NAME` is exactly Meadows, Woods, Cliffs, Marsh, Hills, Thickets, Tallwood, Highpools, Lakes. Code ids are unchanged.
   - The only readers are `regionName` and the tests. The remaining "Fells", "Downs", "Meres" and "Tarns" hits are comments, generator-internal wording and test titles.

4. **Generator.**
   - My digest of the woods, fells, marsh, mixed, downs and meres worlds over 200 seeds (0–199) is identical on origin/station-gate and the branch. I included downs and meres too.
   - Tarns rock is 49.1% of walkable cells, with fewest walkable 271. Thickets (279) and Tallwood (262) also hold `WALK_MIN` 260.
   - `attempt` is below 8 on every seed for all three, so none fell back. `g2Check` is not exported, so I inferred it from that: a world only comes back if it passed `g2Check`.

5. **`mapkinds.mjs`.**
   - I built the map for 6 old kinds and downs and meres, seeds 1, 7 and 23, on both trees. The woken maps are identical (hashes) for all of them.
   - The only change in the page's fog table is index 19, lime: 9→6 (paper→fog). So asleep maps differ only on woken-lime pixels.
   - The palette JSON diff is the same single entry. The atlas core-entries check passes in `atlas-check`.
   - Thickets, Tallwood and Tarns maps do change, as intended.

6. **Goldens.** None changed. The diff touches no golden or json test file, only `regions.test.mjs` and `fog-tables.test.mjs`.

7. **Gate.** One failure, in the first pass; none of it is in the current tree.
   ```
   TOTAL 561s; 168 jobs, 0 failed; logs /tmp/gate-5WGfYJ
   ```
   - The gate left nothing in `prototypes/station/img`, so `git checkout` updated 0 paths and there was nothing to remove.
   - I started the gate in the background and polled for the TOTAL line. I did not end my turn while it ran.
   - The merge onto the current origin/station-gate is clean (`git merge-tree` exit 0).

8. **Public guard.**
   ```
   public guard ok
   exit=0
   ```

9. **Breaks.**
   - **Weight the draw by kind count again:** `regions.test.mjs` 7b2 fails with `ring 2 Green 73.0 %`.
   - **A version 1 realm takes the new draw:** `regions.test.mjs` 7e fails (the frozen `regions-v1-slots.json` digest). Test 7 (the four slots around region 1, over 200 seeds) fails as well.
   - **Fog lime to paper again:** `fog-tables.test.mjs` fails on the sprout-and-lime fog test. `atlas-check` still passes, so it would not catch this on its own.

Merged as 6c42717b6.
