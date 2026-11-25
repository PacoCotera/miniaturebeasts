// Probe for owner note mwv13edw56f3bf (#145): load his save, report Hazel's stand tile, its neighbours, and where she is at each part of day.
//   node prototypes/exploration/tools/hazel145-probe.mjs <save file>
import { readFileSync } from "node:fs";
import { makePage } from "../tests/page-harness.mjs";
const raw = readFileSync(process.argv[2], "utf8");
const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count", store: { "mb-save-v8": raw } });   // slot A reads the shared legacy key when its own is empty
console.log("exp", p.run(`JSON.stringify({pos: S.exp && S.exp.pos, patch: S.exp && S.exp.patch && {x: S.exp.patch.x, y: S.exp.patch.y}, part: dayPart(), turn: S.turn})`));
console.log("errors", JSON.stringify(p.errors).slice(0, 300));
const info = () => p.run(`JSON.stringify(curLive().cr.filter(c => c.ind && c.ind.name).map(c => ({ id: c.id, name: c.ind.name, x: c.x, y: c.y, st: c.st, gone: c.gone && c.gone.t, haunt: (h => h && ({ k: h.k, x: h.x, y: h.y }))(hauntAt(c.ind.hs, c.ind.doings, dayPart())) })))`);
console.log("cr", info());
