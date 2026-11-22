// b-rounds-harness-3: node tools/lab-sim/rounds/run3.mjs <h2|h3> [seeds=200] [out] [frame]
// B1 with a hidden aim of two (markings + eyes) or three (markings + eyes + ears) hidden traits; kin against vigour is the engine's rule, on.
import { writeFileSync } from "node:fs";
import { FRAMES, playLine, stat, q, jsonInf, RULES, oracleValue, EYES, EARS } from "./lib.mjs";
import { useFrame } from "../engine.mjs";

const ROUND = process.argv[2], N = Number(process.argv[3] ?? 200);
const OUT = process.argv[4] ?? new URL(`../results-b-rounds-harness-3-${ROUND}.json`, import.meta.url).pathname;
const INF = Infinity;
const KINDS = { h2: ["hset", `hscale:${EYES}`], h3: ["hset", `hscale:${EYES}`, `hscale:${EARS}`] }[ROUND];
if (!KINDS) throw new Error("round h2|h3");
const sumRuns = (rs) => ({
  gens: stat(rs.map((x) => x.gens)), hatches: stat(rs.map((x) => (x.reached ? x.hatches : INF))),
  hours: { median: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.5), p80: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.8) },
  reached: rs.filter((x) => x.reached).length, runs: rs.length,
});
function b1(F) {
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
  const bots = { BYLOOK: { score: "BYLOOK", mode: "replan" }, TELLS: { score: "TELLS", mode: "replan" } };
  for (const [bot, o] of Object.entries(bots)) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(playLine(F, s, "b1", { ...o, kinds: KINDS, onPairs: bot === "TELLS" ? onPairs : null }));
    res.main[bot] = sumRuns(rs);
  }
  const share = Object.fromEntries(Object.entries(rules).filter(([k, v]) => v.n).map(([k, v]) => [k, v.agree / v.n]));
  res.l2 = { seededDays: decisions, bestMoveShareByRule: share, maxShare: Math.max(...Object.values(share)), pass: Math.max(...Object.values(share)) <= 0.7 };
  const T = res.main.TELLS, B = res.main.BYLOOK;
  const cmp = (t, b) => ({ bylook: b, tells: t, fewer: b === INF ? null : 1 - t / b, pass: t !== INF && (b === INF || t <= 0.7 * b) });
  // L1 = plan v6 line 177: "never worse and needs fewer hatches than the one that pairs by look" (no 30%)
  const hat = cmp(T.hatches.median, B.hatches.median);
  hat.reachTells = T.reached; hat.reachBylook = B.reached;
  hat.pass = T.reached >= B.reached && T.hatches.median !== INF && (B.hatches.median === INF || T.hatches.median < B.hatches.median);
  res.l1 = { gens: cmp(T.gens.median, B.gens.median), hatches: hat };
  return res;
}
const res = { round: ROUND, seeds: N, kinds: KINDS, engine: "origin/main 82462ee (E1, PR 469)", frames: {} };
for (const [name, F] of Object.entries(FRAMES)) {
  if (process.argv[5] && process.argv[5] !== name) continue;
  useFrame(F);
  res.frames[name] = b1(F);
  console.error(ROUND, name, "done");
}
useFrame(FRAMES.L);
writeFileSync(OUT, JSON.stringify(res, jsonInf, 1));
console.log("written", OUT);
