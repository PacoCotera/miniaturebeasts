"""The pod masters cut exactly to the niche (ux-pods-inventory.md, ad-signoff.md section 3.1): every kind of the collection pod class
(identified, sealed, band, crack, shade, mask-body, mask-accent, pattern-dots/-stripes/-bands/-ribs/-segments/-plates and the two reliefs,
unknown) as a new class `shelf`, box 64x76, the pod at the card's [+76, +14] = the niche's [+12, +6], feet on the box's last row (the niche's row 82).
Full size first (owner: "full size, we can scale them down later and that is cheap, upscaling is not"): every size is made straight from the
painted pod raws (source/raw/pod-loika|identified|band.jpg) by the same pods() of tools/build.py that made every signed class, only the box differs:
  full size 1328x1577 (the raw's pod at 1:1, nothing enlarged), 3x 192x228, 1x 64x76. Uniform scale: the pod's ink is 64x71 in the 64x76 box (its own
  aspect, never stretched), centred, feet on the last row. The unknown pod is painted as cargo-rework/paint-unknown-pod.py paints every class.
No paid call. usage: python3 -I tools/nichepods.py [--check]   (--check: rebuild the signed collection class and compare it with slices/, pixel for pixel)
Writes shelf/pods/ (full size and 3x) and shelf/pods-1x/ (the 1x set); tools/register-cups.py copies them into slices/."""
import os, sys, json, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage as nd
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(HERE); os.chdir(R)
src = open(f"{HERE}/build.py").read().replace('tier = "well" if cls == "well" else "mid" if cls == "collection" else "big"',
                                              'tier = "well" if cls == "well" else "mid" if cls in ("collection", "shelf", "shelf3x", "shelffull") else "big"')
src = src.replace('        for nm, arr in masks.items(): save(f"pod-{cls}-{nm}"',
                  '        for nm, arr in flat.items(): save(f"pod-{cls}-{nm}", put(arr), r, {"identified": "the Loika reference sprite", "sealed": "the sealed pod", "band": "the sealing band as a layer"}[nm], "pod-identified")\n'
                  '        for nm, arr in masks.items(): save(f"pod-{cls}-{nm}"')     # the three painted kinds (the build keeps `flat` but no longer writes it)
assert 'cls in ("collection", "shelf"' in src and "flat.items()" in src
G = {"__name__": "nichepods", "__file__": f"{HERE}/build.py"}; sys.path.insert(0, HERE); exec(compile(src, "build.py", "exec"), G)
CHECK = "--check" in sys.argv
OUTS = {"shelffull": "shelf/pods", "shelf3x": "shelf/pods", "shelf": "shelf/pods-1x", "collection": "/tmp/nichepods-check"}
SIZE = {"shelffull": (1328, 1577), "shelf3x": (192, 228), "shelf": (64, 76), "collection": (88, 112)}
NAME = {"shelffull": "pod-shelf-{n}-1328x1577", "shelf3x": "pod-shelf-{n}-192x228", "shelf": "pod-shelf-{n}", "collection": "pod-collection-{n}"}
rec = {}
POD_BOX = {"collection": SIZE["collection"]} if CHECK else {k: SIZE[k] for k in ("shelffull", "shelf3x", "shelf")}
G["POD_BOX"] = POD_BOX
# the build saves "pod-{cls}-<layer>": route each to its file name and folder
NAME_BUILD = {cls: f"pod-{cls}-" for cls in POD_BOX}
def route(name, im, rect=None, made="", src_=""):
    for cls, pre in NAME_BUILD.items():
        if name.startswith(pre):
            if name.endswith("-shadow"): return            # the niche has its own contact shadow (pod-niche-shadow, pass 142)
            n = name[len(pre):]; out = NAME[cls].format(n=n); d = OUTS[cls]; os.makedirs(d, exist_ok=True)
            p = f"{d}/{out}.png"; im = im.convert("RGBA"); im.save(p, optimize=True)
            rec[out] = {"size": list(im.size), "made": made, "src": src_, "file": p, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
            return
G["save"] = route
G["pods"]()

# the unknown pod, painted as cargo-rework/paint-unknown-pod.py paints every class (the found field egg); the speckles drawn in a local window so the
# full-size master is practical; seeded per class, so every unknown pod of a size is the same picture
SHELL, CREAM, SPECK, DUST = np.array([190, 156, 114.]), np.array([230, 220, 198.]), np.array([110, 72, 46.]), np.array([120, 96, 70.])
def unknown(cls, seed):
    d = OUTS[cls]; L = lambda n: np.asarray(Image.open(f"{d}/{NAME[cls].format(n=n)}.png").convert("RGBA")).astype(float) / 255
    shade = L("shade"); sh = shade[..., 0:1]; body = L("mask-body")[..., 3]; acc = np.clip(L("mask-accent")[..., 3], 0, 1)
    H, W = body.shape; rng = np.random.RandomState(seed); sp = np.zeros((H, W))
    for _ in range(int(W * H / 34)):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        if rng.uniform() > 0.45 + 0.5 * ((x / W + y / H) / 2): continue
        r = rng.choice([0.6, 0.8, 1.0, 1.5, 2.1], p=[.3, .3, .2, .13, .07]) * max(1.0, W / 72); ry = r * rng.uniform(0.7, 1.2)
        x0, x1 = max(0, int(x - 1.2 * r) - 1), min(W, int(x + 1.2 * r) + 2); y0, y1 = max(0, int(y - 1.2 * ry) - 1), min(H, int(y + 1.2 * ry) + 2)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        sp[y0:y1, x0:x1] = np.maximum(sp[y0:y1, x0:x1], np.clip(1.2 - np.hypot((xx + .5 - x) / r, (yy + .5 - y) / ry), 0, 1))
    sp = nd.gaussian_filter(sp, 0.35 * max(1.0, W / 72)) * rng.uniform(0.75, 1.0)
    shell = SHELL * (1 - 0.75 * sp[..., None]) + SPECK * 0.75 * sp[..., None]
    yy = np.mgrid[0:H, 0:W][0]; rows = np.where(body.max(1) > 0.5)[0]; foot = (yy > rows.max() - (rows.max() - rows.min()) * 0.14)
    dust = foot * np.clip(nd.gaussian_filter(rng.uniform(size=(H, W)), 1.2 * max(1.0, W / 72)) * 3 - 1.1, 0, 0.5)
    shell = shell * (1 - dust[..., None]) + DUST * dust[..., None]
    col = shell * (1 - acc[..., None]) + CREAM * acc[..., None]; col = np.clip(col / 255 * np.clip(sh * 2, 0, 1), 0, 1)
    im = Image.fromarray((np.concatenate([col, shade[..., 3:4]], 2) * 255).astype(np.uint8), "RGBA")
    im.alpha_composite(Image.open(f"{d}/{NAME[cls].format(n='band')}.png").convert("RGBA"))
    out = NAME[cls].format(n="unknown"); p = f"{d}/{out}.png"; im.save(p, optimize=True)
    rec[out] = {"size": list(im.size), "made": "the shelf pod before its species is known: the found field egg (sand shell, bark speckles, cream cap and ribs, earth dust on the foot), the sealing band on, no pattern; painted as cargo-rework/paint-unknown-pod.py paints every class", "src": "pod layers, painted", "file": p, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}

if CHECK:
    bad = []
    for n, v in rec.items():
        a = np.asarray(Image.open(v["file"]).convert("RGBA")).astype(int); b = np.asarray(Image.open(f"slices/{n}.png").convert("RGBA")).astype(int)
        diff = int(np.abs(a - b).max()) if a.shape == b.shape else -1
        print(f"{n:42s} max diff {diff}"); bad += [n] if diff != 0 else []
    print("check:", "identical" if not bad else f"differs: {bad}")
else:
    for i, cls in enumerate(("shelf", "shelf3x", "shelffull")): unknown(cls, 61 + i)
    json.dump(rec, open("shelf/pods/cuts.json", "w"), indent=1); print(len(rec), "pod files:", sorted({tuple(v["size"]) for v in rec.values()}))
