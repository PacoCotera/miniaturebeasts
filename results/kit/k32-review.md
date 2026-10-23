# K3.2 and T-273 code review (reviewer, Fri 2026-10-23 03:06 Mexico City), head d2dbfd99

Verdict: PASS. No blocking items.

## Commit metadata
Both commits: author and committer Paco Cotera <paco@cotera.org>, no trailers, no model/tool/session names.

## Non-blocking notes
1. library.c:56 still has the same pattern (`bx + v_half(bw - nw)`, `by + v_fdiv(bh - v_cap(npx), 2)`). It is not in the ruling's site list. A follow-up ticket is cheaper than leaving the duplicate.
2. journey.mjs settle loop (T-273): bounded at 60 steps of 100 ms, all on the held clock, so it always terminates. If the words never settle it proceeds silently and records an unsettled shot. Suggest a warning line or a failure there.
3. The sort comparator in `record()` never returns 0. It is harmless for identical keys, and `x === y` gives the same output. checks.mjs only uses `filter`/`some`/`Set` on log.type and log.regions (checks.mjs:103, 154), so there are no order side effects.
4. After the Station journey, 32 tracked PNGs under prototypes/station/img show as modified in the worktree (git diff --stat: "32 files changed, 0 insertions(+), 0 deletions(-)"). Neither commit touches img. I did not run the base journey to learn whether this drift pre-dates T-273. If it comes from T-273's settled timing, the committed images are stale. The architect or lead should say whether to refresh them.
5. The builder's "9 states differ in order" claim (pods states, first-seen slot order) is unverified by me. Sets were declared equal by the builder, and the type log is sorted now.

## Contract checklist
- Guard and ratchet green (below).
- No new private helper duplicates a v_* helper. The commit removes specimen.c `centred()` and `cap_top()`, which were duplicates. `v_cap_in` is new in vocab.h with its contract header.
- No new pattern lacking an architect link: the ruling is results/kit/k3-gate.md "K3.2". The vocab.h header does not cite it; the lead can decide if it should.
- No golden retaken: no golden or png files in the commits, and goldens --check matches.
- Props builders: no props builder changed.

## Per-site reading (pixel identity)
- vocab.c: `v_cap_in(top,h,px) = top + v_fdiv(h - v_cap(px), 2)`. `v_cap_top` LINE case now calls it. This is the same expression as before.
- specimen.c name, caption, ribbon: `x - v_half(w)` with the cap top from `v_cap_in` is the same as the removed `centred()`. `v_line_at` centre uses `x - v_half(w)` and `v_text` height `px*5/4` as before.
- ribbon.c, non-empty: `v_line_in` uses `bx + v_half(bw - w)`, equal to the old `rect[0] + v_half(rect[2] - tw)`. Empty text: width 0 and x `rect[0] + v_half(rect[2])`, equal to the old node. Node order is unchanged.
- list.c: `v_line_in(nx, pw)` has the same x as before. The y is the same.
- cargo.c: `v_cap_in(py0, isz, wpx)` is the same expression.
- rail.c: the old code used `v_half` (ceiling) and the new code uses floor. The spec has em1 = 24 (frame.json full_layout.emblem) and cap(16) = 12, so the difference is even, and the result is identical for the shipped values. It would differ by 1 px for an odd em1 - cap.
- page.c: the old `(24 - cap + 2) / 2` equals `1 + floor((24 - cap) / 2)` for positive values. The new `v_cap_in(ry + H1 + 1, 24, 20)` is identical, with a comment. The 1 px question for UI/UX is open, as the ruling says.
- journey.mjs `settled`: it holds the clock only when it is not already held (`__isHeld`) and releases in `finally`. It leaves an existing hold alone.

## Check results (verbatim)
- `build.sh all` (own FACE_BUILD_DIR, because the shared /tmp/mb-face-build cache points at the other clone): `face_test: 14760 checks, 0 failed`, `layout: 386 cases, 0 differ`, `native build 68.9 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- node --test set: `# tests 1584`, `# pass 1583`, `# fail 0`, `# skipped 1`
- Station journey, run twice: `journey ok · screenshots in img/` both times. The type logs and regions of the two runs (chk1 against chk2) were compared over 44 shots: `shots 44 44 differ 0 hash 3b15a54f88ac7348`. This confirms T-273's byte-identical claim for both type and regions.
- `station/tools/checks.mjs`: `ink: 138 regions compared in 25 frames` / `layer checks ok` (exit 0)
- `play/tools/journey.mjs`: `play journey ok`
- `face/tools/guard.mjs`: `guard: 75 removed paths, 314 files read, 0 failures` / `guard ok` (exit 0)
- `face/tools/layer-check.mjs`: `layer check ok` (exit 0)
- `face/tools/goldens.mjs --check`: `idle: goldens match` (exit 0)
- `ui/tools/place-masters.mjs --check`: `masters: 1006 placed, 0 problems` (exit 0)
- public guard `--base origin/station-gate`: `public guard ok` / `exit=0`

The worktree is removed, the private build dir is deleted, and no /tmp/bake-c-* directories were left behind.
