// b-rounds-harness-2: node tools/lab-sim/rounds/run2.mjs <b1a|b1b|b3> [seeds=200] [out] [frame]
// B1 (a): BY-LOOK reads the shown look rounded to a whole step. B1 (b): the aim is a hidden pair (the markings set alone).
// B3: the stricter rule (a pair pairs again only when its last pod hatched). Frames L and T, seeds 1..N. Same lines as round 1.
import { writeFileSync } from "node:fs";
import { FRAMES, playLine, stat, q, mean, jsonInf, RULES, oracleValue, EYES, EARS } from "./lib.mjs";
import { useFrame } from "../engine.mjs";

const ROUND = process.argv[2], N = Number(process.argv[3] ?? 200);
const OUT = process.argv[4] ?? new URL(`../results-b-rounds-harness-2-${ROUND}.json`, import.meta.url).pathname;
const INF = Infinity;
const KINDS = ["set", `scale:${EYES}`, `scale:${EARS}`];
const KINDS_HIDDEN = ["hset"];
const sumRuns = (rs) => ({
  gens: stat(rs.map((x) => x.gens)), hatches: stat(rs.map((x) => (x.reached ? x.hatches : INF))),
  hours: { median: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.5), p80: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.8) },
  reached: rs.filter((x) => x.reached).length, runs: rs.length,
});

function b1(F, kinds, bots) {
  const res = { main: {}, l2: null };
  const rules = Object.fromEntries(Object.keys(RULES).map((k) => [k, { agree: 0, n: 0 }]));
  let decisions = 0;
  const onPairs = (ps, aim) => {
    if (ps.length < 2) return;
    const vals = ps.map((p) => oracleValue(F, p, aim)), best = Math.max(...vals);
    const bestSet = new Set(ps.filter((p, i) => vals[i] >= best - 1e-9));
    decisions++;
    for (const [k, rule] of Object.entries(RULES)) { rules[k].n++; if (bestSet.has(rule(F, [...ps], aim))) rules[k].agree++; }
  };
  for (const [bot, o] of Object.entries(bots)) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(playLine(F, s, "b1", { ...o, kinds, onPairs: bot === "TELLS" ? onPairs : null }));
    res.main[bot] = sumRuns(rs);
  }
  const share = Object.fromEntries(Object.entries(rules).filter(([k, v]) => v.n).map(([k, v]) => [k, v.agree / v.n]));
  res.l2 = { seededDays: decisions, bestMoveShareByRule: share, maxShare: Math.max(...Object.values(share)), pass: Math.max(...Object.values(share)) <= 0.7 };
  const tl = res.main.TELLS.gens.median;
  res.l1 = {};
  for (const bot of Object.keys(bots)) if (bot !== "TELLS") { const bl = res.main[bot].gens.median; res.l1[bot] = { bylookGensMedian: bl, tellsGensMedian: tl, fewer: bl === INF ? null : 1 - tl / bl, pass: tl !== INF && (bl === INF || tl <= 0.7 * bl) }; }
  return res;
}
const TELLS = { score: "TELLS", mode: "replan" };
const FN = {
  b1a: (F) => b1(F, KINDS, { BYLOOKR: { score: "BYLOOKR", mode: "replan" }, TELLS }),
  b1b: (F) => b1(F, KINDS_HIDDEN, { BYLOOK: { score: "BYLOOK", mode: "replan" }, BYLOOKR: { score: "BYLOOKR", mode: "replan" }, TELLS }),
  b3: (F) => {
    const rs1 = [], rs2 = [];
    for (let s = 1; s <= N; s++) {
      rs1.push(playLine(F, s, "b3", { score: "TELLS", mode: "row", kinds: KINDS, strictPair: true }));
      rs2.push(playLine(F, s, "b3", { score: "TELLS", mode: "replan", kinds: KINDS, observe: true, strictPair: true }));
    }
    const out = { "ONE-ROW": sumRuns(rs1), "RE-PLAN": sumRuns(rs2) };
    const picks = rs2.reduce((s, x) => s + x.picks, 0), changed = rs2.reduce((s, x) => s + x.changed, 0);
    out.hatchChangesPick = { picksAfterAHatch: picks, changed, share: picks ? changed / picks : null, perSeedMedian: q(rs2.filter((x) => x.picks).map((x) => x.changed / x.picks), 0.5) };
    const hr = out["RE-PLAN"].hatches.median, ho = out["ONE-ROW"].hatches.median;
    out.lines = { replanNoMoreHatches: { pass: hr <= ho, replan: hr, oneRow: ho }, hatchChangesPick: { pass: changed / picks >= 1 / 3, share: changed / picks } };
    return out;
  },
}[ROUND];
if (!FN) throw new Error("round b1a|b1b|b3");
const res = { round: ROUND, seeds: N, engine: "origin/main 82462ee (E1, PR 469); engine files unchanged on origin/main since", frames: {} };
for (const [name, F] of Object.entries(FRAMES)) {
  if (process.argv[5] && process.argv[5] !== name) continue;
  useFrame(F);
  res.frames[name] = FN(F);
  console.error(ROUND, name, "done");
}
useFrame(FRAMES.L);
writeFileSync(OUT, JSON.stringify(res, jsonInf, 1));
console.log("written", OUT);
