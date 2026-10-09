#!/usr/bin/env node
// The loop report: from the headless player (tools/headless.mjs), the time and the Energy, Data and Essence each step of the loop costs at the decided prices, so the pacing can be
// judged in numbers. The player plays the loop the way the design would: the welcome sitting at the first walk home with a mibi, its wait overlapping the cross and the child's reads, the
// field's Energy spent (Calls, beacons, patches), Probe tier 2 bought at the first dock that can afford it.
//   node prototypes/station/tools/loop-report.mjs [--seed N] [--species S01] [--loose] [--calls N] [--beacons N] [--patches N] [--no-probe] [--busy] [--calm-energy N]
// Prices are the decided ones (research-economy.md §2, world-and-exploration.md); a walk pays the starter place's yield and takes fifteen minutes; waits are the rules' own.
import { playJourney, MIN, WALK, WALK_MS, FIELD } from "./headless.mjs";
import { sittingWaitMs } from "../src/sitting.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };
const seed = +arg("seed", 4242), species = arg("species", "S01"), loose = process.argv.includes("--loose");
// The field spend (the game designer's ruling): a Call inside a place is a free survey pulse, only a map pin costs Energy and a new player places none; so by default 0 Energy-costing
// Calls, a beacon every other walk, no patches. --busy keeps the old assumption (2 Calls, 1 beacon). --calm-energy N sets a walk's Energy yield (4 by default; 2 is the field test's measured median).
const heavy = process.argv.includes("--busy"), field = { calls: +arg("calls", heavy ? 2 : 0), beacons: +arg("beacons", heavy ? 1 : 0.5), patches: +arg("patches", 0) }, energy = +arg("calm-energy", WALK.e);
const R = playJourney({ seed, species, settings: loose ? { economy: "loose" } : {}, field, energy, probe: !process.argv.includes("--no-probe") }), P = R.P;
const fmt = (n) => (n === 0 ? "·" : (n > 0 ? "+" : "−") + Math.abs(n));
const clock = (ms) => { const m = Math.round(ms / MIN); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") + " min"; };
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
console.log(`The loop, ${species}, from a fresh world · ${loose ? "the loose test economy" : "the decided prices"} · seed ${seed}`);
console.log(`A walk pays ${energy} Energy, ${WALK.d} Data, ${WALK.s} Essence (a starter place) and takes ${WALK_MS / MIN} minutes. In the field it spends ${field.calls} Call (${FIELD.call} each), ${field.beacons} beacon (${FIELD.beacon}), ${field.patches} patch (${FIELD.patch}) a walk: the report's own assumption, the docs give the prices and not the counts.`);
console.log(`A bud takes 5 minutes the first time, then 20 plus one per shaped trait; a sitting waits ${sittingWaitMs(P.settings) / 3600000} hours; a world turn is one walk; Probe tier 2 (12 Energy, 4 Data) is bought at the first dock that can afford it.\n`);
console.log(pad("at", 11) + pad("step", 50) + lpad("Energy", 8) + lpad("Data", 7) + lpad("Essence", 9) + "   stock (E D S)");
const earned = { e: 0, d: 0, s: 0 }, spent = { e: 0, d: 0, s: 0 }; let waited = 0, ruleWaits = 0;
for (const s of P.steps) {
  console.log(pad(clock(s.t), 11) + pad(s.name, 50) + lpad(fmt(s.e), 8) + lpad(fmt(s.d), 7) + lpad(fmt(s.s), 9) + "   " + s.stock.join(" "));
  for (const k of ["e", "d", "s"]) if (s[k] > 0) earned[k] += s[k]; else spent[k] -= s[k];
  if (/^the (bud|crate) /.test(s.name)) waited += s.ms;
}
const walks = P.steps.filter((s) => /^a walk/.test(s.name)).length, total = P.now - P.start;
const busy = P.steps.filter((s) => /^the (bud|crate) /.test(s.name) === false).reduce((n, s) => n + s.ms, 0);
console.log("\n" + pad("earned in the field", 61) + lpad(earned.e, 8) + lpad(earned.d, 7) + lpad(earned.s, 9));
console.log(pad("spent (the loop, the field, the Probe)", 61) + lpad(spent.e, 8) + lpad(spent.d, 7) + lpad(spent.s, 9));
console.log(pad("surplus at the first crate", 61) + lpad(P.st.e, 8) + lpad(P.st.d, 7) + lpad(P.st.s, 9));
console.log(`\nTime: the welcome sitting at ${clock(P.marks.welcome ?? NaN)}, the first crate opened at ${clock(P.marks.crate ?? NaN)} (${walks} walks of ${clock(WALK_MS)}; the rest is waiting for the crate's three hours and the buds; the sitting's wait started at the welcome and overlapped everything after it).`);
console.log(`Time spent waiting for a bud or the crate with nothing else to do: ${clock(waited)}. ${P.marks.probe != null ? "Probe tier 2 bought at " + clock(P.marks.probe) + "." : "Probe tier 2 was not affordable in this journey."}`);
console.log("The bench's own minutes (identify, read, shape, cross, open) are not counted: the docs give a bench turn five to fifteen minutes a day.");
