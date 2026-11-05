**SIGNED** at head 94d165c1f. One gap is worth a follow-up but doesn't block: no test checks that `newRealm` writes `biomeV: 2` (check 8, break 4). The worktree is clean after the gate and the breaks.

**1. Old worlds unchanged: pass.**
- `BIOME_GROUND.mixed` is null.
- I wrote my own digest script and ran it against origin/station-gate (932ed677, extracted with `git archive`) and against the branch. It hashed the full JSON of `genWorld(s, 4, b)` for seeds 0–199 and `genWorld(s, 3)`. All five digests are identical on both sides:
  - `mixed` ec094eb5…
  - `woods` 00cd90be…
  - `fells` 5d4f28db…
  - `marsh` bdd98001…
  - gen 3 097daa7c…
- The committed `world-r1-old-kinds.json` uses a different hash format, so I didn't compare against it. Break 1 below confirms the test itself catches a change.

**2. Shares over seeds 0–199, taken by my own script: all match the report.** Shares are percent of reachable cells.

| Kind | Share | Fewest walkable cells |
| --- | --- | --- |
| Downs | meadow 66.6, wood 10.9 | 281 |
| Thickets | wood 40.1 | 279 |
| Tallwood | wood 51.4 | 262 |
| Tarns | rock 35.7 | 271 |
| Meres | pond 30.9 + water 1.4 = 32.3 | 260 |

- No fallbacks: every world has `attempt < 8`.
- The generator only returns a non-fallback world after `g2Check` passes and walkable cells reach 260.
- `world-r1.test`, `regions.test` and `fog-tables.test` pass (37 of 37).

**3. Realm version: pass.**
- I compared the base `slotBiome(seed, x, y)` with the branch's `slotBiome(seed, x, y, biomeVersion({v:9, regions:[]}))` over seeds -5 to 1999 and all 25 slots. That is 50,125 slots with 0 differences. Version 2 differs on 34,495 of them, so the version switch does something.
- `serialize` copies top-level keys, so `biomeV` survives a save.
- `migrate8` never writes `biomeV`, so a v8 save and a v9 save without the key both read as version 1. `realmStatus` returns "newer" for `biomeV` above 2.
- `slotBiome` has no caller in the page yet. Opening slots is R2's, so slot kinds were only checked at module level.
- The `realm-run` change only deletes `biomeV` from the compared copy. The fixture is a v8 save with no such key, so nothing else is hidden.
- `newRealm` is the only code that writes `biomeV: 2`, and no test checks it (see break 4).

**4. Fog change 1: pass.**
- The page sets `FOGLUT[C.sprout] = C.fog`, which is index 6. The meadow palette's sprout `fog` entry went from 19 to 6, so the two agree. Only that one palette file changed.
- `fog-tables.test` checks that the page table equals an independently built mix with only sprout moved, and that the palette says the same.
- The Shade wash is tested against an independent copy of the rule, over the core 48 colours and over all 100 after `atlasInstall`.
- `SHADE_WASH` appears only at its build site, `index.html` lines 2528–2531. The test also asserts `REMAP[3] === FOGLUT` and `REMAP_PLACE[3] === PLACE_FOG`.
- The atlas core-entries check holds: the full gate ran it and `masters: 1827 placed, 0 problems` passed.

**5. Goldens: none changed.** The diff has no golden or png files, and nothing is modified after the gate.

**6. Full gate, run in the foreground.**
- The gate printed: `goldens:pods                 rc=1   61s | FAIL read, Tuikis, Shape in hand: d8aa45d8, golden 349c9d04`
- Its last line was `TOTAL 434s; 164 jobs, 1 failed; logs /tmp/gate-LYpVYw`.
- The pods golden failed under load. Re-run alone, `node prototypes/face/tools/goldens.mjs --check pods` printed `pods: goldens match` with exit 0.
- That golden is on the station face side, which this branch doesn't touch, so I treat it as a timing flake under load.
- Other lines of note:
  - `station-journey rc=0 232s | journey ok`
  - `play-journey rc=0 348s | play journey ok`
  - `layer-check rc=0 410s | layer check ok`
  - `masters: 1827 placed, 0 problems`
  - `public-guard rc=0 0s | public guard ok`
  - `vivarium: ok: 5 log(s), 61 tests ran, 0 skipped by the file itself`
- `git checkout -- prototypes/station/img` ran afterwards and the worktree is clean.

**7. Public guard.** `node .github/public-guard/guard.mjs --base origin/station-gate` printed `public guard ok` and `exit=0`.

**8. Deliberate breaks, each reverted with `git checkout`.**
1. **Woods row `wood: 200` changed to `201`.** `world-r1.test` test 1 ("the four older kinds' worlds are unchanged byte for byte") failed. The woods digest came out as 16cb1593… against the expected b0f1012f….
2. **`biomeVersion` default changed from 1 to 2.** `regions.test` test "7b. slotBiome by realm version" failed, on `assert.equal(R.biomeVersion({}), 1)` and the version 1 slot checks. Its other 30 tests passed.
3. **`lakeSep` dropped from Tarns.** `world-r1.test` "Tarns: at least 6 tarns" failed with `fewest tarns 0`. The other nine tests passed, including the Tarns rock share.
4. **Extra break: removed `S.biomeV = REALM_BIOME_V` from `newRealm`.**
   - Every test in `tests/*.test.mjs` still passed, so no test checks that `newRealm` writes 2.
   - Worlds from the page would silently stay on version 1 and never draw the new kinds.
   - Suggest a one-line assertion in `realm-run` or `region-turn` that a fresh `newRealm` save has `biomeV === 2`. The wiring is correct today, so this does not block signing.

**Observations, not blocking.**
- `biomeVersion` returns whatever `biomeV` holds, so a string such as "2" would work only through coercion in `version < 2`.
- The "drawn nowhere" check covers only the `REMAP[3]` and `REMAP_PLACE[3]` tables. A grep of `index.html` confirms `SHADE_WASH` has no readers today.
