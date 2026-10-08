"""One Retro Diffusion call for a weather piece, with the signed 48-colour palette as input_palette.
Dry run first (check_cost, free); then the paid call, polled; raw PNG and a sidecar (no key material) kept.
usage: python3 -I rd-gen.py TAG OUT_DIR WIDTH HEIGHT "prompt" [--run] [--remove-bg] [--style rd_pro__topdown]"""
import base64, hashlib, io, json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
PAL_PNG = os.path.join(HERE, "..", "palette", "palette.png")
API = "https://api.retrodiffusion.ai/v2/inferences"
tag, out, w, h, prompt = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
run = "--run" in sys.argv; rbg = "--remove-bg" in sys.argv
style = sys.argv[sys.argv.index("--style") + 1] if "--style" in sys.argv else "rd_pro__topdown"
os.makedirs(out, exist_ok=True)
pal_b64 = base64.b64encode(open(PAL_PNG, "rb").read()).decode()

def req(method, url, body=None, headers=None):
    hd = {"X-RD-Token": os.environ["RETRO_DIFFUSION_API_KEY"], "Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=hd, method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read().decode() or "{}")

payload = {"prompt": prompt, "width": w, "height": h, "num_images": 1, "prompt_style": style, "input_palette": pal_b64, "remove_bg": rbg, "seed": 48}
side = {"id": tag, "tool": "retro-diffusion", "style": style, "size": f"{w}x{h}", "prompt": prompt, "remove_bg": rbg, "seed": 48,
        "input_palette": {"file": "palette/palette.png", "sha256": hashlib.sha256(open(PAL_PNG, "rb").read()).hexdigest()}, "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
st, res = req("POST", API, {**payload, "check_cost": True}); print("check_cost", st, res)
side["checkCost"] = res
if not run:
    json.dump(side, open(os.path.join(out, tag + ".json"), "w"), indent=1); sys.exit(0)
st, acc = req("POST", API, payload, {"Idempotency-Key": tag + "-" + side["time"]}); print("post", st, {k: v for k, v in acc.items() if k != "base64_images"})
if st not in (200, 202): sys.exit(1)
tid = acc.get("task_id") or acc.get("id"); t0 = time.time(); task = acc
while tid and task.get("status") not in ("completed", "succeeded", "failed", "error"):
    time.sleep(5); st, task = req("GET", f"{API}/tasks/{tid}")
res = task.get("result") or task
imgs = res.get("base64_images") or []
side["result"] = {"status": task.get("status"), "task_id": tid, "seconds": round(time.time() - t0, 1), "balanceCostUSD": res.get("balance_cost"), "remainingBalanceUSD": res.get("remaining_balance"), "model": res.get("model")}
for i, b in enumerate(imgs):
    raw = base64.b64decode(b); p = os.path.join(out, f"{tag}-rd.png"); open(p, "wb").write(raw)
    side["result"]["file"] = os.path.basename(p); side["result"]["sha256"] = hashlib.sha256(raw).hexdigest()
json.dump(side, open(os.path.join(out, tag + ".json"), "w"), indent=1); print(side["result"])
