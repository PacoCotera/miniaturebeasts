// The harness's parity (the playtest plan: "no re-implementation"): the same seed, save and keys give the same framebuffer hash after every key and the same rules' state at the end
// headless (Node) as in the browser build (the Station page, on the Playwright tooling), and on the native face as on the WebAssembly face; and the same twice on one face.
// Each headless session runs in a process of its own (tools/walk.mjs). Skipped when the faces are not built (face/build.sh all); the page leg also when Playwright is not found (PW_DIR).
//   node --test prototypes/playtest/tests/parity.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../../face/dist");
const wasm = existsSync(path.join(dist, "face.wasm")), native = existsSync(path.join(dist, "face_pipe"));
const pw = (() => { try { createRequire(import.meta.url).resolve(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright"); return true; } catch { return false; } })();
// a walk through every room key and into each screen's first level and back: Home's stations, Pods (a pod, its overview), the Vivarium and a mibi up close, the Library's levels, Idle and back
export const WALK = ["down", "confirm", "right", "confirm", "left", "back", "back", "down", "right", "confirm", "back", "habitat", "right", "confirm", "back", "left", "back",
  "library", "right", "confirm", "down", "confirm", "back", "back", "research", "down", "right", "back", "home", "up", "confirm", "back", "home", "home", "right", "up", "left", "confirm", "back", "back"];
const SEED = 7;
const walk = (face) => JSON.parse(execFileSync(process.execPath, [path.resolve(here, "../tools/walk.mjs"), "--face", face, "--seed", String(SEED), ...WALK], { encoding: "utf8", maxBuffer: 1 << 28 }).trim().split("\n").pop());
const runs = {};
const get = (face) => (runs[face] ??= walk(face));
const firstDiff = (a, b) => a.hashes.findIndex((h, i) => h !== b.hashes[i]);

test("headless: the same seed and keys give the same hashes and state twice (native face)", { skip: !native && "the native face is not built (face/build.sh native)" }, () => {
  const a = get("native"), b = walk("native");
  assert.deepEqual(a.errors, []); assert.deepEqual(a.unsettled, [], "every key settled");
  assert.equal(firstDiff(a, b), -1, "hash after key " + firstDiff(a, b)); assert.equal(a.digest, b.digest);
  assert.ok(new Set(a.hashes).size >= 10, "the walk reached ten screens or more: " + new Set(a.hashes).size);
});

test("native and WebAssembly faces: the same hash after every key and the same state", { skip: !(native && wasm) && "both faces must be built (face/build.sh all)" }, () => {
  const n = get("native"), w = get("wasm");
  assert.equal(firstDiff(n, w), -1, `the faces differ after key ${firstDiff(n, w)} (${WALK[firstDiff(n, w) - 1]}): ${n.hashes[firstDiff(n, w)]} vs ${w.hashes[firstDiff(n, w)]}`);
  assert.equal(n.digest, w.digest);
});

test("headless and the browser build: the same hash after every key and the same state", { skip: !wasm ? "the WebAssembly face is not built" : !pw && "Playwright not found (PW_DIR)" }, async () => {
  const { pageWalk } = await import("../page.mjs");
  const p = await pageWalk({ seed: SEED, keys: WALK }), w = get("wasm");
  assert.deepEqual(p.pageFails, [], "the page raised no error"); assert.deepEqual(p.errors, []);
  assert.equal(firstDiff(p, w), -1, `the page and the headless session differ after key ${firstDiff(p, w)} (${WALK[firstDiff(p, w) - 1]}): ${p.hashes[firstDiff(p, w)]} vs ${w.hashes[firstDiff(p, w)]}`);
  assert.equal(p.digest, w.digest, "the rules' state at the end");
});
