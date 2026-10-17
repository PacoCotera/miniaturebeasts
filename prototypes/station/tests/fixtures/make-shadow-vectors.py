"""The founder's shadow, the oracle's bytes for station/tests/shadow.test.mjs (specs/face-arc-and-shadow.md section 2, T-20261016-125).
The oracle is masters-pods 8c141b5c art/station-masters/pods/incubator-b/shadow.py (derive) with proof.py's founder_alpha (the fit), run with the edge rule (each blur's sigma at least 0.7 px).
Input: the species' painted adult at 304 x 312 (ui/assets/masters/pods/mibi-adult-<species>-304x312.png), the one flat picture Create draws today; the cases: nothing cleared (cool), two chapters (warm), four (glowing) and every chapter (ready).
usage: python3 -I make-shadow-vectors.py SHADOW_PY MASTERS_DIR FRAMES_DIR OUT_JSON      (numpy, scipy and Pillow)"""
import sys, json, base64, importlib.util, numpy as np
from PIL import Image
from scipy import ndimage as nd
shadow_py, masters, frames, out = sys.argv[1:5]
spec = importlib.util.spec_from_file_location("shadow", shadow_py); SH = importlib.util.module_from_spec(spec); spec.loader.exec_module(SH)
def derive(alpha, q, step, p=SH.PARAMS):   # shadow.py's derive with the edge rule: each blur's sigma at least 0.7
    t0 = np.clip((alpha - p["MASK_LO"]) / (p["MASK_HI"] - p["MASK_LO"]), 0, 1); alpha = t0 * t0 * (3 - 2 * t0)
    sig = (p["SIG0"] - p["SIG_Q"] * q) * (p["READY_K"] if step == "ready" else 1.0)
    top = nd.gaussian_filter(alpha, max(0.7, sig * p["TOP_K"])); bot = nd.gaussian_filter(alpha, max(0.7, sig * p["BOT_K"]))
    t = np.linspace(0, 1, alpha.shape[0])[:, None]
    a = np.minimum(1.0, (top * (1 - t) + bot * t) * p["CORE"])
    a8 = np.floor((np.rint(a * 255) * SH.P_STEP[step] + 50) / 100)
    return a8.astype(np.uint8)
def founder_alpha(species):   # proof.py founder_alpha for one flat picture
    a = np.asarray(Image.open(f"{masters}/mibi-adult-{species}-304x312.png").convert("RGBA"))[..., 3].astype(float) / 255
    ys, xs = np.nonzero(a > 0.5); box = (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1); crop = a[box[0]:box[1], box[2]:box[3]]
    k = min(SH.PARAMS["FIT_W"] / (box[3] - box[2]), 192 / (box[1] - box[0])); w, h = max(1, int(crop.shape[1] * k)), max(1, int(crop.shape[0] * k))
    im = np.asarray(Image.fromarray((crop * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float) / 255
    o = np.zeros((192, 160)); y1 = 192 - SH.PARAMS["LIFT"]; o[y1 - h:y1, (160 - w) // 2:(160 - w) // 2 + w] = im; return o
cases = []
for sp in ("S01", "S03"):
    n = len(json.load(open(f"{frames}/species-{sp}.json"))["chapters"]); fit = founder_alpha(sp)
    for known, step in ((0, "cool"), (2, "warm"), (4, "glowing"), (n, "ready")):
        q = known / n; cases.append({"species": sp, "known": known, "chapters": n, "step": step, "q": q, "alpha": base64.b64encode(derive(fit, q, step).tobytes()).decode(), "fit": base64.b64encode((fit * 255).round().astype(np.uint8).tobytes()).decode()})
json.dump({"_note": "made by tests/fixtures/make-shadow-vectors.py from shadow.py (masters-pods 8c141b5c) with the edge rule; alpha: the 160 x 192 shadow's alpha bytes, fit: the fitted founder alpha at 8 bits", "cases": cases}, open(out, "w")); print(len(cases), "cases")
