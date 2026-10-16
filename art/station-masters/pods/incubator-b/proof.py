"""T-20261016-27 proofs: empty, growing, ready and hatch-1100 at 1x for two species (S01 Loika, S03 Tuikis), with the new masters at the
ruling's rects (specs/station-incubator-tabs-ruling.md §2), and the brightness measures (§6) and the stamp plate p95 (stamp ruling §3.1).
growing-cool (f 0.2) is a measuring frame for the cool step. Stand-ins, said so on every proof and in the result (they are the build's, not masters):
- the pod at 224 x 272: the species' shell composed by pods.json podLayers.compose from the signed pod-large layers (144 x 176) and SCALED to
  224 x 272 (no pod class exists at 224 x 272; see the result);
- the founder's shadow: the juvenile's silhouette fitted to the 160 x 192 shadow box and blurred, at the step's opacity (the build derives it);
- the stamp glyph: lifted from the batch/B-20261016-1 capture (S01's); no live text (the slip's, the card's and the code's words are the build's).
usage: python3 -I proof.py SLICES_DIR MASTERS_DIR(new masters) GLYPH.png OUT_DIR"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, md, glyph_png, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
Y = lambda a: lin(a[..., :3]) @ np.array([.2126, .7152, .0722])
L = lambda p: Image.open(p).convert("RGBA")
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
SPECIES = {"S01": ("Loika", "#465459", "#dfd2ae", "dots"), "S03": ("Tuikis", "#269fa5", "#e8b83f", "plates")}
def shell(sp):
    _, a, b, pat = SPECIES[sp]
    g = lambda n: np.asarray(L(f"{sl}/pod-large-{n}.png")).astype(float)
    shade = g("shade"); body, acc = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255
    pt = g(f"pattern-{pat}")[..., 3] / 255
    rel = g(f"pattern-{pat}-relief")[..., :3].mean(2) / 255 if os.path.exists(f"{sl}/pod-large-pattern-{pat}-relief.png") else 0.5
    A, B = hexrgb(a), hexrgb(b)
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255) * (2 * np.asarray(rel)[..., None] if np.ndim(rel) else 1.0)
    alpha = np.maximum(body, acc) * (g("identified")[..., 3] / 255 > 0)
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
    return im.resize((224, 272), Image.LANCZOS)                                 # stand-in only: scaled
def founder_shadow(sp, opacity):
    j = L(f"{sl}/mibi-juvenile-{sp}-304x312.png"); a = np.asarray(j)[..., 3].astype(float) / 255
    ys, xs = np.nonzero(a > 0.5); crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = min(160 / crop.shape[1], 192 / crop.shape[0]); im = Image.fromarray((crop * 255).astype(np.uint8)).resize((max(1, int(crop.shape[1] * k)), max(1, int(crop.shape[0] * k))), Image.LANCZOS)
    P = 16; m = np.zeros((192 + 2 * P, 160 + 2 * P)); h, w = im.size[1], im.size[0]
    m[P + 192 - h:P + 192, P + (160 - w) // 2:P + (160 - w) // 2 + w] = np.asarray(im) / 255
    m = nd.gaussian_filter(m * 0.9, 6) * opacity                              # padded, so the blur never meets a box edge
    return Image.fromarray(np.dstack([np.full(m.shape + (3,), [40, 28, 22]), m * 255]).astype(np.uint8), "RGBA")
def ring(f, closed=False):
    r = np.asarray(L(f"{md}/incubator-ring-{'closed' if closed else 'fill'}.png")).copy()
    if not closed:
        yy, xx = np.mgrid[0:400, 0:400] + .5; ang = np.degrees(np.arctan2(xx - 200, -(yy - 200))) % 360
        r[((ang - 228) % 360) > 264 * f] = 0                                    # the build's wedge clip, whole degrees
    return Image.fromarray(r, "RGBA")
glyph = L(glyph_png)
def frame(sp, state):
    f = Image.new("RGBA", (1024, 600), (29, 35, 43, 255)); f.alpha_composite(L(f"{md}/incubator-stage.png"), (0, 40))
    regions = {}
    def put(name, im, xy):
        f.alpha_composite(im, xy); a = np.asarray(im)[..., 3] > 128
        regions.setdefault(name, np.zeros((600, 1024), bool))[xy[1]:xy[1] + im.size[1], xy[0]:xy[0] + im.size[0]] |= a
    if state == "empty":
        put("cradle", L(f"{md}/incubator-cradle-empty.png"), (392, 392))
        return f, regions
    step = {"growing-cool": "cool", "growing": "warm", "ready": "glowing", "hatch-1100": None}[state]
    if state != "hatch-1100":
        put("ring", ring(0.2) if state == "growing-cool" else ring(0.5) if state == "growing" else ring(1, closed=True), (312, 88))
    put("cradle", L(f"{md}/incubator-cradle{'' if state != 'hatch-1100' else '-empty'}.png"), (392, 392))
    if state != "hatch-1100":
        pod = shell(sp)
        pod.alpha_composite(founder_shadow(sp, {'cool': 0.25, 'warm': 0.45}.get(step, 0.8)), (32 - 16, 48 - 16))
        pod = Image.fromarray(np.dstack([np.asarray(pod)[..., :3], np.asarray(shell(sp))[..., 3]]), "RGBA")   # the shadow stays inside the shell
        pod.alpha_composite(L(f"{md}/incubator-shell-{step}.png"))
        if state == "ready": pod.alpha_composite(L(f"{md}/incubator-shell-seams.png"))
        put("pod", pod, (400, 144))
        f.alpha_composite(L(f"{md}/incubator-cradle-front.png"), (392, 392))
    else:
        put("juvenile", L(f"{sl}/mibi-juvenile-{sp}-304x312.png"), (360, 144))
    put("slip", L(f"{md}/slip-208x408.png"), (88, 96))
    if state != "hatch-1100": put("card", L(f"{md}/incubator-card-ground.png"), (728, 96))
    put("stamp", L(f"{sl}/stamp-plate-120x120.png"), (772, 352)); f.alpha_composite(glyph, (772 + 20, 352 + 20)); regions["stamp"][352:472, 772:892] = True
    return f, regions
report = {}
for sp in SPECIES:
    for state in ("empty", "growing-cool", "growing", "ready", "hatch-1100"):
        f, reg = frame(sp, state); f.convert("RGB").save(f"{out}/incubator-b-{sp}-{state}-1x.png")
        arr = np.asarray(f.convert("RGB")).astype(float); y = Y(arr)
        m = {k: round(float(np.percentile(y[v], 95)), 3) for k, v in reg.items() if v.any()}
        if "pod" in m: m["pod - highest other"] = round(m["pod"] - max(v for k, v in m.items() if k not in ("pod",)), 3)
        report[f"{sp} {state}"] = m
print(json.dumps(report, indent=1))
json.dump(report, open(f"{out}/measures.json", "w"), indent=1)
