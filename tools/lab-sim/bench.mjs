// gdd-bot-round-1: the breeding-line bots (measures 1, 2 and 5). Every cross is the engine's own cross()
// (prototypes/species/framework/cross.mjs) on one of the two frames of frames.mjs; kinship, direct-kin refusals and
// the forecast window are the engine's too. Nothing here copies a rule of the cross.
import { rng } from "../../prototypes/species/framework/draws.mjs";
import { kinship, directKin, SPREAD } from "../../prototypes/species/framework/cross.mjs";
import { quantize } from "../../prototypes/species/framework/catalogue.mjs";

export const VIV = 12;           // mibis kept at hand (the land keeps the rest and gives them back); lab-sim-1's 8 starves a pedigree of unrelated blood
export const BROOD = 6;          // young drawn from one cross when a line is read
export const MAX_ROUNDS = 100;
const EPS = 1e-9;
export const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export const stat = (xs) => ({ n: xs.length, median: q(xs, 0.5), p80: q(xs, 0.8), unreached: xs.filter((x) => x === Infinity).length });
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// A small population of records { id, genome, parents, gen }; lookup by id is what the engine's kinship wants.
export class Pop {
  constructor(F) { this.F = F; this.recs = new Map(); this.active = []; this.next = 1; this.lookup = (id) => this.recs.get(id) ?? null; }
  make(genome, parents, gen) { const rec = { id: this.next++, genome, parents, gen }; this.recs.set(rec.id, rec); return rec; }
  add(rec) { this.active.push(rec); return rec; }
  pairs() {
    const out = [], a = this.active;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (directKin(a[i], a[j], this.lookup) === null) out.push([a[i], a[j]]);
    return out;
  }
  kin(a, b) { return kinship(a, b, this.lookup); }
  // Pairs, and when the whole household is close kin one fresh wild one joins (a wild cross's blood), counted.
  pairsOrFresh(r, accept = () => true) {
    let ps = this.pairs();
    for (let t = 0; t < 3 && !ps.length; t++) {
      let g = this.F.draw(r, { kind: "wild" });
      for (let u = 0; u < 200 && !accept(g); u++) g = this.F.draw(r, { kind: "wild" });
      this.add(this.make(g, [], 0)); this.freshCount = (this.freshCount ?? 0) + 1;
      ps = this.pairs();
    }
    return ps;
  }
  child(a, b, r, opts) {
    const genome = this.F.cross(a, b, r, this.lookup, opts);
    return this.make(genome, [a.id, b.id], Math.max(a.gen, b.gen) + 1);
  }
  trim(score, keep = []) {
    while (this.active.length > VIV) {
      let worst = null;
      for (const x of this.active) if (!keep.includes(x) && (worst == null || score(x) < score(worst) || (score(x) === score(worst) && x.id > worst.id))) worst = x;
      if (!worst) break;
      this.active.splice(this.active.indexOf(worst), 1);
    }
  }
}
// Six wild founders; `accept(genome)` redraws a founder that does not suit (a line is bred toward an end no wild one holds).
function founders(F, r, n = 6, accept = () => true) {
  const pop = new Pop(F);
  for (let i = 0; i < n; i++) {
    let g = F.draw(r, { kind: "wild" });
    for (let t = 0; t < 200 && !accept(g); t++) g = F.draw(r, { kind: "wild" });
    pop.add(pop.make(g, [], 0));
  }
  return pop;
}
const byIds = (p1, p2) => (p1[0].id - p2[0].id) || (p1[1].id - p2[1].id);

// ---------------------------------------------------------------- measure 1: blends
// Line bot: every day cross the best-looking crossable pair (the two highest shown values), draw a brood of six, keep
// the best eight. The end value is the pool's top; "within the small spread" is the engine's SPREAD of the locus range.
export function blendLine(F, B, seed) {
  const r = rng(`gdd1:${F.name}:${seed}:${B.letter}:line`);
  const band = SPREAD * (B.chi - B.clo), target = B.hi - band - EPS;
  const sh = (x) => F.shown(x.genome, B.id);
  const pop = founders(F, r, 6, (g) => F.shown(g, B.id) < target);
  let reachGen = Infinity, holdGen = Infinity, holdDays = Infinity, days = 0, disagree = 0;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const pairs = pop.pairsOrFresh(r, (g) => F.shown(g, B.id) < target).sort(byIds);
    if (!pairs.length) break;
    // (b) the best-looking pair against the pair with the best expected young (the centre of the engine's forecast window)
    const sum = (p) => sh(p[0]) + sh(p[1]);
    const exp = (p) => { const w = F.window(p[0], p[1], B.id, pop.kin(p[0], p[1]), pop.lookup); return (w[0] + w[1]) / 2; };
    const bestSum = Math.max(...pairs.map(sum));
    const looking = pairs.filter((p) => sum(p) >= bestSum - EPS);
    const expOf = new Map(pairs.map((p) => [p, exp(p)]));
    const bestExp = Math.max(...expOf.values());
    days++;
    if (Math.max(...looking.map((p) => expOf.get(p))) < bestExp - EPS) disagree++;
    const best = looking[0];
    const kids = [];
    for (let i = 0; i < BROOD; i++) kids.push(pop.child(best[0], best[1], r));
    const vals = kids.map(sh), gen = kids[0].gen;
    if (reachGen === Infinity && Math.max(...vals) >= target) reachGen = gen;
    if (Math.min(...vals) >= target) { holdGen = gen; holdDays = round; break; }
    for (const k of kids) pop.add(k);
    pop.trim(sh);
  }
  return { reachGen, holdGen, holdDays, days, disagree };
}

// (c) A mutation: a reach cassette stands in for one parent of one pod (design 7.9). The young is the engine's cross of
// the best in-pool partner and a stand-in record holding the cassette's value, on a pool widened to that value.
export function mutationLine(F, B, seed, gensToRun = 12) {
  const r = rng(`gdd1:${F.name}:${seed}:${B.letter}:mut`);
  const roomLow = B.lo - B.clo, roomHigh = B.chi - B.hi;
  const dir = roomHigh >= roomLow ? 1 : -1;
  const reach = Math.min(0.25 * (B.hi - B.lo), Math.max(roomLow, roomHigh));
  if (reach < 1e-6) return null;
  const edge = dir > 0 ? B.hi : B.lo;
  const m = quantize(B.locus, edge + dir * reach, [B.clo, B.chi]);
  const ext = (x) => dir * (F.shown(x.genome, B.id) - edge);
  const pop = founders(F, r);
  const partner = [...pop.active].sort((a, b) => ext(b) - ext(a) || a.id - b.id)[0];
  const donor = pop.active.find((x) => x !== partner);
  const sg = { ...donor.genome, loci: { ...donor.genome.loci, [B.id]: [m, m] }, origin: { kind: "random" } };
  const cass = pop.make(sg, [], 0);
  const wf = (a, b) => F.widened(B.id, F.shown(a.genome, B.id), F.shown(b.genome, B.id));
  const holder = pop.make(F.cross(partner, cass, r, pop.lookup, { fr: wf(partner, cass) }), [partner.id, cass.id], 1);
  pop.add(holder);
  const bestByGen = new Map([[1, ext(holder)]]);
  const sinceNoise = [];
  for (let round = 1; round <= gensToRun * 2; round++) {
    const pairs = pop.pairsOrFresh(r).sort(byIds);
    if (!pairs.length) break;
    const sc = (p) => ext(p[0]) + ext(p[1]);
    const bs = Math.max(...pairs.map(sc)), best = pairs.find((p) => sc(p) >= bs - EPS);
    if (Math.max(best[0].gen, best[1].gen) + 1 > gensToRun) break;
    const fr = wf(best[0], best[1]), kids = [];
    for (let i = 0; i < BROOD; i++) kids.push(pop.child(best[0], best[1], r, { fr }));
    const g = kids[0].gen, top = Math.max(...kids.map(ext));
    bestByGen.set(g, Math.max(bestByGen.get(g) ?? -Infinity, top));
    for (const k of kids) pop.add(k);
    pop.trim(ext, [holder]);
  }
  let peakGen = 1, peak = -Infinity;
  for (const g of [...bestByGen.keys()].sort((a, b) => a - b)) if (bestByGen.get(g) > peak + EPS) { peak = bestByGen.get(g); peakGen = g; }
  const first = ext(holder);
  return { peakGen, firstShare: first / reach, peakShare: peak / reach, firstPastPool: first > EPS, peakPastPool: peak > EPS, reach, m };
}

// ---------------------------------------------------------------- measure 2: the kinship rule
const REC = "appearance.marking-switch";
const carrier = (g) => ({ ...g, loci: { ...g.loci, [REC]: ["off", "on"] }, origin: { kind: "random" } });
// (a) chance of a pale young from two carriers, by pedigree. Pedigrees are built as records with recorded parents,
// the pair's kinship is the engine's, and the young are drawn by cross() on bare copies of the two genomes at that kinship
// (a bare genome is its own individual, so a direct-kin pair the engine refuses can still be drawn for the figure).
export function kinTable(F, seed, draws = 500) {
  const r = rng(`gdd2:${F.name}:${seed}:kin`);
  const pop = new Pop(F);
  const wild = () => pop.make(F.draw(r, { kind: "wild" }), [], 0);
  const A = wild(), B = wild(), P0 = wild(), Q1 = wild(), Q2 = wild();
  A.genome = carrier(A.genome); B.genome = carrier(B.genome);
  P0.genome = carrier(P0.genome);
  const kid = (a, b) => { const c = pop.child(a, b, r); c.genome = carrier(c.genome); return c; };   // a carrier young, as the case needs
  const cases = {
    unrelated: [A, B],
    "half siblings": [kid(P0, Q1), kid(P0, Q2)],
    "full siblings": [kid(P0, Q1), kid(P0, Q1)],
    "parent-child": [P0, kid(P0, Q1)],
  };
  const out = {};
  for (const [name, [x, y]] of Object.entries(cases)) {
    const k = pop.kin(x, y), refused = directKin(x, y, pop.lookup) !== null;
    let pale = 0;
    const gx = { ...x.genome, origin: { kind: "random" } }, gy = { ...y.genome, origin: { kind: "random" } };
    for (let i = 0; i < draws; i++) { const c = F.cross(gx, gy, r, undefined, { kinship: k }); if (F.on(c, REC) === 2) pale++; }
    out[name] = { kinship: k, refused, pale: pale / draws, exact: F.outcomes("M", 1, 1, k)[2] };
  }
  return out;
}

// (b) A pale family for two policies. Four founders (two carriers, two without the pale copy); every genotype is known
// to the bot (the ideal prover, so kinship is the only difference); one cross a day, the young an adult the next day;
// the goal is two pale adults that may cross. Vigour (design 7.6) = 1 - 1.6 x F, F the kinship of a mibi's parents, floor 0.5.
const vigour = (rec, pop) => { if (rec.parents.length !== 2) return 1; const [p, q] = rec.parents.map(pop.lookup); return Math.max(0.5, 1 - 1.6 * pop.kin(p, q)); };
export function paleFamily(F, seed, policy, capDays = 120) {
  const r = rng(`gdd2:${F.name}:${seed}:family:${policy}`);
  const pop = new Pop(F);
  const mk = (n) => { const g = F.draw(r, { kind: "wild" }); g.loci[REC] = n === 0 ? ["off", "off"] : ["off", "on"]; g.origin = { kind: "wild" }; return pop.add(pop.make(g, [], 0)); };
  mk(1); mk(1); mk(1); mk(0); mk(0); mk(0);               // three unrelated carriers and three without the pale copy
  const on = (x) => F.on(x.genome, REC);
  const score = (x) => (on(x) === 2 ? 3 : on(x) === 1 ? 2 : 0);
  let incubating = null, crosses = 0, kinSum = 0;
  for (let day = 1; day <= capDays; day++) {
    if (incubating) { pop.add(incubating); pop.trim(score); incubating = null; }
    const pale = pop.active.filter((x) => on(x) === 2);
    let goal = null;
    for (let i = 0; i < pale.length; i++) for (let j = i + 1; j < pale.length; j++) {
      if (directKin(pale[i], pale[j], pop.lookup) !== null) continue;
      const g = Math.max(pale[i].gen, pale[j].gen);
      if (!goal || g < goal.gen) goal = { gen: g, a: pale[i], b: pale[j] };
    }
    if (goal) return { reached: true, day, gens: goal.gen, vigour: (vigour(goal.a, pop) + vigour(goal.b, pop)) / 2, crosses, meanKinship: crosses ? kinSum / crosses : 0 };
    const cands = pop.pairs().sort(byIds).map(([a, b]) => { const k = pop.kin(a, b); return { a, b, k, p: F.outcomes("M", on(a), on(b), k)[2] }; });
    const live = cands.filter((c) => c.p > EPS);
    const pool = live.length ? live : cands;
    if (!pool.length) continue;
    const sign = policy === "CLOSE" ? -1 : 1;                     // CLOSE: highest kinship first; AVOID: lowest
    pool.sort((x, y) => sign * (x.k - y.k) || y.p - x.p);
    const c = pool[0];
    incubating = pop.child(c.a, c.b, r); crosses++; kinSum += c.k;
  }
  return { reached: false, day: capDays, gens: Infinity, vigour: null, crosses, meanKinship: crosses ? kinSum / crosses : 0 };
}

// ---------------------------------------------------------------- measure 5: one parent against rotating
// The goal is measure 1's reach: a young within the small spread of the pool's top on a blend. KEPT: the best-looking
// founder is a parent of every cross, the other parent the best crossable partner. ROTATE: each cross uses the best
// crossable pair among the last cross's young (the parents turn); the pair of the cross before is not used again.
export function parentLine(F, B, seed, policy) {
  const r = rng(`gdd5:${F.name}:${seed}:${B.letter}:${policy}`);
  const sh = (x) => F.shown(x.genome, B.id);
  const band = SPREAD * (B.chi - B.clo), target = B.hi - band - EPS;
  const pop = founders(F, r, 6, (g) => F.shown(g, B.id) < target);
  const kept = [...pop.active].sort((a, b) => sh(b) - sh(a) || a.id - b.id)[0];
  let lastKids = null, lastParents = [], keptCrosses = 0, kinSum = 0, crosses = 0, freshMates = 0;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    let pair = null;
    if (policy === "KEPT" || policy === "KEPT+WILD") {
      let ps = pop.pairs().filter((p) => p.includes(kept)).sort(byIds);
      for (let t = 0; t < 3 && !ps.length && policy === "KEPT+WILD"; t++) {   // KEPT+WILD: no one may cross the kept parent: a fresh wild mate joins
        let g = F.draw(r, { kind: "wild" });
        for (let u = 0; u < 200 && !(sh({ genome: g }) < target); u++) g = F.draw(r, { kind: "wild" });
        pop.add(pop.make(g, [], 0)); freshMates++;
        ps = pop.pairs().filter((p) => p.includes(kept)).sort(byIds);
      }
      if (!ps.length) break;
      const bs = Math.max(...ps.map((p) => sh(p[0]) + sh(p[1])));
      pair = ps.find((p) => sh(p[0]) + sh(p[1]) >= bs - EPS);
    } else {
      let ps = pop.pairs().sort(byIds);
      const fresh = lastKids ? ps.filter((p) => lastKids.includes(p[0]) && lastKids.includes(p[1])) : ps;
      ps = fresh.length ? fresh : ps.filter((p) => !p.some((x) => lastParents.includes(x)));
      if (!ps.length) ps = pop.pairs().sort(byIds);
      if (!ps.length) break;
      const bs = Math.max(...ps.map((p) => sh(p[0]) + sh(p[1])));
      pair = ps.find((p) => sh(p[0]) + sh(p[1]) >= bs - EPS);
    }
    kinSum += pop.kin(pair[0], pair[1]); crosses++;
    if (pair.includes(kept)) keptCrosses++;
    const kids = [];
    for (let i = 0; i < BROOD; i++) kids.push(pop.child(pair[0], pair[1], r));
    const vals = kids.map(sh);
    if (Math.max(...vals) >= target) return { reached: true, rounds: round, gen: Math.max(...kids.filter((k) => sh(k) >= target).map((k) => k.gen)), keptCrosses, meanKinship: kinSum / crosses, fresh: freshMates + (pop.freshCount ?? 0) };
    for (const k of kids) pop.add(k);
    pop.trim(sh, policy !== "ROTATE" ? [kept] : []);
    lastKids = kids; lastParents = pair;
  }
  return { reached: false, rounds: Infinity, gen: Infinity, keptCrosses, meanKinship: crosses ? kinSum / crosses : null, fresh: freshMates + (pop.freshCount ?? 0) };
}
export { mean };
