// gdd-bot-round-1: node tools/lab-sim/round.mjs [seeds=200] [out=tools/lab-sim/results-gdd-bot-round-1.json]
// Measures the claims of the fresh review (gdd-review-fable-5) on two frames, 200 seeds each. No game change.
import { writeFileSync } from "node:fs";
import { FRAMES } from "./frames.mjs";
import { useFrame, countOn, TRAITS, dominantKeys } from "./engine.mjs";
import { rng } from "../../prototypes/species/framework/draws.mjs";
import { runGame, makeEvents, HABITS, wildLand } from "./sim.mjs";
import { blendLine, mutationLine, kinTable, paleFamily, parentLine, stat, q, VIV, BROOD, MAX_ROUNDS } from "./bench.mjs";

const N = Number(process.argv[2] ?? 200);
const OUT = process.argv[3] ?? new URL("./results-gdd-bot-round-1.json", import.meta.url).pathname;
const INF = Infinity;
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const share = (k, n) => (n ? k / n : null);

// ---------------------------------------------------------------- measure 1: blends
function measure1(F) {
  const reach = [], hold = [], holdDays = [], days = [], dis = [], mut = [], perBlend = {};
  for (const B of F.blends) {
    const rs = [], ms = [];
    for (let s = 1; s <= N; s++) {
      const x = blendLine(F, B, s);
      rs.push(x);
      const m = mutationLine(F, B, s); if (m) ms.push(m);
    }
    reach.push(...rs.map((x) => x.reachGen)); hold.push(...rs.map((x) => x.holdGen)); holdDays.push(...rs.map((x) => x.holdDays));
    days.push(...rs.map((x) => x.days)); dis.push(...rs.map((x) => x.disagree));
    mut.push(...ms);
    perBlend[B.letter] = { role: B.role, holdGen: stat(rs.map((x) => x.holdGen)), disagreeShare: share(sum(rs.map((x) => x.disagree)), sum(rs.map((x) => x.days))), mutations: ms.length ? { n: ms.length, peakGenMedian: q(ms.map((m) => m.peakGen), 0.5), peaksInFirstYoung: share(ms.filter((m) => m.peakGen === 1).length, ms.length) } : null };
  }
  return {
    blends: F.blends.map((b) => `${b.letter} (${b.role})`),
    a: { reachGen: stat(reach), holdGen: stat(hold), holdCrosses: stat(holdDays) },
    b: { days: sum(days), notBest: sum(dis), share: share(sum(dis), sum(days)), perRunMedianShare: null },
    c: {
      runs: mut.length,
      peakGen: stat(mut.map((m) => m.peakGen)),
      peaksInFirstYoung: share(mut.filter((m) => m.peakGen === 1).length, mut.length),
      firstYoungPastPool: share(mut.filter((m) => m.firstPastPool).length, mut.length),
      firstYoungShareOfReach: { median: q(mut.map((m) => m.firstShare), 0.5), p80: q(mut.map((m) => m.firstShare), 0.8) },
      bestShareOfReach: { median: q(mut.map((m) => m.peakShare), 0.5), p80: q(mut.map((m) => m.peakShare), 0.8) },
    },
    perBlend,
  };
}

// ---------------------------------------------------------------- measure 2: kinship
function measure2(F) {
  const tab = {}, names = ["unrelated", "half siblings", "full siblings", "parent-child"];
  const rows = [];
  for (let s = 1; s <= N; s++) rows.push(kinTable(F, s));
  for (const n of names) tab[n] = { kinship: rows[0][n].kinship, engineRefusesTheCross: rows[0][n].refused, paleShare: sum(rows.map((r) => r[n].pale)) / N, exactByEngineForecast: rows[0][n].exact };
  const fam = {};
  for (const pol of ["CLOSE", "AVOID"]) {
    const rs = [];
    for (let s = 1; s <= N; s++) rs.push(paleFamily(F, s, pol));
    const ok = rs.filter((r) => r.reached);
    fam[pol] = {
      reached: ok.length,
      gens: stat(rs.map((r) => (r.reached ? r.gens : INF))), days: stat(rs.map((r) => (r.reached ? r.day : INF))),
      vigourAtGoal: { median: q(ok.map((r) => r.vigour), 0.5), p80: q(ok.map((r) => r.vigour), 0.8), mean: ok.length ? sum(ok.map((r) => r.vigour)) / ok.length : null },
      meanKinshipOfCrosses: { median: q(rs.map((r) => r.meanKinship), 0.5) },
    };
  }
  return { a: tab, b: fam };
}

// ---------------------------------------------------------------- measure 3: flag farming
const HOUR = 60;
// FARM: lift, enter the start place, Call once (the code's guard: an expedition that explored nothing turns nothing),
// End at the flag. Each turn costs `turnMin` real minutes and rolls weather. A drop that formed in the visited land is
// picked up (lab-sim-1's rule: a drop waits at the wild one's land and is taken on a visit to it); nothing is walked, so no
// wild one is met and no habit is noted. Same drop rules and weather mix as the lab-sim (makeEvents), on its own event stream.
function farm(seed, budgetMin, turnMin) {
  const r = rng(`gdd3:${seed}:farm`);
  const slots = [0, 1, 2, 3], drop = slots.map(() => null);
  const open = slots.map(() => ({ tuft: ["M"], track: ["D"], bed: ["F"], whisker: ["C", "E"] }));   // the questions a kind of sample can still answer
  const st = { turns: 0, minutes: 0, samples: 0, useful: 0, met: 0, metCond: 0, obs: 0, data: 0 };
  while (st.minutes < budgetMin) {
    const u = r(), weather = u < 1 / 3 ? "calm" : u < 2 / 3 ? "rain" : "storm", dusk = r() < 1 / 3;
    const drops = slots.map(() => r() < 0.5), pick = r();
    const waiting = [0, 0];
    slots.forEach((w) => { if (drop[w]) waiting[wildLand(w)]++; });
    const land = waiting[0] === waiting[1] ? (pick < 0.5 ? 0 : 1) : waiting[1] > waiting[0] ? 1 : 0;
    st.turns++; st.minutes += turnMin;
    for (const w of slots) {
      const inLand = wildLand(w) === land;
      if (inLand && drop[w]) { st.samples++; if (open[w][drop[w]].length) { open[w][drop[w]].shift(); st.useful++; } drop[w] = null; }
      if (!drop[w] && drops[w]) {
        const hs = HABITS.filter((h) => h.id !== "feed" && h.holds(weather, dusk));
        if (hs.length) drop[w] = hs[Math.floor(pick * 997) % hs.length].kind;
      }
    }
  }
  return st;
}
function measure3(F, FARM_MIN = [0.5, 1, 2, 5]) {
  const honest = { minutes: 0, turns: 0, met: 0, metCond: 0, obs: 0, samples: 0, useful: 0, data: 0, drops: 0, seasons: 0 };
  const perSeed = [];
  const farms = Object.fromEntries(FARM_MIN.map((m) => [m, { minutes: 0, turns: 0, samples: 0, useful: 0, met: 0, metCond: 0, obs: 0, data: 0 }]));
  const perSeedFarm = Object.fromEntries(FARM_MIN.map((m) => [m, []]));
  for (let s = 1; s <= N; s++) {
    let st = null;
    runGame(s, "INFORMED", null, { noStop: true, stopDay: 30, onEnd: (S) => { st = S.stats; } });
    const hrs = st.minutes / HOUR;
    perSeed.push({ samples: st.samples / hrs, data: st.data / hrs, obs: st.obs / hrs, metCond: st.metCond / hrs, met: st.met / hrs });
    honest.minutes += st.minutes; honest.turns += st.turns; honest.met += st.met; honest.metCond += st.metCond; honest.obs += st.obs; honest.samples += st.samples; honest.useful += st.useful; honest.data += st.data; honest.drops += st.dropSamples; honest.seasons += st.seasonSamples;
    for (const m of FARM_MIN) {
      const f = farm(s, st.minutes, m);                                   // the same real minutes as the honest run's expeditions
      const h = f.minutes / HOUR;
      perSeedFarm[m].push({ samples: f.samples / h, data: 0, obs: 0, metCond: 0, met: 0 });
      for (const k of ["minutes", "turns", "samples", "useful", "met", "metCond", "obs", "data"]) farms[m][k] += f[k];
    }
  }
  const rate = (o, k) => o[k] / (o.minutes / HOUR);
  const row = (o, per) => ({ turnsPerHour: rate(o, "turns"), metInConditionsPerHour: rate(o, "metCond"), metPerHour: rate(o, "met"), observationsPerHour: rate(o, "obs"), samplesPerHour: rate(o, "samples"), samplesThatSettleAnOpenQuestionPerHour: rate(o, "useful"), dataPerHour: rate(o, "data"), samplesPerHourMedianOverSeeds: q(per.map((x) => x.samples), 0.5), samplesPerHourP80OverSeeds: q(per.map((x) => x.samples), 0.8) });
  const out = { honest: { ...row(honest, perSeed), fromDrops: honest.drops / (honest.minutes / HOUR), fromSeasonTufts: honest.seasons / (honest.minutes / HOUR), expeditionMinutesMean: honest.minutes / honest.turns }, farm: {} };
  for (const m of FARM_MIN) out.farm[`${m}min`] = row(farms[m], perSeedFarm[m]);
  // the bench caps what a sample is worth: design 5.7 greybox, 10 minutes a sample: at most 6 an hour
  out.benchCapPerHour = 6;
  return out;
}

// ---------------------------------------------------------------- measure 4: the proving gap
function measure4(F) {
  let shown = 0, open = 0, own = 0, runs = [];
  const perTrait = {};
  for (let s = 1; s <= N; s++) {
    let r = null;
    runGame(s, "INFORMED", null, { noStop: true, stopDay: 30, onEnd: (S) => {
      let sh = 0, op = 0, n = 0;
      for (const rec of S.recs.values()) {
        if (rec.kind !== "own") continue;
        n++;
        const K = S.K.get(rec.id);
        for (const T of dominantKeys()) {
          if (countOn(rec.genome, T) < 1) continue;       // not showing the look
          sh++; perTrait[T] ??= { shown: 0, open: 0 }; perTrait[T].shown++;
          if (K[T].length > 1) { op++; perTrait[T].open++; }
        }
      }
      r = { sh, op, n };
    } });
    shown += r.sh; open += r.op; own += r.n; runs.push(r.sh ? r.op / r.sh : null);
  }
  const per = Object.fromEntries(Object.entries(perTrait).map(([T, v]) => [`${T} (${TRAITS[T].trait})`, { shown: v.shown, neverInked: v.open, share: share(v.open, v.shown) }]));
  return { homeRaisedMibis: own, showingADominantLook: shown, hiddenCopyNeverInkedByDay30: open, share: share(open, shown), perSeedMedianShare: q(runs.filter((x) => x != null), 0.5), perSeedP80Share: q(runs.filter((x) => x != null), 0.8), perTrait: per };
}

// ---------------------------------------------------------------- measure 5: one parent against rotating
function measure5(F) {
  const out = {};
  for (const pol of ["KEPT", "KEPT+WILD", "ROTATE"]) {
    const rs = [];
    for (const B of F.blends) for (let s = 1; s <= N; s++) rs.push(parentLine(F, B, s, pol));
    out[pol] = {
      runs: rs.length, reached: rs.filter((x) => x.reached).length,
      generations: stat(rs.map((x) => x.gen)), crosses: stat(rs.map((x) => x.rounds)),
      keptParentCrosses: stat(rs.map((x) => x.keptCrosses)),
      meanKinshipOfCrosses: { median: q(rs.filter((x) => x.meanKinship != null).map((x) => x.meanKinship), 0.5) },
      freshWildOnesNeeded: { median: q(rs.map((x) => x.fresh), 0.5), p80: q(rs.map((x) => x.fresh), 0.8) },
    };
  }
  return out;
}

const res = { seeds: N, settings: { VIV, BROOD, MAX_ROUNDS, note: "pooled over each frame's blends; medians and 80th percentiles over seed x blend runs" }, frames: {} };
const t0 = Date.now();
for (const [name, F] of Object.entries(FRAMES)) {
  useFrame(F);
  res.frames[name] = { m1: measure1(F), m2: measure2(F), m3: measure3(F), m4: measure4(F), m5: measure5(F) };
  console.error(name, "done", Math.round((Date.now() - t0) / 1000), "s");
}
useFrame(FRAMES.LOIKA);
writeFileSync(OUT, JSON.stringify(res, (k, v) => (v === INF ? "inf" : v), 1));
console.log(JSON.stringify(res, (k, v) => (v === INF ? "inf" : v)).length, "bytes written to", OUT);
