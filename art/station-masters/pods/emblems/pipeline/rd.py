"""Retro Diffusion pass for the Legs & tail pictograms: each 96 px Gemini pictogram (in96/) pixelated to 24x24 with the Station's 62 colours as input_palette.
usage: python3 -I rd.py [--run]   (dry run = check_cost, free). Writes rd/<name>-rd.png and rd/<name>.json (no key material); appends to ../../log/spend.json."""
import base64, hashlib, json, os, sys, time, urllib.request, urllib.error, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__)); API = "https://api.retrodiffusion.ai/v2/inferences"; STYLE = "rd_pro__pixelate"
PAL = os.path.join(HERE, "station-palette-62.png"); SPEND = os.path.join(HERE, "..", "..", "log", "spend.json")
PROMPTS = {"tail": "a filled pixel art pictogram of an animal's tail, one solid bone-white silhouette, lit from the upper left, no outline",
           "leg": "a filled pixel art pictogram of an animal's hind leg with its paw, one solid bone-white silhouette, lit from the upper left, no outline"}
def b64f(p): return base64.b64encode(open(p, "rb").read()).decode()
def req(method, url, body=None, headers=None):
    hd = {"X-RD-Token": os.environ["RETRO_DIFFUSION_API_KEY"], "Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=hd, method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read().decode() or "{}")
def one(name, run):
    inp = os.path.join(HERE, "in96", name + "-96.png"); prompt = PROMPTS[name.split("-")[0]]
    payload = {"prompt": prompt, "width": 24, "height": 24, "num_images": 1, "prompt_style": STYLE, "input_palette": b64f(PAL), "input_image": b64f(inp), "strength": 0.6, "remove_bg": True, "seed": 1}
    side = {"id": name, "tool": "retro-diffusion", "style": STYLE, "size": "24x24", "prompt": prompt, "seed": 1, "strength": 0.6, "input_image": {"file": f"in96/{name}-96.png", "sha256": hashlib.sha256(open(inp, "rb").read()).hexdigest()},
            "input_palette": {"file": "station-palette-62.png", "sha256": hashlib.sha256(open(PAL, "rb").read()).hexdigest()}, "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    st, res = req("POST", API, {**payload, "check_cost": True}); side["checkCost"] = res
    if not run: return name, st, res.get("balance_cost"), side
    st, acc = req("POST", API, payload, {"Idempotency-Key": name + "-" + side["time"]})
    if st not in (200, 202): return name, st, acc, side
    tid = acc.get("task_id") or acc.get("id"); task = acc; t0 = time.time()
    while tid and task.get("status") not in ("completed", "succeeded", "failed", "error"):
        time.sleep(5); st, task = req("GET", f"{API}/tasks/{tid}")
    r = task.get("result") or task; imgs = r.get("base64_images") or []
    side["result"] = {"status": task.get("status"), "task_id": tid, "seconds": round(time.time() - t0, 1), "balanceCostUSD": r.get("balance_cost"), "remainingBalanceUSD": r.get("remaining_balance")}
    for b in imgs[:1]:
        raw = base64.b64decode(b); p = os.path.join(HERE, "rd", f"{name}-rd.png"); open(p, "wb").write(raw); side["result"]["file"] = f"rd/{name}-rd.png"; side["result"]["sha256"] = hashlib.sha256(raw).hexdigest()
    json.dump(side, open(os.path.join(HERE, "rd", name + ".json"), "w"), indent=1)
    return name, 200, side["result"], side
if __name__ == "__main__":
    run = "--run" in sys.argv; names = [f"{k}-{c}" for k in ("tail", "leg") for c in "abcd"]; spend = json.load(open(SPEND)) if os.path.exists(SPEND) else []
    with cf.ThreadPoolExecutor(4) as ex:
        for n, st, info, side in ex.map(lambda n: one(n, run), names):
            print(n, st, info)
            if run and side.get("result"): spend.append({"tag": "legs-tail pictogram " + n + " (pass 15)", "tool": "retro-diffusion " + STYLE, "usd": side["result"].get("balanceCostUSD"), "evidence": "task " + str(side["result"].get("task_id"))})
    if run: json.dump(spend, open(SPEND, "w"), indent=1)
