// The bake's temporary folders are removed when the run ends, on an error and on a signal; MB_KEEP_BAKE=1 keeps them.
//   node --test prototypes/face/tests/bake-cleanup.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)), helper = path.resolve(here, "../tools/bake-tmp.mjs"), bakeTest = path.join(here, "bake.test.mjs");
// the children get a private TMPDIR, so a bake test running next to this one cannot be mistaken for a leak
const root = mkdtempSync(path.join(tmpdir(), "mb-bakeclean-"));
const mine = (prefix) => readdirSync(root).filter((n) => n.startsWith(prefix));
const clean = (env = {}) => ({ ...process.env, TMPDIR: root, MB_KEEP_BAKE: "", ...env });
test.after(() => rmSync(root, { recursive: true, force: true }));

test("the smallest bake leaves no /tmp/bake-* folder behind", () => {
  const before = new Set(mine("bake-")), r = spawnSync(process.execPath, ["--test", bakeTest], { env: clean(), encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(mine("bake-").filter((n) => !before.has(n)), []);
});
test("a folder is removed on a throw, on exit and on a signal, and kept with MB_KEEP_BAKE=1", () => {
  const run = (body, env) => spawnSync(process.execPath, ["--input-type=module", "-e", `import { makeBakeDir, withBakeDirs } from ${JSON.stringify(helper)}; ${body}`], { env: clean(env), encoding: "utf8" });
  const count = (prefix) => mine(prefix).length;
  run(`try { withBakeDirs(["bake-zt-"], () => { throw new Error("x"); }); } catch {}; process.exitCode = 0`); assert.equal(count("bake-zt-"), 0, "throw");
  run(`makeBakeDir("bake-ze-")`); assert.equal(count("bake-ze-"), 0, "exit");
  run(`makeBakeDir("bake-zs-"); process.kill(process.pid, "SIGTERM"); setTimeout(() => {}, 5000)`); assert.equal(count("bake-zs-"), 0, "signal");
  run(`makeBakeDir("bake-zk-")`, { MB_KEEP_BAKE: "1" }); assert.equal(count("bake-zk-"), 1, "kept");
  for (const n of mine("bake-zk-")) rmSync(path.join(root, n), { recursive: true, force: true });
});
