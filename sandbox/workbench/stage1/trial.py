#!/usr/bin/env python3
"""Stage 1 cut-off trial (art-pipeline.md v2 §9, the lead's brief of 2026-10-08).

Controls come from the workbench CLI (`node sketch/cli.mjs --species S01 --set 3`, under out/reference/);
this script paints the unique Station set per individual with Gemini from the shaded and slot passes,
derives the smaller sizes two ways (down-rendered from the unique set; generic per species from the type
specimen with the pigment slots remapped), paints the 48 px token at size with Retro Diffusion for a few,
measures each against its controls, and lays one sheet per species at device size with the calls of each
cut-off beside it. Every call is recorded in prompts.json with its prompt, request id and usage; its cost
goes to the ledger outside this repository (ops/ledger, MB_LEDGER). Keys are read from the environment
and never written.

  python3 trial.py controls            # copy the main-view controls into stage1/controls/
  python3 trial.py paint [S01 ...]     # the Gemini calls (paid)
  python3 trial.py token [S01 ...]     # the Retro Diffusion token at size (paid)
  python3 trial.py fetch               # collect accepted Retro Diffusion tasks that were not yet collected
  python3 trial.py derive              # down-render, generic remap, measurements
  python3 trial.py sheets              # the per-species sheets and the call table
"""
import base64, hashlib, io, json, os, sys, time, uuid, urllib.request, urllib.error
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(WB))
sys.path.insert(0, os.path.join(REPO, "ops", "ledger"))
import ledger  # noqa: E402  the paid-call ledger (MB_LEDGER), outside this repository
REF = os.path.join(WB, "out", "reference")
SPECIES = ["S01", "S09", "S12"]
BG = (246, 243, 236)  # the sketch's shaded background, #f6f3ec
STYLE_REF = os.path.join(REPO, "art/miniature-lives/assets/rich-plain-300x310.png")  # the accepted Pip, Station treatment
STYLE_REF_HIBIT = os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")
PALETTE_48 = os.path.join(REPO, "art/retro-diffusion-trial/companion-palette-48.json")
PROMPTS = os.path.join(HERE, "prompts.json")
GEMINI_MODEL = os.environ.get("STAGE1_GEMINI_MODEL", "gemini-3.1-flash-image")
PUBLIC_LOG = "prototypes/workbench/stage1/prompts.json"  # the public record the ledger lines join to
RD_API = "https://api.retrodiffusion.ai/v2/inferences"


def load_prompts():
    if os.path.exists(PROMPTS):
        return json.load(open(PROMPTS))
    return {"schemaVersion": 1, "purpose": "Stage 1 cut-off trial: every paid call with its prompt, request id, usage and time. Image inputs are replaced by file name and SHA-256. No key material.", "calls": []}


def save_prompts(p):
    p = {**p, "calls": [ledger.strip(c) for c in p["calls"]]}
    json.dump(p, open(PROMPTS, "w"), indent=1)
    open(PROMPTS, "a").write("\n")


def members(species):
    idx = json.load(open(os.path.join(REF, species, "index.json")))
    return [{**m, "dir": os.path.join(REF, species, m["dir"])} for m in idx["members"]]


def manifest(d):
    return json.load(open(os.path.join(d, "manifest.json")))


def sha_file(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def pad_square(path, size=620):
    im = Image.open(path).convert("RGB")
    canvas = Image.new("RGB", (size, size), BG)
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2))
    buf = io.BytesIO(); canvas.save(buf, "PNG")
    return buf.getvalue(), canvas


def b64(data):
    return base64.b64encode(data).decode()


# --- controls -----------------------------------------------------------------------------------------
MAIN_VIEW = ["shaded.three-quarter.{s}.png", "slots.three-quarter.{s}.png", "index.three-quarter.{s}.png", "silhouette.three-quarter.{s}.png"]


def cmd_controls():
    out = os.path.join(HERE, "controls")
    n = 0
    for sp in SPECIES:
        for m in members(sp):
            d = os.path.join(out, sp, m["id"])
            os.makedirs(d, exist_ok=True)
            for size in ["tile", "companion", "station", "large"]:
                for pat in MAIN_VIEW:
                    f = pat.format(s=size)
                    src = os.path.join(m["dir"], f)
                    if os.path.exists(src):
                        open(os.path.join(d, f), "wb").write(open(src, "rb").read()); n += 1
            for f in ["manifest.json", "genome.json"]:
                open(os.path.join(d, f), "wb").write(open(os.path.join(m["dir"], f), "rb").read())
        open(os.path.join(out, sp, "index.json"), "wb").write(open(os.path.join(REF, sp, "index.json"), "rb").read())
    print("controls copied:", n, "images")


# --- the Gemini painting call -----------------------------------------------------------------------------
def template(man, frame_name):
    slots = ", ".join(f"{s['slot']} → {' and '.join(s['pigments'])}" for s in man["sketch"]["slots"])
    return (
        "Paint the creature in image 1 exactly as it is drawn: the same silhouette, pose, camera, proportions and framing, every part present and no part added. "
        "Image 1 is its form under one light from the top left. Image 2 is the colour key: each flat colour is one pigment slot of the same body, and each slot must be painted in a ramp of its own colour, never moved: "
        f"{slots}. Image 3 is the part map: keep every part exactly where it is. Image 4 is the finished style to match: rounded, tactile, ceramic-like volumes in crisp pixel-art clusters, three or four principal value masses, restrained highlights, the eyes as flat inks with one catch light, a friendly small face. "
        f"The creature is a {man['sketch']['caption']} It is a juvenile {frame_name}, standing still, seen from the front-right as in image 1. "
        "Paint the subject alone on a flat uniform background of exactly #f6f3ec, no scene, no ground, no shadow on the ground, no props, no text, no border. Keep the subject the same size and in the same place as in image 1. Output one square image."
    )


def gemini_call(model, parts, record):
    key = os.environ["GEMINI_API_KEY"]
    ledger.require_ledger(); ledger.price("google", model)  # every paid call is logged at a known price: without the ledger the tool stops before the call
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.loads(r.read().decode())
            status = r.status
    except urllib.error.HTTPError as e:
        res = {"error": e.read().decode()[:2000]}
        status = e.code
    record["seconds"] = round(time.time() - t0, 1)
    record["httpStatus"] = status
    return status, res


def cmd_paint(only):
    prompts = load_prompts()
    done = {(c["species"], c["individual"], c["purpose"]) for c in prompts["calls"] if c.get("status") == "ok"}
    style_png = open(STYLE_REF, "rb").read()
    style_rgb = Image.open(STYLE_REF).convert("RGBA")
    style_canvas = Image.new("RGB", style_rgb.size, BG); style_canvas.paste(style_rgb, mask=style_rgb.split()[3])
    buf = io.BytesIO(); style_canvas.save(buf, "PNG"); style_png = buf.getvalue()
    for sp in SPECIES:
        if only and sp not in only:
            continue
        frame = json.load(open(os.path.join(REF, sp, f"species-{sp}.json")))
        for m in members(sp):
            key = (sp, m["id"], "station-main")
            if key in done:
                continue
            man = manifest(m["dir"])
            imgs = []
            for pat in ["shaded.three-quarter.large.png", "slots.three-quarter.large.png", "index.three-quarter.large.png"]:
                data, _ = pad_square(os.path.join(m["dir"], pat))
                imgs.append((pat, data))
            imgs.append(("style:rich-plain-300x310.png", style_png))
            text = template(man, frame["species"]["name"])
            parts = [{"text": text}] + [{"inline_data": {"mime_type": "image/png", "data": b64(d)}} for _, d in imgs]
            rec = {"id": str(uuid.uuid4()), "service": "gemini", "model": GEMINI_MODEL, "purpose": "station-main", "species": sp, "individual": m["id"], "genomeSha256": m.get("genomeSha256"),
                   "prompt": text, "images": [{"name": n, "sha256": hashlib.sha256(d).hexdigest(), "bytes": len(d)} for n, d in imgs],
                   "generationConfig": {"responseModalities": ["IMAGE"], "aspectRatio": "1:1", "imageSize": "1K"}, "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            status, res = gemini_call(GEMINI_MODEL, parts, rec)
            if status != 200:
                rec["status"] = "failed"; rec["error"] = res.get("error", res)
                prompts["calls"].append(rec); save_prompts(prompts); print(sp, m["id"], "FAILED", status, str(res)[:300]); continue
            rec["responseId"] = res.get("responseId"); rec["modelVersion"] = res.get("modelVersion")
            usage = res.get("usageMetadata", {})
            rec["usage"] = usage
            ledger.record("stage1/trial.py paint", PUBLIC_LOG, rec["id"], "google", GEMINI_MODEL, usage=usage)
            image_part = next((p for p in res.get("candidates", [{}])[0].get("content", {}).get("parts", []) if "inlineData" in p), None)
            if not image_part:
                rec["status"] = "no-image"; rec["response"] = json.dumps(res)[:1500]
                prompts["calls"].append(rec); save_prompts(prompts); print(sp, m["id"], "NO IMAGE", str(res)[:300]); continue
            raw = base64.b64decode(image_part["inlineData"]["data"])
            outdir = os.path.join(HERE, "unique", sp, m["id"]); os.makedirs(outdir, exist_ok=True)
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            im.save(os.path.join(outdir, "station-raw.png"))
            rec["output"] = {"file": f"unique/{sp}/{m['id']}/station-raw.png", "mimeType": image_part["inlineData"].get("mimeType"), "size": list(im.size), "sha256": hashlib.sha256(raw).hexdigest()}
            rec["status"] = "ok"
            prompts["calls"].append(rec); save_prompts(prompts)
            print(sp, m["id"], "ok", im.size, f"{rec['seconds']} s", rec.get("responseId"))


# --- the Retro Diffusion token at size ---------------------------------------------------------------------
def rd_request(method, url, body=None, headers=None):
    h = {"X-RD-Token": os.environ["RETRO_DIFFUSION_API_KEY"], "Content-Type": "application/json"}
    h.update(headers or {})
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def poll_rd(task_id, t0):
    """Poll a task until it holds images or fails (accepted, pending and running are not done)."""
    task = {}
    while time.time() - t0 < 900:
        status, task = rd_request("GET", f"{RD_API}/tasks/{task_id}")
        if task.get("status") in ("succeeded", "failed", "error", "cancelled"): return {**task.get("result", {}), "status": task.get("status"), "task_id": task_id}
        time.sleep(4)
    return task


def finish_rd(rec, task, prompts):
    imgs = task.get("base64_images") or []
    rec["taskStatus"] = task.get("status"); rec["rdModel"] = task.get("model")
    cost = task.get("balance_cost") if isinstance(task.get("balance_cost"), (int, float)) else task.get("cost")
    if cost is not None or task.get("remaining_balance", task.get("balance")) is not None:
        ledger.record("stage1/trial.py token", PUBLIC_LOG, rec["id"], "retrodiffusion", task.get("model") or rec.get("model"), cost_usd=cost,
                      balance_after=task.get("remaining_balance", task.get("balance")), status=task.get("status") or "ok")
    if not imgs:
        rec["status"] = "no-image"; rec["response"] = json.dumps(ledger.strip({k: v for k, v in task.items() if k not in ("cost", "balance")}))[:1500]; save_prompts(prompts); return False
    raw = base64.b64decode(imgs[0])
    outdir = os.path.join(HERE, "unique", rec["species"], rec["individual"]); os.makedirs(outdir, exist_ok=True)
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    flat = Image.new("RGB", im.size, BG); flat.paste(im, mask=im.split()[3]); flat.save(os.path.join(outdir, "token-painted-48.png"))
    rec["output"] = {"file": f"unique/{rec['species']}/{rec['individual']}/token-painted-48.png", "size": list(im.size), "sha256": hashlib.sha256(raw).hexdigest()}
    rec["status"] = "ok"; save_prompts(prompts); return True


def cmd_fetch():
    """Finish Retro Diffusion calls that were accepted but not collected (a task id without an image)."""
    ledger.require_ledger()
    prompts = load_prompts()
    for rec in prompts["calls"]:
        if rec.get("service") == "retro-diffusion" and rec.get("status") != "ok" and rec.get("requestId"):
            t0 = time.time(); task = poll_rd(rec["requestId"], t0)
            rec["seconds"] = (rec.get("seconds") or 0) + round(time.time() - t0, 1)
            ok = finish_rd(rec, task, prompts)
            print(rec["species"], rec["individual"], "fetched" if ok else "still no image", rec.get("taskStatus"))


def cmd_token(only, check=False):
    if not check: ledger.require_ledger()  # the check_cost dry run is free and writes no ledger line
    prompts = load_prompts()
    done = {(c["species"], c["individual"], c["purpose"]) for c in prompts["calls"] if c.get("status") == "ok"}
    pal = Image.open(os.path.join(REPO, "art/retro-diffusion-trial/companion-palette-48.png")).convert("RGB")
    pbuf = io.BytesIO(); pal.save(pbuf, "PNG")
    for sp in SPECIES:
        if only and sp not in only:
            continue
        frame = json.load(open(os.path.join(REF, sp, f"species-{sp}.json")))
        for m in members(sp):
            if m["level"] != "individual" or m.get("seed") != 1:
                continue  # one individual per species at size: the cost of cut-off A, not a census
            key = (sp, m["id"], "token-48")
            if key in done:
                continue
            unique = os.path.join(HERE, "unique", sp, m["id"], "station-300x310.png")
            if not os.path.exists(unique):
                print(sp, m["id"], "no unique Station render yet; run paint and derive first"); continue
            man = manifest(m["dir"])
            tile = Image.open(os.path.join(m["dir"], "shaded.three-quarter.tile.png")).convert("RGB")
            tbuf = io.BytesIO(); tile.resize((192, 192), Image.NEAREST).save(tbuf, "PNG")
            ubuf = io.BytesIO(); Image.open(unique).convert("RGB").save(ubuf, "PNG")
            text = f"48 px pixel-art token of the creature in the reference images, same pose and silhouette, {man['sketch']['caption']} Flat {frame['species']['name']} on a plain background, no text."
            payload = {"prompt": text, "width": 48, "height": 48, "num_images": 1, "prompt_style": "rd_pro__default", "input_palette": b64(pbuf.getvalue()), "reference_images": [b64(ubuf.getvalue()), b64(tbuf.getvalue())], "remove_bg": True, "seed": 1}
            rec = {"id": str(uuid.uuid4()), "service": "retro-diffusion", "model": "rd_pro__default", "purpose": "token-48", "species": sp, "individual": m["id"], "genomeSha256": m.get("genomeSha256"), "prompt": text,
                   "request": {k: v for k, v in payload.items() if k not in ("input_palette", "reference_images")},
                   "images": [{"name": "companion-palette-48.png", "sha256": hashlib.sha256(pbuf.getvalue()).hexdigest()}, {"name": f"unique/{sp}/{m['id']}/station-300x310.png", "sha256": hashlib.sha256(ubuf.getvalue()).hexdigest()}, {"name": "shaded.three-quarter.tile.png ×4", "sha256": hashlib.sha256(tbuf.getvalue()).hexdigest()}],
                   "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            if check:
                status, res = rd_request("POST", RD_API, {**payload, "check_cost": True}); print(sp, m["id"], "check_cost", status, ledger.strip(res)); continue
            t0 = time.time()
            status, acc = rd_request("POST", RD_API, payload, {"Idempotency-Key": rec["id"]})
            if status not in (200, 202):
                rec["status"] = "failed"; rec["error"] = acc; prompts["calls"].append(rec); save_prompts(prompts); print(sp, m["id"], "RD FAILED", status, acc); continue
            task_id = acc.get("task_id"); rec["requestId"] = task_id
            task = acc
            task = poll_rd(task_id, t0)
            rec["seconds"] = round(time.time() - t0, 1)
            prompts["calls"].append(rec)
            ok = finish_rd(rec, task, prompts)
            print(sp, m["id"], "token ok" if ok else "RD NO IMAGE", f"{rec['seconds']} s")


# --- deriving the smaller sizes ---------------------------------------------------------------------------
def mask_of(im, thresh=28):
    px = im.convert("RGB").load(); w, h = im.size
    m = Image.new("1", im.size, 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) > thresh: mp[x, y] = 1
    return m


def bbox_of(mask):
    return mask.getbbox()


def silhouette_mask(path):
    im = Image.open(path).convert("L"); return im.point(lambda v: 255 if v < 128 else 0).convert("1")


def iou(a, b):
    ap, bp = a.load(), b.load(); w, h = a.size; inter = union = 0
    for y in range(h):
        for x in range(w):
            x1, x2 = ap[x, y] != 0, bp[x, y] != 0
            inter += x1 and x2; union += x1 or x2
    return inter / union if union else 0.0


def fit_to_control(painted, control_sil_path, out_size, palette=None):
    """Down-render by the Station's rule: scale the painted subject so its bounds match the control
    silhouette's bounds at the target size, on the flat background, then quantise to the palette."""
    ctrl = silhouette_mask(control_sil_path); cb = bbox_of(ctrl)
    pm = mask_of(painted); pb = bbox_of(pm)
    if not cb or not pb: return Image.new("RGB", out_size, BG)
    sx = (cb[2] - cb[0]) / max(1, pb[2] - pb[0]); sy = (cb[3] - cb[1]) / max(1, pb[3] - pb[1]); s = min(sx, sy)
    w, h = max(1, round(painted.width * s)), max(1, round(painted.height * s))
    small = painted.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGB", out_size, BG)
    ox = round((cb[0] + cb[2]) / 2 - (pb[0] + pb[2]) / 2 * s); oy = round((cb[1] + cb[3]) / 2 - (pb[1] + pb[3]) / 2 * s)
    canvas.paste(small, (ox, oy))
    if palette:
        canvas = quantise(canvas, palette)
    return canvas


def load_palette():
    cols = [tuple(c["rgb"]) for c in json.load(open(PALETTE_48))]
    return cols


def quantise(im, cols):
    pal = Image.new("P", (1, 1)); flat = []
    for c in cols: flat += list(c)
    flat += [0, 0, 0] * (256 - len(cols)); pal.putpalette(flat)
    q = im.convert("RGB").quantize(palette=pal, dither=Image.NONE).convert("RGB")
    # the flat background stays the device background; only the subject is quantised to the ramps
    out = Image.new("RGB", im.size, BG); out.paste(q, mask=mask_of(im).convert("L"))
    return out


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def remap_pigments(im, src_slots, dst_slots):
    """Generic per species: the type specimen's painted pixels recoloured to the individual's pool values,
    slot by slot: a pixel is assigned to the specimen slot whose pigment it is nearest in chroma, and keeps
    its own luminance ratio against that pigment."""
    pairs = []
    for s in src_slots:
        d = next((t for t in dst_slots if t["slot"] == s["slot"]), None)
        if not d: continue
        for i, p in enumerate(s["pigments"]):
            q = d["pigments"][min(i, len(d["pigments"]) - 1)]
            pairs.append((hexrgb(p), hexrgb(q)))
    if not pairs: return im
    px = im.convert("RGB").load(); w, h = im.size; out = Image.new("RGB", im.size); op = out.load()
    def luma(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    def chroma(c):
        l = max(1.0, luma(c)); return (c[0] / l, c[1] / l, c[2] / l)
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if abs(c[0] - BG[0]) + abs(c[1] - BG[1]) + abs(c[2] - BG[2]) <= 28: op[x, y] = c; continue
            cc = chroma(c); best = min(pairs, key=lambda pq: sum((a - b) ** 2 for a, b in zip(chroma(pq[0]), cc)))
            p, q = best
            if p == q: op[x, y] = c; continue
            ratio = luma(c) / max(1.0, luma(p))
            op[x, y] = tuple(max(0, min(255, round(v * ratio))) for v in q)
    return out


def cmd_derive():
    palette = load_palette()
    measures = {}
    for sp in SPECIES:
        mem = members(sp)
        spec = next(m for m in mem if m["level"] == "species")
        spec_man = manifest(spec["dir"])
        spec_unique = None
        for m in mem:
            d = os.path.join(HERE, "unique", sp, m["id"]); raw = os.path.join(d, "station-raw.png")
            if not os.path.exists(raw): continue
            im = Image.open(raw).convert("RGB")
            # 1024 square → the 620 square the controls were padded to → the 600×620 large frame → Station 300×310
            im620 = im.resize((620, 620), Image.LANCZOS); large = im620.crop((10, 0, 610, 620))
            large.save(os.path.join(d, "station-600x620.png"))
            station = fit_to_control(large, os.path.join(m["dir"], "silhouette.three-quarter.station.png"), (300, 310))
            station.save(os.path.join(d, "station-300x310.png"))
            companion = fit_to_control(large, os.path.join(m["dir"], "silhouette.three-quarter.companion.png"), (280, 300), palette)
            companion.save(os.path.join(d, "companion-derived-280x300.png"))
            token = fit_to_control(large, os.path.join(m["dir"], "silhouette.three-quarter.tile.png"), (48, 48), palette)
            token.save(os.path.join(d, "token-derived-48.png"))
            ctrl = silhouette_mask(os.path.join(m["dir"], "silhouette.three-quarter.station.png"))
            measures[m["id"]] = {"species": sp, "level": m["level"], "stationSilhouetteIoU": round(iou(mask_of(station), ctrl), 3)}
            if m["level"] == "species": spec_unique = (large, d)
        if not spec_unique: continue
        large, _ = spec_unique
        for m in mem:
            if m["level"] == "species": continue
            d = os.path.join(HERE, "unique", sp, m["id"]); os.makedirs(d, exist_ok=True)
            man = manifest(m["dir"])
            generic_large = remap_pigments(large, spec_man["sketch"]["slots"], man["sketch"]["slots"])
            companion = fit_to_control(generic_large, os.path.join(spec["dir"], "silhouette.three-quarter.companion.png"), (280, 300), palette)
            companion.save(os.path.join(d, "companion-generic-280x300.png"))
            token = fit_to_control(generic_large, os.path.join(spec["dir"], "silhouette.three-quarter.tile.png"), (48, 48), palette)
            token.save(os.path.join(d, "token-generic-48.png"))
            if m["id"] in measures:
                own = silhouette_mask(os.path.join(m["dir"], "silhouette.three-quarter.tile.png"))
                measures[m["id"]]["tokenDerivedIoU"] = round(iou(mask_of(Image.open(os.path.join(d, "token-derived-48.png"))), own), 3)
                measures[m["id"]]["tokenGenericIoU"] = round(iou(mask_of(token), own), 3)
    json.dump(measures, open(os.path.join(HERE, "measurements.json"), "w"), indent=1)
    print(json.dumps(measures, indent=1))


# --- sheets ------------------------------------------------------------------------------------------------
def call_table(prompts):
    """Calls per cut-off (a stage, a mibi of three stages with retries at 20 percent, a kit's year at 40 mibis) and the
    seconds a Station call takes. The cost of each call is in the ledger."""
    ok = [c for c in prompts["calls"] if c.get("status") == "ok"]
    g = [c for c in ok if c["service"] == "gemini"]; r = [c for c in ok if c["service"] == "retro-diffusion"]
    gsec = sum(c["seconds"] for c in g) / len(g) if g else 0.0
    retries = 1.2; stages = 3
    cut = {
        "A. everything at size": {"calls": 3, "note": "Station main and side painted, token painted at size (Companion derived here: painting at size needs a 280 px model)"},
        "B. down to the Companion": {"calls": 2, "note": "Station main and side painted; Companion derived; token generic"},
        "C. Station main only": {"calls": 1, "note": "Station main painted; Companion derived; side plain; token generic"},
        "D. adult only": {"calls": 1 / 3, "note": "one call a mibi"},
    }
    for k, v in cut.items():
        v["calls"] = round(v["calls"], 3); v["callsPerMibi"] = round(v["calls"] * stages, 2); v["callsPerMibiWithRetries"] = round(v["calls"] * stages * retries, 2); v["callsPerKitYear40"] = round(v["calls"] * stages * retries * 40, 1)
    return {"stationCallSeconds": round(gsec, 1), "geminiCalls": len(g), "rdCalls": len(r), "tokenPainted": bool(r), "cutoffs": cut}


def label(draw, xy, text):
    draw.text(xy, text, fill=(40, 40, 50))


def cmd_sheets():
    prompts = load_prompts(); calls = call_table(prompts)
    json.dump(calls, open(os.path.join(HERE, "calls.json"), "w"), indent=1)
    measures = json.load(open(os.path.join(HERE, "measurements.json"))) if os.path.exists(os.path.join(HERE, "measurements.json")) else {}
    os.makedirs(os.path.join(HERE, "sheets"), exist_ok=True)
    cols = [("unique Station 300x310", 300), ("plain (rig) 300x310", 300), ("Companion derived 280x300", 280), ("Companion generic 280x300", 280), ("token derived 1x 3x", 160), ("token generic 1x 3x", 160), ("token painted at size 1x 3x", 160)]
    colcost = {0: f"C: {calls['cutoffs']['C. Station main only']['callsPerMibiWithRetries']:.1f} calls/mibi", 1: "no call (offline)", 2: "derived: no call", 3: "generic: no call", 4: "derived: no call", 5: "generic: no call", 6: f"A: +{3 * 1.2:.1f} calls/mibi" if calls["tokenPainted"] else "A: not painted"}
    gap = 12; rowh = 310 + 34
    for sp in SPECIES:
        mem = members(sp)
        W = gap + sum(w + gap for _, w in cols); H = 48 + len(mem) * rowh
        sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
        label(draw, (gap, 8), f"{sp} stage 1 cut-off trial, device size at 1x. Station call {calls['stationCallSeconds']} s ({GEMINI_MODEL}). Rows: type specimen then three individuals.")
        x = gap
        for i, (name, w) in enumerate(cols):
            label(draw, (x, 26), name); label(draw, (x, 36), colcost[i]); x += w + gap
        for r, m in enumerate(mem):
            y = 48 + r * rowh; x = gap
            d = os.path.join(HERE, "unique", sp, m["id"])
            def put(path, zoom=1):
                nonlocal x
                if os.path.exists(path):
                    im = Image.open(path).convert("RGB")
                    if zoom > 1: im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
                    sheet.paste(im, (x, y))
                    return im.width
                return 0
            put(os.path.join(d, "station-300x310.png")); x += 300 + gap
            put(os.path.join(m["dir"], "shaded.three-quarter.station.png")); x += 300 + gap
            put(os.path.join(d, "companion-derived-280x300.png")); x += 280 + gap
            put(os.path.join(d, "companion-generic-280x300.png")); x += 280 + gap
            for f in ["token-derived-48.png", "token-generic-48.png", "token-painted-48.png"]:
                x0 = x; put(os.path.join(d, f)); x = x0 + 56; put(os.path.join(d, f), 3); x = x0 + 160 + gap
            me = measures.get(m["id"], {})
            label(draw, (gap, y + 312), f"{m['id']}  seed {m.get('seed')}  sha256 {(m.get('genomeSha256') or '')[:12]}   station silhouette IoU {me.get('stationSilhouetteIoU', '—')}   token IoU derived {me.get('tokenDerivedIoU', '—')} generic {me.get('tokenGenericIoU', '—')}")
        sheet.save(os.path.join(HERE, "sheets", f"{sp}.png"))
        print("sheet", sp, sheet.size)
    print(json.dumps(calls, indent=1))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    rest = [a for a in sys.argv[2:] if not a.startswith("--")]
    if cmd == "controls": cmd_controls()
    elif cmd == "paint": cmd_paint(rest)
    elif cmd == "token": cmd_token(rest, check="--check" in sys.argv)
    elif cmd == "fetch": cmd_fetch()
    elif cmd == "derive": cmd_derive()
    elif cmd == "sheets": cmd_sheets()
    else: print(__doc__)
