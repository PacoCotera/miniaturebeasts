---
ticket: T-20261016-176
status: done
branch: work-queue
head: 4723d89b (T-175, tools/device-sheet.json)
ci: not run (review only)
---
## Verdict: PASS
T-175 closes the one fail of results/review-builds-2026-10-17d.md (the sheet omitted Idle and the namer). The T-167 tool is now complete for the Station's screens. This review was asked for in a message from the lead; no ticket existed, so I wrote T-20261016-176 and claimed it. (I claimed it although it lists T-175 in `needs` and T-175 was in review, not done; the lead asked for this check on T-175 directly.)

## Run
- `git fetch` of both batch heads, then `python3 tools/device-sheet.py /tmp/.../sheet2.png`: `4232 x 9296, 46 frames`, exit 0, no MISSING line (before the fix: 4232 x 7872, 39 frames).
- The frame count: 46 = 39 + 4 Idle + 3 namer, as the fix ticket said.
- Guard: `node .github/public-guard/guard.mjs --base 4723d89b~1` (the guard script taken from a worktree of batch/B-20261016-4, because `.github/public-guard/` does not exist on work-queue, so running it in place fails with "Cannot find module"): `public guard ok`, exit=0.

## Looked at
- **The rows, in order:** Home, Vivarium, A mibi up close, **The namer**, Pods, Probe bench, Create, Incubator, Cargo, Library, **Idle**, Decision panels (5 frames, continued onto a second row). The namer follows the mibi up close (it opens from there); Idle follows the Library.
- **The namer row** shows habitat-namer, habitat-namer-typed ("Mone" typed) and habitat-namer-full (a full-length name), each unscaled and labelled `cell id · state`, with the head it was read from (B-4).
- **The Idle row** shows idle-docked, idle-docked-night, idle-away and idle-empty (the vivarium window at rest, day and night), each labelled.
- Nothing else changed: the other ten rows are as in the first sheet.

## Still true (not a fail, from the first review)
The two heads have diverged, so the Probe bench, Create and Incubator rows read from B-3 and the rest from B-4; the Create row still shows the outline-only Create next to the finished decision panels. The tool labels each row's head.
