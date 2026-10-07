"""Minimal Retro Diffusion v2 client for the trial.

Usage: python3 rd.py <outdir> <name> <payload.json> [--check]
The payload JSON may contain "@file" references for image fields:
  {"input_palette": "@/path/to/palette.png", "reference_images": ["@a.png", "@b.png"]}
Files are read, converted to RGB PNG and base64-encoded. The sidecar written next to
the output records the exact request with image fields replaced by file name + sha256,
plus the response metadata (cost, balance, model, task id). The key is read only from
the environment and never written.
"""
import base64, hashlib, io, json, os, sys, time, uuid
import urllib.request, urllib.error
from PIL import Image

API = "https://api.retrodiffusion.ai/v2/inferences"
KEY = os.environ["RETRO_DIFFUSION_API_KEY"]


def b64_rgb(path):
    keep_alpha = path.startswith("rgba:")
    path = path[5:] if keep_alpha else path
    im = Image.open(path).convert("RGBA" if keep_alpha else "RGB")
    buf = io.BytesIO()
    im.save(buf, "PNG")
    data = buf.getvalue()
    return base64.b64encode(data).decode(), {
        "file": os.path.basename(path), "sha256": hashlib.sha256(data).hexdigest(),
        "size": list(im.size)}


def request(method, url, body=None, headers=None):
    h = {"X-RD-Token": KEY, "Content-Type": "application/json"}
    h.update(headers or {})
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    outdir, name, payload_path = sys.argv[1:4]
    check = "--check" in sys.argv
    os.makedirs(outdir, exist_ok=True)
    payload = json.load(open(payload_path))
    record = {"request": {}, "images": {}}
    for k, v in payload.items():
        if isinstance(v, str) and v.startswith("@"):
            payload[k], record["images"][k] = b64_rgb(v[1:])
            record["request"][k] = "<base64 of " + record["images"][k]["file"] + ">"
        elif isinstance(v, list) and v and isinstance(v[0], str) and v[0].startswith("@"):
            encs, metas = zip(*(b64_rgb(p[1:]) for p in v))
            payload[k] = list(encs)
            record["images"][k] = list(metas)
            record["request"][k] = ["<base64 of %s>" % m["file"] for m in metas]
        else:
            record["request"][k] = v
    if check:
        payload["check_cost"] = True
        status, res = request("POST", API, payload)
        print(name, "check_cost", status, json.dumps(res)[:300])
        return
    if "--task" in sys.argv:
        acc = {"task_id": sys.argv[sys.argv.index("--task") + 1]}
        status = 202
    else:
        idem = str(uuid.uuid4())
        status, acc = request("POST", API, payload, {"Idempotency-Key": idem})
        print(name, "accepted", status, json.dumps(acc)[:300])
    if status not in (200, 202):
        sys.exit(1)
    task_id = acc["task_id"]
    t0 = time.time()
    while True:
        status, task = request("GET", f"{API}/tasks/{task_id}")
        if task.get("status") in ("pending", "running"):
            time.sleep(3)
            continue
        break
    record["task_id"] = task_id
    record["seconds"] = round(time.time() - t0, 1)
    record["status"] = task.get("status")
    if task.get("status") != "succeeded":
        record["error"] = task.get("error")
        print(name, "FAILED", json.dumps(task)[:500])
        json.dump(record, open(os.path.join(outdir, name + ".json"), "w"), indent=2)
        sys.exit(2)
    res = task["result"]
    outs = []
    for i, img in enumerate(res.get("base64_images", [])):
        data = base64.b64decode(img)
        ext = "gif" if data[:3] == b"GIF" else "png"
        fn = f"{name}-{i+1}.{ext}" if len(res["base64_images"]) > 1 else f"{name}.{ext}"
        open(os.path.join(outdir, fn), "wb").write(data)
        outs.append(fn)
    for i, url in enumerate(res.get("output_urls", []) or []):
        fn = f"{name}-url-{i+1}.png"
        urllib.request.urlretrieve(url, os.path.join(outdir, fn))
        outs.append(fn)
    record["outputs"] = outs
    record["response"] = {k: v for k, v in res.items()
                          if k not in ("base64_images", "output_urls")}
    json.dump(record, open(os.path.join(outdir, name + ".json"), "w"), indent=2)
    print(name, "ok", outs, "cost", res.get("balance_cost"), "balance", res.get("remaining_balance"),
          "model", res.get("model"), f"{record['seconds']}s")


if __name__ == "__main__":
    main()
