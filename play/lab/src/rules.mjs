// The lab bench's rules (lab-greybox-1): pure functions over one JSON-able state, no DOM, no clock of their own (the caller passes `now`). The genetics are the engine's (engine.mjs); what is the lab's own
// is only what the owner asked for: what is known about each Loika (ink), the clues that give it (looks, samples, hatches, what the kin force) and the choices (a question, a cross).
// Knowledge of one Loika: M (Markings) and C (Crown) are the sets of copy counts it can still have (one value left = proven, "ink"); E, D, F (Eyes, Drive, Efficiency) are known or not.
import { rng, drawGenome, outcomes, crossChild, kinOf, refuses, countOn, blendHi, SELF_KINSHIP } from "./engine.mjs";

export const COST = { E: 2, Es: 4 };                           // a cross (the game designer's view: 2 Energy + 4 Essence)
export const START = { E: 3, Es: 4 };                          // the first trip's state (econ-decided-1)
export const HAUL = { calm: { E: 1, Es: 2 }, rain: { E: 3, Es: 2 }, storm: { E: 5, Es: 2 } };
export const P_MEET = 0.5, P_DUSK = 1 / 3, POUCH = 4, VIV = 8;
export const LANDS = ["Meadow", "Wood"];
const WILD_NAMES = ["Bramble", "Sorrel", "Wren", "Reed"];
const HOME_NAME = "Moss";
const CHILD_NAMES = ["Pip", "Fern", "Juniper", "Clover", "Tansy", "Nettle", "Sedge", "Linden", "Hazel", "Rowan", "Alder", "Basil", "Thistle", "Aspen", "Briar", "Sorrel II", "Tarn", "Lark", "Ivy", "Poppy"];
const PI = { M: [0.65 * 0.65, 2 * 0.35 * 0.65, 0.35 * 0.35], C: [0.25, 0.5, 0.25] };   // the prior over copy counts (the sim's)
export const HUNCH = 0.6;                                      // a set whose likeliest value has this share or more shows as a hunch

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const wildLand = (slot) => (slot < 2 ? 0 : 1);

// ---------------------------------------------------------------- words of a value
export function valueWord(T, n) {
  if (T === "M") return ["no pale", "hides pale", "pale"][n];
  if (T === "C") return ["bare", "hides bare", "crest"][n];
  if (T === "E") return n ? "wide" : "thin";
  if (T === "D") return n ? "bursts" : "steady";
  return n ? "thrifty" : "ordinary";
}
const weights = (T, set) => { const w = set.map((n) => PI[T][n]), s = w.reduce((a, b) => a + b, 0); return w.map((x) => x / s); };
export const pencil = (T, set) => { const w = weights(T, set); return set[w.indexOf(Math.max(...w))]; };

// ---------------------------------------------------------------- a new game
export function newGame(frame, seed) {
  let world = null;
  for (let attempt = 0; attempt < 400 && !world; attempt++) {   // at least one wild one hides a pale copy, at most one shows pale (the sim's world)
    const r = rng(`lab:${seed}:world:${attempt}`);
    const wild = [0, 1, 2, 3].map(() => drawGenome(frame, r, { kind: "wild" }));
    const home = drawGenome(frame, r, { kind: "pod" });
    const m = wild.map((g) => countOn(g, "M"));
    if (m.some((n) => n === 1) && m.filter((n) => n === 2).length <= 1) world = { wild, home };
  }
  if (!world) throw new Error("no world");
  const st = { v: 1, seed, turn: 0, nextId: 1, supplies: { ...START }, recs: {}, K: {}, wildIds: [], adults: [], pouch: [], bench: null, benchUsed: 0, bud: null, metNow: [], why: {}, crossN: 0, namesUsed: 0, log: [], last: null };
  world.wild.forEach((g, i) => {
    const id = st.nextId++;
    st.recs[id] = { id, name: WILD_NAMES[i], kind: "wild", genome: g, parents: [], k: 0, gen: 0, slot: i };
    st.K[id] = { M: [0, 1, 2], C: [0, 1, 2], E: false, D: false, F: false, shown: false, habits: [] };
    st.wildIds.push(id);
  });
  addOwn(st, world.home, [], 0, 0, HOME_NAME);
  return st;
}

const shownSets = (g) => ({ M: countOn(g, "M") === 2 ? [2] : [0, 1], C: countOn(g, "C") > 0 ? [1, 2] : [0] });
function addOwn(st, genome, parents, k, gen, name) {
  const id = st.nextId++;
  st.recs[id] = { id, name, kind: "own", genome, parents, k, gen };
  const sh = shownSets(genome);
  st.K[id] = { M: sh.M, C: sh.C, E: true, D: true, F: true, shown: true, habits: [] };   // a hatch settles its shown looks (and the sim's own Loikas know their doings)
  st.adults.push(id);
  return st.recs[id];
}
export const lookupOf = (st) => (id) => st.recs[id] ?? null;
export const nameOf = (st, id) => st.recs[id]?.name ?? "?";

// ---------------------------------------------------------------- ink and the kin logic
function setTo(W, id, T, arr, onInk, cause) {
  const K = W.K[id], next = K[T].filter((n) => arr.includes(n));
  if (!next.length || next.length === K[T].length) return false;
  const before = K[T].length;
  K[T] = next;
  if (onInk && before > 1 && next.length === 1) onInk(id, T, cause);
  return true;
}
// What the known copies force, after every clue: over every parent-child link, a count survives only if the engine's forecast says the cross can give it. W = { recs, K } (the state, or a copy of it).
export function propagate(frame, W, onInk = null) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of Object.values(W.recs)) {
      if (c.parents.length !== 2) continue;
      const [p, q] = c.parents;
      for (const T of ["M", "C"]) {
        const Kc = W.K[c.id][T], Kp = W.K[p][T], Kq = W.K[q][T];
        const sc = new Set(), sp = new Set(), sq = new Set();
        for (const a of Kp) for (const b of Kq) {
          const out = outcomes(frame, T, a, b, c.k);
          for (let n = 0; n < 3; n++) if (out[n] > 1e-9 && Kc.includes(n)) { sc.add(n); sp.add(a); sq.add(b); }
        }
        if (setTo(W, c.id, T, [...sc], onInk, { rel: "child", of: [p, q] })) changed = true;
        if (setTo(W, p, T, [...sp], onInk, { rel: "parent", child: c.id })) changed = true;
        if (setTo(W, q, T, [...sq], onInk, { rel: "parent", child: c.id })) changed = true;
      }
    }
  }
}
const TNAME = { M: "Markings", C: "Crown", E: "Eyes", D: "Drive", F: "Efficiency" };
function inkRecorder(st) {
  return (id, T, cause) => {
    const K = st.K[id], word = valueWord(T, K[T][0]);
    let text;
    if (cause.rel === "parent") { const c = st.recs[cause.child], cv = st.K[c.id][T]; text = `${cap(word)}: ${c.name}, its child, ${cv.length === 1 ? (T === "M" && cv[0] === 2 ? "came out pale" : "shows " + valueWord(T, cv[0])) : "settles it"}.`; }
    else text = `${cap(word)}: its parents ${st.recs[cause.of[0]].name} and ${st.recs[cause.of[1]].name} settle it.`;
    setWhy(st, id, T, text);
  };
}
function setWhy(st, id, T, text) { st.why[id + ":" + T] = { k: `${st.recs[id].name} · ${TNAME[T]}`, t: text }; st.last = { id, T }; }
const settle = (frame, st) => propagate(frame, st, inkRecorder(st));

// What a square shows: known (one value, solid), hunch (the likeliest value of a set, light, with "?") or unknown (white "?").
export function squareOf(st, id, T) {
  const K = st.K[id];
  if (T === "E" || T === "D" || T === "F") return K[T] ? { st: "known", word: valueWord(T, blendHi(st.recs[id].genome, T) ? 1 : 0) } : { st: "unknown", word: "?" };
  const set = K[T];
  if (set.length === 1) return { st: "known", word: valueWord(T, set[0]) };
  const w = weights(T, set), top = Math.max(...w);
  if (top >= HUNCH) return { st: "hunch", word: valueWord(T, set[w.indexOf(top)]) + "?" };
  return { st: "unknown", word: "?" };
}
export const allKnown = (st, id) => ["M", "C", "E", "D", "F"].every((T) => squareOf(st, id, T).st === "known");
export const isPale = (st, id) => st.K[id].M.length === 1 && st.K[id].M[0] === 2;
export const TRAIT_ORDER = ["M", "C", "E", "D", "F"];

// ---------------------------------------------------------------- the goal: two of your adults that both show pale (every child pale)
export function goal(frame, st) {
  const pale = st.adults.filter((id) => countOn(st.recs[id].genome, "M") === 2);
  let pair = null;
  for (let i = 0; i < pale.length && !pair; i++) for (let j = i + 1; j < pale.length; j++) if (!refuses(st.recs[pale[i]], st.recs[pale[j]], lookupOf(st))) { pair = [pale[i], pale[j]]; break; }
  return { got: Math.min(2, pale.length), done: !!pair, pair };
}

// ---------------------------------------------------------------- the expedition (one world turn)
export function expedition(frame, st, land) {
  const t = st.turn++, r = rng(`lab:${st.seed}:turn:${t}`);
  const u = r(), weather = u < 1 / 3 ? "calm" : u < 2 / 3 ? "rain" : "storm", dusk = r() < P_DUSK;
  const inLand = st.wildIds.filter((id) => wildLand(st.recs[id].slot) === land);
  let met = inLand.filter(() => r() < P_MEET);
  if (!met.length) met = [inLand[Math.floor(r() * inLand.length)]];   // the greybox never sends you out to meet no one
  st.metNow = met.slice();
  const report = { turn: t, land, weather, dusk, met: [], haul: { ...HAUL[weather] } };
  const HABITS = [
    { id: "shake-dry", item: "tuft", holds: weather !== "calm" },
    { id: "calm", item: "pawprint", holds: weather === "calm" },
    { id: "sleep-curled", item: "bedding", holds: dusk },
    { id: "feed", item: "whisker", holds: true },
  ];
  for (const id of met) {
    const K = st.K[id], rec = st.recs[id], events = [];
    if (!K.shown) {
      K.shown = true;
      const sh = shownSets(rec.genome);
      setTo(st, id, "M", sh.M); setTo(st, id, "C", sh.C);   // a look is seen, not proven: no ink event
    }
    let n = 0;
    for (const h of HABITS) {
      if (n >= 2) break;
      if (K.habits.includes(h.id) || !h.holds) continue;
      K.habits.push(h.id); n++;
      const ev = { habit: h.id, text: "" };
      if (h.id === "calm" && !K.D) { K.D = true; ev.T = "D"; ev.text = blendHi(rec.genome, "D") ? `${rec.name} climbed the log pile in short bursts.` : `${rec.name} walked the log pile at an even pace.`; setWhy(st, id, "D", `${cap(valueWord("D", blendHi(rec.genome, "D") ? 1 : 0))}: ${ev.text.replace(rec.name + " ", "it ")}`); }
      else if (h.id === "sleep-curled" && !K.F) { K.F = true; ev.T = "F"; ev.text = blendHi(rec.genome, "F") ? `${rec.name} curled up to sleep on a few seeds.` : `${rec.name} ate a heap before it curled up.`; setWhy(st, id, "F", `${cap(valueWord("F", blendHi(rec.genome, "F") ? 1 : 0))}: ${ev.text.replace(rec.name + " ", "it ")}`); }
      else ev.text = `${rec.name} ${h.id === "shake-dry" ? "shook the rain off" : h.id === "feed" ? "fed" : "went about"}; you took a ${h.item}.`;
      if (st.pouch.length < POUCH && questionsFor(st, id).length) { st.pouch.push({ id: `s${t}-${id}-${h.id}`, wild: id, label: `${rec.name}'s ${h.item}` }); ev.sample = `${rec.name}'s ${h.item}`; }
      events.push(ev);
    }
    report.met.push({ id, events });
  }
  st.supplies.E += report.haul.E; st.supplies.Es += report.haul.Es;
  settle(frame, st);
  return report;
}

// ---------------------------------------------------------------- the bench: one sample, one question, one at a time
const ASK = { M: "Hides pale?", C: "Hides bare?", F: "Thrifty?", D: "Bursts?", E: "Wide?" };
export const askWord = (T) => ASK[T];
// The questions a Loika can still be asked: Markings and Crown while their sets are open, and one doing (Efficiency, then Drive, then Eyes) not yet known.
export function questionsFor(st, id) {
  const K = st.K[id], out = [];
  if (K.M.length > 1) out.push("M");
  if (K.C.length > 1) out.push("C");
  const b = ["F", "D", "E"].find((x) => !K[x]);
  if (b) out.push(b);
  return out;
}
export function startSample(st, sampleId, T, now, ms) {
  if (st.bench) return { ok: false, why: "The bench is busy with one sample." };
  const i = st.pouch.findIndex((s) => s.id === sampleId);
  if (i < 0) return { ok: false, why: "That sample is gone." };
  const s = st.pouch[i];
  if (!questionsFor(st, s.wild).includes(T)) return { ok: false, why: "That question is settled." };
  st.pouch.splice(i, 1);
  st.bench = { wild: s.wild, T, label: s.label, start: now, ready: now + ms };
  st.firstDone = true;
  return { ok: true };
}
export function tickBench(frame, st, now) {
  const b = st.bench;
  if (!b || now < b.ready) return null;
  st.bench = null;
  const rec = st.recs[b.wild], K = st.K[b.wild];
  if (b.T === "M" || b.T === "C") {
    const n = countOn(rec.genome, b.T);
    setTo(st, b.wild, b.T, [n]);
    setWhy(st, b.wild, b.T, `${cap(valueWord(b.T, n))}: ${b.label} says so.`);
  } else {
    K[b.T] = true;
    const v = blendHi(rec.genome, b.T) ? 1 : 0;
    setWhy(st, b.wild, b.T, `${cap(valueWord(b.T, v))}: ${b.label} says so.`);
  }
  settle(frame, st);
  return { wild: b.wild, T: b.T };
}

// ---------------------------------------------------------------- the cross
export function partnersFor(st, id) {   // who can stand opposite `id`: your other adults, and a wild one met on the last expedition
  const out = [];
  for (const o of [...st.adults, ...st.metNow]) if (o !== id && !refuses(st.recs[id], st.recs[o], lookupOf(st))) out.push(o);
  return out;
}
export function crossCandidates(st) { return [...st.adults, ...st.metNow]; }
function cloneW(st) { return { recs: JSON.parse(JSON.stringify(st.recs)), K: JSON.parse(JSON.stringify(st.K)) }; }
// A chance as "1 in N" (nearest whole N) or, when that is off by more than 3 points, "about N in M" (M = 10).
export function chanceWord(p) {
  const n = Math.max(1, Math.round(1 / p));
  if (Math.abs(1 / n - p) <= 0.03) return `1 in ${n}`;
  return `about ${Math.round(p * 10)} in 10`;
}
// The cross of two parents: the chance of a pale child, weighed over what each parent's Markings may still be (the engine's forecast for each pair of counts), and what a pale or a plain child would prove by the kin logic.
export function previewCross(frame, st, a, b) {
  const lookup = lookupOf(st), ra = st.recs[a], rb = st.recs[b];
  const k = kinOf(ra, rb, lookup);
  const wa = weights("M", st.K[a].M), wb = weights("M", st.K[b].M);
  let pPale = 0;
  st.K[a].M.forEach((x, i) => st.K[b].M.forEach((y, j) => { pPale += wa[i] * wb[j] * outcomes(frame, "M", x, y, k)[2]; }));
  const bothPale = st.K[a].M.length === 1 && st.K[a].M[0] === 2 && st.K[b].M.length === 1 && st.K[b].M[0] === 2;
  const proveOf = (pale) => {
    const W = cloneW(st), tmp = { id: -1, name: "child", kind: "own", genome: ra.genome, parents: [a, b], k, gen: 0 };
    W.recs[-1] = tmp; W.K[-1] = { M: pale ? [2] : [0, 1], C: [0, 1, 2], E: true, D: true, F: true, shown: true, habits: [] };
    const lines = [];
    propagate(frame, W, (id, T) => { if (id !== -1 && (id === a || id === b)) lines.push({ id, T, word: valueWord(T, W.K[id][T][0]) }); });
    return lines;
  };
  const yes = proveOf(true), no = proveOf(false);
  const less = no.length ? [] : [a, b].filter((id) => st.K[id].M.length > 1 && st.K[id].M.includes(1));   // a plain child makes a parent that may hide pale less likely to
  return { k, pPale, pPlain: 1 - pPale, yes, no, less, bothPale };
}
export function startCross(frame, st, a, b, now, budMs) {
  const lookup = lookupOf(st), ra = st.recs[a], rb = st.recs[b];
  if (!ra || !rb || a === b) return { ok: false, why: "Pick two Loikas." };
  if (st.bud) return { ok: false, why: "The incubator already holds a bud." };
  if (rb.kind === "wild" && !st.metNow.includes(b) || ra.kind === "wild" && !st.metNow.includes(a)) return { ok: false, why: "That wild one is not here: meet it on an expedition." };
  if (refuses(ra, rb, lookup)) return { ok: false, why: "Too close kin: they cannot cross." };
  if (st.supplies.E < COST.E || st.supplies.Es < COST.Es) return { ok: false, why: `A cross needs ${COST.E} Energy and ${COST.Es} Essence: go out for more.` };
  const r = rng(`lab:${st.seed}:cross:${st.crossN++}`);
  const genome = crossChild(frame, ra, rb, r, lookup);
  if (!genome) return { ok: false, why: "That cross did not build a body: try another pair." };
  st.supplies.E -= COST.E; st.supplies.Es -= COST.Es;
  const gen = Math.max(ra.kind === "own" ? ra.gen : 0, rb.kind === "own" ? rb.gen : 0) + 1;
  st.bud = { genome, parents: [a, b], k: kinOf(ra, rb, lookup), gen, start: now, ready: now + budMs };
  if (ra.kind === "wild") st.metNow = st.metNow.filter((x) => x !== a);
  if (rb.kind === "wild") st.metNow = st.metNow.filter((x) => x !== b);
  return { ok: true };
}
const ownScore = (st, id) => (isPale(st, id) ? 3 : st.K[id].M.length === 1 && st.K[id].M[0] === 1 ? 2 : 0);
// Open the bud: the child hatches, grows up at once (the greybox), joins the vivarium of 8 (the lowest score goes back to the wild when it is full), its shown looks are settled and the kin logic runs.
export function openBud(frame, st, now) {
  const b = st.bud;
  if (!b) return { ok: false, why: "Nothing is in the incubator." };
  if (now < b.ready) return { ok: false, why: "The bud is not ready." };
  let released = null;
  if (st.adults.length >= VIV) {
    const keep = new Set(b.parents), worst = [...st.adults].filter((x) => !keep.has(x)).sort((x, y) => ownScore(st, x) - ownScore(st, y) || x - y)[0];
    if (worst != null) { st.adults.splice(st.adults.indexOf(worst), 1); released = st.recs[worst].name; }
  }
  const name = CHILD_NAMES[st.namesUsed++] ?? "Loika " + st.namesUsed;
  st.bud = null;
  const rec = addOwn(st, b.genome, b.parents, b.k, b.gen, name);
  setWhy(st, rec.id, "M", `${cap(valueWord("M", countOn(rec.genome, "M") === 2 ? 2 : 0))}: ${rec.name} hatched ${countOn(rec.genome, "M") === 2 ? "pale" : "plain"}.`);
  const rec0 = inkRecorder(st);
  let first = null;   // the first square a PARENT was proven by this hatch: where the bench points (the child's own squares are its looks)
  propagate(frame, st, (id, T, cause) => { rec0(id, T, cause); if (!first && b.parents.includes(id)) first = { id, T }; });
  st.last = first ?? { id: rec.id, T: "M" };
  const g = goal(frame, st);
  return { ok: true, child: rec.id, released, goal: g };
}
