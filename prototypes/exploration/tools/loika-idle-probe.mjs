// Probe why one Loika does not step: wraps pathStepToward and logs the field and the neighbours when she stays.
// usage: node loika-idle-probe.mjs <wt> <seed> <placeKey> <loikaId> [turns]
import { pathToFileURL } from "node:url";
const [wt, seed, key, id] = [process.argv[2], +process.argv[3], process.argv[4], +process.argv[5]];
const turns = +(process.argv[6] || 40);
const { makePage } = await import(pathToFileURL(wt + "/prototypes/exploration/tests/page-harness.mjs").href);
const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = ${JSON.stringify(key)}; enterPatch();`);
p.run(`globalThis.PROBE = []; (function () { const o = pathStepToward; pathStepToward = function (X, who, tgt, n) {
  if (who.id === ${id}) { const w = X.lay.w, d = pathField(X.lay, tgt), here = d[who.y * w + who.x]; const nb = Object.entries(DIRS).map(([k, [dx, dy]]) => { const x = who.x + dx, y = who.y + dy; return k + ':' + (x < 0 || y < 0 || x >= w || y >= X.lay.h ? 'out' : 'd' + d[y * w + x] + (canStand(X, x, y, who) ? '' : '!stand') + ' occ=' + JSON.stringify(occupant(X.key, x, y, who) ? 1 : 0) + ' tile=' + X.lay.tiles[y * w + x] + ' feat=' + (featAt(X.lay, X.key, x, y) ? 1 : 0)); });
    const before = who.x + ',' + who.y; o(X, who, tgt, n); PROBE.push({ at: before, to: who.x + ',' + who.y, tgt: tgt.x + ',' + tgt.y + (tgt.tree ? ' tree' : ''), n, here, held: who.held || 0, nb: nb.join(' | ') }); }
  else o(X, who, tgt, n); }; })()`);
for (let i = 0; i < turns; i++) {
  p.run(`PROBE.length = 0`);
  p.run(`S.day.spent = ${Math.min(i * 4, 190)}; advance('patch', { noise: 'act' })`); p.pass(1200);
  const r = p.run(`JSON.stringify(PROBE)`);
  console.log(i, r);
  if (!p.run("!!S.exp")) break;
}
