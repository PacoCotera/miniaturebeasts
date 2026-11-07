#!/usr/bin/env node
// The run script: N seeded games for each policy, each in a child process (one session a process), a few at a time, then the report.
//   node prototypes/playtest/tools/bots.mjs [--games 20] [--turns 30] [--presses 60] [--policies random,greedy,hoarder,speedrunner] [--economy strict] [--jobs 4] [--seed0 1]
//                                           [--out prototypes/playtest/reports] [--logs <dir>]
// Writes <out>/bots-report.json and <out>/bots-report.md (and a JSONL log per game under --logs when given).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { report, markdown } from "../metrics.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const games = +opt("games", 20), turns = +opt("turns", 30), presses = +opt("presses", 60), jobs = +opt("jobs", 4), seed0 = +opt("seed0", 1), economy = opt("economy", "strict");
const policies = opt("policies", "random,greedy,hoarder,speedrunner").split(","), out = path.resolve(opt("out", path.join(here, "../reports"))), logDir = opt("logs", null);

const queue = policies.flatMap((policy) => Array.from({ length: games }, (_, i) => ({ policy, seed: seed0 + i, turns, presses, economy, ...(logDir ? { logDir: path.resolve(logDir) } : {}) })));
const results = [];
function run(job) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [path.join(here, "../bot-game.mjs"), JSON.stringify(job)], { stdio: ["ignore", "pipe", "pipe"] });
    let o = "", e = ""; c.stdout.on("data", (d) => (o += d)); c.stderr.on("data", (d) => (e += d));
    c.on("close", (code) => {
      const line = o.split("\n").find((l) => l.startsWith("@@game "));
      if (line) results.push(JSON.parse(line.slice(7)));
      else results.push({ policy: job.policy, seed: job.seed, turns, economy, presses: 0, series: [], screens: {}, stuck: [], softLock: null, pods: { received: 0, neverRead: 0, heldEnd: 0, grown: 0, letGo: 0 }, hatched: 0, end: "error", error: `child exited ${code}: ${(e || o).trim().split("\n").slice(-2).join(" | ")}` });
      process.stderr.write(`\r${results.length}/${queue.length}`); resolve();
    });
  });
}
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (next < queue.length) await run(queue[next++]); }));
process.stderr.write("\n");
results.sort((x, y) => policies.indexOf(x.policy) - policies.indexOf(y.policy) || x.seed - y.seed);
const rep = report(results, { games, turns, presses, economy, face: "native", seed0, policies });
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "bots-report.json"), JSON.stringify(rep, null, 1) + "\n");
writeFileSync(path.join(out, "bots-report.md"), markdown(rep));
console.log(markdown(rep));
