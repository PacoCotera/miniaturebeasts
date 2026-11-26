// her-fruit-build-1: a named wild Loika takes fruit from the hand (design her-page-design-1 section 4). Seed 13.
//   node --test prototypes/exploration/tests/her-fruit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const start = () => {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(13); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];
    for (const c of curLive().cr) c.hide = 1; S.named = {}; S.metIds = []; S.book = []; S.pages = {};`);
  return p;
};
// her at the front of the explorer, grazing, named; fruit in hand
const setup = (p, who = 36, name = "Cinder") => p.run(`{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === ${who}); P.dir = 'up'; c.x = P.x; c.y = P.y - 1; c.st = 'idle'; c.ease = 0; c.quiet = 0; c.crowd = 0; c.hide = 0; c.hb = 0;
  S.named[${who}] = ${JSON.stringify(name)}; S.exp.carry = 'fruit'; S.exp.cargo.d = 0; }`);
const state = p => JSON.stringify(p.run("(() => { const c = curLive().cr.find(q => q.id === 36); return { ease: c.ease, quiet: c.quiet | 0, crowd: c.crowd | 0, habits: S.habits || null, samples: S.samples || null, e: S.exp.cargo.e, s: S.exp.cargo.s }; })()"));

test("grazing, beside her, stay left: she eats; no Data (a named Loika is fed, not counted); one Log entry under her name", () => {
  const p = start(); setup(p);
  assert.equal(p.run("patchAction().label"), "Offer fruit");
  assert.ok(!p.run("patchAction().dim"));
  const before = state(p);
  p.run("patchAction().run()");
  assert.equal(p.run("S.exp.carry"), null, "the fruit is gone");
  assert.equal(p.run("S.exp.cargo.d"), 0, "no Data for a named Loika (GD 11-25)");
  assert.equal(p.run("!!habDay()['fed:36']"), true);
  assert.equal(state(p), before, "ease, quiet, crowd, habits, samples, Essence as before");
  const fed = p.run("S.book.filter(r => r.kind === 'fed')");
  assert.equal(fed.length, 1); assert.equal(fed[0].id, 36); assert.equal(fed[0].text, "Cinder took fruit from your hand.");
  // a second fruit the same day: she eats it, nothing more is written
  p.run("S.exp.carry = 'fruit'; patchAction().run()");
  assert.equal(p.run("S.book.filter(r => r.kind === 'fed').length"), 1);
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("her kind not yet identified: the named one still takes fruit", () => {
  const p = start(); setup(p); p.run("S.known = []");
  assert.equal(p.run("patchAction().label"), "Offer fruit");
});

test("ears up, or watching: ✓ is dimmed with the refusal, and pressing spends no light, no fruit, no ease", () => {
  for (const ease of [1, 2]) {
    const p = start(); setup(p); p.run(`curLive().cr.find(q => q.id === 36).ease = ${ease}`);
    const a = p.run("(() => { const a = patchAction(); return { label: a.label, dim: !!a.dim }; })()");
    assert.equal(a.label, "Not while her ears are up"); assert.equal(a.dim, true);
    const spent = p.run("S.day.spent"), before = state(p);
    p.run("patchAction().run()");
    assert.equal(p.run("S.day.spent"), spent); assert.equal(p.run("S.exp.carry"), "fruit"); assert.equal(state(p), before);
    assert.equal(p.run("S.book.filter(r => r.kind === 'fed').length"), 0);
  }
});

test("in her habit: dimmed, nothing spent", () => {
  const p = start(); setup(p); p.run("curLive().cr.find(q => q.id === 36).hb = 1");
  assert.equal(p.run("patchAction().dim"), true);
});

test("a nameless creature writes no Log entry of its own kind", () => {
  const p = start(); setup(p); p.run("{ const c = curLive().cr.find(q => q.id === 36); c.ind = null; }");
  assert.ok(p.run("patchAction().label") !== "Not while her ears are up");
  assert.equal(p.run("S.book.filter(r => r.kind === 'fed').length"), 0);
});
