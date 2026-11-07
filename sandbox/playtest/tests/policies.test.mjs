// The four policies and the run script, each game in a child process (one session a process). Short games, a few turns: what a policy must do, not what the economy comes to. Skipped when the face is not built.
//   node --test prototypes/playtest/tests/policies.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../../face/dist");
const skip = !existsSync(path.join(dist, "face_pipe")) && "the face is not built (face/build.sh)";
const run = promisify(execFile);
const game = async (o) => { const { stdout } = await run(process.execPath, [path.join(here, "../bot-game.mjs"), JSON.stringify(o)], { maxBuffer: 1 << 26 }); return JSON.parse(stdout.split("\n").find((l) => l.startsWith("@@game ")).slice(7)); };
const G = {};
test.before(async () => {
  if (skip) return;
  const [hoarder, speedrunner, greedy, random, random2] = await Promise.all([{ policy: "hoarder", seed: 1 }, { policy: "speedrunner", seed: 1 }, { policy: "greedy", seed: 1 }, { policy: "random", seed: 3 }, { policy: "random", seed: 3 }].map((o) => game({ ...o, turns: 4 })));
  Object.assign(G, { hoarder, speedrunner, greedy, random, random2 });
});

test("every policy plays its turns without an error and records the world turn by turn", { skip }, () => {
  for (const [name, g] of Object.entries(G)) { if (name === "random2") continue; assert.equal(g.end, "done", name + ": " + g.error); assert.equal(g.series.length, 4, name); assert.equal(g.series.at(-1).turn, 4); assert.ok(g.presses > 0); assert.ok(!g.faceErrors, name); }
});
test("hoarder collects and never spends: the bay is opened, the materials only rise, nothing is grown or hatched", { skip }, () => {
  const g = G.hoarder;
  for (let i = 1; i < g.series.length; i++) for (const k of ["e", "d", "s"]) assert.ok(g.series[i][k] >= g.series[i - 1][k], k);
  assert.equal(g.hatched, 0); assert.equal(g.firstHatch, null); assert.equal(g.pods.grown, 0); assert.equal(g.pods.letGo, 0); assert.ok(g.series.at(-1).pods > 0); assert.equal(g.series.at(-1).bay, 0);
  assert.ok(g.pods.neverRead === g.pods.received);
});
test("speedrunner hatches fast and then only docks and lifts", { skip }, () => {
  const g = G.speedrunner;
  assert.ok(g.firstHatch && g.firstHatch.turn <= 2, JSON.stringify(g.firstHatch)); assert.equal(g.hatched, 1);
  assert.ok(g.presses < G.greedy.presses, "fewer presses than greedy");
  assert.equal(g.pods.neverRead, g.pods.received, "it reads nothing");
});
test("greedy spends: it identifies, reads and hatches, so it holds less Data than the hoarder", { skip }, () => {
  const g = G.greedy;
  assert.ok(g.firstHatch && g.firstHatch.turn <= 3, JSON.stringify(g.firstHatch)); assert.ok(g.hatched >= 1); assert.ok(g.pods.grown >= 1);
  assert.ok(g.series.at(-1).d < G.hoarder.series.at(-1).d); assert.ok(g.pods.neverRead < g.pods.received);
});
test("random presses legal keys only, reaches several screens, and is the same game for the same seed", { skip }, () => {
  const g = G.random;
  assert.ok(Object.keys(g.screens).length >= 6, Object.keys(g.screens).join());
  assert.deepEqual(G.random2, g);
});

test("the run script plays the games in child processes and writes the JSON report and the markdown table", { skip }, async () => {
  const out = mkdtempSync(path.join(tmpdir(), "mb-bots-")), logs = path.join(out, "logs");
  try {
    await run(process.execPath, [path.join(here, "../tools/bots.mjs"), "--games", "2", "--turns", "3", "--policies", "hoarder,speedrunner", "--jobs", "2", "--out", out, "--logs", logs], { maxBuffer: 1 << 26 });
    const r = JSON.parse(readFileSync(path.join(out, "bots-report.json"), "utf8")), md = readFileSync(path.join(out, "bots-report.md"), "utf8");
    assert.deepEqual(Object.keys(r.policies), ["hoarder", "speedrunner"]); assert.equal(r.games.length, 4); assert.equal(r.policies.hoarder.games, 2);
    assert.deepEqual(r.games.map((x) => x.seed), [1, 2, 1, 2]);
    assert.match(md, /^\| speedrunner \|/m); assert.match(md, /Not measurable yet/);
    assert.equal(readdirSync(logs).length, 4);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
