# K1 batch code review (reviewer, 2026-10-22 14:09 Mexico City), head ad5a3979

**FAIL, 2 blocking (both small); T-261, T-262, T-264 PASS.**

## Blocking (fix in K1.1, T-20261022-265)
1. prototypes/face/src/vocab/vocab.h:23: the public guard exits 1 (internal-ref, 1 hit): the comment names an internal document by file name. Reword to "UI kit K1, section 3.1", re-run `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?` (never behind a pipe).
2. prototypes/face/src/vocab/common/frame.c:19 `rect_of(path, r)` is a private copy of `v_srect(F, …)` (13 calls). Replace and delete (also in the architect's K1 gate §1).

## Not blocking (K1.1 handles or reports)
- Sites that drew nothing for an unsent named picture now draw a zero-size fallback node: home_builds.c lamp (:23), strip, tile.well and tile pic; home.c g.bed.mark; leaves.c leaf.%d (i<total). Report them in the K1.1 result as the accepted §3.1 change (the architect accepted the same for berth and tiles), or revert per site if a node record changes on a golden state.
- home_builds.c:34 and :87 keep an inline "v_spec_rect, else zero" copy of v_srect: replace.
- v_composed does not guard a NULL ops: state it in its header (or guard it).
- v_slot with shown=0, an empty fallback and a sent asset hides the asset itself; no effect today (every fallback is non-empty). Note in the header.
- Measured: full set green except the public guard; specimen line `late 770, mid 802, early 736, new 798`; layer-check and checks.mjs figures identical to d62f9807; node log (id, kind, box, rgb) equal to base up to timing noise.
