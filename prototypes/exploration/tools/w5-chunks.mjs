// Run w4-bot over seed chunks for several worktrees, at most CONC at a time (the bot grows to ~4 GB over 200 seeds, so chunks).
// usage: node w5-chunks.mjs <outDir> <chunk> <conc> name=wtPath [name=wtPath ...]
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const [outDir, chunk, conc, ...wts] = process.argv.slice(2);
const jobs = [];
for (let from = 1; from <= 200; from += +chunk) for (const w of wts) { const [name, wt] = w.split("="); const to = Math.min(200, from + +chunk - 1); const out = `${outDir}/${name}-${String(from).padStart(3, "0")}.json`; if (!existsSync(out)) jobs.push({ name, wt, from, to, out }); }
let running = 0, i = 0;
function next() {
  while (running < +conc && i < jobs.length) {
    const j = jobs[i++]; running++;
    const t0 = Date.now();
    const ch = spawn("node", ["--max-old-space-size=4096", `${j.wt}/prototypes/exploration/tools/w4-bot.mjs`, "--from", j.from, "--to", j.to, "--days", "3", "--read-all", "--json", j.out], { stdio: "ignore" });
    ch.on("exit", code => { running--; console.log(`${j.name} ${j.from}-${j.to} exit ${code} ${Math.round((Date.now() - t0) / 1000)}s`); next(); if (!running && i >= jobs.length) console.log("ALL DONE"); });
  }
}
next();
