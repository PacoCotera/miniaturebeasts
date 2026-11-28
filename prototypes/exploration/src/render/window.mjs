// The one drawer for a window of world tiles (render-window-1b-2; STRUCTURE.md step 5; owner 2026-11-27 23:3x / 23:4x, his #178, #141).
// Given the cells a window covers and a tile size of 48 px, it draws each cell the same way, a neighbour like any other: the baked ground
// (land or sea), through the one light pass (BakedView.lightFor -> places/src/ground.mjs applyLight, which holds the one shaper, render/edge.mjs:
// the veil's eighths and their soft edge), then the props and the crowns. What is seen is only what the caller's `veiled` reads say
// (logic/seen.mjs levelAt); this module never touches the seen record and never bakes: a cell with no baked view is the caller's to leave under the fog.
// Pure drawing: a canvas context and views in, pixels out. The ground goes to a scratch canvas first (putImageData ignores the clip and writes
// transparent over what is under it), then one drawImage under the caller's clip.
//
// cells: [{ bk: BakedView, lay: the cell's layout, rect: { x, y, w, h } where the cell's own tiles go on the canvas (w = lay.w * 48),
//           veiled(px, py): true where the seen record shows the tile veiled (page cells), level(px, py): the light level of a tile }]
// o: { clockMs, mk(w, h): a scratch canvas }
const SCRATCH = new Map();
export function drawWindow(g, cells, o) {
  const T = 48;
  for (const c of cells) {
    const { bk, lay, rect } = c, win = { x: -bk.ox * T, y: -bk.oy * T, w: lay.w * T, h: lay.h * T };
    const veiled = c.veiled, level = c.level || (() => 0), clear = (px, py) => !veiled(px, py);
    const light = bk.lightFor({ veiled, foggedFar: () => false, level }, 'w' + lay.key);
    const sk = lay.key + '|' + win.w + 'x' + win.h; let tmp = SCRATCH.get(sk);
    if (!tmp) { tmp = o.mk(win.w, win.h); SCRATCH.set(sk, tmp); while (SCRATCH.size > 10) SCRATCH.delete(SCRATCH.keys().next().value); }   // one scratch per cell, the last ten kept
    const tg = tmp.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, win.w, win.h); tg.imageSmoothingEnabled = false;
    bk.drawGround(tg, 0, 0, win, o.clockMs, light);
    const org = { x: -win.x, y: -win.y };
    for (const it of bk.propItems(tg, org, o.clockMs, clear, level).sort((a, b) => a.y - b.y)) it.d();
    bk.drawCanopy(tg, org, o.clockMs, [], clear, level);
    g.imageSmoothingEnabled = false; g.drawImage(tmp, rect.x, rect.y, rect.w, rect.h);
  }
}
