// Probe 2 for #145: the tiles round Hazel on his save: tile name, reach, free (hauntFree), solid, water.
//   node prototypes/exploration/tools/hazel145-probe2.mjs <save file>
import { readFileSync } from "node:fs";
import { makePage } from "../tests/page-harness.mjs";
const raw = readFileSync(process.argv[2], "utf8");
const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });
const out = p.run(`(() => {
  const lay = curLay(), KEY = S.exp.patch.key, c = curLive().cr.find(c => c.ind && c.ind.name === 'Hazel'), free = hauntFree(lay, KEY, c);
  const names = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));
  const rows = [];
  for (let y = Math.max(0, c.y - 4); y <= Math.min(lay.h - 1, c.y + 4); y++) { let r = String(y).padStart(2) + ' '; for (let x = Math.max(0, c.x - 6); x <= Math.min(lay.w - 1, c.x + 6); x++) { const t = lay.tiles[y * lay.w + x]; r += (x === c.x && y === c.y ? '*' : free(x, y) ? 'f' : ' ') + (names[t] || t).slice(0, 5).padEnd(5) + ' '; } rows.push(r); }
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => { const x = c.x + dx, y = c.y + dy; return { x, y, tile: names[lay.tiles[y * lay.w + x]], reach: !!lay.reach[y * lay.w + x], free: free(x, y), block: !!T_BLOCK[lay.tiles[y * lay.w + x]], nostand: NOSTAND(lay.tiles[y * lay.w + x]) }; });
  const h = hauntAt(c.ind.hs, c.ind.doings, dayPart());
  const hs = Object.fromEntries(Object.entries(c.ind.hs).map(([k, s]) => [k, { k: s.k, x: s.x, y: s.y, stand: hauntStand(s, free) }]));
  return JSON.stringify({ c: { x: c.x, y: c.y, st: c.st, go: c.go, gone: c.gone }, tileHere: names[lay.tiles[c.y * lay.w + c.x]], haunt: h, hs, doings: c.ind.doings, nb, rows, w: lay.w, h: lay.h });
})()`);
const o = JSON.parse(out); console.log(o.rows.join("\n")); delete o.rows; console.log(JSON.stringify(o, null, 1));
