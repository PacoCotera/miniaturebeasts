#!/usr/bin/env node
// The loop report: from the headless player (tools/headless.mjs), the time and the Energy, Data and Essence each step of the loop costs at the decided prices, so the
// pacing can be judged in numbers.   node prototypes/station/tools/loop-report.mjs [--seed N] [--species S01] [--loose]
// Prices are the decided ones (research-economy.md §2); a walk pays the starter place's yield and takes fifteen minutes; waits are the rules' own (the bud, the sitting).
import { playJourney, MIN, WALK, WALK_MS } from "./headless.mjs";
import * as S from "../src/state.mjs";
import { sittingWaitMs } from "../src/sitting.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };
const seed = +arg("seed", 4242), species = arg("species", "S01"), loose = process.argv.includes("--loose");
const { P } = playJourney({ seed, species, settings: loose ? { economy: "loose" } : {} });
const fmt = (n) => (n === 0 ? "·" : (n > 0 ? "+" : "−") + Math.abs(n));
const mins = (ms) => (ms === 0 ? "·" : ms >= 3600000 ? (ms / 3600000).toFixed(ms % 3600000 ? 2 : 0) + " h" : Math.round(ms / MIN) + " min");
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
console.log(`The loop, ${species}, from a fresh world · ${loose ? "the loose test economy" : "the decided prices"} · seed ${seed}`);
console.log(`A walk pays ${WALK.e} Energy, ${WALK.d} Data, ${WALK.s} Essence (a starter place) and takes ${WALK_MS / MIN} minutes; a bud takes 5 minutes the first time, then 20 plus one per shaped trait; a sitting waits ${sittingWaitMs(P.settings) / 3600000} hours.\n`);
console.log(pad("step", 46) + lpad("Energy", 8) + lpad("Data", 7) + lpad("Essence", 9) + lpad("time", 9) + "   stock (E D S)");
let tot = { e: 0, d: 0, s: 0, ms: 0 }, spent = { e: 0, d: 0, s: 0 }, gained = { e: 0, d: 0, s: 0 };
for (const s of P.steps) {
  console.log(pad(s.name, 46) + lpad(fmt(s.e), 8) + lpad(fmt(s.d), 7) + lpad(fmt(s.s), 9) + lpad(mins(s.ms), 9) + "   " + s.stock.join(" "));
  tot.e += s.e; tot.d += s.d; tot.s += s.s; tot.ms += s.ms;
  for (const k of ["e", "d", "s"]) if (s[k] > 0) gained[k] += s[k]; else spent[k] -= s[k];
}
const walks = P.steps.filter((s) => /^a walk/.test(s.name)).length, waits = P.steps.filter((s) => /grows|fills/.test(s.name)).reduce((n, s) => n + s.ms, 0);
console.log("\n" + pad("earned in the field", 46) + lpad(gained.e, 8) + lpad(gained.d, 7) + lpad(gained.s, 9));
console.log(pad("spent on the loop", 46) + lpad(spent.e, 8) + lpad(spent.d, 7) + lpad(spent.s, 9));
console.log(pad("left over", 46) + lpad(P.st.e, 8) + lpad(P.st.d, 7) + lpad(P.st.s, 9));
console.log(`\n${walks} walks (${mins(walks * WALK_MS)}), waits the rules make (buds and the sitting) ${mins(waits)}, ${mins(tot.ms)} in all; the mibis are adult after ${S.JUVENILE_TURNS} world turns, taken here one a walk.`);
console.log("The bench's own minutes (identify, read, shape, cross, open) are not counted: the docs give a bench turn five to fifteen minutes a day.");
