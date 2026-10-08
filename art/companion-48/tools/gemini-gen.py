"""One Gemini image call for a painted source: writes the raw image, a PNG canvas and a sidecar (prompt, reference hashes, usage; no key).
usage: python3 -I gemini-gen.py TAG OUT_DIR PROMPT_FILE [--ref IMG ...] [--model gemini-3-pro-image-preview]
The key is GEMINI_API_KEY in the environment; it is never printed or stored."""
import base64, hashlib, io, json, os, sys, time, urllib.request
from PIL import Image
tag, out, pf = sys.argv[1], sys.argv[2], sys.argv[3]
refs = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--ref"]
model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "gemini-3-pro-image-preview"
key = os.environ["GEMINI_API_KEY"]; prompt = open(pf).read()
parts = [{"text": prompt}] + [{"inline_data": {"mime_type": "image/png", "data": base64.b64encode(open(r, "rb").read()).decode()}} for r in refs]
body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}}}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", data=json.dumps(body).encode(), headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
t0 = time.time()
try: res = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e: sys.exit("HTTP %d: %s" % (e.code, e.read()[:300].decode("utf8", "replace")))
img = next((p for p in res["candidates"][0]["content"]["parts"] if "inlineData" in p), None)
if not img: sys.exit("no image in the response: " + json.dumps(res)[:300])
raw = base64.b64decode(img["inlineData"]["data"]); os.makedirs(os.path.join(out, "raw"), exist_ok=True)
ext = "jpg" if "jpeg" in img["inlineData"].get("mimeType", "") else "png"
open(os.path.join(out, "raw", f"{tag}.{ext}"), "wb").write(raw)
im = Image.open(io.BytesIO(raw)).convert("RGB"); im.save(os.path.join(out, f"{tag}-canvas.png"))
side = {"id": tag, "tag": tag, "model": model.replace("-preview", ""), "operation": "generate", "prompt": prompt, "imageInputs": [{"path": r, "sha256": hashlib.sha256(open(r, "rb").read()).hexdigest()} for r in refs],
        "requested": {"aspectRatio": "1:1", "imageSize": "1K"}, "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "result": {"status": "success", "png": {"file": f"{tag}-canvas.png", "width": im.width, "height": im.height, "sha256": hashlib.sha256(open(os.path.join(out, f'{tag}-canvas.png'), 'rb').read()).hexdigest()},
                   "finishReason": res["candidates"][0].get("finishReason"), "seconds": round(time.time() - t0, 1), "usage": res.get("usageMetadata")}}
json.dump(side, open(os.path.join(out, f"{tag}.json"), "w"), indent=1); print("wrote", tag, im.size, side["result"]["usage"].get("candidatesTokenCount"))
