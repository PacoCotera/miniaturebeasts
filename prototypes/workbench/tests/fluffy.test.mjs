// Frame version 6, the fluffy species (design/proposals/genome-fluffy.md): each new grammar value, each change the design review asked for, and that nothing older moved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VALIDATED, LOCI, PART_SWITCHES, inClan, resolveCopies } from "../framework/catalogue.mjs";
import { planFacts, parsePlanKey, planCode } from "../framework/plans.mjs";
import { SPECIES, CLANS, specOf, PARKED, ACTIVE_SPECIES, GLYPHS } from "../framework/roster.mjs";
import { buildFrame, buildIndividual, typeSpecimen, sampleIndividual, rng, frameVersionOf, crossIndividuals, VOCAB } from "../framework/species.mjs";
import { validateBody } from "../framework/validate.mjs";
import { sweep, newNode } from "../framework/geometry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);
const NEW = VALIDATED.filter((l) => l.sinceFrame === 6).map((l) => l.id);
const sceneOf = (id, mutate) => { const g = typeSpecimen(frameOf(id)); if (mutate) mutate(g); return buildIndividual(frameOf(id), g); };
const OLD_KEYS = ["one|serial|bilateral|contact|zero|one|two|off|skin", "three|serial|bilateral|contact|zero|one|three|on|skin", "two|fan|radial|contact|zero|one|one|off|skin", "three|serial|bilateral|none|zero|one|two|off|skin", "one|serial|radial|none|zero|one|two|on|fur"];
const node = (scene, id) => scene.nodes.find((n) => n.id === id);
const box = (n) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const p of n.mesh.vertices) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } return { lo, hi }; };
const rowOf = (id, locus) => frameOf(id).loci.find((l) => l.id === locus);

test("(a) a mixed plan parses, reads as hind legs plus a free front pair with hands, prints B1·L2·arms and hops and walks upright", () => {
  const f = planFacts("one|serial|bilateral|mixed|one|two|one|off|fur", { join: "broad", upright: true });
  assert.equal(f.limbSet, "legs"); assert.equal(f.armSet, "arms"); assert.equal(f.posture, "upright"); assert.equal(f.code, "B1·L2·arms");
  assert.ok(f.states.includes("hop") && f.states.includes("walk"));
  assert.equal(f.values["appendage.arms"], true); assert.equal(f.extras.upright, true);
  for (const bad of ["one|serial|bilateral|mixed|two|two|one|off|fur", "one|serial|bilateral|mixed|one|two|two|off|fur", "one|serial|radial|mixed|one|two|one|off|fur", "one|fan|bilateral|mixed|one|two|one|off|fur"]) assert.throws(() => parsePlanKey(bad), /mixed/);
  assert.equal(planCode(parsePlanKey("one|serial|bilateral|mixed|one|two|one|off|fur")), "B1·L2·arms", "no bare B1 for a mixed print");
  assert.equal(frameOf("S19").plan.code, "B1·L2·arms"); assert.equal(frameOf("S19").taxonomy.planCode, "B1·L2·arms");
  const s = sceneOf("S19");
  assert.equal(s.scene.nodes.filter((n) => n.role === "hand").length, 2, "two palms");
  assert.equal(s.scene.nodes.filter((n) => n.role === "finger").length, 6, "three fingers each");
  assert.equal(s.scene.nodes.filter((n) => n.part?.startsWith("leg-")).length > 0, true, "and the hind legs");
  assert.ok(frameOf("S19").loci.some((l) => l.id === "growth.free-proximal-ratio" && l.kind === "locked"), "the arm's length is fixed per species");
});

test("(a) every older plan key parses and resolves as before: no arms, no upright, the same facts and codes", () => {
  for (const key of OLD_KEYS) { const f = planFacts(key, {}); assert.equal(f.armSet, undefined); assert.equal(f.extras.upright, undefined); assert.equal(f.values["appendage.arms"], undefined); assert.ok(["legs", "rays", "feelers", null].includes(f.limbSet)); }
  assert.equal(planFacts("two|serial|bilateral|contact|zero|one|two|off|fur", { join: "narrow" }).code, "B2·L4");
  assert.equal(planFacts("one|serial|bilateral|contact|zero|one|one|off|fur", { join: "broad", upright: true }).code, "B1·L2");
});

test("change 1: Wickle has feet: one pair under an upright body, hop and walk, no arms, its apron short enough that the feet show", () => {
  const f = frameOf("S17");
  assert.equal(f.plan.key, "one|serial|bilateral|contact|zero|one|one|off|fur"); assert.equal(f.plan.extras.upright, true);
  assert.equal(f.plan.limbSet, "legs"); assert.equal(f.plan.posture, "upright"); assert.equal(f.plan.armSet, undefined, "not mixed: the bumps at its sides are fur, not arms");
  assert.ok(f.taxonomy.states.includes("hop") && f.taxonomy.states.includes("walk"));
  const { scene, validation } = sceneOf("S17"); assert.equal(validation.status, "valid");
  const feet = scene.nodes.filter((n) => n.role === "contact-terminal"); assert.equal(feet.length, 2, "two feet");
  assert.equal(scene.nodes.filter((n) => n.role === "hand" || n.part?.startsWith("arm")).length, 0, "no arms");
  const sk = box(node(scene, "fur-skirt")); assert.equal(scene.furSkirt.floorLength, false, "the apron is short");
  assert.ok(sk.lo[2] > 1e-3, "its hem is off the floor");
  for (const foot of feet) assert.ok(box(foot).lo[2] < 1e-6 && box(foot).hi[2] > 0, "a foot stands on the floor");
  assert.ok(feet.every((foot) => box(foot).lo[2] < sk.lo[2]), "and reaches below the hem: the feet show");
  const d = rowOf("S17", "growth.fur-skirt-drop"); assert.equal(d.kind, "locked"); assert.ok(d.copies.every((c) => c === "knee"), "the apron's drop is locked at the knee end");
  for (const t of ["legs", "feet", "fur-hang"]) assert.ok(!f.chapters.some((c) => c.traits.some((x) => x.id === t)), `${t} is not open in Wickle`);
});

test("change 2: Drapet's plan is written into the note, short legs under a floor-length skirt: the drop is locked at its floor end and Hang is the flare alone", () => {
  const f = frameOf("S18");
  assert.equal(f.plan.key, "one|serial|bilateral|contact|zero|one|two|off|fur"); assert.equal(f.plan.extras.upright, undefined, "not upright");
  const note = readFileSync(path.resolve(here, "../../../design/proposals/genome-fluffy.md"), "utf8");
  assert.ok(note.includes("one|serial|bilateral|contact|zero|one|two|off|fur"), "the note carries Drapet's plan");
  assert.ok(note.includes("one|serial|bilateral|contact|zero|one|one|off|fur"), "and Wickle's");
  const d = rowOf("S18", "growth.fur-skirt-drop"); assert.equal(d.kind, "locked"); assert.ok(d.copies.every((c) => c === "floor"), "the drop is at its floor end");
  const hang = f.chapters.flatMap((c) => c.traits).find((t) => t.id === "fur-hang"); assert.deepEqual(hang.loci, ["growth.fur-skirt-flare"], "Hang is the flare alone");
  assert.ok(!VOCAB.some((t) => t[3].includes("growth.fur-skirt-drop")), "no trait opens the drop");
  const r = rng("drapet"); for (let i = 0; i < 40; i++) { const b = buildIndividual(f, sampleIndividual(f, r)); assert.equal(b.validation.status, "valid"); assert.equal(b.scene.furSkirt.floorLength, true); assert.equal(b.scene.furSkirt.hidesLegs, true, "four legs never show under the coat (a sheepdog)"); }
  const s = sceneOf("S18").scene; assert.equal(s.nodes.filter((n) => n.role === "contact-terminal").length, 4, "four short legs under it");
  const sk = box(node(s, "fur-skirt")); for (const foot of s.nodes.filter((n) => n.role === "contact-terminal")) assert.ok(box(foot).hi[0] <= sk.hi[0] && box(foot).hi[1] <= sk.hi[1] && box(foot).lo[1] >= sk.lo[1], "each foot lies inside the skirt's footprint");
});

test("change 3: the new records are branch records of C18 and C19 (the hand's size is owned by the arms), appended at the end under frame version 6; no species of another clan can pick them up", () => {
  const scopeOf = (id) => [LOCI.get(id).scope, LOCI.get(id).clan];
  for (const id of ["anatomy.tail-curl-presence", "growth.tail-curl-turn", "growth.tail-rise"]) assert.deepEqual(scopeOf(id), ["branch", "C19"], id);
  for (const id of ["anatomy.fur-skirt-presence", "growth.fur-skirt-drop", "growth.fur-skirt-flare", "anatomy.brow-tuft-presence", "growth.brow-tuft-length"]) assert.deepEqual(scopeOf(id), ["branch", "C18"], id);
  assert.equal(LOCI.get("growth.hand-size-ratio").owner, "arms");
  assert.deepEqual(VALIDATED.slice(-NEW.length).map((l) => l.id), NEW, "the new records are the last nine, appended");
  // a generated species of another clan, even at frame version 6, carries none of them and lists them as absent branch loci
  const spec = { ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 6, features: { ...specOf(SPECIES.find((s) => s.id === "S04")).features, "anatomy.tail-curl-presence": "on", "anatomy.fur-skirt-presence": "on", "anatomy.brow-tuft-presence": "on" } };
  const other = buildFrame(spec, { samples: 5 });
  for (const id of NEW.filter((i) => i !== "growth.hand-size-ratio")) { assert.ok(!other.loci.some((l) => l.id === id), `${id} is not carried by a C04 species`); assert.ok(other.absent.some((a) => a.id === id && /branch locus/.test(a.why)), `${id} is an absent branch locus there`); }
  const note = readFileSync(path.resolve(here, "../../../design/proposals/genome-fluffy.md"), "utf8");
  assert.ok(!/Any species may open the switch/.test(note), "the note no longer says any species may open the switch");
});

test("change 4: no record changes: the C03 bulb and the C01 belly records have no alsoIn, and the borrowing is a list on the species spec read where other clans' branch records are marked absent", () => {
  for (const l of VALIDATED) assert.ok(!Object.hasOwn(l, "alsoIn"), `${l.id} has no alsoIn`);
  assert.deepEqual(frameOf("S17").species.borrows, CLANS.C17.borrows); assert.deepEqual(frameOf("S19").species.borrows, CLANS.C19.borrows);
  assert.ok(frameOf("S17").species.borrows.includes("anatomy.tail-tip-bulb")); assert.ok(frameOf("S19").species.borrows.includes("appearance.belly-field"));
  assert.equal(frameOf("S18").species.borrows, undefined);
  for (const f of frames) for (const l of f.loci) { const x = LOCI.get(l.id); assert.ok(inClan(x, f.taxonomy.clan) || (f.species.borrows ?? []).includes(l.id), `${f.species.id} carries ${l.id} by clan or by a borrow`); }
  for (const f of frames.filter((x) => Number(x.species.id.slice(1)) <= 16)) assert.equal(f.species.borrows, undefined);
  assert.ok(!frameOf("S17").absent.some((a) => ["anatomy.tail-curl-presence", "growth.tail-rise", "anatomy.fur-skirt-presence", "anatomy.tail-tip-bulb"].includes(a.id)), "a borrowed record is carried, not absent");
  assert.ok(frameOf("S18").absent.some((a) => a.id === "anatomy.tail-curl-presence" && /C19 branch/.test(a.why)));
  assert.throws(() => buildFrame({ ...specOf(SPECIES.find((s) => s.id === "S17")), borrows: ["anatomy.contact-terminal-form"] }, { samples: 1 }), /not a branch record/, "only a branch record of another clan can be borrowed");
});

test("change 5: tail-rise is a pair-map of rear and crown, a choice locked per species, never open", () => {
  const l = LOCI.get("growth.tail-rise");
  assert.equal(l.operator, "pair-map"); assert.deepEqual(l.alleles.map((a) => a.id), ["rear", "crown"]);
  assert.equal(resolveCopies(l, ["rear", "rear"]), 0); assert.equal(resolveCopies(l, ["crown", "crown"]), 1); assert.equal(resolveCopies(l, ["crown", "rear"]), 0, "a mixed pair is the rear (never reached: the locus is locked)");
  for (const id of ["S17", "S19"]) assert.equal(rowOf(id, "growth.tail-rise").kind, "locked");
  assert.deepEqual(rowOf("S17", "growth.tail-rise").copies, ["crown", "crown"]); assert.deepEqual(rowOf("S19", "growth.tail-rise").copies, ["rear", "rear"]);
  for (const f of frames) assert.ok(!f.chapters.some((c) => c.traits.some((t) => t.loci.includes("growth.tail-rise"))), `${f.species.id}: no trait opens the root`);
});

test("changes 6 and 7: Wickle's curl is open over the full range, Curlop's is the tight half, and Curlop's hands are locked (no Hands in the vocabulary)", () => {
  const range = (id) => { const l = LOCI.get("growth.tail-curl-turn"), pool = rowOf(id, "growth.tail-curl-turn").alleles.map((a) => l.alleles.find((x) => x.id === a).value); return [Math.min(...pool), Math.max(...pool)]; };
  const all = LOCI.get("growth.tail-curl-turn").alleles.map((a) => a.value);
  assert.deepEqual(range("S17"), [Math.min(...all), Math.max(...all)], "Wickle: loose to tight");
  const [lo, hi] = range("S19"); assert.equal(hi, Math.max(...all)); assert.ok(lo >= (Math.min(...all) + Math.max(...all)) / 2 - 1e-9, "Curlop: the tight half");
  assert.notEqual(rowOf("S19", "growth.tail-curl-turn").kind, "locked"); assert.deepEqual(rowOf("S19", "growth.tail-curl-turn").typical?.map((a) => LOCI.get("growth.tail-curl-turn").alleles.find((x) => x.id === a).value).every((v) => v >= lo), true);
  const r = rng("curlop"); for (let i = 0; i < 30; i++) { const b = buildIndividual(frameOf("S19"), sampleIndividual(frameOf("S19"), r)); assert.equal(b.validation.status, "valid"); assert.ok(b.resolved.values["growth.tail-curl-turn"] >= lo - 1e-9, "never looser than the tight half"); }
  assert.equal(rowOf("S19", "growth.hand-size-ratio").kind, "locked"); assert.ok(!frameOf("S19").chapters.some((c) => c.traits.some((t) => t.id === "hands" || t.loci.includes("growth.hand-size-ratio"))));
  assert.ok(!VOCAB.some((t) => t[1] === "hands" || t[2] === "Hands"), "Hands is out of the vocabulary for now");
  assert.ok(frames.every((f) => !f.chapters.some((c) => c.traits.some((t) => t.loci.includes("growth.hand-size-ratio")))));
});

test("change 8: the arms are measured against the body's cross radius, drawn with a fixed plump factor, and rest as the stand shows: elbows down, forearms folded in, the hands meeting at the chest midline below the face", () => {
  const { scene } = sceneOf("S19"), body = node(scene, "region-0"), head = node(scene, "head");
  const across = Math.min(body.radii[0], body.radii[1]), height = body.radii[2];
  for (const side of ["L", "R"]) {
    const up = node(scene, `arm-0-${side}-upper`), lo = node(scene, `arm-0-${side}-lower`), hand = node(scene, `arm-0-${side}-hand`);
    // (the scene's body radii include the fur's depth, so the shares read a little under the rig's 0.21 and 0.55)
    assert.ok(up.sectionRadii[0] / across > 0.16 && up.sectionRadii[0] / across < 0.22, `${side}: the arm's thickness is a fixed plump share of the cross radius`);
    assert.ok(up.sectionRadii[0] < 0.17 * height, "not the thin arm a tall body's height would give");
    assert.ok(up.length / across > 0.42 && up.length / across < 0.58 && lo.length / across > 0.42 && lo.length / across < 0.58, "short links, about half the cross radius each");
    assert.ok(lo.root[2] < up.root[2] - 0.35 * up.length, "the elbow is down at the side");
    assert.ok(Math.abs(hand.center[1]) < 0.35 * across && Math.abs(hand.center[1]) > 0, "the hand is at the midline");
    assert.ok(hand.center[0] < body.center[0] - 0.55 * body.radii[0], "in front of the chest");
    assert.ok(hand.center[2] < head.center[2] - 0.8 * head.radii[2], "below the face");
    assert.ok(Math.abs(lo.end[1]) < Math.abs(lo.root[1]), "the forearm is folded in");
  }
  const yl = node(scene, "arm-0-L-hand").center[1], yr = node(scene, "arm-0-R-hand").center[1];
  assert.ok(yl < 0 && yr > 0 && yr - yl < 2.5 * node(scene, "arm-0-L-hand").radii[0], "the two hands meet: neither crosses the midline");
  // the arm follows the cross radius, not the height: a body of the same cross radius that is taller draws the same arm
  const arm = (g) => { const b = buildIndividual(frameOf("S19"), g).scene; const bd = node(b, "region-0"); return node(b, "arm-0-L-upper").sectionRadii[0] / Math.min(bd.radii[0], bd.radii[1]); };
  const r = rng("arms"), ratios = Array.from({ length: 6 }, () => arm(sampleIndividual(frameOf("S19"), r)));
  assert.ok(Math.max(...ratios) - Math.min(...ratios) < 0.03, "about the same share of the cross radius in every individual, whatever its height");
  // no new allele on a free-chain record, no new arm locus: the conventions reach the stand
  assert.deepEqual(LOCI.get("growth.free-radius-ratio").alleles.map((a) => a.id), ["fine", "thick"]);
  assert.deepEqual(LOCI.get("growth.free-proximal-ratio").alleles.map((a) => a.id), ["short", "long"]);
  assert.deepEqual(LOCI.get("growth.free-distal-ratio").alleles.map((a) => a.id), ["short", "long"]);
});

test("change 9: upright geometry: the head and eyes sit on the upper front face; the tail and plume curl in the sagittal plane, the tip rolling toward the head side; a brow tuft's tip stops above the eye's upper rim", () => {
  for (const id of ["S17", "S19"]) {
    const { scene } = sceneOf(id), body = node(scene, "region-0"), head = node(scene, "head"), top = box(body).hi[2];
    assert.ok(head.center[2] > body.center[2] && head.center[2] < top - 0.1 * head.radii[2], `${id}: the head is on the upper face, not on the top end`);
    assert.ok(head.center[0] < body.center[0] - 0.3 * body.radii[0], `${id}: and on the front (the head side is -X)`);
    for (const e of scene.nodes.filter((n) => n.role === "ocular-rim")) assert.ok(e.center[0] < head.center[0] - 0.3 * head.radii[0], `${id}: the eyes are on the head's front`);
    const tail = node(scene, "tail"); assert.ok(tail.stations.every((s) => Math.abs(s.center[1] - tail.root[1]) < 1e-9), `${id}: the curl stays in the sagittal plane (x, z)`);
    const last = tail.stations.at(-1), first = tail.stations[0];
    assert.ok(last.tangent[0] < 0, `${id}: the tip rolls toward the head side`);
    if (id === "S17") { assert.ok(tail.end[2] > head.center[2] + head.radii[2], "Wickle's plume rises above the face"); assert.ok(tail.end[0] < first.center[0] - 0.2 * tail.length, "and curls forward over it"); }
    else { assert.ok(last.tangent[2] > 0 || tail.end[2] > tail.stations[3].center[2], "Curlop's tip rolls up"); assert.ok(tail.end[0] < Math.max(...tail.stations.map((s) => s.center[0])) - 0.1 * tail.length, "toward the body"); }
  }
  // the brow guard, at the long end
  const f = frameOf("S18"), g = typeSpecimen(f); g.loci["growth.brow-tuft-length"] = ["long", "long"];
  for (const eyes of [["huge", "huge"], ["small", "small"]]) {
    g.loci["growth.exterior-eye-size-ratio"] = eyes;
    const b = buildIndividual(f, g), rim = Math.max(...b.scene.nodes.filter((n) => n.role === "ocular-rim").flatMap((n) => n.mesh.vertices.map((p) => p[2])));
    assert.equal(b.validation.status, "valid", b.validation.problems.join("; "));
    for (const t of b.scene.nodes.filter((n) => n.role === "brow-tuft" && n.id.endsWith("-2"))) assert.ok(t.end[2] >= rim, `a long tuft's tip stops above the eye's rim (${eyes[0]} eyes)`);
  }
  const ok = buildIndividual(f, g).scene; assert.deepEqual(validateBody(ok).problems, []);
  const bad = structuredClone(ok); const tuft = bad.nodes.find((n) => n.id === "brow-L-2"); tuft.end = [tuft.end[0], tuft.end[1], 0];
  assert.ok(validateBody(bad).problems.some((p) => /below the eye's upper rim/.test(p)), "a tuft that falls below the rim is a body that does not build");
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
  const s18 = sceneOf("S18").scene, sk18 = s18.nodes.find((n) => n.id === "fur-skirt"); assert.ok(sk18, "S18 has a skirt"); assert.ok(Math.min(...sk18.mesh.vertices.map((p) => p[2])) < 1e-6 + 0.0001, "S18: the hem is on the floor"); assert.equal(s18.furSkirt.floorLength, true);
  const s17 = sceneOf("S17").scene; assert.ok(s17.nodes.some((n) => n.id === "fur-skirt")); assert.equal(s17.furSkirt.floorLength, false, "Wickle's is the short apron");
  assert.ok(!frames.filter((f) => !["S17", "S18"].includes(f.species.id)).some((f) => f.loci.some((l) => l.id === "anatomy.fur-skirt-presence")));
  const sc = JSON.parse(JSON.stringify({ furSkirt: { floorLength: true, hidesLegs: false }, nodes: [], edges: [] }));
  assert.ok(validateBody(sc).problems.includes("fur skirt at floor length does not cover the legs"));
  // a skirt on legs: S19 with the skirt borrowed and switched on in a test spec covers its feet at floor length
  const spec = specOf(SPECIES.find((s) => s.id === "S19"));
  const legged = buildFrame({ ...spec, features: { ...spec.features, "anatomy.fur-skirt-presence": "on" }, borrows: [...spec.borrows, "anatomy.fur-skirt-presence", "growth.fur-skirt-drop", "growth.fur-skirt-flare"], fixed: { ...spec.fixed, "growth.fur-skirt-drop": "floor" }, open: null }, { samples: 10 });
  const b = buildIndividual(legged, typeSpecimen(legged));
  assert.equal(b.validation.status, "valid"); assert.equal(b.scene.furSkirt.hidesLegs, true, "the hem's footprint takes in both feet");
  assert.ok(legged.loci.some((l) => l.id === "growth.fur-skirt-drop"));
});

test("(d) brow tufts: Drapet has them locked on with the length open; a species of the clan may open the switch and then the part sleeps when it is off", () => {
  assert.ok(sceneOf("S18").scene.nodes.some((n) => n.role === "brow-tuft"));
  assert.ok(!sceneOf("S17").scene.nodes.some((n) => n.role === "brow-tuft"));
  const f = frameOf("S18"); assert.equal(f.loci.find((l) => l.id === "anatomy.brow-tuft-presence").kind, "locked"); assert.notEqual(f.loci.find((l) => l.id === "growth.brow-tuft-length").kind, "locked");
  const spec = specOf(SPECIES.find((s) => s.id === "S18"));
  const open = buildFrame({ ...spec, open: [{ trait: "colour" }, { chapter: "face", id: "brows", name: "Brows", loci: ["anatomy.brow-tuft-presence", "growth.brow-tuft-length"], looks: ["bare", "tassels"] }] }, { samples: 20 });
  const row = open.loci.find((l) => l.id === "anatomy.brow-tuft-presence"); assert.notEqual(row.kind, "locked");
  const g = typeSpecimen(open); g.loci["anatomy.brow-tuft-presence"] = ["off", "off"];
  assert.ok(!buildIndividual(open, g).scene.nodes.some((n) => n.role === "brow-tuft"), "off: no tufts");
});

test("backward compatibility: no old frame lists or carries a new record, the records are new and appended, and the pin is unchanged", () => {
  assert.equal(NEW.length, 9);
  assert.ok(NEW.every((id) => LOCI.get(id).sinceFrame === 6));
  for (const f of frames.filter((x) => Number(x.species.id.slice(1)) <= 16)) {
    assert.ok(frameVersionOf(f) < 6);
    assert.ok(!f.loci.some((l) => NEW.includes(l.id)), `${f.species.id} carries no new locus`);
    assert.ok(!f.absent.some((a) => NEW.includes(a.id)), `${f.species.id} lists no new absent line`);
  }
  for (const id of ["S17", "S18", "S19"]) { assert.equal(frameVersionOf(frameOf(id)), 6); assert.equal(frameOf(id).catalogue.version, 10); }
  assert.equal(LOCI.get("anatomy.tail-tip-bulb").clan, "C03", "the C03 record is exactly as it was");
  assert.deepEqual(Object.keys(LOCI.get("anatomy.tail-tip-bulb")).sort(), ["alleles", "applicability", "bounds", "clan", "consumer", "family", "id", "label", "nature", "operator", "owner", "provenance", "requires", "scope", "status", "switch", "target", "units", "version"].sort());
  assert.deepEqual(LOCI.get("growth.axial-tail-bend").alleles.map((a) => a.id), ["down", "up"], "no allele added to an old locus");
  assert.deepEqual(LOCI.get("appearance.fur-length").alleles.map((a) => a.value), [0.15, 0.3]);
  assert.ok(["anatomy.tail-curl-presence", "anatomy.fur-skirt-presence", "anatomy.brow-tuft-presence"].every((id) => PART_SWITCHES.has(id)));
  const note = readFileSync(path.resolve(here, "../../../design/proposals/genome-fluffy.md"), "utf8");
  assert.ok(/appended/.test(note) && /frame version 6/.test(note), "the note says the records are appended and known by frame version 6");
});

test("parked species: the frames stay loadable and a parked mibi already in a save can still be crossed with another of its kind", () => {
  for (const id of PARKED) {
    const f = frameOf(id); assert.equal(f.species.parked, true);
    const r = rng(`park-${id}`), a = sampleIndividual(f, r), b = sampleIndividual(f, r);
    const child = crossIndividuals(f, { id: 1, genome: a }, { id: 2, genome: b }, r);
    assert.equal(buildIndividual(f, child).validation.status, "valid", `${id}: a cross of two parked mibis builds`);
  }
  const note = readFileSync(path.resolve(here, "../../../design/proposals/genome-fluffy.md"), "utf8");
  assert.ok(/parked mibis already in a save can still be crossed with each other/i.test(note), "the note says so (no pods, no wild ones)");
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
