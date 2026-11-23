# night-draw-fix-4 final
- Changed: 513's one-step dusk table kept (now level 6) + night-table-1's `nightTable` (level 5) + her night-table-2 line (night -> pawn on the dusk step, level 6), one branch. Brief said PR 503 was merged in main; it is not (main has no nightTable), so I cherry-picked e20fa5782 and 194041fb5 onto 513's branch, renumbering dusk 5->6 (both sides used 5). No new art; storm unchanged.
- Grass G (seed 7, patch 9,13, page buffer): day 144, dusk 131, night 58 (night grass 23,58,44, the cool table the AD passed). Sand steps cool at night: sand-box 161 -> 50 G, (42,50,62) cool grey, water 29,37,49.
- Tests: night-draw-fix.test.mjs + night-table.test.mjs, 8 pass (not the full gate). Public guard ok. Pushed to build/night-draw-fix-3 (48e6b0ee0).
- PR 513, still draft + hold.
- Stills (built /play exploration page, her at 5,20): tools/credit-runner/runs/night-draw-fix-4/stills/{390x844,522x935}-{1-day,2-dusk,3-night}.png. No 16 px peek exists in this view's tools; none taken. At night she shows warm orange, findable.
- Shape slip: one `cd && sed` chain ran before I noticed; rest as single calls. No notes file existed for this job.
