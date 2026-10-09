"""Gemini image call with logging. usage: python3 -I gen.py JOBS.json
JOBS.json: list of {name, prompt, refs:[[path,role],...], aspect, size, model?}
Writes source/raw/<name>.<ext> and appends one line per call to log/calls.jsonl."""
import base64, hashlib, json, os, sys, time, mimetypes, concurrent.futures as cf
import requests
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
MODEL = os.environ["IMAGE_MODEL"]  # named in the environment, not recorded
KEY = os.environ["GEMINI_API_KEY"]
exec(open(os.path.join(HERE, "spendcap.py")).read(), globals())      # the owner's 250 MXN per Pacific day cap
SPEND = os.path.join(ROOT, "log/spend.json")
def sha(b): return hashlib.sha256(b).hexdigest()
def call(job):
    model = job.get("model", MODEL)
    parts = [{"text": job.get("preamble", "Reference images follow; each is preceded by its role.")}]
    refs = []
    for path, role in job.get("refs", []):
        b = open(os.path.join(REPO, path) if not os.path.isabs(path) else path, "rb").read()
        parts.append({"text": role})
        parts.append({"inlineData": {"mimeType": mimetypes.guess_type(path)[0] or "image/png", "data": base64.b64encode(b).decode()}})
        refs.append({"path": path, "role": role, "sha256": sha(b)})
    parts.append({"text": job["prompt"]})
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": job.get("aspect", "16:9"), "imageSize": job.get("size", "2K")}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    t0 = time.time(); status = "error"; out = None; err = None
    for attempt in range(2):                                              # at most two tries per picture; every try is charged before it is made
        ok, total = charge(SPEND, "gemini " + model, job["name"] + f" try {attempt + 1}", GEMINI_IMAGE_USD)
        if not ok: err = f"refused: the call would take the Pacific day past {CAP_MXN:.0f} MXN (running total {total:.2f} MXN)"; status = "refused"; break
        try:
            r = requests.post(url, headers={"x-goog-api-key": KEY}, json=body, timeout=300)
            j = r.json()
            img = None
            for c in j.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    d = p.get("inlineData") or p.get("inline_data")
                    if d: img = (d.get("mimeType") or d.get("mime_type"), base64.b64decode(d["data"]))
            if img:
                ext = {"image/jpeg": "jpg", "image/png": "png"}.get(img[0], "bin")
                fn = f"source/raw/{job['name']}.{ext}"; open(os.path.join(ROOT, fn), "wb").write(img[1])
                out = {"file": fn, "mimeType": img[0], "sha256": sha(img[1])}; status = "success"; break
            err = json.dumps(j)[:600]
        except Exception as e:
            err = repr(e)[:300]
        time.sleep(3)
    rec = {"name": job["name"], "aspect": job.get("aspect", "16:9"), "size": job.get("size", "2K"), "prompt": job["prompt"], "preamble": parts[0]["text"], "imageInputs": refs,
           "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "seconds": round(time.time() - t0, 1), "status": status, "output": out, "error": None if status == "success" else err}
    open(os.path.join(ROOT, "log/calls.jsonl"), "a").write(json.dumps(rec) + "\n")
    return rec["name"], status, err
if __name__ == "__main__":
    jobs = json.load(open(sys.argv[1]))
    with cf.ThreadPoolExecutor(6) as ex:
        for n, s, e in ex.map(call, jobs): print(n, s, (e or "")[:200], flush=True)
