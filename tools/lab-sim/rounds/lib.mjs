// b-rounds-harness-1: the shared parts of rounds B0 to B3. Every genetic fact is the real engine on origin/main (E1, PR 469):
// cross(), forecast(), kinship, directKin, vigour.mjs (vigour, pod minutes, the rest). Nothing here copies a rule.
// Frames: L (Loika) and T (the ten-trait test frame of frames.mjs; here its look copies are drawn apart on the scale steps, as the
// engine now draws a wild one's two copies). Nothing in the game changes.
import { rng } from "../../../prototypes/species/framework/draws.mjs";
import { directKin, kinship, forecast, lookLabel, blendRange } from "../../../prototypes/species/framework/cross.mjs";
import { LOCI, copyValue, scaleSteps, onScaleStep, valueRange, isContinuous } from "../../../prototypes/species/framework/catalogue.mjs";
import { vigourOfF, podMinutes, rest as restOf } from "../../../prototypes/species/framework/vigour.mjs";
import { LOIKA, TEST, TEST_FR } from "../frames.mjs";
import { Pop } from "../bench.mjs";

export { rng, directKin, kinship, forecast, lookLabel, blendRange, LOCI, copyValue, scaleSteps, vigourOfF, podMinutes };
export const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export const stat = (xs) => ({ n: xs.length, reached: xs.filter((x) => x !== Infinity).length, median: q(xs, 0.5), p80: q(xs, 0.8) });
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const jsonInf = (k, v) => (v === Infinity ? "inf" : v);
const EPS = 1e-9;

// ---------------------------------------------------------------- the frames (L and T)
// T's wild draw with each look's two copies drawn apart on a scale step (the mean of 3 uniforms, as species.mjs's blendCopy); a doing is one value on both copies.
function drawTest2(F) {
  return (r, origin) => {
    const g = TEST.draw(r, origin);
    for (const b of F.blends) {
      if (b.role !== "look") continue;
      const fr = TEST_FR.loci.find((l) => l.id === b.id), [lo, hi] = blendRange(TEST_FR, fr);
      const one = () => onScaleStep(b.locus, lo + ((r() + r() + r()) / 3) * (hi - lo), [lo, hi]);
      g.loci[b.id] = [one(), one()];
    }
    return g;
  };
}
const T2 = { ...TEST };
T2.draw = drawTest2(T2);
export const FRAMES = { L: LOIKA, T: T2 };
export const SET_ID = "appearance.marking-switch";
export const EYES = "growth.exterior-eye-size-ratio";
export const EARS = "growth.auricular-length-ratio";
export const DRIVE = "movement.cycle-rate";
export const poolOf = (F, id) => blendRange(F.fr, F.fr.loci.find((l) => l.id === id));
export const stepsOf = (F, id) => scaleSteps(LOCI.get(id), poolOf(F, id));
export const doingBand = (F, id) => { const [clo, chi] = valueRange(LOCI.get(id)); return 0.1 * (chi - clo); };

// ---------------------------------------------------------------- the household
function founders(F, r, n = 6) {
  const pop = new Pop(F);
  for (let i = 0; i < n; i++) pop.add(pop.make(F.draw(r, { kind: "wild" }), [], 0));
  return pop;
}
// An aim is a list of traits: { kind: "set", id } (the "on" look, two copies), { kind: "scale", id, step } (a scale at a step,
// both copies), { kind: "doing", id, target } (a doing: one value; the young show it when the engine's window is at or past target).
// The scale step is the highest step at least two of the founders' copies hold, and never below the 4th of the seven (founders are
// redrawn until it is): a copy passes exactly and nothing mutates, so a step no founder holds can never be bred.
export function startLine(F, seed, tag, kinds) {
  const r = rng(`b:${F.name}:${seed}:${tag}`);
  for (let tries = 0; tries < 400; tries++) {
    const pop = founders(F, r);
    const aim = [];
    let ok = true;
    for (const k of kinds) {
      if (k === "set") { aim.push({ kind: "set", id: SET_ID }); continue; }
      if (k === "hset") {
        // round 2 (b): a hidden pair. The aim is a look that hides its copies (the markings set: one copy is a carrier that looks like none).
        // Founders are redrawn until no one shows it yet and at least two copies of it are carried (else it can never be bred).
        const on = pop.active.reduce((s, m) => s + m.genome.loci[SET_ID].filter((c) => c === "on").length, 0);
        if (pop.active.some((m) => m.genome.loci[SET_ID].every((c) => c === "on")) || on < 2) { ok = false; break; }
        aim.push({ kind: "set", id: SET_ID });
        continue;
      }
      const [kind, id] = k.split(":");
      if (kind === "hscale") {
        // round 3: a hidden scale step. The aim step is shown by the mean of two copies, so a pair of unequal copies can show it without holding it.
        // The step is the highest (never below the 4th of the seven) that at least two founder copies hold and that no founder holds on both copies.
        const steps = stepsOf(F, id), held = new Map(), both = new Set();
        for (const m of pop.active) {
          const vs = m.genome.loci[id].map((c) => copyValue(LOCI.get(id), c));
          for (const v of vs) held.set(v, (held.get(v) ?? 0) + 1);
          if (Math.abs(vs[0] - vs[1]) < 1e-7) both.add(vs[0]);
        }
        let best = null;
        steps.forEach((s, i) => { if ((held.get(s) ?? 0) >= 2 && i >= 3 && !both.has(s)) best = { step: s, idx: i }; });
        if (!best) { ok = false; break; }
        aim.push({ kind: "scale", id, step: best.step, idx: best.idx, of: steps.length });
        continue;
      }
      if (kind === "scale") {
        const steps = stepsOf(F, id), held = new Map();
        for (const m of pop.active) for (const c of m.genome.loci[id]) { const v = copyValue(LOCI.get(id), c); held.set(v, (held.get(v) ?? 0) + 1); }
        let best = null;
        steps.forEach((s, i) => { if ((held.get(s) ?? 0) >= 2 && i >= 3) best = { step: s, idx: i }; });
        if (!best) { ok = false; break; }
        aim.push({ kind: "scale", id, step: best.step, idx: best.idx, of: steps.length });
      } else {
        // a doing: the young take the parents' mean plus a nudge of up to a tenth of the range, so "all young show it" needs a target
        // under the pool's top (at the top itself no pair can promise it; 1.5 nudges was not reached in 6 smoke seeds): three nudges under;
        // no founder shows it at the start
        const B = F.blends.find((b) => b.id === id), band = doingBand(F, id), target = B.hi - 3 * band - EPS;
        if (pop.active.some((m) => F.shown(m.genome, id) >= target)) { ok = false; break; }
        aim.push({ kind: "doing", id, target });
      }
    }
    if (ok) return { pop, aim, r };
  }
  throw new Error("no founders for the aim");
}
const copies = (F, m, t) => {
  const cs = m.genome.loci[t.id];
  if (t.kind === "set") return cs.filter((c) => c === "on").length;
  if (t.kind === "scale") return cs.filter((c) => Math.abs(copyValue(LOCI.get(t.id), c) - t.step) < 1e-7).length;
  return 0;
};
export const fixed = (F, m, t) => (t.kind === "doing" ? F.shown(m.genome, t.id) >= t.target : copies(F, m, t) === 2);
export const mibiFixed = (F, m, aim) => aim.every((t) => fixed(F, m, t));

// What the pairing screen can print for a pair, from the engine: per trait the chance a young is fixed (shows the aim on both copies)
// and the expected copies at the aim. (Copies pass exactly, one of each parent's at random: the four pairings of the screen.)
export function odds(F, a, b, k, aim, lookup) {
  return aim.map((t) => {
    if (t.kind === "doing") {
      const w = F.window(a, b, t.id, k, lookup), pf = w[1] < t.target ? 0 : w[0] >= t.target ? 1 : (w[1] - t.target) / (w[1] - w[0] || 1);
      return { pf, ec: pf * 2 };
    }
    const ca = copies(F, a, t), cb = copies(F, b, t);
    return { pf: (ca / 2) * (cb / 2), ec: (ca + cb) / 2 };
  });
}
// The look-only reading (BY-LOOK): how near each of the pair's shown looks is to the aim.
function lookNear(F, m, t) {
  if (t.kind === "set") return m.genome.loci[t.id].filter((c) => c === "on").length === 2 ? 1 : 0;   // shows pale only on two copies
  const [lo, hi] = t.kind === "scale" ? poolOf(F, t.id) : [F.blends.find((b) => b.id === t.id).lo, F.blends.find((b) => b.id === t.id).hi];
  const target = t.kind === "scale" ? t.step : t.target;
  return 1 - Math.abs(F.shown(m.genome, t.id) - target) / (hi - lo || 1);
}
// Round 2 (a): BY-LOOK reads the shown look rounded to a whole step of its scale (a halfway value is read as the nearer step).
function lookNearRound(F, m, t) {
  if (t.kind !== "scale") return lookNear(F, m, t);
  const pool = poolOf(F, t.id), steps = stepsOf(F, t.id), v = F.shown(m.genome, t.id);
  let s = steps[0]; for (const x of steps) if (Math.abs(x - v) < Math.abs(s - v) - 1e-12) s = x;
  return 1 - Math.abs(s - t.step) / (pool[1] - pool[0] || 1);
}
const entropy =(ps) => -ps.filter((p) => p > 0).reduce((s, p) => s + p * Math.log(p), 0);

// Scoring rules. Each returns a number to maximise for a pair p = { a, b, k, od }.
export const SCORES = {
  // BY-LOOK: pairs the two whose looks are nearest the aim (what the page shows, never the copies behind it)
  BYLOOK: (F, p, aim) => aim.reduce((s, t) => s + lookNear(F, p.a, t) + lookNear(F, p.b, t), 0),
  BYLOOKR: (F, p, aim) => aim.reduce((s, t) => s + lookNearRound(F, p.a, t) + lookNearRound(F, p.b, t), 0),
  // TELLS: pairs for what the young will tell about the parents' copies (the spread of the printed odds), then for the aim
  // (the chance the young is fixed on each trait, and on all together); the aim leads, the tell breaks ties.
  TELLS: (F, p, aim) => {
    const pf = p.od.map((o) => o.pf), all = pf.reduce((x, y) => x * y, 1), n = p.od.length;
    const tell = p.od.reduce((s, o) => s + entropy([o.pf, 1 - o.pf]), 0);
    // tells-bot-min-1 (tells-trace-1 section 3): the pair is read by its weaker trait; the two sums over the traits become n x the minimum, every weight and other term unchanged.
    return n * Math.min(...pf) + 2 * all + 0.15 * n * Math.min(...p.od.map((o) => o.ec / 2)) + 0.01 * tell + vigourOfF(p.k);   // vigourOfF: tells-bot-kin-1's kin/vigour term, unweighted
  },
};
// The oracle's value of a move (L2): expected progress of its young per minute of the pod (vigour counted).
export const oracleValue = (F, p, aim) => p.od.reduce((s, o) => s + o.pf + 0.25 * o.ec, 0) / podMinutes(20, vigourOfF(p.k));
// Fixed rules, listed (L2): each picks one pair from the day's pairs.
export const RULES = {
  "nearest looks": (F, ps, aim) => argmax(ps, (p) => SCORES.BYLOOK(F, p, aim)),
  "most aim copies": (F, ps, aim) => argmax(ps, (p) => p.od.reduce((s, o) => s + o.ec, 0)),
  "best with its opposite": (F, ps, aim) => argmax(ps, (p) => Math.max(...[p.a, p.b].map((m) => aim.reduce((s, t) => s + (t.kind === "doing" ? 0 : copies(F, m, t)), 0))) - Math.min(...[p.a, p.b].map((m) => aim.reduce((s, t) => s + (t.kind === "doing" ? 0 : copies(F, m, t)), 0))) * 0.5),
  "least kin": (F, ps, aim) => argmax(ps, (p) => -p.k),
  "most kin": (F, ps, aim) => argmax(ps, (p) => p.k),
  "oldest pair": (F, ps, aim) => argmax(ps, (p) => -(p.a.id + p.b.id)),
  "newest pair": (F, ps, aim) => argmax(ps, (p) => p.a.id + p.b.id),
};
export function argmax(xs, f) { let best = null, bv = -Infinity; for (const x of xs) { const v = f(x); if (v > bv + EPS) { bv = v; best = x; } } return best; }

// ---------------------------------------------------------------- the clock: real minutes, the player awake from 08:00 to 24:00
const DAY = 1440, WAKE = 480;
export const awakeAt = (t) => { const m = t % DAY; return m >= WAKE ? t : t - m + WAKE; };
export const dayOf = (t) => Math.floor(t / DAY) + 1;

// One line game. opts: { score (SCORES key), mode "row"|"replan", capsules 3, aim kinds, wild: bool, kinOnly, cap }.
// A pairing starts a pod (one young), its minutes = podMinutes(20, vigour of the young); both parents then rest (the engine's rest()).
// The young hatch at their minute and join the household (12 kept at hand). Goal: two mibis that may cross and both show the aim,
// so every young of the pair shows it. Hatches, generations of the goal pair and real days are counted.
const MEET = 0.5, TURN_MIN = 15;   // the walk's meet rate and a turn's minutes, as gdd-bot-round-1
export function playLine(F, seed, tag, opts) {
  const { score = "TELLS", mode = "replan", capsules = 3, kinds, wild = false, cap = { hatches: 500, days: 90 }, observe = null } = opts;
  const { pop, aim, r } = startLine(F, seed, `${tag}:start`, kinds);
  const rr = rng(`b:${F.name}:${seed}:${tag}:play`);
  const aimScore = (m) => aim.reduce((s, t) => s + (t.kind === "doing" ? 2 * lookNear(F, m, t) : copies(F, m, t) / 2 + (fixed(F, m, t) ? 1 : 0)), 0);
  const paired = new Map();            // id -> pairing times (ms)
  const slots = Array.from({ length: capsules }, () => null);
  const st = { hatches: 0, expeditions: 0, wildMet: 0, wildUsed: 0, changed: 0, picks: 0, kinPairs: 0, crosses: 0 };
  let t = WAKE, mate = null;           // a wild one met and not yet used
  const restOk = (a, b, now) => {
    for (const [x, y] of [[a, b], [b, a]]) {
      if (x.kind === "wild") continue;
      const rs = restOf({ pairedAt: paired.get(x.id) ?? [], podMinutes: 20, kin: kinship(x, y, pop.lookup) > 0, now: now * 60000 });
      if (rs.until > now * 60000) return false;
    }
    return true;
  };
  const eligible = (now, exclude = new Set(), extra = null) => {
    const out = [], list = [...pop.active, ...(extra ? [extra] : [])];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (exclude.has(a.id) || exclude.has(b.id)) continue;
      if (directKin(a, b, pop.lookup) !== null) continue;
      if (opts.strictPair && slots.some((s) => s && s.pair === `${Math.min(a.id, b.id)}|${Math.max(a.id, b.id)}`)) { st.strictSkips = (st.strictSkips ?? 0) + 1; if (restOk(a, b, now)) st.strictBites = (st.strictBites ?? 0) + 1; continue; }   // round 2 (B3): a pair pairs again only when its last pod hatched
      if (!restOk(a, b, now)) continue;
      const k = kinship(a, b, pop.lookup);
      out.push({ a, b, k, od: odds(F, a, b, k, aim, pop.lookup) });
    }
    return out;
  };
  // every bot is told not to make the same pair's young again and again (two of one pair are siblings and may not cross): 0.25 off per earlier cross of the pair
  const made = new Map(), keyOf = (p) => `${p.a.id}|${p.b.id}`;
  const pick = (ps, now) => argmax(ps.sort((x, y) => (x.a.id - y.a.id) || (x.b.id - y.b.id)), (p) => SCORES[score](F, p, aim) - 0.25 * (made.get(keyOf(p)) ?? 0));
  const goal = () => {
    const fx = pop.active.filter((m) => aim.every((a) => a.kind === "doing" ? true : fixed(F, m, a)));
    for (let i = 0; i < fx.length; i++) for (let j = i + 1; j < fx.length; j++) {
      if (directKin(fx[i], fx[j], pop.lookup) !== null) continue;
      const k = kinship(fx[i], fx[j], pop.lookup);
      if (aim.every((a) => a.kind !== "doing" || F.window(fx[i], fx[j], a.id, k, pop.lookup)[0] >= a.target)) return { a: fx[i], b: fx[j], gen: Math.max(fx[i].gen, fx[j].gen) };
    }
    return null;
  };
  const start = (slot, p, now) => {
    let g;
    if (p.a.kind === "wild" || p.b.kind === "wild") { st.wildUsed++; }
    const child = pop.child(p.a, p.b, rr);
    made.set(keyOf(p), (made.get(keyOf(p)) ?? 0) + 1);
    for (const m of [p.a, p.b]) if (m.kind !== "wild") paired.set(m.id, [...(paired.get(m.id) ?? []), now * 60000].slice(-8));
    const k = child.genome.origin.kinship;
    st.crosses++; if (k > 0) st.kinPairs++;
    slots[slot] = { child, pair: `${Math.min(p.a.id, p.b.id)}|${Math.max(p.a.id, p.b.id)}`, readyAt: now + podMinutes(20, vigourOfF(k)) };
  };
  let fresh = 0;
  while (t <= cap.days * DAY && st.hatches <= cap.hatches) {
    // hatch what is ready
    const hatched = [];
    slots.forEach((s, i) => { if (s && s.readyAt <= t) { hatched.push(s.child); slots[i] = null; } });
    for (const c of hatched) { pop.add(c); st.hatches++; }
    pop.trim(aimScore);
    const g = goal();
    if (g) {
      const rec = [g.a, g.b];
      return { reached: true, hatches: st.hatches, gens: g.gen, days: dayOf(t), minutes: t, vigour: mean(rec.map((m) => vigourOfF(m.genome.origin?.kind === "cross" ? m.genome.origin.kinship : 0))), aim, ...st, fresh };
    }
    // fill capsules
    const free = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    const fills = mode === "row" ? free.length === capsules : free.length > 0;
    if (fills && wild && !mate) {            // an expedition turn: a wild one is met with the walk's chance (the player is away TURN_MIN)
      st.expeditions++; t += TURN_MIN;
      if (rr() < MEET) { const w = pop.make(F.draw(rr, { kind: "wild" }), [], 0); w.kind = "wild"; mate = w; st.wildMet++; }
    }
    if (fills) {
      const used = new Set();
      for (const i of free) {
        const ps = eligible(t, used, mate);
        if (!ps.length) break;
        if (opts.onPairs) opts.onPairs(ps, aim);
        const p = pick(ps, t);
        if (observe && mode === "replan" && hatched.length) {
          // did the hatch change this pick? the pick the same state gives without the young that just hatched
          const ids = new Set([...used, ...hatched.map((h) => h.id)]);
          const before = eligible(t, ids, mate && !hatched.includes(mate) ? mate : null);
          const b = before.length ? pick(before, t) : null;
          st.picks++; if (!b || b.a !== p.a || b.b !== p.b) st.changed++;
        }
        start(i, p, t);
        used.add(p.a.id); used.add(p.b.id);
        if (p.a === mate || p.b === mate) mate = null;
      }
    }
    // when nothing runs and no pair may cross (all direct kin), a fresh wild one is not part of the line game: stuck counts as unreached
    const pend = slots.filter(Boolean).map((s) => s.readyAt);
    if (!pend.length) {
      // nothing in a pod: wait for the rest to end (the earliest time any pair is eligible), at most 24 h on
      let nt = null;
      for (let d = 1; d <= 24 * 12 && nt === null; d++) { const now = t + d * 5; if (eligible(now, new Set(), mate).length) nt = now; }
      if (nt === null) break;
      t = awakeAt(nt);
    } else t = awakeAt(Math.min(...pend));
  }
  return { reached: false, hatches: st.hatches, gens: Infinity, days: Infinity, minutes: t, vigour: null, aim, ...st, fresh };
}

// A day's pairs from a mid-game state, for L2: run the TELLS bot and call back at each decision with the pairs.
export function playForDays(F, seed, kinds, onDay, cap = { hatches: 200, days: 60 }) {
  return playLine(F, seed, "L2", { score: "TELLS", mode: "replan", kinds, cap, observe: false, onPairs: onDay });
}
