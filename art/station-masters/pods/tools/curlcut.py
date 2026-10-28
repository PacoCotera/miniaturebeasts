"""Cut a curled sleeper from its Pro sheet (ad-curl, 2026-10-28; curljobs.py made the sheet).
  * the whole picture keyed by m = min(R, B) - G (alpha 0 at m >= 160, 255 at m <= 70, linear between), the edge un-mixed from #FF00FF, then choked 1 px and despilled
    (an edge pixel's R and B held to G + 40 where they pass it); cell 2's figure = the largest island whose centre lies right of the middle (a curl may cross the middle line);
    its pinholes (< 40 px) filled, a real gap left open; the returned cell 1 is never used (the model rescales it);
  * SIZE by the same amount of creature: the curl is scaled (never by more than needed, down or up) so its solid area (alpha >= 128) is AREA x the signed master's body area
    (AREA 0.85: S01's own layered curl is 0.80 of its stand as an adult, 1.10 as a juvenile);
  * placed in the stage's 304x312 canvas centred on x 152, its last solid row on 304, the house shadow (#1e1a22 at alpha 110, an ellipse 0.9 of the curl's width,
    0.11 of it tall, 10-22 px) under it as the nap masters carry theirs; then the 96x88 nap by curlnap.py.
usage: python3 -I curlcut.py RAW SPECIES STAGE"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE); from curlnap import nap, premul_resize
AREA = 0.85
def key(rgb):
    r, g, b = [rgb[..., i].astype(float) for i in range(3)]; m = np.minimum(r, b) - g
    a = np.clip((160 - m) / 90, 0, 1)
    M = np.array([255.0, 0, 255.0]); c = (rgb.astype(float) - (1 - a[..., None]) * M) / np.maximum(a[..., None], 1e-3)
    return np.clip(c, 0, 255), a
def cut(raw, sp, stage):
    im = np.asarray(Image.open(raw).convert("RGB")); H, W = im.shape[:2]
    c, a = key(im)
    solid = a >= 0.5; lab, n = nd.label(solid); ids = range(1, n + 1); sz = nd.sum(solid, lab, ids); cm = nd.center_of_mass(solid, lab, ids)
    right = [i for i in ids if cm[i - 1][1] > W / 2]; best = max(right, key=lambda i: sz[i - 1])
    main = lab == best; holes = nd.binary_fill_holes(main) & ~main; hl, hn = nd.label(holes)
    hs = nd.sum(holes, hl, range(1, hn + 1)); filled = main | np.isin(hl, [i + 1 for i in range(hn) if hs[i] < 40])   # a pinhole is filled; a real gap (tail and body) stays open
    a = np.where(nd.binary_dilation(filled, iterations=3) & ~(holes & ~filled), a, 0); a = np.where(filled & (a >= 0.5), 1.0, np.where(filled & ~main, 1.0, a))
    a = np.minimum(a, nd.grey_erosion(a, size=(3, 3)) * 0.5 + a * 0.5)          # 1 px choke of the soft edge
    edge = (a < 1) & (a > 0) | (nd.binary_dilation(a < 0.5, iterations=2) & (a > 0))
    g = c[..., 1]; lim = g + 40
    for ch in (0, 2): c[..., ch] = np.where(edge & (c[..., ch] > lim), lim, c[..., ch])
    ys, xs = np.where(a > 0); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    curl = Image.fromarray(np.dstack([c, a * 255])[y0:y1, x0:x1].astype(np.uint8), "RGBA")
    mst = np.asarray(Image.open(f"{ROOT}/{'adult' if stage == 'adult' else 'juvenile'}/mibi-{stage}-{sp}-304x312.png").convert("RGBA"))[..., 3]
    target = AREA * (mst >= 200).sum(); have = (a >= 0.5).sum(); s = (target / have) ** 0.5
    curl = premul_resize(curl, max(1, round(curl.width * s)), max(1, round(curl.height * s)))
    ca = np.asarray(curl)[..., 3]; sy, sx = np.where(ca >= 200); last = sy.max(); cx = (sx.min() + sx.max() + 1) / 2; w = sx.max() - sx.min() + 1
    canvas = Image.new("RGBA", (304, 312), (0, 0, 0, 0))
    sw = 0.9 * w; sh = min(22, max(10, 0.11 * w)); d = ImageDraw.Draw(canvas)
    d.ellipse([152 - sw / 2, 304 - sh * 0.6, 152 + sw / 2, 304 + sh * 0.4], fill=(30, 26, 34, 110))
    ox, oy = round(152 - cx), 304 - last
    canvas.alpha_composite(curl, (ox, oy)) if ox >= 0 and oy >= 0 else canvas.paste(curl, (ox, oy), curl)
    keyf = f"{ROOT}/curl/keys/mibi-{stage}-{sp}-curl-304x312.png"; canvas.save(keyf)
    n96 = nap(canvas, stage); napf = f"{ROOT}/curl/mibi-{stage}-{sp}-96x88.png"; n96.save(napf)
    na = np.asarray(n96)[..., 3]; ny, nx = np.where(na >= 128)
    k = np.asarray(canvas)[..., 3]; ky, kx = np.where(k >= 128)
    rec = {"raw": os.path.relpath(raw, ROOT), "scale": round(s, 4), "key": os.path.relpath(keyf, ROOT), "nap": os.path.relpath(napf, ROOT),
           "key_ink": [int(kx.min()), int(ky.min()), int(kx.max() - kx.min() + 1), int(ky.max() - ky.min() + 1)],
           "nap_ink": [int(nx.min()), int(ny.min()), int(nx.max() - nx.min() + 1), int(ny.max() - ny.min() + 1)],
           "fits": bool(kx.min() > 0 and kx.max() < 303 and ky.min() > 0 and nx.min() >= 2 and nx.max() <= 93 and na[0].max() == 0)}
    return rec
if __name__ == "__main__":
    raw, sp, stage = sys.argv[1:4]; r = cut(raw, sp, stage); print(json.dumps(r))
    f = f"{ROOT}/curl/cuts.json"; allr = json.load(open(f)) if os.path.exists(f) else {}; allr[f"{sp}-{stage}"] = r; json.dump(allr, open(f, "w"), indent=1)
