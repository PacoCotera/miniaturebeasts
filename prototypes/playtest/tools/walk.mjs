#!/usr/bin/env node
// One headless session that presses a fixed list of keys and prints, as one JSON line, the hash after boot and after each key and the digest of the rules' state at the end
// (the parity test runs it in a process of its own per session: a process holds one session).
//   node prototypes/playtest/tools/walk.mjs [--face native|wasm] [--seed n] [--save fixture|none] [--names en-short-1] key key ...
import { boot } from "../engine.mjs";

const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf("--" + k); if (i < 0) return d; const v = a[i + 1]; a.splice(i, 2); return v; };
const face = opt("face", "native"), seed = +opt("seed", 1), save = opt("save", "fixture"), names = opt("names", "en-short-1");
const s = await boot({ seed, face, save: save === "none" ? null : save, names });
const hashes = [s.hash()], unsettled = [];
for (const k of a) { const r = s.press(k); hashes.push(r.hash); if (!r.settled) unsettled.push(hashes.length - 1); }
process.stdout.write(JSON.stringify({ face, seed, hashes, unsettled, errors: s.errors(), digest: s.digest(), frames: s.frames() }) + "\n");
s.close(); process.exit(0);
