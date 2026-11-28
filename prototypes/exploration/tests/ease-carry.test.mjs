// W3 on the live realm: the carry table, ease in four stages, cover and sight, wind per part of day, keeping still as one act, the stay (walk-design-1 W3; G1's rules as round 4 tested them).
//   node --test prototypes/exploration/tests/ease-carry.test.mjs
// A scripted day on seeds 7, 13 and 42: the same approach downwind through reeds and upwind over sand, the expected heard-step counts WRITTEN FROM THE TABLE FIRST (below, by hand), then the measured ones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { CARRY, carryOf, wariness1, WIND_VEC } from "../src/walk-data.mjs";
import { heardAt, carryAt, stayAt, stayLeft, stayTick, easeTick, windOf, windAt, los, holdRun, HOLD_MAX } from "../src/logic/ease.mjs";
import { doingsOf } from "../src/gen7/haunts.mjs";
import { DAY, WORDS } from "../src/words.mjs";

// ---------- the table, by hand ----------
// creep 2, walk 4; reeds or tall grass -1; sand +1; downwind -1, across 0, upwind +2; rain -1; calm -1, steady 0, wary +1; never under 1.
const EXPECT = {
  // downwind through reeds, creeping: 2 - 1 - 1 = 0 + wariness, never under 1
  downReeds: w => Math.max(1, 2 - 1 - 1 + w),
  // upwind over sand, creeping: 2 + 1 + 2 = 5 + wariness
  upSand: w => 5 + w,
  // across the wind on plain ground, creeping, and walking
  acrossCreep: w => Math.max(1, 2 + w), acrossWalk: w => Math.max(1, 4 + w),
};
const SEEDS = [7, 13, 42];

test("the carry table: every row, and never under one tile", () => {
  assert.deepEqual([CARRY.gait.creep, CARRY.gait.walk], [2, 4]);
  assert.deepEqual([CARRY.ground.cover, CARRY.ground.open], [-1, 1]);
  assert.deepEqual([CARRY.wind.down, CARRY.wind.across, CARRY.wind.up], [-1, 0, 2]);
  assert.equal(CARRY.rain, -1); assert.deepEqual([CARRY.wary.calm, CARRY.wary.steady, CARRY.wary.wary], [-1, 0, 1]);
  assert.equal(carryOf({ gait: "creep", ground: "cover", wind: "down", wary: -1 }).v, 1, "never under 1 tile");
  assert.equal(carryOf({ gait: "walk", ground: "open", wind: "up", wary: 1 }).v, 8);
  assert.equal(carryOf({ gait: "creep", rain: true }).v, 1);
  assert.equal(carryOf({ gait: "walk", fog: true }).v, 2, "the Built fog: two tiles less");
  assert.equal(carryOf({ gait: "creep", ground: "plain", wind: "across", wary: 0 }).v, 2);
});

// the explorer comes in a straight line from the south to a wild one at (10, 4); the wind blows toward the south (downwind: from her to him) or toward the north (upwind)
const HER = { x: 10, y: 4 };
const env = (wind, ground) => ({ wind, rain: false, fog: false, ground: () => ground, blocks: () => false });
const approach = (e, w, gait = "creep") => { let heard = 0, first = null; for (let d = 9; d >= 1; d--) { const h = heardAt(e, HER, HER.x, HER.y + d, gait, w); if (h) { heard++; if (first == null) first = d; } } return { heard, first }; };

for (const seed of SEEDS) {
  test("seed " + seed + ": downwind through reeds is heard from fewer tiles than upwind over sand (expected from the table, then measured)", () => {
    const w = wariness1(doingsOf(seed, 1).wary);
    const down = approach(env("S", "cover"), w), up = approach(env("N", "open"), w);
    assert.equal(down.heard, EXPECT.downReeds(w), "downwind reeds, expected from the table: " + EXPECT.downReeds(w));
    assert.equal(up.heard, EXPECT.upSand(w), "upwind sand, expected from the table: " + EXPECT.upSand(w));
    assert.equal(down.first, EXPECT.downReeds(w), "first heard at the carry's edge"); assert.equal(up.first, EXPECT.upSand(w));
    assert.ok(up.heard > down.heard, "the same approach: upwind sand is heard from farther");
    assert.equal(approach(env("E", "plain"), w).heard, EXPECT.acrossCreep(w), "across, creeping");
    assert.equal(approach(env("E", "plain"), w, "walk").heard, EXPECT.acrossWalk(w), "across, walking");
    // her ease through the approach: the first heard step is watching, the second is gone, and gone stays gone
    const c = { ease: 0, quiet: 0, crowd: 0, wary: w }, evs = [];
    for (let d = 9; d >= 1; d--) { const h = heardAt(env("N", "open"), HER, HER.x, HER.y + d, "creep", w); evs.push(...easeTick(c, h)); }
    assert.deepEqual(evs.filter(e => e !== "settled"), ["heard", "gone"].slice(0, c.ease >= 3 ? 2 : 1));
    assert.equal(c.ease, 3, "a second heard step sends her away for the day");
  });
}

test("rain takes a tile off; the partner's cost is zero until the designer sets one", () => {
  const e = { ...env("E", "plain"), rain: true };
  assert.equal(carryAt(e, HER, HER.x, HER.y + 3, "walk", 0).v, 3);
  assert.equal(carryAt(env("E", "plain"), HER, HER.x, HER.y + 3, "walk", 0, 0).v, 4, "no partner cost on the Loika's row yet");
});

test("ease: two quiet actions lower ears up, three lower watching; a first heard step is watching, a second is gone, and gone stays", () => {
  const c = { ease: 0, quiet: 0 };
  assert.deepEqual(easeTick(c, true), ["heard"]); assert.equal(c.ease, 2);
  easeTick(c, false); easeTick(c, false); assert.equal(c.ease, 2, "two quiet actions are not enough from watching");
  assert.deepEqual(easeTick(c, false), ["settled"]); assert.equal(c.ease, 1, "the third lowers it to ears up");
  easeTick(c, false); assert.deepEqual(easeTick(c, false), ["settled"]); assert.equal(c.ease, 0, "two quiet actions lower ears up to grazing");
  easeTick(c, true); assert.deepEqual(easeTick(c, true), ["gone"]); assert.equal(c.ease, 3);
  assert.deepEqual(easeTick(c, false), []); assert.deepEqual(easeTick(c, true), []); assert.equal(c.ease, 3, "gone is for the day");
  const d = { ease: 1, quiet: 0 }; easeTick(d, true); assert.equal(d.ease, 2, "a heard step at ears up is watching");
});

test("cover and sight: a prop or a raised edge between you blocks sight, so the step is not heard", () => {
  const blocked = { ...env("N", "open"), blocks: (x, y) => x === HER.x && y === HER.y + 2 };
  assert.equal(los(blocked, { x: HER.x, y: HER.y + 4 }, HER), false);
  assert.equal(heardAt(blocked, HER, HER.x, HER.y + 4, "creep", 0), false, "within the ring but unseen");
  assert.equal(heardAt(env("N", "open"), HER, HER.x, HER.y + 4, "creep", 0), true);
  assert.equal(los(blocked, { x: HER.x + 3, y: HER.y + 4 }, HER), true, "round the prop");
});

test("heard is round like the drawn ring: a straight step at the carry is heard, a diagonal outside the circle is not", () => {
  const e = env("N", "open"), v = carryAt(e, HER, HER.x, HER.y + 4, "creep", 0).v;
  assert.equal(heardAt(e, HER, HER.x, HER.y + v, "creep", 0), true, "straight at the carry");
  assert.equal(heardAt(e, HER, HER.x + v, HER.y + v, "creep", 0), false, "the corner of the square is outside the circle");
});

test("wind: per land per part of day from the seed, steady through a part, deterministic, four ways", () => {
  for (const seed of SEEDS) for (const land of [0, 5, 77]) {
    const row = DAY.parts.map(([n]) => windOf(seed, land, n));
    assert.deepEqual(row, DAY.parts.map(([n]) => windOf(seed, land, n)), "a pure function of the seed");
    for (const w of row) assert.ok(["N", "E", "S", "W"].includes(w));
    for (let spent = 0; spent < DAY.light; spent++) assert.equal(windAt(seed, land, spent), windOf(seed, land, DAY.parts.find((_, i) => spent < DAY.parts.slice(0, i + 1).reduce((a, p) => a + p[1], 0))[0]), "steady through a part");
  }
  const seen = new Set(); for (const seed of [1, 2, 3, 4, 5, 6, 7, 13, 42]) for (let land = 0; land < 20; land++) seen.add(windOf(seed, land, "dawn")); assert.equal(seen.size, 4, "all four ways are drawn");
  let turns = 0; for (const seed of SEEDS) for (let land = 0; land < 30; land++) { const r = DAY.parts.map(([n]) => windOf(seed, land, n)); turns += r.filter((w, i) => i && w !== r[i - 1]).length; } assert.ok(turns > 0, "it turns at some parts");
  assert.ok(WORDS.wind.N && WORDS.windShort.W, "the wind has its [copy] words");
});

test("the stay: each light within 2 tiles adds one, reset beyond; past 10 less twice the creeping carry (never below 0) it is a heard step", () => {
  const e = env("E", "plain"), c = { x: 5, y: 5, ease: 0, crowd: 0, wary: 0 }, P = { x: 5, y: 7 };
  assert.equal(stayAt(e, c, P.x, P.y, 0), 10 - 2 * 2);
  let n = 0; for (; n < 20; n++) if (stayTick(e, c, P)) break;
  assert.equal(n + 1, 7, "she lets you stay 6 light; the seventh is heard");
  assert.equal(c.crowd, 0, "the count resets when it is heard");
  stayTick(e, c, P); stayTick(e, c, P); assert.equal(stayLeft(e, c, P), 4);
  stayTick(e, c, { x: 5, y: 9 }); assert.equal(c.crowd, 0, "beyond 2 tiles the count is reset");
  assert.equal(stayLeft(e, c, { x: 5, y: 9 }), null);
  assert.equal(stayAt({ ...env("N", "open") }, { x: 5, y: 5 }, 5, 7, 1), 0, "never below 0 (upwind over sand, wary)");
});

test("keeping still as one act stops on each of its four stops", () => {
  const run = (script, easeOf = () => 0) => { let i = 0; return holdRun(() => script[Math.min(i++, script.length - 1)], easeOf); };
  assert.deepEqual(run([{}]), { n: HOLD_MAX, why: "ten" }, "ten light gone");
  assert.deepEqual(run([{}, {}, { tell: true }]), { n: 3, why: "tell" }, "a tell starts");
  assert.deepEqual(run([{}, { weather: true }]), { n: 2, why: "weather" }, "the weather turns");
  assert.deepEqual(run([{}, {}, {}, { part: true }]), { n: 4, why: "part" }, "the part of day turns");
  let e = 0; assert.deepEqual(holdRun(() => { e = 1; return {}; }, () => e), { n: 1, why: "ease" }, "her ease changes");
  assert.deepEqual(run([{ over: true }]), { n: 1, why: "over" });
  assert.equal(HOLD_MAX, 10);
});

// ---------- the page ----------
const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;

for (const seed of SEEDS) {
  test("on the page, seed " + seed + ": a named Loika hears the first step at the table's distance, a second heard step sends her to her next haunt for the day, E5 counters are written", () => {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place");
    // a clear straight line south of her: bare grass or the ground under test, no blocker, no storm, no fog; her routine pinned where she stands
    const setup = (ground, side) => JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id});
      const stormless = () => { S.exp.storm = null; };  stormless();
      c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; delete c.wary;
      lay.easeG = { cov: new Set(), blk: new Set() };
      const W = windAt(S.seed, lay.cell, S.day.spent), vec = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[W];
      // the explorer comes from the side the wind blows toward (downwind) or from the side it blows from (upwind); she stands where that side has 11 tiles of room
      const sgn = ${side === "down" ? 1 : -1}, dx = vec[0] * sgn, dy = vec[1] * sgn;
      const clampX = v => Math.max(2, Math.min(lay.w - 3, v)), clampY = v => Math.max(2, Math.min(lay.h - 3, v));
      c.x = dx > 0 ? 2 : dx < 0 ? lay.w - 3 : clampX(c.x); c.y = dy > 0 ? 2 : dy < 0 ? lay.h - 3 : clampY(c.y);
      const g = ${JSON.stringify(ground)} === 'cover' ? T.REEDS : T.SAND;
      for (let k = 0; k <= 10; k++) { const x = c.x + dx * k, y = c.y + dy * k; if (x < 1 || y < 1 || x >= lay.w - 1 || y >= lay.h - 1) return JSON.stringify({ bad: 1 }); lay.tiles[y * lay.w + x] = g; lay.reach[y * lay.w + x] = 1; }
      c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
      return JSON.stringify({ W, dx, dy, x: c.x, y: c.y, wary: wariness1(c.ind.doings.wary) }); })()`));
    // the first heard step, by the table: creeping, reeds downwind carries max(1, 0 + w); sand upwind carries 5 + w
    let ran = 0;
    for (const [ground, side, expect] of [["cover", "down", w => Math.max(1, w)], ["open", "up", w => 5 + w]]) {
      const s = setup(ground, side); if (s.bad) continue; ran++;
      const want = expect(s.wary); let first = null;
      for (let d = Math.min(9, want + 3); d >= 1 && first == null; d--) {
        p.run(`(() => { const lay = curLay(), P = S.exp.patch, c = curLive().cr.find(q => q.id === ${pick.id}); const prevP = { x: P.x, y: P.y }; P.x = c.x + ${s.dx} * ${d}; P.y = c.y + ${s.dy} * ${d}; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
          advance('patch', { noise: 'creep', moved: true, prevP: { x: P.x + ${s.dx}, y: P.y + ${s.dy} } }); })()`);
        if (p.run(`curLive().cr.find(q => q.id === ${pick.id}).ease`) >= 2) first = d;
      }
      assert.equal(first, want, seed + " " + ground + " " + side + ": heard first at " + want + " tiles by the table (wind " + s.W + ", wary " + s.wary + ")");
    }
    assert.ok(ran >= 1, "at least one approach ran in a place with room");
    // a second heard step: she is gone, and goes to her next haunt, where she stays for the rest of the day
    const s2 = setup("open", "up");
    if (!s2.bad) {
      const out = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), P = S.exp.patch, ex = S.exp;
        const step = d => { const prevP = { x: P.x, y: P.y }; P.x = c.x + ${s2.dx} * d; P.y = c.y + ${s2.dy} * d; advance('patch', { noise: 'walk', moved: true, prevP }); };
        const here = dayPart(), want = nextHaunt(c.ind, here), from = hauntAt(c.ind.hs, c.ind.doings, here);
        step(1); const e1 = c.ease; step(1); const e2 = c.ease;
        if (!S.exp) return JSON.stringify({ ended: 1 });
        const at = c.gone && c.gone.t;
        for (let i = 0; i < 30 && S.exp && !S.exp.ending; i++) { P.x = 1; P.y = 1; advance('patch', { noise: 'act' }); }
        return JSON.stringify({ e1, e2, same: !!(want && from && want.x === from.x && want.y === from.y), tx: at && at.x, ty: at && at.y, x: c.x, y: c.y, e: c.ease, gone: !!c.gone, e5: S.exp && S.exp.stats.e5 }); })()`));
      assert.ok(!out.ended, "the day went on");
      assert.equal(out.e1, 2, "the first heard step is watching"); assert.equal(out.e2, 3, "the second is gone"); assert.ok(out.gone && out.tx != null, "she has a next haunt to go to");
      assert.ok(Math.max(Math.abs(out.x - out.tx), Math.abs(out.y - out.ty)) <= 2, "she walked to it: " + JSON.stringify(out));
      assert.equal(out.e, 3, "and stays gone");
      assert.ok(out.e5 && out.e5.gone >= 1 && out.e5.heard >= 2 && "notes" in out.e5 && "circles" in out.e5 && "backsOff" in out.e5, "the E5 counters are written");
    }
    assert.deepEqual(p.errors, []);
  });
}

test("on the page, facing a named Loika, ✓ keeps still and runs Waits until a stop; the wind shows in the bottom line's conditions slot", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; const live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch, lay = curLay();
    S.known = [0, ...S.known.filter(k => k !== 0)];
    c.ease = 0; c.quiet = 0; c.hide = 0; c.st = 'idle';
    const f = frontOf(P); c.x = f.x; c.y = f.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } }; S.day.spent = 1;
    const act = patchAction(), label = act.label, before = S.day.spent; act.run();
    const used = S.day.spent - before, why = S.exp && S.exp.lastHold && S.exp.lastHold.why;
    const wx = lineWx(); c.ease = 0; c.crowd = 0; c.x = P.x; c.y = P.y + 2; const wc = wildCtx(c, 'Alder'); return JSON.stringify({ label, used, why, wind: wx && wx.wind, w: windNowWord(), wc }); })()`));
  assert.ok(out.wc && /^Alder · grazing · creep (un)?heard · walk (un)?heard · stay \d+$/.test(out.wc[0]) && out.wc.every(s => typeof s === 'string'), 'the line under a wild one in sight: ease, creep and walk, how long it lets you stay: ' + JSON.stringify(out.wc));
  assert.equal(out.label, WORDS.ease.keep, "✓ is Keep still");
  assert.ok(out.used >= 1 && out.used <= 10, "each Wait spends its light: " + out.used);
  assert.ok(["ten", "part", "weather", "tell", "ease"].includes(out.why), "it stopped on a stop: " + out.why);
  assert.ok(["N", "E", "S", "W"].includes(out.wind), "the conditions slot carries the wind");
  assert.deepEqual(p.errors, []);
});

test("owner note 111: a named wild one of an unidentified kind reads Keep still and 'Name · a wild Loika'; an unnamed one stays Unknown creature", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; const live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    S.known = S.known.filter(k => k !== c.sp); S.named = S.named || {}; S.named[c.id] = 'Kestrel';
    c.ease = 0; c.quiet = 0; c.hide = 0; c.st = 'idle';
    const f = frontOf(P); c.x = f.x; c.y = f.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } }; S.day.spent = 1;
    const a = patchAction(), ln = lineBase(); const ind = c.ind; c.ind = null; const a2 = patchAction(); c.ind = ind;
    return JSON.stringify({ label: a.label, run: !!a.run, ctx: ln.ctx, label2: a2.label, kind: spOf(c.sp).name }); })()`));
  assert.equal(out.label, WORDS.ease.keep, "✓ is Keep still");
  assert.ok(out.run, "and it works");
  const ctx = [].concat(out.ctx).filter(s => /Kestrel/.test(s));
  assert.ok(ctx.length && ctx.every(s => s.includes("a wild " + out.kind) && !/Unknown|eats|drinks|Data/.test(s)), "the context names her as a wild kind, no diet or act: " + JSON.stringify(out.ctx));
  assert.equal(out.label2, "Unknown creature", "an unnamed creature of an unidentified kind");
  assert.deepEqual(p.errors, []);
});

test("owner note 156: a named wild one never reads 'Unknown creature' beside her name (any ease); before she is met her prints and bump say 'a Loika'", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; const live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    S.known = S.known.filter(k => k !== c.sp); S.named = S.named || {}; S.named[c.id] = 'Drizzle';
    c.quiet = 0; c.hide = 0; c.st = 'idle'; const f = frontOf(P); c.x = f.x; c.y = f.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } }; S.day.spent = 1;
    const labels = [0, 1, 2, 3].map(e => { c.ease = e; return patchAction().label; });
    const o = occupant(P.key, f.x, f.y, 'player'), lay = curLay(), met = blockWords(lay, f.x, f.y, o);
    delete S.named[c.id]; const before = habName(c), bump = blockWords(lay, f.x, f.y, o), rn = c.ind.name;
    const ind = c.ind; c.ind = null; const unnamed = blockWords(lay, f.x, f.y, o); c.ind = ind;
    return JSON.stringify({ labels, met, before, bump, unnamed, rn }); })()`));
  for (const l of out.labels) assert.ok(!/Unknown creature/.test(l), "no Unknown creature beside a name: " + l);
  assert.equal(out.labels[3], "Drizzle · a wild Loika", "keep still not open: her name line, nothing to run");
  assert.equal(out.met, "Drizzle is there", "a met one says her name");
  assert.equal(out.before, "a Loika", "not yet met: a Loika, never the realm's name " + out.rn);
  assert.equal(out.bump, "A Loika is there");
  assert.equal(out.unnamed, "A mibi is there", "only an unnamed creature keeps the generic line");
  assert.deepEqual(p.errors, []);
});

test("owner note 156-2: a named one in view is named at once, on drawing the view, with no action", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; const live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    c.quiet = 0; c.hide = 0; const f = frontOf(P); c.x = f.x; c.y = f.y; S.named = {}; S.metIds = [];
    const before = habName(c); nameInSight(); const after = habName(c);
    return JSON.stringify({ before, after, rn: c.ind.name, met: S.metIds.includes(String(c.id)) }); })()`));
  assert.equal(out.before, "a Loika");
  assert.equal(out.after, out.rn, "named at once");
  assert.ok(out.met, "in the Log's met list");
  assert.deepEqual(p.errors, []);
});
