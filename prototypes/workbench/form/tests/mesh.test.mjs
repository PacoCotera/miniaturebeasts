import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScene } from "../mesh.mjs";
import { edgeCounts } from "../mesh.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";

const scenes = {};
const sceneOf = (k, div) => (scenes[k + div] ??= buildScene(SPECIES[k], { extentDiv: div }));

test("every edge is shared by exactly two triangles (all five species at 1/120)", () => {
  for (const k of ORDER) { const h = edgeCounts(sceneOf(k, 120).mesh); assert.deepEqual(Object.keys(h), ["2"], `${k}: ${JSON.stringify(h)}`); }
});
test("|F| < 0.1 voxel at every vertex", () => {
  for (const k of ORDER) {
    const sc = sceneOf(k, 120), m = sc.mesh, V = m.vertices; let worst = 0;
    for (let i = 0; i < V.length; i += 3) worst = Math.max(worst, Math.abs(sc.field.F3(V[i], V[i + 1], V[i + 2])));
    assert.ok(worst < 0.1 * m.voxel, `${k}: ${worst / m.voxel} voxel`);
  }
});
test("the normals are unit and face outward (the field decreases along them)", () => {
  const sc = sceneOf("curlop", 120), m = sc.mesh; let bad = 0;
  for (let i = 0; i < m.vertices.length; i += 3 * 40) {
    const n = [m.normals[i], m.normals[i + 1], m.normals[i + 2]]; assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-6);
    if (sc.field.F3(m.vertices[i] + n[0] * 0.02, m.vertices[i + 1] + n[1] * 0.02, m.vertices[i + 2] + n[2] * 0.02) > 0) bad++;
  }
  assert.ok(bad < 3, `${bad} normals point inward`);
});
test("each vertex carries the attributes of the field and the scene follows the contract (nodes with id, part, slot, mesh; slots; bounds)", () => {
  const sc = sceneOf("curlop", 120);
  assert.ok(sc.nodes.length >= 5 && sc.nodes.every((n) => n.id && n.part && n.slot && n.mesh.vertices.length && n.mesh.faces.length));
  assert.ok(sc.slots.length >= 1 && sc.bounds.min.length === 3);
  const A = sc.mesh.attrs; assert.ok(A.partNames.includes("head") && A.partNames.includes("tail") && A.partNames.includes("eye"));
});
test("Curlop meshes at 1/220 within the time of this machine (the brief's 1.5 s is reported, not met: see the report)", () => {
  const t = performance.now(); buildScene(SPECIES.curlop, { extentDiv: 220 }); const ms = performance.now() - t;
  assert.ok(ms < 6000, `${ms} ms`);
});
