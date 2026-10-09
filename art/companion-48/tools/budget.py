"""Count every paid call's sidecar under sources/ into calls.json: per call its tag, tool, size and seconds.
No cost: the dollar total is in the ledger outside this repository
(MB_LEDGER=... python3 ops/ledger/ledger.py sum --tool companion-48). usage: python3 -I budget.py SOURCES_DIR"""
import glob, json, os, sys
src = sys.argv[1]
calls = []
for p in sorted(glob.glob(os.path.join(src, "**", "*.json"), recursive=True)):
    if os.path.basename(p) in ("calls.json", "budget.json", "extra-spend.json"): continue
    d = json.load(open(p))
    if d.get("tool") == "retro-diffusion":
        if not d.get("result"): continue   # a dry run (check_cost) is no call
        calls.append({"tag": d["id"], "tool": "retro-diffusion " + d["style"], "size": d["size"], "seconds": d["result"].get("seconds")})
    elif "model" in d and "result" in d and "usage" in d["result"]:
        req = d.get("requested") or {}
        calls.append({"tag": d["tag"], "tool": d["model"], "size": req.get("imageSize"), "seconds": d["result"]["seconds"]})
out = {"successfulCalls": len(calls), "calls": calls}
json.dump(out, open(os.path.join(src, "calls.json"), "w"), indent=1); print("calls", len(calls))
