# night-draw-fix-2 final
- (1) Night already draws through dark2 (measured in the screen buffer, patch 6,13: grass day 92,187,76 / dusk 50,146,69 one step / night 35,98,60 dark2, two steps); no code change needed, the signed night green is that colour. Say if the art director wants it darker than the signed table.
- (2) She now goes through the same table as the place and props at night: removed the `heroRm === 2 ? 0` exception (prototypes/exploration/index.html).
- Tests: night-draw-fix.test.mjs, 3 pass (new: no night exception for the explorer). Not the full gate.
- Stills 390x844 day/dusk/night, patch 6,13, her at tile 12,22: tools/credit-runner/runs/night-draw-fix-2/stills/390x844-{1-day,2-dusk,3-night}.png (script prototypes/exploration/tools/night-draw-stills.mjs).
- Caveat: the owner's world seed is unknown; seed 7 at patch 6,13 shows grass, rocks and a beast, no tree/flowers/bushes. Needs the seed to match exactly.
- PR 503 stays draft + hold; pushed to build/night-draw-fix-1. Shape refusals (cd+git, heredoc) redone as single calls.
