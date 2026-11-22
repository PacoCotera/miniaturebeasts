// does the stricter pairing rule ever exclude a pair the rest rule had allowed? (strictBites = excluded although rested)
import { FRAMES, playLine, EYES, EARS } from "./lib.mjs";
import { useFrame } from "../engine.mjs";
const KINDS = ["set", `scale:${EYES}`, `scale:${EARS}`];
for (const [n, F] of Object.entries(FRAMES)) {
  useFrame(F);
  let skips = 0, bites = 0;
  for (let s = 1; s <= 200; s++) for (const mode of ["row", "replan"]) { const r = playLine(F, s, "b3", { score: "TELLS", mode, kinds: KINDS, strictPair: true }); skips += r.strictSkips ?? 0; bites += r.strictBites ?? 0; }
  console.log(n, "pairs skipped by the strict rule", skips, "of which the rest rule would have allowed", bites);
}
