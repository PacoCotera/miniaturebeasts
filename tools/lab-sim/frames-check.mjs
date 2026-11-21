// node tools/lab-sim/frames-check.mjs : the two frames cross on the real engine; half siblings give 3 in 8.
import { FRAMES } from "./frames.mjs";
import { rng as mkrng } from "../../prototypes/species/framework/draws.mjs";
for (const F of Object.values(FRAMES)) {
  const r = mkrng("check:" + F.name);
  const a = { id: 1, genome: F.draw(r, { kind: "wild" }), parents: [] }, b = { id: 2, genome: F.draw(r, { kind: "wild" }), parents: [] };
  const recs = new Map([[1, a], [2, b]]);
  const lookup = (id) => recs.get(id) ?? null;
  const g = F.cross(a, b, r, lookup);
  console.log(F.name, "child loci", Object.keys(g.loci).length, "kinship", g.origin.kinship);
  console.log(" outcomes M 1x1 k0", F.outcomes("M", 1, 1, 0).join(" "), "k1/8", F.outcomes("M", 1, 1, 0.125).join(" "), "k1/4", F.outcomes("M", 1, 1, 0.25).join(" "));
  for (const B of F.blends) {
    const w = F.window(a, b, B.id, 0, lookup);
    console.log(" blend", B.letter, B.role, "pool", B.lo, B.hi, "cat", B.clo, B.chi, "a", F.shown(a.genome, B.id), "b", F.shown(b.genome, B.id), "window", w, "child", F.shown(g, B.id));
  }
}
