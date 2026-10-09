"""The halo figure ("what it would become"), round 1: mibi-halo-<species>-128x160-{mist,clear} for S01, S09, S12 from each species' standard painting.
usage: python3 -I tools/halo.py   (writes slices/mibi-halo-*, halo/halo-round1-1x.png, halo/halo-silhouettes.png)
The silhouette is cut from the standard painting (colour-to-alpha against its cream ground, cleaned: largest piece, holes filled), fitted into 112x144 centred in 128x160. The figure is
a soft glow rendered from that silhouette alone: cool light (pale cyan to frost), brightest along the top-left contour (a rim lit from the upper left), falling off inward and downward,
a soft outer halo of about 6 px; no eyes, colours, patterns or outline of the painting survive. Mist = the same silhouette diffused to a soft cloud at authoring time; the build cross-fades
the two slices by the share of chapters read and blurs nothing. Everything is computed at 4x and reduced (anti-aliased)."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); os.chdir(ROOT)
OUT = "slices/"; GROW = "../../../prototypes/workbench/grow/out/"
SPECIES = {"S01": (GROW + "S01/07bef58c9d38d564/station-side-600x620.png", False), "S09": (GROW + "S09/3982a7117cfa0fc3/station-side-600x620.png", False), "S12": (GROW + "S12/2af58fb73ac5cbbd/station-portrait-600x620.png", True)}
K = 4; W, H = 128 * K, 160 * K; BOX = (112 * K, 144 * K)
def silhouette(path, flip):
    im = Image.open(path).convert("RGB")
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im).astype(float); border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); bg = np.median(border, axis=0)
    d = np.abs(a - bg).max(2); m = (d > 20).astype(np.uint8) * 255
    mi = Image.fromarray(m).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))                       # close small gaps
    m = np.asarray(mi) > 127
    lab = np.zeros(m.shape, int); n = 0; sizes = {}
    for y0 in range(m.shape[0]):
        for x0 in range(m.shape[1]):
            if m[y0, x0] and lab[y0, x0] == 0:
                n += 1; st = [(y0, x0)]; lab[y0, x0] = n; c = 0
                while st:
                    y, x = st.pop(); c += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and lab[yy, xx] == 0: lab[yy, xx] = n; st.append((yy, xx))
                sizes[n] = c
    keep = [k for k, v in sizes.items() if v > 0.03 * max(sizes.values())]; m = np.isin(lab, keep)
    # fill holes: flood the outside from the border, everything not reached is inside
    out = np.zeros(m.shape, bool); st = [(0, 0)]; out[0, 0] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and not m[yy, xx] and not out[yy, xx]: out[yy, xx] = True; st.append((yy, xx))
    return ~out
def fit(m):
    ys, xs = np.where(m); crop = Image.fromarray((m[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8)); s = min(BOX[0] / crop.width, BOX[1] / crop.height)
    crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS); canvas = Image.new("L", (W, H), 0)
    canvas.paste(crop, ((W - crop.width) // 2, (H - crop.height) // 2)); return np.asarray(canvas).astype(float) / 255
def edt(inside):          # chamfer distance to the nearest False (in 4x pixels)
    INF = 1e9; d = np.where(inside, INF, 0.0); h, w = d.shape
    for y in range(h):
        for x in range(w):
            if d[y, x]:
                v = d[y, x]
                if x: v = min(v, d[y, x - 1] + 1)
                if y:
                    v = min(v, d[y - 1, x] + 1)
                    if x: v = min(v, d[y - 1, x - 1] + 1.414)
                    if x < w - 1: v = min(v, d[y - 1, x + 1] + 1.414)
                d[y, x] = v
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if d[y, x]:
                v = d[y, x]
                if x < w - 1: v = min(v, d[y, x + 1] + 1)
                if y < h - 1:
                    v = min(v, d[y + 1, x] + 1)
                    if x < w - 1: v = min(v, d[y + 1, x + 1] + 1.414)
                    if x: v = min(v, d[y + 1, x - 1] + 1.414)
                d[y, x] = v
    return d
def blur(a, r): return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def render(M):
    inside = M > 0.5; din = edt(inside) / K; dout = edt(~inside) / K                                  # px from the contour, inside and outside (final-resolution px)
    g = blur(M, 3 * K); gy, gx = np.gradient(g); norm = np.hypot(gx, gy) + 1e-9; nx, ny = -gx / norm, -gy / norm  # outward normal
    lit = np.clip(nx * -0.7071 + ny * -0.7071, 0, 1)                                                   # facing the upper left
    ys = np.where(inside.any(1))[0]; yn = np.clip((np.arange(H)[:, None] - ys.min()) / max(1, ys.max() - ys.min()), 0, 1)
    rim = np.exp(-din / 7.0) * (0.30 + 0.70 * lit)                                                      # the lit contour
    body = 0.34 * np.exp(-din / 24.0) * (1 - 0.50 * yn)                                                 # falling inward and downward
    I = np.clip((0.55 * rim + body) * (1 - 0.35 * yn), 0, 1)
    halo = 0.30 * np.exp(-np.clip(dout, 0, None) / 2.6) * (dout <= 6.5) * (0.6 + 0.4 * lit)           # the soft outer halo, about 6 px
    A = np.where(inside, (0.16 + 0.46 * I) * 0.84, halo)
    lo, hi = np.array([118.0, 198.0, 224.0]), np.array([232.0, 244.0, 252.0])                           # pale cyan to frost
    C = lo + (hi - lo) * np.clip(I * 1.6, 0, 1)[..., None]; C = np.where(inside[..., None], C, lo)
    return np.dstack([C, A * 255]), I
def mist_of(M):
    inside = M > 0.5; b = blur(M, 7 * K); b = b / max(b.max(), 1e-6); A = 0.34 * b ** 1.2
    C = np.dstack([np.full(M.shape, 150.0), np.full(M.shape, 212.0), np.full(M.shape, 232.0)]); return np.dstack([C, A * 255])
def reduce(rgba):           # 4x -> 1x, premultiplied so the edges do not fringe
    p = rgba.copy(); p[..., :3] *= p[..., 3:4] / 255; p = p.reshape(H // K, K, W // K, K, 4).mean((1, 3)); a = p[..., 3:4]
    rgb = np.where(a > 0, p[..., :3] / np.maximum(a / 255, 1e-6), 0); return Image.fromarray(np.clip(np.dstack([rgb, a]), 0, 255).astype(np.uint8), "RGBA")
def luma_black(im):
    a = np.asarray(im).astype(float); return (a[..., :3] * a[..., 3:4] / 255) @ np.array([0.299, 0.587, 0.114]), a[..., 3]
if __name__ == "__main__":
    man = json.load(open("slices/manifest.json")); sil = {}; stats = {}
    for sp, (path, flip) in SPECIES.items():
        M = fit(silhouette(path, flip)); sil[sp] = M
        clear, _ = render(M); mist = mist_of(M)
        for st, arr in (("clear", clear), ("mist", mist)):
            im = reduce(arr); name = f"mibi-halo-{sp}-128x160-{st}"; im.save(OUT + name + ".png", optimize=True)
            L, A = luma_black(im); foot = A > 2; stats[name] = (round(float(L.max()), 1), round(float(L[foot].mean()), 1))
            import hashlib
            man[name] = {"size": [128, 160], "rect": None, "src": os.path.basename(path), "made": f"the {sp} halo figure, {st}: " + ("a soft glow figure from the species' silhouette alone, cool light brightest along the top-left contour, falling inward and downward, a soft outer halo of about 6 px" if st == "clear" else "the same silhouette diffused to a soft cloud, barely guessable; the build cross-fades mist to clear by the share of chapters read"), "sha256": hashlib.sha256(open(OUT + name + ".png", "rb").read()).hexdigest()}
    json.dump(man, open("slices/manifest.json", "w"), indent=1)
    for k, v in stats.items(): print(k, "peak grey", v[0], "mean grey (figure pixels)", v[1])
    sheet = Image.new("L", (3 * 136, 168), 0)
    for i, sp in enumerate(SPECIES): sheet.paste(Image.fromarray((np.asarray(Image.fromarray((sil[sp] * 255).astype(np.uint8)).resize((128, 160), Image.LANCZOS)))), (4 + i * 136, 4))
    sheet.save("halo/halo-silhouettes.png")
