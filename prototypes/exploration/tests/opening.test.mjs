// The Companion's opening screen (designer's scheme T-20261108-companion-opening, B1 + B2): the front door between expeditions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { goldenStill } from "./png-golden.mjs";

const plain = x => JSON.parse(JSON.stringify(x));
const mib = (id, name, sp, o = {}) => Object.assign({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: 0, mem: null, habitsDone: [] }, o);
// The page between expeditions with a canvas to read back; reduced motion, so every frame is the first.
function opening(seed = 14, { carried = [], known = [] } = {}) {
  const p = makePage({ console: "silent", els: true, raf: 1, canvas: true });
  p.run(`newWorld(${seed}); RM.matches = true; S.known = ${JSON.stringify(known)};`);
  p.run(`S.mibis = ${JSON.stringify(carried)}; S.carried = ${JSON.stringify(carried.map(m => m.id))}; S.lead = ${carried.length ? carried[0].id : null}; S.phase = 'setup'; S.ui.sel = 0;`);
  return p;
}
const draw = p => { p.run("FX.msg = ''; scr.px().fill(-1); drawSetup(0);"); return p.run("scr").px(); };
// The three of the scheme's returning player: Pip (Loika, grown), Moss (Tuikis, grown) and Dot (an Untuva, young).
const THREE = [mib(1, "Pip", 0), mib(2, "Moss", 1), mib(3, "Dot", 2, { grownTurn: null, born: 4 })];
// The returning player: expedition 5, the Probe's last start, four places found and three been into, one crate sealed, last turn's line.
function returning(seed = 14) {
  const p = opening(seed, { carried: THREE, known: [0, 1, 2] });
  p.run(`S.turn = 5; S.expN = 5; S.bay = [{ id: 1, n: 1, pods: [], e: 0, d: 0, s: 0 }]; S.report = { lines: ['A storm charged stones in the wood.'], n: 4 };
    const s0 = G.spawns[0]; S.ui.lastPos = s0; const q = cxy(s0); let k = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = q.x + dx, y = q.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const c = y * MW + x; S.revealed[c] = 1; S.visited[c] = 1;
      if (passable(c) && G.land[c] !== L.WATER) { if (k < 4) S.called[c] = 1; else if (k < 7) S.veil[String(c)] = [1]; k++; } }`);
  return p;
}
const said = p => { p.run("globalThis.__t = []; if (!globalThis.__wrapped) { globalThis.__wrapped = 1; text = (o => function (s, ...a) { __t.push(String(s)); return o.call(this, s, ...a); })(text); } FX.msg = ''; drawSetup(0);"); return plain(p.run("__t")); };
// The pixels of a picture, as they must stand on the screen at (x, y).
const stands = (p, pb, x, y) => { const px = p.run("scr").px(), W = p.run("SCR_W"); let n = 0, bad = 0; for (let j = 0; j < pb.h; j++) for (let i = 0; i < pb.w; i++) { const v = pb.p[j * pb.w + i]; if (v < 0) continue; n++; if (px[(y + j) * W + x + i] !== v) bad++; } return { n, bad }; };

test("B1: a fresh world draws one tab and the pod, its three lines and the dark line; no strip, no counts, no world inset", () => {
  const p = opening(), t = said(p);
  assert.ok(t.includes("Weather") && !t.includes("Deep ground"), "Weather alone: " + t);
  assert.deepEqual(t.filter(s => /^(Your first walk|Find a pod and bring it home\.|The Station grows it\.)$/.test(s)), ["Your first walk", "Find a pod and bring it home.", "The Station grows it."]);
  assert.ok(t.includes("Tracks in the dark · start at one"), "the first-time line");
  assert.ok(t.includes("charge stones"), "the Weather tab's first-time line");
  for (const s of t) assert.ok(!/Probe tier|World ·|fog|of \d+ places|Seen|Your world|last start|hatch|egg|born|No partner/i.test(s), "no such line: " + s);
  assert.equal(p.run("OPEN_TEXT.firstGrows"), "The Station grows it.");
});

test("B1: a world that knows a Tuikis draws two tabs; Deep ground appears once a digger is met, the burrow seen or a grown digger is with you", () => {
  assert.deepEqual(plain(said(opening(14, { known: [1] })).filter(s => s === "Weather" || s === "Deep ground")), ["Weather", "Deep ground"]);
  assert.ok(said(opening(14, { known: [1] })).includes("needs a Tuikis"), "known, none with you: dimmed");
  assert.ok(said(opening(14, { known: [0] })).every(s => s !== "Deep ground"), "a Loika is no digger");
  const burrow = opening(); burrow.run("S.revealed[G.gate] = 1;"); assert.ok(said(burrow).includes("Deep ground"), "the burrow seen");
  const along = opening(14, { carried: [THREE[1]] }); assert.ok(said(along).includes("Moss digs"), "a grown Tuikis along: the line names it");
});

test("B1: Pip, Moss and Dot carried: the 3x Loika stands at (8, 458) and two 1x tokens at the top right, on their rings", () => {
  const p = returning(); draw(p);
  const pip = p.run("creatureArt(0, 'idle', 0, 3, false)"), r = stands(p, pip, 8, 458); assert.ok(r.n > 500 && r.bad === 0, "the 3x Loika at (8, 458): " + JSON.stringify(r));
  const moss = p.run("creatureArt(1, 'idle', 0, 1, false)"), dot = p.run("creatureArt(2, 'idle', 1, 1, true)");
  const a = stands(p, moss, 398, 452), b = stands(p, dot, 354, 452); assert.ok(a.n > 50 && a.bad === 0, "Moss at 1x top right " + JSON.stringify(a)); assert.ok(b.n > 50, "Dot's token is there");
  const t = said(p); assert.ok(t.includes("Pip") && t.includes("adult") && t.includes("leads"), "name, stage, leads: " + t);
  assert.ok(t.includes("A storm charged stones in the wood."), "last turn's first line");
  assert.ok(t.includes("storm east") || t.includes("storm west"), "the Weather tab's line");
  assert.ok(t.includes("needs a Tuikis"), "Deep ground still needs the Tuikis to lead until B3 (digger() along): the tab says so");
  assert.ok(!t.some(s => /crate/.test(s)), "the crate panel is gone from the screen (the bottom line says it)");
});

test("B1: the rider, no one with you, and the first-time place", () => {
  const rider = opening(14, { carried: [THREE[2]], known: [2] }), t = said(rider);
  assert.ok(t.includes("Dot") && t.includes("young"), "the juvenile's own place: " + t);
  const nobody = opening(14, { carried: [] }); nobody.run("S.mibis = [" + JSON.stringify(THREE[0]) + "]; S.carried = [];");
  assert.ok(said(nobody).includes("No one with you"), "mibis, none with you");
});

test("B1: Up and Down skip Deep ground while it is not shown", () => {
  const p = opening(); p.key("down"); assert.equal(p.run("S.ui.sel"), 2); p.key("up"); assert.equal(p.run("S.ui.sel"), 0);
  const q = opening(14, { known: [1] }); q.key("down"); assert.equal(q.run("S.ui.sel"), 1); q.key("down"); assert.equal(q.run("S.ui.sel"), 2);
});

test("B1: the two named art slots are registered, and the built stand-ins play until their files are in", () => {
  const p = opening(), reg = plain(p.run("CARE_ASSETS.filter(a => /^c-open-/.test(a.id))"));
  assert.deepEqual(reg.map(a => [a.id, a.w, a.h, a.status]), [["c-open-night", 48, 48, "stand-in"], ["c-open-pod-96", 96, 96, "stand-in"]]);
  assert.equal(p.run("openArt('c-open-pod-96')"), null, "no file yet: the built pod");
  draw(p); const pod = p.run("podArt('bone', 3)"), r = stands(p, pod, 32, 488); assert.ok(r.n > 300 && r.bad === 0, "the field pod at 3x: " + JSON.stringify(r));
});

test("B1: stills of the first-time and returning screens", () => {
  const f = opening(); draw(f); goldenStill(assert, f, "opening-first.png");
  const r = returning(); draw(r); goldenStill(assert, r, "opening-returning.png");
});
