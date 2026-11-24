// Step one Loika in one place, as loika-hold-sweep does, and print her state each turn.
// usage: node loika-idle-step.mjs <wt> <seed> <placeKey> <loikaId> [turns]
import { pathToFileURL } from "node:url";
const [wt, seed, key, id] = [process.argv[2], +process.argv[3], process.argv[4], +process.argv[5]];
const turns = +(process.argv[6] || 40);
const { makePage } = await import(pathToFileURL(wt + "/prototypes/exploration/tests/page-harness.mjs").href);
const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = ${JSON.stringify(key)}; enterPatch();`);
for (let i = 0; i < turns; i++) {
  const row = p.run(`JSON.stringify((() => { const c = curLive().cr.find(q => q.id === ${id}); if (!c) return null; const g = c.ind && c.ind.go; return { x: c.x, y: c.y, st: c.st, gone: c.gone ? JSON.stringify(c.gone) : false, calm: c.calm || 0, held: c.held || 0, go: g ? JSON.stringify(g).slice(0, 220) : null, ind: c.ind ? Object.keys(c.ind).join(',') : null, pl: [S.exp.px, S.exp.py] }; })())`);
  console.log(i, row);
  p.run(`S.day.spent = ${Math.min(i * 4, 190)}; advance('patch', { noise: 'act' })`); p.pass(1200);
  if (!p.run("!!S.exp")) break;
}
