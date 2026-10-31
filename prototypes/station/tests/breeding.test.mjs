// Breeding, the rules (no screens). Who can cross and why not (in order), the rest curve, its recovery and freeze, kinship's words and pace,
// the pair-and-turn draw, the forecast's exactness, odds written in eighths, the child, the pod's mate, and an older save.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI } from "../../workbench/framework/catalogue.mjs";
import { cross as crossGenomes, forecast as crossForecast, lookLabel, hiddenCopy } from "../../workbench/framework/cross.mjs";
import { setFrames, frameOf, frameIds, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", sealedOpen: true, rooms: 4 };
const NOW = 1_000_000_000_000;

// A world at turn `turn` with `n` adult Loikas (seeded, unrelated founders), plenty to pay with.
function world(n = 4, turn = 3, over = settings) {
  const st = S.freshSt("w1", turn, 1); S.normalize(st); st.e = 99; st.s = 99; st.d = 99; st.readEver = true;
  const mibis = S.seedAdults(st, "S01", 7, n, over).mibis; return { st, mibis, sv: null };
}
// The Companion's save at a turn (the dock reads its turn): docking and lifting again moves the world turn, as a walk does.
const save = (turn, carried = []) => ({ v: 8, seed: 7, wid: "w1", turn, bay: [], mibis: [], carried, tier: 1, shield: 3 });
function toTurn(st, turn, carried = []) { if (S.docked(st)) S.dockKey(st, save(st.turn, carried), settings, NOW); S.dockKey(st, save(turn, carried), settings, NOW); S.dockKey(st, save(turn, carried), settings, NOW); }   // dock (the turn moves), lift again
const why = (st, sv, a, b) => S.crossWhy(st, sv, a, b, settings, NOW)?.key ?? null;
const free = (st) => { st.bud = null; st.e = 99; st.s = 99; };
const snapshot = (st, ms) => JSON.stringify({ e: st.e, d: st.d, s: st.s, bud: st.bud, m: ms.map((m) => [m.crossLoad, m.restUntil, m.restExtra]) });

test("T1 eligibility: each check refuses with its reason, in order, and spends nothing; a valid pair passes", () => {
  const o1 = { ...settings, rooms: 1 };   // eight places
  const { st, mibis } = world(7, 3, o1), [a, b, c, d, e, f, g] = mibis; let sv = null;
  const tuik = S.seedAdults(st, "S03", 5, 1, { ...o1, rooms: 2 }).mibis[0];   // a Tuikis: it takes the eighth place
  assert.equal(why(st, sv, a, a), "pick"); assert.equal(why(st, sv, a, null), "pick");
  assert.equal(why(st, sv, a, tuik), "species", "two different mibis of one species");
  // every fault at once, then peel them off in the order of the checks
  b.born = st.turn; b.released = true; b.tucked = { turn: st.turn }; b.restUntil = st.turn + 3; sv = save(st.turn, [b.id]);
  const logN = st.log.length;
  const order = [["young", () => { b.born = st.turn - 10; }], ["wild", () => { b.released = false; }], ["away", () => { sv = save(st.turn, []); }], ["tucked", () => { delete b.tucked; }], ["breather", () => { b.restUntil = 0; }]];
  for (const [key, fix] of order) {
    const r = S.crossWhy(st, sv, a, b, settings, NOW); assert.equal(r.key, key, "the first failing check is the reason: " + key); assert.ok(r.words.length > 0);
    const was = snapshot(st, [a, b]), done = S.doCross(st, sv, a, b, settings, NOW); assert.equal(done.ok, false, key); assert.equal(snapshot(st, [a, b]), was, key + ": nothing spent, nothing moved");
    fix();
  }
  // the words a refusal is read in
  b.born = st.turn; assert.equal(S.crossWhy(st, sv, a, b, settings, NOW).words, "young · grows up in 2 turns"); b.born = st.turn - 10;
  b.restUntil = st.turn + 1; assert.equal(S.crossWhy(st, sv, a, b, settings, NOW).words, "on a breather · can breed next turn"); b.restUntil = st.turn + 3; assert.equal(S.crossWhy(st, sv, a, b, settings, NOW).words, "on a breather · can breed in 3 turns"); b.restUntil = 0;
  a.released = true; assert.equal(why(st, sv, a, b), "wild"); a.released = false;
  sv = save(st.turn, [a.id]); assert.equal(S.crossWhy(st, sv, a, b, settings, NOW).words, "out with the Companion"); sv = null;
  a.tucked = { turn: 1 }; assert.equal(S.crossWhy(st, sv, a, b, settings, NOW).words, "tucked away · bring it out first"); delete a.tucked;
  assert.equal(why(st, sv, a, b), null, "a valid pair passes"); assert.equal(st.log.length, logN, "a refusal writes nothing");
  // the incubator, then a place, then the price: refusals spend nothing
  const e0 = st.e, s0 = st.s, ok = S.doCross(st, sv, c, d, settings, NOW); assert.equal(ok.ok, true, ok.msg); assert.equal([st.e, st.s].join(), [e0 - 2, s0 - 4].join(), "a cross costs ⚡2 ❀4");
  const busy = S.crossWhy(st, sv, a, b, settings, NOW); assert.equal(busy.key, "busy"); assert.match(busy.words, /^the incubator is busy · the child hatches in \d+ min$/);
  const before = snapshot(st, [a, b, c, d]); assert.equal(S.doCross(st, sv, a, b, settings, NOW).ok, false); assert.equal(snapshot(st, [a, b, c, d]), before);
  st.bud = null; const last = S.seedAdults(st, "S01", 99, 1, o1).mibis; assert.equal(last.length, 0, "the eighth place is the Tuikis'");   // full house
  assert.equal(S.crossWhy(st, sv, a, b, o1, NOW).key, "place"); assert.equal(S.crossWhy(st, sv, a, b, o1, NOW).words, "No place free");
  const e1 = snapshot(st, [a, b]); assert.equal(S.doCross(st, sv, a, b, o1, NOW).ok, false); assert.equal(snapshot(st, [a, b]), e1);
  tuik.released = true;   // a place is free again
  st.e = 1; assert.equal(S.crossWhy(st, sv, a, b, o1, NOW).words, "needs ⚡2 · you have ⚡1"); st.e = 99; st.s = 3; assert.equal(S.crossWhy(st, sv, a, b, o1, NOW).words, "needs ❀4 · you have ❀3");
  const e2 = snapshot(st, [a, b]); assert.equal(S.doCross(st, sv, a, b, o1, NOW).ok, false); assert.equal(snapshot(st, [a, b]), e2, "short of Essence: nothing moves");
  st.s = 99; assert.equal(S.crossWhy(st, sv, a, b, o1, NOW), null);
  assert.equal(S.doCross(st, sv, a, b, o1, NOW).ok, true);
  // an elder crosses as an adult
  const x = world(2); x.mibis[1].born = x.st.turn - S.JUVENILE_TURNS - S.ELDER_TURNS; assert.equal(S.mibiStage(x.st, x.mibis[1], settings), "elder"); assert.equal(why(x.st, null, x.mibis[0], x.mibis[1]), null);
});

test("T2 the breather: refused at the turn of the cross, allowed the next; a dock with no turn change keeps it and recovers nothing", () => {
  const { st, mibis: [a, b] } = world(2, 3);
  assert.equal(S.doCross(st, null, a, b, settings, NOW).ok, true); free(st);
  for (const m of [a, b]) { assert.equal([m.crossLoad, m.restUntil].join(), "1,4"); assert.equal(S.onBreather(st, m), true); }
  assert.equal(why(st, null, a, b), "breather"); assert.equal(S.crossWhy(st, null, a, b, settings, NOW).n, 1);
  // docks at the same turn change nothing
  S.dockKey(st, save(3), settings, NOW); S.dockKey(st, save(3), settings, NOW); S.dockKey(st, save(3), settings, NOW);
  assert.equal(st.turn, 3); for (const m of [a, b]) assert.equal([m.crossLoad, m.restUntil].join(), "1,4"); assert.equal(why(st, null, a, b), "breather");
  toTurn(st, 4); assert.equal(why(st, null, a, b), null, "allowed at t + 1"); for (const m of [a, b]) assert.equal(m.crossLoad, 1, "the breather turn recovers nothing");
  assert.equal(S.doCross(st, null, a, b, settings, NOW).ok, true);
});

test("T3 the curve: counts 1-4 rest 1 turn, 5 rest 2, 6 rest 3, 7 rest 4, 8 rest 5; the count stops at 8, the breather at 5, kin extra included", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => S.restTurnsFor(n)), [1, 1, 1, 1, 2, 3, 4, 5]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => S.restTurnsFor(n, 1)), [2, 2, 2, 2, 3, 4, 5, 5]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => S.restTurnsFor(n, 2)), [3, 3, 3, 3, 4, 5, 5, 5]);
  for (const extra of [0, 1, 2]) {
    const { st, mibis: [a] } = world(12, 3), partners = st.mibis.slice(1); a.restExtra = extra; const seen = [];
    for (let i = 0; i < 11; i++) {
      assert.equal(S.nextRest(a), S.restTurnsFor(Math.min(8, S.crossLoadOf(a) + 1), extra), "the key shows the rest before the press");
      const r = S.doCross(st, null, a, partners[i], settings, NOW); assert.equal(r.ok, true, r.msg); free(st);
      seen.push([a.crossLoad, a.restUntil - st.turn]); assert.equal(r.rest[0], a.restUntil - st.turn);
      toTurn(st, a.restUntil);   // pressed the moment it is ready: it never recovers
      assert.equal(a.crossLoad, Math.min(8, i + 1));
    }
    assert.deepEqual(seen.map((x) => x[0]), [1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8], "the count stops at 8");
    assert.deepEqual(seen.map((x) => x[1]), [1, 1, 1, 1, 2, 3, 4, 5, 5, 5, 5].map((n, i) => S.restTurnsFor(Math.min(8, i + 1), extra)), "extra " + extra);
    assert.ok(Math.max(...seen.map((x) => x[1])) <= 5, "never past 5");
  }
});

test("T4 recovery: one back per ready turn not crossed; none in the breather; a jump recovers max(0, t1 - max(t0, restUntil)); a normal player's and a favourite-spammer's twenty turns, turn for turn", () => {
  const { st, mibis: [m] } = world(1, 8);
  m.crossLoad = 4; m.restUntil = 10; toTurn(st, 9); assert.equal(m.crossLoad, 4, "inside the breather"); toTurn(st, 10); assert.equal(m.crossLoad, 4, "the turn it ends recovers nothing yet"); toTurn(st, 11); assert.equal(m.crossLoad, 3, "one back for the ready turn"); toTurn(st, 12); assert.equal(m.crossLoad, 2);
  // a jump of several turns
  const jump = (load, until, t0, t1) => { const s = S.freshSt("w", t0, 1); S.normalize(s); const x = { id: 1, crossLoad: load, restUntil: until }; s.mibis.push(x); S.restRecover(s, t0, t1); return x.crossLoad; };
  assert.equal(jump(6, 9, 8, 15), 0, "15 - 9 = 6 turns back"); assert.equal(jump(6, 9, 8, 12), 3); assert.equal(jump(6, 9, 12, 14), 4, "from t0 past the breather: 14 - 12"); assert.equal(jump(6, 9, 8, 9), 6, "the breather turns recover nothing"); assert.equal(jump(2, 5, 3, 40), 0, "never below 0"); assert.equal(jump(3, 5, 7, 7), 3, "no turn change");
  { const j = world(1, 3); j.mibis[0].crossLoad = 5; j.mibis[0].restUntil = 6; toTurn(j.st, 14); assert.equal(j.mibis[0].crossLoad, 0, "a dock that jumps 3 to 14: 14 - 6 = 8 back"); }
  // twenty turns for a normal player and a favourite-spammer: Fig crosses with a new mate each time; the count after each turn is read once the turn has passed
  const play = (turns) => {
    const w = world(11, 0), fig = w.mibis[0], mates = w.mibis.slice(1); let mi = 0; const after = [], rest = [], held = [];
    toTurn(w.st, 1);
    for (let T = 1; T <= 20; T++) {
      assert.equal(w.st.turn, T);
      if (turns.includes(T)) { assert.equal(S.crossWhy(w.st, null, fig, mates[mi], settings, NOW), null, "T" + T + ": free to cross"); const nr = S.nextRest(fig), r = S.doCross(w.st, null, fig, mates[mi++], settings, NOW); assert.equal(r.ok, true, r.msg); free(w.st); rest.push(fig.restUntil - T); assert.equal(nr, fig.restUntil - T, "the key said so"); }
      else if (S.onBreather(w.st, fig)) { held.push(T); assert.equal(S.crossWhy(w.st, null, fig, mates[mi], settings, NOW).key, "breather"); }
      toTurn(w.st, T + 1); after.push(fig.crossLoad);
    }
    return { after, rest, held };
  };
  const normal = play([1, 2, 3, 6, 8, 11, 13, 16, 19]);
  assert.deepEqual(normal.after, [1, 2, 3, 2, 1, 2, 1, 2, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], "normal: Fig never felt the rest"); assert.deepEqual(normal.rest, Array(9).fill(1)); assert.deepEqual(normal.held, [], "no breather turn ever meets a press");
  const spam = play([1, 2, 3, 4, 5, 7, 10, 14, 19]);
  assert.deepEqual(spam.after, [1, 2, 3, 4, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8], "spammer counts"); assert.deepEqual(spam.rest, [1, 1, 1, 1, 2, 3, 4, 5, 5]); assert.deepEqual(spam.held, [6, 8, 9, 11, 12, 13, 15, 16, 17, 18, 20], "held on 11 turns");
});

test("T5 the freeze: tucked away, nothing recovers and the breather does not end; Bring out shifts restUntil; a carried mibi recovers; a released one does not", () => {
  const { st, mibis: [a, b, c] } = world(3, 5);
  a.crossLoad = 4; a.restUntil = 8; a.tucked = { turn: 5 };   // tucked while its breather ran 3 more turns
  b.crossLoad = 3; b.restUntil = 4; b.tucked = { turn: 5 };   // tucked after its breather had ended
  c.crossLoad = 3; c.restUntil = 6;
  toTurn(st, 20);
  assert.deepEqual([a.crossLoad, a.restUntil, b.crossLoad, b.restUntil], [4, 8, 3, 4], "stored: nothing moves"); assert.equal(why(st, null, a, c), "tucked");
  assert.equal(c.crossLoad, 0, "the one at home recovered meanwhile");
  // Bring out at turn 20: back at 22, the clocks shift by 22 - 5 = 17
  const out = 22, shift = out - a.tucked.turn; S.shiftRest(a, a.tucked.turn, shift); S.shiftRest(b, b.tucked.turn, shift); a.tucked = { ...a.tucked, out, shift }; b.tucked = { ...b.tucked, out, shift };
  assert.equal(a.restUntil, 25, "a running breather moves with born"); assert.equal(b.restUntil, 4, "an ended one stays"); assert.equal(a.restUntil - out, 3, "the same 3 turns are still owed when it is back");
  toTurn(st, 22); assert.deepEqual([a.crossLoad, b.crossLoad], [4, 3], "still coming out: nothing recovers"); assert.equal(why(st, null, a, c), "tucked", "and it cannot cross");
  delete a.tucked; delete b.tucked; toTurn(st, 24); assert.equal(a.crossLoad, 4, "back, but the breather runs to 25"); assert.equal(why(st, null, a, c), "breather"); toTurn(st, 26); assert.equal(a.crossLoad, 3); assert.equal(b.crossLoad, 0, "b's turns count from its return");
  // a carried mibi recovers (a walk is rest)
  const w2 = world(2, 5), [x, y] = w2.mibis; x.crossLoad = 3; x.restUntil = 5; y.crossLoad = 3; y.restUntil = 5; toTurn(w2.st, 8, [x.id]);
  assert.deepEqual([x.crossLoad, y.crossLoad], [0, 0], "carried or at home alike"); assert.equal(why(w2.st, save(8, [x.id]), x, y), "away");
  const w3 = world(2, 5), [r1] = w3.mibis; r1.crossLoad = 3; r1.released = true; toTurn(w3.st, 12); assert.equal(r1.crossLoad, 3, "a released mibi recovers nothing");
});

test("T6 kinship's pace: restExtra 1 for close kin, 2 for the same line, else 0; fixed at the hatch; its breathers are longer by it; never passed down", () => {
  assert.deepEqual([0, 1 / 32, 1 / 16, 1 / 8, 3 / 16, 0.2499, 1 / 4, 3 / 8, 0.4999, 1 / 2, 0.75].map(S.restExtraFor), [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2]);
  const { st, mibis: [a, b, c, d] } = world(4, 10), fr = frameOf("S01");
  const hatch = (x, y) => { const r = S.doCross(st, null, x, y, settings, NOW); assert.equal(r.ok, true, r.msg); const k = st.bud.kinship; S.skipBud(st, settings, "ready"); const o = S.openBud(st, null, settings, NOW); assert.equal(o.ok, true, o.msg); st.turn += 0; return { child: o.mibi, k }; };
  const first = hatch(a, b); assert.equal(first.k, 0); assert.equal(first.child.restExtra, 0, "wild blood: no extra");
  const sib = S.seedSiblings(st, "S01", 99, settings); assert.equal(sib.ok, true, sib.msg); const [s1, s2] = sib.mibis; free(st); s1.born = s2.born = st.turn - 6;
  assert.equal(S.kinshipOf(st, s1, s2), 0.25); toTurn(st, st.turn + 5);
  const close = hatch(s1, s2); assert.equal(close.k, 0.25); assert.equal([close.child.crossLoad, close.child.restUntil, close.child.restExtra].join(), "0,0,1", "a child of close kin hatches rested, with 1 extra");
  assert.equal(close.child.from.how, "cross"); assert.deepEqual(close.child.parents.map((p) => p.id), [s1.id, s2.id]); assert.ok(close.child.parents.every((p) => Array.isArray(p.read)), "the parent snapshots carry what they had read");
  // the same line: a mibi with a parent it was shed from (its parents are that parent twice)
  free(st); toTurn(st, st.turn + 5); const line = S.seedAdults(st, "S01", 55, 1, settings).mibis[0]; line.genome = structuredClone(c.genome); line.parents = [{ id: c.id }, { id: c.id }];
  assert.equal(S.kinshipOf(st, line, c), 0.5); const same = hatch(line, c); assert.equal(same.k, 0.5); assert.equal(same.child.restExtra, 2, "the same line: 2 extra");
  // fixed at the hatch: the record keeps it whatever happens to the pedigree
  const kept = close.child.restExtra; close.child.parents = null; assert.equal(close.child.restExtra, kept);
  // its breathers are longer by it, up to 5
  free(st); toTurn(st, st.turn + 5); const kid = close.child; kid.born = st.turn - 6; assert.equal(S.nextRest(kid), 2, "first cross: 1 + 1"); assert.equal(S.nextRest(same.child), 3, "1 + 2");
  kid.crossLoad = 7; assert.equal(S.nextRest(kid), 5, "the ceiling holds: 5 + 1 is 5"); kid.crossLoad = 0;
  // not passed down: a close-kin child crossed with fresh blood gives a child at full pace
  const fresh = d; fresh.born = st.turn - 6; assert.equal(S.kinshipOf(st, kid, fresh), 0); const g = hatch(kid, fresh); assert.equal(g.k, 0); assert.equal(g.child.restExtra, 0, "fresh blood restores the pace");
  assert.equal(kid.restExtra, kept, "and the parent's own pace is unchanged"); assert.equal(fresh.restExtra | 0, 0, "a parent's extra never goes to its mate");
  // it never touches the parents' breathers: a close-kin cross rests its parents by their own rule
  free(st); toTurn(st, st.turn + 8); const p1 = s1, p2 = s2; p1.born = p2.born = st.turn - 9; p1.crossLoad = p2.crossLoad = 0; p1.restUntil = p2.restUntil = 0; const r = S.doCross(st, null, p1, p2, settings, NOW); assert.equal(r.ok, true); assert.deepEqual(r.rest, [1, 1], "kinship never lengthens the parents' breathers");
});

test("T7 carried and tucked mibis are refused, docked or away, and stay in the partner list, dimmed", () => {
  const { st, mibis: [a, b, c, d] } = world(4, 5);
  const away = save(5, [b.id]); assert.equal(S.crossBlock(st, away, a, b, settings), "away"); assert.equal(S.crossBlock(st, away, b, a, settings), "away");
  S.dockKey(st, save(5, [b.id]), settings, NOW); assert.equal(S.docked(st), true); assert.equal(S.crossBlock(st, away, a, b, settings), "away", "docked, still refused");
  S.dockKey(st, away, settings, NOW);   // lifted
  c.tucked = { turn: 5 }; assert.equal(S.crossBlock(st, away, a, c, settings), "tucked away"); assert.equal(S.crossBlock(st, null, c, a, settings), "tucked away");
  d.restUntil = st.turn + 2;
  const list = S.crossPartners(st, away, a, settings);
  assert.deepEqual(list.map((m) => [m.id, !!m.away]), [[b.id, true], [c.id, true], [d.id, false]], "carried and tucked are listed, marked away, in place order; the one on a breather is listed whole");
  assert.equal(list[2], d, "a partner at home is the mibi itself"); assert.equal(S.breatherLeft(st, list[2]), 2); assert.equal(S.crossBlock(st, away, a, d, settings), "on a breather");
  assert.equal(S.crossBlock(st, null, a, b, settings), "", "brought home, it crosses as any adult");
});

test("T8 forecast exactness: per species frame, each look's chance equals its frequency over 20,000 seeded crosses within 0.01, at kinship 0, 1/8 and 1/4", { timeout: 600000 }, () => {
  const mix = (n) => { let h = n >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
  let compared = 0, uncertain = 0, blends = 0;
  frameIds().forEach((sp, si) => {
    const fr = frameOf(sp), ga = podGenome(fr, 100 + si * 17), gb = podGenome(fr, 900 + si * 31);
    [0, 1 / 8, 1 / 4].forEach((k, ki) => {
      const fc = crossForecast(fr, ga, gb, { kinship: k }), N = 20000, tally = new Map();
      const rows = fc.traits.filter((t) => !t.sealed);
      for (let i = 0; i < N; i++) {
        const child = crossGenomes(fr, ga, gb, { kinship: k, rng: S.seededRng(mix(si * 1e6 + ki * 1e5 + i + 1)) });
        for (const t of rows) {
          if (t.kind === "switch") { const key = t.trait + "|" + lookLabel(LOCI.get(t.locus), child.loci[t.locus]); tally.set(key, (tally.get(key) ?? 0) + 1); }
          else { const v = child.loci[t.locus][0]; assert.ok(v >= t.range[0] - 1e-9 && v <= t.range[1] + 1e-9, sp + " " + t.trait + ": a blend stays inside the forecast's range"); blends++; }
        }
      }
      for (const t of rows) if (t.kind === "switch") {
        for (const [label, p] of Object.entries(t.looks)) { const f = (tally.get(t.trait + "|" + label) ?? 0) / N; assert.ok(Math.abs(f - p) <= 0.01, `${sp} k=${k} ${t.trait} "${label}": forecast ${p}, drawn ${f}`); compared++; if (p > 0 && p < 1) uncertain++; }
        for (const key of tally.keys()) if (key.startsWith(t.trait + "|")) assert.ok(key.slice(t.trait.length + 1) in t.looks, `${sp} ${key}: a look the forecast never listed was drawn`);
      }
    });
  });
  assert.ok(compared > 100 && uncertain > 20 && blends > 1000, `the check saw ${compared} looks, ${uncertain} of them uncertain, ${blends} blend draws`);
});

test("T9 written chances: the rounding table, the seeds, the exact fraction; two pale-carrying Loikas give 1/4, 3/8, 1/2 at kinship 0, 1/8, 1/4", () => {
  const w = (p) => S.writtenChance(p)?.words;
  assert.equal(w(1 / 32), "rarely"); assert.equal(w(1 / 4), "1 in 4"); assert.equal(w(7 / 16), "3 in 8"); assert.equal(w(15 / 16), "7 in 8"); assert.equal(w(63 / 64), "nearly always"); assert.equal(w(1), "always"); assert.equal(S.writtenChance(0), null, "not listed");
  assert.deepEqual([1 / 8, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8, 1 / 16, 3 / 16, 5 / 16, 9 / 16, 13 / 16].map(w), ["1 in 8", "3 in 8", "1 in 2", "5 in 8", "3 in 4", "7 in 8", "rarely", "1 in 8", "1 in 4", "1 in 2", "3 in 4"], "to the nearest eighth, a tie rounds down");
  assert.equal(w(0.0001), "rarely"); assert.equal(w(0.99), "nearly always"); assert.equal(w(0.999999), "nearly always"); assert.equal(w(0.9999999999), "always");
  assert.deepEqual(S.writtenChance(1 / 32).seeds, { filled: 0, half: 1, hairline: false }); assert.deepEqual(S.writtenChance(63 / 64).seeds, { filled: 7, half: 1, hairline: false });
  assert.deepEqual(S.writtenChance(1).seeds, { filled: 8, half: 0, hairline: true }); assert.deepEqual(S.writtenChance(3 / 8).seeds, { filled: 3, half: 0, hairline: false });
  assert.equal(S.writtenChance(7 / 16).exact, "7 in 16", "the detail shows the exact fraction"); assert.equal(S.writtenChance(1 / 4).exact, "1 in 4"); assert.equal(S.writtenChance(5 / 16).exact, "5 in 16"); assert.equal(S.writtenChance(1 / 32).exact, "1 in 32"); assert.equal(S.writtenChance(0.375).exact, "3 in 8");
  assert.deepEqual(S.exactChance(0.4375), { n: 7, d: 16 }); assert.deepEqual(S.exactChance(0.390625), { n: 25, d: 64 });
  // the list: by exact value, a zero not listed, cousins' 5/16 and strangers' 1/4 both read "1 in 4" yet differ
  const list = S.writtenLooks({ a: 0.25, b: 0.3125, c: 0, d: 0.4375 }); assert.deepEqual(list.map((r) => r.look), ["d", "b", "a"]); assert.deepEqual(list.map((r) => r.words), ["3 in 8", "1 in 4", "1 in 4"]); assert.notEqual(list[1].exact, list[2].exact);
  // two Loikas that both carry the hidden copy of the crown: pedigrees of 0, a shared parent (half kin) and both parents (full siblings)
  const fr = frameOf("S01"), lead = "anatomy.crown-presence", locus = LOCI.get(lead), copies = ["on", "off"], hid = hiddenCopy(locus, copies), pale = lookLabel(locus, [hid, hid]);
  assert.ok(hid, "the pair of copies hides one");
  const { st, mibis: [x, y] } = world(2, 5); for (const m of [x, y]) m.genome.loci[lead] = [...copies];
  const chance = () => S.forecastOf(st, x, y, settings).traits.find((t) => t.trait === "crown").looks[pale];
  x.parents = y.parents = null; assert.equal(S.kinshipOf(st, x, y), 0); assert.equal(chance(), 1 / 4); assert.equal(S.writtenChance(chance()).words, "1 in 4");
  x.parents = [{ id: 101 }, { id: 102 }]; y.parents = [{ id: 101 }, { id: 103 }]; assert.equal(S.kinshipOf(st, x, y), 1 / 8); assert.equal(chance(), 3 / 8); assert.equal(S.writtenChance(chance()).words, "3 in 8");
  y.parents = [{ id: 101 }, { id: 102 }]; assert.equal(S.kinshipOf(st, x, y), 1 / 4); assert.equal(chance(), 1 / 2); assert.equal(S.writtenChance(chance()).words, "1 in 2");
});

test("T10 the child: firm chapters open read, a blend's never; a chapter read on both parents costs 1 Data, else the pod's price, also after a parent is released", () => {
  const { st, mibis: [a, b] } = world(2, 10), fr = frameOf("S01");
  // make every switch locus the same two equal copies on both parents: the firm chapters are known, the blends never
  for (const l of fr.loci) if (l.kind !== "locked" && !(typeof a.genome.loci[l.id][0] === "number")) { b.genome.loci[l.id] = [a.genome.loci[l.id][0], a.genome.loci[l.id][0]]; a.genome.loci[l.id] = [...b.genome.loci[l.id]]; }
  const fc = S.forecastOf(st, a, b, settings), r = S.doCross(st, null, a, b, settings, NOW); assert.equal(r.ok, true, r.msg);
  const blendChapters = fr.chapters.filter((c) => c.traits.some((t) => fc.traits.find((x) => x.trait === t.id).kind === "blend")).map((c) => c.id);
  assert.ok(blendChapters.length > 0); assert.deepEqual(st.bud.read, S.childKnownChapters(fr, fc)); assert.ok(st.bud.read.length > 0, "a firm chapter opens read");
  for (const id of blendChapters) assert.ok(!st.bud.read.includes(id), id + " has a blend: never opens read");
  S.skipBud(st, settings, "ready"); const child = S.openBud(st, null, settings, NOW).mibi; assert.deepEqual(child.read, st.bud?.read ?? child.read);
  const unread = fr.chapters.find((c) => !child.read.includes(c.id) && !c.sealed && c.traits.length >= 2); assert.ok(unread, "a chapter of two traits is unread: its pod price is 2");
  const pod = S.readCost(st, { ...child, idd: 1 }, unread.id, settings); assert.equal(pod, 2);
  assert.equal(S.mibiReadCost(st, child, unread.id, settings), 1, "read on both parents: 1 Data");
  assert.equal(S.mibiReadCost(st, child, child.read[0], settings), 0, "a chapter that opened read is free");
  a.read = a.read.filter((c) => c !== unread.id); assert.equal(S.mibiReadCost(st, child, unread.id, settings), 2, "a parent lacks it: the pod's price"); a.read.push(unread.id);
  st.readOnce.S01 = [unread.id]; a.read = a.read.filter((c) => c !== unread.id); assert.equal(S.mibiReadCost(st, child, unread.id, settings), 1, "the pod's price is half once read on the species"); st.readOnce.S01 = []; a.read.push(unread.id);
  b.released = true; assert.equal(S.mibiReadCost(st, child, unread.id, settings), 1, "a released parent's live record still counts");
  st.mibis = st.mibis.filter((m) => m !== a && m !== b); assert.equal(S.mibiReadCost(st, child, unread.id, settings), 1, "gone: its snapshot's read counts");
  child.parents = child.parents.map((p) => { const { read, ...rest } = p; return rest; }); assert.equal(S.mibiReadCost(st, child, unread.id, settings), 2, "an old snapshot with no record: the pod's price");
  // a founder always pays the pod's price
  const f = S.seedAdults(world(1).st, "S01", 3, 1, settings).mibis[0]; f.read = []; const fs = world(1).st; assert.equal(S.mibiReadCost(fs, f, unread.id, settings), S.readCost(fs, { ...f, idd: 1 }, unread.id, settings));
  assert.equal(S.mibiReadCost(fs, f, unread.id, settings), 2);
  assert.equal(S.mibiReadCost({ ...fs, readEver: false }, f, unread.id, settings), 0, "the first read ever is free, as for a pod");
});

test("T11 the draw: the sorted ids and the turn only; same child in either order and after another pair's cross; a child that would not build is refused before payment until the turn changes", () => {
  const real = Math.random; Math.random = () => { throw new Error("the cross never touches Math.random"); };
  try {
    const { st, mibis: [a, b, c, d] } = world(4, 7);
    const g0 = S.drawCross(st, a, b).genome; assert.deepEqual(S.drawCross(st, b, a).genome, g0, "either order");
    const st2 = structuredClone(st), [a2, b2] = [S.mibiById(st2, a.id), S.mibiById(st2, b.id)];
    const r1 = S.doCross(st, null, a, b, settings, NOW); const r2 = S.doCross(st2, null, b2, a2, settings, NOW); assert.equal(r1.ok && r2.ok, true);
    assert.deepEqual(st.bud.genome, st2.bud.genome, "A × B and B × A are one draw"); assert.deepEqual(st.bud.genome, g0);
    free(st); assert.equal(S.doCross(st, null, c, d, settings, NOW).ok, true); free(st);
    assert.deepEqual(S.drawCross(st, a, b).genome, g0, "another pair's cross changes nothing");
    assert.equal(S.crossSeed(st, a, b), S.crossSeed(st, b, a)); assert.notEqual(S.crossSeed(st, a, b), S.crossSeed(st, a, c)); st.turn++; assert.notEqual(S.crossSeed(st, a, b), S.crossSeed({ ...st, turn: 7 }, a, b), "the turn is in the seed");
    const kids = new Set(); for (let t = 0; t < 12; t++) { st.turn = 20 + t; kids.add(JSON.stringify(S.drawCross(st, a, b).genome.loci)); } assert.ok(kids.size > 3, "another turn, another draw");
    // a pair whose child would not build this turn: the frame's pool is narrowed to a copy one parent does not hold twice
    const w = world(2, 3), [p, q] = w.mibis, fr = frameOf("S01"), l = fr.loci.find((x) => x.id === "anatomy.crown-presence"), keep = l.alleles;
    try {
      p.genome.loci[l.id] = ["on", "on"]; q.genome.loci[l.id] = ["on", "off"]; l.alleles = ["on"];
      let bad = null, good = null; for (let t = 4; t < 60 && (bad == null || good == null); t++) { w.st.turn = t; const dr = S.drawCross(w.st, p, q); if (dr.problems) bad ??= t; else good ??= t; }
      assert.ok(bad != null && good != null, "the narrowed pool refuses some turns and allows others");
      w.st.turn = bad; const was = snapshot(w.st, [p, q]), log = w.st.log.length;
      assert.equal(S.crossWhy(w.st, null, p, q, settings, NOW).key, "build"); assert.equal(S.crossWhy(w.st, null, p, q, settings, NOW).words, "this pair cannot cross this turn");
      const r = S.doCross(w.st, null, p, q, settings, NOW); assert.equal(r.ok, false); assert.match(r.msg, /would not build/); assert.deepEqual(r.clash, ["crown"]);
      assert.equal(snapshot(w.st, [p, q]), was, "nothing spent, the counts and breathers unmoved"); assert.equal(w.st.log.length, log); assert.equal(w.st.bud, null);
      for (let i = 0; i < 3; i++) { assert.equal(S.doCross(w.st, null, p, q, settings, NOW).ok, false, "pressing again gives the same child"); assert.equal(snapshot(w.st, [p, q]), was); }
      assert.equal(S.doCross(w.st, null, q, p, settings, NOW).ok, false, "in the other order too");
      w.st.turn = good; assert.equal(S.doCross(w.st, null, p, q, settings, NOW).ok, true, "allowed once the turn changes");
    } finally { l.alleles = keep; }
  } finally { Math.random = real; }
});

test("T12 the pod's mate, and the six kin words by band", () => {
  const words = [[0, "wild blood"], [1 / 64, "distant kin"], [1 / 17, "distant kin"], [1 / 16, "cousins"], [3 / 32, "cousins"], [1 / 8, "half kin"], [3 / 16, "half kin"], [1 / 4, "close kin"], [3 / 8, "close kin"], [1 / 2, "the same line"], [0.75, "the same line"]];
  for (const [k, w] of words) assert.equal(S.kinshipWord(k), w, "kinship " + k);
  // the pod's mate: furthest kin first, ties to the oldest
  const { st, mibis } = world(5, 20), fr = frameOf("S01"), pod = { id: "x:1", sp: 0, species: "S01", idd: 1, read: [], genome: podGenome(fr, 424242) }, ch = fr.chapters[0].id;
  const [m1, m2, m3, m4, m5] = mibis; m1.born = 9; m2.born = 5; m3.born = 5; m4.born = 7; m5.born = 1;
  const mate = () => S.podMate(st, null, pod, ch, settings)?.id;
  assert.equal(mate(), m5.id, "a founder pod is wild blood with all: the oldest (lowest born)");
  m5.read = m5.read.filter((c) => c !== ch); assert.equal(mate(), m2.id, "that chapter unread on it: the next oldest; a tie goes to the lowest id");
  m2.restUntil = st.turn + 1; assert.equal(mate(), m3.id, "on a breather cannot breed now");
  m3.tucked = { turn: 1 }; assert.equal(mate(), m4.id, "tucked away is not at home"); assert.equal(S.podMate(st, save(20, [m4.id]), pod, ch, settings).id, m1.id, "carried is not at home");
  m1.released = true; m4.released = true; assert.equal(mate(), undefined, "none: no plate"); assert.equal(S.podMate(st, null, pod, ch, settings), null); assert.equal(S.podMateOdds(st, null, pod, ch, settings), null);
  m1.released = false; m4.released = false; m1.born = 19; assert.equal(S.podMate(st, null, pod, ch, settings).id, m4.id, "a young mibi is no mate (m1 would be the oldest left)"); m1.born = 9; delete m3.tucked; m2.restUntil = 0; m5.read.push(ch); assert.equal(mate(), m5.id);
  const young = S.seedAdults(st, "S01", 77, 1, settings).mibis[0]; young.born = st.turn; assert.notEqual(mate(), young.id);
  const other = S.seedAdults(st, "S03", 77, 1, { ...settings, rooms: 4 }).mibis[0]; assert.notEqual(mate(), other.id, "its own species only");
  // its odds are forecastOf with the pod as one parent
  const odds = S.podMateOdds(st, null, pod, ch, settings); assert.equal(odds.mate.id, m5.id); assert.deepEqual(odds.forecast, S.forecastOf(st, pod, odds.mate, settings)); assert.equal(odds.forecast.kinship, 0);
  // a shed pod is its parent's line: the furthest kin is the one not of that line
  const w = world(4, 20), [P, kin, far, Q] = w.mibis; S.returnMibi(w.st, null, P, settings); const shed = w.st.sheds.at(-1);
  const sp = { id: "s:1", sp: 0, species: "S01", idd: 1, read: [], genome: shed.genome }; kin.parents = [{ id: P.id }, { id: Q.id }]; kin.born = 1; far.born = 9; Q.born = 12;
  assert.equal(S.kinshipOf(w.st, sp, kin), 1 / 4, "the shed pod is its parent's line"); assert.equal(S.kinshipOf(w.st, sp, far), 0);
  assert.equal(S.podMate(w.st, null, sp, ch, settings).id, far.id, "the furthest kin first: far and Q are unrelated to the pod, far is the older; the pod's own line comes last");
  far.released = true; assert.equal(S.podMate(w.st, null, sp, ch, settings).id, Q.id); Q.released = true; assert.equal(S.podMate(w.st, null, sp, ch, settings).id, kin.id, "its own line is a mate when it is all there is");
});

test("T12b nothing is lost over a cap: a crate adds exactly what it holds, Data, Energy and Essence have no Station cap", () => {
  const sv = { v: 8, seed: 7, wid: "w9", turn: 3, bay: [{ id: "x1", n: 1, turn: 3, at: 0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 5, of: 20, lines: [] }], mibis: [], with: null, tier: 1, shield: 3 };
  const st = S.freshSt("w9", 3, 1000); S.normalize(st); st.e = 5000; st.d = 7000; st.s = 9000;
  S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000); assert.deepEqual([st.e, st.d, st.s], [5003, 7003, 9004]);
  const w = world(2, 3); w.st.e = 5000; w.st.s = 9000; assert.equal(S.doCross(w.st, null, w.mibis[0], w.mibis[1], settings, NOW).ok, true); assert.deepEqual([w.st.e, w.st.s], [4998, 8996]);
});

test("an older save loads unchanged: no breeding fields appear, a mibi without them is ready, a bud without a kinship or parent reads hatches as before", () => {
  const raw = JSON.parse(readFileSync(path.join(here, "fixtures/save-v8-schema1.json"), "utf8")), old = S.normalize(S.migrate(raw.st, 777, raw));
  for (const m of old.mibis) for (const k of ["crossLoad", "restUntil", "restExtra"]) assert.ok(!(k in m), "the migrated fixture has no " + k);
  const { st } = world(2, 5);
  for (const m of st.mibis) for (const k of ["crossLoad", "restUntil", "restExtra"]) delete m[k];
  const reload = JSON.parse(JSON.stringify(st)); S.normalize(reload);
  for (const m of reload.mibis) for (const k of ["crossLoad", "restUntil", "restExtra"]) assert.ok(!(k in m), "loading adds no " + k);
  for (const k of ["forecastTaught", "restCountTaught"]) assert.ok(!(k in reload), "loading adds no " + k);
  const [ra, rb] = reload.mibis; assert.equal(S.onBreather(reload, ra), false); assert.equal(S.crossLoadOf(ra), 0); assert.equal(S.nextRest(ra), 1); assert.equal(S.crossWhy(reload, null, ra, rb, settings, NOW), null);
  assert.equal(S.doCross(reload, null, ra, rb, settings, NOW).ok, true); assert.deepEqual([ra.crossLoad, ra.restUntil, rb.crossLoad], [1, 6, 1]);
  assert.equal(S.teachForecast(reload), true); assert.equal(S.teachForecast(reload), false); assert.equal(S.teachRestCount(reload), true); assert.equal(S.teachRestCount(reload), false);
  // an older bud in the glass: no kinship, parents with no read
  const w = world(2, 5), [x, y] = w.mibis; assert.equal(S.doCross(w.st, null, x, y, settings, NOW).ok, true);
  delete w.st.bud.kinship; for (const p of w.st.bud.parents) delete p.read; S.skipBud(w.st, settings, "ready"); const rb2 = JSON.parse(JSON.stringify(w.st)); S.normalize(rb2);
  const child = S.openBud(rb2, null, settings, NOW).mibi; assert.equal(child.restExtra, 0); assert.equal(child.crossLoad, 0); assert.equal(child.restUntil, 0);
  const unread = frameOf("S01").chapters.find((c) => !child.read.includes(c.id) && c.traits.length >= 2);
  assert.ok(unread); assert.equal(S.mibiReadCost(rb2, child, unread.id, settings), 1, "the parents' live records answer when the snapshot has no read");
  rb2.mibis = rb2.mibis.filter((m) => m.id !== x.id && m.id !== y.id);
  assert.equal(S.mibiReadCost(rb2, child, unread.id, settings), S.readCost(rb2, { ...child, idd: 1 }, unread.id, settings), "no record, no snapshot read: the pod's price");
});
