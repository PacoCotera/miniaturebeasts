// bug #46 (owner 2026-11-17, "tuft not visible"): ICON.tuft was an empty slot. It is now the AD's signed find tuft (art/props/find-tuft-1.png, 14 x 10).
//   node --test prototypes/exploration/tests/find-tuft-art.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const SHA = "99e822d009de714c84dafab0f6fb28ceadef17e2d0d9763e4b8a39ee8f18eaf0";

test("#46 the tuft file is the signed one, byte for byte", () => {
  const f = readFileSync(new URL("../art/props/find-tuft-1.png", import.meta.url));
  assert.equal(createHash("sha256").update(f).digest("hex"), SHA);
});

test("#46 ICON.tuft draws non-empty pixels, 14 x 10, from that file", () => {
  const p = makePage({ console: "silent", canvas: true, paint: true });   // paint: the tuft's own colours are off the core palette, keep them
  const f = readFileSync(new URL("../art/props/find-tuft-1.png", import.meta.url));
  assert.equal(createHash("sha256").update(f).digest("hex"), SHA);
  assert.equal(p.run("ICON.tuft() === STONE_PIECES.get('find-tuft-1')"), true, "the slot is the loaded picture, not the empty slot");
  assert.equal(p.run("ICON.tuft().w + 'x' + ICON.tuft().h"), "14x10");
  const opaque = p.run("(() => { const pb = ICON.tuft(); const c = pb.canvas(0); const d = c.getContext('2d').getImageData(0, 0, pb.w, pb.h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()");
  assert.ok(opaque > 0, "some pixels are drawn");
});
