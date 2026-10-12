// Fix 1b part 2: the founder's unread treatment is keyed on the chapter (art.mjs UNREAD_REGION, treatmentOf), not on a trait's name; Glow and Charge change what is drawn, never the genome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UNREAD_REGION, treatmentOf, builtOf } from "../src/art.mjs";
import { typeSpecimen, genomeDigest } from "../../workbench/framework/species.mjs";
import { fitCamera } from "../../workbench/framework/raster.mjs";

const frames = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
const frameOf = (s) => JSON.parse(readFileSync(path.join(frames, `species-${s}.json`), "utf8"));
const allBut = (fr, ...ids) => fr.chapters.map((c) => c.id).filter((id) => !ids.includes(id));
const view = (fr) => { const b = builtOf(fr, typeSpecimen(fr)); return { scene: b.scene, camera: fitCamera(b.scene, "portrait", [300, 310], 0.06) }; };

test("the table names every chapter of every frame, and an unknown chapter throws", () => {
  for (const s of ["S01", "S03", "S09", "S13", "S14", "S15", "S16"]) for (const c of frameOf(s).chapters) assert.ok(c.id in UNREAD_REGION, `${s} ${c.id}`);
  const fr = frameOf("S01");
  assert.throws(() => treatmentOf({ ...fr, chapters: [...fr.chapters, { id: "bogus", traits: [] }] }, ["coat"]), /bogus/);
  assert.throws(() => treatmentOf(fr, ["coat", "bogus"]), /bogus/);
});

test("nothing read is a ghost; everything read is clear", () => {
  const fr = frameOf("S15");
  assert.deepEqual(treatmentOf(fr, []), { mode: "ghost", boxes: [] });
  assert.deepEqual(treatmentOf(fr, new Set(allBut(fr))), { mode: "clear", boxes: [] });
});

test("Movement, Stamina, Character, Glow and Charge unread draw nothing: clear (Movement traits draw nothing)", () => {
  for (const [s, ids] of [["S15", ["movement"]], ["S13", ["movement", "stamina", "character"]], ["S16", ["glow", "charge", "character"]]]) {
    const fr = frameOf(s); assert.deepEqual(treatmentOf(fr, allBut(fr, ...ids)), { mode: "clear", boxes: [] }, s);
  }
});

test("S13's wing-cases are Shape: unread Shape veils the whole body", () => {
  const fr = frameOf("S13"); assert.ok(fr.chapters.find((c) => c.id === "shape").traits.some((t) => t.id === "wing-cases"));
  assert.deepEqual(treatmentOf(fr, allBut(fr, "shape"), view(fr)).boxes.map((b) => b.whole), [true]);
  assert.equal(treatmentOf(fr, allBut(fr, "shape")).mode, "veil");
});

test("S15's rays are the leg group, its tail is the tail group; S14's skirt and S15's leaves are Shape, the whole body", () => {
  const s15 = frameOf("S15"), t = treatmentOf(s15, allBut(s15, "legs-tail"), view(s15));
  assert.equal(t.mode, "veil"); assert.deepEqual(t.boxes.map((b) => b.parts), [["leg", "ray"], ["tail"]]);
  const rays = t.boxes[0]; assert.equal(rays.whole, false, "the rays are not the whole body"); assert.ok(rays.x1 > rays.x0 && rays.y1 > rays.y0);
  assert.deepEqual(treatmentOf(s15, allBut(s15, "shape")).boxes, [{ whole: true }], "S15 leaves");
  const s14 = frameOf("S14"); assert.ok(s14.chapters.find((c) => c.id === "shape").traits.some((x) => x.id === "skirt"));
  assert.deepEqual(treatmentOf(s14, allBut(s14, "shape")).boxes, [{ whole: true }], "S14 skirt");
  const sc = view(s14).scene, skirt = sc.nodes.find((n) => n.id === "foot-skirt");
  assert.ok(skirt && !["leg", "ray"].some((q) => (skirt.part ?? skirt.id) === q || (skirt.part ?? skirt.id).startsWith(q + "-")), "the foot-skirt is not in the leg group");
});

test("Coat or Shape unread wins over the groups; Face is one group; the groups of several unread chapters are a union", () => {
  const fr = frameOf("S09");
  assert.deepEqual(treatmentOf(fr, allBut(fr, "coat", "face")).boxes, [{ whole: true }]);
  assert.deepEqual(treatmentOf(fr, allBut(fr, "face")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0]]);
  assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0], ["leg", "ray"], ["tail"]]);
});

test("Glow unread draws emission at none and Charge unread phase at solid; read, the mibi's own value; the genome is not changed", () => {
  const fr = frameOf("S16"), g = typeSpecimen(fr), digest = genomeDigest(g), own = builtOf(fr, g).resolved.values, all = fr.chapters.map((c) => c.id);
  assert.equal(builtOf(fr, g, all), builtOf(fr, g), "all read: the mibi's own build");
  const veiled = builtOf(fr, g, allBut(fr, "glow", "charge")).resolved.values;
  assert.equal(veiled["appearance.emission-brightness"], 0); assert.equal(veiled["physiology.phase"], 0.2);
  assert.ok(own["appearance.emission-brightness"] > 0 && own["physiology.phase"] !== undefined);
  assert.equal(builtOf(fr, g, allBut(fr, "glow")).resolved.values["physiology.phase"], own["physiology.phase"], "Charge read: its own phase");
  assert.equal(builtOf(fr, g, allBut(fr, "charge")).resolved.values["appearance.emission-brightness"], own["appearance.emission-brightness"], "Glow read: its own emission");
  assert.equal(genomeDigest(g), digest);
});
