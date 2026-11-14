// Sums the per-seed lines of border-measure-all.sh. Usage: node border-sum.mjs <output file>
import { readFileSync } from "node:fs";
const t = { seeds: 0, cliffSides: 0, cliffOpen: 0, openSides: 0, openBlocked: 0 };
for (const l of readFileSync(process.argv[2], "utf8").split("\n")) { try { const r = JSON.parse(l); t.seeds++; for (const k of Object.keys(t)) if (k !== "seeds") t[k] += r[k]; } catch {} }
console.log(JSON.stringify(t));
