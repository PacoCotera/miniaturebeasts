# render-seen-2 final
- Read added: `anySeen(sn, key)` in src/logic/seen.mjs (true if any bit of `tile[key]` is set); no share, no threshold.
- Used in index.html drawPeekNeighbours: a built neighbour with `!anySeen` is dropped to the dark slot (peekFog + `v.dark`), so peekFogEdges lays the soft pieces on it; partly seen neighbours draw as 717 did. Nothing else moved.
- Case s43 (178 save, cell 186, Call held, 412x915, by presses; strip x 250-390): before, longest straight run 140 rows (29 positions); after, 20 rows (37 positions). Test asserts run < 60. Import-check passes. Run twice: the first run failed only on my own too-strict test row share, fixed.
- Stills: runs/render-seen-2/shots/before-178-look-around.png, after-178-look-around.png (before = 717's head, straight cut at the west block; after = soft edge).
- Pushed f8b2cc7ba to render-seen-1 (PR 717 stays draft + hold). Next step: build desk reads the push.
