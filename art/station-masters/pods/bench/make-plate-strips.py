"""PA1 (the art director's cut notes, bench/plate-strip-notes.md; by hand, no paid call): bench-plate-strip-t1-144x48 (three recesses, placed 1:1 at
(264, 432)) and bench-plate-strip-t2-192x48 (four recesses, at (240, 432)), cut from the signed pictures in SLICES_DIR (bench/slices): the foam is the
flat inside of bench-cradle-empty-480x288 (crop (100, 110, 192, 48); x 100-243 for t1, all of it for t2), the recess shape is the alpha of
bench-plate-gone-32x32 at 128. Every multiply is in linear light, per channel, rounded ties-to-even. Where two listed rules meet on one pixel they apply
in the order the notes list them (the corner pixels of the edge, a thin wall in both bands: the shadow band wins). Writes the two PNGs, their rows in
SLICES_DIR/manifest.json and index.json (status new), runs the checks, and writes bench/plate-strips-proof-1x.png.
usage: python3 -I bench/make-plate-strips.py bench/slices"""
import sys, os, json, hashlib
import numpy as np
from PIL import Image
D = sys.argv[1]; ld = lambda n: np.asarray(Image.open(os.path.join(D, n + ".png")).convert("RGBA"))
def to_lin(c): c = c / 255.0; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def to_srgb(l): l = np.clip(l, 0, 1); return np.rint(255 * np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055)).astype(np.uint8)   # np.rint: ties to even
def mul(px, k): return to_srgb(to_lin(px.astype(float)) * k)
cradle = ld("bench-cradle-empty-480x288"); foam_all = cradle[110:158, 100:292, :3]                         # the crop (100, 110, 192, 48)
mask = ld("bench-plate-gone-32x32")[..., 3] >= 128
def shift(m, dy, dx):
    o = np.zeros_like(m)
    o[max(dy, 0):m.shape[0] + min(dy, 0), max(dx, 0):m.shape[1] + min(dx, 0)] = m[max(-dy, 0):m.shape[0] + min(-dy, 0), max(-dx, 0):m.shape[1] + min(-dx, 0)]
    return o
shadow_band = mask & (~shift(mask, 1, 1) | ~shift(mask, 2, 2))                                            # the mask minus itself shifted down-right by 1 and by 2
light_band = mask & ~shift(mask, -1, -1)                                                                   # the mask minus itself shifted up-left by 1
floor = mask & ~shadow_band & ~light_band
def strip(w, n):
    foam = foam_all[:, :w]; out = np.zeros((48, w, 4), np.uint8); out[:45, :, :3] = foam[:45]; out[:45, :, 3] = 255
    rr = np.ones((45, w), bool)                                                                            # corner radius 3: a corner pixel whose centre lies outside the radius is clear
    for cy, cx, ys, xs in ((3, 3, slice(0, 3), slice(0, 3)), (3, w - 3, slice(0, 3), slice(w - 3, w)), (42, 3, slice(42, 45), slice(0, 3)), (42, w - 3, slice(42, 45), slice(w - 3, w))):
        yy, xx = np.mgrid[ys, xs]; rr[ys, xs] = np.hypot(xx + .5 - cx, yy + .5 - cy) <= 3
    k = np.ones((45, w)); k[0, :] *= 1.30; k[:, 0] *= 1.30; k[44, :] *= 0.60; k[:, w - 1] *= 0.60            # the strip's edge, light from the top left
    body = mul(out[:45, :, :3], k[..., None]); out[:45, :, :3] = body
    for i in range(n):
        x0, y0 = 8 + 48 * i, 8; sub = out[y0:y0 + 32, x0:x0 + 32, :3]
        for m_, kk in ((floor, .60), (shadow_band, .35), (light_band, 1.35)): sub[m_] = mul(sub[m_], kk)
    out[:45, :, 3] = np.where(rr, 255, 0)
    out[:45, :, :3][~rr] = 0
    for row, pct in ((45, .45), (46, .30), (47, .15)):                                                     # the baked contact shadow: from x 3, nothing on the left or top
        out[row, 3:, :3] = (0x1d, 0x23, 0x2b); out[row, 3:, 3] = int(np.rint(255 * pct))
    return out
NAMES = {"bench-plate-strip-t1-144x48": (144, 3), "bench-plate-strip-t2-192x48": (192, 4)}
res = {}
for n, (w, k) in NAMES.items():
    a = strip(w, k); Image.fromarray(a, "RGBA").save(os.path.join(D, n + ".png")); res[n] = a
# ---- the checks
def luma(rgb): rgb = np.asarray(rgb, float); return .2126 * rgb[..., 0] + .7152 * rgb[..., 1] + .0722 * rgb[..., 2]
def wcag(a, b): la, lb = [(.2126 * to_lin(c[0]) + .7152 * to_lin(c[1]) + .0722 * to_lin(c[2])) for c in (a, b)]; return (max(la, lb) + .05) / (min(la, lb) + .05)
for n, (w, k) in NAMES.items():
    a = res[n]; assert a.shape[:2] == (48, w), n
    al = a[..., 3]; assert set(np.unique(al[:45])) <= {0, 255}, "alpha in the body is only 0 and 255"
    assert set(np.unique(al[45:, 3:])) == {115, 76, 38}, "shadow rows 45-47"
    ys, xs = np.nonzero(mask)
    for i in range(k):                                                                                     # the recess is where the cut changed the foam: its bbox is the gone mask's, offset by (8 + 48 i, 8)
        diff = np.zeros((45, w), bool); plain = strip_plain = None
        sub = (a[8:40, 8 + 48 * i:40 + 48 * i, :3] != foam_all[8:40, 8 + 48 * i:40 + 48 * i]).any(-1)
        y2, x2 = np.nonzero(sub); assert (y2.min(), y2.max(), x2.min(), x2.max()) == (ys.min(), ys.max(), xs.min(), xs.max()), (n, i)
floorpx = res["bench-plate-strip-t1-144x48"][8:40, 8:40, :3][floor]; fl = float(luma(floorpx).mean()); fcol = floorpx.mean(0)
report = {"floor luma": round(fl, 1)}
for pn in ("whole", "gone"):
    p = ld(f"bench-plate-{pn}-32x32"); op = p[..., 3] > 0; pl = luma(p[..., :3][op])
    top = float(np.percentile(pl, 50 if pn == "whole" else 95)); report[pn] = {"p": 50 if pn == "whole" else 95, "luma": round(top, 1), "delta": round(top - fl, 1), "ratio": round(float(wcag((top,) * 3, fcol)), 2)}
print(json.dumps(report))
# ---- the manifest and index rows, written directly (status new), and the 1x proof
man = json.load(open(os.path.join(D, "manifest.json"))); idx = json.load(open(os.path.join(D, "index.json")))
for n, (w, k) in NAMES.items():
    sha = hashlib.sha256(open(os.path.join(D, n + ".png"), "rb").read()).hexdigest()
    man[n] = {"size": [w, 48], "src": "typed by hand (bench/make-plate-strips.py) from bench-cradle-empty-480x288 (foam) and bench-plate-gone-32x32 (recess shape)", "sha256": sha, "status": "new",
              "note": f"the Probe's plate strip, {k} recesses, placed 1:1 at ({264 if k == 3 else 240}, 432); the foam from the cradle's flat inside, matte, light from the top left, a baked contact shadow in rows 45-47; awaiting the art director's judgement (not signed)"}
    idx = [e for e in idx if e["id"] != n] + [{"id": n, "size": f"{w}x48", "sha256": sha}]
json.dump(man, open(os.path.join(D, "manifest.json"), "w"), indent=1); json.dump(idx, open(os.path.join(D, "index.json"), "w"), indent=1)
stage = Image.open(os.path.join(D, "..", "room-bench-stage-probe-1024x522.png")).convert("RGBA"); panels = []
for n, (w, k), x in (("bench-plate-strip-t1-144x48", (144, 3), 264), ("bench-plate-strip-t2-192x48", (192, 4), 240)):
    f = stage.copy(); f.alpha_composite(Image.fromarray(res[n], "RGBA"), (x, 432))
    for i, pn in enumerate(("whole", "gone")): f.alpha_composite(Image.fromarray(ld(f"bench-plate-{pn}-32x32"), "RGBA"), (x + 8 + 48 * i, 440))
    panels.append(f.convert("RGB"))
P = Image.new("RGB", (1024, 2 * 522 + 8), (43, 48, 56)); P.paste(panels[0], (0, 0)); P.paste(panels[1], (0, 530)); P.save(os.path.join(D, "..", "plate-strips-proof-1x.png"))
