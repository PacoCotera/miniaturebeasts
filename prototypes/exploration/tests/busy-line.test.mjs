// ui-worldgen-busy-1 (internal issue #51, "while the world is generating, the browser freezes"): the page's long work on its own thread (a reach place baked on the spot at "Start here") is
// preceded by a busy line on the Companion's screen (the making screen, RT.making), one yielded frame (requestAnimationFrame, then setTimeout 0), the work, and the line taken away.
//   node --test prototypes/exploration/tests/busy-line.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

function setup() {
  const p = makePage({ gen: 7, busy: true, console: "silent" });
  p.run("newWorld(7)");
  // the page's frames are driven by hand: a frame callback waits in __raf until the test runs it
  p.run("globalThis.__raf = []; requestAnimationFrame = f => { __raf.push(f); return __raf.length; }; globalThis.__seen = [];");
  p.run("{ const o = startExpedition; startExpedition = function (...a) { __seen.push({ making: RT.making, phase: S.phase, painted: __raf.length === 0 }); return o.apply(this, a); }; }");
  return p;
}

test("Start here on a reach with places not yet made: the busy line is up before the work runs, and gone after", () => {
  const p = setup();
  assert.equal(p.run("coldReach(S.ui.cur)"), true, "a fresh world's reach has places nobody has baked");
  p.key("confirm");   // set out: the place picker
  p.key("confirm");   // Start here
  assert.equal(p.run("RT.making"), true, "the busy line is on as the press returns");
  assert.equal(p.run("__seen.length"), 0, "the work has not run on the press's own turn");
  assert.equal(p.run("!!S.exp"), false);
  p.run("__raf.splice(0).forEach(f => f(1))");   // the frame: the line is drawn, then
  assert.equal(p.run("__seen.length"), 0, "still not run: the frame is yielded to the browser first");
  p.pass(1);   // setTimeout 0
  assert.deepEqual(p.run("JSON.stringify(__seen)"), JSON.stringify([{ making: true, phase: "place", painted: true }]), "the work ran with the line up, after the frame");
  assert.equal(p.run("RT.making"), false, "the line is gone after");
  assert.equal(p.run("!!S.exp"), true, "and the expedition has started");
});

test("a press made while the line is up is ignored", () => {
  const p = setup();
  p.key("confirm"); p.key("confirm");
  assert.equal(p.run("RT.making"), true);
  p.run("act('confirm'); act('confirm')");
  p.run("__raf.splice(0).forEach(f => f(1))"); p.pass(1);
  assert.equal(p.run("__seen.length"), 1, "the work ran once");
});

test("with every place already made, Start here runs at once (nothing to wait for)", () => {
  const p = setup();
  p.run("coldReach = () => false");
  p.key("confirm"); p.key("confirm");
  assert.equal(p.run("!!S.exp"), true);
  assert.equal(p.run("!RT.making"), true);
});
