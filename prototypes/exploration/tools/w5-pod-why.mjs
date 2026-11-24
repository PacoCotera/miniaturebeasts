// For the seeds whose pod by day 3 changed between two runs: which habit is missing by day 3 in the run without the pod, and the day log's reason lines for it.
// (the own pod needs all three habits known: index.html fullyKnown, ownPodCheck)
// usage: node w5-pod-why.mjs <dir> <from> <to>
import { readdirSync, readFileSync } from "node:fs";
const [dir, A, B] = process.argv.slice(2);
const load = name => { const m = new Map(); for (const f of readdirSync(dir).filter(f => f.startsWith(name + "-") && f.endsWith(".json")).sort()) for (const r of JSON.parse(readFileSync(dir + "/" + f)).results) m.set(r.seed, r); return m; };
const a = load(A), b = load(B);
const known = r => new Set(r.days.slice(0, 3).flatMap(d => d.notes.map(n => n.k)));
const missing = r => ["shake", "calm", "sleep"].filter(k => !known(r).has(k));
const reasons = (r, k) => [...new Set(r.days.flatMap(d => d.events || []).filter(e => e.startsWith(k)).map(e => e.replace(/\(gone\)/, "").trim()))].join("|");
const tally = { lost: {}, gained: {} }, fam = { lost: {}, gained: {} };
for (const [seed, r] of a) { const o = b.get(seed); if (!o || !r.days[2] || !o.days[2]) continue; const x = !!r.days[2].ownPod, y = !!o.days[2].ownPod; if (x === y) continue;
  const k = x ? "lost" : "gained", withoutPod = x ? o : r, withPod = x ? r : o;
  const m = missing(withoutPod); const key = m.join("+") || "all three noted but no pod";
  tally[k][key] = (tally[k][key] || 0) + 1;
  console.log(k, seed, "no pod in", x ? B : A, "missing", key, "|", m.map(h => h + ": " + reasons(withoutPod, h)).join(" ; ").slice(0, 120)); }
console.log(JSON.stringify(tally));
