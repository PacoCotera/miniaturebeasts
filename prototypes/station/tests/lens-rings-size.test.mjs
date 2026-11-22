// ui-lens-fix-1: the Signature size chapter's round portraits (small, middle, big) are the signed trait chips, so the size rings are not empty
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { roundOf } from "../src/trait-crops.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), index = JSON.parse(readFileSync(path.resolve(here, "../../ui/assets/masters/index.json"), "utf8"));

test("Signature size has three round portraits, each a signed 128 x 160 chip in the masters index", () => {
  const ids = roundOf("S01", "signature-size");
  assert.equal(ids.length, 3);
  assert.deepEqual(ids.map((i) => i.split("-").slice(-2, -1)[0]), ["small", "stand", "large"]);
  for (const id of ids) { const e = index.masters[id]; assert.ok(e, id); assert.deepEqual([e.w, e.h], [128, 160]); }
});
