// Room pictures at a step of the day curve (room-steps.mjs): the ids every view shares, the dusk-unregistered rooms, and the derivation from the two signed paintings.
//   node --test prototypes/station/tests/room-steps.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setRooms, roomIds } from "../src/views/room-props.mjs";
import { lightOf } from "../src/light-curve.mjs";
import { useCurve, mixGrade } from "../src/light-grade.mjs";
import { stepMix, registerStepSlot, STEP_ID } from "../src/room-steps.mjs";
import { registerAsset, asset as assetOf, hasAsset, assetEntry } from "../../ui/assets.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const C = read("../../ui/specs/station/frame.json").light.curve, ROOMS = read("../../ui/specs/station/rooms.json");
setRooms(ROOMS); useCurve(C);
const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return lightOf((h * 60 + m) * 60, C); };

test("every view asks the same ids: at 10:05 the cloud step, across 20:30-22:30 the night painting", () => {
  const cloud = at("10:05").key; assert.match(cloud, /^@L\d\d$/);
  for (let i = 0; i < 4; i++) { const q = roomIds(i, cloud); assert.ok(q.base.includes(`-${cloud}-`) && q.near.includes(`-${cloud}-`) && STEP_ID.test(q.base), q.base); }
  for (let m = 20 * 60 + 30; m <= 22 * 60 + 30; m += 5) assert.equal(roomIds(0, at(`${Math.floor(m / 60)}:${m % 60}`).key).base, "room-roots-idle-night-1024x568", `at ${m}`);
});
test("every room mixes dusk in the loop (day 60 + dusk 40), Roots and Reeds too", () => {
  const key = at("09:50").key;
  for (const room of ["roots", "reeds", "boulders", "ferns"]) { const m = stepMix(key, room, ROOMS, "idle"); assert.deepEqual([m.a, m.b], ["day", "dusk"], room); assert.ok(Math.abs(m.w - 0.4) < 1e-9, room); }
});
test("only the four Reeds band/chip/move/rail swap (the larger picture whole); everything else mixes", () => {
  const key = at("17:15").key, f = stepMix(key, "roots", ROOMS, "idle");
  assert.equal(f.a, "day"); assert.equal(f.b, "dusk"); assert.ok(Math.abs(f.w - 0.5) < 1e-9);
  for (const part of ["band", "chip", "move", "rail"]) { assert.equal(stepMix(key, "reeds", ROOMS, part).w, 0, part); assert.equal(stepMix(key, "roots", ROOMS, part).w, 0.5, part); }
  for (const part of ["idle", "near", "raincup"]) assert.equal(stepMix(key, "reeds", ROOMS, part).w, 0.5, part);
  const loop = stepMix(at("09:50").key, "reeds", ROOMS, "band"); assert.deepEqual([loop.a, loop.b, loop.w], ["day", "day", 0]); assert.ok(loop.gain[2] < 0.95);
});
test("a step picture is mixGrade of the two paintings, an empty slot until they are placed", () => {
  const key = at("09:50").key, px = (v) => ({ w: 4, h: 2, rgba: () => new Uint8ClampedArray(32).map((_, i) => (i % 4 === 3 ? 255 : v + i)) });
  const id = `room-ferns-idle-${key}-4x2`, req = { id, size: [4, 2], until: "test" };
  assert.equal(registerStepSlot(req, ROOMS), true); assert.equal(assetEntry(id).status, "empty");
  for (const [l, v] of [["day", 50], ["dusk", 120]]) registerAsset({ id: `room-ferns-idle-${l}-4x2`, w: 4, h: 2, status: "master", file: "x.png", build: () => px(v) });
  registerStepSlot(req, ROOMS); assert.equal(assetEntry(id).status, "derived");
  const m = stepMix(key, "ferns", ROOMS);
  assert.deepEqual(Array.from(assetOf(id).rgba()), Array.from(mixGrade(px(50), px(120), m.w, m.gain).rgba()));
  assert.equal(registerStepSlot({ id: "room-ferns-idle-day-4x2", size: [4, 2] }, ROOMS), false, "a named light is not a step");
});
