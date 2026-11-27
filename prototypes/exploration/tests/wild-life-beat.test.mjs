// wild-life-build-1/-3: a named wild Loika at ease at her haunt does an act: she goes to a plant within 3 tiles, does it facing it (graze, sniff, groom) or turns to him (look up, within 6 tiles);
// the picture holds about 2.5 s and at least 3 of his actions, she rests at least 5, and the box says it once per act per Loika per day when it is free.
//   node --test prototypes/exploration/tests/wild-life-beat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const raw = readFileSync(new URL("./owner138.save", import.meta.url), "utf8");
const page = () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.store[p.KEY] = raw;
  return makePage({ gen: 7, store: { ...p.store }, console: "collect", els: true, canvas: true, raf: "count" });
};
// the scene: a named Loika on her haunt, one plant (tuft) 2 tiles from it with a free tile beside, him 4 tiles off; a driver that runs one of his actions as patchTick does for her (beatWalk in her idle branch, then idleBeat)
const SETUP = `
  const ex = S.exp, live = curLive(), P = ex.patch, lay = curLay();
  const c = live.cr.find(c => c.sp === 0 && c.ind && !c.hide); const hs = routineSpot(c, lay, P.key); c.x = hs.x; c.y = hs.y; c.st = 'idle'; c.ease = 0; c.crowd = 0; c.warm = 0; c.home = 0; c.visit = 0; c.gone = null; c.hb = null; c.face = -1;
  const plant = plantTiles(lay).find(t => cheb(t, hs) <= 3) || null;   // the place's own meadow (the baked decals)
  P.x = Math.min(lay.w - 2, hs.x + 4); P.y = hs.y;
  const X = Object.assign({ lay, live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(lay, false, false), noise: 'act', moved: false, away: () => false });
  const home = () => { const h2 = routineSpot(c, lay, P.key); if (h2 && (c.x !== h2.x || c.y !== h2.y)) pathStepToward(X, c, h2, 1); };   // her routine's own step home (hauntStep), when no act has her
  let t0 = 1000; const step = (ms) => { ex.actions += 1; NOW = (t0 += ms == null ? 400 : ms); const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; if (!beatWalk(X, c)) home(); idleBeat(c, X, bx, by); settleOnce(); };
`;

test("an act: she walks to the plant a tile an action, holds 2.5 s and 3 of his actions facing it, rests 5, then the next", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    if (!plant) return JSON.stringify({ noPlant: 1 });
    live.bt = {}; FX.beats = {}; const out = { ev: [], walked: [], holdActs: [], holdMs: [], rest: [], face: [], start: [] }; let last = null, lastEnd = null, hold0 = null;
    ex.actions = 5000;
    for (let a = 0; a < 140; a++) { const x0 = c.x, y0 = c.y, b0 = FX.beats[c.id], s0 = b0 && b0.st; step(300);
      const b = FX.beats[c.id];
      if (b && b.st === 'walk' && s0 === 'walk') out.walked.push(Math.abs(c.x - x0) + Math.abs(c.y - y0));
      if (b && b.st === 'hold' && s0 !== 'hold') { hold0 = { a, at: NOW, acts: ex.actions, k: b.k }; out.face.push(plant && b.tgt ? Math.sign(b.tgt.x - c.x) === (c.face || 1) || b.tgt.x === c.x : 1); out.start.push(a); if (lastEnd != null) out.rest.push(ex.actions - lastEnd); }
      if (!b && b0 && b0.st === 'hold') { out.holdActs.push(ex.actions - b0.act0); out.holdMs.push(NOW - b0.at); lastEnd = ex.actions; } }
    return JSON.stringify(out); })()`));
  assert.ok(!r.noPlant, "the scene found a plant");
  assert.ok(r.start.length >= 4, "acts happen: " + JSON.stringify(r));
  assert.ok(r.walked.length > 0 && r.walked.every(w => w === 1), "she walks one tile an action to her plant: " + r.walked.join(","));
  assert.ok(r.face.length > 0 && r.face.every(Boolean), "she does the act facing it: " + r.face.join(","));
  assert.ok(r.holdMs.every(ms => ms >= 2500), "each hold is at least 2.5 s: " + r.holdMs.join(","));
  assert.ok(r.holdActs.every(n => n >= 3), "each hold is at least 3 of his actions: " + r.holdActs.join(","));
  assert.ok(r.rest.every(n => n >= 5), "she rests at least 5 actions after an act: " + r.rest.join(","));
});

test("the line: once per act per Loika per day, only when the box is free, never over another line", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    if (!plant) return JSON.stringify({ noPlant: 1 });
    const out = { lines: [], busyShown: null, busySpent: null };
    // a busy box: the line waits unspent
    live.bt = {}; FX.beats = {}; S.beatSaid = {}; ex.actions = 6000; let said = [];
    for (let a = 0; a < 200; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; FX.beatLine = null;
      if (a === 0) { FX.beats = {}; }
      if (!beatWalk(X, c)) home(); idleBeat(c, X, bx, by);
      if (FX.beatLine) { if (a % 2 === 0) { FX.notes.push({ text: 'Something else', pri: 1 }); composeMsg(); } }   // every other start finds the box busy
      settleOnce(); const m = FX.msg; if (m && /Sorrel|Lark|Hazel|[A-Z][a-z]+ (nibbles|sniffs|grooms|looks)/.test(m) && /nibbles|sniffs|grooms|looks up/.test(m)) said.push(m); }
    out.lines = said; out.saidKeys = Object.keys(S.beatSaid || {});
    return JSON.stringify(out); })()`));
  assert.ok(!r.noPlant);
  assert.ok(r.lines.length >= 1, "an act's line shows when the box is free: " + JSON.stringify(r.lines));
  assert.equal(new Set(r.lines).size, r.lines.length, "each line shows once for the day: " + JSON.stringify(r.lines));
  assert.ok(r.lines.every(l => /nibbles the clover|sniffs the clover|grooms her tail|looks up at you/.test(l)), JSON.stringify(r.lines));
  assert.equal(r.saidKeys.length, r.lines.length, "only what showed is spent");
});

test("the scolding line never comes from the idle beat: a look up says its own line only, and a heard Loika does no act", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    live.bt = {}; FX.beats = {}; S.beatSaid = {}; ex.actions = 7000; const out = { msgs: [], heardActs: 0 };
    for (let a = 0; a < 80; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; FX.beatLine = null; if (!beatWalk(X, c)) home(); idleBeat(c, X, bx, by); settleOnce(); if (FX.msg) out.msgs.push(FX.msg); }
    // heard (ease up): no act starts and one running is lost, and no word of the beat is the ease line
    live.bt = {}; FX.beats = {}; c.ease = 1; for (let a = 0; a < 40; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; if (!beatWalk(X, c)) home(); idleBeat(c, X, bx, by); if (FX.beats[c.id]) out.heardActs++; }
    out.stay = WORDS.ease.stayHeard('Sorrel'); out.look = WORDS.beat.look('Sorrel');
    return JSON.stringify(out); })()`));
  assert.ok(r.msgs.length >= 1, "she said something: " + JSON.stringify(r.msgs));
  assert.ok(r.msgs.every(m => !/stayed too long|heard that|watching/.test(m)), "no wary line from the beat: " + JSON.stringify(r.msgs));
  assert.equal(r.heardActs, 0, "a heard Loika starts no act");
  assert.notEqual(r.look, r.stay);
});

test("the pictures: look up and groom loop for the whole hold, sniff and graze hold the dip, nothing before or after the hold", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { const c = { id: 99991, x: 3, y: 3 }; const out = {}; S.exp.actions = 100;
    const seq = (k, sad, ms) => { FX.beats = { 99991: { k, st: 'hold', at: 1000, act0: 100, x: 3, y: 3 } }; S.exp.actions = 110; const o = []; for (const t of ms) { NOW = 1000 + t; const b = beatTok(c, sad); o.push(b ? b.key : null); } return o; };
    out.lookP = seq('look', false, [0, 150, 290, 430, 570, 710, 850, 990, 1130, 1300, 1400, 1540, 2300, 2600]); out.groomP = seq('groom', false, [0, 300, 500, 1600, 1700, 1800, 1900, 2000, 2200, 2400]); out.groomS = seq('groom', true, [0, 300, 1400, 1500, 1700, 1800]);
    out.sniff = seq('sniff', false, [0, 500, 1500]); out.graze = seq('graze', true, [0, 500, 1500]);
    const dip = (k, ms) => { FX.beats = { 99991: { k, st: 'hold', at: 1000, act0: 100, x: 3, y: 3 } }; return ms.map(t => { NOW = 1000 + t; return beatDip(c); }); };
    out.dipSniff = dip('sniff', [0, 300, 1500, 2600]); out.dipGraze = dip('graze', [0, 300, 1600, 2600]); out.dipGroom = dip('groom', [300, 1000]);
    FX.beats = { 99991: { k: 'graze', st: 'hold', at: 1000, act0: 100, x: 3, y: 3 } }; NOW = 3600; S.exp.actions = 101; out.slow = beatDip(c); S.exp.actions = 103; out.over = beatDip(c); NOW = 9100; S.exp.actions = 101; out.cap = beatDip(c);
    FX.beats = { 99991: { k: 'groom', st: 'walk', at: 1000, act0: 100, x: 3, y: 3 } }; NOW = 1500; out.walking = beatTok(c, false);
    FX.beats = { 99991: { k: 'groom', st: 'hold', at: 1000, act0: 100, x: 4, y: 3 } }; NOW = 1700; out.moved = beatTok(c, false);
    const W = WILD_BEAT; out.n = [W.look.plain.length, W.look.saddled.length, W.groom.plain.length, W.groom.saddled.length]; out.same = W.groom.plain[0] !== W.groom.plain[1] && W.look.plain[0] !== SPECIES_ART[0].idle;
    return JSON.stringify(out); })()`));
  assert.deepEqual(r.lookP, [null, "lplain1", "lplain2", "lplain3", "lplain4", "lplain5", "lplain6", "lplain7", null, null, "lplain1", "lplain2", "lplain7", null], "look up: nine frames idle to idle, looped, gone after 2.5 s");
  assert.deepEqual(r.groomP, [null, "gbetween", "gplain", "gplain", "gbetween", "gbetween", null, null, "gbetween", "gplain"], "groom looped through the hold");
  assert.equal(r.groomS[0], null); assert.equal(r.groomS[1], "gsaddled");
  assert.deepEqual(r.sniff, [null, null, null]); assert.deepEqual(r.graze, [null, null, null]);
  assert.deepEqual(r.dipSniff, [2, 2, 2, 0], "a sniff holds the dip for the hold"); assert.deepEqual(r.dipGraze, [2, 2, 2, 0], "a graze holds the dip for the hold"); assert.deepEqual(r.dipGroom, [0, 0], "a groom never dips");
  assert.equal(r.slow, 2, "past 2.5 s but under 3 of his actions: still held"); assert.equal(r.over, 0, "2.5 s and 3 actions: over"); assert.equal(r.cap, 0, "8 s: over whatever he did");
  assert.equal(r.walking, null, "walking to the plant shows no act picture"); assert.equal(r.moved, null, "an act is over the moment she moves");
  assert.deepEqual(r.n, [7, 7, 2, 1]); assert.ok(r.same);
});
