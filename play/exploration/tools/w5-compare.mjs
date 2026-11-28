// Merge chunk files <dir>/<name>-NNN.json and compare runs per seed.
// usage: node w5-compare.mjs <dir> <nameA> <nameB> [nameC ...]   (first = the baseline)
import { readdirSync, readFileSync } from "node:fs";
const [dir, ...names] = process.argv.slice(2);
const habitsOn = (r, d) => new Set(r.days[d - 1].notes.map(n => n.k)).size;
const load = name => { const m = new Map(); for (const f of readdirSync(dir).filter(f => f.startsWith(name + "-") && f.endsWith(".json")).sort()) for (const r of JSON.parse(readFileSync(dir + "/" + f)).results) m.set(r.seed, r); return m; };
const runs = Object.fromEntries(names.map(n => [n, load(n)]));
const metric = {
  hs: r => r.days.length >= 1 && habitsOn(r, 1) >= 1 && r.days[0].samples >= 1,
  pod3: r => r.days.length >= 3 && !!r.days[2].ownPod,
  nonote1: r => r.days.length >= 1 && habitsOn(r, 1) === 0,
};
for (const n of names) console.log(n, "seeds", runs[n].size, Object.entries(metric).map(([k, f]) => k + " " + [...runs[n].values()].filter(f).length).join(" · "));
const base = names[0];
for (const n of names.slice(1)) for (const [k, f] of Object.entries(metric)) {
  const lost = [], gained = [];
  for (const [seed, r] of runs[base]) { const o = runs[n].get(seed); if (!o) continue; const a = f(r), b = f(o); if (a && !b) lost.push(seed); if (!a && b) gained.push(seed); }
  console.log(`${base} -> ${n} ${k}: lost ${lost.length} [${lost.join(",")}] gained ${gained.length} [${gained.join(",")}]`);
}
