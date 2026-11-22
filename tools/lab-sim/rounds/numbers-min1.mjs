// node tools/lab-sim/rounds/numbers-min1.mjs <out.md> : numbers.md for tells-bot-min-1 (h2, frames L and T) beside run3's earlier h2 numbers
import { readFileSync, writeFileSync } from "node:fs";
const D = new URL("../", import.meta.url).pathname;
const J = (f) => JSON.parse(readFileSync(D + f, "utf8"));
const out = ["# tells-bot-min-1: TELLS reads a pair by its weaker trait; run3 h2 (markings + eyes hidden), same 200 seeds and frames", "",
  "Score: n*min(pf) + 2*all + 0.15*n*min(ec/2) + 0.01*tell + vigourOfF(k) (trace.md section 3). No weight tuned. 'before' = results-b-rounds-harness-3-h2-*.json.", "",
  "| frame | bot | reached | hatches med (p80) | gens med | hours med |", "| --- | --- | --- | --- | --- | --- |"];
const l12 = [];
for (const f of ["L", "T"]) {
  const now = J(`results-tells-bot-min-1-h2-${f}.json`).frames[f], was = J(`results-b-rounds-harness-3-h2-${f}.json`).frames[f];
  const row = (tag, bot, x) => out.push(`| ${f} | ${tag} ${bot} | ${x.reached}/${x.runs} | ${x.hatches.median} (${x.hatches.p80}) | ${x.gens.median} | ${x.hours.median?.toFixed?.(1)} |`);
  row("before", "BYLOOK", was.main.BYLOOK); row("before", "TELLS", was.main.TELLS);
  row("now", "BYLOOK", now.main.BYLOOK); row("now", "TELLS", now.main.TELLS);
  l12.push(`- ${f}: L1 hatches ${now.l1.hatches.pass ? "PASS" : "MISS"} (TELLS ${now.l1.hatches.tells} v BYLOOK ${now.l1.hatches.bylook}, ${now.l1.hatches.fewer === null ? "n/a" : (100 * now.l1.hatches.fewer).toFixed(1) + "% fewer"}); gens ${now.l1.gens.pass ? "PASS" : "MISS"} (${now.l1.gens.tells} v ${now.l1.gens.bylook}); L2 ${now.l2.pass ? "PASS" : "MISS"} at ${(100 * now.l2.maxShare).toFixed(1)}% (was ${(100 * was.l2.maxShare).toFixed(1)}%, line 70%), over ${now.l2.seededDays} decisions`);
}
out.push("", "## L1 and L2", "", ...l12, "");
writeFileSync(process.argv[2], out.join("\n"));
console.log("written", process.argv[2]);
