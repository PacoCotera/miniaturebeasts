import { readFileSync } from "node:fs";
const D = new URL("../", import.meta.url).pathname;
const get = (r, f) => JSON.parse(readFileSync(`${D}results-b-rounds-harness-2-${r}-${f}.json`)).frames[f];
const fmt = (x) => `${x.gens.median} (${x.gens.p80}) gens; ${x.hatches.median} (${x.hatches.p80}) hatches; ${x.hours.median.toFixed?.(1)} (${x.hours.p80.toFixed?.(1)}) h; reached ${x.reached}`;
for (const r of ["b1a", "b1b"]) for (const f of ["L", "T"]) {
  const d = get(r, f); console.log(r, f);
  for (const [b, x] of Object.entries(d.main)) console.log("  ", b, fmt(x));
  console.log("   L1", JSON.stringify(d.l1)); console.log("   L2", d.l2.pass, d.l2.maxShare.toFixed(3), d.l2.seededDays, JSON.stringify(Object.fromEntries(Object.entries(d.l2.bestMoveShareByRule).map(([k, v]) => [k, +v.toFixed(3)]))));
}
for (const f of ["L", "T"]) {
  const d = get("b3", f); console.log("b3", f);
  for (const b of ["ONE-ROW", "RE-PLAN"]) console.log("  ", b, fmt(d[b]));
  console.log("  ", JSON.stringify(d.hatchChangesPick), JSON.stringify(d.lines));
}
