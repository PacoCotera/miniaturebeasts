"""Sum every paid call's sidecar under sources/ into budget.json: Gemini calls priced from their token usage,
Retro Diffusion calls from the balance_cost in their results. usage: python3 -I budget.py SOURCES_DIR"""
import glob, json, os, sys
src = sys.argv[1]
PRICES = {"gemini-3-pro-image": (2.0, 120.0), "gemini-3.1-flash-image": (0.5, 60.0)}   # USD per M tokens, standard tier, ai.google.dev pricing 2026-10-08
calls, total = [], 0.0
for p in sorted(glob.glob(os.path.join(src, "**", "*.json"), recursive=True)):
    if os.path.basename(p) == "budget.json": continue
    d = json.load(open(p))
    if d.get("tool") == "retro-diffusion":
        c = (d.get("result") or {}).get("balanceCostUSD")
        if c is None: continue
        calls.append({"tag": d["id"], "tool": "retro-diffusion " + d["style"], "size": d["size"], "usd": c, "seconds": d["result"].get("seconds")}); total += c
    elif "model" in d and "result" in d and "usage" in d["result"]:
        u = d["result"]["usage"]; pi, po = PRICES[d["model"]]
        c = u["promptTokenCount"] * pi / 1e6 + u["candidatesTokenCount"] * po / 1e6
        calls.append({"tag": d["tag"], "tool": d["model"], "in": u["promptTokenCount"], "out": u["candidatesTokenCount"], "usd": round(c, 4), "seconds": d["result"]["seconds"]}); total += c
out = {"successfulCalls": len(calls), "totalUSD": round(total, 2), "calls": calls,
       "pricing": "gemini-3-pro-image standard tier: $2.00/M input, $120/M output tokens (ai.google.dev pricing, 2026-10-08); Retro Diffusion rd_pro: $0.18 per image (balance_cost in the task result)"}
json.dump(out, open(os.path.join(src, "budget.json"), "w"), indent=1); print("calls", len(calls), "total USD", out["totalUSD"])
