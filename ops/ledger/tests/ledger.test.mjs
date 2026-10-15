// ops/ledger/ledger.mjs against a fake ledger directory: node --test ops/ledger/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { requireLedger, price, listCost, record, strip, LedgerError } from "../ledger.mjs";

function fake() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mb-ledger-"));
  fs.writeFileSync(path.join(dir, "prices.json"), JSON.stringify({
    google: { "m-tokens": { inputPerM: 2, outputPerM: 120, perImage: null } },
    rd: { "m-image": { inputPerM: null, outputPerM: null, perImage: 0.18 } },
  }));
  return { dir, env: { MB_LEDGER: dir } };
}

test("requireLedger refuses an unset or missing directory", () => {
  assert.throws(() => requireLedger({}), LedgerError);
  assert.throws(() => requireLedger({ MB_LEDGER: "/nonexistent/mb-ledger" }), LedgerError);
  assert.throws(() => record({ tool: "t", publicFile: "f", recordId: "r", vendor: "rd", model: "m-image", costUSD: 1 }, {}), LedgerError);
});

test("price and list cost", () => {
  const { env } = fake();
  assert.equal(price("google", "m-tokens", env).outputPerM, 120);
  assert.equal(listCost("google", "m-tokens", { promptTokenCount: 1000, candidatesTokenCount: 1000 }, 1, env), 0.122);
  assert.equal(listCost("rd", "m-image", null, 2, env), 0.36);
  assert.throws(() => price("google", "nope", env), LedgerError);
});

test("record appends one line a call, list or vendor basis", () => {
  const { dir, env } = fake();
  const a = record({ tool: "caddy", publicFile: "p.json", recordId: "c1", vendor: "google", model: "m-tokens", usage: { in: 1000, out: 1000 } }, env);
  const b = record({ tool: "rd", publicFile: "q.json", recordId: "t1", vendor: "rd", model: "m-image", costUSD: 0.18, balanceAfter: 7 }, env);
  assert.equal(a.costUSD, 0.122); assert.equal(a.basis, "list");
  assert.equal(b.basis, "vendor"); assert.equal(b.balanceAfterUSD, 7);
  const files = fs.readdirSync(path.join(dir, "calls"));
  const lines = files.flatMap((f) => fs.readFileSync(path.join(dir, "calls", f), "utf8").trim().split("\n").map(JSON.parse));
  assert.deepEqual(lines.map((l) => l.public.record), ["c1", "t1"]);
  assert.ok(lines.every((l) => l.schema === "mb-ledger/1"));
});

test("strip removes every cost key at any depth and leaves the input", () => {
  const src = { model: "m", costUSD: 1, result: { status: "ok", balance_cost: 0.18, remaining_balance: 7, items: [{ usdPerIndividual: 2, seed: 3 }] } };
  assert.deepEqual(strip(src), { model: "m", result: { status: "ok", items: [{ seed: 3 }] } });
  assert.equal(src.costUSD, 1);
});
