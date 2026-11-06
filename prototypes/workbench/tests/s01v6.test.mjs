// The Loika at frame version 6 (art director, 2026-11-03, ad-ears.md): every Loika has ears, round, upright, set on the side and as wide as 0.8 of their length; the length is heritable (small 0.45,
// short 0.60 the type, medium 0.75 of the head's half height). The ear switch is the head's, locked on, not heritable. Versions 4 and 5 stay exactly what they were: their frames are rebuilt here
// from the roster and match the bytes the registry held, and their renders match the hashes taken before the change. A cross between two different frame versions is refused, never a crash.
//   node --test tests/s01v6.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI, resolveCopies } from "../framework/catalogue.mjs";
import { SPECIES, specOf } from "../framework/roster.mjs";
import { buildFrame, buildIndividual, sampleIndividual, typeSpecimen, checkGenome, rng, frameVersionOf } from "../framework/species.mjs";
import { cross, shedPod } from "../framework/cross.mjs";
import { plainRender } from "../framework/plain.mjs";
import { fitCamera, frameCamera } from "../framework/raster.mjs";

const framesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frames");
const loika = JSON.parse(readFileSync(path.join(framesDir, "species-S01.json"), "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const LEN = "growth.auricular-length-ratio", EARS = ["anatomy.auricular-presence", "anatomy.auricular-form", LEN, "anatomy.ear-tilt", "growth.auricular-width-ratio", "growth.auricular-set-ratio"];
const row = (f, id) => f.loci.find((l) => l.id === id);
const earLength = (g, f = loika) => buildIndividual(f, g).resolved.values["ears.lengthOverHeadRz"];
const withLength = (g, a, b = a) => ({ ...g, loci: { ...g.loci, [LEN]: [a, b] } });
const earNodes = (g, f = loika) => buildIndividual(f, g).scene.nodes.filter((n) => n.role === "auricular-sheet");

// Frames 5 and 4 as the roster built them, rebuilt from the version-6 row by taking the changes away (the same builder, the same 200 samples).
const strip = (o, ks) => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));
function rebuilt(version) {
  const spec = specOf(SPECIES.find((s) => s.id === "S01"));
  let s = { ...spec, frameVersion: 5, features: strip(spec.features, ["anatomy.auricular-presence"]), fixed: strip(spec.fixed, EARS.filter((id) => id !== LEN && id !== "anatomy.auricular-presence")),
    typical: strip(spec.typical, [LEN]), open: spec.open.filter((o) => o.id !== "ears"), species: undefined };
  delete s.species;
  s.summary = spec.summary.replace(/ Frame version 6 \(art director.*$/, "");
  if (version === 4) {
    s = { ...s, summary: s.summary.replace(/ Frame version 5 \(owner.*$/, ""), fixed: { ...s.fixed, "growth.crown-height-ratio": "high" },
      typical: strip(s.typical, ["growth.crown-height-ratio", "growth.crest-leaf-count", "anatomy.crown-form"]),
      open: s.open.map((o) => (o.id === "crown" ? { chapter: "face", id: "crown", name: "Crown", loci: ["anatomy.crown-presence"], looks: ["bare head", "leaf crest"] } : o)) };
    delete s.frameVersion;
  }
  const f = buildFrame(s, { samples: 200 });
  f.taxonomy.seed = spec.seed; f.taxonomy.lockedByCheck = []; f.taxonomy.attemptsRejected = [];
  return f;
}
const f5 = rebuilt(5), f4 = rebuilt(4);
const bytes = (f) => JSON.stringify(f, null, 1) + "\n";

// sha256 (first 16 hex) of the version-4 and version-5 frame files as the registry builds them (retaken once at the merge onto catalogue 12: the header names pin 12 and its digest; the renders below did not move), and of the plain renders of the type and the pods of seeds 1 to 12 (the Station's pod
// draw) at 96 px (companion) and 48 px (tile), taken from the tree before the change.
const FRAME_BYTES = { 4: "32965bf4262729d1", 5: "0a130364de7ca957" };
const RENDERS = {
  4: { "1": "9daeeb697588a3de/0139e1d5c34572f7", "2": "e833dc6aed50f670/4898f463b9fe7d82", "3": "6d4728ab48c474bb/9dcd7ed2e8493e35", "4": "00c00ce1900019a8/5f76ed4c474db394", "5": "3564444a9cad5efd/75a3f1f10aa6f100", "6": "3ec020c1da5b5cc8/2493f719a1f121af", "7": "0bceff52722631ac/f922ddd0e9e7a7b3", "8": "f90030404472df0b/89a9c8ea661ec210", "9": "b8c9099ed9cde4e2/8c7b66addc1ffff0", "10": "ef49ceea67726edb/45ecd50804d15c6f", "11": "5094141750c8fc13/3ad1a6f099e386c5", "12": "1b006e8f3059b6a2/fc9c75ee1f4c972d", type: "8fc9bc9592c1a747/98875ee001032825" },
  5: { "1": "9daeeb697588a3de/0139e1d5c34572f7", "2": "c99995be3111684c/33a933df652f5da1", "3": "5f2099674d55a9a3/c5014dcc37e81e8a", "4": "fd9547b4e6ba91ef/ad18f29c2b8945ac", "5": "48f14d64e53446c3/370f799ca43bd745", "6": "2b7d912152922986/9feeebc974067ca5", "7": "0bceff52722631ac/f922ddd0e9e7a7b3", "8": "0b0a0bbbfb9366f9/28b7b6a72de3a90d", "9": "30a5846d5c253b1c/ee494ea94e56168b", "10": "545e05381a268227/3bb46ef52c18bf20", "11": "c7b3d66e4d03f436/82c1ad98b2f20d82", "12": "52fb2102b689838d/f116d3d1ca09db4d", type: "8fc9bc9592c1a747/98875ee001032825" },
};
function pod(frame, gs) {   // the Station's podGenome
  const r = rng(`pod:${frame.species.id}:${gs >>> 0}`); let g = null;
  for (let i = 0; i < 24; i++) { g = sampleIndividual(frame, r, { kind: "pod", seed: gs >>> 0 }); if (checkGenome(frame, g).length) continue; try { if (buildIndividual(frame, g).validation.status === "valid") return g; } catch { /* the next draw */ } }
  return g;
}
const renderHashes = (frame) => {
  const ref = buildIndividual(frame, typeSpecimen(frame)).scene, cams = [frameCamera(ref, "portrait", [96, 96]), { ...fitCamera(ref, "portrait", [48, 48], 0.04), fixed: true }];
  const one = (g) => { const sc = buildIndividual(frame, g).scene; return sha(Buffer.from(plainRender(sc, cams[0], { device: "companion" }).data)) + "/" + sha(Buffer.from(plainRender(sc, cams[1], { device: "tile" }).data)); };
  return { ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), one(pod(frame, i + 1))])), type: one(typeSpecimen(frame)) };
};

test("the Loika is at frame version 6: the ears are the head's, locked on and not heritable; form, tilt, width and set are locked; only the length is open, with the AD's three alleles, in the Face chapter", () => {
  assert.equal(frameVersionOf(loika), 6);
  const on = row(loika, "anatomy.auricular-presence"); assert.equal(on.kind, "locked"); assert.deepEqual(on.copies, ["on", "on"]);
  for (const [id, v] of [["anatomy.auricular-form", "rounded"], ["anatomy.ear-tilt", "upright"], ["growth.auricular-width-ratio", "broad"], ["growth.auricular-set-ratio", "side"]]) { const r = row(loika, id); assert.equal(r.kind, "locked", id); assert.deepEqual(r.copies, [v, v], id); }
  const len = row(loika, LEN); assert.equal(len.kind, "heritable-look"); assert.deepEqual(len.alleles, ["small", "short", "medium"]); assert.equal(len.chapter, "face"); assert.equal(len.trait, "ears");
  const t = loika.chapters.find((c) => c.id === "face").traits.find((x) => x.id === "ears"); assert.deepEqual(t.loci, [LEN]); assert.deepEqual(t.looks, ["small ears", "between", "larger ears"]);
  assert.deepEqual(typeSpecimen(loika).loci[LEN], ["short", "short"], "the type is the catalogue's short");
  assert.ok(EARS.every((id) => !loika.absent.some((a) => a.id === id)), "none of the ear records is absent from a Loika");
  assert.deepEqual(loika.chapters.flatMap((c) => c.traits).filter((x) => x.loci.includes("anatomy.auricular-presence")), [], "the ear switch is in no trait: nothing about it is heritable");
});

test("the band: small 0.45, short 0.60 (the type), medium 0.75; a low and a high copy make the type; width is 0.8 of the length and the set is 0.78, so the ear is one shape at every size", () => {
  const typ = typeSpecimen(loika), v = (a, b) => earLength(withLength(typ, a, b));
  assert.equal(v("small"), 0.45); assert.equal(v("short"), 0.6); assert.equal(v("medium"), 0.75);
  assert.ok(Math.abs(v("small", "medium") - 0.6) < 1e-12, "a cross of low and high gives the type");
  assert.equal(LOCI.get(LEN).alleles.find((a) => a.id === "small").sinceFrame, 6); assert.equal(LOCI.get(LEN).alleles.find((a) => a.id === "medium").sinceFrame, 6);
  for (const a of ["small", "short", "medium"]) { const { values } = buildIndividual(loika, withLength(typ, a)).resolved; assert.equal(values["growth.auricular-width-ratio"], 0.8); assert.equal(values["growth.auricular-set-ratio"], 0.78); assert.equal(values["anatomy.ear-tilt"], "upright"); assert.equal(values["ears.form"], "rounded"); }
  // the same shape at every size: the ear's extent in each axis scales with the length
  const extent = (a) => { const n = earNodes(withLength(typ, a))[0], xs = [0, 1, 2].map((k) => n.mesh.vertices.map((p) => p[k])); return xs.map((c) => Math.max(...c) - Math.min(...c)); };
  const lo = extent("small"), hi = extent("medium");
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(hi[k] / lo[k] - 0.75 / 0.45) < 0.03, `axis ${k}: ${(hi[k] / lo[k]).toFixed(3)}`);
});

test("every version-6 Loika has two ears whose length is one of the band: drawn individuals, crossed children and shed pods, all building", () => {
  const r = rng("s01v6-ears"), all = [typeSpecimen(loika)];
  for (let i = 0; i < 120; i++) all.push(sampleIndividual(loika, r));
  const a = sampleIndividual(loika, r), b = sampleIndividual(loika, r);
  for (let i = 0; i < 60; i++) all.push(cross(loika, { id: 1, genome: a }, { id: 2, genome: b }, { rng: r, kinship: 0 }));
  for (let i = 0; i < 20; i++) { const p = shedPod(loika, { id: 3, genome: a }, { rng: r }); if (p) all.push(p); }
  const seen = new Set();
  for (const g of all) {
    assert.equal(g.frameVersion, 6); assert.deepEqual(checkGenome(loika, g), []);
    const b6 = buildIndividual(loika, g); assert.equal(b6.validation.status, "valid");
    assert.equal(b6.scene.nodes.filter((n) => n.role === "auricular-sheet").length, 2, "two ears");
    const len = b6.resolved.values["ears.lengthOverHeadRz"]; assert.ok(len >= 0.45 - 1e-9 && len <= 0.75 + 1e-9, `length ${len}`); seen.add(Math.round(len * 20) / 20);
  }
  assert.ok([0.45, 0.6, 0.75].every((x) => seen.has(x)), `all three ends occur: ${[...seen]}`);
});

test("from frame version 6 the ear roots a little behind the crest's side leaves; an earlier frame keeps the root level with them (the drawing change reads the frame's version)", () => {
  const typ = typeSpecimen(loika), root = (f) => { const sc = buildIndividual(f, typ).scene; return { ear: sc.nodes.find((n) => n.id === "ear-R").attachment.position[0], leaf: sc.nodes.find((n) => n.id === "crown-R").attachment.position[0] }; };
  const now = root(loika), old = root({ ...loika, frameVersion: 5 });
  assert.ok(now.ear > now.leaf + 0.01, `version 6: the ear root x ${now.ear.toFixed(3)} is behind the leaf's ${now.leaf.toFixed(3)} (+x is back)`);
  assert.ok(old.ear < now.ear - 0.01, "version 5 drew it further forward");
  assert.equal(old.leaf, now.leaf, "the crest does not move");
});

test("the crown is as it was in version 5: its low end is 0.45, its pool and its form", () => {
  const h = row(loika, "growth.crown-height-ratio"); assert.deepEqual(h.alleles, ["low", "high"]);
  assert.equal(earLength(typeSpecimen(loika)), 0.6);
  const g = { ...typeSpecimen(loika), loci: { ...typeSpecimen(loika).loci, "anatomy.crown-presence": ["on", "on"], "growth.crown-height-ratio": ["low", "low"] } };
  assert.equal(buildIndividual(loika, g).resolved.values["crown.heightOverHeadRz"], 0.45);
});

test("versions 4 and 5 are exactly what they were: their frames rebuild to the bytes the registry held, and their plain renders of the type and the pods of seeds 1 to 12 match the hashes taken before", () => {
  assert.equal(frameVersionOf(f5), 5); assert.equal(frameVersionOf(f4), 4);
  assert.equal(sha(bytes(f5)), FRAME_BYTES[5], "the version-5 frame file is the same bytes");
  assert.equal(sha(bytes(f4)), FRAME_BYTES[4], "the version-4 frame file is the same bytes");
  assert.ok(f5.loci.length === 50 && f4.loci.length === 50 && loika.loci.length === 56, "the version-6 Loika carries the six ear records the older two do not");
  assert.deepEqual(renderHashes(f5), RENDERS[5]); assert.deepEqual(renderHashes(f4), RENDERS[4]);
});

// ---- crosses between frame versions ----
const ids = (f) => f.loci.map((l) => l.id);
test("a cross between different frame versions is refused with a readable reason, never a crash: 4 x 5, 4 x 6 and 5 x 6, in both orders and under any of the frames", () => {
  const g = { 4: sampleIndividual(f4, rng("x4")), 5: sampleIndividual(f5, rng("x5")), 6: sampleIndividual(loika, rng("x6")) }, frames = { 4: f4, 5: f5, 6: loika };
  assert.deepEqual([g[4].frameVersion, g[5].frameVersion, g[6].frameVersion], [4, 5, 6]);
  assert.ok(ids(loika).some((id) => !ids(f5).includes(id)), "version 6 carries loci the older genomes lack: the draw used to read them");
  for (const [x, y] of [[4, 5], [4, 6], [5, 6]]) for (const [p, q] of [[x, y], [y, x]]) for (const fv of [4, 5, 6]) {
    const run = () => cross(frames[fv], { id: 1, genome: g[p] }, { id: 2, genome: g[q] }, { rng: rng("c"), kinship: 0 });
    assert.throws(run, (e) => e instanceof Error && !(e instanceof TypeError) && e.message.includes(`born on frame version ${p}`) && e.message.includes(`version ${q}`) && /same version/.test(e.message), `${p} x ${q} under frame ${fv}`);
  }
  assert.throws(() => cross(loika, { id: 1, genome: g[4] }, { id: 2, genome: sampleIndividual(f4, rng("x4b")) }), /frame version 4, which lacks 6 loci/, "naming the loci the genome lacks");
});

test("a shed pod of a parent that lacks the frame's loci is refused in words; a same-version cross still works, and a genome that carries every locus still sheds as before", () => {
  const old = sampleIndividual(f5, rng("shed5"));
  assert.throws(() => shedPod(loika, { id: 1, genome: old }, { rng: rng("s") }), /frame version 5, which lacks 6 loci/);
  const a = sampleIndividual(loika, rng("a6")), b = sampleIndividual(loika, rng("b6"));
  const kid = cross(loika, { id: 1, genome: a }, { id: 2, genome: b }, { rng: rng("k"), kinship: 0 }); assert.equal(kid.frameVersion, 6); assert.deepEqual(checkGenome(loika, kid), []);
  assert.ok(shedPod(loika, { id: 3, genome: a }, { rng: rng("s6") }), "a version-6 parent sheds");
});

test("from frame version 6 the near ear is rooted low and back, turned 35 degrees, and both ears have a body of 0.22 of their length; version 5 keeps the thin sheet at 45 degrees", () => {
  const typ = typeSpecimen(loika), thick = (f) => { const n = buildIndividual(f, typ).scene.nodes.find((x) => x.id === "ear-L"), zs = n.mesh.vertices; const len = 1.3 * 0.6 * buildIndividual(f, typ).scene.nodes.find((x) => x.id.includes("head") && x.radii).radii[2]; return { n, len }; };
  const six = thick(loika), five = thick({ ...loika, frameVersion: 5 });
  const bbox = (n) => [0, 1, 2].map((k) => { const c = n.mesh.vertices.map((p) => p[k]); return Math.max(...c) - Math.min(...c); });
  assert.notDeepEqual(bbox(six.n), bbox(five.n), "the ear's body and plane differ from version 5");
  const sc6 = buildIndividual(loika, typ).scene, root = sc6.nodes.find((n) => n.id === "ear-R").attachment.position, hd = sc6.nodes.find((n) => n.id.includes("head") && n.radii);
  assert.ok(root[0] > hd.center[0] + 0.2 * hd.radii[0], "rooted behind the head's middle");
  assert.ok(root[2] - hd.center[2] < 0.5 * hd.radii[2], "and low on its side");
});
