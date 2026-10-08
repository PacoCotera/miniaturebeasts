#!/usr/bin/env python3
"""The Grow painting service (art-pipeline.md v2 §3–§5, the lead's brief of 2026-10-08): a genome in,
the Station-size painted set out, checked, derived down, laid out by genome hash, every call logged
with its cost. It runs on the sandbox VM: Node 22 for the controls and the plain placeholder
(grow/controls.mjs), Python 3 with Pillow for the calls, the checks, the derived sizes and the sheets.

  python3 grow/service.py paint --species S01 --members 6        # the first six of the reference set (paid)
  python3 grow/service.py paint --species S01 --genome g.json    # one genome (paid)
  python3 grow/service.py paint --species S01 --digest S01-26c1ef67
  python3 grow/service.py calibrate                              # the checks on the stage 1 paintings, no calls
  python3 grow/service.py report                                 # costs.json and the sheets, no calls

Per genome, under grow/out/<species>/<sha256[:16]>/ (deterministic: same genome, same directory):
  genome.json, controls/ (the control images and legend, from controls.mjs), plain/ (the placeholder),
  raw/<view>-<attempt>.png (the model's 1024² output, not committed),
  station-portrait-600x620.png and station-portrait-300x310.png, station-side-600x620.png and
  station-side-300x310.png (the painted set, or the plain placeholder where painting failed twice),
  companion-280x300.png and token-48.png (derived from the portrait), manifest.json.
Every paid call is appended to grow/log.jsonl: prompt, images by name and SHA-256, response id,
usage, cost, seconds, the checks it passed or failed. Keys come from the environment and are never
written.

The checks (one named retry, then the placeholder): the painted silhouette against the control's
(IoU after fitting by bounds, the stage 1 threshold 0.85); every part of the index pass covered by
paint (the part check, which catches a body turned or a wing re-laid); every pigment slot painted
in its own colour (the slot check: the median paint under the slot map, not clearly nearer another slot's pigment in Lab).
"""
import base64, glob, hashlib, http.client, io, json, os, subprocess, sys, threading, time, uuid, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(WB))
OUT = os.path.join(HERE, "out")
PROMPTS = os.path.join(HERE, "prompts.json")
ART_DIRECTION = open(os.path.join(HERE, "art-direction.txt")).read().strip()
PROMPT_VERSION = 4  # 1: the stage 1 template over the controls; 2: art direction, controls, the genome's description and the species reference as separate fields; 3: the controls named as structure only, structural checks in place of the silhouette gate, control variants; 4: the Loika's rig calibrated to Pip, variant B with only the named markings and a drawing's tolerance in step 1, crisp controls
CONTROL_VARIANTS = ("blurred", "crisp", "lowres", "twostep")  # how the shaded control is sent: blurred so its facets cannot be copied (the default), as rendered, or at a quarter of the pixels; twostep: variant B, a HiBit drawing from the softened key and index passes, then a style transfer
BOARD = os.path.join(REPO, "art/visual-directions/02-miniature-lives.png")  # the Miniature Lives concept board, the material reference of the Loika's own making
BLUR_RADIUS, LOWRES_SIZE = 5, 256
SPECIES_DIR = os.path.join(HERE, "species")  # the species' type specimen painting, the reference image of every individual's call
REF = os.path.join(WB, "out", "reference")
BG = (246, 243, 236)
STYLE_REF = os.path.join(REPO, "art/miniature-lives/assets/rich-plain-300x310.png")
PALETTE_48 = os.path.join(REPO, "art/retro-diffusion-trial/companion-palette-48.json")
GEMINI_MODEL = os.environ.get("GROW_GEMINI_MODEL", "gemini-3.1-flash-image")
# USD per million tokens, ai.google.dev/gemini-api/docs/pricing on 2026-10-08 (standard tier).
GEMINI_PRICES = {"gemini-3.1-flash-image": {"input": 0.50, "output": 60.0}, "gemini-3.1-flash-lite-image": {"input": 0.25, "output": 30.0}, "gemini-3-pro-image": {"input": 2.00, "output": 120.0}, "gemini-2.5-flash-image": {"input": 0.30, "output": 30.0}}
VIEWS = ["portrait", "side"]
CHECKS_VERSION = "mb-grow-checks/3"                    # band, span, proportions, slots
PART_MIN = 0.60                                       # a gated part must hold paint along this share of its drawn length (its span)
BAND_TOL, BAND_MAX = 0.04, 0.10                       # the tolerance band round the drawn body (share of its size) and how much of the body may lie outside it or be left inside it
PROPORTION_AREA_MIN, PROPORTION_TOL = 0.05, 0.15      # the parts whose proportions are gated (share of the body) and the tolerance on their extent
DRAWING_TOL = 0.25                                    # variant B's step 1 is a drawing, not a repaint: a wider proportion tolerance
SLOT_MARGIN = (1.5, 8)                                # a slot fails when its paint is clearly nearer another slot's pigment: own distance > 1.5 × nearest + 8 (Lab)
PART_AREA_MIN, SLOT_AREA_MIN, CELL_AREA_MIN = 0.02, 0.01, 0.05             # parts, slots and part-by-slot cells smaller than this share of the body are not gated (eyes, feelers, feet)
LOG_LOCK = threading.Lock()


# --- files -------------------------------------------------------------------------------------------------
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p): return sha_bytes(open(p, "rb").read())
def b64(b): return base64.b64encode(b).decode()
def now(): return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def png_bytes(im):
    buf = io.BytesIO(); im.save(buf, "PNG"); return buf.getvalue()


def flat_rgb(path):
    im = Image.open(path).convert("RGBA"); out = Image.new("RGB", im.size, BG); out.paste(im, mask=im.split()[3]); return out


def pad_square(im, size=620):
    canvas = Image.new("RGB", (size, size), BG); canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2)); return canvas


def read_log():
    if os.path.exists(PROMPTS): return json.load(open(PROMPTS))["calls"]
    return []


def log_call(rec):
    with LOG_LOCK:
        calls = read_log(); calls.append(rec)
        doc = {"schemaVersion": 1, "purpose": "The Grow painting service: every paid call with its three prompt fields (artDirection, description, reference) beside the controls text and the assembled prompt, its image inputs by name and SHA-256, response id, usage, cost, seconds and checks. No key material.", "calls": calls}
        tmp = PROMPTS + ".tmp"; json.dump(doc, open(tmp, "w"), indent=1); open(tmp, "a").write("\n"); os.replace(tmp, PROMPTS)


# --- the controls (Node) ----------------------------------------------------------------------------------
def prepare(species, genome=None, digest=None):
    """Render the controls and the plain placeholder for one genome; returns its directory."""
    cmd = ["node", os.path.join(HERE, "controls.mjs"), "--species", species, "--out-root", OUT]
    if genome: cmd += ["--genome", genome]
    elif digest: cmd += ["--digest", digest]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=WB)
    if r.returncode != 0: raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    return json.loads(r.stdout.strip().splitlines()[-1])


# --- masks and measures ----------------------------------------------------------------------------------
def mask_of(im, thresh=28):
    """The subject of a painting on the flat ground: pixels further than `thresh` (L1) from the ground."""
    px = im.convert("RGB").load(); w, h = im.size
    m = Image.new("1", im.size, 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) > thresh: mp[x, y] = 1
    return m


def silhouette_mask(path):
    return Image.open(path).convert("L").point(lambda v: 255 if v < 128 else 0).convert("1")


def iou(a, b):
    ap, bp = a.load(), b.load(); w, h = a.size; inter = union = 0
    for y in range(h):
        for x in range(w):
            x1, x2 = ap[x, y] != 0, bp[x, y] != 0
            inter += x1 and x2; union += x1 or x2
    return inter / union if union else 0.0


def fit_to_control(painted, control_sil_path, out_size, palette=None):
    """The Station's rule for a derived size: scale the painted subject so its bounds match the control
    silhouette's bounds at the target size, centred on them, on the flat ground; quantise to the palette
    where one is given (the subject only; the ground stays the device ground)."""
    ctrl = silhouette_mask(control_sil_path); cb = ctrl.getbbox()
    pm = mask_of(painted); pb = pm.getbbox()
    if not cb or not pb: return Image.new("RGB", out_size, BG)
    s = min((cb[2] - cb[0]) / max(1, pb[2] - pb[0]), (cb[3] - cb[1]) / max(1, pb[3] - pb[1]))
    w, h = max(1, round(painted.width * s)), max(1, round(painted.height * s))
    small = painted.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGB", out_size, BG)
    canvas.paste(small, (round((cb[0] + cb[2]) / 2 - (pb[0] + pb[2]) / 2 * s), round((cb[1] + cb[3]) / 2 - (pb[1] + pb[3]) / 2 * s)))
    return quantise(canvas, palette) if palette else canvas


def load_palette():
    return [tuple(c["rgb"]) for c in json.load(open(PALETTE_48))]


def quantise(im, cols):
    pal = Image.new("P", (1, 1)); flat = []
    for c in cols: flat += list(c)
    flat += [0, 0, 0] * (256 - len(cols)); pal.putpalette(flat)
    q = im.convert("RGB").quantize(palette=pal, dither=Image.NONE).convert("RGB")
    out = Image.new("RGB", im.size, BG); out.paste(q, mask=mask_of(im).convert("L")); return out


def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def lab(c):
    """sRGB → CIE Lab (D65), for the colour distances of the slot check."""
    r, g, b = [((v / 255 + 0.055) / 1.055) ** 2.4 if v / 255 > 0.04045 else v / 255 / 12.92 for v in c]
    x, y, z = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def dist(a, b): return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def colour_masks(path, colours, tol=6):
    """One bit mask per flat colour of a control pass (the slot map, the index map)."""
    im = Image.open(path).convert("RGB"); px = im.load(); w, h = im.size
    masks = {k: Image.new("1", im.size, 0) for k in colours}; mp = {k: m.load() for k, m in masks.items()}
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c == (0, 0, 0): continue
            for k, col in colours.items():
                if abs(c[0] - col[0]) + abs(c[1] - col[1]) + abs(c[2] - col[2]) <= tol: mp[k][x, y] = 1; break
    return masks


def erode(mask, r):
    return mask.convert("L").filter(ImageFilter.MinFilter(2 * r + 1)).point(lambda v: 255 if v > 127 else 0).convert("1")


def count(mask):
    return sum(1 for v in mask.getdata() if v)


def dilate(mask, r):
    return mask.convert("L").filter(ImageFilter.MaxFilter(2 * r + 1)).point(lambda v: 255 if v > 127 else 0).convert("1")


def bbox_size(mask):
    b = mask.getbbox(); return (b[2] - b[0], b[3] - b[1]) if b else (0, 0)


def ImageChops_subtract(a, b):
    """a AND NOT b for two "1" masks."""
    from PIL import ImageChops
    return ImageChops.subtract(a.convert("L"), b.convert("L")).point(lambda v: 255 if v > 127 else 0).convert("1")


def check(painted_large, ctrl, legend, proportion_tol=PROPORTION_TOL):
    """The checks of a painting at 600×620 against its controls {silhouette, index, slots} (paths): the
    structure (every part present where the part map puts it; the paint within a tolerance band of the
    drawn body), the proportions (each part's painted extent against the drawn extent, relative to the
    body, within 15 %), the slots (each slot painted in its own pigment). The silhouette IoU is reported,
    not gated: the painter owns the volume. Returns the scores and the reasons it fails, named for the retry."""
    sil = silhouette_mask(ctrl["silhouette"]); body = count(sil)
    pm = mask_of(painted_large)
    fitted = fit_to_control(painted_large, ctrl["silhouette"], painted_large.size)
    fm = mask_of(fitted)
    size = max(bbox_size(sil))
    res = {"silhouetteIoU": round(iou(fm, sil), 3), "silhouetteIoUInPlace": round(iou(pm, sil), 3), "parts": {}, "proportions": {}, "slots": {}, "reasons": []}
    # the band check: paint outside the drawn body dilated by the tolerance, and drawn body eroded by it left unpainted, each as a share of the body
    tol = max(2, round(BAND_TOL * size))
    outside = count(ImageChops_subtract(fm, dilate(sil, tol))) / body
    missing = count(ImageChops_subtract(erode(sil, tol), fm)) / body
    res["outside"] = round(outside, 3); res["missing"] = round(missing, 3); res["bandTolerancePx"] = tol
    if outside > BAND_MAX: res["reasons"].append(f"paint lies well outside the drawn body ({outside:.0%} of the body beyond a {tol} px band): a part was added, moved or re-laid")
    if missing > BAND_MAX: res["reasons"].append(f"part of the drawn body is left unpainted ({missing:.0%} of the body inside a {tol} px band): a part was dropped or moved")
    # the part check: each part of the index pass must have paint where the map puts it: along the drawn
    # part's longer axis, the share of positions where the tolerance band round the part holds paint (its
    # span), so a part painted thinner or rounder passes and a part dropped, moved or re-laid fails; the
    # pixel coverage of the part (eroded 2 px) is reported beside it
    parts = {p["part"]: tuple(p["flat"]) for p in legend["parts"]}
    pmasks = colour_masks(ctrl["index"], parts)
    fmp = fm.load(); low = []
    gated_parts = {name: m for name, m in pmasks.items() if count(m) >= PART_AREA_MIN * body}
    for name, m in gated_parts.items():
        em = erode(m, 2); ep = em.load(); w, h = em.size; hit = tot = 0
        for y in range(h):
            for x in range(w):
                if ep[x, y]: tot += 1; hit += 1 if fmp[x, y] else 0
        cov = round(hit / tot, 3) if tot else 1.0
        within = Image.new("1", fm.size, 0); within.paste(fm, mask=dilate(m, tol).convert("L"))
        b = m.getbbox(); span = 1.0
        if b:
            along_x = (b[2] - b[0]) >= (b[3] - b[1]); n = (b[2] - b[0]) if along_x else (b[3] - b[1]); have = 0
            for k in range(n):
                strip = within.crop((b[0] + k, b[1], b[0] + k + 1, b[3])) if along_x else within.crop((b[0], b[1] + k, b[2], b[1] + k + 1))
                if strip.getbbox(): have += 1
            span = round(have / n, 3) if n else 1.0
        res["parts"][name] = {"span": span, "coverage": cov}
        if span < PART_MIN: low.append(f"{name} (painted along {span:.0%} of its length)")
    if low: res["reasons"].append("a part is missing or moved from where the part map puts it: " + ", ".join(low))
    # the proportion check: each large part's painted extent (the paint within the tolerance band round the
    # drawn part) over the painted body's extent, against the drawn part's over the drawn body's, within
    # 15 % plus the band's own width
    psize = max(bbox_size(fm)) or 1; csize = size or 1; off = []
    for name, m in gated_parts.items():
        if count(m) < PROPORTION_AREA_MIN * body: continue
        within = Image.new("1", fm.size, 0); within.paste(fm, mask=dilate(m, tol).convert("L"))
        rc = max(bbox_size(m)) / csize; rp = max(bbox_size(within)) / psize
        ok = abs(rp - rc) <= proportion_tol * rc + 2 * tol / csize
        res["proportions"][name] = {"drawn": round(rc, 3), "painted": round(rp, 3), "ok": ok}
        if not ok: off.append(f"the {name} is {'larger' if rp > rc else 'smaller'} than drawn ({rp:.2f} of the body against {rc:.2f})")
    if off: res["reasons"].append("the proportions are off: " + ", ".join(off))
    # the slot check: under each slot of the slot map (eroded 3 px), the paint's median colour must not
    # be clearly nearer (in Lab) another gated slot's pigment than its own: a slot painted in another
    # slot's colour fails; a pastel or darkened rendering of its own pigment passes. The per-pixel
    # agreement (nearest pigment per pixel) is reported beside it, not gated: shading drifts a pixel.
    flats = {}
    for s in legend["slots"]:
        flats[s["slot"]] = tuple(s["flat"])
        if s.get("secondHalf"): flats[s["slot"] + "#2"] = tuple(s["secondHalf"])
    smasks = colour_masks(ctrl["slots"], flats)
    gated = {k for k, m in smasks.items() if count(m) >= SLOT_AREA_MIN * body}
    pigments = {}  # pigment rgb → the gated slots that carry it (two slots may share a pigment; the eye slots are too small to compete)
    for s in legend["slots"]:
        if s["slot"] in gated or s["slot"] + "#2" in gated:
            for p in s["pigments"]: pigments.setdefault(hexrgb(p), set()).add(s["slot"])
    pigc = [(c, lab(c)) for c in pigments]
    fpx = fitted.load(); wsum = wtot = 0; wrong = []
    cells = []  # (key, cell name, mask): each gated slot split by the parts of the index pass, so a torso painted in another colour fails although the head holds
    for key, m in smasks.items():
        if key not in gated: continue
        for pname, pmask in pmasks.items():
            cell = Image.new("1", m.size, 0); cell.paste(m, mask=pmask.convert("L"))
            if count(cell) >= CELL_AREA_MIN * body: cells.append((key, f"{key}@{pname}", cell))
    for key, name, m in cells:
        slot = key.split("#")[0]
        em = erode(m, 3); ep = em.load(); w, h = em.size; hit = tot = 0; rs, gs, bs = [], [], []
        for y in range(h):
            for x in range(w):
                if not ep[x, y] or not fmp[x, y]: continue
                c = fpx[x, y]; cc = lab(c); tot += 1; rs.append(c[0]); gs.append(c[1]); bs.append(c[2])
                best = min(pigc, key=lambda pc: dist(pc[1], cc))
                hit += 1 if slot in pigments[best[0]] else 0
        if not tot: continue  # a thin cell erodes to nothing: not gated
        for v in (rs, gs, bs): v.sort()
        med = (rs[len(rs) // 2], gs[len(gs) // 2], bs[len(bs) // 2]); mc = lab(med)
        best = min(pigc, key=lambda pc: dist(pc[1], mc))
        own = min(dist(pc[1], mc) for pc in pigc if slot in pigments[pc[0]])
        ok = own <= SLOT_MARGIN[0] * dist(best[1], mc) + SLOT_MARGIN[1]
        agree = round(hit / tot, 3)
        res["slots"][name] = {"agreement": agree, "median": "#%02x%02x%02x" % med, "nearest": "#%02x%02x%02x" % best[0], "ok": ok}
        wsum += agree * tot; wtot += tot
        if not ok: wrong.append(f"the {slot} slot on the {name.split('@')[1]} (painted {res['slots'][name]['median']}, the colour of {'/'.join(sorted(pigments[best[0]]))})")
    res["slotAgreement"] = round(wsum / wtot, 3) if wtot else 1.0
    if wrong: res["reasons"].append("a pigment slot is painted in another slot's colour: " + ", ".join(wrong))
    res["passed"] = not res["reasons"]
    return res


# --- the call ---------------------------------------------------------------------------------------------
VIEW_PHRASE = {"portrait": "from the front quarter, its face toward the viewer's left, as in image 1", "side": "in profile from its right side, the head facing right, as in image 1"}


def controls_text(legend, view):
    """The controls field: what each control image is and what it locks."""
    slots = ", ".join(f"{s['slot']} → {' and '.join(s['pigments'])}" for s in legend["slots"])
    parts = ", ".join(p["part"] for p in legend["parts"])
    t = ("Paint the creature in image 1 exactly as it is drawn: the same silhouette, pose, camera, proportions and framing, every part present, no part added, nothing turned. "
         "Image 1 is its form under one light from the top left. Image 2 is the colour key: the same body with every area flat in the exact pigment it must be painted in; paint each area in a ramp of that colour and no other, never moved, never swapped: "
         f"{slots}. Image 3 is the part map: its colours are labels, not paint; each flat colour is one part of the same body ({parts}); keep every part exactly where it is, at the same size, facing the same way. "
         f"The creature stands still, seen {VIEW_PHRASE[view]}. "
         "The drawings show structure and proportion only: where each part is, how big it is and which colour it carries. Their flat facets, hard edges and small eyes are not the look: "
         "render the volume, the softness, the face and the finish as image 4 does, over this structure.")
    if legend.get("translucent"):
        names = sorted({n["part"] for n in legend["translucent"]})
        t += f" Its {' and '.join(names)}s are thin membranes, lightly translucent: paint them opaque as a flat pale tint of their slot colour with a soft edge, as in image 1, not as glass, with no reflections and nothing showing through."
    return t


def reference_text(reference, view, with_portrait):
    if reference.get("ownKind"):
        t = (f"Image 4 is {reference['what']}: the finished look to match exactly, its treatment, its materials, its face and how the light falls on it. "
             "This creature is one of that kind and differs from it only as the description and the drawings say.")
    else:
        t = (f"Image 4 is {reference['what']}: the treatment to match exactly. This creature is a different species, to be painted in the same hand: "
             "the same materials, the same light, the same kind of face and eyes, the same finish, at the same scale of detail.")
    if with_portrait: t += " Image 5 is this same creature already painted from the front quarter: match its colours, surfaces, markings and face exactly, so the two views are one creature."
    return t


def template(fields, reasons=None):
    """The assembled prompt from its logged fields: artDirection, controls, description, reference."""
    t = fields["artDirection"] + "\n\n" + fields["controls"] + "\n\n" + "The creature: " + fields["description"] + "\n\n" + fields["reference"]
    if reasons: t += "\n\nA previous painting of this creature was rejected because " + "; ".join(reasons) + ". This time keep the silhouette of image 1 and the parts of image 3 exactly, part for part."
    return t + "\n\nOutput one square image."


def gemini_call(parts, record, model=None):
    key = os.environ.get("GEMINI_API_KEY")
    if not key: raise RuntimeError("GEMINI_API_KEY is not in the environment")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model or GEMINI_MODEL}:generateContent"
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"}}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    for attempt in (1, 2):  # a dropped connection (no HTTP status) is retried once after a pause; an HTTP error is not
        try:
            with urllib.request.urlopen(req, timeout=300) as r: res, status = json.loads(r.read().decode()), r.status
            break
        except urllib.error.HTTPError as e: res, status = {"error": e.read().decode()[:2000]}, e.code; break
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError, ConnectionError) as e:
            res, status = {"error": f"connection: {e}"}, 0; record["connectionRetry"] = attempt
            if attempt == 1: time.sleep(15)
    record["seconds"] = round(time.time() - t0, 1); record["httpStatus"] = status
    return status, res


def control_image(path, pass_name, variant):
    """A control image as the call sends it: padded to the 620 square; the shaded pass blurred (the facets
    gone, the form kept) or every control at a quarter of the pixels, by variant."""
    im = pad_square(Image.open(path).convert("RGB"))
    if variant == "blurred" and pass_name == "shaded": im = im.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    if variant == "lowres": im = im.resize((LOWRES_SIZE, LOWRES_SIZE), Image.LANCZOS)
    return png_bytes(im)


def paint_view(d, legend, view, attempt, reasons, reference, portrait_png, variant="crisp"):
    """One paid call for one view; returns (record, painted 600×620 image or None). `reference` is the
    species' reference painting {what, name, png}: the accepted Pip for S01 and for a species' own type
    specimen, else the species' type specimen painting."""
    c = os.path.join(d, "controls")
    imgs = [(f"{p}.{view}.large.png:{variant}", control_image(os.path.join(c, f"{p}.{view}.large.png"), p, variant)) for p in ("shaded", "key", "index")]
    imgs.append((f"reference:{reference['name']}", reference["png"]))
    with_portrait = bool(view == "side" and portrait_png)
    if with_portrait: imgs.append(("station-portrait-600x620.png", png_bytes(pad_square(Image.open(io.BytesIO(portrait_png)).convert("RGB")))))
    fields = {"artDirection": ART_DIRECTION, "controls": controls_text(legend, view), "description": legend["description"]["text"], "reference": reference_text(reference, view, with_portrait)}
    text = template(fields, reasons)
    parts = [{"text": text}] + [{"inline_data": {"mime_type": "image/png", "data": b64(b)}} for _, b in imgs]
    rec = {"id": str(uuid.uuid4()), "service": "gemini", "model": GEMINI_MODEL, "promptVersion": PROMPT_VERSION, "controlVariant": variant, "purpose": f"station-{view}", "attempt": attempt, "species": legend["species"], "genomeDigest": legend["genomeDigest"], "genomeSha256": legend["genomeSha256"],
           "fields": fields, "referenceImage": {"what": reference["what"], "name": reference["name"], "sha256": sha_bytes(reference["png"])}, "prompt": text,
           "images": [{"name": n, "sha256": sha_bytes(b), "bytes": len(b)} for n, b in imgs], "generationConfig": {"responseModalities": ["IMAGE"], "aspectRatio": "1:1", "imageSize": "1K"}, "startedAt": now()}
    status, res = gemini_call(parts, rec)
    if status != 200:
        rec["status"] = "failed"; rec["error"] = res.get("error", res); return rec, None
    rec["responseId"] = res.get("responseId"); rec["modelVersion"] = res.get("modelVersion"); usage = res.get("usageMetadata", {}); rec["usage"] = usage
    prices = GEMINI_PRICES[GEMINI_MODEL]
    rec["costUSD"] = round(usage.get("promptTokenCount", 0) / 1e6 * prices["input"] + usage.get("candidatesTokenCount", 0) / 1e6 * prices["output"], 5)
    part = next((p for p in res.get("candidates", [{}])[0].get("content", {}).get("parts", []) if "inlineData" in p), None)
    if not part:
        rec["status"] = "no-image"; rec["response"] = json.dumps(res)[:1500]; return rec, None
    raw = base64.b64decode(part["inlineData"]["data"])
    os.makedirs(os.path.join(d, "raw"), exist_ok=True)
    im = Image.open(io.BytesIO(raw)).convert("RGB"); im.save(os.path.join(d, "raw", f"{view}-{attempt}.png"))
    rec["output"] = {"file": f"raw/{view}-{attempt}.png", "mimeType": part["inlineData"].get("mimeType"), "size": list(im.size), "sha256": sha_bytes(raw)}
    rec["status"] = "ok"
    # 1024² → the 620 square the controls were padded to → the 600×620 master
    return rec, im.resize((620, 620), Image.LANCZOS).crop((10, 0, 610, 620))


# --- one mibi ---------------------------------------------------------------------------------------------
# --- variant B: two steps, as the Loika was made (art/miniature-lives/prompts.json) ------------------------------
STEP1_WORDS = ("DESIGN AT LOW RESOLUTION FIRST: the subject is designed on a logical 280×300 pixel grid and shown at 2× within the frame. Deliberate contemporary HiBit pixel art, not a detailed painting later pixelated: "
               "crisp connected stepped silhouette edges, broad coherent 2D pixel clusters describing rounded ceramic/resin-like cheek, belly and back volumes, restrained crisp highlights, three or four principal value masses. "
               "Shadow and contour clusters are intentional shape design; a smooth emotional shape despite stepped edges. No photographic grain, fur noise, dither spray, tiny isolated bright speckles, subpixel blur or smooth gradients. "
               "The eye rings and any coat marking the description names stay stronger than lighting; draw no marking, patch, spot, band or ring the description does not name, and no colour the colour key does not carry. A compact affectionate creature with gentle modeled volume, large friendly eyes with a catch light, a tiny curved friendly mouth, one soft upper-left light. "
               "The last image is the Miniature Lives concept board: it supplies rounded tactile personality; its rich landscape rendering is not requested. "
               "The subject alone on a flat uniform ground of exactly #f6f3ec, no scene, no ground, no shadow, no text, no border, no frame; the same size and in the same place as in image 1. Output one square image.")
STEP2_WORDS = ("Image 1 is the anatomy, pose and coat-placement authority: the HiBit drawing of this creature. Image 2 is a tactile material reference only: the species' accepted painting. "
               "Create the same creature as image 1 in the richer, smoothly modeled illustration treatment of image 2. "
               "INVARIANTS FROM IMAGE 1: precisely preserve the silhouette, the body plan, the pose, the gaze, the head-to-body proportion, the limb positions, the crown, the eyes with their rings, every coat colour and the placement of every marking, the scale and the baseline, the upper-left light. No extra individuals, no added anatomy or detail suggesting new traits. "
               "CHANGE ONLY RENDERING TREATMENT: replace stepped pixel edges and shade clusters with smooth, rounded modeled ceramic/resin-like surfaces with very restrained fine material texture; preserve tactile warmth, expressive eyes and compact affectionate personality; keep broad stable value masses; markings stay unambiguous and stronger than light. "
               "Avoid photographic fur noise, excessive gloss, sharp specular glitter. Image 2 provides the soft modeled personality only, not its subject. "
               "The subject alone on a flat uniform ground of exactly #f6f3ec, no scene, no ground, no shadow, no text, no border; the same size and in the same place as in image 1. Output one square image.")


def controls_text_two_step(legend, view):
    slots = ", ".join(f"{s['slot']} → {' and '.join(s['pigments'])}" for s in legend["slots"])
    parts = ", ".join(p["part"] for p in legend["parts"])
    t = ("Draw the creature whose structure images 1 and 2 give. Image 1 is the colour key: the body with every area flat in the exact pigment it carries; keep each area in that colour and no other, never moved, never swapped: "
         f"{slots}. Image 2 is the part map: its colours are labels, not paint; each flat colour is one part ({parts}); keep every part where it is, at the same size, facing the same way. "
         f"The creature stands still, seen {VIEW_PHRASE[view]}. The two images give structure, proportion and colour placement only, as flat shapes; the volume, the softness, the face and the drawing are yours to design.")
    if legend.get("translucent"):
        names = sorted({n["part"] for n in legend["translucent"]})
        t += f" Its {' and '.join(names)}s are thin membranes, lightly translucent: draw them opaque as a flat pale tint of their slot colour, not as glass."
    return t


WING_LINE = "The wings stay folded along the body exactly as drawn; never re-laid, lifted or spread."


def plan_lines(legend):
    """The loader's own lines for the plan, said once after the description: the rig's rules the painter
    must not undo. Winged plans (any flap part): the resting wings fold along the body (envelope E9)."""
    lines = []
    if any(p["part"] == "flap" for p in legend["parts"]): lines.append(WING_LINE)
    return lines


def with_plan_lines(legend, description):
    return " ".join([description] + plan_lines(legend))


def soften(path, radius=2):
    return png_bytes(pad_square(Image.open(path).convert("RGB")).filter(ImageFilter.GaussianBlur(radius)))


def call_logged(text, imgs, rec_fields, d_raw, raw_name, model=None):
    """One paid call: the text and the images in order; the record logged; returns (record, 600×620 image or None)."""
    model = model or GEMINI_MODEL
    parts = [{"text": text}] + [{"inline_data": {"mime_type": "image/png", "data": b64(b)}} for _, b in imgs]
    rec = {"id": str(uuid.uuid4()), "service": "gemini", "model": model, "promptVersion": PROMPT_VERSION, **rec_fields, "prompt": text,
           "images": [{"name": n, "sha256": sha_bytes(b), "bytes": len(b)} for n, b in imgs], "generationConfig": {"responseModalities": ["IMAGE"], "aspectRatio": "1:1", "imageSize": "1K"}, "startedAt": now()}
    status, res = gemini_call(parts, rec, model)
    if status != 200:
        rec["status"] = "failed"; rec["error"] = res.get("error", res); return rec, None
    rec["responseId"] = res.get("responseId"); rec["modelVersion"] = res.get("modelVersion"); usage = res.get("usageMetadata", {}); rec["usage"] = usage
    prices = GEMINI_PRICES[model]
    rec["costUSD"] = round(usage.get("promptTokenCount", 0) / 1e6 * prices["input"] + usage.get("candidatesTokenCount", 0) / 1e6 * prices["output"], 5)
    part = next((p for p in res.get("candidates", [{}])[0].get("content", {}).get("parts", []) if "inlineData" in p), None)
    if not part:
        rec["status"] = "no-image"; rec["response"] = json.dumps(res)[:1500]; return rec, None
    raw = base64.b64decode(part["inlineData"]["data"])
    os.makedirs(d_raw, exist_ok=True)
    im = Image.open(io.BytesIO(raw)).convert("RGB"); im.save(os.path.join(d_raw, raw_name))
    rec["output"] = {"file": raw_name, "mimeType": part["inlineData"].get("mimeType"), "size": list(im.size), "sha256": sha_bytes(raw)}
    rec["status"] = "ok"
    return rec, im.resize((620, 620), Image.LANCZOS).crop((10, 0, 610, 620))


def two_step_view(d, d0, legend, view, reference, portrait_png, man, ctrl):
    """Variant B for one view: step 1 generates the HiBit drawing from the softened key and index passes, the
    description and the Loika's own generate words (checked for structure, one named retry); step 2 style-
    transfers it to the rich treatment with the invariants in words and the species reference as image 2
    (treatment only: its checks are logged, not gated). Returns (view record, painted master or None)."""
    c = os.path.join(d0, "controls"); vrec = {"status": None, "attempts": [], "steps": []}
    common = {"controlVariant": "twostep", "species": legend["species"], "genomeDigest": legend["genomeDigest"], "genomeSha256": legend["genomeSha256"]}
    board = png_bytes(Image.open(BOARD).convert("RGB"))
    reasons = None; drawing = None
    for attempt in (1, 2):
        imgs = [(f"key.{view}.large.png:softened", soften(os.path.join(c, f"key.{view}.large.png"))), (f"index.{view}.large.png:softened", soften(os.path.join(c, f"index.{view}.large.png"))), ("board:02-miniature-lives.png", board)]
        fields = {"controls": controls_text_two_step(legend, view), "description": with_plan_lines(legend, legend["description"]["text"]), "planLines": plan_lines(legend), "generate": STEP1_WORDS}
        text = fields["controls"] + "\n\nThe creature: " + fields["description"] + "\n\n" + fields["generate"]
        if reasons: text += "\n\nA previous drawing was rejected because " + "; ".join(reasons) + ". This time keep the parts of image 2 exactly, part for part."
        rec, im = call_logged(text, imgs, {**common, "purpose": f"station-{view}-step1", "step": 1, "attempt": attempt, "fields": fields, "reasonsGiven": reasons}, os.path.join(d, "raw"), f"{view}-step1-{attempt}.png")
        if im is not None: rec["checks"] = {**check(im, ctrl, legend, DRAWING_TOL), "proportionTolerance": DRAWING_TOL}
        log_call(rec)
        man["calls"] += 1; man["costUSD"] = round(man["costUSD"] + (rec.get("costUSD") or 0), 5); man["seconds"] = round(man["seconds"] + rec.get("seconds", 0), 1)
        vrec["attempts"].append({"callId": rec["id"], "step": 1, "status": rec["status"], "costUSD": rec.get("costUSD"), "seconds": rec.get("seconds"), "checks": rec.get("checks"), "responseId": rec.get("responseId")})
        print(legend["species"], legend["genomeDigest"], "twostep", view, f"step 1 attempt {attempt}", rec["status"], (f"out {rec['checks']['outside']} miss {rec['checks']['missing']} parts {min(v['span'] for v in rec['checks']['parts'].values()) if rec['checks']['parts'] else '-'} slots {rec['checks']['slotAgreement']} {'PASS' if rec['checks']['passed'] else 'FAIL'}" if im is not None else rec.get("error", "")), f"${rec.get('costUSD', 0) or 0:.3f}", flush=True)
        if im is not None and rec["checks"]["passed"]: drawing = im; break
        reasons = rec["checks"]["reasons"] if im is not None else ["the service returned no image"]
    if drawing is None: return vrec, None
    drawing.save(os.path.join(d, f"step1-{view}-600x620.png"))
    fit_to_control(drawing, os.path.join(d0, "controls", f"silhouette.{view}.station.png"), (300, 310)).save(os.path.join(d, f"step1-{view}-300x310.png"))
    imgs = [(f"step1-{view}-600x620.png", png_bytes(pad_square(drawing))), (f"reference:{reference['name']}", reference["png"])]
    fields = {"artDirection": ART_DIRECTION, "transfer": STEP2_WORDS}
    text = fields["artDirection"] + "\n\n" + fields["transfer"]
    if view == "side" and portrait_png: imgs.append(("station-portrait-600x620.png", png_bytes(pad_square(Image.open(io.BytesIO(portrait_png)).convert("RGB"))))); text += " Image 3 is this same creature already painted from the front quarter: match its colours, surfaces, markings and face exactly, so the two views are one creature."
    rec, im = call_logged(text, imgs, {**common, "purpose": f"station-{view}-step2", "step": 2, "attempt": 1, "fields": fields, "referenceImage": {"what": reference["what"], "name": reference["name"], "sha256": sha_bytes(reference["png"])}}, os.path.join(d, "raw"), f"{view}-step2.png")
    if im is not None: rec["checks"] = {**check(im, ctrl, legend), "gated": False}
    log_call(rec)
    man["calls"] += 1; man["costUSD"] = round(man["costUSD"] + (rec.get("costUSD") or 0), 5); man["seconds"] = round(man["seconds"] + rec.get("seconds", 0), 1)
    vrec["attempts"].append({"callId": rec["id"], "step": 2, "status": rec["status"], "costUSD": rec.get("costUSD"), "seconds": rec.get("seconds"), "checks": rec.get("checks"), "responseId": rec.get("responseId")})
    print(legend["species"], legend["genomeDigest"], "twostep", view, "step 2", rec["status"], (f"out {rec['checks']['outside']} miss {rec['checks']['missing']} parts {min(v['span'] for v in rec['checks']['parts'].values()) if rec['checks']['parts'] else '-'} slots {rec['checks']['slotAgreement']} ({'would pass' if rec['checks']['passed'] else 'would fail'}, not gated)" if im is not None else rec.get("error", "")), f"${rec.get('costUSD', 0) or 0:.3f}", flush=True)
    return vrec, im


def pip_reference():
    return {"what": "the accepted painting of Pip, the Loika's type specimen (art/miniature-lives)", "name": "rich-plain-300x310.png", "png": png_bytes(flat_rgb(STYLE_REF)), "ownKind": False}


def species_reference(species, legend):
    """The reference image for an individual's call: the accepted Pip for S01; for another species its
    type specimen painting under grow/species/<species>/, painted once with Pip as its reference (the
    type specimen's own call); Pip again, noted, while that painting is missing."""
    if species == "S01": return {**pip_reference(), "ownKind": True}
    if legend["level"] == "species": return pip_reference()
    p = os.path.join(SPECIES_DIR, species, "portrait-600x620.png")
    if os.path.exists(p): return {"what": f"the accepted painting of this species' type specimen (the {legend['name']})", "name": f"species/{species}/portrait-600x620.png", "png": png_bytes(Image.open(p).convert("RGB")), "ownKind": True}
    r = pip_reference(); r["what"] += " (this species' own type specimen painting is not made yet)"; return r


OUTPUT_FILES = ["station-portrait-600x620.png", "station-portrait-300x310.png", "station-side-600x620.png", "station-side-300x310.png", "companion-280x300.png", "token-48.png"]


def grow(species, genome=None, digest=None, force=False, variant="crisp", views=VIEWS, sub=None, controls_dir=None):
    """One mibi: the controls, the calls per view with one retry, the derived sizes, the manifest. `sub`
    names a variant trial kept under variants/<sub>/ beside the main outputs (portrait only, no reference
    painting kept); the main run keeps the previous prompt version's outputs under v<n>/ for the sheet."""
    d0 = controls_dir or prepare(species, genome, digest)["dir"]
    d = d0 if sub is None else os.path.join(d0, "variants", sub)
    os.makedirs(d, exist_ok=True)
    mpath = os.path.join(d, "manifest.json")
    if os.path.exists(mpath):
        m = json.load(open(mpath))
        if m.get("promptVersion") == PROMPT_VERSION and not force and all(m["views"].get(v, {}).get("status") in ("painted", "plain") for v in views): return m
        if sub is None and m.get("promptVersion", 1) < PROMPT_VERSION:  # keep the previous run beside the new one
            keep = os.path.join(d, f"v{m.get('promptVersion', 1)}"); os.makedirs(keep, exist_ok=True)
            for f in OUTPUT_FILES + ["manifest.json"]:
                if os.path.exists(os.path.join(d, f)): os.replace(os.path.join(d, f), os.path.join(keep, f))
    legend = json.load(open(os.path.join(d0, "controls", "legend.json")))
    reference = species_reference(species, legend)
    man = {"schema": "mb-grow/1", "service": "grow/service.py", "model": GEMINI_MODEL, "promptVersion": PROMPT_VERSION, "controlVariant": variant, "views": {}, "species": species, "name": legend["name"], "level": legend["level"], "genomeDigest": legend["genomeDigest"], "genomeSha256": legend["genomeSha256"],
           "frameVersion": legend["frameVersion"], "catalogue": legend["catalogue"], "controls": legend["schema"], "plainVersion": legend["plainVersion"], "description": legend["description"]["text"], "reference": {"what": reference["what"], "name": reference["name"]},
           "startedAt": now(), "outputs": {}, "calls": 0, "costUSD": 0.0, "seconds": 0.0}
    portrait_png = None
    for view in views:
        ctrl = {p: os.path.join(d0, "controls", f"{p}.{view}.large.png") for p in ("silhouette", "index", "slots")}
        vrec = {"status": None, "attempts": []}
        reasons = None; painted = None
        if variant == "twostep": vrec, painted = two_step_view(d, d0, legend, view, reference, portrait_png, man, ctrl)
        for attempt in ((1, 2) if variant != "twostep" else ()):
            rec, im = paint_view(d0, legend, view, attempt, reasons, reference, portrait_png, variant)
            if sub is not None and im is not None: os.makedirs(os.path.join(d, "raw"), exist_ok=True); im.save(os.path.join(d, "raw", f"{view}-{attempt}.png"))
            rec["reasonsGiven"] = reasons
            if im is not None:
                rec["checks"] = check(im, ctrl, legend)
            log_call(rec)
            man["calls"] += 1; man["costUSD"] = round(man["costUSD"] + (rec.get("costUSD") or 0), 5); man["seconds"] = round(man["seconds"] + rec.get("seconds", 0), 1)
            vrec["attempts"].append({"callId": rec["id"], "status": rec["status"], "costUSD": rec.get("costUSD"), "seconds": rec.get("seconds"), "checks": rec.get("checks"), "responseId": rec.get("responseId")})
            print(species, legend["genomeDigest"], sub or variant, view, f"attempt {attempt}", rec["status"], (f"IoU {rec['checks']['silhouetteIoU']} parts {min(v['span'] for v in rec['checks']['parts'].values()) if rec['checks']['parts'] else '-'} slots {rec['checks']['slotAgreement']} {'PASS' if rec['checks']['passed'] else 'FAIL'}" if im is not None else rec.get("error", "")), f"${rec.get('costUSD', 0) or 0:.3f}", flush=True)
            if im is not None and rec["checks"]["passed"]: painted = im; break
            reasons = rec["checks"]["reasons"] if im is not None else ["the service returned no image"]
            if attempt == 2 and im is not None: vrec["lastRejected"] = f"raw/{view}-2.png"
        if painted is not None:
            vrec["status"] = "painted"
            painted.save(os.path.join(d, f"station-{view}-600x620.png"))
            fit_to_control(painted, os.path.join(d0, "controls", f"silhouette.{view}.station.png"), (300, 310)).save(os.path.join(d, f"station-{view}-300x310.png"))
            if view == "portrait": portrait_png = png_bytes(painted)
        else:
            vrec["status"] = "plain"  # twice rejected: the placeholder is served for this view
            for size in ("600x620", "300x310"):
                open(os.path.join(d, f"station-{view}-{size}.png"), "wb").write(open(os.path.join(d0, "plain", f"plain-{view}-{size}.png"), "rb").read())
        man["views"][view] = vrec
    # the Companion and the token derive from the portrait (painted or placeholder)
    palette = load_palette()
    if man["views"]["portrait"]["status"] == "painted":
        large = Image.open(os.path.join(d, "station-portrait-600x620.png")).convert("RGB")
        fit_to_control(large, os.path.join(d0, "controls", "silhouette.portrait.companion.png"), (280, 300), palette).save(os.path.join(d, "companion-280x300.png"))
        fit_to_control(large, os.path.join(d0, "controls", "silhouette.portrait.tile.png"), (48, 48), palette).save(os.path.join(d, "token-48.png"))
    else:
        for f, src in (("companion-280x300.png", "plain-companion-280x300.png"), ("token-48.png", "plain-token-48.png")): open(os.path.join(d, f), "wb").write(open(os.path.join(d0, "plain", src), "rb").read())
    for f in OUTPUT_FILES:
        if os.path.exists(os.path.join(d, f)): man["outputs"][f] = sha_file(os.path.join(d, f))
    man["finishedAt"] = now()
    json.dump(man, open(mpath, "w"), indent=1); open(mpath, "a").write("\n")
    if sub is None and legend["level"] == "species" and species != "S01":  # the species' reference painting, kept once
        os.makedirs(os.path.join(SPECIES_DIR, species), exist_ok=True)
        for view in VIEWS:
            if man["views"][view]["status"] == "painted":
                open(os.path.join(SPECIES_DIR, species, f"{view}-600x620.png"), "wb").write(open(os.path.join(d, f"station-{view}-600x620.png"), "rb").read())
        json.dump({"species": species, "genomeSha256": legend["genomeSha256"], "views": {v: man["views"][v]["status"] for v in VIEWS}, "description": legend["description"]["text"], "madeAt": man["finishedAt"], "manifest": os.path.relpath(mpath, HERE)}, open(os.path.join(SPECIES_DIR, species, "reference.json"), "w"), indent=1)
    return man


def cmd_paint(a):
    species = a.get("species"); jobs = []
    if a.get("extremes") is not None:  # the worst cases rolled by grow/extremes.mjs: --extremes "0,7,37" (case numbers) or --extremes all; distinct genomes only
        idx = json.load(open(os.path.join(OUT, species, "extremes", "index.json")))
        want = None if a["extremes"] in ("", "all") else {int(x) for x in a["extremes"].split(",")}
        seen = set()
        for i, c in enumerate(idx["cases"]):
            if want is not None and i not in want: continue
            g = json.load(open(os.path.join(HERE, c["dir"], "genome.json"))); key = json.dumps(sorted(g["loci"].items()))
            if key in seen or c["status"] != "built": continue
            seen.add(key); jobs.append((species, os.path.join(HERE, c["dir"], "genome.json"), None))
    elif a.get("genome"): jobs.append((species, a["genome"], None))
    elif a.get("digest"): jobs.append((species, None, a["digest"]))
    else:
        n = int(a.get("members", 6))
        for sp in ([species] if species else ["S01", "S09", "S12"]):
            idx = json.load(open(os.path.join(REF, sp, "index.json")))
            seen = set()  # the first n distinct genomes (two members of a reference set can share one)
            for m in idx["members"]:
                if m["genomeSha256"] in seen: continue
                seen.add(m["genomeSha256"]); jobs.append((sp, os.path.join(REF, sp, m["dir"], "genome.json"), None))
                if len(seen) == n: break
    force = a.get("force") is not None
    variant = a.get("control", "crisp"); assert variant in CONTROL_VARIANTS, f"--control one of {CONTROL_VARIANTS}"
    views = a["views"].split(",") if a.get("views") else VIEWS
    sub = a.get("sub")  # a variant trial kept beside the main outputs, e.g. --control crisp --views portrait --sub crisp
    # the species' type specimen painting first (the reference image of every other call of that species)
    for sp in sorted({j[0] for j in jobs}):
        if sub is not None or sp == "S01" or (os.path.exists(os.path.join(SPECIES_DIR, sp, "portrait-600x620.png")) and not force): continue
        spec = os.path.join(REF, sp, "type-specimen", "genome.json")
        man = grow(sp, spec, None, force, variant); print(sp, "type specimen", {v: man["views"][v]["status"] for v in VIEWS}, f"{man['calls']} calls ${man['costUSD']:.3f}", flush=True)
        jobs = [j for j in jobs if not (j[0] == sp and j[1] == spec)]
    with ThreadPoolExecutor(max_workers=int(a.get("workers", 3))) as ex:
        for man in ex.map(lambda j: grow(j[0], j[1], j[2], force, variant, views, sub), jobs):
            print(man["species"], man["genomeDigest"], sub or variant, {v: man["views"][v]["status"] for v in man["views"]}, f"{man['calls']} calls ${man['costUSD']:.3f}", flush=True)


# --- calibration on the stage 1 paintings (no calls) --------------------------------------------------------
def cmd_calibrate(a):
    """The checks on the twelve stage 1 paintings (three-quarter view, the old dithered controls), beside
    the stage 1 silhouette IoU, so the gates rest on evidence; with --previous, on the last attempt of
    every view of the previous Grow run under out/ (its raw outputs), beside the verdict that run gave."""
    if "previous" in a:
        for d, m in manifests():
            legend = json.load(open(os.path.join(d, "controls", "legend.json")))
            for view in VIEWS:
                att = m["views"][view]["attempts"]; n = len(att)
                raw = os.path.join(d, "raw", f"{view}-{n}.png")
                if not os.path.exists(raw): continue
                im = Image.open(raw).convert("RGB").resize((620, 620), Image.LANCZOS).crop((10, 0, 610, 620))
                r = check(im, {p: os.path.join(d, "controls", f"{p}.{view}.large.png") for p in ("silhouette", "index", "slots")}, legend)
                was = att[-1].get("checks") or {}
                print(m["species"], m["genomeDigest"], view, "was", "PASS" if was.get("passed") else "FAIL", f"IoU {r['silhouetteIoU']}", "now", "PASS" if r["passed"] else "FAIL", f"out {r['outside']} miss {r['missing']} parts {min(v['span'] for v in r['parts'].values()) if r['parts'] else '-'}", "|", "; ".join(r["reasons"])[:220], flush=True)
        return
    rows = []
    for sp in ["S01", "S09", "S12"]:
        idx = json.load(open(os.path.join(WB, "stage1", "controls", sp, "index.json")))
        for m in idx["members"]:
            raw = os.path.join(WB, "stage1", "unique", sp, m["id"], "station-raw.png")
            if not os.path.exists(raw): continue
            cdir = os.path.join(WB, "stage1", "controls", sp, m["id"]); man = json.load(open(os.path.join(cdir, "manifest.json")))
            im = Image.open(raw).convert("RGB").resize((620, 620), Image.LANCZOS).crop((10, 0, 610, 620))
            idx_im = Image.open(os.path.join(cdir, "index.three-quarter.large.png")).convert("RGB")
            cols = sorted(set(c for c in idx_im.getdata() if c != (0, 0, 0)))
            legend = {"slots": man["sketch"]["slots"], "parts": [{"part": f"p{i}", "flat": list(c)} for i, c in enumerate(cols)]}
            # stage 1 kept no large silhouette: the index pass's body stands in for it
            sil = idx_im.convert("RGB").point(lambda v: 0 if v else 255).convert("L").point(lambda v: 0 if v < 255 else 255)
            sil_path = os.path.join(WB, "out", f"calibrate-{m['id']}-silhouette.png"); sil.save(sil_path)
            r = check(im, {"silhouette": sil_path, "index": os.path.join(cdir, "index.three-quarter.large.png"), "slots": os.path.join(cdir, "slots.three-quarter.large.png")}, legend)
            os.remove(sil_path)
            rows.append((sp, m["id"], r))
            print(sp, m["id"], "IoU", r["silhouetteIoU"], "inPlace", r["silhouetteIoUInPlace"], "out", r["outside"], "miss", r["missing"], "parts min", min(v["span"] for v in r["parts"].values()) if r["parts"] else "-", "slots", r["slotAgreement"], r["slots"], "PASS" if r["passed"] else "FAIL", r["reasons"])


# --- the control experiment: Pip's own silhouette as the control ----------------------------------------------
HIBIT = os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")
PIP_PIGMENTS = {"body": ["#465459"], "belly": ["#dfd2ae"], "eyeRim": ["#f1eddc"], "pupil": ["#273036"], "iris": ["#e08a2c"], "crest": ["#6f9a3c"]}
PIP_FLATS = {"body": (220, 80, 60), "belly": (240, 230, 200), "eyeRim": (200, 200, 220), "pupil": (40, 40, 50), "iris": (230, 150, 60), "crest": (90, 180, 90)}


def cmd_pip_control(a):
    """What the painter does with the right structure: variant B on the Loika's type specimen with the
    accepted HiBit Pip's own silhouette as the control. The key pass is the HiBit pixels quantised to
    Pip's pigments (body, belly, eye ring, pupil, iris, crest), the slot map the same in label colours,
    the silhouette its alpha, the part map one part (the whole body: the part and proportion checks
    then hold nothing, the band and the slots do). Outputs under out/S01/pip-control/variants/twostep/."""
    d0 = os.path.join(OUT, "S01", "pip-control"); c = os.path.join(d0, "controls"); os.makedirs(c, exist_ok=True)
    spec_dir = next(d for d, m in manifests() if m["species"] == "S01" and m["level"] == "species") if any(m["species"] == "S01" and m["level"] == "species" for _, m in manifests()) else None
    if spec_dir is None:
        idx = json.load(open(os.path.join(REF, "S01", "index.json"))); spec_dir = prepare("S01", os.path.join(REF, "S01", idx["members"][0]["dir"], "genome.json"))["dir"]
    legend = json.load(open(os.path.join(spec_dir, "controls", "legend.json")))
    hib = Image.open(HIBIT).convert("RGBA")
    pig = [(k, hexrgb(v[0]), lab(hexrgb(v[0]))) for k, v in PIP_PIGMENTS.items()]
    def quantised(size, scale_box, flats):
        """The HiBit subject scaled into the frame, each pixel its nearest Pip pigment (or its slot's label colour)."""
        W, H = size; bw, bh = scale_box
        sc = min(bw / hib.width, bh / hib.height); im = hib.resize((round(hib.width * sc), round(hib.height * sc)), Image.NEAREST)
        canvas = Image.new("RGB", size, BG if not flats else (0, 0, 0)); ox, oy = (W - im.width) // 2, (H - im.height) // 2
        px = im.load(); cp = canvas.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, al = px[x, y]
                if al < 128: continue
                best = min(pig, key=lambda t: dist(t[2], lab((r, g, b))))
                cp[ox + x, oy + y] = PIP_FLATS[best[0]] if flats else best[1]
        return canvas
    def silhouette(size, scale_box):
        W, H = size; bw, bh = scale_box
        sc = min(bw / hib.width, bh / hib.height); im = hib.resize((round(hib.width * sc), round(hib.height * sc)), Image.NEAREST)
        canvas = Image.new("L", size, 255); mask = im.split()[3].point(lambda v: 0 if v >= 128 else 255)
        canvas.paste(mask, ((W - im.width) // 2, (H - im.height) // 2)); return canvas
    frames = {"large": ((600, 620), (560, 600)), "station": ((300, 310), (280, 300)), "companion": ((280, 300), (262, 280)), "tile": ((48, 48), (46, 46))}
    for name, (size, box) in frames.items():
        quantised(size, box, False).save(os.path.join(c, f"key.portrait.{name}.png"))
        quantised(size, box, True).save(os.path.join(c, f"slots.portrait.{name}.png"))
        sil = silhouette(size, box); sil.save(os.path.join(c, f"silhouette.portrait.{name}.png"))
        idx = Image.new("RGB", size, (0, 0, 0)); idx.paste(Image.new("RGB", size, (53, 137, 241)), mask=sil.point(lambda v: 255 - v)); idx.save(os.path.join(c, f"index.portrait.{name}.png"))
        quantised(size, box, False).save(os.path.join(c, f"shaded.portrait.{name}.png"))
    exp = {**legend, "schema": legend["schema"] + "+pip-control", "genomeDigest": "S01-pip-control", "genomeSha256": "pip-control-" + sha_file(HIBIT)[:40],
           "slots": [{"slot": k, "pigments": v, "flat": list(PIP_FLATS[k]), "secondHalf": None} for k, v in PIP_PIGMENTS.items()],
           "parts": [{"part": "body", "flat": [53, 137, 241]}], "caption": legend["caption"], "note": "the accepted HiBit Pip's own silhouette and pigments as the control (the owner's experiment)"}
    exp["description"] = {**legend["description"], "text": legend["description"]["text"] + " The drawing follows the accepted Pip's own silhouette."}
    json.dump(exp, open(os.path.join(c, "legend.json"), "w"), indent=1)
    os.makedirs(os.path.join(d0, "plain"), exist_ok=True)
    for f in os.listdir(os.path.join(spec_dir, "plain")): open(os.path.join(d0, "plain", f), "wb").write(open(os.path.join(spec_dir, "plain", f), "rb").read())
    open(os.path.join(d0, "genome.json"), "w").write(open(os.path.join(spec_dir, "genome.json")).read())
    man = grow("S01", None, None, "force" in a, "twostep", ["portrait"], "twostep", controls_dir=d0)
    print("pip-control", {v: man["views"][v]["status"] for v in man["views"]}, f"{man['calls']} calls ${man['costUSD']:.3f}")


# --- recheck: the verdicts recomputed from the logged raw outputs --------------------------------------------
def raw_image(path):
    return Image.open(path).convert("RGB").resize((620, 620), Image.LANCZOS).crop((10, 0, 610, 620))


def serve(d, d0, view, painted, legend):
    """Write a view's served outputs: the painted master and Station size, or the placeholder."""
    if painted is not None:
        painted.save(os.path.join(d, f"station-{view}-600x620.png"))
        fit_to_control(painted, os.path.join(d0, "controls", f"silhouette.{view}.station.png"), (300, 310)).save(os.path.join(d, f"station-{view}-300x310.png"))
    else:
        for size in ("600x620", "300x310"):
            open(os.path.join(d, f"station-{view}-{size}.png"), "wb").write(open(os.path.join(d0, "plain", f"plain-{view}-{size}.png"), "rb").read())


def derive(d, d0, man):
    palette = load_palette()
    if man["views"].get("portrait", {}).get("status") == "painted":
        large = Image.open(os.path.join(d, "station-portrait-600x620.png")).convert("RGB")
        fit_to_control(large, os.path.join(d0, "controls", "silhouette.portrait.companion.png"), (280, 300), palette).save(os.path.join(d, "companion-280x300.png"))
        fit_to_control(large, os.path.join(d0, "controls", "silhouette.portrait.tile.png"), (48, 48), palette).save(os.path.join(d, "token-48.png"))
    else:
        for f, src in (("companion-280x300.png", "plain-companion-280x300.png"), ("token-48.png", "plain-token-48.png")): open(os.path.join(d, f), "wb").write(open(os.path.join(d0, "plain", src), "rb").read())
    man["outputs"] = {f: sha_file(os.path.join(d, f)) for f in OUTPUT_FILES if os.path.exists(os.path.join(d, f))}


def cmd_recheck(a):
    """Re-judge every attempt of this prompt version from its logged raw output with the checks as they now
    stand (the as-run verdicts are kept under checksAsRun), and rewrite the served outputs: the first
    passing attempt is served, else the placeholder. For variant B, a step 1 drawing that passes without a
    step 2 call gets its step 2 now (paid, --complete)."""
    complete = "complete" in a
    targets = [(d, d, m) for d, m in manifests() if m.get("promptVersion", 1) == PROMPT_VERSION]
    for v, ms in variant_manifests().items():
        for d, m in ms: targets.append((d, os.path.dirname(os.path.dirname(d)), m))
    for d, d0, m in targets:
        legend = json.load(open(os.path.join(d0, "controls", "legend.json")))
        changed = False
        for view, vrec in m["views"].items():
            ctrl = {p: os.path.join(d0, "controls", f"{p}.{view}.large.png") for p in ("silhouette", "index", "slots")}
            painted = None; served_by = None
            if m.get("controlVariant") == "twostep":
                step1_ok = None
                for at in vrec["attempts"]:
                    if at.get("step") == 1 and at["status"] == "ok":
                        raw = os.path.join(d, "raw", f"{view}-step1-{at.get('attempt', 1)}.png")
                        if not os.path.exists(raw): continue
                        im = raw_image(raw); at.setdefault("checksAsRun", at.get("checks")); at["checks"] = {**check(im, ctrl, legend, DRAWING_TOL), "proportionTolerance": DRAWING_TOL}
                        if at["checks"]["passed"] and step1_ok is None: step1_ok = (at, im)
                step2 = next((at for at in vrec["attempts"] if at.get("step") == 2 and at["status"] == "ok"), None)
                if step1_ok and step2 and os.path.exists(os.path.join(d, "raw", f"{view}-step2.png")):
                    im2 = raw_image(os.path.join(d, "raw", f"{view}-step2.png")); step2.setdefault("checksAsRun", step2.get("checks")); step2["checks"] = {**check(im2, ctrl, legend), "gated": False}
                    painted = im2; served_by = "step 2"
                    step1_ok[1].save(os.path.join(d, f"step1-{view}-600x620.png")); fit_to_control(step1_ok[1], os.path.join(d0, "controls", f"silhouette.{view}.station.png"), (300, 310)).save(os.path.join(d, f"step1-{view}-300x310.png"))
                elif step1_ok and complete:
                    reference = species_reference(m["species"], legend)
                    drawing = step1_ok[1]; drawing.save(os.path.join(d, f"step1-{view}-600x620.png")); fit_to_control(drawing, os.path.join(d0, "controls", f"silhouette.{view}.station.png"), (300, 310)).save(os.path.join(d, f"step1-{view}-300x310.png"))
                    imgs = [(f"step1-{view}-600x620.png", png_bytes(pad_square(drawing))), (f"reference:{reference['name']}", reference["png"])]
                    fields = {"artDirection": ART_DIRECTION, "transfer": STEP2_WORDS}
                    rec, im2 = call_logged(fields["artDirection"] + "\n\n" + fields["transfer"], imgs, {"controlVariant": "twostep", "species": m["species"], "genomeDigest": m["genomeDigest"], "genomeSha256": m["genomeSha256"], "purpose": f"station-{view}-step2", "step": 2, "attempt": 1, "fields": fields, "referenceImage": {"what": reference["what"], "name": reference["name"], "sha256": sha_bytes(reference["png"])}, "afterRecheck": True}, os.path.join(d, "raw"), f"{view}-step2.png")
                    if im2 is not None: rec["checks"] = {**check(im2, ctrl, legend), "gated": False}
                    log_call(rec); m["calls"] += 1; m["costUSD"] = round(m["costUSD"] + (rec.get("costUSD") or 0), 5); m["seconds"] = round(m["seconds"] + rec.get("seconds", 0), 1)
                    vrec["attempts"].append({"callId": rec["id"], "step": 2, "status": rec["status"], "costUSD": rec.get("costUSD"), "seconds": rec.get("seconds"), "checks": rec.get("checks"), "responseId": rec.get("responseId"), "afterRecheck": True})
                    print(m["species"], m["genomeDigest"], "twostep", view, "step 2 after recheck", rec["status"], f"${rec.get('costUSD', 0) or 0:.3f}", flush=True)
                    if im2 is not None: painted = im2; served_by = "step 2 after recheck"
            else:
                for at in vrec["attempts"]:
                    if at["status"] != "ok": continue
                    raw = os.path.join(d, "raw", f"{view}-{vrec['attempts'].index(at) + 1}.png")
                    if not os.path.exists(raw): continue
                    im = raw_image(raw); at.setdefault("checksAsRun", at.get("checks")); at["checks"] = check(im, ctrl, legend)
                    if at["checks"]["passed"] and painted is None: painted = im; served_by = f"attempt {vrec['attempts'].index(at) + 1}"
            new_status = "painted" if painted is not None else "plain"
            if new_status != vrec["status"] or served_by: changed = True
            vrec["status"] = new_status; vrec["servedBy"] = served_by; vrec["rechecked"] = now()
            serve(d, d0, view, painted, legend)
            print(m["species"], m["genomeDigest"], m.get("controlVariant"), view, "→", new_status, served_by or "", flush=True)
        derive(d, d0, m)
        m["rechecked"] = now(); m["checksVersion"] = CHECKS_VERSION
        json.dump(m, open(os.path.join(d, "manifest.json"), "w"), indent=1); open(os.path.join(d, "manifest.json"), "a").write("\n")
        if m.get("controlVariant") != "twostep" and d == d0 and legend["level"] == "species" and m["species"] != "S01":
            for view in VIEWS:
                if m["views"].get(view, {}).get("status") == "painted": open(os.path.join(SPECIES_DIR, m["species"], f"{view}-600x620.png"), "wb").write(open(os.path.join(d, f"station-{view}-600x620.png"), "rb").read())


# --- the report and the sheets ------------------------------------------------------------------------------
def manifests():
    out = []
    for sp in sorted(os.listdir(OUT)) if os.path.exists(OUT) else []:
        for d in sorted(os.listdir(os.path.join(OUT, sp))):
            p = os.path.join(OUT, sp, d, "manifest.json")
            if os.path.exists(p): out.append((os.path.join(OUT, sp, d), json.load(open(p))))
    return out


def variant_manifests():
    out = {}
    for d, _ in manifests():
        vd = os.path.join(d, "variants")
        if not os.path.exists(vd): continue
        for v in sorted(os.listdir(vd)):
            p = os.path.join(vd, v, "manifest.json")
            if os.path.exists(p): out.setdefault(v, []).append((os.path.join(vd, v), json.load(open(p))))
    return out


def variant_stats(mans, views):
    calls = sum(m["calls"] for _, m in mans); cost = sum(m["costUSD"] for _, m in mans)
    first = sum(1 for _, m in mans for v in views if m["views"].get(v, {}).get("attempts") and (m["views"][v]["attempts"][0].get("checks") or {}).get("passed"))
    return {"individuals": len(mans), "calls": calls, "usdPerIndividual": round(cost / len(mans), 4) if mans else None, "firstAttemptPassRate": round(first / (len(mans) * len(views)), 3) if mans else None,
            "plainServed": sum(1 for _, m in mans for v in views if m["views"].get(v, {}).get("status") == "plain"), "retries": sum(len(m["views"][v]["attempts"]) - 1 for _, m in mans for v in views if v in m["views"])}


def cmd_report(a):
    calls = [c for c in read_log() if c.get("service") == "gemini" and c.get("promptVersion", 1) == PROMPT_VERSION]
    ok = [c for c in calls if c.get("status") == "ok"]
    mans = [(d, m) for d, m in manifests() if m.get("promptVersion", 1) == PROMPT_VERSION]
    variants = {v: variant_stats(ms, ["portrait"]) for v, ms in variant_manifests().items()}
    main_variant = mans[0][1].get("controlVariant") if mans else None
    cost = {"model": GEMINI_MODEL, "promptVersion": PROMPT_VERSION, "controlVariant": main_variant, "variantTrials": variants, "spentAllVersionsUSD": round(sum(c.get("costUSD") or 0 for c in read_log()), 3), "calls": len(calls), "callsOk": len(ok), "callUSDMean": round(sum(c["costUSD"] for c in ok) / len(ok), 4) if ok else None, "callSecondsMean": round(sum(c["seconds"] for c in ok) / len(ok), 1) if ok else None,
            "spentUSD": round(sum(c.get("costUSD") or 0 for c in calls), 3), "individuals": len(mans), "bySpecies": {}}
    if mans:
        cost["callsPerIndividualMean"] = round(sum(m["calls"] for _, m in mans) / len(mans), 2)
        cost["usdPerIndividualMean"] = round(sum(m["costUSD"] for _, m in mans) / len(mans), 4)
        cost["secondsPerIndividualMean"] = round(sum(m["seconds"] for _, m in mans) / len(mans), 1)
        cost["usdPerMibiThreeStages"] = round(cost["usdPerIndividualMean"] * 3, 3)
        cost["usdPerKitYear40"] = round(cost["usdPerMibiThreeStages"] * 40, 2)
        cost["retries"] = sum(1 for _, m in mans for v in VIEWS for at in m["views"][v]["attempts"][1:])
        cost["plainServed"] = sum(1 for _, m in mans for v in VIEWS if m["views"][v]["status"] == "plain")
        cost["firstAttemptPassRate"] = round(sum(1 for _, m in mans for v in VIEWS if m["views"][v]["attempts"] and (m["views"][v]["attempts"][0].get("checks") or {}).get("passed")) / (len(mans) * len(VIEWS)), 3)
        for sp in sorted({m["species"] for _, m in mans}):
            ms = [m for _, m in mans if m["species"] == sp]
            cost["bySpecies"][sp] = {"individuals": len(ms), "calls": sum(m["calls"] for m in ms), "usdPerIndividual": round(sum(m["costUSD"] for m in ms) / len(ms), 4),
                                     "plainServed": sum(1 for m in ms for v in VIEWS if m["views"][v]["status"] == "plain"), "retries": sum(len(m["views"][v]["attempts"]) - 1 for m in ms for v in VIEWS)}
    json.dump(cost, open(os.path.join(HERE, "costs.json"), "w"), indent=1); open(os.path.join(HERE, "costs.json"), "a").write("\n")
    print(json.dumps(cost, indent=1))
    if mans: sheets(mans, cost)
    if PROMPT_VERSION >= 4:
        sheet_loika(cost)
        for sp in ("S01", "S09", "S12"): sheet_extremes(sp)


def sheet_loika(cost):
    """The Loika calibrated to Pip: the accepted Pip, then per individual the new control (the shaded
    pass, portrait), variant B's step 1 drawing and step 2 painting on the calibrated rig, and the
    previous B (prompt v3, the old rig) matched by reference-set member; last the Pip-silhouette
    experiment."""
    os.makedirs(os.path.join(HERE, "sheets"), exist_ok=True)
    prev = {}
    pi = os.path.join(OUT, "S01", "previous-index.json")
    if os.path.exists(pi):
        old = json.load(open(pi))["members"]; new = json.load(open(os.path.join(REF, "S01", "index.json")))["members"]
        for o, n in zip(old, new): prev[n["genomeSha256"][:16]] = os.path.join(OUT, "S01", o["genomeSha256"][:16], "variants", "twostep")
    rows = []
    for d in sorted(glob.glob(os.path.join(OUT, "S01", "*"))):
        p = os.path.join(d, "variants", "twostep", "manifest.json")
        if not os.path.exists(p) or os.path.basename(d) == "pip-control": continue
        tm = json.load(open(p))
        if tm.get("promptVersion", 1) < PROMPT_VERSION: continue
        rows.append((d, tm, os.path.join(d, "variants", "twostep"), tm))
    rows.sort(key=lambda r: (r[1]["level"] != "species", r[1]["genomeDigest"]))
    exp = os.path.join(OUT, "S01", "pip-control", "variants", "twostep")
    cols = [("new control: shaded pass, portrait (rig calibrated to Pip)", 300), ("B step 1: the HiBit drawing", 300), ("B step 2: the rich painting", 300), ("previous B (prompt v3, the old rig)", 300), ("B: Companion derived", 280), ("token 1x, 3x", 200)]
    gap = 12; rowh = 310 + 44; ink = (40, 40, 50)
    W = gap + sum(w + gap for _, w in cols); H = 70 + (len(rows) + 2) * rowh
    sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
    bs = cost.get("variantTrials", {}).get("twostep", {})
    draw.text((gap, 8), f"S01 Loika calibrated to the accepted Pip: variant B (two steps, crisp controls, only the named markings, a drawing's tolerance of 25 %), {cost['model']}, prompt v{PROMPT_VERSION}, device size at 1x. {bs.get('calls')} calls, ${bs.get('usdPerIndividual', 0) or 0:.3f} a portrait, step 1 first-attempt pass {bs.get('firstAttemptPassRate')}, {bs.get('plainServed')} served plain. Last row: the Pip-silhouette control experiment.", fill=ink)
    x = gap
    for name, w in cols: draw.text((x, 26), name, fill=ink); x += w + gap
    y = 44
    sheet.paste(flat_rgb(STYLE_REF), (gap, y)); sheet.paste(flat_rgb(os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")), (gap + 4 * (300 + gap), y))
    draw.text((gap, y + 312), "the accepted Pip: rich treatment 300x310 and HiBit 280x300; art/miniature-lives, accepted appearance reference", fill=ink)
    def put(path, x, y, zoom=1):
        if os.path.exists(path):
            im = Image.open(path).convert("RGB")
            if zoom > 1: im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
            sheet.paste(im, (x, y)); return True
        return False
    def label(tm):
        vr = tm["views"]["portrait"]; s1 = [a for a in vr["attempts"] if a.get("step") == 1]; s2 = [a for a in vr["attempts"] if a.get("step") == 2]
        c1 = (s1[-1].get("checks") or {}) if s1 else {}; c2 = (s2[-1].get("checks") or {}) if s2 else {}
        return (f"{vr['status']}, {len(vr['attempts'])} calls, ${tm['costUSD']:.3f} | step 1: outside {c1.get('outside', '-')}, missing {c1.get('missing', '-')}, parts min {min(v['span'] if isinstance(v, dict) else v for v in c1['parts'].values()) if c1.get('parts') else '-'}, slots {c1.get('slotAgreement', '-')}"
                + (f" | step 2 (not gated): outside {c2.get('outside', '-')}, slots {c2.get('slotAgreement', '-')}" if c2 else ""))
    for r, (d, m, td, tm) in enumerate(rows + ([(os.path.join(OUT, "S01", "pip-control"), None, exp, json.load(open(os.path.join(exp, "manifest.json"))))] if os.path.exists(os.path.join(exp, "manifest.json")) else [])):
        y = 44 + (r + 1) * rowh; x = gap
        put(os.path.join(d, "controls", "shaded.portrait.station.png"), x, y); x += 300 + gap
        put(os.path.join(td, "step1-portrait-300x310.png"), x, y); x += 300 + gap
        put(os.path.join(td, "station-portrait-300x310.png"), x, y); x += 300 + gap
        if m is not None:
            if not put(os.path.join(prev.get(m["genomeSha256"][:16], ""), "station-portrait-300x310.png"), x, y): draw.text((x, y + 140), "no previous B", fill=(120, 120, 130))
        else: draw.text((x, y + 140), "the experiment: Pip's own HiBit silhouette as the control", fill=(120, 120, 130))
        x += 300 + gap
        put(os.path.join(td, "companion-280x300.png"), x, y); x += 280 + gap
        put(os.path.join(td, "token-48.png"), x, y); put(os.path.join(td, "token-48.png"), x + 56, y, 3)
        who = f"{m['genomeDigest']}  {'type specimen' if m['level'] == 'species' else 'individual'}  sha256 {m['genomeSha256'][:12]}" if m is not None else "S01 type specimen on the accepted Pip's own silhouette (pip-control)"
        draw.text((gap, y + 312), f"{who}   |   {label(tm)}", fill=ink)
        if tm["views"]["portrait"]["status"] == "plain": draw.text((gap + 2 * 312, y + 326), "served plain: step 1 rejected twice", fill=(170, 40, 40))
    sheet.save(os.path.join(HERE, "sheets", "S01-pip.png")); print("sheet S01-pip", sheet.size)


def sheet_extremes(sp):
    """The envelope's worst cases for one species: per case the control (the shaded pass, portrait), variant
    B's step 1 drawing and step 2 painting, with the locus values that produced it; the type specimen first."""
    ip = os.path.join(OUT, sp, "extremes", "index.json")
    if not os.path.exists(ip): return
    idx = json.load(open(ip)); rows = []; seen = set()
    for i, c in enumerate(idx["cases"]):
        g = json.load(open(os.path.join(HERE, c["dir"], "genome.json"))); key = json.dumps(sorted(g["loci"].items()))
        if key in seen: continue
        from_node = subprocess.run(["node", "-e", "import('./sketch/cli.mjs').then(m=>{const g=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(m.genomeSha256(g))})", os.path.join(HERE, c["dir"], "genome.json")], capture_output=True, text=True, cwd=WB)
        sha = from_node.stdout.strip()[:16]
        td = os.path.join(OUT, sp, sha, "variants", "twostep")
        if not os.path.exists(os.path.join(td, "manifest.json")): continue
        seen.add(key); rows.append((i, c, os.path.join(OUT, sp, sha), td, json.load(open(os.path.join(td, "manifest.json")))))
    if not rows: return
    cols = [("control: shaded pass, portrait (the envelope)", 300), ("B step 1: the HiBit drawing", 300), ("B step 2: the rich painting", 300), ("Companion derived", 280)]
    gap = 12; rowh = 310 + 58; ink = (40, 40, 50)
    W = gap + sum(w + gap for _, w in cols) + 420; H = 70 + len(rows) * rowh
    sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
    name = json.load(open(os.path.join(rows[0][2], "controls", "legend.json")))["name"]
    draw.text((gap, 8), f"{sp} {name}: the cute envelope's worst cases. Every open proportion locus at its extremes and the corners (grow/extremes.mjs), variant B (two steps, crisp controls, only the named markings, a drawing's tolerance of 25 %), {GEMINI_MODEL}, prompt v{PROMPT_VERSION}, device size at 1x. Open proportion loci: {', '.join(k.split('.')[-1] for k in idx['loci'])}.", fill=ink)
    x = gap
    for n, w in cols: draw.text((x, 26), n, fill=ink); x += w + gap
    draw.text((x, 26), "the locus values of the case (the rest typical)", fill=ink)
    def put(path, x, y):
        if os.path.exists(path): sheet.paste(Image.open(path).convert("RGB"), (x, y)); return True
        return False
    for r, (i, c, d, td, tm) in enumerate(rows):
        y = 44 + r * rowh; x = gap
        put(os.path.join(d, "controls", "shaded.portrait.station.png"), x, y); x += 300 + gap
        put(os.path.join(td, "step1-portrait-300x310.png"), x, y); x += 300 + gap
        put(os.path.join(td, "station-portrait-300x310.png"), x, y); x += 300 + gap
        put(os.path.join(td, "companion-280x300.png"), x, y); x += 280 + gap
        vals = [f"{k.split('.')[-1].replace('-ratio', '')} = {v}" for k, v in c["set"].items()] or ["(the type specimen)"]
        for j, v in enumerate(vals[:22]): draw.text((x, y + 4 + 13 * j), v, fill=ink)
        vr = tm["views"]["portrait"]; s1 = [a for a in vr["attempts"] if a.get("step") == 1]; c1 = (s1[-1].get("checks") or {}) if s1 else {}
        draw.text((gap, y + 312), f"case #{i} {c['name']}   |   {vr['status']}, {len(vr['attempts'])} calls, ${tm['costUSD']:.3f}   |   step 1: outside {c1.get('outside', '-')}, missing {c1.get('missing', '-')}, parts min {min(v['span'] if isinstance(v, dict) else v for v in c1['parts'].values()) if c1.get('parts') else '-'}, slots {c1.get('slotAgreement', '-')}", fill=ink)
        if vr["status"] == "plain": draw.text((gap + 2 * 312, y + 326), "served plain: step 1 rejected twice", fill=(170, 40, 40))
    sheet.save(os.path.join(HERE, "sheets", f"extremes-{sp}-B.png")); print("sheet extremes", sp, sheet.size)


def sheets(mans, cost):
    os.makedirs(os.path.join(HERE, "sheets"), exist_ok=True)
    vm = variant_manifests(); trial_names = sorted(vm)
    cols = [("previous run (prompt v2), portrait", 300), (f"A: painted Station, portrait ({cost.get('controlVariant')} control)", 300), ("A: painted Station, side", 300), ("Companion 280x300, derived", 280), ("token 48 at 1x and 3x, derived", 200), ("control: shaded pass as sent, portrait", 300)]
    for t in trial_names: cols += [("B: two steps, step 2 (rich), portrait", 300), ("B: step 1, the HiBit drawing", 300)] if t == "twostep" else [(f"trial: {t} control, portrait", 300)]
    gap = 12; rowh = 310 + 44; ink = (40, 40, 50)
    for sp in sorted({m["species"] for _, m in mans}):
        rows = [(d, m) for d, m in mans if m["species"] == sp]
        rows.sort(key=lambda dm: (dm[1]["level"] != "species", dm[1]["genomeDigest"]))
        W = gap + sum(w + gap for _, w in cols); H = 70 + (len(rows) + 1) * rowh
        sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
        bs = cost["bySpecies"].get(sp, {})
        draw.text((gap, 8), f"{sp} {rows[0][1]['name']}: the Grow painting service, {cost['model']}, prompt v{cost['promptVersion']}, {cost.get('controlVariant')} control, structural checks, device size at 1x. Row 1: the accepted Pip, the bar. Then the type specimen and five individuals. {bs.get('calls')} calls, ${bs.get('usdPerIndividual', 0):.3f} an individual (two views, retries included), {bs.get('retries')} retries, {bs.get('plainServed')} views served plain.", fill=ink)
        x = gap
        for name, w in cols: draw.text((x, 26), name, fill=ink); x += w + gap
        y = 44
        sheet.paste(flat_rgb(STYLE_REF), (gap, y)); sheet.paste(flat_rgb(os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")), (gap + 2 * (300 + gap), y))
        draw.text((gap, y + 312), "the accepted Pip: rich treatment 300x310 (Station) and HiBit 280x300 (Companion); art/miniature-lives, accepted appearance reference", fill=ink)
        for r, (d, m) in enumerate(rows):
            y = 44 + (r + 1) * rowh; x = gap
            def put(path, zoom=1):
                nonlocal x
                if os.path.exists(path):
                    im = Image.open(path).convert("RGB")
                    if zoom > 1: im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
                    sheet.paste(im, (x, y))
            put(os.path.join(d, "v2", "station-portrait-300x310.png")); x += 300 + gap
            put(os.path.join(d, "station-portrait-300x310.png")); x += 300 + gap
            put(os.path.join(d, "station-side-300x310.png")); x += 300 + gap
            put(os.path.join(d, "companion-280x300.png")); x += 280 + gap
            x0 = x; put(os.path.join(d, "token-48.png")); x = x0 + 56; put(os.path.join(d, "token-48.png"), 3); x = x0 + 200 + gap
            sent = Image.open(io.BytesIO(control_image(os.path.join(d, "controls", "shaded.portrait.large.png"), "shaded", m.get("controlVariant", "crisp")))).convert("RGB")
            sent = sent.resize((310, 310), Image.LANCZOS)  # as sent (620 square, or 256 for lowres), shown at the Station size
            sheet.paste(sent.crop((5, 0, 305, 310)), (x, y)); x += 300 + gap
            for t in trial_names:
                td = next((td for td, tm in vm[t] if tm["genomeSha256"] == m["genomeSha256"]), None)
                if td: put(os.path.join(td, "station-portrait-300x310.png")); tm = next(tm for td2, tm in vm[t] if td2 == td); tc = (tm["views"]["portrait"]["attempts"][-1].get("checks") or {}); draw.text((x, y + 326), f"{t}: {tm['views']['portrait']['status']}, {len(tm['views']['portrait']['attempts'])} call(s), parts min {min(v['span'] if isinstance(v, dict) else v for v in tc['parts'].values()) if tc.get('parts') else '-'}, slots {tc.get('slotAgreement', '-')}", fill=ink)
                x += 300 + gap
                if t == "twostep":
                    if td: put(os.path.join(td, "step1-portrait-300x310.png"))
                    x += 300 + gap
            def vtxt(v):
                vr = m["views"][v]; last = vr["attempts"][-1].get("checks") or {}
                return f"{v}: {vr['status']}, {len(vr['attempts'])} call{'s' if len(vr['attempts']) > 1 else ''}, outside {last.get('outside', '-')}, missing {last.get('missing', '-')}, parts min {min(v['span'] if isinstance(v, dict) else v for v in last['parts'].values()) if last.get('parts') else '-'}, slots {last.get('slotAgreement', '-')} (IoU {last.get('silhouetteIoU', '-')}, not gated)"
            draw.text((gap, y + 312), f"{m['genomeDigest']}  {'type specimen' if m['level'] == 'species' else 'individual'}  sha256 {m['genomeSha256'][:12]}   ${m['costUSD']:.3f}, {m['seconds']} s   |   {vtxt('portrait')}   |   {vtxt('side')}", fill=ink)
            for v in VIEWS:
                if m["views"][v]["status"] == "plain": draw.text((gap + (312 if v == "portrait" else 624), y + 326), "served plain: rejected twice", fill=(170, 40, 40))
        sheet.save(os.path.join(HERE, "sheets", f"{sp}.png")); print("sheet", sp, sheet.size)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    a = {}; argv = sys.argv[2:]
    for i, t in enumerate(argv):
        if t.startswith("--"): a[t[2:]] = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else ""
    if cmd == "paint": cmd_paint(a)
    elif cmd == "calibrate": cmd_calibrate(a)
    elif cmd == "recheck": cmd_recheck(a)
    elif cmd == "pip-control": cmd_pip_control(a)
    elif cmd == "report": cmd_report(a)
    else: print(__doc__)
