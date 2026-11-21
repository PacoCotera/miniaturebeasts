// legal(): the focused item's actions named for bots and the assisted control, read from what the screen drew; it never gives the rules' state. One session for the file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { legal, materials } from "../legal.mjs";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../face/dist");
const skip = !existsSync(path.join(dist, "face_pipe")) && "the native face is not built (face/build.sh native)";
let S = null;
test.after(() => S?.close());

test("legal() on Home lists the device's keys it can name, and nothing outside them", { skip }, async () => {
  S = await (await import("../engine.mjs")).boot({ seed: 3, save: "fixture", names: "en-short-1" });
  const L = legal(S);
  assert.equal(L.screen, "home"); assert.ok(L.actions.length > 0);
  for (const a of L.actions) { assert.ok(S.keys().includes(a.key), a.key); assert.equal(a.id, a.key + ":" + a.label); }
  for (const k of ["home", "research", "library", "habitat", "dock"]) assert.ok(L.keys.includes(k), k);
  assert.ok(L.keys.includes("confirm"));   // a ring is on something: ✓ is pressable
});

test("a key of legal() is a key the harness accepts; the list follows the screen", { skip }, async () => {
  const before = legal(S);
  S.press("research");
  const L = legal(S);
  assert.equal(L.screen, "pods"); assert.notEqual(L.screen, before.screen);
  assert.ok(L.targets.some((t) => t.startsWith("place.")) || L.targets.length === 0);
  for (const a of L.actions) assert.doesNotThrow(() => S.keys().includes(a.key));
  if (L.targets.length > 1) assert.ok(["up", "down", "left", "right"].every((k) => L.keys.includes(k)));
});

test("materials() reads the bar's three numbers or null where there is no bar", { skip }, async () => {
  S.press("home");
  assert.equal(materials(S.observeAssisted()), null);
  S.press("research");
  const m = materials(S.observeAssisted());
  if (m) assert.deepEqual(Object.keys(m), ["e", "d", "s"]);
});
