// The Loika lineages Level 3 is drawn and tested on (library.json l3): `full`, four generations of mibis in two blocks with a joined cross, a shed-pod child, released mibis and a bud (the goldens'
// library-l3-far: Dot x Bean joins the Reed and Rush family to the Bean and Clover one, Thistle is Ivy's shed pod, Rush's children sit under a faded parent; Moss is the entry and Dot is held where a later ticket compares), `one`, one block (two founders and eight children, wider than CLOSE's view),
// and `small`, two founders and two children (the whole tree fits CLOSE's view). Built into a state by plain records, deterministic: the founders from fixed pod seeds,
// each child a cross of its recorded parents on a seeded stream (cross.mjs, as doCross draws it), the shed-pod child its parent's shed pod (cross.mjs shedPod: origin kind "shed", parentIds [id, id]).
// Every mibi has read every open chapter (its Coat read: its dot shows its body colour) except those a lineage names in coatUnread (`full`: Hazel, released, and Sedge: the neutral open ring, in the golden). The frames must be loaded (genome.mjs setFrames).
//   buildLineage(st, "full" | "one" | "small", { turn, now }) → the mibis by name (and st.bud)
import { frameOf, podGenome, genomeSha, nameCode, cross, speciesIndex, genomeProblems } from "../../src/genome.mjs";
import { shedPod } from "../../../workbench/framework/cross.mjs";

// [name, parents (names; "shed:<name>" a shed pod of that mibi), stage, released]; in birth order (the ids follow)
const FULL = [
  ["Reed", null, "elder", false], ["Rush", null, "elder", true], ["Nettle", null, "elder", true], ["Yarrow", null, "elder", true],
  ["Hazel", ["Reed", "Rush"], "adult", true], ["Ivy", ["Reed", "Rush"], "adult", false], ["Dot", ["Reed", "Rush"], "adult", false], ["Burdock", ["Nettle", "Yarrow"], "adult", false],
  ["Bean", null, "elder", false], ["Clover", null, "elder", true], ["Lark", ["Bean", "Clover"], "adult", false], ["Sedge", ["Bean", "Clover"], "adult", false],
  ["Thistle", "shed:Ivy", "adult", false], ["Fern", ["Dot", "Bean"], "adult", false], ["Moss", ["Dot", "Bean"], "adult", false], ["Wren", ["Dot", "Bean"], "adult", true],
  ["Sorrel", ["Moss", "Thistle"], "juvenile", false],
];
const ONE = [["Reed", null, "elder", false], ["Rush", null, "elder", false], ...["Hazel", "Ivy", "Dot", "Fern", "Moss", "Wren", "Sorrel", "Lark"].map((n) => [n, ["Reed", "Rush"], "adult", false])];   // eight siblings: wider than CLOSE's view
const SMALL = [["Reed", null, "elder", false], ["Rush", null, "elder", false], ["Ivy", ["Reed", "Rush"], "adult", false], ["Dot", ["Reed", "Rush"], "adult", false]];   // two founders and two children: the whole tree fits CLOSE's view
export const LINEAGES = { full: { mibis: FULL, bud: ["Moss", "Thistle"], coatUnread: ["Hazel", "Sedge"] }, one: { mibis: ONE, bud: null }, small: { mibis: SMALL, bud: null } };

const stream = (seed) => { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; }; };
const AGE = { juvenile: 0, adult: 3, elder: 9 };   // turns since birth: young below 2, elder from 8 (state.mjs stageAt with the default turns)
export function buildLineage(st, which = "full", { turn = st.turn ?? 0, now = 0, species = "S01" } = {}) {
  const fr = frameOf(species), L = LINEAGES[which], by = {}, rng = stream(9001), coat = fr.chapters.find((c) => c.traits.some((t) => t.id === "colour"))?.id, open = fr.chapters.filter((c) => !c.sealed).map((c) => c.id);
  const snap = (m) => ({ id: m.id, name: m.name, code: m.code, sha: m.sha, genome: structuredClone(m.genome) });
  const child = (a, b) => { for (let i = 0; i < 16; i++) { const g = cross(fr, a, b, { rng, kinship: 0 }); if (!genomeProblems(fr, g).length) return g; } throw new Error("the fixture's cross would not build"); };
  let bay = 0;
  for (const [name, parents, stage, released] of L.mibis) {
    const id = st.nextMibi++, shed = typeof parents === "string" ? by[parents.slice(5)] : null;
    const genome = parents == null ? podGenome(fr, (id * 2654435761) >>> 0) : shed ? shedPod(fr, shed, { rng }) : child(by[parents[0]], by[parents[1]]);
    if (!genome) throw new Error("the fixture's shed pod would not build");
    const sha = genomeSha(genome), crossed = Array.isArray(parents);
    const m = { id, name, sp: speciesIndex(species), species, gs: parents == null ? (id * 2654435761) >>> 0 : null, born: turn - AGE[stage], from: crossed ? { n: 0, g: "meadow", how: "cross", podId: null, of: parents } : { n: 0, g: "meadow", how: "ground", podId: null },
      mem: null, outings: 0, notches: 0, bonded: false, genome, sha, code: nameCode(sha), read: (L.coatUnread ?? []).includes(name) ? open.filter((c) => c !== coat) : [...open], parents: crossed ? parents.map((p) => snap(by[p])) : null, bay: released ? null : bay++, paint: null, released, shaped: [] };
    if (released) m.releasedAt = turn;
    st.mibis.push(m); by[name] = m; (st.namesUsed ??= []).push(name);
  }
  if (L.bud) {
    const [a, b] = L.bud.map((n) => by[n]), genome = child(a, b), sha = genomeSha(genome);
    st.bud = { kind: "cross", species, sp: a.sp, gs: null, genome, sha, code: nameCode(sha), start: now, minutes: 600, firstEver: false, parents: [snap(a), snap(b)], kinship: 0, from: { n: 0, g: "meadow", how: "cross", podId: null, of: [a.name, b.name] }, read: [], shaped: [], early: false };
  }
  return by;
}
