// The Loika at frame version 5 (owner, 2026-11-01 14:26, refined: "crown can be tiny too. all have the gene, but not all may need to express it"): the crown switch stays a heritable
// switch (on is dominant), and every Loika carries the crown's size, leaf count and form whatever its switch says. They sleep while the crown is not shown, and are still carried
// and crossed, so a bare parent can pass a crown's parameters on.   node --test tests/s01v5.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI, resolveCopies } from "../framework/catalogue.mjs";
import { buildIndividual, sampleIndividual, typeSpecimen, checkGenome, rng, frameVersionOf } from "../framework/species.mjs";
import { cross, shedPod } from "../framework/cross.mjs";

const framesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const loika = frames.find((f) => f.species.id === "S01");
const SWITCH = "anatomy.crown-presence", HEIGHT = "growth.crown-height-ratio", LEAVES = "growth.crest-leaf-count", FORM = "anatomy.crown-form", PARAMS = [HEIGHT, LEAVES, FORM];
const row = (id) => loika.loci.find((l) => l.id === id);
const withCrown = (g, sw, p = {}) => ({ ...g, loci: { ...g.loci, [SWITCH]: sw, ...p } });
const crownNodes = (g) => buildIndividual(loika, g).scene.nodes.filter((n) => n.role === "crown");

test("the Loika is at frame version 5: the crown switch is still an open heritable switch, and its size, leaf count and form are open, sleeping behind it, with the catalogue's whole range", () => {
  assert.equal(frameVersionOf(loika), 5);
  assert.equal(row(SWITCH).kind, "heritable-look"); assert.equal(row(SWITCH).switch, true); assert.deepEqual(row(SWITCH).alleles, ["off", "on"]);
  for (const id of PARAMS) { assert.equal(row(id).kind, "sleeping", id); assert.match(row(id).guard, /asleep in any individual whose anatomy.crown-presence is off/); assert.equal(row(id).chapter, "face"); assert.equal(row(id).trait, "crown"); }
  assert.deepEqual(row(HEIGHT).alleles, ["low", "high"]); assert.deepEqual(row(LEAVES).alleles, ["two", "three"]); assert.deepEqual(row(FORM).alleles, ["leaf", "pointed"]);
  const crown = loika.chapters.find((c) => c.id === "face").traits.find((t) => t.id === "crown");
  assert.deepEqual(crown.loci, [SWITCH, ...PARAMS]); assert.deepEqual(crown.looks, ["bare head", "leaf crest"]);
  assert.ok(loika.absent.every((a) => !PARAMS.includes(a.id)), "none of them is absent from a Loika");
});

test("every frame-5 Loika carries all the crown's parameter copies, crown on or off: the type, drawn individuals, crossed children and shed pods", () => {
  const r = rng("s01v5-carry"), seen = { off: 0, on: 0 }, all = [typeSpecimen(loika)];
  for (let i = 0; i < 150; i++) all.push(sampleIndividual(loika, r));
  const a = sampleIndividual(loika, r), b = sampleIndividual(loika, r);
  for (let i = 0; i < 60; i++) all.push(cross(loika, { id: 1, genome: a }, { id: 2, genome: b }, { rng: r, kinship: 0 }));
  for (let i = 0; i < 20; i++) { const p = shedPod(loika, { id: 3, genome: a }, { rng: r }); if (p) all.push(p); }
  for (const g of all) {
    assert.equal(g.frameVersion, 5);
    for (const id of [SWITCH, ...PARAMS]) assert.ok(Array.isArray(g.loci[id]) && g.loci[id].length === 2 && g.loci[id].every((c) => c != null), `${id}: both copies`);
    assert.deepEqual(checkGenome(loika, g), []);
    seen[resolveCopies(LOCI.get(SWITCH), g.loci[SWITCH]) ? "on" : "off"]++;
  }
  assert.ok(seen.off > 10 && seen.on > 10, `both a bare and a crowned Loika occur: ${JSON.stringify(seen)}`);
  // a bare Loika builds, with no crown; the same genome with the switch on draws the crown its parameters call for
  const g = all.find((x) => !resolveCopies(LOCI.get(SWITCH), x.loci[SWITCH]));
  assert.equal(crownNodes(g).length, 0);
  assert.ok(crownNodes(withCrown(g, ["on", "on"])).length >= 2);
});

test("a crown-off parent's crown copies reach its children: size blends toward them, the leaf count and form copies are handed down, and a child that shows the crown draws with them", () => {
  const typ = typeSpecimen(loika);
  const bare = withCrown(typ, ["off", "off"], { [HEIGHT]: ["low", "low"], [LEAVES]: ["two", "two"], [FORM]: ["pointed", "pointed"] });
  const crowned = withCrown(typ, ["on", "off"], { [HEIGHT]: ["high", "high"], [LEAVES]: ["three", "three"], [FORM]: ["leaf", "leaf"] });
  assert.equal(crownNodes(bare).length, 0, "the bare parent shows no crown");
  const r = rng("s01v5-bare-parent"), kids = [];
  for (let i = 0; i < 300; i++) kids.push(cross(loika, { id: 1, genome: bare }, { id: 2, genome: crowned }, { rng: r, kinship: 0 }));
  const high = LOCI.get(HEIGHT).alleles.find((a) => a.id === "high").value;
  const value = (g) => resolveCopies(LOCI.get(HEIGHT), g.loci[HEIGHT]);
  assert.ok(kids.some((k) => value(k) < high - 0.05), "the crown size of the bare parent pulls the children's below the crowned parent's");
  assert.ok(kids.some((k) => k.loci[LEAVES].includes("two")), "'two' leaves can only have come from the bare parent");
  assert.ok(kids.some((k) => k.loci[FORM].includes("pointed")), "so can 'pointed'");
  const carriers = kids.filter((k) => resolveCopies(LOCI.get(SWITCH), k.loci[SWITCH]) && value(k) < high - 0.05);
  assert.ok(carriers.length > 20, "children that show a crown of the size the bare parent handed down");
  for (const k of carriers.slice(0, 20)) { assert.deepEqual(checkGenome(loika, k), []); const n = crownNodes(k); assert.ok(n.length >= 2); }
  // two bare parents: every child is bare (on is dominant) and still holds the parents' parameters, a pointed copy and all
  const bare2 = withCrown(typ, ["off", "off"], { [HEIGHT]: ["high", "high"], [LEAVES]: ["three", "three"], [FORM]: ["leaf", "leaf"] });
  for (let i = 0; i < 40; i++) {
    const k = cross(loika, { id: 1, genome: bare }, { id: 2, genome: bare2 }, { rng: r, kinship: 0 });
    assert.deepEqual(k.loci[SWITCH], ["off", "off"]); assert.equal(crownNodes(k).length, 0);
    assert.ok(k.loci[LEAVES].every((c) => c === "two" || c === "three") && k.loci[FORM].every((c) => c === "leaf" || c === "pointed"));
  }
});

test("the smallest crown is small but visible: at the low end of the size range the crest is more than a quarter of the head's half height, and the body still builds", () => {
  const typ = typeSpecimen(loika);
  for (const [n, f] of [["three", "leaf"], ["two", "pointed"]]) {
    const g = withCrown(typ, ["on", "on"], { [HEIGHT]: ["low", "low"], [LEAVES]: [n, n], [FORM]: [f, f] }), b = buildIndividual(loika, g);
    assert.equal(b.validation.status, "valid");
    const crown = b.scene.nodes.filter((x) => x.role === "crown"), head = b.scene.nodes.find((x) => x.id.includes("head") && x.radii);
    assert.equal(crown.length, n === "three" ? 3 : 2);
    for (const c of crown) assert.ok(2 * c.radii[2] > 0.25 * head.radii[2], `a ${f} leaf is ${(2 * c.radii[2] / head.radii[2]).toFixed(2)} of the head's half height`);
  }
});
