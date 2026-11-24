// sweep3 = sweep2 (bug121-stuck-2) with every row kept and the go-state recorded, to name remaining holds by kind.
// usage: node --max-old-space-size=4096 sweep3.mjs <wt> <seedFrom> <seedTo> [N]
import { pathToFileURL } from "node:url";
const wt = process.argv[2], a = +process.argv[3], b = +process.argv[4], N = +(process.argv[5] || 12);
const { makePage } = await import(pathToFileURL(wt + "/prototypes/exploration/tests/page-harness.mjs").href);
let places = 0, loikas = 0, stuckLoikas = 0, pairs = 0; const rows = [];
for (let seed = a; seed <= b; seed++) {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  const keys = JSON.parse(p.run(`JSON.stringify([...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))].filter(c => G.comp[c] && G.land[c] !== L.WATER).map(String))`));
  for (const key of keys) {
    try {
      p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = ${JSON.stringify(key)}; enterPatch();`);
      if (!p.run("curLive().cr.some(c => c.sp === 0 && c.ind)")) continue; places++;
      const hist = {};
      for (let i = 0; i < 40; i++) {
        const snap = JSON.parse(p.run(`JSON.stringify(curLive().cr.filter(c => c.sp === 0 && c.ind).map(c => [c.id, c.x, c.y, c.ind.go && c.ind.go.t ? c.ind.go.t.x + ',' + c.ind.go.t.y : null, c.st, !!c.gone, JSON.stringify(c.ind.go || null).slice(0, 160), c.calm || 0]))`));
        for (const [id, x, y, t, st, gone, go, calm] of snap) (hist[id] || (hist[id] = [])).push({ x, y, t, st, gone, go, calm });
        p.run(`S.day.spent = ${Math.min(i * 4, 190)}; advance('patch', { noise: 'act' })`); p.pass(1200);
        if (!p.run("!!S.exp")) break;
      }
      const stuck = {};
      for (const [id, h] of Object.entries(hist)) {
        loikas++;
        let run = 0, best = 0;
        for (let i = 1; i < h.length; i++) { const A = h[i - 1], B = h[i]; if (A.x === B.x && A.y === B.y && B.t && B.t === A.t && B.t !== B.x + ',' + B.y) run++; else run = 0; if (run > best) best = run; }
        if (best >= N) { const L = h[h.length - 1]; stuck[id] = L; stuckLoikas++; }
      }
      const ids = Object.keys(stuck);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const A = stuck[ids[i]], B = stuck[ids[j]]; if (Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y)) <= 1) pairs++; }
      for (const id of ids) rows.push({ seed, key, id, at: [stuck[id].x, stuck[id].y], target: stuck[id].t, st: stuck[id].st, calm: stuck[id].calm, go: stuck[id].go });
    } catch (e) { rows.push({ seed, key, err: String(e).slice(0, 120) }); }
  }
}
console.log(JSON.stringify({ range: [a, b], N, places, loikas, stuckLoikas, pairs, rows }));
