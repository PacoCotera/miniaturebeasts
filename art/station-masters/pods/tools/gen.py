"""Gemini image calls with logging and the spend cap. usage: python3 -I gen.py JOBS.json
JOBS.json: list of {name, model, prompt, refs:[[path,role],...], aspect, size, tries?}.  `model` is REQUIRED and written in the job (never taken from the environment).
One request at a time, no parallelism, no hidden retries: every request, a retry included, is its own line in log/calls.jsonl (model id as sent, size, reference count, HTTP status, usageMetadata, real cost) and its own entry in log/spend.json
(see spendcap.py: pre-checked at 0.24 USD, booked at its real token cost). A picture gets at most two requests (tries <= 2); a quota error (429) is not retried. Writes source/raw/<name>.<ext>."""
import base64, hashlib, json, os, sys, time, mimetypes
import requests
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
exec(open(os.path.join(HERE, "spendcap.py")).read(), globals())      # the owner's 250 MXN per Pacific day cap, counted from real tokens
SPEND = os.path.join(ROOT, "log/spend.json"); LOG = os.path.join(ROOT, "log/calls.jsonl")
KEY = os.environ.get("GEMINI_API_KEY")
def sha(b): return hashlib.sha256(b).hexdigest()
def log(rec): open(LOG, "a").write(json.dumps(rec) + "\n")
def request(job, try_no, parts, refs):
    """One request. Returns (image_or_None, http_status, error_or_None)."""
    model = job["model"]; rate_class(model)                           # an unknown model id stops here, before anything is sent
    allowed, total = precheck(SPEND)
    t0 = time.time(); stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    base = {"name": job["name"], "try": try_no, "model": model, "aspect": job.get("aspect", "16:9"), "size": job.get("size", "2K"), "referenceCount": len(refs), "imageInputs": refs, "prompt": job["prompt"], "preamble": parts[0]["text"], "time": stamp}
    if not allowed:
        err = f"refused: a request (worst case {WORST_CASE_USD} USD = {WORST_CASE_USD * MXN_PER_USD:.2f} MXN) would take the Pacific day past {CAP_MXN:.0f} MXN (running total {total:.2f} MXN); nothing was sent"
        log({**base, "httpStatus": None, "status": "refused", "usageMetadata": None, "costUsd": 0, "costMxn": 0, "output": None, "error": err}); return None, None, err
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": job.get("aspect", "16:9"), "imageSize": job.get("size", "2K")}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"; status = 0; usage = None; img = None; err = None; j = {}
    try:
        r = requests.post(url, headers={"x-goog-api-key": KEY}, json=body, timeout=300); status = r.status_code; j = r.json()
        usage = j.get("usageMetadata")
        for c in j.get("candidates", []):
            for p in c.get("content", {}).get("parts", []):
                d = p.get("inlineData") or p.get("inline_data")
                if d: img = (d.get("mimeType") or d.get("mime_type"), base64.b64decode(d["data"]))
        if not img: err = json.dumps(j)[:600]
    except Exception as e:
        err = repr(e)[:300]
    usd = real_cost_usd(model, usage, status if status else 0) if status else 0.0       # an exception with no HTTP status is booked at 0 (nothing came back)
    uu = {k: (usage or {}).get(k) for k in ("promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount")} if usage else None
    out = None
    if img:
        ext = {"image/jpeg": "jpg", "image/png": "png"}.get(img[0], "bin"); fn = f"source/raw/{job['name']}.{ext}"; open(os.path.join(ROOT, fn), "wb").write(img[1]); out = {"file": fn, "mimeType": img[0], "sha256": sha(img[1])}
    book(SPEND, "gemini " + model, f"{job['name']} try {try_no}", usd, {"model": model, "http_status": status, "usage": uu})
    log({**base, "seconds": round(time.time() - t0, 1), "httpStatus": status, "status": "success" if img else "error", "usageMetadata": uu, "costUsd": round(usd, 6), "costMxn": round(usd * MXN_PER_USD, 4), "output": out, "error": None if img else err})
    return img, status, err
def call(job):
    parts = [{"text": job.get("preamble", "Reference images follow; each is preceded by its role.")}]; refs = []
    for path, role in job.get("refs", []):
        b = open(os.path.join(REPO, path) if not os.path.isabs(path) else path, "rb").read()
        parts.append({"text": role}); parts.append({"inlineData": {"mimeType": mimetypes.guess_type(path)[0] or "image/png", "data": base64.b64encode(b).decode()}}); refs.append({"path": path, "role": role, "sha256": sha(b)})
    parts.append({"text": job["prompt"]}); status = "error"; err = None
    for try_no in range(1, min(int(job.get("tries", 2)), 2) + 1):          # at most two requests per picture, each logged and priced on its own
        img, http, err = request(job, try_no, parts, refs)
        if img: return job["name"], "success", None
        if http is None or http == 429: break                              # refused by the cap, or the quota is spent: a retry would only be another request for nothing
    return job["name"], status, err
if __name__ == "__main__":
    if not KEY: sys.exit("GEMINI_API_KEY is not set")
    for job in json.load(open(sys.argv[1])):
        if "model" not in job: sys.exit(f"job {job.get('name')!r} has no `model`: write the model id in the job, it is never taken from the environment")
        n, s, e = call(job); print(n, s, (e or "")[:200], flush=True)
