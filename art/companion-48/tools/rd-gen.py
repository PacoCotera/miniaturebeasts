"""One Retro Diffusion call for a weather piece, with the signed 48-colour palette as input_palette.
Dry run first; then the real call, polled; raw PNG and a sidecar (no key material) kept. The call's cost and
the balance go to the ledger outside this repository (ops/ledger, MB_LEDGER); a dry run makes no ledger line.
usage: python3 -I rd-gen.py TAG OUT_DIR WIDTH HEIGHT "prompt" [--run] [--remove-bg] [--style rd_pro__topdown]
       [--input IMG --strength 0.0-1.0] (img2img from a painted crop) [--ref IMG] (RD Pro reference) [--seed N]"""
import base64, hashlib, io, json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(REPO, "ops", "ledger"))
import ledger  # noqa: E402  the paid-call ledger (MB_LEDGER), outside this repository
PAL_PNG = os.path.join(HERE, "..", "palette", "palette.png")
API = "https://api.retrodiffusion.ai/v2/inferences"
tag, out, w, h, prompt = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
run = "--run" in sys.argv; rbg = "--remove-bg" in sys.argv
style = sys.argv[sys.argv.index("--style") + 1] if "--style" in sys.argv else "rd_pro__topdown"
def opt(k, d=None): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
inp, strength, ref, seed = opt("--input"), float(opt("--strength", "0.6")), opt("--ref"), int(opt("--seed", "48"))
def b64f(p): return base64.b64encode(open(p, "rb").read()).decode()
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
os.makedirs(out, exist_ok=True)
pal_b64 = base64.b64encode(open(PAL_PNG, "rb").read()).decode()

def req(method, url, body=None, headers=None):
    hd = {"X-RD-Token": os.environ["RETRO_DIFFUSION_API_KEY"], "Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=hd, method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read().decode() or "{}")

payload = {"prompt": prompt, "width": w, "height": h, "num_images": 1, "prompt_style": style, "input_palette": pal_b64, "remove_bg": rbg, "seed": seed}
if inp: payload["input_image"] = b64f(inp); payload["strength"] = strength
if ref: payload["reference_images"] = [b64f(ref)]
side = {"id": tag, "tool": "retro-diffusion", "style": style, "size": f"{w}x{h}", "prompt": prompt, "remove_bg": rbg, "seed": seed, "input_image": {"file": inp, "sha256": sha(inp), "strength": strength} if inp else None, "reference_image": {"file": ref, "sha256": sha(ref)} if ref else None,
        "input_palette": {"file": "palette/palette.png", "sha256": hashlib.sha256(open(PAL_PNG, "rb").read()).hexdigest()}, "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
st, res = req("POST", API, {**payload, "check_cost": True}); print("check_cost", st, ledger.strip(res))
side["checkCost"] = ledger.strip(res)
if not run:
    json.dump(side, open(os.path.join(out, tag + ".json"), "w"), indent=1); sys.exit(0)
ledger.require_ledger()  # every paid call is logged: without the ledger no call is made
st, acc = req("POST", API, payload, {"Idempotency-Key": tag + "-" + side["time"]}); print("post", st, {k: v for k, v in acc.items() if k != "base64_images"})
if st not in (200, 202): sys.exit(1)
tid = acc.get("task_id") or acc.get("id"); t0 = time.time(); task = acc
while tid and task.get("status") not in ("completed", "succeeded", "failed", "error"):
    time.sleep(5); st, task = req("GET", f"{API}/tasks/{tid}")
res = task.get("result") or task
imgs = res.get("base64_images") or []
side["result"] = {"status": task.get("status"), "task_id": tid, "seconds": round(time.time() - t0, 1), "model": res.get("model")}
ledger.record("companion-48/rd-gen.py", os.path.relpath(os.path.abspath(os.path.join(out, tag + ".json")), REPO), tag, "retrodiffusion", res.get("model") or style,
              cost_usd=res.get("balance_cost"), credit_cost=res.get("credit_cost"), balance_after=res.get("remaining_balance"), status=task.get("status") or "ok")
for i, b in enumerate(imgs):
    raw = base64.b64decode(b); p = os.path.join(out, f"{tag}-rd.png"); open(p, "wb").write(raw)
    side["result"]["file"] = os.path.basename(p); side["result"]["sha256"] = hashlib.sha256(raw).hexdigest()
json.dump(side, open(os.path.join(out, tag + ".json"), "w"), indent=1); print(side["result"])
