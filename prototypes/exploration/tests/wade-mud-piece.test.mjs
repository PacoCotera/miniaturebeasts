// bug #47 (owner: "muddy water should be shown different to the regular terrain you can walk on"): a 48 px wade tile draws the desk's mud piece
// (art/walk/wade-mud-f0, -f1: josehzz Mud&Water CC0, re-cut), flipped by the tile's x and y parity, clipped to the 7 px shore inset at land ends; no code-drawn cloud.
//   node --test prototypes/exploration/tests/wade-mud-piece.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { makePage, WALK_ART } from "./page-harness.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
const rgb = p.run("RGB");
// the page's wade tile as screen colours (a transparent pixel is -1), for a key and a frame and the tile's place in the place (px)
const drawn = (nb, fr, ox, oy) => JSON.parse(p.run(`JSON.stringify(Array.from(L2.wade(48, ${JSON.stringify(nb)}, ${fr}, 0, ${ox}, 0, ${oy}).p))`)).map((i) => (i < 0 ? -1 : rgb[i].join()));
// the file's own pixels, flipped by parity, clipped to the shore inset
const expected = (nb, fr, ox, oy) => {
  const f = WALK_ART["wade-mud-f" + fr], fx = (ox / 48) & 1, fy = (oy / 48) & 1, x0 = nb[3] === "l" ? 7 : 0, x1 = nb[1] === "l" ? 41 : 48, out = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const sx = fx ? 47 - x : x, sy = fy ? 47 - y : y, o = (sy * 48 + sx) * 4;
    out.push(x < x0 || x >= x1 || f.data[o + 3] < 128 ? -1 : [f.data[o], f.data[o + 1], f.data[o + 2]].join());
  }
  return out;
};

test("the piece files are 48 x 48, opaque, two frames that differ only in the sheen", () => {
  const a = WALK_ART["wade-mud-f0"], b = WALK_ART["wade-mud-f1"];
  assert.equal(a.width + "x" + a.height, "48x48"); assert.equal(b.width + "x" + b.height, "48x48");
  let opaque = 0, diff = 0; for (let i = 0; i < 48 * 48; i++) { if (a.data[i * 4 + 3] === 255) opaque++; if (a.data[i * 4] !== b.data[i * 4] || a.data[i * 4 + 1] !== b.data[i * 4 + 1] || a.data[i * 4 + 2] !== b.data[i * 4 + 2]) diff++; }
  assert.equal(opaque, 2304, "one opaque tile");
  assert.ok(diff > 20 && diff < 200, "the frames differ by the shifted sheen only: " + diff);
});

test("a wade tile draws the piece by sha: both frames, all four parities, clipped at land ends", () => {
  const seen = new Set();
  for (const nb of ["owow", "owol", "lwow", "lwoo"]) for (const fr of [0, 1]) for (const [ox, oy] of [[0, 0], [48, 0], [0, 48], [48, 48], [96, 96]]) {
    const got = drawn(nb, fr, ox, oy), want = expected(nb, fr, ox, oy);
    assert.equal(sha(got.join("|")), sha(want.join("|")), `${nb} frame ${fr} at ${ox},${oy}`);
    if (nb === "owow") seen.add(sha(got.join("|")));
  }
  assert.equal(seen.size, 8, "2 frames x 4 parities (96,96 repeats 0,0) are 8 different pictures");
});

test("no code-drawn cloud: the 48 px wade never calls the murk, and the tile key carries the y parity", () => {
  p.run("L2.murk = () => { throw new Error('crosshatch drawn in code'); }");
  assert.doesNotThrow(() => drawn("owow", 0, 0, 0));
  const keys = JSON.parse(p.run(`(() => { const lay = { w: 4, h: 4, tiles: new Array(16).fill(T.WATER) }; lay.tiles[5] = T.WADE; lay.tiles[9] = T.WADE; return JSON.stringify([L2.key48(lay, 5, 0), L2.key48(lay, 9, 0)]); })()`));
  assert.ok(keys[0].endsWith(":1") && keys[1].endsWith(":0"), "keys end in the y parity (rows 1 and 2): " + keys.join(" "));
});
