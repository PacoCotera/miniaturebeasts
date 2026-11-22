// G1: her individuals, read from the species framework. One Loika per seed: a genome sampled from the Loika's frame (S01, language frame v4) with the framework's own rng,
// and the three doings read off it. Writes ../src/g1-individuals.mjs (the page and the bot read that file; a test checks it still matches this).
//   node prototypes/exploration/tools/g1-make-individuals.mjs
// The frame has no Character chapter yet (the ring names it, the Loika's frame does not carry it), so her wariness is read from the nearest trait that is a temper, the face's Attitude
// (content / curious): two curious copies make her calm (-1), one steady (0), none wary (+1). Drive (movement.cycle-rate) sets the length of her tells (2 to 4); Stamina
// (energy.action-efficiency) sets whether she keeps early or late hours (an early one beds down at dusk's start, a late one a few light after).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { sampleIndividual, rng } from "../../species/framework/species.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const frame = JSON.parse(fs.readFileSync(here + "../../species/frames/language/species-S01.json", "utf8"));
export const SEEDS = 200;

export function individualOf(seed) {
  const g = sampleIndividual(frame, rng("g1-" + seed), { kind: "wild" });
  const n = (id, v) => (g.loci[id] || []).filter(a => a === v).length;
  const curious = n("appearance.attitude", "curious"), drive = n("movement.cycle-rate", "high"), stam = n("energy.action-efficiency", "high");
  return { seed, wary: 1 - curious, tell: 4 - drive, late: stam === 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = [];
  for (let s = 1; s <= SEEDS; s++) { const i = individualOf(s); rows.push(`  [${i.wary}, ${i.tell}, ${i.late ? 1 : 0}],`); }
  const out = "// G1's Loikas, seeds 1 to 200: [wariness (-1 calm, 0 steady, 1 wary), tell length in light (2 to 4), late hours (1) or early (0)].\n// Made by tools/g1-make-individuals.mjs from the species framework's Loika frame; do not edit by hand.\nexport const INDIVIDUALS = [\n" + rows.join("\n") + "\n];\n";
  fs.writeFileSync(here + "../src/g1-individuals.mjs", out);
  console.log("written", rows.length);
}
