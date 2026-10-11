"""One Retro Diffusion call for a terrain material tile, booked on the day ledger (the 250 MXN cap) before it is made.
Dry run (check_cost, free) unless --run; the price check_cost returns is charged through spendcap.charge, which refuses a call
that would pass the cap. Raw PNG and a sidecar (prompt, input hash, cost; no key material) kept in OUT_DIR.
usage: python3 -I terrain-rd.py TAG OUT_DIR W H "prompt" --input IMG [--strength 0.5] [--seed N] [--style rd_tile__single_tile] [--run]
env: MB_SPEND = the day ledger (spend.json)"""
import base64, hashlib, json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
SPEND = os.environ["MB_SPEND"]; exec(open(os.path.join(os.path.dirname(SPEND), "..", "tools", "spendcap.py")).read(), globals())
PAL = os.path.join(HERE, "..", "palette", "palette.png"); API = "https://api.retrodiffusion.ai/v2/inferences"
tag, out, w, h, prompt = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
def opt(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
inp, strength, seed, style, run = opt("--input"), float(opt("--strength", "0.5")), int(opt("--seed", "48")), opt("--style", "rd_tile__single_tile"), "--run" in sys.argv
def b64(p): return base64.b64encode(open(p, "rb").read()).decode()
def req(method, url, body=None):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                               headers={"X-RD-Token": os.environ["RETRO_DIFFUSION_API_KEY"], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=180) as resp: return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read().decode() or "{}")
os.makedirs(out, exist_ok=True)
payload = {"prompt": prompt, "width": w, "height": h, "num_images": 1, "prompt_style": style, "input_palette": b64(PAL), "seed": seed}
if inp: payload["input_image"] = b64(inp); payload["strength"] = strength
side = {"id": tag, "tool": "retro-diffusion", "style": style, "size": f"{w}x{h}", "prompt": prompt, "seed": seed,
        "input_image": {"file": os.path.basename(inp), "sha256": hashlib.sha256(open(inp, "rb").read()).hexdigest(), "strength": strength} if inp else None,
        "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
st, cc = req("POST", API, {**payload, "check_cost": True}); usd = float(cc.get("balance_cost") or cc.get("cost") or 0)
print("check_cost", st, {k: v for k, v in cc.items() if k != "base64_images"})
if not run: sys.exit(0)
if st != 200 or usd <= 0: sys.exit("no price from check_cost: nothing is called")
ok, total = charge(SPEND, "retro-diffusion " + style, tag, usd)
if not ok: sys.exit(f"refused by the cap: the day is at {total:.2f} MXN")
print(f"charged {usd * MXN_PER_USD:.2f} MXN, day {total:.2f} MXN")
st, res = req("POST", API, payload); print("post", st, {k: v for k, v in res.items() if k != "base64_images"})
tid = res.get("task_id") or res.get("id"); side["task_id"] = tid
while tid and res.get("status") not in ("completed", "succeeded", "failed", "error"):     # 202: the task runs; poll it
    time.sleep(4); st, res = req("GET", f"{API}/tasks/{tid}")
res = res.get("result") or res
imgs = res.get("base64_images") or []
side["result"] = {"http": st, "cost_usd": usd, "credit_cost": res.get("credit_cost"), "remaining_balance": res.get("remaining_balance")}
for b in imgs:
    raw = base64.b64decode(b); p = os.path.join(out, f"{tag}-rd.png"); open(p, "wb").write(raw); side["result"]["file"] = os.path.basename(p); side["result"]["sha256"] = hashlib.sha256(raw).hexdigest()
json.dump(side, open(os.path.join(out, tag + ".json"), "w"), indent=1); print(side["result"])
