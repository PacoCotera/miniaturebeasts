// The paid-call ledger's one helper for every writer (plans/public-cleanup.md §1.2), the same API as ledger.py.
// Public records keep provenance; cost, credit and balance go to the ledger directory named by MB_LEDGER,
// outside this repository. With MB_LEDGER unset or not writable, requireLedger() throws before any paid call.
// Mocks and dry runs never call it.
import fs from "node:fs";
import path from "node:path";

export const SCHEMA = "mb-ledger/1";
export const COST_KEYS = new Set([
  "costUSD", "balanceCostUSD", "remainingBalanceUSD", "remaining_balance", "balance_cost", "credit_cost",
  "spentUSD", "spendUSD", "totalUSD", "usd", "balanceAfter", "callUSDMean", "stationCallUSD",
  "tokenAtSizeUSD", "spentAllVersionsUSD", "pricing",
]);
export const COST_PREFIX = "usdPer";

export class LedgerError extends Error {}

export const isCostKey = (k) => typeof k === "string" && (COST_KEYS.has(k) || k.startsWith(COST_PREFIX));

export function requireLedger(env = process.env) {
  const d = env.MB_LEDGER;
  if (!d) throw new LedgerError("MB_LEDGER is not set: every paid call is logged to the ledger, so no call is made.");
  try {
    if (!fs.statSync(d).isDirectory()) throw new Error();
    fs.accessSync(d, fs.constants.W_OK);
  } catch {
    throw new LedgerError("MB_LEDGER is not a writable directory: every paid call is logged to the ledger, so no call is made.");
  }
  return d;
}

export function price(vendor, model, env = process.env) {
  const prices = JSON.parse(fs.readFileSync(path.join(requireLedger(env), "prices.json"), "utf8"));
  const p = prices[vendor]?.[model];
  if (!p) throw new LedgerError(`no list price for ${vendor} ${model} in the ledger's prices.json`);
  return p;
}

function normUsage(u) {
  if (u == null) return null;
  if ("promptTokenCount" in u || "candidatesTokenCount" in u) return { in: u.promptTokenCount ?? 0, out: u.candidatesTokenCount ?? 0 };
  return { in: u.in ?? 0, out: u.out ?? 0 };
}

const round5 = (x) => Math.round(x * 1e5) / 1e5;

export function listCost(vendor, model, usage = null, images = 1, env = process.env) {
  const p = price(vendor, model, env);
  const u = normUsage(usage);
  if (u && (p.inputPerM != null || p.outputPerM != null)) return round5(u.in / 1e6 * (p.inputPerM ?? 0) + u.out / 1e6 * (p.outputPerM ?? 0));
  if (p.perImage != null) return round5(images * p.perImage);
  return null;
}

// Appends one line for one paid call and returns it. A single O_APPEND write, so lines from concurrent
// writers never interleave (ledger.py also takes an fcntl lock around the same write).
export function record({ tool, publicFile, recordId, vendor, model, usage = null, costUSD = null, creditCost = null, balanceAfter = null, status = "ok" }, env = process.env) {
  const d = requireLedger(env);
  let basis = "vendor";
  if (costUSD == null && usage != null) { costUSD = listCost(vendor, model, usage, 1, env); basis = "list"; }
  const now = new Date();
  const line = {
    schema: SCHEMA, at: now.toISOString().replace(/\.\d{3}Z$/, "Z"), tool, vendor, model,
    public: { file: publicFile, record: recordId }, usage: normUsage(usage),
    costUSD, basis: costUSD != null ? basis : null, creditCost, balanceAfterUSD: balanceAfter, status,
  };
  const calls = path.join(d, "calls");
  fs.mkdirSync(calls, { recursive: true });
  fs.appendFileSync(path.join(calls, now.toISOString().slice(0, 7) + ".jsonl"), JSON.stringify(line) + "\n");
  return line;
}

export function strip(obj) {
  if (Array.isArray(obj)) return obj.map(strip);
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).filter(([k]) => !isCostKey(k)).map(([k, v]) => [k, strip(v)]));
  return obj;
}

export { requireLedger as require_ledger, listCost as list_cost };
