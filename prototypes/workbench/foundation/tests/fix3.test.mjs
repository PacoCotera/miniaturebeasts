import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express } from "../express.mjs";
import { makeTile } from "../sheets.mjs";
import { checkRules, failures } from "../../form/house/house.mjs";
import { fromLocal } from "../sdf.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), snail = express(house, sp.S14);

test("head kinds: the soft block is 2.5, the bean is 2.2 in front and 3.2 behind (fix round 7: the section is round, the back of the skull is fuller) and the pear is 2.2: the soft block is the only squarer kind", () => {
  const e = (k) => house.kinds.head[k].exponent;
  assert.equal(e("soft-block"), 2.5); assert.equal(e("bean"), 2.2); assert.equal(house.kinds.head.bean["rear-exponent"], 3.2); assert.equal(e("pear"), 2.2);
  assert.ok(e("soft-block") !== e("bean") && e("round") !== e("bean"));
});
test("the type specimen holds the master's eye size without a clamp: E 0.354 H (E/Wf 0.30 of the old 1.18 head, 0.27 of the round head's 1.31), nothing moved by the far-eye clamp", () => {
  assert.ok(Math.abs(loika.measured["E/H"] - 0.354) < 0.005, `${loika.measured["E/H"]}`);
  assert.ok(loika.measured["E/Wf"] >= 0.22 && loika.measured["E/Wf"] <= 0.36, `${loika.measured["E/Wf"]}`);
  assert.deepEqual(loika.log.filter((l) => l.clamp === "far-eye"), []);
});
test("the leaves are broad paddles about 2:1, and the fan is most of the head's width", () => {
  const c = house.rig.A.crest;
  for (const [, len, wid] of c.leaves) { const r = len / wid; assert.ok(r >= 1.5 && r <= 2.4, `length to width ${r}`); } // fix round 7: three broad leaves, the master's are about 1.7
  const sc = loika.scene; let lo = 9, hi = -9; // the head's own coordinates: the fan is measured across the head
  for (let y = -1.2; y <= 1.2; y += 0.02) for (let z = 0.4; z <= 1.4; z += 0.04) for (let x = -0.3; x <= 0.3; x += 0.1) { const p = fromLocal(sc.hf, [x, y, z]); if (sc.parts.crest(p[0], p[1], p[2]) < 0) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
  const fan = (hi - lo) / sc.W; assert.ok(fan >= 0.7 && fan <= 1.0, // fix round 7: the master's three spread leaves are as wide as its head on screen (x 55 to 215 over a head 155 px wide), so the top goes 0.9 -> 1.0
     `fan ${fan} of the head's width`);
});
test("the snail's line: the segments taper by no more than about 22 % each (fix-4 ruling 8 asks for a thin tail, so the fix-3 20 % is read as about), the head sits down on the first segment (no neck, no S-rise)", () => {
  const r = house.rig.D["seg-radius"]; for (let i = 1; i < r.length; i++) assert.ok(r[i] / r[i - 1] >= 0.78 - 1e-9, `taper ${r[i] / r[i - 1]}`);
  const sc = snail.scene, first = sc.extra.segs[0], top = first.c[2] + first.r, headBottom = sc.kc[2] - 0.5;
  assert.ok(top - headBottom >= 0.3 * 1.0, `the head overlaps the first segment by ${top - headBottom} H`);
  assert.ok(sc.extra.segs.at(-1).c[2] + sc.extra.segs.at(-1).r >= top * 0.5, "the tail is not a string of beads far below the head");
});
test("muzzle t 1 is a bigger round snout, not a flat bill: the forward projection is capped and the width takes the rest", () => {
  const at = (t) => express(house, sp.S01, { t: { "form.muzzle": t } }).scene.head.M, a = at(0.6), b = at(1.0);
  const cap = house.rig.face["muzzle-projection-cap"];
  assert.ok(b.c[0] + b.r[0] - (a.c[0] + a.r[0]) < 0.35 * cap, "the front moves little from t 0.6 to 1");
  assert.ok(b.r[1] > a.r[1], "the muzzle widens instead");
  assert.ok(b.c[0] + b.r[0] - (express(house, sp.S01, { t: { "form.muzzle": 0 } }).scene.head.M.c[0] + express(house, sp.S01, { t: { "form.muzzle": 0 } }).scene.head.M.r[0]) < cap + 0.12, "never past the cap from t 0");
});
test("the nose and the smile: Loika has the gap of at least 0.25 E, the smile is the nose's width plus 0.3 E, no dark triangle", () => {
  const m = loika.measured;
  assert.ok(m["nose-mouth/E"] >= 0.25 - 1e-9 && Math.abs(m["mouth-w/E"] - 0.83) <= 0.12, "the smile is the master's 0.83 E (AD fix round 5, ruling 1a)");
  assert.ok(m["nose-w/E"] <= 1.1 && m["nose-w/E"] >= 0.7, "a mound, 0.7 to 1.1 E");
  assert.ok(house.rules.some((r) => r.id === "R-nose-mouth" && r.kinds.mound[0] === 0.25));
});
test("the eye's ring is bright all the way round at lid t 0 (top no more than 14 L* darker than the bottom: the lid shades the top quarter, fix round 7), the nose is not darker than the muzzle by more than 5 L*, in the render at 304", () => {
  const t = makeTile(house, sp.S01, { sizes: [304], label: "x" });
  assert.equal(t.rig.lid, 0, "Loika's lid is t 0: no lid at all");
  assert.ok(t.measured["ring-shade/L"] <= 14, `ring ${t.measured["ring-shade/L"]}`);
  assert.ok(t.measured["nose-value/L"] >= -5, `nose ${t.measured["nose-value/L"]}`);
  assert.deepEqual(failures(checkRules(house, "A", t.measured, { kinds: sp.S01.kinds })).map((x) => x.id), []);
});
test("the head is pitched up 8 to 10 degrees, as the master's chin-up carriage", () => {
  assert.ok(loika.pose.pitch >= 8 && loika.pose.pitch <= 10, `${loika.pose.pitch}`);
});
test("the back line read from the field agrees with the one read from the render (they are the same measure two ways)", async () => {
  const { imageProfile } = await import("../silhouette.mjs");
  const t = makeTile(house, sp.S01, { sizes: [304] }), p = imageProfile(t.r[304]);
  for (const [f, k] of [[0.85, "back-85/S"], [0.95, "back-95/S"]]) assert.ok(Math.abs(p.at[f] - t.measured[k]) < 0.07, `${f}: render ${p.at[f]} field ${t.measured[k]}`);
});
test("the cream's near edge falls away from the mouth corner and stays at least 0.5 E under the near eye's ring, never climbing the cheek", () => {
  const ch = sp.S01.look.creamHead, h = loika.scene.head, e = h.eyes[0], hw = h.mouth.w / 2, edgeAt = (ay) => (ay <= hw ? h.mouth.zAt(ay) : h.mouth.zAt(hw) - ch.fall * (ay - hw)) - ch.below;
  const ringBottom = e.c[2] - e.Reye, atEye = edgeAt(Math.abs(e.c[1]));
  assert.ok(ringBottom - atEye >= 0.5 * h.measures.E, `${(ringBottom - atEye) / h.measures.E} E under the ring`);
  for (let ay = hw; ay < 0.7; ay += 0.05) assert.ok(edgeAt(ay + 0.05) <= edgeAt(ay) + 1e-9, "the edge only falls beyond the corner");
});
