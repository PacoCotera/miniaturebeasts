import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { faceParams, applyClamps } from "../../form/house/clamps.mjs";
import { buildHead, findFront } from "../head.mjs";
import { gradient } from "../sdf.mjs";

const house = loadHouseFile();
const kinds = { head: "soft-block", eye: "round", muzzle: "button", nose: "mound", mouth: "smile" };
const build = (t = 0.5, plan = "A", k = kinds) => { const { fp } = applyClamps(house, plan, faceParams(house, plan, (g) => (typeof t === "function" ? t(g) : t))); return { fp, head: buildHead(house, plan, k, fp) }; };

test("the head is a closed solid: negative at the centre, positive far out, the crown at 0.5 H", () => {
  const { head } = build();
  assert.ok(head.d(0, 0, 0) < -0.3);
  assert.ok(head.d(3, 0, 0) > 1);
  const top = findFront((x, y, z) => head.d(0, y, z), 0, 0, 0, 1.0), ztop = (() => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (head.d(0, 0, m) < 0) a = m; else b = m; } return a; })();
  assert.ok(Math.abs(ztop - 0.5) < 0.01, `crown at ${ztop}`);
});
test("the eyes sit on K's analytic surface, in the face frame, mirrored", () => {
  const { head } = build();
  const [L, R] = head.eyes;
  assert.ok(Math.abs(head.dK(...L.c)) < 1e-3 && Math.abs(head.dK(...R.c)) < 1e-3);
  assert.ok(Math.abs(L.c[1] + R.c[1]) < 1e-12 && L.c[0] === R.c[0] && L.c[2] === R.c[2], "same height and depth, mirrored in y");
  assert.ok(Math.abs(2 * L.c[1] - head.measures.spacing * head.measures.E) < 1e-9, "the spacing is the distance between the centres, in E");
  assert.ok(L.n[0] > 0.5 && Math.abs(L.lat[0] * L.n[0] + L.lat[1] * L.n[1] + L.lat[2] * L.n[2]) < 1e-9);
});
test("the eye socket is carved: the surface at the eye's centre lies inside the skull's by the socket depth, and a brow remains above", () => {
  const { head } = build();
  const e = head.eyes[0], depth = house.rig.face["socket-depth"];
  // along the eye's normal: the carved head's surface is `depth` under K's
  let a = -0.2, b = 0.3; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (head.d(e.c[0] + e.n[0] * m, e.c[1] + e.n[1] * m, e.c[2] + e.n[2] * m) < 0) a = m; else b = m; }
  assert.ok(Math.abs(a + depth) < 0.012, `the floor is at ${a.toFixed(4)}, depth ${depth}`);
  // away from the socket the skin is K's own
  const far = [0.0, 0.45, 0.0]; assert.ok(Math.abs(head.d(...far) - head.dK(...far)) < 1e-6);
});
test("the mouth is a crease cut under the nose, never a ridge", () => {
  const { head } = build();
  const mid = head.mouth.pts[7], dn = gradient(head.d, mid[0], mid[1], mid[2], 1e-3);
  let a = -0.1, b = 0.1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (head.d(mid[0] + dn[0] * m, mid[1] + dn[1] * m, mid[2] + dn[2] * m) < 0) a = m; else b = m; }
  assert.ok(a < -0.004, `the crease floor is ${a.toFixed(4)} under the skin`);
  assert.ok(head.measures.mouthDrop > 0 && head.measures.mouthDrop <= 0.35 + 1e-9, "inside R4's stack");
  assert.ok(head.mouth.pts[0][2] > head.mouth.pts[7][2], "the corners rise: a smile");
});
test("every plan A face at the corners of t builds, and the eye is always inside the head", () => {
  for (const t of [0, 1]) for (const u of [0, 1]) {
    const { head } = build((g) => (g.includes("eye") || g.includes("lid") ? t : u));
    for (const e of head.eyes) assert.ok(Math.abs(head.dK(...e.c)) < 1e-3);
    assert.ok(Math.abs(head.eyes[0].c[1]) + head.eyes[0].Riris < head.measures.W / 2 * (1 + house.rig.face["cheek-eye"]) * (1 + house.rig.A["cheek-forward"]) * 0.95, "the iris does not reach the head's side (the width at the eye line)");
  }
});
test("the round head of plan D has a bump nose and no muzzle", () => {
  const { head } = build(0.5, "D", { head: "round", eye: "round", muzzle: "none", nose: "bump", mouth: "smile" });
  assert.equal(head.M, null); assert.ok(head.nose.on);
  assert.ok(head.d(0, 0, 0) < -0.3);
});
