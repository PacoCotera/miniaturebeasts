# S04 stripe contrast (Oct 11)

S04's stripe-contrast looks (faint, between, bold) as layers on the young S04, for its play test (the creative director's 910b830; the Station lead's request 15:46). The programme lead's go was 15:48, on the trait-layer floor line.

- **Striped base:** `source/raw/trait-S04-stripes-base-a.jpg`, 1 Pro edit of the signed stand's raw, 3.43 MXN, no retry. Soft tabby stripes over the back, flanks and tail; the pose, face and outline are unchanged. A few stripes reached the forehead (a tabby "M"), which I accept.
- **Cut** (`cut-stripes.py`): the same method and the same per-size transform as the topline keys (`../topline/cut-topline.json`), so it registers with the signed stand. Body layers have alpha 0 or 255. The shadow is the stand's (`../topline/…-level-…-shadow.png`).
- **Region map** `mibi-juvenile-S04-stripes-region-{size}.png`: where the striped key is darker than the plain one. 1,921 px at 304×312, 129 at 104×112, 204 at 96×88.
- **The three looks** are recolours of that region only, over the edit's coat:
  - faint = 30 % of the painted stripe;
  - between = as painted;
  - bold = 140 %.
  Nothing outside the region changes.
- **Measured:** 0 magenta pixels on every key. **Signed** at 1× on #D6CEBE (`stripes-1x.png`). Faint is a whisper and bold reads clearly at 304. At 104 between and bold read, while faint is close to plain. Whether faint has to be told apart at walker size is the game designer's call.

Next (0 MXN): the stripe plates for Pods cells and the roll, and the stripes on the curl once S04's motion keys exist.
