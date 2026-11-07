// The twenty kinds' art (release 21c): the 0.8 rule on every juvenile and adult pair and size, the chips under their new names, the earlier art gone, and the rescale itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodePNG } from "../png.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkJuveniles, pairsOf, figureBox, rescaleJuvenile, retired, flipPic, FLIPPED, FLIPPED_ADULT, GROUNDED, RATIO } from "../tools/game-masters.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/masters"), index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")), M = index.masters;
const KINDS = Array.from({ length: 20 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));

test("every juvenile master is 0.8 of its adult's figure height at the same size, on the same feet row", () => {
  assert.deepEqual(checkJuveniles(root, index), []);
  const pairs = pairsOf(index);
  for (const k of KINDS) for (const w of ["304x312", "96x88", "48x48", "curl-304x312"]) assert.ok(pairs.some((p) => p.kind === k && p.what === w), `${k} ${w} is not measured`);
  for (const [k, w] of [["S02", "puff-304x312"], ["S02", "sniff-304x312"], ["S03", "dig-304x312"], ["S03", "glow-304x312"]]) assert.ok(pairs.some((p) => p.kind === k && p.what === w), `${k} ${w} is not measured`);
});
test("the rescale makes a pixel-exact ratio on a synthetic pair and keeps the feet", () => {
  const box = (w, h, x0, y0, x1, y1) => { const data = new Uint8Array(w * h * 4); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data.set([200, 100, 50, 255], (y * w + x) * 4); return { w, h, data }; };
  const r = rescaleJuvenile(box(40, 50, 10, 5, 30, 44), box(40, 50, 10, 5, 30, 44)), b = figureBox(r.pic);
  assert.ok(Math.abs(b[3] - b[1] + 1 - RATIO * 40) <= 1 && Math.abs(b[3] - 44) <= 1);
});
test("each kind has its chips under the new names and none of the earlier trait chips, rolls or reading pictures of S01 and S03 remain", () => {
  for (const k of KINDS) for (const l of ["plain", "back-spots", "saddle", "gradient", "bands", "patches"]) for (const s of ["104x64", "104x96", "104x160", "128x160", "144x176"]) assert.ok(M[`trait-${k}-markings-${l}-${s}`], `trait-${k}-markings-${l}-${s}`);
  for (const k of KINDS) for (const l of ["small", "stand", "large"]) assert.ok(M[`trait-${k}-signature-size-${l}-128x160`], `${k} ${l}`);
  assert.ok(!Object.keys(M).some((id) => /^(roll-S01-|reading-[a-z-]+-S0[13]-)/.test(id) || id === "mibi-juvenile-S01-176x128" || /^trait-S\d\d-(coat|signature-(small|stand|large))/.test(id)));
  assert.ok(Object.keys(M).filter((id) => /^trait-S\d\d-/.test(id)).every((id) => /^trait-S\d\d-(markings|signature-size)-/.test(id)));
  assert.equal(retired("roll-S01-drive-128x72", KINDS), true);
});
test("juvenileFacing covers the twenty", () => {
  assert.deepEqual(Object.keys(index.juvenileFacing.species).sort(), KINDS);
  for (const [k, v] of Object.entries(index.juvenileFacing.species)) { assert.equal(v.adult, "right", k + ": every adult faces right"); assert.equal(v.mirror, true, k); assert.equal(v.juvenile, "right", k + ": the young is painted facing right and drawn mirrored"); }
});
test("Pesko is placed mirrored so the roster faces right: flipPic reverses each row, and the table says S06 faces right", () => {
  const p = { w: 3, h: 1, data: Uint8Array.from([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255]) }, f = flipPic(p);
  assert.deepEqual([...f.data], [3, 3, 3, 255, 2, 2, 2, 255, 1, 1, 1, 255]); assert.deepEqual([...FLIPPED], ["S06"]);
  assert.equal(index.juvenileFacing.species.S06.adult, "right");
});
test("Blikur's young stands on its shadow: the first shadow row is at most 2 rows under the feet; Loika's adult faces right", () => {
  for (const id of ["mibi-juvenile-S16-304x312", "mibi-juvenile-S16-96x88", "mibi-juvenile-S16-48x48", "mibi-juvenile-S16-104x112"]) {
    const im = decodePNG(readFileSync(path.join(root, M[id].file))), W = im.width, H = im.height, rowMax = (y) => { let m = 0; for (let x = 0; x < W; x++) m = Math.max(m, im.data[(y * W + x) * 4 + 3]); return m; };
    let bottom = -1; for (let y = H - 1; y >= 0 && bottom < 0; y--) if (Array.from({ length: W }, (_, x) => im.data[(y * W + x) * 4 + 3]).some((a) => a >= 128)) bottom = y;
    let first = -1; for (let y = bottom + 1; y < H && first < 0; y++) if (rowMax(y) > 0) first = y;
    assert.ok(first < 0 || first - bottom <= 2, id + ": shadow starts " + (first - bottom) + " rows under the feet");
  }
  assert.deepEqual([...FLIPPED_ADULT], ["S01"]); assert.deepEqual([...GROUNDED], ["S16"]);
});
