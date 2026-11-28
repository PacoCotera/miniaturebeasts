// C8: the bag choice at the find (walk slice W§5): picture first, the framed pod follows ←/→, ✓ swaps it, ← leaves the found pod.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";
import { goldenStill } from "./png-golden.mjs";

const POD = (id, sp, g, how) => ({ id, sp, g, how, bur: 0, gs: 7, k: "1" });
// a place with a full bag of `n` pods (a Tuikis one under a slab, a Loika one shed shaking dry) and a found pod lying near
function setup(n) {
  const f = fixture({ canvas: true, paint: true }), r = f.run;
  r("S.exp.hold = " + n + "; S.exp.cargo.pods = " + JSON.stringify([POD("h1", 1, "rock", "slab"), POD("h2", 0, "pond", "shake")].slice(0, n)) + "; S.exp.cargo.pods.forEach(q => q.k = S.exp.patch.key);");
  r("S.pods.push({ id: 'z', k: S.exp.patch.key, x: S.exp.patch.x + 1, y: S.exp.patch.y, sp: 2, h: 0, g: 'wood', how: 'ground' });");
  r("FX.msg = ''; FX.notes = [];");
  return f;
}
const acts = f => f.run("S.exp.actions");
const shown = f => { f.run("FX.lockUntil = 0; render(5)"); };

test("a full bag: the chooser opens, spends nothing, and follows ←/→", () => {
  const f = setup(2), a0 = acts(f);
  f.run("takePod(S.pods.find(q => q.id === 'z'))");
  assert.equal(f.run("S.ui.swap.id"), "z"); assert.equal(f.run("S.ui.swap.sel"), 0); assert.equal(acts(f), a0, "nothing spent");
  assert.equal(f.run("S.exp.cargo.pods.length"), 2);
  f.p.key("right"); assert.equal(f.run("S.ui.swap.sel"), 1);
  f.p.key("right"); assert.equal(f.run("S.ui.swap.sel"), 0, "wraps");
  f.p.key("left"); assert.equal(f.run("S.ui.swap.sel"), 1);
  assert.equal(f.run("swapState().sel"), 1);
  assert.equal(acts(f), a0, "moving the frame spends nothing");
});

test("✓ swaps the framed pod: the left one lies there with its outline, the map shows a pod, the action is spent", () => {
  const f = setup(2), a0 = acts(f);
  f.run("takePod(S.pods.find(q => q.id === 'z'))"); f.p.key("right");
  f.p.key("confirm");
  assert.equal(f.run("S.ui.swap"), null);
  assert.deepEqual(plain(f.run("S.exp.cargo.pods.map(q => q.id)")), ["h1", "z"], "the framed (second) slot took the found pod");
  const left = plain(f.run("S.pods.find(q => q.id === 'h2')")); assert.equal(left.out, 1, "dotted outline"); assert.equal(left.h, 0);
  assert.equal(f.run("recordSigns(+S.exp.patch.key), cellSigns(+S.exp.patch.key).pd"), 1, "the map's pod sign on this cell");
  assert.equal(f.run("FX.podFlash.i"), 1, "the HUD slot flashes");
  assert.equal(acts(f), a0 + 1);
});

test("← leaves the found pod: nothing changes, nothing is spent", () => {
  const f = setup(2), a0 = acts(f), before = plain(f.run("S.exp.cargo.pods"));
  f.run("takePod(S.pods.find(q => q.id === 'z'))"); f.p.key("back");
  assert.equal(f.run("S.ui.swap"), null); assert.deepEqual(plain(f.run("S.exp.cargo.pods")), before);
  assert.ok(f.run("S.pods.some(q => q.id === 'z')"), "the found pod still lies there");
  assert.equal(acts(f), a0); assert.equal(f.run("FX.msg"), f.run("SWAP_TEXT.kept"));
});

test("a full bag never shows a line pushing you home", () => {
  const f = setup(1);
  const PUSH = /head back|go home|end expedition|leave\b.*\bhome/i;
  assert.doesNotMatch(f.run("SIGN_LINE.full"), PUSH); assert.doesNotMatch(f.run("TILES.find(t => t.id === 'full').name"), PUSH);
  f.run("takePod(S.pods.find(q => q.id === 'z'))");
  const l = plain(f.run("lineFor()")); assert.equal(l.ok, f.run("SWAP_TEXT.take")); assert.equal(l.back, f.run("SWAP_TEXT.leave"));
  assert.match(String(l.ctx), /^leave the (Tuikis|Loika|unknown) pod$/);
  for (const s of [l.ok, l.back, String(l.ctx), f.run("SWAP_TEXT.title"), f.run("SWAP_TEXT.sub"), f.run("SWAP_TEXT.foot")]) assert.doesNotMatch(s, PUSH);
  // taking the last place in the bag sets the sign once: it says a new pod is a choice
  const g = fixture({ canvas: true }); g.run("S.exp.hold = 1; S.exp.cargo.pods = []; S.pods.push({ id: 'y', k: S.exp.patch.key, x: 3, y: 3, sp: 0, h: 0, g: 'meadow', how: 'ground' }); takePod(S.pods.find(q => q.id === 'y'));");
  assert.doesNotMatch(String(g.run("FX.notes.map(n => n.text).join('|') + FX.msg")), PUSH);
});

test("the chooser draws the picture: two stills", () => {
  const one = setup(1); one.run("takePod(S.pods.find(q => q.id === 'z'))"); shown(one);
  goldenStill(assert, one.p, "swap-one-pod.png");
  const two = setup(2); two.run("takePod(S.pods.find(q => q.id === 'z'))"); two.p.key("right"); shown(two);
  goldenStill(assert, two.p, "swap-two-pods.png");
});
