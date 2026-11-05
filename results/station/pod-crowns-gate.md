**SIGNED** for head 861d88b09. The checks below all pass; the gaps are listed at the end.

**1. Masters: pass.**
- I checked the 482 manifest entries against the worktree with a script: 126 replace, 356 new, 0 problems.
- Each replaced file's hash at origin/station-gate equals the manifest's `replaces`. Each new file is absent at origin/station-gate. Every file hash matches `sha256`, and every PNG's size matches the manifest.
- `index.json` has 1471 entries at the base and 1827 now: 356 added, 126 changed, none removed. Every change is a manifest id, and no size changed.
- `place-masters.mjs --check` prints `masters: 1827 placed, 0 problems`, exit 0.

**2. Pairs: pass.**
- `pod.second` is set explicitly for S01–S16 and every value matches the AD table.
- The seven that change are S08 butter, S09 butter, S10 peach, S12 ice, S13 jade, S15 raspberry and S16 ice. Only those seven frames changed, each in its second colour pair.
- The roster diff has nothing else apart from `pod:` additions. The Peplos genome lines are untouched context.

**3. Renderer: pass.**
- `composeCrown` uses `composePod({shade, body: clear, accent: mask}, B, B)`, so rgb = B × mask × shade × 2 and alpha = shade. It lays the glow over that, then lays the whole over the pod.
- With a null clan there is no crown, so the unknown pod gets none. `podpart` (cap id `pod-opened-cap-crown-<CNN>`), `podicon` and the shelf class follow through `podFromLayers`.
- The rack layers and fills follow home.json and podmasters.mjs: five crown layers in the AD's order, fills B, lighter(B), darker(B), darkest(A) and the glow chip. `FILL` gains `lighter(B)` and `darker(B)`, and crown layers are not clipped to the body.
- The lead's rulings are in: glint at [14,8] and collection centre at [96,84].
- Tests: `podmasters.test` now covers the rack crown (S01–S16 plus unknown) and a new composed-crown test. The composed-crown test uses C01/C03/C20 across six classes.

**4. Goldens: pass.**
- 101 golden PNGs changed, all the same size, and I decoded each old against new. Only the 6 `golden/*/*.json` indexes are not PNGs.
- Every diff sits in small boxes at pod positions. These are the Cargo wells and rack, the Create pod and dome, the Incubator capsule and panel pods, Home slots and capsule, Library icons, and Pods inventory cards, compare and identify.
- The header-row diffs are the price row at x 392–504, y 48–72 in create-confirm*, and the same row at x 464–504 in incubator-panel*.
- I also looked at `pods-inventory-twelve-pods` and `incubator-panel-wait`; the crowns read well.
- No other golden changed, and the gate's golden tests pass.

**5. L5b: pass.**
- `create-L5-4` now carries `"fixed": "price run inset 8"`, with `expect: []` and the old finding moved to `clear`. That is the same form as the other fixed owner cards. The test now expects four fixed faults.
- The `create-confirm-keep` fixture shows the price pod icon at x 482, width 16, so its right edge is 498. `panelRoom` is x 24, width 474, so its right edge is also 498: 0 px, down from 4.
- Moving the Wait caption 4 px with it does not matter. The caption now ends at x 1000, which is the Wait window's right edge, mirroring Hatch now's price. `panel.json` and `panel.test` were updated to match. It shows up only as the extra box at x 832–1000 in the incubator-panel goldens.
- Two small `layout-cases.json` edits go with the new pictures. The panelPrice L11 measure goes from 17 to 18 because the crowned icon is a row taller. The L4 node `waiting.pod` becomes `waiting.pod#3`, which matches its own "over the third pod" text. I did not trace why the node name changed.

**6. Full gate: pass, in the foreground.**
```
public-guard                 rc=0    1s | public guard ok
vivarium: ok: 1 log(s), 61 tests ran, 0 skipped by the file itself, 61 new (ran in every shard)
TOTAL 520s; 158 jobs, 0 failed; logs /tmp/gate-NxygI2
```
- The other tail lines: `play-journey ... play journey ok`, `layer-check ... layer check ok`, `face-guard ... guard ok`, `station-checks ... layer checks ok` and `masters ... masters: 1827 placed, 0 problems`.
- No timing test failed, so I reran none.
- `git status` was clean before and after `git checkout -- prototypes/station/img`.

**7. Public guard: pass.** It printed `public guard ok` and `exit=0`.

**8. Three deliberate breaks.** I ran them on a scratch copy of the UI, station and workbench trees, now removed.

| Break | Caught by |
|---|---|
| One byte flipped in `pod-large-crown-C05-shade.png` | `place-masters --check`, exit 1: `FAIL pod-large-crown-C05-shade: ... does not match its hash`. This is the gate's `masters` job. `masters.test` and `podmasters.test` stayed green. |
| C20 glow dropped (all 8 files) | `place-masters --check` (8 FAIL "is missing"), and `podmasters` test 5, because C20 must carry a glow layer. |
| Unknown pod given a crown | In the rack (`clanOfFrame` falling back to C01): `podmasters` test 3 (rack pod, unknown case). In `podFromLayers` (default clan C01): `podmasters` test 5 ("no clan, no crown"). |

**Gaps:**
- **Pictures-level break not run:** I tried the same break in `pictures.mjs` (frame-less fallback to C01), but the scratch copy lacked the sibling trees the station tests import. The face goldens, which include the unknown pod, would catch that one, but I did not run it.
- **C20 rack glow untested:** the rack test iterates the roster frames, which stop at S16. So no unit test draws C20's rack glow; only `place-masters --check` and the composed-crown test (which uses synthetic clans) guard it. C03's rack glow is covered through S03.
- **Weak composed-crown assertion:** the test only asserts that pixels change, including pixels where the pod is clear. It does not pin the B × mask × shade × 2 formula pixel for pixel.
