// L2c F6: the Station reads the `shift` event kind a bank walk's crate carries (the ground shifted back), at the dock; a kind or shape it does not know is skipped, never an error.
//   node --test prototypes/station/tests/world-shift.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { makePage } from "../../exploration/tests/page-harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "loose" };

// The Companion's walk with a Rupar partner that digs the first bank in reach, then ends: the crate it seals.
function bankCrate() {
  const p = makePage({}), run = p.run;
  run(`newWorld(7); TEST.calm = true; S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [{ id: 1, name: "Fig", sp: 7, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }]; S.carried = [1]; S.lead = 1; startExpedition('weather', G.spawns[0])`);
  const e = JSON.parse(run("JSON.stringify((() => { for (let i = 0; i < 2 * MW * MH; i++) if (G.banks[i]) return i; return -1; })())")), a = e >> 1, dir = e & 1 ? "down" : "right";
  run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; S.exp.cargo.e = 2; mapStep(${JSON.stringify(dir)}); endExpedition('end')`);
  return JSON.parse(run("JSON.stringify(S.bay[0] || null)"));
}

test("a dock after a bank walk reads the shift event, with its place, partner and count", () => {
  const c = bankCrate(); assert.ok(c, "the walk sealed a crate");
  assert.ok(c.world.ev.some((e) => e[0] === "shift"), JSON.stringify(c.world.ev));
  const st = S.freshSt("w7", 3, 1000); S.normalize(st); st.probe = { tier: 1, shield: 2, smax: 3 };
  const sv = { v: 8, seed: 7, wid: "w7", turn: 3, bay: [c], mibis: [], carried: [], tier: 1, shield: 3 };
  S.dockKey(st, sv, settings, 1000); const r = S.openBay(st, sv, settings, 1000);
  assert.equal(r.ok, true); const sh = r.plays[0].events.find((e) => e.kind === "shift");
  assert.ok(sh, "the dock read the shift"); assert.equal(sh.who, 1); assert.equal(sh.n, 1); assert.ok(S.WORLD_EV_KINDS.includes("shift"));
});

test("unknown kinds and malformed events are skipped, never an error", () => {
  const c = { id: "x1", n: 1, turn: 1, e: 0, d: 0, s: 0, pods: [], met: [], world: { v: 1, turn: 1, ev: [["shift", "wood", 1, 2], ["later", null, null, 0], ["shift"], "x", ["quiet", null, null, 0], ["shift", 7, 1, 1]] } };
  assert.deepEqual(S.readWorldEv(c).map((e) => e.kind), ["shift", "quiet"]);
  assert.deepEqual(S.readWorldEv({ id: "x2" }), []); assert.deepEqual(S.readWorldEv(null), []); assert.deepEqual(S.readWorldEv({ world: { ev: 5 } }), []);
});
