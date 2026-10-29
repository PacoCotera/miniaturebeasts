#!/usr/bin/env node
// The scripted demo (no model): boot the headless Station on the goldens' fixture save, press a fixed walk of 50 keys, write the run's log, and render the first three screens whose
// hash is new. Prints where they went and how long it took.
//   node prototypes/playtest/tools/demo.mjs [--out <dir>] [--face native|wasm]
import path from "node:path";
import { tmpdir } from "node:os";
import { boot } from "../engine.mjs";
import { play } from "../run.mjs";

export const DEMO_WALK = ["down", "confirm", "right", "confirm", "left", "back", "back", "down", "right", "confirm", "back", "habitat", "right", "confirm", "back", "left", "back",
  "library", "right", "confirm", "down", "confirm", "back", "back", "research", "down", "right", "back", "home", "up", "confirm", "back", "home", "home", "right", "up", "left", "confirm", "back", "back",
  "habitat", "confirm", "down", "right", "confirm", "back", "back", "research", "confirm", "back"];
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const out = path.resolve(opt("out", path.join(tmpdir(), "mb-playtest-demo"))), face = opt("face", "native");
const s = await boot({ seed: 1, save: "fixture", names: "en-short-1", face });
let i = 0;
const r = await play(s, { player: () => ({ key: DEMO_WALK[i++], reason: "the demo's fixed walk" }), presses: DEMO_WALK.length, log: path.join(out, "run.jsonl"), checkpoints: path.join(out, "frames"), renders: 3, header: { player: "demo", seed: 1 } });
console.log(JSON.stringify({ boot: +(s.bootMs / 1000).toFixed(2), presses: r.presses, end: r.end.reason, screens: r.screens, seconds: +r.seconds.toFixed(2), log: r.log, rendered: r.rendered }));
s.close(); process.exit(0);
