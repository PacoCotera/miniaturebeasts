// Probe 3 for #145: play his save through the day: where Hazel stands each step, by part of day.
//   node prototypes/exploration/tools/hazel145-probe3.mjs <save file> [step]
import { readFileSync } from "node:fs";
import { makePage } from "../tests/page-harness.mjs";
const raw = readFileSync(process.argv[2], "utf8"), step = +(process.argv[3] || 4);
const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });
console.log("DAY", p.run(`JSON.stringify(DAY)`).slice(0, 300));
const me = () => JSON.parse(p.run(`JSON.stringify((c => ({ part: dayPart(), spent: S.day.spent, x: c.x, y: c.y, st: c.st, go: c.go, gone: c.gone && c.gone.t, t: c.ind.go && c.ind.go.t, haunt: (h => h && h.k + '@' + h.x + ',' + h.y)(hauntAt(c.ind.hs, c.ind.doings, dayPart())) }))(curLive().cr.find(c => c.ind && c.ind.name === 'Hazel')))`));
console.log(JSON.stringify(me()));
for (let s = +p.run(`S.day.spent`) + step; s < 400; s += step) {
  p.run(`S.day.spent = ${s}; advance('patch', { noise: 'act' })`); p.pass(1200);
  console.log(JSON.stringify(me()));
}
