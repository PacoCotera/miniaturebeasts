#!/usr/bin/env python3
"""The paid-call ledger's one helper for every writer (plans/public-cleanup.md §1.2).

Public records keep provenance: model, prompt and its fields, seed, input SHA-256s, request or task id,
usage tokens, seconds, status and checks. Cost, credit and balance go to the ledger, a directory outside
this repository named by MB_LEDGER. With MB_LEDGER unset or not writable, require_ledger() stops the tool
before any paid call. Mocks and dry runs never call it. The same API is in ledger.mjs.

  python3 ops/ledger/ledger.py sum --since 2026-10-09 [--tool T]    # the run-rate from the ledger
"""
import argparse, copy, datetime, fcntl, glob, json, os, sys

SCHEMA = "mb-ledger/1"
# The cost and balance keys that never go into a public record (§2.1), plus every key starting usdPer.
COST_KEYS = frozenset([
    "costUSD", "balanceCostUSD", "remainingBalanceUSD", "remaining_balance", "balance_cost", "credit_cost",
    "spentUSD", "spendUSD", "totalUSD", "usd", "balanceAfter", "callUSDMean", "stationCallUSD",
    "tokenAtSizeUSD", "spentAllVersionsUSD", "pricing",
])
COST_PREFIX = "usdPer"


class LedgerError(SystemExit):
    pass


def is_cost_key(k):
    return isinstance(k, str) and (k in COST_KEYS or k.startswith(COST_PREFIX))


def require_ledger():
    """The ledger directory from MB_LEDGER; exits the tool when it is unset or not writable."""
    d = os.environ.get("MB_LEDGER")
    if not d:
        raise LedgerError("MB_LEDGER is not set: every paid call is logged to the ledger, so no call is made.")
    if not os.path.isdir(d) or not os.access(d, os.W_OK):
        raise LedgerError("MB_LEDGER is not a writable directory: every paid call is logged to the ledger, so no call is made.")
    return d


def price(vendor, model):
    """The vendor's list price for a model from $MB_LEDGER/prices.json:
    {inputPerM, outputPerM, perImage, asOf, source}."""
    with open(os.path.join(require_ledger(), "prices.json")) as f:
        prices = json.load(f)
    try:
        return prices[vendor][model]
    except KeyError:
        raise LedgerError(f"no list price for {vendor} {model} in the ledger's prices.json")


def _usage(usage):
    """Token usage as {in, out}; takes Gemini's usageMetadata or {in, out}."""
    if usage is None:
        return None
    if "promptTokenCount" in usage or "candidatesTokenCount" in usage:
        return {"in": usage.get("promptTokenCount", 0), "out": usage.get("candidatesTokenCount", 0)}
    return {"in": usage.get("in", 0), "out": usage.get("out", 0)}


def list_cost(vendor, model, usage=None, images=1):
    """The list cost of one call: tokens times the per-million prices, or images times the per-image price."""
    p = price(vendor, model)
    u = _usage(usage)
    if u is not None and (p.get("inputPerM") is not None or p.get("outputPerM") is not None):
        return round(u["in"] / 1e6 * (p.get("inputPerM") or 0) + u["out"] / 1e6 * (p.get("outputPerM") or 0), 5)
    if p.get("perImage") is not None:
        return round(images * p["perImage"], 5)
    return None


def record(tool, public_file, record_id, vendor, model, usage=None, cost_usd=None, credit_cost=None,
           balance_after=None, status="ok"):
    """Appends one line for one paid call under a lock, and returns it. Without cost_usd, the cost is the
    list cost from usage (basis "list"); with it, the vendor's figure (basis "vendor")."""
    d = require_ledger()
    basis = "vendor"
    if cost_usd is None and usage is not None:
        cost_usd, basis = list_cost(vendor, model, usage), "list"
    now = datetime.datetime.now(datetime.timezone.utc)
    line = {"schema": SCHEMA, "at": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "tool": tool, "vendor": vendor, "model": model,
            "public": {"file": public_file, "record": record_id}, "usage": _usage(usage),
            "costUSD": cost_usd, "basis": basis if cost_usd is not None else None,
            "creditCost": credit_cost, "balanceAfterUSD": balance_after, "status": status}
    calls = os.path.join(d, "calls")
    os.makedirs(calls, exist_ok=True)
    data = (json.dumps(line, ensure_ascii=False) + "\n").encode()
    fd = os.open(os.path.join(calls, now.strftime("%Y-%m") + ".jsonl"), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, data)
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
    return line


def strip(obj):
    """A deep copy with every cost and balance key removed, at any depth."""
    if isinstance(obj, dict):
        return {k: strip(v) for k, v in obj.items() if not is_cost_key(k)}
    if isinstance(obj, list):
        return [strip(v) for v in obj]
    return copy.deepcopy(obj)


def total(since=None, tool=None, ledger=None):
    """Sums the ledger's call lines: {calls, costUSD, byTool}."""
    d = ledger or require_ledger()
    out = {"calls": 0, "costUSD": 0.0, "byTool": {}}
    for path in sorted(glob.glob(os.path.join(d, "calls", "*.jsonl"))):
        with open(path) as f:
            for raw in f:
                if not raw.strip():
                    continue
                line = json.loads(raw)
                if since and line.get("at", "") < since:
                    continue
                if tool and not line.get("tool", "").startswith(tool):
                    continue
                t = out["byTool"].setdefault(line.get("tool", "?"), {"calls": 0, "costUSD": 0.0})
                c = line.get("costUSD") or 0
                t["calls"] += 1; t["costUSD"] = round(t["costUSD"] + c, 5)
                out["calls"] += 1; out["costUSD"] = round(out["costUSD"] + c, 5)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="The paid-call ledger (MB_LEDGER).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sum", help="sum the call lines")
    s.add_argument("--since", help="YYYY-MM-DD, inclusive")
    s.add_argument("--tool", help="a tool name or its prefix")
    a = ap.parse_args(argv)
    if a.cmd == "sum":
        print(json.dumps(total(a.since, a.tool), indent=1))


if __name__ == "__main__":
    main()
