// wild-life-build-1: a wild Loika at ease at her haunt plays an idle beat (groom, sniff, look up within 6 tiles, graze) every 3 to 5 of his actions; the signed set is what shows.
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

test("at ease, in sight, standing: a beat every 3 to 5 actions; look up only within 6 tiles; nothing moves", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { const ex = S.exp, live = curLive(), P = ex.patch; const X = Object.assign({ lay: curLay(), live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(curLay(), false, false), noise: 'act', moved: false, away: () => false }, ptCtx());
    const c = live.cr.find(c => c.sp === 0 && !c.hide && inSight(c.x, c.y)); c.ind = c.ind || null; const out = { at: [], kinds: [], lookFar: 0, moved: 0, id: c.id };
    delete c.ind; c.home = 0; c.visit = 0; c.gone = null; c.hb = null; c.crowd = 0; c.warm = 0;   // an unnamed wild one: her anchor is where she stands
    for (const far of [0, 1]) { FX.beats = {}; live.bt = {}; let last = -1;
      X.P = { x: c.x + (far ? 8 : 3), y: c.y, key: P.key };
      for (let a = 0; a < 120; a++) { ex.actions = 5000 + a; c.st = 'idle'; c.ease = 0; const bx = c.x, by = c.y; const before = FX.beats[c.id];
        idleBeat(c, X, bx, by); const b = FX.beats[c.id]; if (c.x !== bx || c.y !== by || c.st !== 'idle') out.moved++;
        if (b && b !== before) { if (!far) { out.at.push(a - last); last = a; } out.kinds.push((far ? 'far:' : 'near:') + b.k); if (far && b.k === 'look') out.lookFar++; } } }
    return JSON.stringify(out); })()`));
  const gaps = r.at.slice(1);
  assert.ok(gaps.length >= 10 && gaps.every(g => g >= 3 && g <= 5), "a beat every 3 to 5 actions: " + gaps.join(","));
  assert.equal(r.moved, 0, "the beat moves nobody and changes no state");
  assert.equal(r.lookFar, 0, "no look up when he is more than 6 tiles off");
  const near = new Set(r.kinds.filter(k => k.startsWith("near:")).map(k => k.slice(5)));
  for (const k of ["groom", "sniff", "look", "graze"]) assert.ok(near.has(k), "near, the beat picks " + k);
});

test("not at ease: heard, hidden, not idle, out of sight: no beat", () => {
  const q = page();
  const n = q.run(`(() => { const ex = S.exp, live = curLive(), P = ex.patch; const X = Object.assign({ lay: curLay(), live, key: P.key, P, carry: ex.carry, ease: easeEnvOf(curLay(), false, false), noise: 'act', moved: false, away: () => false }, ptCtx());
    const c = live.cr.find(c => c.sp === 0 && !c.hide && inSight(c.x, c.y)); delete c.ind; c.home = 0; c.visit = 0; c.gone = null; c.hb = null; c.warm = 0; let n = 0;
    const tries = [c => { c.ease = 1; }, c => { c.crowd = 3; }, c => { c.st = 'alert'; }, c => { c.hide = 1; }, c => { c.warm = 1; }];
    for (const set of tries) { FX.beats = {}; live.bt = {}; for (let a = 0; a < 60; a++) { ex.actions = 7000 + a; c.st = 'idle'; c.ease = 0; c.crowd = 0; c.hide = 0; c.warm = 0; set(c); idleBeat(c, X, c.x, c.y); if (FX.beats[c.id]) n++; } }
    X.away = () => true; FX.beats = {}; live.bt = {}; for (let a = 0; a < 60; a++) { ex.actions = 9000 + a; c.st = 'idle'; c.ease = 0; idleBeat(c, X, c.x, c.y); if (FX.beats[c.id]) n++; }
    return n; })()`);
  assert.equal(n, 0);
});

test("the pictures: look up idle to idle, plain groom with its half-turn, saddled groom the snap, sniff and graze her idle; each is the signed row text", () => {
  const q = page();
  const r = JSON.parse(q.run(`(() => { const c = { id: 99991, x: 3, y: 3 }; const out = {}; const seq = (k, sad, ms) => { FX.beats = { 99991: { k, at: 1000, x: 3, y: 3 } }; const o = []; for (const t of ms) { NOW = 1000 + t; const b = beatTok(c, sad); o.push(b ? b.key : null); } return o; };
    out.lookP = seq('look', false, [0, 150, 290, 430, 570, 710, 850, 990, 1130, 1300]); out.lookS = seq('look', true, [0, 150, 1130]);
    out.groomP = seq('groom', false, [0, 300, 500, 1600, 1700, 1800, 1900, 5000]); out.groomS = seq('groom', true, [0, 300, 1400, 1500]);
    out.sniff = seq('sniff', false, [0, 500, 1500]); out.graze = seq('graze', true, [0, 500, 1500]);
    const dip = (k, ms) => { FX.beats = { 99991: { k, at: 1000, x: 3, y: 3 } }; return ms.map(t => { NOW = 1000 + t; return beatDip(c); }); };
    out.dipSniff = dip('sniff', [0, 300, 500, 700, 950]); out.dipGraze = dip('graze', [0, 300, 1000, 1600]); out.dipGroom = dip('groom', [300, 1000]);
    FX.beats[99991] = { k: 'groom', at: 1000, x: 4, y: 3 }; NOW = 1700; out.moved = beatTok(c, false);
    const W = WILD_BEAT; out.n = [W.look.plain.length, W.look.saddled.length, W.groom.plain.length, W.groom.saddled.length]; out.same = W.groom.plain[0] !== W.groom.plain[1] && W.look.plain[0] !== SPECIES_ART[0].idle;
    return JSON.stringify(out); })()`));
  assert.deepEqual(r.lookP, [null, "lplain1", "lplain2", "lplain3", "lplain4", "lplain5", "lplain6", "lplain7", null, null]);
  assert.deepEqual(r.lookS, [null, "lsaddled1", null]);
  assert.deepEqual(r.groomP, [null, "gbetween", "gplain", "gplain", "gbetween", "gbetween", null, null]);
  assert.deepEqual(r.groomS, [null, "gsaddled", "gsaddled", null]);
  assert.deepEqual(r.sniff, [null, null, null]); assert.deepEqual(r.graze, [null, null, null]);
  assert.deepEqual(r.dipSniff, [0, 2, 0, 2, 0], "a sniff nods twice"); assert.deepEqual(r.dipGraze, [0, 2, 2, 0], "a graze sinks and holds"); assert.deepEqual(r.dipGroom, [0, 0], "a groom never dips");
  assert.equal(r.moved, null, "a beat is over the moment she moves");
  assert.deepEqual(r.n, [7, 7, 2, 1]); assert.ok(r.same);
});
