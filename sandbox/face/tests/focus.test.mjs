// The focus graph's vectors (lvgl-switch.md §2.6.1) on the JavaScript module, ui/focus.mjs. The face's C port runs the same file (face_test); both give the same id for every case.
//   node --test prototypes/face/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nextFocus, moveFocus, graphProblem, nearest } from "../../ui/focus.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), V = JSON.parse(readFileSync(path.join(here, "vectors/focus.json"), "utf8"));

test(`the vectors: ${V.cases.length} cases give the same id on the JavaScript module`, () => {
  for (const c of V.cases) { const m = moveFocus(c.graph, c.targets, c.from, c.key, (s) => (c.resolve ?? {})[s] ?? null, { roomAt: c.roomAt }); assert.equal(m.to, c.to, c.name); assert.equal(m.verb, c.verb, c.name + ": the verb"); assert.equal(nextFocus(c.graph, c.targets, c.from, c.key, (s) => (c.resolve ?? {})[s] ?? null, { roomAt: c.roomAt }), c.to, c.name); }
});
test("the refusals: a graph the loader must refuse is refused, and a sound one is not", () => {
  for (const r of V.refusals) assert.ok(graphProblem(r.graph), "refused: " + r.name);
  for (const s of V.sound) assert.equal(graphProblem(s.graph), null, s.name);
});
test("the spatial rule: along more than 4 px, 5·along + 11·across on doubled centres, the earlier target on a tie", () => {
  const T = (id, r) => ({ id, rect: r }), a = T("a", [0, 0, 10, 10]);
  assert.equal(nearest([a, T("b", [4, 0, 10, 10])], a, "right"), null); assert.equal(nearest([a, T("b", [4, 0, 11, 10])], a, "right").id, "b");
  assert.equal(nearest([a, T("c", [20, 0, 10, 10]), T("b", [20, 0, 10, 10])], a, "right").id, "c");
});

test("the graphs the spec files carry are sound: one per Pods state, and Home's", () => {
  const spec = (f) => JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station", f), "utf8")), pods = spec("pods.json").focus;
  for (const st of ["collection", "overview", "chapter"]) assert.equal(graphProblem(pods[st]), null, "pods " + st);
  assert.equal(graphProblem(spec("home.json").focus.graph), null, "home");
});
