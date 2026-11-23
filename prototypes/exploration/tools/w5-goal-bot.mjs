// W5 first-goal bot: the first-trip bot on seeds --from..--to; prints the goal line at each change and flags a pod line before her own pod exists.
//   node prototypes/exploration/tools/w5-goal-bot.mjs [--from 1] [--to 75] [--verbose]
import { firstTrip } from "./first-trip-bot.mjs";
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : +argv[i + 1]; };
const from = arg("from", 1), to = arg("to", 75), verbose = argv.includes("--verbose");
let last = "", lastTeach = "", seen = [], bad = [], teach = new Set();
const POD = /\bpod\b/i;
globalThis.__goalWatch = (p) => {
  const g = p.run("goalLine()"), t = p.run("S.exp && S.phase === 'patch' ? teachStep() : ''"), own = p.run("!!ownPodLying() || S.exp && S.exp.cargo.pods.length > 0 || !!(S.own && Object.keys(S.own).length)");
  if (g !== last) { last = g; seen.push(g); if (verbose) console.log("  goal:", g); if (POD.test(g) && !own) bad.push("goal: " + g); }
  if (t !== lastTeach) { lastTeach = t; if (t) teach.add(t); if (POD.test(t) && !own) bad.push("teach: " + t); }
};
let ownReached = 0, n = 0; const forms = new Set(), bads = [];
for (let s = from; s <= to; s++) {
  last = ""; lastTeach = ""; seen = []; bad = [];
  const out = firstTrip(s, { calm: true });
  n++; for (const g of seen) forms.add(g.replace(/^[A-Z][a-z]+ · her ways/, "<Name> · her ways").replace(/^[A-Z][a-z]+ left a pod/, "<Name> left a pod"));
  if (seen.some(g => /left a pod/.test(g))) ownReached++;
  if (bad.length) bads.push({ seed: s, bad });
  if (verbose) console.log("seed", s, JSON.stringify(seen));
}
console.log(JSON.stringify({ seeds: n, ownPodGoalSeen: ownReached, formsSeen: [...forms], teachLines: [...teach].slice(0, 12), podLineBeforeOwnPod: bads }, null, 1));
