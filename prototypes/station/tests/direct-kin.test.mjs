// Direct kin never cross (the owner, 2026-11-03): the Station's rule on the mibi records. node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { platesOf, partnersOf } from "../src/views/vivarium-props.mjs";
import { openCross } from "../src/intents/habitat.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 3 }, spec = JSON.parse(readFileSync(path.join(specs, "vivarium.json"), "utf8"));
const sv = { v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3 };
const world = () => { const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.e = 99; st.s = 99; st.firstMibi = false; return st; };

test("direct kin: the refusal, the order of refusals, the partner list, the forecast and the Breed plate", () => {
  const st = world(), sib = S.seedSiblings(st, "S01", 4242, settings); assert.equal(sib.ok, true, sib.msg);
  const [x, y] = sib.mibis, [pa, pb] = sib.parents;
  assert.equal(S.crossBlock(st, null, x, y, settings), S.FAMILY_LINE, "two children of one pair");
  assert.equal(S.crossBlock(st, null, x, pa, settings), S.FAMILY_LINE, "a child and its parent");
  assert.equal(S.crossBlock(st, null, pa, pb, settings), "", "the founders themselves cross");
  x.born = st.turn; assert.equal(S.crossBlock(st, null, x, pa, settings), S.FAMILY_LINE, "family before not adult: waiting will not help");
  x.born = st.turn - 99; pa.released = true; assert.equal(S.crossBlock(st, null, x, pa, settings), "gone to the wild", "gone to the wild comes first"); pa.released = false;
  assert.equal(S.forecastOf(st, x, y, settings), null); assert.equal(S.doCross(st, null, x, y, settings, 1).msg, "Cross them · " + S.FAMILY_LINE);
  const fam = S.crossPartners(st, null, x, settings).filter((m) => m.family).map((m) => [m.id, m.family]).sort();
  assert.deepEqual(fam, [[y.id, "same-parents"], [pa.id, "parent"], [pb.id, "parent"]].sort(), "family is listed, marked with the relation");
  const h = { st, sv, settings, ui: {}, goto() {} }; openCross(h, x); assert.equal(h.ui.cross.bId, null, "the ring never opens on family");
  // only family at home: x and y with their parents out of the way (let go), the Breed plate points to a walk
  const only = world(), s2 = S.seedSiblings(only, "S01", 4243, settings), [u, v] = s2.mibis;
  only.mibis = only.mibis.filter((m) => m === u || m === v);
  const plate = platesOf(only, sv, u, settings, spec.strings, true).find((p) => p.act === "breed");
  assert.deepEqual([plate.held, plate.why, plate.plate], [true, "only family at home · find a partner on a walk", "family"]);
  const stranger = S.seedAdults(only, "S01", 77, 1, settings).mibis[0];
  assert.notEqual(platesOf(only, sv, u, settings, spec.strings, true).find((p) => p.act === "breed").plate, "family", "an unrelated partner is at home");
  assert.equal(S.crossBlock(only, null, u, stranger, settings), "");
});
