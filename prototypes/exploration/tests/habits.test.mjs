// W4 on the live realm: habits that play (tell, four beats), notes by range, the card line, the sample (walk-design-1 W4; G1's range rule, the range rule 3A and 3B).
//   node --test prototypes/exploration/tests/habits.test.mjs
// A scripted rain on seeds 7, 13 and 42: the nose lifts before the rain stops, the shake plays, a near note gives the tuft.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { rangeOf, givesAt, clearAir, wantOf, tellOf, rainEndsIn, calmWindow, noteIn, blank, leftHaunts, dewLies, HABITS, SAMPLE, BEATS } from "../src/habits.mjs";
import { DAY, WORDS } from "../src/words.mjs";
import { ROUTINE } from "../src/gen7/haunts.mjs";

test("range: far beyond 5 tiles, mid 3 to 5, near 2 or closer", () => {
  assert.deepEqual([1, 2, 3, 5, 6, 9].map(rangeOf), ["near", "near", "mid", "mid", "far", "far"]);
});
test("what a note gives by range (the range rule 3A, mid's clause out): far where she goes in clear air, mid her coat in any air, near her face", () => {
  assert.deepEqual(givesAt("far", true), ["place"]); assert.deepEqual(givesAt("far", false), []);
  assert.deepEqual(givesAt("mid", true), ["coat"]); assert.deepEqual(givesAt("mid", false), ["coat"]);
  assert.deepEqual(givesAt("near", true), ["face"]); assert.deepEqual(givesAt("near", false), ["face"]);
});
test("clear air is weather only: no rain, no fog; nothing turns on dusk (slip W8)", () => {
  assert.equal(clearAir({ raining: false, fog: false, part: "dusk" }), true); assert.equal(clearAir({ raining: false, fog: false, part: "night" }), true);
  assert.equal(clearAir({ raining: true, fog: false, part: "morning" }), false); assert.equal(clearAir({ raining: false, fog: true, part: "morning" }), false);
});
test("the card line (slip W5): her coat first, then her face, then where she goes; sleep-curled asks her coat or her face only; null when nothing is left", () => {
  assert.equal(wantOf(7, 3, "shake", {}), "coat");
  assert.equal(wantOf(7, 3, "shake", { coat: 1 }), "face");
  assert.equal(wantOf(7, 3, "calm", { coat: 1, face: 1 }), "place");
  assert.equal(wantOf(7, 3, "calm", { place: 1, coat: 1, face: 1 }), null);
  assert.equal(wantOf(7, 3, "sleep", {}), "coat"); assert.equal(wantOf(7, 3, "sleep", { coat: 1 }), "face");
  assert.equal(wantOf(7, 3, "sleep", { coat: 1, face: 1 }), "place", "night step 4: sleep-curled's last line is where she goes at first light");
  assert.equal(wantOf(7, 3, "sleep", { coat: 1, face: 1, place: 1 }), null);
});
test("a far note at dusk or night gives the habit's shape only; clear air stays weather only (night step 4)", () => {
  assert.deepEqual(givesAt("far", true, true), ["place"]); assert.deepEqual(givesAt("far", true, false), []); assert.deepEqual(givesAt("far", false, true), []);
  assert.deepEqual(givesAt("mid", true, false), ["coat"], "mid does not change"); assert.deepEqual(givesAt("near", true, false), ["face"], "near does not change");
  const rec = blank(); assert.deepEqual(noteIn(rec, "far", true, "coat", false).gives, []); assert.ok(!rec.got.place);
});
test("the dew's prints point: at dusk her afternoon haunt leads to her bed; in the morning her bed leads to where she is, and not after the dew dries", () => {
  const hs = { water: { x: 1, y: 1 }, grass: { x: 5, y: 1 }, third: { x: 9, y: 1 }, bed: { x: 13, y: 1 } }, early = { wary: 0, drive: 1 };
  const at = (part, p) => leftHaunts(hs, early, part, false, DAY.parts).find(q => q.part === p && !q.yday);
  const dusk = at("dusk", "afternoon"); assert.ok(dusk && dusk.to && dusk.to.x === 13 && dusk.toPart === "dusk", "dusk: the afternoon haunt points to her bed");
  const morn = leftHaunts(hs, early, "morning", false, DAY.parts).find(q => q.yday && q.part === "night");
  assert.ok(morn && morn.to && morn.to.x === 1, "morning: her bed points to the water she is at");
  const dawn = at("morning", "dawn"); assert.ok(dawn && dawn.to && dawn.to.x === 5, "in the morning the water she left at first light points to the grass");
  for (const q of leftHaunts(hs, early, "midday", false, DAY.parts)) assert.equal(q.to, null, "by dry day the prints read as today and do not point");
  for (const q of leftHaunts(hs, early, "afternoon", false, DAY.parts)) assert.equal(q.to, null);
  assert.equal(leftHaunts(hs, early, "dusk", true, DAY.parts).find(q => q.gone).to, null, "a bolt points nowhere");
  assert.ok(dewLies("dusk", DAY.parts) && dewLies("night", DAY.parts) && dewLies("dawn", DAY.parts) && dewLies("morning", DAY.parts) && !dewLies("midday", DAY.parts) && !dewLies("afternoon", DAY.parts));
});
test("her prints (3A): the haunts she kept earlier today and has left; yesterday's while the morning lasts; the haunt she bolted from", () => {
  // an early Loika: dawn water, morning grass, midday third, afternoon grass, dusk and night bed
  const hs = { water: { x: 1, y: 1 }, grass: { x: 5, y: 1 }, third: { x: 9, y: 1 }, bed: { x: 13, y: 1 } }, early = { wary: 0, drive: 1 };
  const at = (part, gone) => leftHaunts(hs, early, part, gone).map(q => (q.yday ? "y" : "") + q.part + ":" + q.h.x + (q.gone ? "!" : ""));
  assert.ok(at("dawn").every(s => s.startsWith("y")), "at dawn nothing of today is left yet");
  assert.ok(at("morning").includes("dawn:1"), "in the morning the water she left at first light");
  assert.deepEqual(at("midday").filter(s => !s.startsWith("y")), ["morning:5", "dawn:1"], "midday: the grass and the water she has left");
  assert.ok(!at("afternoon").some(s => s.startsWith("y")), "yesterday's prints are gone after the morning");
  assert.equal(at("midday", true)[0], "midday:9!", "a bolt leaves the haunt she was keeping");
  assert.deepEqual(leftHaunts(null, early, "midday", false), []);
  assert.ok(!leftHaunts(hs, early, "dawn", false, undefined, true).some(q => q.yday) && at("dawn").length > 0, "day 1 has no yesterday: no yesterday's prints");
});
test("a note fills the line only when it gives the wanted thing; any note counts the habit; the first note is the habit's first", () => {
  const rec = blank(); const a = noteIn(rec, "far", true, "face"); assert.ok(a.first && !a.filled && a.gives[0] === "place");
  const b = noteIn(rec, "near", true, "face"); assert.ok(!b.first && b.filled && rec.got.face && rec.best === "near" && rec.ranges.far === 1);
});
test("the tell is the individual's: two to four actions", () => {
  for (const d of [{ wary: 0, drive: 1.4 }, { wary: 1, drive: .6 }, { wary: .5, drive: 1 }, { wary: 0, drive: .6 }]) { const n = tellOf(d); assert.ok(n >= 2 && n <= 4, JSON.stringify(d) + " " + n); }
  assert.equal(BEATS, 4);
});
test("the rain's end, read ahead with the page's own step", () => {
  const st = { x: 3.2, w: 3, dir: -1, v: .25 }, col = 5;   // centre 4.7; the core passes (off >= 1.5) when the centre is at 3.5 or less
  let n = 0, x = st.x; while (Math.abs(col + .5 - (x + 1.5)) < 1.5) { const over = col + 1 > x && col < x + 3; x += (over ? .2 : .25) * -1; n++; }
  assert.equal(rainEndsIn(st, col, 30), n); assert.equal(rainEndsIn(st, col, n - 1), 0); assert.equal(rainEndsIn({ ...st, x: 20 }, col, 30), 0, "no rain over the column: 0");
});
test("the calm window lies in a part she is not at her bed, ten-odd light long, from the seed", () => {
  for (const id of [1, 2, 3, 4]) for (const day of [0, 1, 2]) {
    const w = calmWindow(7, id, day, DAY.parts, ROUTINE.early), w2 = calmWindow(7, id, day, DAY.parts, ROUTINE.early);
    assert.deepEqual(w, w2); assert.ok(w && w.to - w.from === 12 && w.from >= 0 && w.to <= DAY.light - DAY.parts[DAY.parts.length - 1][1], JSON.stringify(w)); }
});
test("a sample answers a chapter: whisker Face, shed claw Legs & Tail; a shake gives no tuft", () => {
  assert.equal(SAMPLE.shake, undefined, "a shake drops no tuft");
  assert.deepEqual(HABITS.filter(k => SAMPLE[k]).map(k => SAMPLE[k].chapter), ["face", "legs-tail"]);
  for (const k of HABITS) assert.ok(WORDS.habit.name[k] && WORDS.habit.tell[k] && WORDS.habit.beat[k].length === 4, "[copy] words for " + k);
});

const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;

for (const seed of [7, 13, 42]) {
  test("on the page, seed " + seed + ": her nose lifts before the rain stops, the shake plays with no prompt and no tuft, keeping still beside her is the note", () => {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place");
    const out = JSON.parse(p.run(`(() => {
      const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch, col = lay.cell % MW;
      S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 50;
      // cover to stand in, two tiles south of her, her routine pinned where she stands, the rain's end nine light off
      c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; delete c.wary; c.wet = 1; c.ind.go = { part: dayPart(), t: { x: c.x, y: c.y } };
      lay.easeG = { cov: new Set(), blk: new Set() };
      // the explorer stands on the side the wind blows toward (downwind), in reeds
      const W = windAt(S.seed, lay.cell, S.day.spent), vec = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[W]; let ok = true;
      for (let d = 1; d <= 4; d++) { const x = c.x + vec[0] * d, y = c.y + vec[1] * d; if (x < 1 || y < 1 || x >= lay.w - 1 || y >= lay.h - 1) { ok = false; break; } lay.tiles[y * lay.w + x] = T.REEDS; lay.reach[y * lay.w + x] = 1; }
      if (!ok) return JSON.stringify({ bad: 1 });
      unveil(key, c.x, c.y, 5); P.x = c.x + vec[0] * 4; P.y = c.y + vec[1] * 4; P.dir = vec[1] > 0 ? 'up' : vec[1] < 0 ? 'down' : vec[0] > 0 ? 'left' : 'right'; S.exp.storm = { x: col + .5 - 1.5 + 1.7 - 1.5, w: 3, dir: -1, v: .25, t: 0 };
      const log = []; let closed = 0, noted = null, tellRain = null, beatRain = null, shook = false, tuft = false, prompted = false;
      const d0 = S.exp.cargo.d;
      for (let i = 0; i < 40 && S.exp && !S.exp.ending; i++) {
        if (c.hb && !closed) { closed = 1; P.x = c.x + vec[0] * 2; P.y = c.y + vec[1] * 2; }   // the tell is the moment to step in
        live.strike = null; S.exp.stray = null;   // no lightning in the script: a strike near her would startle her
        const a = patchAction();
        if (c.hb && a.label === 'Note it') prompted = true;
        if (c.hb && c.hb.n > c.hb.tell && a.label === WORDS.ease.keep && !noted) { a.run(); noted = { range: S.exp.stats.noted[0].range, gives: S.exp.stats.noted[0].gives, first: S.exp.stats.noted[0].first }; }
        else advance('patch', { noise: 'act' });
        const h = c.hb;
        if (h && tellRain == null) tellRain = stormRain(col);
        if (h && h.n >= h.tell && beatRain == null) beatRain = stormRain(col) || (S.exp.storm && Math.abs(col + .5 - (S.exp.storm.x + 1.5)) < 1.5);
        if (h && h.pose === 'shake') shook = true;
        if (live.tf.length) tuft = true;
        log.push(h ? h.k + h.n : c.st);
        if (S.day.hab[c.id + ':shake'] === 'played') break;
      }
      return JSON.stringify({ log: log.join(' '), noted, prompted, tellRain, beatRain, shook, tuft, day: S.day.hab[c.id + ':shake'], samples: S.exp.cargo.samples, dData: S.exp.cargo.d - d0, hab: S.habits[c.id] && S.habits[c.id].shake, tell: c.hb && c.hb.tell, line: wildCtx(c, 'Alder') });
    })()`));
    if (out.bad) return;
    assert.equal(out.day, "played", "the shake played to its end: " + out.log);
    assert.ok(out.tellRain, "the tell began while the rain was still falling (her nose lifts): " + out.log);
    assert.ok(out.shook, "the shake pose played");
    assert.ok(out.noted && out.noted.range === "near" && out.noted.first, "a near note, the habit's first: " + JSON.stringify(out.noted));
    assert.deepEqual(out.noted.gives, ["face"]);
    assert.equal((out.samples || []).length, 0, "a shake gives no tuft: nothing comes home with the note"); assert.ok(!out.hab || !out.hab.sample, "the shake's record holds no sample");
    assert.equal(out.dData, 1, "the first note of a habit pays +1 Data");
    assert.ok(!out.tuft, "no tuft is left on the ground"); assert.ok(!out.prompted, "no Note it prompt during a habit");
    assert.deepEqual(p.errors, []);
  });
}

for (const seed of [7, 13]) {
  test("on the page, seed " + seed + ": her prints at a haunt she has left are read with one action, once a day, with no Data and no habit note, and the empty haunt's drop (W5)", () => {
    const p = page(); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place");
    const out = JSON.parse(p.run(`(() => {
      const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
      S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 250; live.strike = null; S.exp.stray = null;
      const list = printsHere(); if (!list.length) return JSON.stringify({ none: 1 });
      const q = list[0], far = q.stand;
      // she is elsewhere (more than 2 tiles from the prints), the explorer stands beside them facing nothing
      c.x = Math.min(lay.w - 2, far.x + 6); c.y = far.y; c.gone = null;
      const side = [[1, 0, 'left'], [-1, 0, 'right'], [0, 1, 'up'], [0, -1, 'down']].find(([dx, dy]) => passable(far.x + dx, far.y + dy));
      P.x = side ? far.x + side[0] : far.x; P.y = side ? far.y + side[1] : far.y; P.dir = side ? side[2] : 'up';
      const d0 = S.exp.cargo.d, s0 = S.exp.cargo.samples.length, t0 = curLive().tf.length, n0 = (S.exp.stats.noted || []).length, sp0 = S.day.spent;
      S.named = S.named || {}; S.named[q.c.id] = q.c.ind.name;   // she is met: her page takes the haunt
      const a = patchAction(); const label = a.label; if (label === WORDS.prints.read) a.run(); const line = FX.msg;
      const a2 = patchAction(); const spent1 = S.day.spent, n1 = S.exp.stats.prints.length; if (a2.label === WORDS.prints.read) a2.run();   // #122's free re-view keeps the label; otherwise another action is offered and is not run
      const again = { prints: S.exp.stats.prints.length - n1, light: S.day.spent - spent1 };
      return JSON.stringify({ label, after: a2.label, again, pages: S.pages[q.c.id], prints: S.exp.stats.prints, dData: S.exp.cargo.d - d0, dSamples: S.exp.cargo.samples.length - s0, dTufts: curLive().tf.length - t0, dNotes: (S.exp.stats.noted || []).length - n0, light: S.day.spent - sp0, part: q.part, line });
    })()`));
    assert.ok(!out.none, "at midday she has left a haunt of the morning");
    assert.equal(out.label, WORDS.prints.read, JSON.stringify(out));
    assert.equal(out.prints.length, 1, "one read for each haunt each day: a second run of the action leaves the one read");
    assert.equal(out.again.prints, 0, "the second run adds no read"); assert.equal(out.again.light, 0, "the second run spends no light: " + JSON.stringify(out));
    assert.ok(out.pages && Object.keys(out.pages).includes(out.part), "her page gains that haunt at that part of day");
    assert.equal(out.dData, 0); assert.equal(out.dSamples, 0, "habits-out-build-1: the prints give no keepsake"); assert.equal(out.dTufts, 0, "no tuft is left"); assert.ok(out.line.endsWith(" · her page has it"), out.line); assert.equal(out.dNotes, 0, "not a habit note"); assert.equal(out.light, 1, "one action");
    assert.deepEqual(p.errors, []);
  });
}
