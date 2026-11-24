// Print one seed's days from each run side by side (everything except the long arrays), to see what changed.
// usage: node w5-seed.mjs <dir> <seed> <name> [name ...]
import { readdirSync, readFileSync } from "node:fs";
const [dir, seed, ...names] = process.argv.slice(2);
for (const name of names) {
  for (const f of readdirSync(dir).filter(f => f.startsWith(name + "-") && f.endsWith(".json")).sort()) {
    const r = JSON.parse(readFileSync(dir + "/" + f)).results.find(r => r.seed === +seed); if (!r) continue;
    console.log("==", name, "seed", seed);
    r.days.forEach((d, i) => { const { notes, reads, readTries, events, ...rest } = d; console.log(" day", i + 1, JSON.stringify(rest).slice(0, 420), "| notes", notes.map(n => n.k + ":" + n.range).join(","), "| events", (events || []).join("; ").slice(0, 200)); });
  }
}
