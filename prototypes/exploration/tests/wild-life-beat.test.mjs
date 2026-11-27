// wild-life-build-1/-3: a named wild Loika at ease at her haunt does an act: she is drawn going to a plant within 3 tiles and does it facing it (graze, sniff, groom), or turns to him (look up, within 6 tiles);
// the picture holds about 2.5 s and at least 3 of his actions, she rests at least 5, and the box says it once per act per Loika per day when it is free. Her own tile and state never change.
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
// the scene: a named Loika on her haunt with the place's own meadow round her, him 4 tiles off; a driver that runs one of his actions as patchTick does for her (idleBeat), then the end of the action (settleOnce)
const SETUP = `
  const ex = S.exp, live = curLive(), P = ex.patch, lay = curLay();
  const c = live.cr.find(c => c.sp === 0 && c.ind && !c.hide); const hs = routineSpot(c, lay, P.key); c.x = hs.x; c.y = hs.y; c.st = 'idle'; c.ease = 0; c.crowd = 0; c.warm = 0; c.home = 0; c.visit = 0; c.gone = null; c.hb = null; c.face = -1;
  P.x = Math.min(lay.w - 2, hs.x + 4); P.y = hs.y;
  const X = Object.assign({ lay, live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(lay, false, false), noise: 'act', moved: false, away: () => false });
  const own = JSON.stringify({ x: c.x, y: c.y, st: c.st, ease: c.ease, face: c.face });
  let t0 = 1000; const step = (ms) => { ex.actions += 1; NOW = (t0 += ms == null ? 400 : ms); const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; idleBeat(c, X, bx, by); beatPhase(c); settleOnce(); };
`;

test("an act: drawn to the plant, holds 2.5 s and 3 of his actions, goes back, rests 5 actions, then the next; her own state never changes", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    live.bt = {}; FX.beats = {}; const out = { starts: 0, holdMs: [], holdActs: [], rest: [], kinds: [], shifts: [], moved: 0, goMs: [] }; ex.actions = 5000; let lastEnd = null, prev = null;
    for (let a = 0; a < 200; a++) { const b0 = FX.beats[c.id]; step(300); const b = FX.beats[c.id];
      if (JSON.stringify({ x: c.x, y: c.y, st: c.st, ease: c.ease, face: c.face }) !== own) out.moved++;
      if (b && b !== b0) { out.starts++; out.kinds.push(b.k); if (lastEnd != null) out.rest.push(ex.actions - lastEnd); b.a0 = ex.actions; }
      if (b && b.stand) { const s = beatShift(c, 48); if (s) out.shifts.push([Math.round(s.dx), Math.round(s.dy)]); }
      if (b && b.endAt != null && !b.rec) { b.rec = 1; out.holdMs.push(b.endAt - b.at - b.G); out.holdActs.push(ex.actions - b.a0); }
      if (b0 && FX.beats[c.id] !== b0) lastEnd = ex.actions; }
    return JSON.stringify(out); })()`));
  assert.ok(r.starts >= 4, "acts happen: " + JSON.stringify(r));
  assert.equal(r.moved, 0, "her own tile and state never change");
  assert.ok(r.holdMs.length >= 3 && r.holdMs.every(ms => ms >= 2500), "each hold is at least 2.5 s: " + r.holdMs.join(","));
  assert.ok(r.holdActs.every(n => n >= 3), "each act lasts at least 3 of his actions: " + r.holdActs.join(","));
  assert.ok(r.rest.length >= 2 && r.rest.every(n => n >= 5), "she rests at least 5 actions after an act: " + r.rest.join(","));
  assert.ok(r.shifts.some(([x, y]) => x || y), "she is drawn away from her own tile to the plant");
  assert.ok(new Set(r.kinds).size >= 2, "she picks among the acts: " + r.kinds.join(","));
});

test("the walk: drawn a tile every 360 ms along her way, step pictures, facing the way she goes, then toward the plant, then back", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    const t = beatTarget(c, X); if (!t) return JSON.stringify({ none: 1 });
    FX.beats = {}; const w = Math.abs(t.stand.x - c.x) + Math.abs(t.stand.y - c.y), G = 360 * w, sx = Math.sign(t.stand.x - c.x);
    FX.beats[c.id] = { k: 'graze', at: 1000, x: c.x, y: c.y, act: 100, G, tgt: t.tgt, stand: t.stand, endAt: null }; S.exp.actions = 100;
    const at = ms => { NOW = 1000 + ms; const s = beatShift(c, 48), p = beatPhase(c); return { ph: p && p.ph, dx: s && s.dx, dy: s && s.dy, step: s && s.step, face: s && s.face }; };
    const out = { w, sx, tgtx: t.tgt.x - t.stand.x, go: at(0), mid: at(G / 2), hold: at(G + 100), holdLate: at(G + 2600) };
    S.exp.actions = 103; out.over = at(G + 2600); out.back = at(G + 2600 + G / 2); out.done = at(G + 2600 + G + 10);
    return JSON.stringify(out); })()`));
  assert.ok(!r.none, "she has a plant to go to");
  assert.equal(r.go.ph, "go"); assert.equal(r.go.dx, 0); assert.equal(r.go.dy, 0);
  if (r.w) { assert.ok(r.mid.dx || r.mid.dy, "half way"); assert.ok(r.mid.step === 0 || r.mid.step === 1, "stepping pictures on the way"); if (r.sx) assert.equal(r.mid.face, r.sx, "facing the way she goes"); }
  assert.equal(r.hold.ph, "hold"); assert.equal(r.hold.step, -1);
  if (r.tgtx) assert.equal(r.hold.face, Math.sign(r.tgtx), "at the plant she faces it");
  assert.equal(r.holdLate.ph, "hold", "2.5 s but not 3 actions: held");
  assert.equal(r.over.ph, r.w ? "back" : null, "2.5 s and 3 actions: over");
  if (r.w) { assert.equal(r.back.ph, "back"); if (r.sx) assert.equal(r.back.face, -r.sx, "back: the way home"); }
  assert.equal(r.done.ph, null, "home: the act is gone");
});

test("the line: once per act per Loika per day, only when the box is free, never over another line", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    const out = { lines: [], busy: 0 };
    live.bt = {}; FX.beats = {}; S.beatSaid = {}; ex.actions = 6000;
    for (let a = 0; a < 300; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; FX.beatLine = null;
      idleBeat(c, X, bx, by); beatPhase(c);
      if (FX.beatLine && a % 2 === 0) { FX.notes.push({ text: 'Something else', pri: 1 }); composeMsg(); out.busy++; }   // every other start finds the box busy
      settleOnce(); const m = FX.msg; if (/nibbles|sniffs|grooms|looks up/.test(m)) out.lines.push(m); }
    out.saidKeys = Object.keys(S.beatSaid || {});
    return JSON.stringify(out); })()`));
  assert.ok(r.busy >= 1, "some starts found the box busy");
  assert.ok(r.lines.length >= 1, "an act's line shows when the box is free: " + JSON.stringify(r.lines));
  assert.equal(new Set(r.lines).size, r.lines.length, "each line shows once for the day: " + JSON.stringify(r.lines));
  assert.ok(r.lines.every(l => /nibbles the |sniffs the |grooms her tail|looks up at you/.test(l)), JSON.stringify(r.lines));
  assert.equal(r.saidKeys.length, r.lines.length, "only what showed is spent (a busy box spends nothing)");
});

test("the scolding line never comes from the idle beat: a look up says its own line only, and a heard Loika does no act", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { ${SETUP}
    live.bt = {}; FX.beats = {}; S.beatSaid = {}; ex.actions = 7000; const out = { msgs: [], heardActs: 0 };
    for (let a = 0; a < 80; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; FX.msg = ''; FX.notes = []; FX.sign = null; FX.beatLine = null; idleBeat(c, X, bx, by); beatPhase(c); settleOnce(); if (FX.msg) out.msgs.push(FX.msg); }
    live.bt = {}; FX.beats = {}; c.ease = 1; for (let a = 0; a < 40; a++) { ex.actions += 1; NOW += 400; const bx = c.x, by = c.y; idleBeat(c, X, bx, by); if (FX.beats[c.id]) out.heardActs++; }
    out.stay = WORDS.ease.stayHeard('Sorrel'); out.look = WORDS.beat.look('Sorrel');
    return JSON.stringify(out); })()`));
  assert.ok(r.msgs.length >= 1, "she said something: " + JSON.stringify(r.msgs));
  assert.ok(r.msgs.every(m => !/stayed too long|heard that|watching/.test(m)), "no wary line from the beat: " + JSON.stringify(r.msgs));
  assert.equal(r.heardActs, 0, "a heard Loika starts no act");
  assert.notEqual(r.look, r.stay);
});

test("the pictures: look up and groom loop for the whole hold, sniff and graze hold the dip, nothing while she goes or after", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { const c = { id: 99991, x: 3, y: 3 }; const out = {}; S.exp.actions = 100;
    const mk = (k, G) => ({ k, at: 1000, x: 3, y: 3, act: 100, G: G || 0, endAt: null, stand: G ? { x: 4, y: 3 } : null, tgt: G ? { x: 5, y: 3 } : null });
    const seq = (k, sad, ms) => { FX.beats = { 99991: mk(k) }; S.exp.actions = 110; const o = []; for (const t of ms) { NOW = 1000 + t; const b = beatTok(c, sad); o.push(b ? b.key : null); } return o; };
    out.lookP = seq('look', false, [0, 150, 290, 430, 570, 710, 850, 990, 1130, 1300, 1400, 1540, 2300, 2600]); out.groomP = seq('groom', false, [0, 300, 500, 1600, 1700, 1800, 1900, 2000, 2200, 2400]); out.groomS = seq('groom', true, [0, 300, 1400, 1500, 1700, 1800]);
    out.sniff = seq('sniff', false, [0, 500, 1500]); out.graze = seq('graze', true, [0, 500, 1500]);
    const dip = (k, ms) => { FX.beats = { 99991: mk(k) }; S.exp.actions = 110; return ms.map(t => { NOW = 1000 + t; return beatDip(c); }); };
    out.dipSniff = dip('sniff', [0, 300, 1500, 2600]); out.dipGraze = dip('graze', [0, 300, 1600, 2600]); out.dipGroom = dip('groom', [300, 1000]);
    FX.beats = { 99991: mk('graze') }; NOW = 3600; S.exp.actions = 101; out.slow = beatDip(c); FX.beats = { 99991: mk('graze') }; S.exp.actions = 103; out.over = beatDip(c); FX.beats = { 99991: mk('graze') }; NOW = 9100; S.exp.actions = 101; out.cap = beatDip(c);
    FX.beats = { 99991: mk('groom', 360) }; S.exp.actions = 110; NOW = 1200; out.walking = beatTok(c, false); NOW = 1360 + 500; out.grooming = beatTok(c, false) && 1;
    FX.beats = { 99991: mk('groom') }; FX.beats[99991].x = 4; NOW = 1700; S.exp.actions = 110; out.moved = beatTok(c, false);
    const W = WILD_BEAT; out.n = [W.look.plain.length, W.look.saddled.length, W.groom.plain.length, W.groom.saddled.length]; out.same = W.groom.plain[0] !== W.groom.plain[1] && W.look.plain[0] !== SPECIES_ART[0].idle;
    return JSON.stringify(out); })()`));
  assert.deepEqual(r.lookP, [null, "lplain1", "lplain2", "lplain3", "lplain4", "lplain5", "lplain6", "lplain7", null, null, "lplain1", "lplain2", "lplain7", null], "look up: nine frames idle to idle, looped, gone after 2.5 s");
  assert.deepEqual(r.groomP, [null, "gbetween", "gplain", "gplain", "gbetween", "gbetween", null, null, "gbetween", "gplain"], "groom looped through the hold");
  assert.equal(r.groomS[0], null); assert.equal(r.groomS[1], "gsaddled");
  assert.deepEqual(r.sniff, [null, null, null]); assert.deepEqual(r.graze, [null, null, null]);
  assert.deepEqual(r.dipSniff, [2, 2, 2, 0], "a sniff holds the dip for the hold"); assert.deepEqual(r.dipGraze, [2, 2, 2, 0], "a graze holds the dip for the hold"); assert.deepEqual(r.dipGroom, [0, 0], "a groom never dips");
  assert.equal(r.slow, 2, "past 2.5 s but under 3 of his actions: still held"); assert.equal(r.over, 0, "2.5 s and 3 actions: over"); assert.equal(r.cap, 0, "8 s: over whatever he did");
  assert.equal(r.walking, null, "going to the plant shows no act picture"); assert.equal(r.grooming, 1, "at the plant the picture is up");
  assert.equal(r.moved, null, "an act is over the moment she moves");
  assert.deepEqual(r.n, [7, 7, 2, 1]); assert.ok(r.same);
});
