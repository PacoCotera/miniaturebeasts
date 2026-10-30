// Frame version 6, the fluffy species (design/proposals/genome-fluffy.md): each new grammar value, and that nothing older moved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VALIDATED, LOCI, PART_SWITCHES, inClan } from "../framework/catalogue.mjs";
import { planFacts, parsePlanKey } from "../framework/plans.mjs";
import { SPECIES, CLANS, specOf, PARKED, ACTIVE_SPECIES, GLYPHS } from "../framework/roster.mjs";
import { buildFrame, buildIndividual, typeSpecimen, sampleIndividual, rng, frameVersionOf } from "../framework/species.mjs";
import { validateBody } from "../framework/validate.mjs";
import { sweep, newNode } from "../framework/geometry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);
const NEW = VALIDATED.filter((l) => l.sinceFrame === 6).map((l) => l.id);
const sceneOf = (id) => buildIndividual(frameOf(id), typeSpecimen(frameOf(id)));
const OLD_KEYS = ["one|serial|bilateral|contact|zero|one|two|off|skin", "three|serial|bilateral|contact|zero|one|three|on|skin", "two|fan|radial|contact|zero|one|one|off|skin", "three|serial|bilateral|none|zero|one|two|off|skin", "one|serial|radial|none|zero|one|two|on|fur"];

test("(a) a mixed plan parses, reads as hind legs plus a free front pair with hands, and hops and walks upright", () => {
  const f = planFacts("one|serial|bilateral|mixed|one|two|one|off|fur", { join: "broad", upright: true });
  assert.equal(f.limbSet, "legs"); assert.equal(f.armSet, "arms"); assert.equal(f.posture, "upright"); assert.equal(f.code, "B1·L2·hands");
  assert.ok(f.states.includes("hop") && f.states.includes("walk"));
  assert.equal(f.values["appendage.arms"], true); assert.equal(f.extras.upright, true);
  for (const bad of ["one|serial|bilateral|mixed|two|two|one|off|fur", "one|serial|bilateral|mixed|one|two|two|off|fur", "one|serial|radial|mixed|one|two|one|off|fur", "one|fan|bilateral|mixed|one|two|one|off|fur"]) assert.throws(() => parsePlanKey(bad), /mixed/);
  const s = sceneOf("S19");
  assert.equal(s.scene.nodes.filter((n) => n.role === "hand").length, 2, "two palms");
  assert.equal(s.scene.nodes.filter((n) => n.role === "finger").length, 6, "three fingers each");
  assert.equal(s.scene.nodes.filter((n) => n.part?.startsWith("leg-")).length > 0, true, "and the hind legs");
  assert.ok(frameOf("S19").loci.some((l) => l.id === "growth.hand-size-ratio" && l.kind !== "locked"), "hand size is an open trait");
  assert.ok(frameOf("S19").loci.some((l) => l.id === "growth.free-proximal-ratio" && l.kind === "locked"), "the arm's length is fixed per species");
});

test("(a) every older plan key parses and resolves as before: no arms, no upright, the same facts", () => {
  for (const key of OLD_KEYS) { const f = planFacts(key, {}); assert.equal(f.armSet, undefined); assert.equal(f.extras.upright, undefined); assert.equal(f.values["appendage.arms"], undefined); assert.ok(["legs", "rays", "feelers", null].includes(f.limbSet)); }
  assert.equal(planFacts("two|serial|bilateral|contact|zero|one|two|off|fur", { join: "narrow" }).code, "B2·L4");
});

test("(b) the tail curl: a spiral whose turn grows toward the tip, the plain arc unchanged, a crown plume rises and a rear tail does not", () => {
  const mk = (curl) => { const n = newNode("t", "axial-tail", null, "body"); return sweep(n, [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1, 0.05, 0.3, 12, 0.3, curl); };
  const plain = sweep(newNode("t", "axial-tail", null, "body"), [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1, 0.05, 0.3, 6, 0.3), same = sweep(newNode("t", "axial-tail", null, "body"), [0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1, 0.05, 0.3, 6, 0.3, 0);
  assert.deepEqual(plain.mesh.vertices, same.mesh.vertices, "curl 0 is the old arc, byte for byte");
  const t = mk(3), raw = t.stations.map((s) => Math.atan2(s.tangent[2], s.tangent[0])), tan = raw.map((a, i) => { while (i && a < raw[i - 1] - 1e-9) a += 2 * Math.PI, raw[i] = a; return a; });
  assert.ok(Math.abs(tan.at(-1) - (0.3 + 3)) < 0.25, "the heading ends turned by bend plus curl");
  assert.ok(tan.every((a, i) => i === 0 || a > tan[i - 1]), "and keeps turning");
  const wick = sceneOf("S17").scene, curl = sceneOf("S19").scene;
  const tailOf = (s) => s.nodes.find((n) => n.id === "tail"), body = (s) => s.nodes.find((n) => n.id === "region-0");
  assert.ok(tailOf(wick).root[2] > body(wick).center[2] + 0.5 * body(wick).radii[2], "Wickle's plume roots on the crown");
  assert.ok(tailOf(curl).root[2] < body(curl).center[2], "Curlop's tail roots low on the back");
  assert.ok(tailOf(curl).end[2] > tailOf(curl).stations[4].center[2], "and curls up at the tip");
  assert.ok(tailOf(wick).end[0] < tailOf(wick).root[0], "the plume curls forward (the head is at -X)");
  assert.ok(wick.nodes.some((n) => n.id === "tail-bulb"), "with a glowing tip");
});

test("(c) the fur skirt: floor length rests on the ground and covers the legs; a skirt that would leave a leg end out is a body that does not build", () => {
  for (const id of ["S17", "S18"]) { const s = sceneOf(id).scene, sk = s.nodes.find((n) => n.id === "fur-skirt"); assert.ok(sk, `${id} has a skirt`); assert.ok(Math.min(...sk.mesh.vertices.map((p) => p[2])) < 1e-6 + 0.0001, `${id}: the hem is on the floor`); assert.equal(s.furSkirt.floorLength, true); }
  assert.ok(!frames.filter((f) => !["S17", "S18"].includes(f.species.id)).some((f) => f.loci.some((l) => l.id === "anatomy.fur-skirt-presence")));
  const sc = JSON.parse(JSON.stringify({ furSkirt: { floorLength: true, hidesLegs: false }, nodes: [], edges: [] }));
  assert.ok(validateBody(sc).problems.includes("fur skirt at floor length does not cover the legs"));
  // a skirt on legs: S19 with the skirt switched on in a test spec covers its feet at floor length
  const spec = specOf(SPECIES.find((s) => s.id === "S19"));
  const legged = buildFrame({ ...spec, features: { ...spec.features, "anatomy.fur-skirt-presence": "on" }, open: null }, { samples: 10 });
  const b = buildIndividual(legged, typeSpecimen(legged));
  assert.equal(b.validation.status, "valid"); assert.equal(b.scene.furSkirt.hidesLegs, true, "the hem's footprint takes in both feet");
  assert.ok(legged.loci.some((l) => l.id === "growth.fur-skirt-drop"));
});

test("(d) brow tufts: Drapet has them locked on with the length open; any species may open the switch and then the part sleeps when it is off", () => {
  assert.ok(sceneOf("S18").scene.nodes.some((n) => n.role === "brow-tuft"));
  assert.ok(!sceneOf("S17").scene.nodes.some((n) => n.role === "brow-tuft"));
  const f = frameOf("S18"); assert.equal(f.loci.find((l) => l.id === "anatomy.brow-tuft-presence").kind, "locked"); assert.notEqual(f.loci.find((l) => l.id === "growth.brow-tuft-length").kind, "locked");
  const spec = specOf(SPECIES.find((s) => s.id === "S18"));
  const open = buildFrame({ ...spec, open: [{ trait: "colour" }, { chapter: "face", id: "brows", name: "Brows", loci: ["anatomy.brow-tuft-presence", "growth.brow-tuft-length"], looks: ["bare", "tassels"] }] }, { samples: 20 });
  const row = open.loci.find((l) => l.id === "anatomy.brow-tuft-presence"); assert.notEqual(row.kind, "locked");
  const g = typeSpecimen(open); g.loci["anatomy.brow-tuft-presence"] = ["off", "off"];
  assert.ok(!buildIndividual(open, g).scene.nodes.some((n) => n.role === "brow-tuft"), "off: no tufts");
});

test("backward compatibility: no old frame lists or carries a new record, the records are new, and the pin is unchanged", () => {
  assert.equal(NEW.length, 9);
  assert.ok(NEW.every((id) => LOCI.get(id).sinceFrame === 6));
  for (const f of frames.filter((x) => Number(x.species.id.slice(1)) <= 16)) {
    assert.ok(frameVersionOf(f) < 6);
    assert.ok(!f.loci.some((l) => NEW.includes(l.id)), `${f.species.id} carries no new locus`);
    assert.ok(!f.absent.some((a) => NEW.includes(a.id)), `${f.species.id} lists no new absent line`);
  }
  for (const id of ["S17", "S18", "S19"]) { assert.equal(frameVersionOf(frameOf(id)), 6); assert.equal(frameOf(id).catalogue.version, 10); }
  assert.ok(inClan(LOCI.get("anatomy.tail-tip-bulb"), "C17") && inClan(LOCI.get("anatomy.tail-tip-bulb"), "C03") && !inClan(LOCI.get("anatomy.tail-tip-bulb"), "C05"));
  assert.equal(LOCI.get("anatomy.tail-tip-bulb").clan, "C03", "the record's clan is unchanged");
  assert.deepEqual(LOCI.get("growth.axial-tail-bend").alleles.map((a) => a.id), ["down", "up"], "no allele added to an old locus");
  assert.deepEqual(LOCI.get("appearance.fur-length").alleles.map((a) => a.value), [0.15, 0.3]);
  assert.ok(["anatomy.tail-curl-presence", "anatomy.fur-skirt-presence", "anatomy.brow-tuft-presence"].every((id) => PART_SWITCHES.has(id)));
});

test("the three species: working names, habitats, own plans' loci, every individual builds, parked species stay loadable", () => {
  assert.deepEqual(["S17", "S18", "S19"].map((id) => SPECIES.find((s) => s.id === id).name), ["Wickle", "Drapet", "Curlop"]);
  assert.deepEqual(["S17", "S18", "S19"].map((id) => SPECIES.find((s) => s.id === id).taxonomy.habitat), ["Reeds", "Boulders", "Ferns"]);
  assert.deepEqual(["C17", "C18", "C19"].map((c) => CLANS[c].number), [17, 18, 19]);
  for (const id of ["S17", "S18", "S19"]) { const f = frameOf(id); assert.equal(f.viability.constructed, f.viability.sampled); assert.equal(f.viability.crossedBuilt, f.viability.crossed); }
  const r = rng("fluffy"); for (const id of ["S17", "S18", "S19"]) for (let i = 0; i < 5; i++) assert.equal(buildIndividual(frameOf(id), sampleIndividual(frameOf(id), r)).validation.status, "valid");
  assert.deepEqual(PARKED, ["S05", "S06", "S07"]); assert.equal(ACTIVE_SPECIES.length, 16);
  for (const id of PARKED) { assert.equal(frameOf(id).species.parked, true); assert.equal(buildIndividual(frameOf(id), typeSpecimen(frameOf(id))).validation.status, "valid", "a save holding one still builds"); }
  assert.ok(!frames.filter((f) => !PARKED.includes(f.species.id)).some((f) => f.species.parked));
  assert.equal(new Set(Object.values(GLYPHS).map((g) => g.join(""))).size, 19);
});
