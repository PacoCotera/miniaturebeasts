// The hold ring on the host (host.mjs holdOn, keyDown, keyUp): nothing reaches the player. The frame carries `hold` only with UI.hold and the developer setting realmSleep both on;
// otherwise ✓ is an ordinary key (keyDown takes nothing). A key-up with no key-down kept does nothing; a key-down is passed once and its up once.
//   node --test prototypes/station/tests/hold-ring-host.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import "./fixtures/rooms.mjs";
import * as S from "../src/state.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, holdOn, onFaceMessage, screenProps } from "../src/host.mjs";
for (const k of ["frame", "pods", "home", "cargo", "create", "vivarium", "habitat", "namer", "panel"]) SPECS[k] = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station", k + ".json"), "utf8"));

const rig = () => {
  G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; UI.screen = "home"; UI.idle = false;
  const keys = []; const h = createHost({ send: () => {}, nowMs: () => 0, light: () => "day", key: (k, ph) => keys.push(k + ":" + ph) }); h.save = () => {};
  return { h, keys };
};

test("with the developer setting off or no plate that holds, holdOn is false and ✓ is taken by no hold", () => {
  const { h, keys } = rig();
  for (const [hold, dev] of [[false, false], [true, false], [false, true]]) { UI.hold = hold; G.settings.realmSleep = dev; assert.equal(holdOn(), false); assert.equal(h.keyDown("confirm"), false); }
  h.keyUp("confirm"); assert.deepEqual(keys, [], "nothing reached the face");
  UI.hold = false; G.settings.realmSleep = false;
});

test("F5b: a ✓ let go before the ring is full (the face says confirm:early) puts Keep holding [✓ cap] in the middle slot for hold.keepMs; a full ring clears it; with no hold plate it does nothing", () => {
  const { h } = rig(); h.specs.frame = SPECS.frame; let t = 0; const h2 = createHost({ send: () => {}, nowMs: () => t, light: () => "day", key: () => {} }); h2.save = () => {};
  UI.screen = "pods"; UI.hold = true; G.settings.realmSleep = true;
  try {
    const keep = () => screenProps(null).msg.frame.line.subject;
    onFaceMessage(h2, { t: "intent", seq: 1, screen: "pods", target: "hold", verb: "confirm:early" }); assert.equal(UI.keep != null, true); assert.match(keep(), /^Keep holding \{key:confirm\}$/, "the line names the ✓ cap by its token");
    t = SPECS.frame.hold.keepMs - 1; h2.frame(); assert.equal(UI.keep != null, true, "still there just before keepMs"); t = SPECS.frame.hold.keepMs + 1; h2.frame(); assert.equal(UI.keep, null, "gone after keepMs");
    onFaceMessage(h2, { t: "intent", seq: 2, screen: "pods", target: "hold", verb: "confirm:early" }); assert.equal(UI.keep != null, true); onFaceMessage(h2, { t: "intent", seq: 3, screen: "pods", target: "hold", verb: "confirm:held" }); assert.equal(UI.keep, null, "a full ring clears it");
    UI.hold = false; onFaceMessage(h2, { t: "intent", seq: 4, screen: "pods", target: "hold", verb: "confirm:early" }); assert.equal(UI.keep, null, "no plate that holds: nothing said");
  } finally { UI.hold = false; UI.keep = null; G.settings.realmSleep = false; }
});

test("with both on, only ✓ is held: down once, up once; an up with no down does nothing", () => {
  const { h, keys } = rig(); UI.hold = true; G.settings.realmSleep = true;
  try {
    assert.equal(holdOn(), true); assert.equal(h.keyDown("back"), false); h.keyUp("back"); h.keyUp("confirm"); assert.deepEqual(keys, []);
    assert.equal(h.keyDown("confirm"), true); h.keyUp("confirm"); h.keyUp("confirm"); assert.deepEqual(keys, ["confirm:down", "confirm:up"]);
    // a ✓ pressed while the plate did not hold, then the plate holds: its up is not passed (a fresh press is needed)
    UI.hold = false; keys.length = 0; assert.equal(h.keyDown("confirm"), false); UI.hold = true; h.keyUp("confirm"); assert.deepEqual(keys, []);
  } finally { UI.hold = false; G.settings.realmSleep = false; }
});
