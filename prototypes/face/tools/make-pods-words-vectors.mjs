#!/usr/bin/env node
// Regenerates the hashes of tests/vectors/pods-words.json from the face (the fixture began as the hashes of the frozen JavaScript drawing; since then each change to a Pods picture's place is made here): the framebuffer hash of
// each case is taken on the face with the same stand-in pictures as tests/pods-words.test.mjs.
//   node prototypes/face/tools/make-pods-words-vectors.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { withPolicy, amberLamp } from "../tests/node-scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), file = path.resolve(here, "../tests/vectors/pods-words.json"), dist = path.resolve(here, "../dist"), check = process.argv.includes("--check");
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const text = readFileSync(file, "utf8"), V = JSON.parse(text);
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, notch = x < 3 && y < 3 ? 60 : 0; d[i * 4] = 70 + (k & 127) + notch; d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, slice, tile }; };
let changed = 0;
for (const c of V.cases) {
    const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); f.send({ t: "spec", screen: "frame", json: frameSpec }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  for (const p of c.pictures) f.handleOf(p.id, withPolicy((id) => standIn(id, p.w, p.h, p.slice, p.tile)));
  f.handleOf("home-lamp-amber-12x12", withPolicy(amberLamp));   // the need notice's signed amber lamp, here a flat block of `amber`
  if (f.props(c.props) !== 0) throw new Error(`${c.state}: ${c.name}: ${f.errors().join("; ")}`);
  for (let i = 0; i < 3; i++) f.frame((f.t = (f.t ?? 0) + 16));
  if (c.events) { const t0 = f.t; for (const e of c.events) f.send({ t: "event", ...e }); f.frame(t0 + c.at); }
  const h = f.hash(); if (h !== c.hash) changed++; c.hash = h;
}
const out = JSON.stringify(V, null, 1) + "\n";
if (check) { if (out !== text) { console.error("pods-words.json is not current: run tools/make-pods-words-vectors.mjs"); process.exit(1); } console.log(`pods-words vectors current: ${V.cases.length} cases`); }
else { writeFileSync(file, out); console.log(`wrote ${V.cases.length} cases, ${changed} changed`); }
