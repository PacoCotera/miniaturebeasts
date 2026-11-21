// lab-sim-1: a headless bot plays the Station's lab on the real genetics engine (see engine.mjs).
// Model per the brief (the samples and the lab's deduction game). Assumptions are listed in ASSUMPTIONS and
// written into the results.
import { rng, drawGenome, outcomes, crossChild, podOf, countOn, kinOf, refuses, SELF_KINSHIP, BLENDS } from "./engine.mjs";

export const CAP_DAYS = 120;
export const COST = { E: 2, Es: 4 };                         // a cross (brief); a wild one's pod grows at the same price
export const START = { E: 3, Es: 4 };                        // the first trip's state (econ-decided-1 final: Energy 3, Essence 4)
export const HAUL = { calm: { E: 1, Es: 2 }, rain: { E: 3, Es: 2 }, storm: { E: 5, Es: 2 } };
export const WEATHER_MIX = { calm: 1 / 3, rain: 1 / 3, storm: 1 / 3 };   // playtest seeds: 12 weather walks to 6 calm
export const P_MEET = 0.5, P_DUSK = 1 / 3, P_DROP = 0.5, POUCH = 4, VIV = 8, SEASON = 8;
export const ASSUMPTIONS = [
  "Wild alleles drawn at 0.35 (pale) and 0.5 (crest) per copy; the policy's prior is the same.",
  "Weather per turn: calm, rain, storm 1/3 each (the playtest mix is 12 weather seeds to 6 calm); dusk on 1/3 of turns.",
  "Haul per expedition: Energy 1 calm / 3 rain / 5 storm (econ-decided-1: median 4.5 on weather walks, scarce on calm); Essence 2 (not measured in the run; assumed). Start Energy 3, Essence 4. No top-up.",
  "A wild one is met on a turn with chance 0.5 when its land is visited; at most two new habits are watched per meeting (weather habit, dusk bed, feeding in that order).",
  "Habits: shake-dry (rain, storm) gives a tuft (Markings); calm (calm) a track (Drive); sleep-curled (dusk) a bed (Efficiency); feeding (always) a whisker (Crown or Eyes). One tuft more per wild one per new season.",
  "Drops: per turn a wild one that is not met and whose weather or dusk habit holds leaves its sample with chance 0.5, one waiting at a time; picked up on the next visit to its land.",
  "Bench: one sample at a time, 30 minutes (first ever 2); one a day, two on a day with two expeditions. An analysis ends before the next session. Incubator: one cross or pod a day, an adult by the next session.",
  "Expedition 10-20 minutes (uniform). Session 1 minutes: first ink = end of the expedition that gave the first sample + 2.",
  "Wild cross: the wild one met that day crosses with one of the player's adults (decided at home, as if on the expedition); the wild one stays wild. A pod of a wild one after 3 habits (once) is the engine's shedPod, grown at a cross's price.",
  "Vivarium of 8: a new adult at 8 replaces the lowest-scoring adult (pale 3, known carrier 2, else 0; oldest first).",
  "Goal: two adults that both show pale and may cross (engine: not direct kin). Generations: 0 for home Loika and pods, a cross child is max(parents)+1. Cap 120 days.",
];

// ---------------------------------------------------------------- events, the same for every policy
export function makeEvents(seed) {
  const r = rng(`labsim:${seed}:events`);
  const T = CAP_DAYS * 2 + 4;
  const ev = { weather: [], dusk: [], met: [], drop: [], pick: [], expPerDay: [], minutes: [] };
  for (let t = 0; t < T; t++) {
    const u = r();
    ev.weather.push(u < WEATHER_MIX.calm ? "calm" : u < WEATHER_MIX.calm + WEATHER_MIX.rain ? "rain" : "storm");
    ev.dusk.push(r() < P_DUSK);
    ev.met.push([0, 1, 2, 3].map(() => r() < P_MEET));
    ev.drop.push([0, 1, 2, 3].map(() => r() < P_DROP));
    ev.pick.push(r());
    ev.minutes.push(10 + Math.floor(r() * 11));
  }
  for (let d = 0; d <= CAP_DAYS + 1; d++) ev.expPerDay.push(r() < 0.5 ? 1 : 2);
  return ev;
}

// The world: four wild Loikas (two lands), a home Loika. Drawn until at least one wild one carries a
// hidden pale copy and at most one shows pale; `natural` says whether the first draw already did.
export function makeWorld(seed) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const r = rng(`labsim:${seed}:world:${attempt}`);
    const wild = [0, 1, 2, 3].map(() => drawGenome(r, { kind: "wild" }));
    const home = drawGenome(r, { kind: "pod" });
    const m = wild.map((g) => countOn(g, "M"));
    const ok = m.some((n) => n === 1) && m.filter((n) => n === 2).length <= 1;
    if (ok) return { wild, home, natural: attempt === 0, attempt, m };
  }
  throw new Error("no world");
}
export function naturalShare(n = 200) {
  let ok = 0, carrier = 0, atMostOne = 0;
  for (let s = 1; s <= n; s++) {
    const r = rng(`labsim:${s}:world:0`);
    const wild = [0, 1, 2, 3].map(() => drawGenome(r, { kind: "wild" }));
    drawGenome(r, { kind: "pod" });
    const m = wild.map((g) => countOn(g, "M"));
    const c = m.some((x) => x === 1), a = m.filter((x) => x === 2).length <= 1;
    if (c) carrier++;
    if (a) atMostOne++;
    if (c && a) ok++;
  }
  return { ok, carrier, atMostOne, n };
}

// ---------------------------------------------------------------- knowledge (ink)
const PI = { M: [0.65 * 0.65, 2 * 0.35 * 0.65, 0.35 * 0.35], C: [0.25, 0.5, 0.25] };
const HABITS = [
  { id: "shake-dry", kind: "tuft", holds: (w) => w !== "calm" },
  { id: "calm", kind: "track", holds: (w) => w === "calm" },
  { id: "sleep-curled", kind: "bed", holds: (w, dusk) => dusk },
  { id: "feed", kind: "whisker", holds: () => true },
];
const QUESTIONS = { tuft: ["M"], track: ["D"], bed: ["F"], whisker: ["C", "E"] };
const wildLand = (w) => (w < 2 ? 0 : 1);

function shownSets(genome) {
  return { M: countOn(genome, "M") === 2 ? [2] : [0, 1], C: countOn(genome, "C") > 0 ? [1, 2] : [0] };
}

export function newState(seed, policyName) {
  const world = makeWorld(seed);
  const S = {
    seed, policy: policyName, world, ev: makeEvents(seed), day: 1, turn: 0,
    recs: new Map(), K: new Map(), nextId: 1,
    wild: [], adults: [], young: null, pouch: [], supplies: { ...START },
    bench: [], settledDay: {}, firstInk: null, inkCount: 0, dead: 0, days: 0,
    firstSampleMin: null, sessionMin: 0, benchUsed: 0, crossRng: 0,
    metToday: new Set(), prng: rng(`labsim:${seed}:policy:${policyName}`),
  };
  S.lookup = (id) => S.recs.get(id) ?? null;
  for (let i = 0; i < 4; i++) {
    const rec = { id: S.nextId++, genome: world.wild[i], parents: [], k: 0, kind: "wild", slot: i, gen: 0 };
    S.recs.set(rec.id, rec); S.wild.push(rec.id);
    S.K.set(rec.id, { shown: false, M: [0, 1, 2], C: [0, 1, 2], E: false, D: false, F: false, habits: new Set(), podDone: false, lastSeason: -1, drop: null });
  }
  const home = addOwn(S, world.home, [], 0, 0);
  S.adults.push(home.id);
  return S;
}

function addOwn(S, genome, parents, k, gen) {
  const rec = { id: S.nextId++, genome, parents, k, kind: "own", gen };
  S.recs.set(rec.id, rec);
  const sh = shownSets(genome);
  S.K.set(rec.id, { shown: true, M: sh.M, C: sh.C, E: true, D: true, F: true, habits: new Set(), podDone: true, lastSeason: -1, drop: null });
  return rec;
}

const sameSet = (a, b) => a.length === b.length;
function ink(S, before, after) { if (before > 1 && after === 1) { S.inkCount++; if (!S.firstInk) S.firstInk = { day: S.day, minute: S.sessionMin }; } }

function setTo(S, id, T, arr) {
  const K = S.K.get(id);
  const next = K[T].filter((n) => arr.includes(n));
  if (!next.length || next.length === K[T].length) return false;
  ink(S, K[T].length, next.length);
  K[T] = next;
  return true;
}

// The Station's kin logic: what the known copies force, after every clue (the engine's forecast gives
// what a cross can give; the loop is arc consistency over every parent-child link).
export function propagate(S) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of S.recs.values()) {
      if (c.parents.length !== 2) continue;
      const [p, q] = c.parents, self = p === q;
      for (const T of ["M", "C"]) {
        const Kc = S.K.get(c.id)[T], Kp = S.K.get(p)[T], Kq = S.K.get(q)[T];
        const sc = new Set(), sp = new Set(), sq = new Set();
        for (const a of Kp) for (const b of Kq) {
          if (self && a !== b) continue;
          const out = outcomes(T, a, b, c.k);
          for (let n = 0; n < 3; n++) if (out[n] > 1e-9 && Kc.includes(n)) { sc.add(n); sp.add(a); sq.add(b); }
        }
        if (setTo(S, c.id, T, [...sc])) changed = true;
        if (setTo(S, p, T, [...sp])) changed = true;
        if (setTo(S, q, T, [...sq])) changed = true;
      }
    }
  }
  for (const w of S.wild) if (S.settledDay[w] == null && settled(S, w)) S.settledDay[w] = S.day;
}
export function settled(S, id) { const K = S.K.get(id); return K.M.length === 1 && K.C.length === 1 && K.E && K.D && K.F; }

function observe(S, w) {
  const K = S.K.get(w);
  if (K.shown) return;
  K.shown = true;
  const sh = shownSets(S.recs.get(w).genome);
  const keep = [S.inkCount, S.firstInk];                 // a shown look is an observation, not ink
  setTo(S, w, "M", sh.M); setTo(S, w, "C", sh.C);
  [S.inkCount, S.firstInk] = keep;
}

// ---------------------------------------------------------------- beliefs
const wts = (T, set) => { const w = set.map((n) => PI[T][n]); const s = w.reduce((a, b) => a + b, 0); return w.map((x) => x / s); };
export function entropy(T, set) { return wts(T, set).reduce((h, p) => (p > 0 ? h - p * Math.log2(p) : h), 0); }
export const pencil = (T, set) => { const w = wts(T, set); return set[w.indexOf(Math.max(...w))]; };
const counts = (S, id, T) => S.K.get(id)[T];
const palePencil = (S, id) => pencil("M", counts(S, id, "M"));

// What a cross of a x b can tell and give, on Markings, by the engine's outcomes.
export function crossValue(S, a, b) {
  const ra = S.recs.get(a), rb = S.recs.get(b), self = a === b;
  const k = self ? SELF_KINSHIP : kinOf(ra, rb, S.lookup);
  const Ka = counts(S, a, "M"), Kb = counts(S, b, "M"), wa = wts("M", Ka), wb = wts("M", Kb);
  let pPale = 0, pCarrier = 0;
  const cells = [];
  Ka.forEach((na, i) => Kb.forEach((nb, j) => {
    if (self && na !== nb) return;
    const w = wa[i] * wb[j], out = outcomes("M", na, nb, k);
    cells.push({ na, nb, w, pale: out[2] });
    pPale += w * out[2]; pCarrier += w * out[1];
  }));
  const tot = cells.reduce((s, c) => s + c.w, 0);
  pPale /= tot; pCarrier /= tot;
  const post = (pred) => {
    const ca = new Map(), cb = new Map(); let z = 0;
    for (const c of cells) { const w = c.w * pred(c); z += w; ca.set(c.na, (ca.get(c.na) ?? 0) + w); cb.set(c.nb, (cb.get(c.nb) ?? 0) + w); }
    const h = (m) => { let s = 0; for (const v of m.values()) if (v > 0 && z > 0) s -= (v / z) * Math.log2(v / z); return s; };
    return { z, h: self ? h(ca) : h(ca) + h(cb) };
  };
  const yes = post((c) => c.pale), no = post((c) => 1 - c.pale);
  const before = self ? entropy("M", Ka) : entropy("M", Ka) + entropy("M", Kb);
  const after = (yes.z / tot) * yes.h + (no.z / tot) * no.h;
  const gain = Math.max(0, before - after);
  return { pPale, pCarrier, gain, score: gain + 1.5 * pPale + 0.3 * pCarrier };
}

// ---------------------------------------------------------------- candidate actions at home
const key2 = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
export function candidates(S) {
  const out = [];
  // samples
  S.pouch.forEach((s, idx) => {
    for (const q of QUESTIONS[s.kind]) if (openQ(S, s.wild, q)) out.push({ id: `S:${s.wild}:${q}`, type: "S", wild: s.wild, q, idx });
  });
  const canPay = S.supplies.E >= COST.E && S.supplies.Es >= COST.Es && !S.incubating;
  if (canPay) {
    const ad = S.adults;
    for (let i = 0; i < ad.length; i++) for (let j = i + 1; j < ad.length; j++) {
      if (refuses(S.recs.get(ad[i]), S.recs.get(ad[j]), S.lookup)) continue;
      out.push({ id: `X:${key2(ad[i], ad[j])}`, type: "X", a: ad[i], b: ad[j] });
    }
    for (const w of S.metToday) for (const a of ad) {
      if (refuses(S.recs.get(w), S.recs.get(a), S.lookup)) continue;
      out.push({ id: `W:${w}|${a}`, type: "W", a: w, b: a });
    }
    for (const w of S.wild) {
      const K = S.K.get(w);
      if (K.habits.size >= 3 && !K.podDone) out.push({ id: `P:${w}`, type: "P", a: w, b: w });
    }
  }
  return out;
}
function openQ(S, w, q) {
  const K = S.K.get(w);
  return q === "M" || q === "C" ? K[q].length > 1 : !K[q];
}

// ---------------------------------------------------------------- policies
const byId = (xs) => [...xs].sort((a, b) => (a.id < b.id ? -1 : 1));
const crosses = (c) => c.filter((x) => x.type === "X" || x.type === "W" || x.type === "P");
const blindCrosses = (c) => c.filter((x) => x.type === "X" || x.type === "W");
const paleKnown = (S, id) => S.K.get(id).M.length === 1;
const inkScore = (S, id) => { const K = S.K.get(id).M; return K.length > 1 ? 0 : K[0] === 2 ? 3 : K[0] === 1 ? 2 : 1; };
const isPale = (S, id) => S.K.get(id).M.length === 1 && S.K.get(id).M[0] === 2;
const pick = (S, xs) => xs[Math.floor(S.prng() * xs.length)];
const first = (xs) => byId(xs)[0];

const PENCIL_P = (S, c) => { const pa = palePencil(S, c.a), pb = palePencil(S, c.b); const k = c.a === c.b ? SELF_KINSHIP : kinOf(S.recs.get(c.a), S.recs.get(c.b), S.lookup); return outcomes("M", pa, pb, k)[2]; };

// Scores for INFORMED
function informedScore(S, c) {
  if (c.type === "S") {
    const own = S.recs.get(c.wild).kind === "own";
    if (c.q === "M") return entropy("M", S.K.get(c.wild).M) * (own ? 1 : 0.8);
    if (c.q === "C") return 0.05 * entropy("C", S.K.get(c.wild).C);
    return 0.02;
  }
  const v = crossValue(S, c.a, c.b);
  return c.type === "P" ? v.score * 0.9 + 0.5 : v.score;
}
const TAU = 0.25;

// rule(S, cands) -> the policy's primary action id (or null for no opinion); `det` forces determinism.
const RULES = {
  a: (S, c) => { const s = byId(c.filter((x) => x.type === "S" && x.q === "M")); return s[0] ?? null; },
  b: (S, c) => {
    const x = blindCrosses(c).filter((z) => isPale(S, z.a) || isPale(S, z.b));
    if (!x.length) return null;
    const open = x.filter((z) => !(paleKnown(S, z.a) && paleKnown(S, z.b)));
    return first(open.length ? open : x);
  },
  c: (S, c) => { const x = byId(blindCrosses(c)); if (!x.length) return null; return x.sort((p, q) => inkScore(S, q.a) + inkScore(S, q.b) - inkScore(S, p.a) - inkScore(S, p.b))[0]; },
  d: (S, c) => { const x = byId(blindCrosses(c)); if (!x.length) return null; return x.sort((p, q) => PENCIL_P(S, q) - PENCIL_P(S, p))[0]; },
  e: (S, c) => { const x = byId(blindCrosses(c)).filter((z) => paleKnown(S, z.a) && paleKnown(S, z.b)); return x[0] ?? first(c.filter((z) => z.type === "S")) ?? null; },
  f: (S, c) => first(c.filter((x) => x.type === "W")) ?? null,
};
const RULE_SAMPLES = { a: true, e: true };

function blindPick(S, c, det) { const x = blindCrosses(c); return x.length ? (det ? first(x) : pick(S, x)) : null; }

// Returns the day's plan: the primary action and the actions to run.
export function plan(S, c, name, det = false) {
  if (name === "BLIND") { const p = blindPick(S, c, det); return { primary: p, run: p ? [p] : [] }; }
  if (name === "INFORMED") {
    if (!c.length) return { primary: null, run: [] };
    const scored = c.map((x) => ({ x, s: informedScore(S, x) })).sort((p, q) => q.s - p.s || (p.x.id < q.x.id ? -1 : 1));
    const run = [];
    const used = new Set();
    const crossBest = scored.find((z) => z.x.type !== "S" && z.s >= TAU);
    if (crossBest) run.push(crossBest.x);
    for (const z of scored) if (z.x.type === "S" && !used.has(z.x.idx)) { used.add(z.x.idx); run.push(z.x); }
    const top = scored[0];
    const primary = top.x.type === "S" || top.s >= TAU ? top.x : null;
    return { primary, run };
  }
  const rule = name.replace("RULE-", "");
  const p = RULES[rule](S, c);
  const run = [];
  if (RULE_SAMPLES[rule]) {
    const ss = byId(c.filter((x) => x.type === "S")).sort((x, y) => (y.q === "M") - (x.q === "M"));   // Markings first
    for (const s of ss) if (!run.some((r) => r.idx === s.idx)) run.push(s);
  }
  let cr = p && p.type !== "S" ? p : null;
  if (!cr && rule !== "e") cr = blindPick(S, c, det);
  if (cr) run.push(cr);
  return { primary: p ?? cr, run };
}

// ---------------------------------------------------------------- the world turn
function expeditionLand(S, name, t) {
  if (name !== "INFORMED") return S.ev.pick[t] < 0.5 ? 0 : 1;
  const val = [0, 0];
  for (const w of S.wild) {
    const K = S.K.get(w), L = wildLand(S.recs.get(w).slot);
    let v = 0;
    if (!K.shown) v += 1.0;
    if (K.M.length > 1) v += 0.6;
    if (!settled(S, w)) v += 0.2;
    if (K.habits.size < 3) v += 0.3;
    val[L] += 0.5 * v + (K.drop && S.pouch.length < POUCH ? 0.9 : 0);
  }
  if (S.adults.length < 2) val[0] += 0.0;
  return val[0] === val[1] ? (S.ev.pick[t] < 0.5 ? 0 : 1) : val[1] > val[0] ? 1 : 0;
}

function addSample(S, w, kind) { if (S.pouch.length < POUCH) { S.pouch.push({ wild: w, kind }); return true; } return false; }

function expedition(S, name) {
  const t = S.turn++, season = Math.floor(t / SEASON);
  const weather = S.ev.weather[t], dusk = S.ev.dusk[t];
  const land = expeditionLand(S, name, t);
  const minutes = S.ev.minutes[t];
  if (S.day === 1) S.sessionMin += minutes;
  let gotSample = false;
  for (const w of S.wild) {
    const K = S.K.get(w), slot = S.recs.get(w).slot, inLand = wildLand(slot) === land;
    const met = inLand && S.ev.met[t][slot];
    if (inLand && K.drop && addSample(S, w, K.drop)) { K.drop = null; gotSample = true; }
    if (met) {
      S.metToday.add(w);
      observe(S, w);
      let n = 0;
      for (const h of HABITS) {
        if (n >= 2) break;
        if (K.habits.has(h.id) || !h.holds(weather, dusk)) continue;
        K.habits.add(h.id); n++;
        if (addSample(S, w, h.kind)) gotSample = true;
      }
      if (season > K.lastSeason && K.lastSeason >= 0 && K.habits.size > 0) { if (addSample(S, w, "tuft")) gotSample = true; }
      K.lastSeason = season;
    } else if (!K.drop && S.ev.drop[t][slot]) {
      // a drop forms where a habit's conditions held while the player was elsewhere
      const hs = HABITS.filter((h) => h.id !== "feed" && h.holds(weather, dusk));
      if (hs.length) K.drop = hs[Math.floor(S.ev.pick[t] * 997) % hs.length].kind;
    }
  }
  if (gotSample && S.day === 1 && S.firstSampleMin == null) S.firstSampleMin = S.sessionMin;
  const h = HAUL[weather];
  S.supplies.E += h.E; S.supplies.Es += h.Es;
}

function ownScore(S, id) { const K = S.K.get(id).M; const base = K.length === 1 ? (K[0] === 2 ? 3 : K[0] === 1 ? 2 : 0) : 0; return base; }

function arrive(S, child) {
  if (S.adults.length >= VIV) {
    const worst = [...S.adults].sort((a, b) => ownScore(S, a) - ownScore(S, b) || a - b)[0];
    S.adults.splice(S.adults.indexOf(worst), 1);
  }
  S.adults.push(child.id);
}

function startCross(S, act) {
  S.supplies.E -= COST.E; S.supplies.Es -= COST.Es;
  const lookup = S.lookup;
  let genome, parents, k, gen;
  const r = rng(`labsim:${S.seed}:${S.policy}:cross:${S.crossRng++}`);
  if (act.type === "P") {
    genome = podOf(S.recs.get(act.a), r); parents = [act.a, act.a]; k = SELF_KINSHIP; gen = 0;
    S.K.get(act.a).podDone = true;
  } else {
    const ra = S.recs.get(act.a), rb = S.recs.get(act.b);
    genome = crossChild(ra, rb, r, lookup); parents = [act.a, act.b]; k = kinOf(ra, rb, lookup);
    gen = Math.max(ra.kind === "own" ? ra.gen : 0, rb.kind === "own" ? rb.gen : 0) + 1;
  }
  S.incubating = genome ? { genome, parents, k, gen, pod: act.type === "P", wild: act.type === "P" ? act.a : null } : "failed";
}

function resolveOvernight(S) {
  // incubator: the bud hatched and grew; its shown looks are settled by the hatch
  const inc = S.incubating;
  S.incubating = null;
  if (inc && inc !== "failed") {
    const rec = addOwn(S, inc.genome, inc.parents, inc.k, inc.gen);
    if (inc.pod) {
      const K = S.K.get(inc.wild); K.E = true; K.D = true; K.F = true;   // the wild one's shown looks at full detail
      observe(S, inc.wild);
    }
    arrive(S, rec);
    propagate(S);
  }
  // the bench: the analyses started yesterday are done
  for (const b of S.bench) applyAnswer(S, b);
  S.bench = [];
  propagate(S);
}

function applyAnswer(S, b) {
  const K = S.K.get(b.wild), g = S.recs.get(b.wild).genome;
  if (b.q === "M" || b.q === "C") setTo(S, b.wild, b.q, [countOn(g, b.q)]);
  else K[b.q] = true;
}

export function goalState(S) {
  const pale = S.adults.filter((id) => countOn(S.recs.get(id).genome, "M") === 2);
  let best = null;
  for (let i = 0; i < pale.length; i++) for (let j = i + 1; j < pale.length; j++) {
    if (refuses(S.recs.get(pale[i]), S.recs.get(pale[j]), S.lookup)) continue;
    const g = Math.max(S.recs.get(pale[i]).gen, S.recs.get(pale[j]).gen);
    if (best == null || g < best) best = g;
  }
  return best;
}

// Runs one game. `observer(S, cands, plan)` is called each day (used for the rule matches).
export function runGame(seed, name, observer = null, opts = {}) {
  const S = newState(seed, name);
  S.incubating = null;
  propagate(S);
  let dead = 0, daysPlayed = 0, result = null;
  for (let day = 1; day <= CAP_DAYS; day++) {
    S.day = day; S.metToday = new Set(); S.benchUsed = 0;
    if (day > 1) resolveOvernight(S);
    const g = goalState(S);
    if (g != null && !result) { result = { reached: true, day, gens: g, unused: S.pouch.length + S.bench.length, dead, days: daysPlayed }; if (!opts.noStop) break; }
    if (!result) daysPlayed = day;
    const n = S.ev.expPerDay[day];
    for (let e = 0; e < n; e++) expedition(S, name);
    S.pouch = S.pouch.filter((s) => QUESTIONS[s.kind].some((q) => openQ(S, s.wild, q)) || name === "BLIND");
    const cands = candidates(S);
    const pl = plan(S, cands, name);
    if (!result && !cands.length) dead++;
    if (observer && !result) observer(S, cands, pl);
    // execute
    let slots = n, crossed = false;
    for (const act of pl.run) {
      if (act.type === "S") {
        if (slots <= 0) continue;
        const s = S.pouch.find((p) => p.wild === act.wild && QUESTIONS[p.kind].includes(act.q));
        if (!s) continue;
        S.pouch.splice(S.pouch.indexOf(s), 1);
        slots--;
        if (day === 1 && !S.firstDone) {
          // the first sample ever takes 2 minutes: it answers inside session 1
          S.firstDone = true;
          const had = S.inkCount;
          applyAnswer(S, { wild: act.wild, q: act.q }); propagate(S);
          if (S.inkCount > had) S.firstInk = { day: 1, minute: S.firstSampleMin + 2 };
        } else S.bench.push({ wild: act.wild, q: act.q });
      } else if (!crossed && S.supplies.E >= COST.E && S.supplies.Es >= COST.Es && !S.incubating) {
        startCross(S, act); crossed = true;
      }
    }
  }
  if (!result) result = { reached: false, day: CAP_DAYS, gens: null, unused: S.pouch.length + S.bench.length, dead, days: daysPlayed };
  result.settled = S.wild.map((w) => S.settledDay[w] ?? null);
  result.firstInk = S.firstInk; result.natural = S.world.natural;
  result.adults = S.adults.length; result.crossCount = S.crossRng;
  return result;
}

export { RULES, HABITS, QUESTIONS, BLENDS };
