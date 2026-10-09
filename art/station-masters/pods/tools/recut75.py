"""Pass 59: the round 1 crops (S01, S12) at all five sizes, re-cut by the owner's rule "the bird head at 75%": each crop's content sits inside the centred 75% of its cell (96x120 in 128x160, 108x132 in 144x176,
78x120 in 104x160, 78x72 in 104x96, 78x48 in 104x64), reduced from the raw painting and never enlarged, on the cell tone (`ground` #162a37, the paper keyed to it); the slice keeps the cell's size. Same regions and key as
traitpics.py (whose key function is reused, with the ground changed). S09 is done in traitpics2.py. python3 -I tools/recut75.py"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src = open("tools/traitpics.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics.py")}; exec(src[:src.index("os.makedirs(\"traitpics\"")], ns)
GROUND = (22, 42, 55); ns["DEEP"] = GROUND
R, SRC, GROW, key_to_deep, window, slug, looks, SIZES = ns["R"], ns["SRC"], ns["GROW"], ns["key_to_deep"], ns["window"], ns["slug"], ns["looks"], ns["SIZES"]
exec(open("tools/cutfade.py").read(), ns)
fade_cut = ns["fade_cut"]
from PIL import ImageDraw, ImageFilter
def matte(paint, key_shadow=False):
    """Pass 60, the 128x160 crops of S01 and S12: the ground is only what is connected to the painting's border (the old key took any paper-coloured pixel, so the eye white of S01 came out as holes with a light fringe
    round the iris). Enclosed background (a hole under 4000 px) is restored from the painting, opaque; the edge band (within 2 px of the outside) keeps the old key's partial alpha, with its colour taken from the solid
    pixels beside it (the white fringe on S12's wing edges goes). Returns the keyed RGB on the cell tone and the number of pixels restored."""
    a = np.asarray(paint.convert("RGB")).astype(float); H_, W_ = a.shape[:2]; PAPER = ns["PAPER"]; d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    shadow = (spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5); alpha0 = np.clip((d - 12) / 26.0, 0, 1); alpha0[shadow] = 0
    bg = (alpha0 < 0.5); seed = np.zeros_like(bg); seed[0, :] = bg[0, :]; seed[-1, :] = bg[-1, :]; seed[:, 0] = bg[:, 0]; seed[:, -1] = bg[:, -1]          # the ground the border reaches: grown inside the background until it stops
    while True:
        grown = (np.asarray(Image.fromarray((seed * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127) & bg
        if (grown == seed).all(): break
        seed = grown
    outside = seed
    if key_shadow:
        # pass 61, S12: the pale cast shadow under the bee is not part of it (the cell has no floor). Below y 440 (the wings are all above), a pixel that is light (luma 140 to 240) and only faintly warm (R - B at most 50: the legs are
        # at 80 and over, the bee's body more) and that the ground reaches through such pixels is ground too; the leg edge pixels beside it get an alpha from how warm they are.
        lum = a @ np.array([0.299, 0.587, 0.114]); rb = a[..., 0] - a[..., 2]; yy_ = np.mgrid[0:H_, 0:W_][0]; cand = (yy_ >= 440) & (lum >= 140) & (lum <= 240) & (rb <= 50) & ~outside
        grow = outside.copy(); reach = np.zeros_like(outside)
        for _ in range(400):
            nb = (np.asarray(Image.fromarray((grow * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127) & (cand | outside)
            if (nb == grow).all(): break
            grow = nb
        shadow_px = grow & ~outside; outside = outside | shadow_px; n_shadow = int(shadow_px.sum())
        warm = np.clip((rb - 40) / 35.0, 0, 1); alpha0 = np.where((yy_ >= 440) & (lum >= 140) & (lum <= 240) & (rb < 75) & (np.asarray(Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 127), np.minimum(alpha0, warm), alpha0)
    else: n_shadow = 0
    enclosed = bg & ~outside
    # holes: connected components of the enclosed background, kept if under 4000 px
    lab = np.zeros((H_, W_), int); n = 0; restore = np.zeros((H_, W_), bool)
    for y0, x0 in zip(*np.where(enclosed)):
        if lab[y0, x0]: continue
        n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; cells = []
        while stack:
            y, x = stack.pop(); cells.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H_ and 0 <= xx < W_ and enclosed[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; stack.append((yy, xx))
        if len(cells) < 4000:
            for y, x in cells: restore[y, x] = True
    alpha = np.where(outside, 0.0, 1.0); band = np.asarray(Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 127
    alpha = np.where(band & ~outside, alpha0, alpha); alpha[restore] = 1.0
    solid = (~outside) & (~band | (alpha0 >= 0.98)) | restore; col = a.copy(); cnt0 = solid.astype(float)
    for _ in range(3):                                                  # the colour of a partial pixel: the mean of the solid pixels beside it
        pc = np.pad(col * solid[..., None], ((1, 1), (1, 1), (0, 0))); pn = np.pad(solid.astype(float), 1)
        sm = sum(pc[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1)); cn = sum(pn[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~solid) & (cn > 0) & (alpha > 0.02); col[grow] = (sm / np.maximum(cn, 1)[..., None])[grow]; solid = solid | grow
    out = col * alpha[..., None] + np.array(GROUND, float) * (1 - alpha[..., None])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), int(restore.sum()) + 0 * n_shadow, n_shadow
def close_region(im, regions, r=6):
    """Pass 61: a notch in a pale edge (the matte bit into S12 translucency's left wing where the wing is paper-pale): inside each region (x0, y0, x1, y1 in slice coordinates) a morphological closing of the creature mask, radius r;
    the mask is the light warm pixels (luma over 150, R - B over 25), and only grey-blue or dark pixels (R - B at most 25 or luma under 110) inside it are replaced, so the wing's veins are kept; the pixels the closing adds take the colour of the light pixels beside them. Returns the image and the number of pixels added."""
    a = np.asarray(im).astype(float); G = np.array(GROUND, float); lum_ = a @ np.array([0.299, 0.587, 0.114]); rb_ = a[..., 0] - a[..., 2]; m = (lum_ > 150) & (rb_ > 25); bad = (rb_ <= 25) | (lum_ < 110); added = np.zeros_like(m)      # the wing is light and warm; the grey-blue speckles of its edge and the ground are not
    k = 2 * r + 1; mi = Image.fromarray((m * 255).astype(np.uint8)); closed = np.asarray(mi.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))) > 127
    for (x0, y0, x1, y1) in regions:
        reg = np.zeros_like(m); reg[y0 - 20:y1 - 20, x0 - 16:x1 - 16] = True; added |= closed & ~m & bad & reg
    col = a.copy(); solid = m.copy(); H_, W_ = m.shape
    for _ in range(12):
        pc = np.pad(col * solid[..., None], ((1, 1), (1, 1), (0, 0))); pn = np.pad(solid.astype(float), 1)
        sm = sum(pc[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1)); cn = sum(pn[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~solid) & (cn > 0) & added; col[grow] = (sm / np.maximum(cn, 1)[..., None])[grow]; solid = solid | grow
    col[~added] = a[~added]; return Image.fromarray(np.clip(np.rint(col), 0, 255).astype(np.uint8)), int(added.sum())
def poly_fade(im, polylines, width=12):
    """Pass 61: the keyed fade along a hard polygon silhouette segment (a polyline in slice coordinates, the head's straight edges in S01): the creature's pixels within `width` px of the ground fade to the ground on the same smoothstep as
    the box's cut edges (0 at the silhouette, 1 at 12 px in), strongest along the polyline and tapering to nothing over 12 px beyond each end; only pixels within 16 px of the polyline are touched."""
    a = np.asarray(im).astype(float); G = np.array(GROUND, float); h, w = a.shape[:2]; m = np.abs(a - G).max(2) > 6
    cur = ~m; d = np.full((h, w), float(width)); d[cur] = 0                      # octagonal distance in px from the ground, capped at `width`
    for k in range(1, width + 1):
        n = cur.copy(); n[1:] |= cur[:-1]; n[:-1] |= cur[1:]; n[:, 1:] |= cur[:, :-1]; n[:, :-1] |= cur[:, 1:]
        if k % 2: n[1:, 1:] |= cur[:-1, :-1]; n[:-1, :-1] |= cur[1:, 1:]; n[1:, :-1] |= cur[:-1, 1:]; n[:-1, 1:] |= cur[1:, :-1]
        d[n & ~cur] = k; cur = n
    yy, xx = np.mgrid[0:h, 0:w].astype(float); zone = np.zeros((h, w))
    for pl in polylines:
        pts = [(x - 16.0, y - 20.0) for x, y in pl]
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            dx, dy = x1 - x0, y1 - y0; L = float(np.hypot(dx, dy)); t = ((xx - x0) * dx + (yy - y0) * dy) / L; tc = np.clip(t, 0, L)
            dist = np.hypot(xx - (x0 + dx * tc / L), yy - (y0 + dy * tc / L)); over = np.maximum(np.maximum(-t, t - L), 0)
            zone = np.maximum(zone, np.clip(1 - over / width, 0, 1) * (dist <= 16))
    t = np.clip(d / width, 0, 1); keep = 1 - zone * (1 - t * t * (3 - 2 * t)); out = G + (a - G) * keep[..., None]
    return Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)), int((zone > 0).sum())
POLY = {"S01": {"face/Eyes": [[(70, 30), (93, 80)]], "coat/Markings": [[(19, 51), (31, 41), (84, 37)]]}}; CLOSE = {"S12": {"coat/Translucency": [(36, 40, 45, 86), (92, 70, 108, 92)]}}
man = json.load(open("slices/manifest.json")); out = []
for sp in ("S01", "S12"):
    d, fn = SRC[sp]; paint = Image.open(os.path.join(GROW, sp, d, fn)).convert("RGB"); W, H = paint.size; keyed = key_to_deep(paint); keyed_m, n_restored, n_shadow = matte(paint, key_shadow=(sp == "S12")); doc = json.load(open(f"traitpics/trait-regions-{sp}.json"))
    for key, rect in R[sp].items():
        ch, tr = key.split("/"); look = looks[sp][key]
        for (tw, th) in SIZES:
            name = f"trait-{sp}-{slug(tr)}-{slug(look)}-{tw}x{th}"
            if name not in man: continue
            cw_, chh_ = round(tw * 0.75), round(th * 0.75); box, flag = window(rect, cw_, chh_, W, H); crop = (keyed_m if (tw, th) == (128, 160) else keyed).crop(box); cw, chh = crop.size
            im = crop.resize((cw_, chh_), Image.LANCZOS) if (cw, chh) != (cw_, chh_) else crop
            edges = []
            extra = []
            if (tw, th) == (128, 160):
                if key in CLOSE.get(sp, {}): im, nadd = close_region(im, CLOSE[sp][key]); extra.append(f"a closing of the matte in {CLOSE[sp][key]} (+{nadd} px, the wing's edge colour)")
                if key in POLY.get(sp, {}): im, nz = poly_fade(im, POLY[sp][key]); extra.append(f"the same 12 px smoothstep along the hard polygon silhouette segments {POLY[sp][key]}")
                im, edges = fade_cut(im, GROUND)
            cv = Image.new("RGB", (tw, th), GROUND); cv.paste(im, ((tw - cw_) // 2, (th - chh_) // 2)); cv.save(f"slices/{name}.png", optimize=True)
            man[name]["made"] = man[name]["made"].split(" (pass 5")[0] + f" (pass 59: re-cut by the 75 percent rule: the content in the centred {cw_}x{chh_} at ({(tw - cw_) // 2}, {(th - chh_) // 2}) from a {cw}x{chh} window, reduced and never enlarged, on the cell tone ground #162a37)" + ((f"; 128x160 (pass 60): the ground is only what the border reaches ({n_restored} enclosed background px restored from the painting, the edge colour taken from the solid pixels beside it), a keyed fade (smoothstep, 12 px, finished inside the box) on the straight cut edges: {edges if edges else 'none'}" + ("; pass 61: " + "; ".join(extra) if extra else "") + (f"; pass 61: the bee's cast shadow keyed to ground ({n_shadow} px of the painting, all of S12's crops)" if n_shadow else "")) if (tw, th) == (128, 160) else "")
            man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()
            doc["traits"][key]["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": name, "flag": flag, "pass_59": f"content {cw_}x{chh_} centred in the cell", **({"keyed_edges": edges, "pass_61": extra} if (tw, th) == (128, 160) else {})}; out.append(name)
    json.dump(doc, open(f"traitpics/trait-regions-{sp}.json", "w"), indent=1)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(len(out), "slices")
