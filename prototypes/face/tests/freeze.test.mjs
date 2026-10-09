// The freeze check (tools/freeze-check.mjs, lvgl-switch.md §5.1) on a small tree of its own: a changed hash, a new importer, a new drawing key, a path leaving the list, and the exemption that lets one fix through.
//   node --test prototypes/face/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build, check, LIST } from "../tools/freeze-check.mjs";

function tree(files) {
  const root = mkdtempSync(path.join(tmpdir(), "freeze-"));
  for (const [rel, body] of Object.entries(files)) { const f = path.join(root, rel); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, body); }
  return root;
}
const base = () => ({
  "ui/scene.mjs": "export const scene = 1;\n", "station/src/gfx.mjs": "export const R = 1;\n",
  "station/src/main.mjs": 'import { R } from "./gfx.mjs";\n',
  "station/src/screens/home.mjs": 'import { R } from "../gfx.mjs";\nregisterScreen("home", { draw, line, act });\n',
  "station/src/screens/pods.mjs": 'registerScreen("pods", { nodes, faceNodes, line: () => { return { a: { b: 1 } }; }, act });\n',
});

test("the freeze lists the drawing modules that exist, with their importers and the keys each screen registers", () => {
  const root = tree(base()), m = build(root);
  try {
    assert.deepEqual(m.paths.map((e) => e.path).sort(), ["station/src/gfx.mjs", "station/src/screens/home.mjs", "station/src/screens/pods.mjs", "ui/scene.mjs"]);
    assert.deepEqual(m.paths.find((e) => e.path === "station/src/gfx.mjs").importers, ["station/src/main.mjs", "station/src/screens/home.mjs"]);
    assert.deepEqual(m.screens, { home: ["draw"], pods: ["nodes", "faceNodes"] }); assert.deepEqual(check(m, root).failures, []);
  } finally { rmSync(root, { recursive: true }); }
});

test("rule 1: a listed file's content may not change; an exemption naming the commit and the reason, with the new hash, lets one fix through and is printed", () => {
  const root = tree(base()), m = build(root);
  try {
    writeFileSync(path.join(root, "ui/scene.mjs"), "export const scene = 2;\n");
    assert.match(check(m, root).failures[0], /ui\/scene\.mjs changed since the freeze/);
    const sha = build(root).paths.find((e) => e.path === "ui/scene.mjs").sha256, r = check({ ...m, exemptions: [{ path: "ui/scene.mjs", commit: "abc1234", reason: "a crash", sha256: sha }] }, root);
    assert.deepEqual(r.failures, []); assert.ok(r.notes.some((n) => /exemption: ui\/scene\.mjs at abc1234: a crash/.test(n)));
    writeFileSync(path.join(root, "ui/scene.mjs"), "export const scene = 3;\n"); assert.equal(check({ ...m, exemptions: [{ path: "ui/scene.mjs", commit: "abc1234", reason: "a crash", sha256: sha }] }, root).failures.length, 1, "an exemption covers the one change it names");
    rmSync(path.join(root, "ui/scene.mjs")); assert.deepEqual(check(m, root).failures, [], "deleting a listed file passes");
  } finally { rmSync(root, { recursive: true }); }
});

test("rule 2: only the recorded importers may import a listed module, by static, side-effect or dynamic import", () => {
  const root = tree(base()), m = build(root);
  try {
    for (const [i, body] of ['import { R } from "./gfx.mjs";\n', 'import "./gfx.mjs";\n', 'const g = await import("./gfx.mjs");\n', 'export * from "./gfx.mjs";\n'].entries()) {
      writeFileSync(path.join(root, `station/src/new${i}.mjs`), body);
      assert.match(check(m, root).failures.join("\n"), new RegExp(`station/src/new${i}\\.mjs imports station/src/gfx\\.mjs`)); rmSync(path.join(root, `station/src/new${i}.mjs`));
    }
    writeFileSync(path.join(root, "station/src/pixels.mjs"), "export const C = {};\n"); writeFileSync(path.join(root, "station/src/art.mjs"), 'import { C } from "./pixels.mjs";\n'); assert.deepEqual(check(m, root).failures, [], "the kept half is free to import");
  } finally { rmSync(root, { recursive: true }); }
});

test("rule 3: a registered screen gains no draw, nodes or faceNodes the freeze did not record, unless the screen is migrated", () => {
  const root = tree(base()), m = build(root);
  try {
    writeFileSync(path.join(root, "station/src/screens/create.mjs"), 'registerScreen("create", { draw, line, act });\n');
    assert.match(check(m, root).failures.join("\n"), /screen create registers draw/); assert.deepEqual(check({ ...m, migrated: ["create"] }, root).failures, []);
    writeFileSync(path.join(root, "station/src/screens/create.mjs"), 'registerScreen("create", { props, intents });\n'); assert.deepEqual(check(m, root).failures, [], "a screen on the face's props registers none of the three");
    writeFileSync(path.join(root, "station/src/screens/home.mjs"), 'import { R } from "../gfx.mjs";\nregisterScreen("home", { draw, nodes, line, act });\n');
    assert.match(check(m, root).failures.join("\n"), /screen home registers nodes/);
  } finally { rmSync(root, { recursive: true }); }
});

test("rule 4: a path leaves the list only by deletion, or with its screen's goldens present", () => {
  const root = tree(base()), goldens = path.join(root, "golden"), m = build(root);
  try {
    const gone = { ...m, paths: m.paths.filter((e) => e.path !== "station/src/screens/home.mjs" && e.path !== "ui/scene.mjs") };
    const r = check(gone, root, m, goldens).failures.join("\n"); assert.match(r, /station\/src\/screens\/home\.mjs left the list but still exists, and .*golden\/home\/ holds no goldens/); assert.match(r, /ui\/scene\.mjs left the list but still exists \(a shared module leaves only by deletion\)/);
    mkdirSync(path.join(goldens, "home"), { recursive: true }); writeFileSync(path.join(goldens, "home", "home.hash"), "x");
    assert.doesNotMatch(check(gone, root, m, goldens).failures.join("\n"), /home\.mjs/); rmSync(path.join(root, "ui/scene.mjs")); assert.deepEqual(check(gone, root, m, goldens).failures, [], "deletion passes");
    assert.match(check({ ...m, migrated: ["pods"] }, root, m, goldens).failures.join("\n"), /screen pods joined migrated without goldens/);
  } finally { rmSync(root, { recursive: true }); }
});

test("the manifest may only tighten: against the base, a changed hash, a wider importer set, a changed screen and a recorded key added are each refused; a malformed exemption is refused", () => {
  const root = tree(base()), m = build(root), clone = () => JSON.parse(JSON.stringify(m));
  try {
    assert.deepEqual(check(m, root, m, path.join(root, "golden")).failures, [], "the same manifest passes");
    let x = clone(); x.paths.find((e) => e.path === "ui/scene.mjs").sha256 = "0".repeat(64); assert.match(check(x, root, m, path.join(root, "golden")).failures.join("\n"), /ui\/scene\.mjs: the manifest's hash differs/);
    x = clone(); x.paths.find((e) => e.path === "station/src/gfx.mjs").importers.push("station/src/new.mjs"); assert.match(check(x, root, m, path.join(root, "golden")).failures.join("\n"), /station\/src\/new\.mjs was added to the allowed importers/);
    x = clone(); x.paths.find((e) => e.path === "station/src/screens/home.mjs").screen = null; assert.match(check(x, root, m, path.join(root, "golden")).failures.join("\n"), /its screen changed from home to null/);
    x = clone(); x.screens.home = ["draw", "nodes"]; assert.match(check(x, root, m, path.join(root, "golden")).failures.join("\n"), /screen home: nodes was added to the recorded keys/);
    for (const bad of [{ path: "ui/scene.mjs", commit: "zz", reason: "r", sha256: "0".repeat(64) }, { path: "ui/scene.mjs", commit: "abc1234", reason: " ", sha256: "0".repeat(64) }, { path: "ui/scene.mjs", commit: "abc1234", reason: "r", sha256: "short" }, { path: "ui/unlisted.mjs", commit: "abc1234", reason: "r", sha256: "0".repeat(64) }]) assert.match(check({ ...m, exemptions: [bad] }, root).failures.join("\n"), /is malformed/);
  } finally { rmSync(root, { recursive: true }); }
});

test("rule 3 cannot be walked around: a screen registered from any file, by a quoted key, with a template-literal name, or without an object literal is caught; tests are not scanned", () => {
  const root = tree(base()), m = build(root);
  try {
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'registerScreen("late", { draw });\n'); assert.match(check(m, root).failures.join("\n"), /screen late registers draw/);
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'registerScreen(`late`, { "nodes": f, \'faceNodes\': g });\n'); assert.match(check(m, root).failures.join("\n"), /screen late registers nodes[^]*screen late registers faceNodes/);
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'registerScreen("late", impl);\n'); assert.match(check(m, root).failures.join("\n"), /registerScreen\("late"\) takes an object literal/);
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'registerScreen(name, { draw });\n'); assert.match(check(m, root).failures.join("\n"), /takes a string literal as its first argument/);
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'export function registerScreen(name, impl) {}\n'); assert.deepEqual(check(m, root).failures, [], "the definition is not a call");
    mkdirSync(path.join(root, "station/tests"), { recursive: true }); writeFileSync(path.join(root, "station/tests/t.mjs"), 'registerScreen("t", { draw });\n'); assert.deepEqual(check(m, root).failures, [], "tests are not scanned");
    writeFileSync(path.join(root, "station/src/elsewhere.mjs"), 'registerScreen("home", { "line": 1, drawer: 2, drawn: 3 });\n'); assert.deepEqual(check(m, root).failures, [], "a key that merely starts with draw is not draw");
  } finally { rmSync(root, { recursive: true }); }
});

test("imports with a query or a hash still count, and only node_modules, .git and face/dist are skipped by the scan", () => {
  const root = tree({ ...base(), "station/src/q.mjs": 'import { R } from "./gfx.mjs?v=2";\n', "station/src/img/deep.mjs": 'import { R } from "../gfx.mjs#x";\n', "face/dist/skipped.mjs": 'import "../../station/src/gfx.mjs";\n' }), m = build(root);
  try {
    const gfx = m.paths.find((e) => e.path === "station/src/gfx.mjs"); assert.ok(gfx.importers.includes("station/src/q.mjs") && gfx.importers.includes("station/src/img/deep.mjs"), "a query, a hash and a directory called img are all scanned"); assert.ok(!gfx.importers.includes("face/dist/skipped.mjs"), "face/dist is not");
  } finally { rmSync(root, { recursive: true }); }
});

test("the committed freeze: deprecated.json holds a hash for every path of the list that exists, and the tree passes it", () => {
  const manifest = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../deprecated.json"), "utf8"));
  assert.ok(manifest.paths.every((e) => /^[0-9a-f]{64}$/.test(e.sha256) && LIST.some((l) => l.path === e.path)));
  assert.deepEqual(check(manifest).failures, []);
});
