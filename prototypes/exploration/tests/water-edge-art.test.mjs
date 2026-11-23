// water-edge-4 (owner #110): the four shallow-to-deep edge pieces are the art director's signed files, byte for byte (mibi-art ledger signed.jsonl, ids 6d4259b3f1 5487091ba2 9197e178fe 82c8c57c63).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../art/water-edge");
const SIGNED = {
  run_a: "0e62be5ec036e922edbbb485f2e66060ebe603732a21173858808e963ebe9d10",
  run_b: "4c3fa53808fa2ef88adeaa26581109078088d485e06eb827f2c520beee71e42a",
  inner: "3bada6a573b5b17eededa74a8be6ed0431c39522b753765b3c9b164fc8ff3725",
  outer: "0b80544e7a1125ae62c234641366460b59c89101f3e0c8ca2d56453ea57e1181",
};
const sha = (n) => createHash("sha256").update(readFileSync(path.join(dir, n + ".png"))).digest("hex");

for (const [n, want] of Object.entries(SIGNED)) {
  test(`water edge piece ${n} is the signed file`, () => { assert.equal(sha(n), want); });
}

test("the signed shas equal the ledger's (when the ledger is here)", (t) => {
  const ledger = process.env.MB_LEDGER || "/home/mb/mb/mibi-art/boards/signed.jsonl";
  if (!existsSync(ledger)) { t.skip("no ledger"); return; }
  const rows = readFileSync(ledger, "utf8").split("\n").filter((l) => l.includes("#waterEdge/")).map((l) => JSON.parse(l));
  for (const n of Object.keys(SIGNED)) { const r = rows.filter((x) => x.slot === n).pop(); assert.ok(r, n + " is in the ledger"); assert.equal(r.sha256, SIGNED[n]); }
});
