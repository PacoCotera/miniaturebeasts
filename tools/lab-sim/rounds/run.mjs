// b-rounds-harness-1: node tools/lab-sim/rounds/run.mjs <b0|b1|b2|b3> [seeds=200] [out]
// Each round: frames L and T, seeds 1..N, medians and 80th percentiles; PASS/MISS lines are computed here and never retuned.
import { writeFileSync } from "node:fs";
import { FRAMES, playLine, stat, q, mean, jsonInf, rng, forecast, lookLabel, LOCI, copyValue, scaleSteps, kinship, directKin, RULES, oracleValue, SET_ID, EYES, EARS, DRIVE, poolOf, stepsOf } from "./lib.mjs";
import { useFrame } from "../engine.mjs";
import { Pop } from "../bench.mjs";

const ROUND = process.argv[2], N = Number(process.argv[3] ?? 200);
const OUT = process.argv[4] ?? new URL(`../results-b-rounds-harness-1-${ROUND}.json`, import.meta.url).pathname;
const INF = Infinity;
const round6 = (v) => Math.round(v * 1e6) / 1e6;
const KINDS = ["set", `scale:${EYES}`, `scale:${EARS}`];
const KINDS_DOING = ["set", `scale:${EYES}`, `doing:${DRIVE}`];
const BOTS = { BYLOOK: { score: "BYLOOK", mode: "replan" }, TELLS: { score: "TELLS", mode: "replan" }, ONEROW: { score: "TELLS", mode: "row" } };
const sumRuns = (rs) => ({
  gens: stat(rs.map((x) => x.gens)), hatches: stat(rs.map((x) => (x.reached ? x.hatches : INF))), days: stat(rs.map((x) => x.days)),
  hours: { median: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.5), p80: q(rs.map((x) => (x.reached ? x.minutes / 60 : INF)), 0.8) },
  reached: rs.filter((x) => x.reached).length, runs: rs.length,
  vigourAtAim: { mean: mean(rs.filter((x) => x.reached).map((x) => x.vigour)), median: q(rs.filter((x) => x.reached).map((x) => x.vigour), 0.5) },
  kinShareOfPairings: mean(rs.map((x) => (x.crosses ? x.kinPairs / x.crosses : 0))),
  aimStepIndexMean: mean(rs.flatMap((x) => x.aim.filter((a) => a.kind === "scale").map((a) => a.idx + 1))),
});

// ---------------------------------------------------------------- B0 the printed odds
const SWITCHES = { L: [SET_ID, "anatomy.crown-presence"], T: [SET_ID, "anatomy.crown-presence", "anatomy.muzzle-presence", "appearance.marking-layout", "anatomy.crown-form"] };
const LOOKS = { L: [EYES, EARS], T: [EYES, EARS, "growth.crown-height-ratio"] };
const DOINGS = [DRIVE, "energy.action-efficiency"];
const YOUNG = 400;   // young per pair: a 95% interval of a quarter is about ±4 points
function b0(name, F) {
  const cell = {};   // `${pairKind}|${trait}` -> { checks, within, unlisted, sums }
  const land = { looks: { copies: 0, copiesOnStep: 0, shown: 0, shownOnStep: 0, halfStep: 0 }, doings: { values: 0, onSevenSteps: 0 } };
  const kinds = { strangers: { k: [], direct: 0 }, "half kin": { k: [], direct: 0 }, "first cousins": { k: [], direct: 0 } };
  for (let s = 1; s <= N; s++) {
    const r = rng(`b0:${name}:${s}`), pop = new Pop(F);
    const wild = () => pop.make(F.draw(r, { kind: "wild" }), [], 0);
    const child = (a, b) => pop.child(a, b, r);
    const A = wild(), B = wild(), P0 = wild(), Q1 = wild(), Q2 = wild(), G1 = wild(), G2 = wild(), X = wild(), Y = wild();
    const sib1 = child(G1, G2), sib2 = child(G1, G2);
    const pairs = { strangers: [A, B], "half kin": [child(P0, Q1), child(P0, Q2)], "first cousins": [child(sib1, X), child(sib2, Y)] };
    for (const [pk, [a, b]] of Object.entries(pairs)) {
      const k = kinship(a, b, pop.lookup);
      kinds[pk].k.push(k); if (directKin(a, b, pop.lookup) !== null) kinds[pk].direct++;
      const fc = forecast(F.fr, a, b, { kinship: k, lookup: pop.lookup });
      const young = [];
      for (let i = 0; i < YOUNG; i++) young.push(F.cross(a, b, r, pop.lookup));
      const test = (trait, printed, seenOf) => {
        const c = (cell[`${pk}|${trait}`] ??= { checks: 0, within: 0, unlisted: 0, pairs: 0, printedSum: {}, seenSum: {} });
        c.pairs++;
        const seen = {};
        for (const y of young) { const v = seenOf(y); seen[v] = (seen[v] ?? 0) + 1; }
        for (const v of Object.keys(seen)) if (!(v in printed)) c.unlisted++;
        for (const [v, p] of Object.entries(printed)) {
          const n = seen[v] ?? 0, sd = Math.sqrt(p * (1 - p) / YOUNG);
          c.checks++; if (Math.abs(n / YOUNG - p) <= 1.96 * sd + 1e-12) c.within++;
          c.printedSum[v] = (c.printedSum[v] ?? 0) + p; c.seenSum[v] = (c.seenSum[v] ?? 0) + n / YOUNG;
        }
      };
      for (const id of SWITCHES[name]) {
        const tr = fc.traits.find((t) => t.locus === id), locus = LOCI.get(id);
        test(id, tr.looks, (y) => lookLabel(locus, y.loci[id]));
      }
      for (const id of LOOKS[name]) {
        const locus = LOCI.get(id), printed = {};
        for (const x of a.genome.loci[id]) for (const z of b.genome.loci[id]) { const v = round6((copyValue(locus, x) + copyValue(locus, z)) / 4 * 2); printed[v] = (printed[v] ?? 0) + 0.25; }
        const steps = stepsOf(F, id);
        test(id, printed, (y) => round6((copyValue(locus, y.loci[id][0]) + copyValue(locus, y.loci[id][1])) / 2));
        for (const y of young) {
          const cv = y.loci[id].map((c) => copyValue(locus, c));
          for (const c of cv) { land.looks.copies++; if (steps.some((st) => Math.abs(st - c) < 1e-6)) land.looks.copiesOnStep++; }
          const m = (cv[0] + cv[1]) / 2; land.looks.shown++;
          if (steps.some((st) => Math.abs(st - m) < 1e-6)) land.looks.shownOnStep++; else land.looks.halfStep++;
        }
      }
      for (const id of DOINGS) {
        const locus = LOCI.get(id), steps = stepsOf(F, id);
        for (const y of young) { const v = copyValue(locus, y.loci[id][0]); land.doings.values++; if (steps.some((st) => Math.abs(st - v) < 1e-6)) land.doings.onSevenSteps++; }
      }
    }
  }
  const out = { cells: {}, landing: land, pairKinship: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { kinship: mean(v.k), min: Math.min(...v.k), max: Math.max(...v.k), engineRefuses: v.direct }])) };
  let checks = 0, within = 0, unlisted = 0, worst = 0;
  const per = {};
  for (const [key, c] of Object.entries(cell)) {
    const dev = Math.max(...Object.keys(c.printedSum).map((v) => Math.abs(c.seenSum[v] / c.pairs - c.printedSum[v] / c.pairs)));
    out.cells[key] = { pairs: c.pairs, checks: c.checks, within95: c.within / c.checks, unlisted: c.unlisted, maxPooledGap: dev };
    checks += c.checks; within += c.within; unlisted += c.unlisted; worst = Math.max(worst, dev);
    const pk = key.split("|")[0]; per[pk] ??= { checks: 0, within: 0 }; per[pk].checks += c.checks; per[pk].within += c.within;
  }
  out.summary = { youngPerPair: YOUNG, checks, within95: within / checks, unlisted, worstPooledGap: worst, byPairKind: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.within / v.checks])) };
  const l = land.looks, d = land.doings;
  out.lines = {
    agree: { pass: out.summary.within95 >= 0.93 && unlisted === 0, within95: out.summary.within95, unlisted },
    stepsCopies: { pass: l.copiesOnStep === l.copies, share: l.copiesOnStep / l.copies },
    stepsShown: { pass: l.halfStep === 0, share: l.shownOnStep / l.shown, halfStep: l.halfStep },
    stepsDoings: { pass: d.onSevenSteps === d.values, share: d.onSevenSteps / d.values },
  };
  return out;
}

// ---------------------------------------------------------------- B1 the line game
function b1(name, F) {
  const res = { main: {}, doing: {}, l2: null };
  const days = [], rules = Object.fromEntries(Object.keys(RULES).map((k) => [k, { agree: 0, n: 0 }]));
  rules.TELLS = { agree: 0, n: 0 };
  let decisions = 0, ties = 0;
  const onPairs = (ps, aim) => {
    if (ps.length < 2) return;
    const vals = ps.map((p) => oracleValue(F, p, aim)), best = Math.max(...vals);
    const bestSet = new Set(ps.filter((p, i) => vals[i] >= best - 1e-9));
    decisions++; if (bestSet.size > 1) ties++;
    for (const [k, rule] of Object.entries(RULES)) { rules[k].n++; if (bestSet.has(rule(F, [...ps], aim))) rules[k].agree++; }
  };
  for (const [bot, o] of Object.entries(BOTS)) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(playLine(F, s, "b1", { ...o, kinds: KINDS, onPairs: bot === "TELLS" ? onPairs : null }));
    res.main[bot] = sumRuns(rs);
    const rd = [];
    for (let s = 1; s <= N; s++) rd.push(playLine(F, s, "b1d", { ...o, kinds: KINDS_DOING }));
    res.doing[bot] = sumRuns(rd);
    console.error(name, bot, "done");
  }
  const share = Object.fromEntries(Object.entries(rules).filter(([k, v]) => v.n).map(([k, v]) => [k, v.agree / v.n]));
  res.l2 = { seededDays: decisions, daysWithTiedBest: ties, bestMoveShareByRule: share, maxShare: Math.max(...Object.values(share)), pass: Math.max(...Object.values(share)) <= 0.7, rulesTested: Object.keys(RULES) };
  const bl = res.main.BYLOOK.gens.median, tl = res.main.TELLS.gens.median;
  res.l1 = { byLookGensMedian: bl, tellsGensMedian: tl, fewer: bl === INF ? null : 1 - tl / bl, pass: tl !== INF && (bl === INF || tl <= 0.7 * bl) };
  return res;
}

// ---------------------------------------------------------------- B2 kin against wild blood
function b2(name, F) {
  const out = {};
  for (const [bot, o] of Object.entries({ "KIN-ONLY": { wild: false }, WILD: { wild: true } })) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(playLine(F, s, "b2", { score: "TELLS", mode: "replan", kinds: KINDS, ...o }));
    out[bot] = { ...sumRuns(rs), wildMetMean: mean(rs.map((x) => x.wildMet)), wildUsedMean: mean(rs.map((x) => x.wildUsed)), expeditionsMean: mean(rs.map((x) => x.expeditions)) };
    out[bot]._r = rs.map((x) => ({ days: x.days, minutes: x.reached ? x.minutes : INF }));
  }
  const a = out["KIN-ONLY"], b = out.WILD;
  const soonerDays = a.days.median < b.days.median, soonerMin = q(a._r.map((x) => x.minutes), 0.5) < q(b._r.map((x) => x.minutes), 0.5);
  const sooner = a._r.filter((x, i) => x.minutes < b._r[i].minutes).length / N;
  delete a._r; delete b._r;
  out.line = { pass: !soonerDays, kinOnlySoonerInMedianDays: soonerDays, kinOnlySoonerInMedianMinutes: soonerMin, kinOnlyFirstOnSeedsShare: sooner, kinOnlyDaysMedian: a.days.median, wildDaysMedian: b.days.median, kinOnlyHoursMedian: a.hours.median, wildHoursMedian: b.hours.median };
  return out;
}

// ---------------------------------------------------------------- B3 one row against re-planning
function b3(name, F) {
  const out = {};
  const rs1 = [], rs2 = [];
  for (let s = 1; s <= N; s++) {
    rs1.push(playLine(F, s, "b3", { score: "TELLS", mode: "row", kinds: KINDS }));
    rs2.push(playLine(F, s, "b3", { score: "TELLS", mode: "replan", kinds: KINDS, observe: true }));
  }
  out["ONE-ROW"] = sumRuns(rs1); out["RE-PLAN"] = sumRuns(rs2);
  const picks = rs2.reduce((s, x) => s + x.picks, 0), changed = rs2.reduce((s, x) => s + x.changed, 0);
  out.hatchChangesPick = { picksAfterAHatch: picks, changed, share: picks ? changed / picks : null, perSeedMedian: q(rs2.filter((x) => x.picks).map((x) => x.changed / x.picks), 0.5) };
  const hr = out["RE-PLAN"].hatches.median, ho = out["ONE-ROW"].hatches.median;
  out.lines = { replanNoMoreHatches: { pass: hr <= ho, replan: hr, oneRow: ho }, hatchChangesPick: { pass: (changed / picks) >= 1 / 3, share: changed / picks } };
  return out;
}

const FN = { b0, b1, b2, b3 }[ROUND];
if (!FN) throw new Error("round b0|b1|b2|b3");
const res = { round: ROUND, seeds: N, engine: "origin/main 82462ee (E1, PR 469)", frames: {} };
const t0 = Date.now();
for (const [name, F] of Object.entries(FRAMES)) {
  if (process.argv[5] && process.argv[5] !== name) continue;   // optional: one frame only (run the two in parallel)
  useFrame(F);
  res.frames[name] = FN(name, F);
  console.error(ROUND, name, "done", Math.round((Date.now() - t0) / 1000), "s");
}
useFrame(FRAMES.L);
writeFileSync(OUT, JSON.stringify(res, jsonInf, 1));
console.log("written", OUT);
