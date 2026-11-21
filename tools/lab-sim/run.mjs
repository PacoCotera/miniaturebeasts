// node tools/lab-sim/run.mjs [seeds=200] [out=tools/lab-sim/results.json]
import { writeFileSync } from "node:fs";
import { runGame, plan, naturalShare, ASSUMPTIONS, CAP_DAYS } from "./sim.mjs";

const N = Number(process.argv[2] ?? 200);
const OUT = process.argv[3] ?? new URL("./results.json", import.meta.url).pathname;
const POLICIES = ["BLIND", "INFORMED", "RULE-a", "RULE-b", "RULE-c", "RULE-d", "RULE-e", "RULE-f"];
const RULE_NAMES = POLICIES.filter((p) => p.startsWith("RULE"));

const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const INF = Infinity;
const fmt = (v) => (v === INF ? `>${CAP_DAYS}d` : String(Math.round(v * 10) / 10));

const res = {};
const match = Object.fromEntries(RULE_NAMES.map((r) => [r, { same: 0, days: 0, sameChoice: 0, choiceDays: 0 }]));
let informedDays = 0, informedChoiceDays = 0;
const t0 = Date.now();
for (const pol of POLICIES) {
  res[pol] = [];
  for (let seed = 1; seed <= N; seed++) {
    let obs = null;
    if (pol === "INFORMED") {
      obs = (S, cands, pl) => {
        if (!cands.length) return;
        const mine = pl.primary?.id ?? "WAIT";
        const choice = cands.length >= 2;
        informedDays++; if (choice) informedChoiceDays++;
        for (const r of RULE_NAMES) {
          const theirs = plan(S, cands, r, true).primary?.id ?? "WAIT";
          match[r].days++; if (choice) match[r].choiceDays++;
          if (theirs === mine) { match[r].same++; if (choice) match[r].sameChoice++; }
        }
      };
    }
    res[pol].push({ seed, ...runGame(seed, pol, obs) });
  }
  console.error(pol, "done", Math.round((Date.now() - t0) / 1000), "s");
}

const summary = {};
for (const pol of POLICIES) {
  const rs = res[pol];
  const gens = rs.map((r) => (r.reached ? r.gens : INF)), days = rs.map((r) => (r.reached ? r.day : INF));
  const deadDays = rs.reduce((s, r) => s + r.dead, 0), allDays = rs.reduce((s, r) => s + r.days, 0);
  summary[pol] = {
    reached: rs.filter((r) => r.reached).length,
    gensMedian: q(gens, 0.5), gensP80: q(gens, 0.8), daysMedian: q(days, 0.5), daysP80: q(days, 0.8),
    unusedMedian: q(rs.map((r) => r.unused), 0.5), unusedP80: q(rs.map((r) => r.unused), 0.8),
    deadShare: allDays ? deadDays / allDays : 0, crossesMedian: q(rs.map((r) => r.crossCount), 0.5),
  };
}
const inf = res.INFORMED;
// Item 3 is read on INFORMED played on past the goal, to the cap (a game stops at its goal, before every trait is inked).
const full = [];
for (let seed = 1; seed <= N; seed++) full.push(runGame(seed, "INFORMED", null, { noStop: true }));
const settledAll = full.flatMap((r) => r.settled.map((d) => (d == null ? INF : d)));
const ink1 = inf.map((r) => (r.firstInk && r.firstInk.day === 1 ? r.firstInk.minute : null));
const withInk = ink1.filter((m) => m != null);
const policySettle = {};

const out = {
  seeds: N, cap: CAP_DAYS, policies: POLICIES, summary, assumptions: ASSUMPTIONS,
  world: naturalShare(N),
  worldResampled: inf.filter((r) => !r.natural).length,
  matches: Object.fromEntries(RULE_NAMES.map((r) => [r, { allDays: match[r].same / match[r].days, choiceDays: match[r].choiceDays ? match[r].sameChoice / match[r].choiceDays : null }])),
  informedDays, informedChoiceDays,
  settle: { median: q(settledAll, 0.5), p20: q(settledAll, 0.2), p80: q(settledAll, 0.8), min: Math.min(...settledAll), unsettledShare: settledAll.filter((d) => d === INF).length / settledAll.length, perPolicyMedian: policySettle },
  session1: { inkInSession1: withInk.length / N, minutesMedian: withInk.length ? q(withInk, 0.5) : null, minutesP80: withInk.length ? q(withInk, 0.8) : null, within10: withInk.filter((m) => m <= 10).length / N },
  unusedAtGoalMedianInformed: summary.INFORMED.unusedMedian,
};
writeFileSync(OUT, JSON.stringify(out, (k, v) => (v === INF ? "inf" : v), 1));
console.log(JSON.stringify(out, (k, v) => (v === INF ? "inf" : v), 1));
