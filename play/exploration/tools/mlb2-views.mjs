// map-levels-build-2: the views for the stills (cliff-spec-stills.mjs shoot), picked on the land as it is now:  node mlb2-views.mjs <out views.json>
// each view: { name, seed, X0, Y0, tx, ty } (a 2 x 2 window of places from cell X0,Y0; the tile in the window); frames are 450 x 532 at 48 px (the phone place view)
import { writeFileSync } from 'node:fs';
import { windowIR, TV, CW, CH } from '../src/gen7/place.mjs';
const out = process.argv[2], views = [];
const WIN = [[38, 40, 60], [38, 42, 60], [38, 44, 60], [38, 40, 62], [38, 42, 62], [38, 35, 42], [38, 11, 8], [4, 40, 45], [2, 37, 44], [6, 40, 45], [7, 40, 44]];
for (const [seed, X0, Y0] of WIN) {
  const ir = windowIR(seed, X0, Y0, 2, 2), w = ir.w, h = ir.h, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : ir.terrain[y * w + x]);
  const runs = [];   // south faces: lip tiles (cliff with non-cliff below) in a row; side walls: cliff with non-cliff to the east or west in a column
  for (let y = 6; y < h - 8; y++) { let n = 0; for (let x = 0; x <= w; x++) { const on = x < w && at(x, y) === TV.CLIFF && at(x, y + 1) !== TV.CLIFF; if (on) n++; else { if (n >= 6) runs.push({ kind: 'south', n, tx: x - n, ty: y }); n = 0; } } }
  for (const dx of [1, -1]) for (let x = 5; x < w - 5; x++) { let n = 0; for (let y = 0; y <= h; y++) { const on = y < h && at(x, y) === TV.CLIFF && at(x + dx, y) !== TV.CLIFF; if (on) n++; else { if (n >= 6) runs.push({ kind: 'side', n, tx: x, ty: y - n }); n = 0; } } }
  runs.sort((a, b) => b.n - a.n);
  console.log(`seed ${seed} win ${X0},${Y0} runs ${runs.slice(0, 4).map(r => `${r.kind}${r.n}@${r.tx},${r.ty}`).join(' ')} wayups ${JSON.stringify(ir.wayups.slice(0, 3))}`);
  const tag = `s${seed}-${X0}-${Y0}`, r = runs[0];
  if (r && seed !== 38) views.push({ name: `${tag}-${r.kind}${r.n}`, seed, X0, Y0, tx: r.kind === 'south' ? r.tx + (r.n >> 1) : r.tx, ty: r.kind === 'south' ? r.ty + 2 : r.ty + (r.n >> 1) });
  if (r && seed === 38) { const s = runs.find(q => q.kind === 'south'); if (s) { views.push({ name: `${tag}-below`, seed, X0, Y0, tx: s.tx + (s.n >> 1), ty: s.ty + 5 }); views.push({ name: `${tag}-top`, seed, X0, Y0, tx: s.tx + (s.n >> 1), ty: s.ty - 4 }); } }
  const wu = ir.wayups[0]; if (wu) views.push({ name: `${tag}-wayup`, seed, X0, Y0, tx: wu.x + 1, ty: wu.y + 1 });
}
writeFileSync(out, JSON.stringify(views, null, 1) + '\n');
console.log(views.length, 'views');
