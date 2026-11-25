# paths-gen-build-3: 205 of 296 tips ending at nothing is now 18; 200-seed pod run finished (144 = 144 against main). PR 618 draft + hold, branch build/paths-gen-build-1
Serves OWNER #161 (2026-11-25): "the roads lead nowhere, end abruptly..."

1. **PR change from the build desk:** the 12 scratch scripts moved to runs/paths-gen-build-2/scratch-paths/ (out of the PR). PR body has the line: movePodsOffBlocks writes S.pods inside layout(), which read-only views also call; deterministic and idempotent.
2. **Why tips ended at nothing:** the keepers' places stood only at the realm's own ends, outposts and forks (one place a keeper). The tip count (build-2's tips2.mjs metric, same seeds 1-19 and 64) found 296 thin road ends; 169 of the 205 misses were in places with no keeper kind at all (stubs, cut arms, a second end in a place that has one), 36 in wanted-but-unseated places (no room, or the road runs on a cliff top: the plan looked at ground path only).
   Fix: `roadTips` (keepers.mjs) lists every thin end not already at a yard, a ford/bridge, a set piece (bed, nook, pool: a spot of the plan) or a port; each gets a **road-rest** (the existing empty 3x3 slot, nothing blocks, no art) seated against its last tile (`plan.rests`, carried in the baked cell like `keepers`, scenery kept off). Also: the plan now sees roads on a cliff top (PATHTOP; box on the top's own grass); seating keeps 2 tiles off the frame's edge (was 4); the plan's TV lacked FORD/BRIDGE/PATHTOP, so crossings were never counted as covered: fixed.
3. **20 seeds (1-19, 64), tips2 metric, before then after:** 296 tips. Before: 72 yard, 4 crossing, 15 port, **205 not**. After: 261 at a yard or set piece, 3 crossing, 14 port, **18 not**. Raw: runs/paths-gen-build-3/tips-before-*.txt, tips3-a2-*.txt. 63 loose sand pieces (touch no port) still counted, not ends, not fixed.
   **The 18 that stay are one kind:** a tip in a cramped place where no clear 3x3 patch of grass touches the road's last tile (a strip under 3 tiles between rock, water, a set piece or the frame's edge): 10 on ground roads (1:35,52; 2:47,59; 4:44,56; 5:44,48; 6:34,40; 8:47,59; 11:45,45; 18:39,41; 64:45,52 twice), 8 on cliff-top roads (1:39,54; 2:40,49; 9:32,42; 10:33,48; 11:45,53; 11:41,55; 16:46,44; 64:32,44). Right? The road there ends in a nook between rock and water; no smaller piece is signed, and a 1-tile marker would be art in code. Left as is; the art desk can sign a smaller slot if he wants one there.
   Note: a tip beside a set piece (a sleepers' bed nook) counts as its destination; the tips2 metric counts it as `yard`.
4. **200-seed pod run (w4-bot --read-all, 3 days, w5-chunks + w5-merge, seeds 1-200, main 602712126 vs branch = main merged + this change):**
   | | main | branch |
   |---|---|---|
   | day 1 note+sample | 150/200 | 150/200 |
   | own pod day 1 / 2 / 3 | 47 / 104 / 144 | 48 / 103 / 144 |
   | all three notes by day 3 | 163 | 162 |
   | empty days | 0 of 600 | 0 of 600 |
   | gone | 29 | 28 |
   Pod by day 3: **144 = 144**; build-2's 43 to 42 over 50 seeds was noise. Files: pods3-main.json, pods3-branch.json (merged), chunks in /tmp.
5. **CI:** the push started a new CI run: build pass, guard pass, **browser pass** (speed check included, 7m40s). No rerun was needed (the earlier fail was one 367 ms task on a loaded runner).
6. **Tests:** tests/paths-rests.test.mjs 3 of 3 (new), tests/paths-keepers.test.mjs 7 of 7 (two checks widened to count a cliff-top road as road). gen7 golden vectors regenerated again (9 lines; tests/gen7-vectors.json). Full gen7 suite left to CI (passed). Public guard ok.
7. **Not done / notes:** step 3 (her runs) is not in this PR (haunt-walk-module-1 is separate). Stills of the new rests were not made: the draw job places the pieces; the lead's before/after stills wait for them. `PLACE_REV` stays 5 (build-2's 5 never shipped). One heredoc was refused by the guard (a python edit): rewritten with the Edit tool. Main merged into the branch (6 commits) before the pod run; the 20-seed tip run ran before that merge (no generator files in it).
Next step: the lead looks at the stills of a place with a road-rest (e.g. seed 1 place 34,44) and marks the PR ready, or asks for a smaller slot for the 18.
