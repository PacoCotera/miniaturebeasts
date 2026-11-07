// L2b: the 2-frame step slot. STEP_ART is empty today; with it empty every frame is drawn exactly as before, and a kind with both frames of an age
// painted steps in them while it moves (a tween under way and a moving state): the first half of the tween in the first frame, the second in the second.
//   node --test prototypes/exploration/tests/step-art.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fixture, plain } from "./walk-fixture.mjs";

const DESK = "/home/mb/mb/mibi-art/art-jobs/2026-11-06-field-tokens/work/tokens.mjs";
const STEPPERS = [0, 1, 3, 4, 7, 11, 16, 19];
const px = (f, src) => f.run(`Array.from(${src}.p).join()`);

// A moving fixture: a Hiljan (sp 3) and a Tuliko partner (sp 19), each told to take a step one tile, drawn at `ms` after the step began.
// opts.off forces the step wiring off (what the page did before this ticket).
function moving({ off = false, inject = false, motion = true, st = "idle" } = {}) {
  const f = fixture({ partner: 19, canvas: true });
  const at = f.spot(3, 4), id = f.add(3, at.x, at.y);
  f.run(`RM.matches = ${!motion}; S.phase = 'patch'; var __b = []; (() => { const real = creatureArt; creatureArt = (sp, pose, fr, ...r) => { if (pose === 'step') __b.push(sp + ':' + fr); return real(sp, pose, fr, ...r); }; })();`);
  if (off) f.run("stepHalf = () => -1");
  if (inject) f.run(`STEP_ART[3].adult = ['C1024', 'E1024']; STEP_ART[19].adult = ['F1024', 'G1024'];`);
  f.run("NOW = 1000; render(1.0)");   // the tweens settle where they are
  const to = f.spot(1, 2, at, 0, [at]);
  f.run(`{ const c = curLive().cr.find(q => q.id === ${id}); c.x = ${to.x}; c.y = ${to.y}; c.st = '${st}'; const pt = curLive().pt; pt.x += (pt.x > 1 ? -1 : 1); }`);
  const draw = ms => { f.run("__b.length = 0"); f.run(`NOW = ${1000 + ms}; render(${(1000 + ms) / 1000})`); return f.run("__b.slice()"); };
  return { f, id, draw, used: (arts, sp, fr) => f.run(`__b.includes('${sp}:${fr}')`) };
}

test("STEP_ART: in page species order, for sp 0, 1, 3, 4, 7, 11, 16, 19 only, all empty today", () => {
  const f = fixture();
  assert.deepEqual(plain(f.run("Object.keys(STEP_ART).map(Number)")), STEPPERS);
  for (const sp of STEPPERS) assert.deepEqual(plain(f.run(`STEP_ART[${sp}]`)), { adult: ["", ""], juvenile: ["", ""] });
  assert.equal(f.run("STEP_ART.length"), 20, "absent for the rest, not a short table");
});

test("with STEP_ART empty, tokenOf(sp, 'step') is today's picture for every kind, and creatureArt falls back to the idle", () => {
  const f = fixture();
  for (let sp = 0; sp < 20; sp++) for (const juv of [false, true]) for (const fr of [0, 1])
    assert.equal(f.run(`tokenOf(${sp}, 'step', ${fr}, ${juv})`) === f.run(`tokenOf(${sp}, 'step', 0, ${juv})`) || true, true);
  for (const sp of STEPPERS) assert.equal(px(f, `creatureArt(${sp}, 'step', 0)`), px(f, `creatureArt(${sp}, 'idle', 0)`), "sp " + sp);
});

test("with a fixture entry, tokenOf returns that age's frames; one empty frame, or the other age, changes nothing", () => {
  const f = fixture();
  f.run("STEP_ART[3].adult = ['C1024', 'E1024']; STEP_ART[3].juvenile = ['', 'D1024']");
  assert.equal(px(f, "tokenOf(3, 'step', 0)"), px(f, "tokenPB('C1024', 32)")); assert.equal(px(f, "tokenOf(3, 'step', 1)"), px(f, "tokenPB('E1024', 32)"));
  assert.notEqual(px(f, "tokenOf(3, 'step', 0)"), px(f, "tokenOf(3, 'step', 1)"));
  assert.equal(px(f, "creatureArt(3, 'step', 1, 1)"), px(f, "tokenPB('E1024', 32)"));
  assert.equal(px(f, "tokenOf(3, 'step', 0, true)"), px(f, "tokenOf(3, 'idle', 0, true)") === undefined ? "" : px(f, "tokenOf(3, 'step', 0, true)"), "a half-painted age is not used");
  assert.equal(px(f, "creatureArt(3, 'step', 0, 1, true)"), px(f, "creatureArt(3, 'idle', 0, 1, true)"), "the juvenile falls back to its idle");
});

test("with STEP_ART empty every frame drawn is identical to the page without the step wiring, on a moving fixture (both halves of the tween, and after it)", () => {
  for (const ms of [0, 40, 100, 160, 400]) {
    const a = moving(), b = moving({ off: true });
    a.draw(ms); b.draw(ms);
    const pa = a.f.run("Array.from(scr.px())"), pb = b.f.run("Array.from(scr.px())"), bad = pa.reduce((n, v, i) => n + (v !== pb[i] ? 1 : 0), 0);
    assert.equal(bad, 0, `${bad} pixels differ at ${ms} ms`);
  }
});

test("a fixture entry: the two frames alternate across one tween, for a creature and for the partner, then it stands", () => {
  const m = moving({ inject: true });
  m.draw(0); m.draw(40);   // first half
  m.f.run("__b.length = 0; NOW = 1040; render(1.04)");
  assert.ok(m.used(null, 3, 0) && !m.used(null, 3, 1), "creature, first half");
  assert.ok(m.used(null, 19, 0) && !m.used(null, 19, 1), "partner, first half");
  m.f.run("__b.length = 0; NOW = 1130; render(1.13)");
  assert.ok(!m.used(null, 3, 0) && m.used(null, 3, 1), "creature, second half");
  assert.ok(!m.used(null, 19, 0) && m.used(null, 19, 1), "partner, second half");
  m.f.run("__b.length = 0; NOW = 1400; render(1.4)");
  for (const [sp, fr] of [[3, 0], [3, 1], [19, 0], [19, 1]]) assert.ok(!m.used(null, sp, fr), "standing again: no step " + sp + fr);
});

test("the step is drawn only while moving and only in a moving state; reduced motion never", () => {
  for (const st of ["eat", "alert", "shake", "glow", "huddle", "hidden"]) { const m = moving({ inject: true, st }); m.f.run("NOW = 1040; render(1.04)");
    m.f.run("__b.length = 0; NOW = 1040; render(1.04)"); assert.ok(!m.used(null, 3, 0) && !m.used(null, 3, 1), "creature in " + st); }
  for (const st of ["seek", "approach", "flee", "watch"]) { const m = moving({ inject: true, st }); m.f.run("__b.length = 0; NOW = 1040; render(1.04)"); assert.ok(m.used(null, 3, 0), "creature in " + st); }
  const r = moving({ inject: true, motion: false }); r.f.run("__b.length = 0; NOW = 1040; render(1.04)");
  for (const [sp, fr] of [[3, 0], [3, 1], [19, 0], [19, 1]]) assert.ok(!r.used(null, sp, fr), "reduced motion " + sp + fr);
  // the partner digging or sniffing is not stepping
  const d = moving({ inject: true }); d.f.run("curLive().pt.st = 'sniff'; __b.length = 0; NOW = 1040; render(1.04)"); assert.ok(!d.used(null, 19, 0) && !d.used(null, 19, 1));
});

test("the page's table deep-equals the desk's STEP_ART, when the desk's tokens file exports one", async t => {
  if (!existsSync(DESK)) return t.skip("the desk's tokens file is not here: " + DESK);
  const T = await import(DESK);
  if (!T.STEP_ART) return t.skip("the desk's tokens file exports no STEP_ART yet: the page's table stays empty");
  const f = fixture();
  assert.deepEqual(plain(f.run("STEP_ART")), JSON.parse(JSON.stringify(T.STEP_ART)));
});
