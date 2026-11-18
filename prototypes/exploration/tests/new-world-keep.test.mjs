// New world replaces the map only (bug #59: "under no circumstance you should delete user game data"). The page's menu New world keeps every mibi, the Station's part, the crates
// and the hold, the Library, Energy, Data and Essence, the bonds and notches; the carried mibis come home; the map (seed, pins, veil, progress) is new.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { freshSt } from "../../station/src/state.mjs";

const J = (p, src) => JSON.parse(p.run("JSON.stringify(" + src + ")"));
const page = (store = {}) => makePage({ gen: 7, store, console: "collect", els: true, canvas: true, raf: "count" });

// A game with something in every place the player keeps things.
function game() {
  const p = page(); p.run("newWorld(11); TEST.calm = true;");
  p.run(`S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 3, notches: 2, bonded: true, plays: 3, grownTurn: -9 }, { id: 2, name: 'Tam', sp: 1, born: -5, outings: 1, notches: 1, bonded: false, plays: 1, grownTurn: null });
    S.carried = [1]; S.lead = 1; S.turn = 40; S.known = [0, 1, 2]; S.found = ['freeid']; S.tier = 2; S.nextId = 30;
    S.hold = { e: 3, d: 4, s: 2, pods: [{ id: 'w0', k: '5', sp: 0, h: 1, bur: 1, g: 'meadow', how: 'ground' }] };
    S.bay = [{ id: 'b1', n: 1, at: 5, e: 1, d: 1, s: 1, pods: [{ id: 'w1', k: '6', sp: 1, h: 1, bur: 1, g: 'meadow', how: 'ground' }] }];
    S.pins = [{ k: '5', t: 'x' }]; S.veil = { 5: 1 }; S.visited[5] = 1; S.revealed[5] = 1; save();`);
  const st = freshSt(p.S.wid, 40); st.e = 7; st.d = 8; st.s = 9; st.known = [0, 1, 2]; st.mibis = [{ id: 1, name: "Dot", sp: 0, born: -9, bonded: true, notches: 2 }, { id: 2, name: "Tam", sp: 1, born: -5, notches: 1 }];
  st.tray = [{ id: "t1", sp: 0, g: "meadow", how: "ground", gs: 5, n: 0, idd: 0, st: [] }];
  p.writeSt(st);
  return { p, st };
}

test("New world: every kept thing is still there, the carried mibi is home, the map is new", () => {
  const { p, st } = game();
  const before = { wid: p.S.wid, seed: p.S.seed, regions: p.run("S.regions.length") };
  p.run("newWorldLive()");
  const S = p.S;
  assert.notEqual(S.seed, before.seed, "the map is new (the seed changed)");
  assert.equal(S.wid, before.wid, "the game's world id stays");
  assert.deepEqual(J(p, "S.mibis.map(m => m.name)"), ["Dot", "Tam"], "both mibis are kept");
  assert.deepEqual(J(p, "S.mibis.map(m => [m.notches, m.bonded])"), [[2, true], [1, false]], "notches and the bond are kept");
  assert.deepEqual(J(p, "S.carried"), [], "the carried mibi came home");
  assert.equal(p.run("S.lead"), null);
  assert.equal(S.turn, 40, "the world turn runs on (mibi ages count from it)");
  assert.deepEqual(J(p, "S.known"), [0, 1, 2], "the Library is kept");
  assert.deepEqual(J(p, "S.found"), ["freeid"]);
  assert.equal(p.run("S.tier"), 2);
  assert.equal(p.run("S.hold.e + ',' + S.hold.d + ',' + S.hold.s + ',' + S.hold.pods.length"), "3,4,2,1", "Energy, Data, Essence and pods held are kept");
  assert.equal(p.run("S.bay.length"), 1, "the sealed crate is kept");
  // the map is new: no pins, no veil, no progress, one region
  assert.deepEqual(J(p, "S.pins"), []);
  assert.deepEqual(J(p, "S.veil"), {});
  assert.equal(p.run("S.visited.some(Boolean) || S.revealed.some(c => c)"), false, "no map progress");
  assert.equal(p.run("S.regions.length"), 1);
  // the stored save: the Station's part is the same one
  const sv = p.sv();
  assert.equal(sv.wid, before.wid); assert.ok(sv.st && sv.st.wid === before.wid, "the Station's part is stored with the game");
  assert.equal(sv.st.e + "," + sv.st.d + "," + sv.st.s, "7,8,9", "the Station's Energy, Data and Essence");
  assert.deepEqual(sv.st.mibis.map((m) => m.name), ["Dot", "Tam"]);
  assert.equal(sv.st.tray.length, 1, "the tray's pod");
  assert.deepEqual(p.errors, []);
});

test("New world: no two pods share an id, and the new land is played on", () => {
  const { p } = game();
  p.run("S.pods.length");   // the old land
  p.run("newWorldLive()");
  const ids = p.run("[...S.pods.map(q => q.id), ...S.bay.flatMap(c => c.pods.map(q => q.id)), ...S.hold.pods.map(q => q.id)]");
  assert.equal(new Set(ids).size, ids.length, "ids are unique across the land, the crates and the hold");
  assert.ok(p.run("S.pods.length") > 0, "the new land has its pods");
  assert.doesNotThrow(() => p.run("render(0)"), "the screen draws");
});

test("New world mid-expedition: the cargo goes to the hold, the expedition ends with the land", () => {
  const { p } = game();
  p.run("S.hold = null; S.bay = []; startExpedition('weather', G.spawns[0]); S.exp.cargo.e = 2; S.exp.cargo.d = 3; S.carried = [1];");
  p.run("newWorldLive()");
  assert.equal(p.run("S.exp"), null, "no expedition on the new land");
  assert.equal(p.run("S.hold && (S.hold.e + ',' + S.hold.d)"), "2,3", "the cargo is held, not lost");
  assert.deepEqual(J(p, "S.carried"), []);
  assert.equal(p.run("S.mibis.length"), 2);
});

test("the Station page reads the same household after New world (the shared save)", () => {
  const { p, st } = game();
  p.run("newWorldLive()");
  const sv = p.sv();
  // the Station reads st from the shared save only when its wid is the world's; both still say the same wid
  assert.equal(sv.st.wid, sv.wid);
  // a second page opened on the same storage (a reload) still holds the household
  const q = page({ ...p.store });
  assert.equal(q.run("RT.readOnly"), undefined);
  assert.deepEqual(J(q, "S.mibis.map(m => m.name)"), ["Dot", "Tam"]);
  assert.equal(q.run("S.st && S.st.wid === S.wid"), true, "the Station's part belongs to the world the Companion plays");
  assert.equal(q.run("S.st.e + ',' + S.st.d + ',' + S.st.s"), "7,8,9");
  assert.deepEqual(q.errors, []);
});

test("a first world (no save) is still whole: newWorld with no game to keep starts empty", () => {
  const p = page(); p.run("newWorld(5)");
  assert.deepEqual(J(p, "S.mibis"), []); assert.equal(p.run("S.hold"), null);
});

test("the menu's two presses: the first only arms it (and says what stays), the second does it", () => {
  const { p } = game();
  p.run("S.phase = 'menu'; S.ui.from = 'setup'; S.ui.menuSel = menuItems().findIndex(i => i.id === 'newworld');");
  const seed0 = p.S.seed;
  p.key("confirm");
  assert.equal(p.S.seed, seed0, "one press changes nothing");
  assert.equal(p.run("S.ui.nwArm"), 1);
  assert.match(p.run("FX.msg ? FX.msg.text || FX.msg : ''") + "", /Only the map changes\. Your mibis and everything else stay · Confirm again/);
  p.key("confirm");
  assert.notEqual(p.S.seed, seed0, "the second press makes the new map");
  assert.deepEqual(J(p, "S.mibis.map(m => m.name)"), ["Dot", "Tam"]);
});
