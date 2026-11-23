// Merges the realm bot's chunk files (tools/w4-bot.mjs --json) into W5's numbers: day 1 note and sample, her own pod by day 3, E3 on every day (no note, read or drop = an empty day), and the seeds of 1-75 that pass day 1.
//   node prototypes/exploration/tools/w5-merge.mjs out.json chunk1.json chunk2.json ...
import { readFileSync, writeFileSync } from "node:fs";
const [outFile, ...files] = process.argv.slice(2);
const results = files.flatMap(f => JSON.parse(readFileSync(f, "utf8")).results);
const ok = results.filter(r => r.days.length), n = d => ok.filter(r => r.days.length >= d);
const habitsOn = (r, d) => new Set(r.days[d - 1].notes.map(x => x.k)).size;
const empty = d => !d.notes.length && !(d.reads || []).length && !d.drops;
const sum = {
  seeds: results.length, played: ok.length, skipped: results.filter(r => r.skip).map(r => r.seed), crashed: results.filter(r => r.crash).map(r => r.seed),
  day1: { note: n(1).filter(r => habitsOn(r, 1) >= 1).length, sample: n(1).filter(r => r.days[0].samples >= 1).length, noteAndSample: n(1).filter(r => habitsOn(r, 1) >= 1 && r.days[0].samples >= 1).length, of: n(1).length },
  ownPodByDay: [1, 2, 3].map(d => ({ day: d, own: n(d).filter(r => r.days[d - 1].ownPod).length, of: n(d).length })),
  allThreeByDay3: n(3).filter(r => new Set(r.days.flatMap(x => x.notes.map(y => y.k))).size === 3).length,
  e3: { days: ok.flatMap(r => r.days).length, emptyDays: ok.flatMap(r => r.days).filter(empty).length, emptySeeds: ok.filter(r => r.days.some(empty)).map(r => r.seed) },
  drops: { days: ok.flatMap(r => r.days).filter(d => d.drops).length }, reads: { days: ok.flatMap(r => r.days).filter(d => (d.reads || []).length).length },
  gone: ok.flatMap(r => r.days).filter(d => d.gone).length,
};
sum.day1PassSeeds1to75 = ok.filter(r => r.seed <= 75 && habitsOn(r, 1) >= 1 && r.days[0].samples >= 1).map(r => r.seed);
console.log(JSON.stringify(sum));
writeFileSync(outFile, JSON.stringify(sum, null, 1));
