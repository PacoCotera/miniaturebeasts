// station-step-8-round2-2 item 2: does the household of a real save (the named saddled Loika, wild draw v2, plus a mate and her young) get an aim?
//   node prototypes/station/tools/aim-probe-r2.mjs
import { readFileSync } from "node:fs";
import { setFrames, wildGenome, markedLoika, podGenome } from "../src/genome.mjs";
import * as P from "../src/pairing.mjs";

const FR = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));
setFrames([FR]);
const M = "appearance.marking-switch", E = "appearance.eye-size";
let none = 0, aim = 0, loikaHoldsTwice = 0, n = 0;
for (let seed = 1; seed <= 200; seed++) {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  const m = markedLoika(seed, ids);
  const loika = { id: m, genome: wildGenome(FR, seed, m, m) };
  const mate = { id: 99, genome: wildGenome(FR, seed, 99, m) };
  const young = { id: 100, genome: wildGenome(FR, seed, 100, m) };
  n++;
  if ((loika.genome.loci[M] ?? []).length === 2 && loika.genome.loci[M].every((c) => c === "on")) loikaHoldsTwice++;
  const a = P.makeAim(FR, [loika, mate, young]);
  if (a) aim++; else none++;
}
console.log(`realms ${n}: the named Loika holds the marking twice in ${loikaHoldsTwice}; household aim made ${aim}, no aim ${none}`);
