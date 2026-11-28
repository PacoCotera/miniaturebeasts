// night step 5: the sleeper (night-step-5-1): a first heard step only stirs her, a sleeper can still be noted, what a night note gives, near is not the easy range at night (N4)
//   node --test prototypes/exploration/tests/night-step-5.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { easeTick } from "../src/logic/ease.mjs";
import { sleeperGives, isSleeper, noteIn, blank, givesAt } from "../src/logic/habits.mjs";
import { DAY, WORDS } from "../src/data/words.mjs";

const nightAt = DAY.parts.slice(0, -1).reduce((a, q) => a + q[1], 0) + 5;   // five light into the night
const duskAt = DAY.light - DAY.parts[5][1] - DAY.parts[4][1] + 5;   // five light into the dusk

test("asleep, the first heard step only stirs her; the next wakes her and she watches, the next she is gone; awake it is as built", () => {
  const c = { ease: 0, quiet: 0 };
  assert.deepEqual(easeTick(c, true, true), ["stirred"]); assert.equal(c.ease, 1);
  assert.deepEqual(easeTick(c, true, true), ["heard"]); assert.equal(c.ease, 2, "the next heard step wakes her and she watches");
  assert.deepEqual(easeTick(c, true, true), ["gone"]); assert.equal(c.ease, 3, "the next she is gone");
  const d = { ease: 0, quiet: 0 }; assert.deepEqual(easeTick(d, true), ["heard"]); assert.equal(d.ease, 2, "awake: a first heard step is watching, as built");
  const e = { ease: 0, quiet: 0 }; easeTick(e, true, true); easeTick(e, false, true); assert.deepEqual(easeTick(e, false, true), ["settled"]); assert.equal(e.ease, 0, "two quiet actions and she has settled");
});

test("what a sleeper's note gives: the habit always; her coat from mid by dusk, never by night; the keepsake from near, never while stirred; never her face", () => {
  assert.deepEqual(sleeperGives("far", "dusk"), { gives: [], keepsake: false });
  assert.deepEqual(sleeperGives("mid", "dusk"), { gives: ["coat"], keepsake: false });
  assert.deepEqual(sleeperGives("near", "dusk"), { gives: ["coat"], keepsake: true });
  assert.deepEqual(sleeperGives("mid", "night"), { gives: [], keepsake: false }, "at 3 tiles by night the habit only");
  assert.deepEqual(sleeperGives("near", "night"), { gives: [], keepsake: true }, "at 2 or closer also the keepsake, never her coat");
  assert.deepEqual(sleeperGives("near", "night", true), { gives: [], keepsake: false }, "a stirred sleeper gives no keepsake");
  assert.deepEqual(sleeperGives("near", "dusk", true), { gives: ["coat"], keepsake: false });
  for (const part of ["dusk", "night"]) for (const r of ["far", "mid", "near"]) for (const s of [false, true]) assert.ok(!sleeperGives(r, part, s).gives.includes("face") && !sleeperGives(r, part, s).gives.includes("place"));
  const rec = blank(), a = noteIn(rec, "mid", true, "coat", true, []); assert.ok(a.first && a.gives.length === 0 && !rec.got.coat && rec.ranges.mid === 1, "a night note counts the habit and gives nothing else");
  assert.deepEqual(givesAt("near", true), ["face"], "the day's rule is unchanged");
});

test("a sleeper: at her bed from dusk, her bedding-down over (played, missed or lost) and at ease or stirred", () => {
  const ok = { part: "night", atBed: true, played: true, hasPlay: false, gone: false, ease: 0 };
  assert.ok(isSleeper(ok) && isSleeper({ ...ok, part: "dusk" }) && isSleeper({ ...ok, ease: 1 }));
  assert.ok(!isSleeper({ ...ok, part: "midday" }) && !isSleeper({ ...ok, atBed: false }) && !isSleeper({ ...ok, played: false }) && !isSleeper({ ...ok, hasPlay: true }) && !isSleeper({ ...ok, gone: true }) && !isSleeper({ ...ok, ease: 2 }));
});

for (const seed of [7, 13, 42]) {
  const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;
  // a Loika asleep at her bed (her routine says bed at that part), a clear place, no storm; the explorer stands where the test says
  const setup = (p, pick, spent) => p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; S.exp.fog = null; const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id});
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = ${spent}; live.strike = null; S.exp.stray = null; lay.easeG = { cov: new Set(), blk: new Set() }; c.ind.doings.late = 0;
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; c.hb = null; delete c.wary;
    const bed = hauntStand(hauntAt(c.ind.hs, c.ind.doings, dayPart()), hauntFree(lay, key, null)); c.x = bed.x; c.y = bed.y; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
    habDay()[habKey(c, 'sleep')] = 'played'; return 1; })()`);
  // the explorer d tiles from her on a straight line facing her: the first direction with room
  const stand = (p, pick, d) => p.run(`(() => { const lay = curLay(), P = S.exp.patch, c = curLive().cr.find(q => q.id === ${pick.id});
    for (const dir of ['up', 'down', 'left', 'right']) { const [fx, fy] = DIRS[dir], x = c.x - fx * ${d}, y = c.y - fy * ${d}; let ok = x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1;
      for (let k = 0; ok && k <= ${d}; k++) { const tx = c.x - fx * k, ty = c.y - fy * k; if (!lay.reach[ty * lay.w + tx] || T_BLOCK[lay.tiles[ty * lay.w + tx]]) ok = false; }
      if (ok) { P.x = x; P.y = y; P.dir = dir; lightningLift(P.key, P.x, P.y, 12); return true; } } return false; })()`);
  const start = p => { p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place"); return pick; };

  test("seed " + seed + ": by night a sleeper's first heard step stirs her, the second wakes her, the third sends her from that bed to her dawn haunt, and the next morning she is there", () => {
    const p = page(), pick = start(p); setup(p, pick, nightAt);
    const out = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), P = S.exp.patch, lay = curLay(); const s0 = sleeperOf(c), cur0 = curledNow(c);
      const step = () => { const prevP = { x: P.x, y: P.y }; P.x = c.x + 1; P.y = c.y; advance('patch', { noise: 'walk', moved: true, prevP }); };
      step(); const e1 = c.ease, s1 = sleeperOf(c), cur1 = curledNow(c); step(); const e2 = c.ease; step(); const e3 = c.ease, gone = !!c.gone;
      const dawn = nextHaunt(c.ind, dayPart()), t = c.gone && c.gone.t, night = c.gone && c.gone.night;
      const d0 = t ? Math.max(Math.abs(c.x - t.x), Math.abs(c.y - t.y)) : 0, dawnT = hauntStand(hauntAt(c.ind.hs, c.ind.doings, "dawn"), hauntFree(lay, S.exp.patch.key, c)); for (let i = 0; i < 40 && S.exp && !S.exp.ending; i++) { P.x = 1; P.y = 1; advance('patch', { noise: 'act' }); }
      const d1 = t ? Math.max(Math.abs(c.x - t.x), Math.abs(c.y - t.y)) : 99, atDawnHaunt = !!t && !!dawnT && t.x === dawnT.x && t.y === dawnT.y && (d1 <= 2 || d1 < d0);
      S.turn++; S.day.spent = 3; c.ind.go = null; advance('patch', { noise: 'act' }); P.x = 1; P.y = 1;
      return JSON.stringify({ s0, cur0, e1, s1, cur1, e2, e3, gone, atDawnHaunt, night, back: { ease: c.ease, gone: !!c.gone } }); })()`));
    assert.ok(out.s0 && out.cur0, "asleep and curled before any step");
    assert.equal(out.e1, 1, "one heard step only stirs her (ears up)"); assert.ok(out.s1 && !out.cur1, "stirred she is still a sleeper but not curled");
    assert.equal(out.e2, 2, "the next heard step wakes her and she watches"); assert.equal(out.e3, 3, "the next she is gone"); assert.ok(out.gone && out.night != null, "gone by night: she leaves that bed for the night");
    assert.ok(out.atDawnHaunt, "she walks to her next haunt, the dawn one");
    assert.equal(out.back.ease, 0, "the next day is not lost: she is at ease again in the morning"); assert.ok(!out.back.gone);
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": a sleeper whose bedding-down was missed can be noted by night: from 3 tiles the habit only, from 2 the keepsake; never her coat, never her face", () => {
    const p = page(), pick = start(p); setup(p, pick, nightAt);
    const run = d => { if (!stand(p, pick, d)) return null; return JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); const rec = () => (S.habits[c.id] || {}).sleep || { got: {}, ranges: {}, sample: null };
      const n0 = (S.exp.stats.notes || 0); if (!noteHabit(c)) return JSON.stringify({ target: false }); const r = rec(); return JSON.stringify({ target: true, got: r.got, ranges: r.ranges, sample: r.sample, notes: (S.exp.stats.notes || 0) - n0, last: S.exp.stats.noted.slice(-1)[0] }); })()`)); };
    const at3 = run(3);
    if (!at3) return;   // no straight line of 3 free tiles from her bed in this place
    assert.ok(at3.target, "keeping still in sight of a sleeper in the lamp notes her: " + JSON.stringify(at3)); assert.equal(at3.notes, 1, "one action");
    assert.equal(at3.ranges.mid, 1, "the habit counts"); assert.ok(!at3.sample, "from 3 tiles no keepsake"); assert.ok(!at3.got.coat && !at3.got.face && !at3.got.place, "nothing else by night");
    assert.ok(at3.last.asleep && at3.last.part === "night");
    const at2 = run(2);
    if (at2) { assert.ok(at2.target); assert.ok(at2.sample, "from 2 tiles the keepsake"); assert.ok(!at2.got.coat && !at2.got.face, "never her coat, never her face by night"); assert.ok(at2.last.keepsake); }
    const again = run(3); assert.ok(!again || !again.target, "once a day for each range: keeping still no longer notes her from 3");
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": a stirred sleeper gives no keepsake until she has settled; the stay counts by night as by day", () => {
    const p = page(), pick = start(p); setup(p, pick, nightAt);
    if (!stand(p, pick, 2)) return;
    const out = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), rec = () => (S.habits[c.id] || {}).sleep || { got: {}, ranges: {}, sample: null };
      c.ease = 1; c.quiet = 0; if (!noteHabit(c)) return JSON.stringify({ target: false }); const stirred = { sample: rec().sample, last: S.exp.stats.noted.slice(-1)[0] };
      c.ease = 0; if (!noteHabit(c)) return JSON.stringify({ target: true, again: false, stirred }); const settled = { sample: rec().sample };
      return JSON.stringify({ target: true, again: true, stirred, settled }); })()`));
    assert.ok(out.target && out.again, "a stirred sleeper can be noted, and again once she has settled: " + JSON.stringify(out));
    assert.ok(!out.stirred.sample, "no keepsake while she is stirred"); assert.ok(out.stirred.last.stirred && !out.stirred.last.keepsake);
    assert.ok(out.settled.sample, "settled, the keepsake");
    // the stay: a still explorer within 2 tiles of her runs the stay down at night as by day: she stirs when it runs out
    const stay = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), P = S.exp.patch; c.ease = 0; c.crowd = 0; c.quiet = 0; let n = 0, ev = null;
      for (; n < 40 && c.ease < 1; n++) advance('patch', { noise: 'act' }); return JSON.stringify({ n, ease: c.ease }); })()`));
    assert.equal(stay.ease, 1, "her stay ran out: a heard step, so she stirred"); assert.ok(stay.n >= 1 && stay.n <= 11, "within the stay's ten light: " + JSON.stringify(stay));
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": her bed goes on her page from any sighting of her in it, from far", () => {
    const p = page(), pick = start(p); setup(p, pick, duskAt);
    const out = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}), P = S.exp.patch, lay = curLay(); S.pages = {};
      P.x = Math.min(lay.w - 2, Math.max(1, c.x + (c.x > lay.w / 2 ? -6 : 6))); P.y = c.y; lightningLift(P.key, P.x, P.y, 12); const far = Math.max(Math.abs(P.x - c.x), Math.abs(P.y - c.y)), seen = inSight(c.x, c.y);
      advance('patch', { noise: 'act' }); const pg = (S.pages || {})[c.id] || {}; return JSON.stringify({ far, seen, bed: pg.bed || null, hs: c.ind.hs.bed }); })()`));
    if (!out.seen || out.far <= 5) return;   // this place gives no far sight of her bed
    assert.ok(out.bed && out.bed.x === out.hs.x && out.bed.y === out.hs.y, "her bed is on her page after a far sighting: " + JSON.stringify(out));
    assert.deepEqual(p.errors, []);
  });
}

test("[copy] and [art]: the new words are working words; her curled token slot holds the signed round 4 frames", () => {
  assert.ok(WORDS.ease.stirred && WORDS.habit.asleep && WORDS.habit.asleepStirred);
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  const c = JSON.parse(p.run("JSON.stringify(CURLED_LOIKA)"));
  assert.ok(c.file && c.plain.length === 2 && c.saddled.length === 2);   // signed round 4: two breathing frames, plain and saddled
});
