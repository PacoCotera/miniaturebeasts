// L2b fix round (the sign-off's B1, B2, F1-F9), through the page's own waitTick and creatureTick.
//   node --test prototypes/exploration/tests/l2b-fix.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

const said = (f, re) => f.msgs().some(m => re.test(m));
const podsHow = f => f.pods().map(q => q.how);
// up to eleven Waits; the creature stays where it was until its pod is there
function waitsUntilPod(f, id, at, who) {
  f.run(`waitTick('patch')`); const at1 = f.cr(id);   // the first Wait may be its own step before it begins to settle
  assert.ok(Math.abs(at1.x - at.x) + Math.abs(at1.y - at.y) <= 1, who + " first step");
  for (let i = 1; i < 11 && !f.pods().length; i++) { f.run(`waitTick('patch')`); if (!f.pods().length) assert.deepEqual([f.cr(id).x, f.cr(id).y], [at1.x, at1.y], who + " was not moved, wait " + (i + 1)); }
  assert.ok(f.pods().length, who + " finished its moment");
}

test("B1: a Wait with each of the 20 kinds going from alert back to idle never throws, and says a routine verb", () => {
  for (let sp = 0; sp < 20; sp++) {
    const f = fixture({ partner: null, known: [sp] }), at = f.spot(4, 6), id = f.add(sp, at.x, at.y, { st: "alert", t: 1 });
    f.run(`window.__a = waitSnap('patch')`);
    f.set(id, { st: "idle", t: 0 });
    const out = f.run(`waitChanges(window.__a, waitSnap('patch'), 'patch').join(' | ')`);
    assert.match(out, /again/, "sp " + sp + ": " + out);
  }
  const f = fixture({ partner: null, known: [] }), at = f.spot(4, 6), id = f.add(25, at.x, at.y, { st: "watch" });
  f.run(`window.__a = waitSnap('patch')`); f.set(id, { st: "idle" });
  assert.match(f.run(`waitChanges(window.__a, waitSnap('patch'), 'patch').join(' | ')`), /is at ease again|at ease again/, "an unlisted kind");
  assert.equal(f.run(`ROUTINE[3][0]`), "climbs about again", "the Hiljan's fallback verb");
  assert.equal(f.run(`ROUTINE.length`), 20);
});

test("B1: a real Wait press for each kind coming back to routine does not throw", () => {
  for (let sp = 0; sp < 20; sp++) {
    const f = fixture({ partner: null, known: [sp] }), at = f.spot(4, 6), id = f.add(sp, at.x, at.y, { st: "watch", t: 1 });
    for (let i = 0; i < 4; i++) f.run(`waitTick('patch')`);
    assert.ok(f.cr(id), "sp " + sp);
  }
});

test("B2: eleven Waits beside a Wickle, a Peplos in fog and a Tepor on its stone each finish their moment", () => {
  const w = fixture({ partner: null }), wa = w.spot(4, 6), wid = w.add(16, wa.x, wa.y);
  waitsUntilPod(w, wid, wa, "the Wickle");
  assert.deepEqual(podsHow(w), ["still"], w.msgs().join(" | "));
  assert.ok(!w.msgs().some(m => /wanders · .*settles a little more/.test(m)), "no double line");

  const p = fixture({ partner: null }), pa = p.spot(4, 5), pid = p.add(11, pa.x, pa.y); p.fog(true);
  waitsUntilPod(p, pid, pa, "the Peplos"); assert.deepEqual(podsHow(p), ["fog"], p.msgs().join(" | "));

  const t = fixture({ partner: null }), s = t.spot(4, 5);
  t.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${s.x}, y: ${s.y} }); S.exp.warm.push(curLay().key + ':kx')`);
  const ta = t.spot(1, 1, s), tid = t.add(4, ta.x, ta.y);
  waitsUntilPod(t, tid, ta, "the Tepor"); assert.deepEqual(podsHow(t), ["warm"], t.msgs().join(" | "));
});

// tiles a kind covers in a flight: hideOrFlee, then the field clock until it stops running
function fleeRun(sp) {
  const f = fixture({ partner: null }), at = f.spot(4, 5), id = f.add(sp, at.x, at.y);
  f.run(`hideOrFlee({ lay: curLay() }, curLive().cr[0])`); let n = 0, prev = f.cr(id);
  for (let i = 0; i < 4 && f.cr(id).st === "flee"; i++) { f.tick(); const c = f.cr(id); n += Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y); prev = c; }
  return n;
}

test("the tuned flee: a flighty Peplos runs further than a plucky Rupar; the shared row runs as before (3 tiles)", () => {
  assert.equal(fleeRun(11), 4, "Peplos, flee 3"); assert.equal(fleeRun(7), 2, "Rupar, flee 1");
  assert.equal(fleeRun(0), 3, "Loika, flee 2 as before"); assert.equal(fleeRun(25), 3, "an untuned kind as before");
});

test("the tuned creep notice: creeping at 2 tiles alerts a Peplos, not a Rupar or a Loika; at 1 tile all three", () => {
  for (const [sp, d, alert] of [[11, 2, true], [7, 2, false], [0, 2, false], [11, 1, true], [7, 1, true], [0, 1, true]]) {
    const f = fixture({ partner: null }), P = f.P(), at = f.spot(d, d), id = f.add(sp, at.x, at.y);
    f.moveYou(at.x, at.y); const q = f.spot(d, d, at); f.moveYou(q.x, q.y);
    const dist = Math.max(Math.abs(q.x - at.x), Math.abs(q.y - at.y)); assert.equal(dist, d);
    f.tick({ noise: "creep", moved: true });
    assert.equal(["alert", "flee"].includes(f.cr(id).st), alert, "sp " + sp + " at " + d + ": " + f.cr(id).st);
  }
});

// what act() does at the start of a press: the box clears, the held notes come next
function newAction(f) { f.run("S.found.push('callintro', 'mark…', 'mark?', 'mark!', 'markf', 'markfs'); FX.msg = ''; FX.sign = null; FX.notes = (FX.held || []).slice(); FX.held = []; if (FX.notes.length) composeMsg()"); }
function grabbed() {
  const f = fixture({ partner: null }), b = f.spot(1, 1);
  f.run(`curLay().feats.push({ kind: 'b', id: 'bx', x: ${b.x}, y: ${b.y} }); window.F = curLay().feats.find(q => q.id === 'bx')`);
  const h = f.spot(3, 3, b), id = f.add(3, h.x, h.y); f.run("shakeBush(F)");
  return { f, id };
}

test("F1: the Hiljan's grab is one message, the grab line first, then +1 Data, with no repeated 'ate your fruit'", () => {
  const { f } = grabbed(); let line = "";
  for (let i = 0; i < 8 && !/\+1 Data/.test(line); i++) { newAction(f); f.tick(); line = f.run("FX.msg"); }
  const all = f.msgs().join(" | ");
  assert.ok(!/ate your fruit/.test(all), all);
  const grab = f.msgs().findIndex(m => /^All at once, the Hiljan grabs the fruit$/.test(m)), data = f.msgs().findIndex(m => m === "+1 Data");
  assert.ok(grab >= 0 && data > grab, all);
  assert.equal(line, "+1 Data", "one line at a time: the grab line, then the Data on the next action, never joined");
});

test("F2: no why after a grab; a new species still shows its why", () => {
  const { f } = grabbed();
  for (let i = 0; i < 8 && !f.pods().length; i++) f.tick();
  const shed = f.msgs().find(m => /pod rolled loose/.test(m));
  assert.equal(shed, "The Hiljan grabbed a falling fruit · a pod rolled loose");
  const g = fixture({ partner: null, known: [] }), b = g.spot(1, 1);
  g.run(`curLay().feats.push({ kind: 'b', id: 'bx', x: ${b.x}, y: ${b.y} }); window.F = curLay().feats.find(q => q.id === 'bx')`);
  const h = g.spot(3, 3, b); g.add(3, h.x, h.y); g.run("shakeBush(F)");
  for (let i = 0; i < 8 && !g.pods().length; i++) g.tick();
  assert.match(g.msgs().find(m => /pod rolled loose/.test(m)), /^The creature grabbed a falling fruit · a pod rolled loose · /);
});

test("F3: a creature going for fruit shows the fruit bubble and its own sign, not 'Curious · it comes to you'", () => {
  const { f, id } = grabbed();
  assert.equal(f.cr(id).st, "seek");
  assert.equal(f.run(`bubbleOf(curLive().cr[0], null)`), "fs");
  assert.equal(f.run(`BUBBLE_SIGN.fs`), "bubbleSeek"); assert.equal(f.run(`SIGN.bubbleSeek.line()`), "Going for the fruit · let it eat");
  assert.equal(f.run(`SIGN.bubbleSeek.tile`), f.run(`SIGN.bubbleFruit.tile`), "the Probe tile is shared");
  f.set(id, { st: "approach", t: 2 }); assert.equal(f.run(`bubbleOf(curLive().cr[0], null)`), "?", "approach keeps the curious bubble");
});

test("F4: the held shed line shows after a move, not only after an action that makes a note", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6); f.add(16, at.x, at.y);
  for (let i = 0; i < 9; i++) { newAction(f); f.tick(); }
  assert.match(f.run("FX.msg"), /^\+1 Data · the Wickle settled/);
  assert.ok(f.run("FX.held.length") > 0, "the shed line is held");
  f.run("FX.lockUntil = 0; act('right'); FX.lockUntil = 0");   // a creep: its own note makes no new line; the held one must come
  assert.match(f.run("FX.msg"), /^The Wickle settled · a pod rolled loose/, f.run("FX.msg"));
});

test("F5: a Peplos out of fog and a Tuikis away from a hole say where they settle; in fog and by a hole the old line stays", () => {
  const f = fixture({ partner: null }), at = f.spot(2, 3), p = f.add(11, at.x, at.y), t = f.add(1, at.x, at.y);
  assert.equal(f.run(`watchTail(curLive().cr.find(q => q.id === ${p}))`), "it settles only in fog");
  assert.equal(f.run(`watchTail(curLive().cr.find(q => q.id === ${t}))`), "it settles by a hole");
  f.fog(true); assert.equal(f.run(`watchTail(curLive().cr.find(q => q.id === ${p}))`), "keep still and it settles, or Call");
  f.run(`curLay().feats.push({ kind: 'n', id: 'hx', x: ${at.x}, y: ${at.y} })`);
  assert.equal(f.run(`watchTail(curLive().cr.find(q => q.id === ${t}))`), "keep still and it settles, or Call");
  const w = f.add(16, at.x, at.y); assert.equal(f.run(`watchTail(curLive().cr.find(q => q.id === ${w}))`), "keep still and it settles, or Call", "a Wickle settles anywhere");
});

test("F7: the hold's column gets the short forms of the six newest hows; the Ground row and the older hows keep the full tag", () => {
  const f = fixture({ partner: null }), tag = (how, short) => f.run(`podTagOf({ how: '${how}', g: 'meadow' }, ${short})`);
  const want = { grab: ["shed, grabbing fruit", "grabbing fruit"], warm: ["by a warm stone", "warm stone"], dig: ["in a fresh hole", "in a fresh hole"], fog: ["shed in a fog bank", "in a fog bank"], still: ["shed, keeping still", "keeping still"], air: ["shed, airing scales", "airing scales"] };
  for (const [how, [full, short]] of Object.entries(want)) { assert.equal(tag(how, false), full); assert.equal(tag(how, true), short); }
  assert.equal(tag("shake", true), "shed, shaking dry"); assert.equal(tag("meal", true), "after a meal");
});

test("F8: the Station words the six new hows (found line and the short how)", async () => {
  const { podOriginLines } = await import("../../station/src/state.mjs");
  const lines = how => podOriginLines({ g: "meadow", how, idd: false });
  assert.deepEqual(lines("grab").slice(1), ["after a grab for fruit."]);
  assert.deepEqual(lines("dig").slice(1), ["in a fresh hole."]); assert.deepEqual(lines("fog").slice(1), ["in a fog bank."]);
  assert.match(lines("warm")[1], /^as a wild mibi warmed up\.$/); assert.match(lines("still")[1], /^as a wild mibi settled\.$/); assert.match(lines("air")[1], /^as a wild mibi aired out\.$/);
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../../station/src/views/pods-props.mjs", import.meta.url), "utf8");
  for (const [k, v] of Object.entries({ grab: "a grab for fruit", warm: "by a warm stone", dig: "in a fresh hole", fog: "in a fog bank", still: "keeping still", air: "airing out" })) assert.ok(src.includes(`${k}: "${v}"`), k);
});

test("F9: each field habit shows its line once a walk, with the partner's name; the Loika's calm adds none", () => {
  const want = { 3: ["tiptoe", "tiptoes softly"], 4: ["stone-sense", "feels the stone for warmth"], 11: ["dew-find", "found the dew first"], 16: ["beacon-sit", "sits by the beacon a while"],
    19: ["hop-down", "hops down the slope"], 1: ["dig", "dug the burrow out wide enough"], 7: ["bank-dig", "dug a way up the bank"] };
  for (const [sp, [key, words]] of Object.entries(want)) {
    const f = fixture({ partner: +sp }), name = f.run("S.exp.pt.name");
    f.run(`fieldHabit('${key}')`); assert.ok(f.msgs().includes(name + " " + words), key + ": " + f.msgs().join(" | "));
    f.clearMsgs(); f.run(`fieldHabit('${key}')`); assert.deepEqual(f.msgs(), [], key + " once a walk");
  }
  const l = fixture({ partner: 0 }); l.run(`fieldHabit('calm')`); assert.deepEqual(l.msgs(), []);
});
