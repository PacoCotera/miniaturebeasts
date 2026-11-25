// first-walk-teach-approach-1: the first-trip bot on seeds --from..--to; prints each approach teaching line as it shows and flags any that shows outside a first walk.
//   node prototypes/exploration/tools/teach-approach-bot.mjs [--from 1] [--to 75]
import { firstTrip } from "./first-trip-bot.mjs";
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : +argv[i + 1]; };
const from = arg("from", 1), to = arg("to", 75);
const OURS = [/^A Loika keeps to the .+, .+$/, /^She comes here in the morning/, /^Step slowly near her/, /^She heard you/];
const count = {}, bad = [], seedsWith = {};
let seed = 0, last = "";
globalThis.__goalWatch = (p) => {
  const fw = p.run("firstWalk()"), t = p.run("S.exp && S.phase === 'patch' ? teachStep() : ''"), m = p.run("FX.teachMsg || ''");
  if (!fw && OURS.some(r => r.test(m) || r.test(t))) bad.push({ seed, line: m || t });
  if (fw && t !== last) { last = t; const i = OURS.findIndex(r => r.test(t)); if (i >= 0) { const k = t.replace(/the .+,/, "the <land>,").replace(/, [a-z-]+$/, ", <dir>"); count[k] = (count[k] || 0) + 1; (seedsWith[k] = seedsWith[k] || new Set()).add(seed); } }
};
for (seed = from; seed <= to; seed++) { last = ""; firstTrip(seed, { calm: true }); }
console.log(JSON.stringify({ seeds: to - from + 1, lineChanges: count, seedsPerLine: Object.fromEntries(Object.entries(seedsWith).map(([k, v]) => [k, v.size])), outsideFirstWalk: bad }, null, 1));
