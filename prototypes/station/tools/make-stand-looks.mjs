#!/usr/bin/env node
// Writes ui/specs/station/stand-looks.json: for every species, its look traits (nature "look", outside a sealed chapter), their looks, and the look most pods SHOW (the modal look: what an unread
// chapter draws on a stand, looks.mjs). Measured over PODS pods a species, `podGenome(frame, 0..PODS-1)`, from traitState(...).shows. `--check` fails when the file differs from the frames.
//   node prototypes/station/tools/make-stand-looks.mjs [--check]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameIds, frameOf, podGenome, traitState } from "../src/genome.mjs";

export const PODS = 300;
const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), out = path.resolve(here, "../../ui/specs/station/stand-looks.json");
export function standLooks(only = null) {   // only: a list of species ids (the tests check one; the tool does all sixteen)
  setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
  const species = {};
  for (const id of frameIds().filter((i) => !only || only.includes(i))) {
    const fr = frameOf(id), traits = {}, pods = Array.from({ length: PODS }, (_, gs) => podGenome(fr, gs));
    for (const ch of fr.chapters) {
      if (ch.sealed) continue;
      for (const t of ch.traits) {
        if (t.nature !== "look") continue;
        const count = {}; for (const g of pods) { const s = traitState(fr, t, g).shows; count[s] = (count[s] ?? 0) + 1; }
        const share = Object.fromEntries(Object.entries(count).sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).map(([k, n]) => [k, Math.round((n / PODS) * 1000) / 1000]));
        traits[t.id] = { chapter: ch.id, modal: Object.keys(share)[0], share };
      }
    }
    species[id] = { name: fr.species.name, traits };
  }
  return { rule: "The look an unread chapter draws on a stand: the look most pods show (share), over " + PODS + " podGenome pods a species (seeds 0.." + (PODS - 1) + ") from traitState(...).shows. Made by prototypes/station/tools/make-stand-looks.mjs.", pods: PODS, species };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(standLooks(), null, 1) + "\n";
  if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text) { console.error("stand-looks.json differs from the frames: run tools/make-stand-looks.mjs"); process.exit(1); } console.log("stand-looks.json ok"); }
  else { writeFileSync(out, text); console.log("wrote " + out); }
}
