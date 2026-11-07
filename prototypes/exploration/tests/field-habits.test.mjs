// L2b: the field habits the partner does on a walk, kept in the partner mibi's habitsDone and recorded by the Station at the dock.
//   node --test prototypes/exploration/tests/field-habits.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fixture, plain } from "./walk-fixture.mjs";
import { makePage } from "./page-harness.mjs";
import { FIELD } from "../src/walk-data.mjs";

const done = f => plain(f.run("S.mibis[0].habitsDone"));

test("calm (Loika): the partner keeps a wary creature calm: the habit, once a walk", () => {
  const f = fixture({ partner: 0 }), P = f.P(), at = f.spot(3, 3, P);
  const id = f.add(2, at.x, at.y, { b: .1 });   // a wary Untuva, notice 3
  assert.deepEqual(done(f), []);
  f.tick({ noise: "walk", moved: true });
  assert.ok(f.cr(id), "there"); assert.deepEqual(done(f), ["calm"], f.msgs().join(" | "));
  f.run("S.exp.habits = {}; S.mibis[0].habitsDone = []; curLive().noted = {}"); f.set(id, { x: at.x, y: at.y, st: "idle" });
  f.run("fieldHabit('calm'); fieldHabit('calm')"); assert.deepEqual(done(f), ["calm"], "a set: once");
});

test("dig (Tuikis): the burrow dug out", () => {
  const f = fixture({ partner: 1, gate: true });
  assert.ok(f.run("!!curLay().feats.find(q => q.kind === 'g')"), "the burrow place");
  f.run("dig()"); assert.deepEqual(done(f), ["dig"]);
});

test("tiptoe (Hiljan): you creep up to a wild mibi that stays idle that action, the Hiljan within 2 tiles of it", () => {
  let saw = 0;
  for (let k = 0; k < 14; k++) {
    const f = fixture({ partner: 3, seed: 3 + k }), P = f.P(), at = f.spot(1, 1, P);
    const id = f.add(16, at.x, at.y, { b: .7 });   // curious: it does not take a creep as a threat
    f.tick({ noise: "creep", moved: true });
    const c = f.cr(id), pt = plain(f.run("curLive().pt")), P2 = f.P();
    const want = c.st === "idle" && Math.max(Math.abs(c.x - P2.x), Math.abs(c.y - P2.y)) <= 1 && Math.max(Math.abs(c.x - pt.x), Math.abs(c.y - pt.y)) <= 2;
    assert.deepEqual(done(f), want ? ["tiptoe"] : [], "seed " + (3 + k) + " " + JSON.stringify([c, pt])); if (want) saw++;
  }
  assert.ok(saw >= 1, "seen at least once");
  // walking up to it is no tiptoe
  const g = fixture({ partner: 3 }), at2 = g.spot(1, 1, g.P()); g.add(16, at2.x, at2.y, { b: .7 }); g.tick({ noise: "walk", moved: true }); assert.deepEqual(done(g), []);
  // and a creature two tiles off is not within 1
  const h = fixture({ partner: 3 }), at3 = h.spot(3, 3, h.P()); h.add(16, at3.x, at3.y, { b: .7 }); h.tick({ noise: "creep", moved: true }); assert.deepEqual(done(h), []);
});

test("stone-sense (Tepor): you end an action within 1 tile of a warm or charged stone you can see", () => {
  const stoneAt = (f, d, mode) => { const s = f.spot(d, d, f.P());
    f.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${s.x}, y: ${s.y} }); ${mode === "warm" ? "S.exp.warm.push(curLay().key + ':kx')" : mode === "charged" ? "setFS(curLay().key, 'kx', { ch: 2 })" : ""}; unveil(curLay().key, ${s.x}, ${s.y}, 1)`); };
  for (const [mode, want] of [["warm", ["stone-sense"]], ["charged", ["stone-sense"]], ["cold", []]]) { const f = fixture({ partner: 4 }); stoneAt(f, 1, mode); f.tick(); assert.deepEqual(done(f), want, mode); }
  const f = fixture({ partner: 4 }); stoneAt(f, 3, "warm"); f.tick(); assert.deepEqual(done(f), [], "3 tiles away");
});

test("bank-dig (Rupar): the walk's first bank dig", () => {
  const f = fixture({ partner: 7 });
  f.run("G.level[0] = 1; G.level[1] = 2");   // cell 1 is a level above cell 0
  f.run("digBank(0, 0, 1)"); assert.deepEqual(done(f), ["bank-dig"], "a dig up");
  f.run("S.mibis[0].habitsDone = []; digBank(1, 0, 1)"); assert.deepEqual(done(f), [], "once a walk");
  const g = fixture({ partner: 7 }); g.run("G.level[0] = 1; G.level[1] = 2");
  g.run("digBank(0, 1, 0)"); assert.deepEqual(done(g), [], "a dig down is the ability only"); assert.equal(g.run("S.exp.dug.length"), 1, "the bank is dug");
  assert.ok(!g.msgs().some(m => /dug a way up the bank/.test(m)));
  g.run("digBank(1, 0, 1)"); assert.deepEqual(done(g), ["bank-dig"], "a later dig up still learns it");
  assert.ok(g.msgs().some(m => m.endsWith(" dug a way up the bank")), g.msgs().join(" | "));
});

test("dew-find (Peplos): you take dew from a full cup", () => {
  const f = fixture({ partner: 11 }), s = f.spot(1, 1, f.P());
  f.run(`curLay().feats.push({ kind: 'u', id: 'ux', x: ${s.x}, y: ${s.y}, full: true }); takeDew(curLay().feats.find(q => q.id === 'ux'))`);
  assert.deepEqual(done(f), ["dew-find"]);
  const g = fixture({ partner: 11 }); g.run("S.exp.cargo.s = CAP"); const t = g.spot(1, 1, g.P());
  g.run(`curLay().feats.push({ kind: 'u', id: 'ux', x: ${t.x}, y: ${t.y}, full: true }); takeDew(curLay().feats.find(q => q.id === 'ux'))`);
  assert.deepEqual(done(g), [], "a full hold takes no dew");
});

test("beacon-sit (Wickle): you end an action within 2 tiles of a lit beacon in a place", () => {
  const beacon = (f, d, lit) => { const s = f.spot(d, d, f.P()); f.run(`curLay().feats.push({ kind: 'j', id: 'jx', x: ${s.x}, y: ${s.y} }); ${lit ? "setFS(curLay().key, 'jx', { up: 1 })" : ""}`); };
  for (const [d, lit, want] of [[2, true, ["beacon-sit"]], [1, true, ["beacon-sit"]], [3, true, []], [2, false, []]]) { const f = fixture({ partner: 16 }); beacon(f, d, lit); f.tick(); assert.deepEqual(done(f), want, `${d} ${lit}`); }
});

test("hop-down (Tuliko): a map step down across a stair or a scree edge; not up, not across level ground", () => {
  const p = makePage({ console: "silent", els: true, raf: 1 });
  const found = JSON.parse(p.run(`(() => { newWorld(5, 4); const out = { ramp: null, scree: null, up: null };
    for (let c = 0; c < MW * MH; c++) { if (!G.comp[c]) continue; for (const dir of Object.keys(DIRS)) { const n = stepCell(c, dir); if (n < 0 || !G.comp[n] || G.island[n]) continue;
      const k = edgeKind(c, dir), sk = softKind(c, dir);
      if (k === EDGE.RAMP && G.level[n] < G.level[c] && !out.ramp) out.ramp = [c, dir];
      if (k === EDGE.RAMP && G.level[n] > G.level[c] && !out.up) out.up = [c, dir];
      if (sk === 'scree' && G.level[n] < G.level[c] && !out.scree) out.scree = [c, dir]; } }
    return JSON.stringify(out); })()`));
  assert.ok(found.ramp && found.up, "a stair in this world: " + JSON.stringify(found));
  const hop = (sp, [c, dir]) => { const f = fixture({ partner: sp, seed: 5 });
    f.run(`S.exp.patch = null; S.phase = 'map'; S.exp.start = ${c}; S.exp.pos = ${c}; S.exp.range = 99; mapStep(${JSON.stringify(dir)})`); return done(f); };
  assert.deepEqual(hop(19, found.ramp), ["hop-down"], "down a stair");
  assert.deepEqual(hop(19, found.up), [], "up a stair");
  assert.deepEqual(hop(0, found.ramp), [], "a kind without the habit");
  if (found.scree) assert.deepEqual(hop(19, found.scree), ["hop-down"], "down a scree edge");
});

test("only the partner: a rider never, a kind that does not list the habit never; each habit once a walk; the key is the Station's", () => {
  const f = fixture({ rider: 16 }); assert.equal(f.run("S.exp.pt"), null); assert.ok(f.run("!!S.exp.rider"));
  const s = f.spot(2, 2, f.P()); f.run(`curLay().feats.push({ kind: 'j', id: 'jx', x: ${s.x}, y: ${s.y} }); setFS(curLay().key, 'jx', { up: 1 })`); f.tick();
  assert.deepEqual(done(f), [], "a rider");
  const g = fixture({ partner: 16 }); g.run("fieldHabit('calm'); fieldHabit('dig'); fieldHabit('tiptoe')"); assert.deepEqual(done(g), [], "the Wickle lists only beacon-sit");
  assert.equal(g.run("fieldHabit('beacon-sit')"), true); assert.equal(g.run("fieldHabit('beacon-sit')"), false, "once a walk");
  g.run("S.exp.habits = {}"); g.run("fieldHabit('beacon-sit')"); assert.deepEqual(done(g), ["beacon-sit"], "a set");
  const per = g.run("S.mibis[0].habitsDone"); assert.ok(Array.isArray(per));
  assert.deepEqual(Object.values(FIELD).sort(), ["bank-dig", "beacon-sit", "calm", "dew-find", "dig", "hop-down", "stone-sense", "tiptoe"]);
});

// ---- end to end: a Companion walk with a Wickle beside a lit beacon, End expedition, then the Station's dock ----
const ST = await import("../../station/src/state.mjs");
{ const { setFrames } = await import("../../station/src/genome.mjs"), dir = new URL("../../workbench/frames/language/", import.meta.url).pathname;
  setFrames(readdirSync(dir).filter(f => f.startsWith("species-")).map(f => JSON.parse(readFileSync(path.join(dir, f), "utf8")))); }

test("end to end: the Wickle sits by a lit beacon on a walk; End expedition; the Station's dock records beacon-sit on its mibi, with the plate's log line", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1 }), run = p.run;
  run("newWorld(3, 4); TEST.calm = true; save();");
  const st = ST.normalize(ST.freshSt(p.S.wid, p.S.turn));
  const made = ST.seedAdults(st, "S17", 3, 1); assert.ok(made.ok, made.msg);
  const wk = st.mibis[0]; assert.equal(wk.sp, 16); assert.ok(!wk.habits || !wk.habits.includes("beacon-sit"));
  assert.ok(ST.dockKey(st, p.sv()).docked); ST.normalize(st);   // docked: the Companion reads the Station's mibi
  p.writeSt(st);
  assert.equal(run("mibiById(1).name"), wk.name, "the Companion knows it");
  assert.ok(run("takeMibi(mibiById(1)).ok"), "taken along while docked"); assert.equal(run("setLead(mibiById(1))"), true);
  run("S.mibis[0].born = -5; S.mibis[0].grownTurn = -5");   // a grown one
  assert.equal(run("partnerMibi().id"), 1);
  assert.ok(ST.dockKey(st, p.sv()).lifted, "lifted"); p.writeSt(st);
  // the walk
  run("S.known = [16]; startExpedition('weather', G.spawns[0]); enterPatch(); S.exp.fog = null; S.exp.storm = null; S.exp.stats.calls = 1;");
  assert.equal(run("S.exp.pt.sp"), 16);
  run("var __habLines = []; (() => { const real = fxMsg; fxMsg = (t, p) => { __habLines.push(t); return real(t, p); }; })();");
  const s = JSON.parse(run("JSON.stringify(curLay().spawnPt)")), P = plain(run("S.exp.patch"));
  const spot = JSON.parse(run(`(() => { const lay = curLay(), key = S.exp.patch.key; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = S.exp.patch.x + dx, y = S.exp.patch.y + dy;
    if ((dx || dy) && x > 0 && y > 0 && x < PW - 1 && y < PH - 1 && lay.reach[y * PW + x] && !NOSTAND(lay.tiles[y * PW + x]) && !occupant(key, x, y)) return JSON.stringify({ x, y }); } return 'null'; })()`));
  run(`curLay().feats.push({ kind: 'j', id: 'jx', x: ${spot.x}, y: ${spot.y} }); setFS(curLay().key, 'jx', { up: 1 })`);
  run("advance('patch', { noise: 'wait' })");
  assert.deepEqual(plain(run("S.mibis[0].habitsDone")), ["beacon-sit"], "the Companion's mibi did it");
  assert.ok(plain(run("__habLines")).includes(wk.name + " sits by the beacon a while"), "the Companion line, once: " + JSON.stringify(plain(run("__habLines"))));
  run("endExpedition('done')");
  assert.equal(run("S.exp"), null, "the walk ended");
  assert.equal(run("S.mibis[0].outings"), 1); assert.deepEqual(plain(run("S.mibis[0].habitsDone")), ["beacon-sit"], "never cleared");
  const sv = p.sv(); assert.deepEqual(sv.mibis[0].habitsDone, ["beacon-sit"], "in the save the Station reads");
  // the Station's dock
  const lines0 = st.log.length;
  const r = ST.dockKey(st, sv); assert.ok(r.docked); assert.deepEqual(plain(r.home), [wk.id]);
  assert.ok(wk.habits.includes("beacon-sit"), "the Station mibi has beacon-sit");
  assert.deepEqual(plain(r.habits), [{ id: wk.id, habit: "beacon-sit" }], "the dock says which habit was recorded, once");
  // after the show, the home watch's plate, over no new words
  const { habitPlates } = await import("../../station/src/intents/arrival.mjs"), said = [];
  const HAB = JSON.parse(readFileSync(new URL("../../ui/specs/station/habitat.json", import.meta.url), "utf8"));
  const a = { habits: r.habits }; habitPlates({ st, specs: { habitat: HAB }, say: t => said.push(t) }, a);
  assert.deepEqual(said, [wk.name + " is seen sitting by a beacon"]); assert.deepEqual(a.habits, [], "spent");
  habitPlates({ st, specs: { habitat: HAB }, say: t => said.push(t) }, a); assert.equal(said.length, 1, "once");
  const line = st.log.slice(lines0).find(l => l.includes(wk.name) && l.includes("beacon"));
  assert.ok(line, "its log line: " + JSON.stringify(st.log.slice(lines0)));
  // the dock again, and a lift and redock, change nothing
  ST.dockKey(st, sv); ST.dockKey(st, sv); assert.equal(wk.habits.filter(h => h === "beacon-sit").length, 1);
});
