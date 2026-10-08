"""Cut and clean the generated sources into the 1x slices. python3 -I tools/build.py  (run from art/station-masters/pods)"""
import sys, os, json, hashlib
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from lib import *
from PIL import ImageDraw
OUT = "slices/"; os.makedirs(OUT, exist_ok=True)
MAN = {}
def save(name, im, rect=None, made="", src=""):
    im = im.convert("RGBA"); im.save(OUT + name + ".png", optimize=True)
    MAN[name] = {"size": list(im.size), "rect": rect, "src": src, "made": made, "sha256": hashlib.sha256(open(OUT + name + ".png", "rb").read()).hexdigest()}
def dim(im, f, lift=0):
    a = np.asarray(im.convert("RGBA")).astype(float).copy(); a[..., :3] = np.clip(a[..., :3] * f + lift, 0, 255); return Image.fromarray(a.astype(np.uint8), "RGBA")
def sub(im, box): return im.crop(box)
def round_alpha(im, r, aa=4):
    w, h = im.size; m = Image.new("L", (w * aa, h * aa), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * aa - 1, h * aa - 1], r * aa, fill=255)
    m = m.resize((w, h), Image.LANCZOS); a = np.asarray(im.convert("RGBA")).copy(); a[..., 3] = (a[..., 3].astype(float) * np.asarray(m) / 255).astype(np.uint8); return Image.fromarray(a, "RGBA")
def comp_bboxes(alpha, thr=128, minarea=20000):
    from collections import deque
    m = alpha > thr; h, w = m.shape; ds = 8; mm = m[::ds, ::ds]; hh, ww = mm.shape; seen = np.zeros_like(mm); out = []
    for y in range(hh):
        for x in range(ww):
            if mm[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = 1; xs = []; ys = []
                while q:
                    cy, cx = q.popleft(); xs.append(cx); ys.append(cy)
                    for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
                        if 0 <= ny < hh and 0 <= nx < ww and mm[ny, nx] and not seen[ny, nx]: seen[ny, nx] = 1; q.append((ny, nx))
                if len(xs) * ds * ds >= minarea: out.append((min(xs) * ds, min(ys) * ds, (max(xs) + 1) * ds, (max(ys) + 1) * ds))
    return out

# ---- bench stage 1024x522 at (0,40)
def bench():
    save("room-bench-stage", bench_grade(bench_window("bench-e2.jpg", 1374, 1244, 0.31)), [0, 40, 1024, 522], "the generated glass wall: horizon flattened, sides and bottom extended from the wall's own strips, window on the pool (712, 424)", "bench-e2")
def opaque_cut(path, thr=9, soft=14, closing=10):
    """Cut an object off its flat ground as an opaque silhouette (holes closed), keeping its own colours."""
    im = load(path); bg = border_median(im); a = np.asarray(im).astype(float); diff = np.abs(a - bg).max(2)
    m = (diff > thr)[::4, ::4]
    m = ~label_dilate(~label_dilate(m, closing).astype(bool), closing).astype(bool) if False else label_dilate(m, closing)
    # closing = dilate then erode
    er = ~label_dilate(~m.astype(bool), closing).astype(bool)
    full = np.kron(er.astype(float), np.ones((4, 4)))[:diff.shape[0], :diff.shape[1]]
    full = smooth1d(smooth1d(full, 1.5, 0), 1.5, 1)
    edge = np.clip((diff - thr) / soft, 0, 1)
    alpha = np.maximum(full * 0.0 + np.clip(full, 0, 1) * 1.0, 0) * 0 + np.where(full > 0.5, 1.0, edge)
    return Image.fromarray(np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
def cradle():
    k = opaque_cut("dish-lowa.jpg"); bb = bbox_alpha(k, 120); d = k.crop(bb)
    f = min(224 / d.width, 96 / d.height); d = d.resize((round(d.width * f), round(d.height * f)), Image.LANCZOS)
    c = Image.new("RGBA", (224, 96), (0, 0, 0, 0)); c.alpha_composite(d, ((224 - d.width) // 2, 96 - d.height))
    save("room-cradle", c, [600, 328, 224, 96], "the deep frosted bowl with its dark dust bed and the cool glow through its wall: opaque cut, scaled evenly into 224x96 (the bowl is %d px wide), bottom on the last row" % d.width, "dish-lowa")
    x = np.asarray(c).copy(); yy = np.arange(96)[:, None]; fade = np.clip((yy - 46) / 6.0, 0, 1); x[..., 3] = (x[..., 3] * fade).astype(np.uint8)
    save("room-cradle-front", Image.fromarray(x, "RGBA"), [600, 328, 224, 96], "the bowl's near lip and the front of its bed (rows 46 to 95), drawn over the pod's foot at the foot line y 400 (row 72)", "dish-lowa")
    im = load("slab2a.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05); k = k.crop(bbox_alpha(k, 40))
    f = min(272 / k.width, 40 / k.height); k = k.resize((round(k.width * f), round(k.height * f)), Image.LANCZOS); k = dim(k, 0.8)
    c = Image.new("RGBA", (272, 40), (0, 0, 0, 0)); c.alpha_composite(k, ((272 - k.width) // 2, 40 - k.height))
    save("room-shelf", c, [576, 392, 272, 40], "PROPOSED: the thick glass slab in perspective with a lit front edge; colour-to-alpha, scaled evenly into 272x40 (%d px wide), bottom on the last row" % k.width, "slab2a")
def bench_grade(im):
    """Darken to the candidate's values: a tone curve that tames the cone, and a vignette that darkens the corners."""
    a = np.asarray(im).astype(float) / 255; a = 0.82 * a ** 1.55
    yy, xx = np.mgrid[0:522, 0:1024]; r = np.sqrt(((xx - 712) / 620.0) ** 2 + ((yy - 250) / 420.0) ** 2)
    v = np.clip(1 - 0.62 * np.clip(r - 0.25, 0, 1.2) ** 1.4, 0.18, 1)
    return Image.fromarray(np.clip(a * v[..., None] * 255, 0, 255).astype(np.uint8))
# ---- list column
def listcol():
    im = load("list-column.jpg"); im = im.crop((1536 - 735, 0, 1536, 2400)).resize((160, 522), Image.LANCZOS)
    save("ring-column", im, [0, 40, 160, 522], "cut: right part of list-column, bottom leak cropped", "list-column")
    im = load("well-rings2.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.06)
    for nm, box in (("ring-well-empty", (0, 0, 1024, 2048)), ("ring-well-current", (1024, 0, 2048, 2048))):
        sk = k.crop(box); bb = bbox_alpha(sk, 90); cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2; side = int(max(bb[2] - bb[0], bb[3] - bb[1]) * (1.0 if "empty" in nm else 1.12))
        c = sk.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((64, 64), Image.LANCZOS)
        save(nm, c, [40, 52, 64, 64], "colour-to-alpha on the flat ground, the ring cut square, 64x64 (hollow)", "well-rings2")
    im = load("hatch-leaf.jpg"); bg = border_median(im); h = color_to_alpha(im, bg, 0.05); bb = bbox_alpha(h, 60)
    pad = 10; lf = h.crop((bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)); sc = 28 / lf.height; lf = lf.resize((max(1, round(lf.width * sc)), 28), Image.LANCZOS)
    cv = Image.new("RGBA", (112, 56), (0, 0, 0, 0)); cv.alpha_composite(lf, ((112 - lf.width) // 2, 14)); save("ring-hatch", cv, [24, 488, 112, 56], "a leaf etched into the column glass (colour-to-alpha), 24 px leaf centred, no box", "hatch-leaf")
# ---- rail tab plates
def tabs():
    """Tabs hang from the top bar: parallelograms leaning 16 px right over 40 px, a full tab 136 wide (slice 152x40) and a
    compact one 56 wide (slice 72x40). The painted plate is un-sheared to a rectangle, resized, and sheared to exactly 16 px."""
    k = key_magenta(load("tabs2.jpg")); a = np.asarray(k)[..., 3]
    boxes = comp_bboxes(a, 128, 30000); boxes = [b for b in boxes if (b[2]-b[0]) > 400]
    boxes.sort(key=lambda b: (round(b[1] / 500), b[0]))
    names = ["unread", "read", "focused", "sealed"]
    for nm, bb in zip(names, boxes):
        c = k.crop(bb); ca = np.asarray(c)[..., 3]; h = c.height
        def edges(y): xs = np.where(ca[y] > 128)[0]; return xs.min(), xs.max()
        y0, y1 = int(h * 0.12), int(h * 0.80); l0, r0 = edges(y0); l1, r1 = edges(y1)
        slant = ((l1 - l0) + (r1 - r0)) / 2 * h / (y1 - y0)                      # source px of lean over the whole height
        W = round(c.width - slant); kx = slant / h
        un = c.transform((W, h), Image.AFFINE, (1, kx, 0, 0, 1, 0), Image.BICUBIC)          # un-shear: the left edge becomes vertical
        full = dim(un.resize((136, 40), Image.LANCZOS), {"unread": 0.8, "focused": 0.88}.get(nm, 1.0))
        def shear(rect_img):
            w = rect_img.width; out = Image.new("RGBA", (w + 16, 40), (0, 0, 0, 0)); big = Image.new("RGBA", (w + 16, 40), (0, 0, 0, 0)); big.paste(rect_img, (0, 0))
            return big.transform((w + 16, 40), Image.AFFINE, (1, -16 / 40, 0, 0, 1, 0), Image.BICUBIC)
        # note: out(x,y) samples big(x - 16 y/40): the bottom row moves 16 px right
        save(f"rail-tab-{nm}-full-152x40", shear(full), [None, 40, 152, 40], "hanging tab, slant baked: un-sheared, resized to 136x40, sheared 16 px", "tabs2")
        save(f"rail-tab-{nm}-compact-72x40", shear(nine(full, 56, 40, 20, 8, 20, 8)), [None, 40, 72, 40], "compact hanging tab, slant baked (9-slice of the full one, slant kept)", "tabs2")

# ---- page panes
def pages():
    im = load("page-pane.jpg"); W, H = im.size
    a = np.asarray(im.convert("L")).astype(float)
    pane = im.crop((70, 62, 2331, 1733)); s = 480 / pane.width
    for nm, w in (("page-pane-408x440", 408),):
        save(nm, nine(pane.convert("RGBA"), w, 440, 70, 70, 70, 70, ls=s), [176, 112, w, 440], "9-slice of the generated pane, corners kept at 1x", "page-pane")
# ---- picture frames
def frames():
    k = key_magenta(load("frame-lip.jpg")); k = k.crop(bbox_alpha(k, 10))
    sizes = [(376, 312), (184, 304), (184, 112), (120, 112), (376, 264), (184, 256), (184, 104), (120, 96)]
    s = 1536 / k.width * 0 + 0.19
    fr = dim(load("frost-dark.jpg").convert("RGBA"), 0.7).convert("RGB"); sl = dim(load("slats-frost.jpg").convert("RGBA"), 0.5, 8).convert("RGB")
    frost = fr.resize((int(fr.width * 0.25), int(fr.height * 0.25)), Image.LANCZOS)
    # slats: find the vertical period of the lit lower edges and tile whole slats
    sa = np.asarray(sl.convert("L")).astype(float)[:1300, 600:2200].mean(1)
    sa = sa - sa.mean(); ac = np.correlate(sa, sa, "full")[len(sa) - 1:]; per = int(np.argmax(ac[100:400])) + 100
    slat_tile = sl.crop((0, 100, 2752, 100 + per * 6)); pitch = 15
    for (w, h) in sizes:
        lip = nine(k, w, h, 80, 80, 80, 80, ls=0.0405)
        # inner shade, a soft ramp from the lip inwards so the picture sits in the glass
        yy, xx = np.mgrid[0:h, 0:w]; d = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)).astype(float)
        shade = np.clip(1 - d / 10.0, 0, 1) ** 2 * 0.45
        base = np.zeros((h, w, 4), np.uint8); base[..., 0] = 6; base[..., 1] = 14; base[..., 2] = 22; base[..., 3] = (shade * 255).astype(np.uint8)
        L = Image.fromarray(base, "RGBA"); L.alpha_composite(lip)
        save(f"trait-picture-frame-{w}x{h}", L, None, "key magenta lip, 9-slice, with a painted-ramp inner shade", "frame-thin")
        # unread: frost over the whole picture
        ft = frost.crop((0, 0, w, h)).convert("RGBA"); ft.putalpha(214); F = ft.copy(); F.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-unread", F, None, "frost texture at 0.9 alpha under the frame", "frost+frame-thin")
        # sealed: slats
        t = slat_tile.resize((w, per * 6 * pitch // per), Image.LANCZOS) if False else slat_tile.resize((w, 6 * pitch), Image.LANCZOS)
        S = Image.new("RGB", (w, h)); y = 0
        while y < h: S.paste(t, (0, y)); y += t.height
        S = S.convert("RGBA"); S.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-sealed", S, None, "slats texture tiled by whole slats, under the frame", "slats+frame-thin")
# ---- plates
def plates():
    im = load("plate-thin2.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05); bb = bbox_alpha(k, 140); pl = k.crop(bb); s = 320 / pl.width
    pln = dim(pl, 0.8)
    save("plate-name-224x32", round_alpha(nine(pln, 224, 32, 60, 60, 60, 60, ls=s), 5), [600, 440, 224, 32], "thin frosted label: colour-to-alpha, 9-slice, rounded", "plate-thin2")
    plo = dim(pl, 0.55)
    save("plate-origin-224x40", round_alpha(nine(plo, 224, 40, 60, 60, 60, 60, ls=s), 5), [600, 480, 224, 40], "thin frosted label: colour-to-alpha, 9-slice, rounded", "plate-thin2")
    for h in (36, 56, 76):
        save(f"plate-message-640x{h}", round_alpha(nine(plo, 640, h, 60, 60, 60, 60, ls=s), 6), [192, 550 - h, 640, h], "thin frosted label: 9-slice, rounded", "plate-thin2")
    lb = load("label-plate.jpg"); m = (np.asarray(lb).astype(int).min(2) < 240); ys, xs = np.where(m); bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    save("stamp-label-120x120", lb.crop(bb).resize((120, 120), Image.LANCZOS), [888, 248, 120, 120], "cut, 120x120", "label-plate")
# ---- bars
def bars():
    im = load("bar-top.jpg"); k = key_magenta(im); bb = bbox_alpha(k, 250); b = im.crop(bb).convert("RGBA")
    b = dim(b, 0.62)
    save("frame-top-bar-1024x40", b.resize((1024, 40), Image.LANCZOS), [0, 0, 1024, 40], "key magenta, cut, 1024x40", "bar-top")
    save("frame-bottom-line-1024x38", b.transpose(Image.FLIP_TOP_BOTTOM).resize((1024, 38), Image.LANCZOS), [0, 562, 1024, 38], "the bar flipped (rule on its top edge), 1024x38", "bar-top")

# ---- pods
POD_BOX = {"large": (160, 192), "medium": (136, 168), "small": (112, 144), "well": (32, 40)}
def pod_src(n):
    k = key_magenta(load(n + ".jpg"), lo=26, hi=70); a = np.asarray(k).astype(float).copy(); a[1775:, 3] = 0
    edge = a[..., 3] < 250; g = a[..., 1]
    a[..., 0] = np.where(edge, np.minimum(a[..., 0], g + 25), a[..., 0]); a[..., 2] = np.where(edge, np.minimum(a[..., 2], g + 14), a[..., 2])
    return a
def label(mask, ds=2, minarea=0):
    """4-connected components of a boolean mask (on a ds-downsampled copy); returns (labels, sizes) at full size."""
    from collections import deque
    m = mask[::ds, ::ds]; h, w = m.shape; lab = np.zeros((h, w), np.int32); sizes = [0]; n = 0
    for y in range(h):
        for x in range(w):
            if m[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n; c = 0
                while q:
                    cy, cx = q.popleft(); c += 1
                    for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
                sizes.append(c * ds * ds)
    full = np.kron(lab, np.ones((ds, ds), np.int32))[:mask.shape[0], :mask.shape[1]]
    return full, sizes
def label_dilate(m, r):
    out = m.astype(float)
    for _ in range(r): out = np.maximum(out, np.maximum.reduce([np.roll(out, 1, 0), np.roll(out, -1, 0), np.roll(out, 1, 1), np.roll(out, -1, 1)]))
    return out
def _sphere(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(float); cx, cy = w * 0.5, h * 0.60; rx, ry = w * 0.5, h * 0.40
    u = (xx - cx) / rx; v = (yy - cy) / ry; z = np.sqrt(np.clip(1 - u * u - v * v * 0.8, 0.0, 1)); lon = np.arctan2(u, np.maximum(z, 1e-3)); lat = np.arcsin(np.clip(v, -1, 1))
    return lon, lat, z
def stripes_mask(w, h, n=9):
    """Fine meridian lines that follow the shell's curvature and fade toward its edge: a quiet mark, never a bold bar."""
    lon, lat, z = _sphere(w, h); ph = (lon / np.pi * n) % 1.0; d = np.minimum(ph, 1 - ph)
    return np.clip(1 - d / 0.07, 0, 1) ** 1.5 * np.clip(z * 1.6, 0, 1) * 0.55
def bands_mask(w, h):
    """Two soft hoops of latitude, thin and feathered."""
    lon, lat, z = _sphere(w, h); m = 0
    for c0, wd in ((0.18, 0.045), (0.46, 0.035)):
        m = np.maximum(m, np.clip(1 - np.abs(lat - c0) / wd, 0, 1) ** 1.4)
    return m * np.clip(z * 1.6, 0, 1) * 0.55
def pods():
    BB = (376, 288, 1704, 1760); bw, bh = BB[2] - BB[0], BB[3] - BB[1]
    L, I, B = pod_src("pod-loika"), pod_src("pod-identified"), pod_src("pod-band")
    lum = lambda a: a[..., :3] @ np.array([0.3, 0.59, 0.11])
    crop = lambda a: a[BB[1]:BB[3], BB[0]:BB[2]]
    Ic = crop(I); sil = Ic[..., 3] / 255.0; l = lum(Ic)
    mB = np.clip((l - 130) / 40.0, 0, 1) * sil                       # the accent colour: cap, ribs and the pattern marks
    # structure = the large connected accent (cap and ribs); dots = the separate round marks
    lab, sizes = label(mB > 0.5, 2); big = np.array([0] + [1 if sz > 9000 else 0 for sz in sizes[1:]])
    struct0 = np.where(big[lab] == 1, 1.0, 0.0) * np.clip((l - 120) / 40.0, 0, 1) * sil
    structure = np.clip(struct0, 0, 1)
    # the dots that touch a rib foot: below row 1200 a dot (found with a lower threshold, because the shading darkens it)
    # survives an opening that a rib does not
    mB2 = np.clip((l - 110) / 40.0, 0, 1) * sil
    m2 = (mB2 > 0.25)[::2, ::2]; er = ~label_dilate(~m2, 8).astype(bool); op = label_dilate(er, 11).astype(bool)
    core = np.kron(op, np.ones((2, 2), bool))[:mB.shape[0], :mB.shape[1]]; core[:1200] = False
    low = np.clip(label_dilate(core, 3), 0, 1) * (mB2 > 0.1)
    structure = np.clip(structure - low, 0, 1)
    # a crack in the cap is not a hole in the accent: close the cap
    cap = label_dilate(structure[:380] > 0.5, 6); capc = ~label_dilate(~cap.astype(bool), 6).astype(bool)
    structure[:380] = np.maximum(structure[:380], capc * sil[:380])
    dots = np.clip(np.maximum(mB, low * mB2) - structure, 0, 1)
    body = np.clip(sil - structure, 0, 1)
    albA = np.median(l[(mB < 0.05) & (sil > 0.9)]); albB = np.median(l[(mB > 0.95)])
    alb = albA * (1 - mB) + albB * mB
    shade = np.clip(l / alb * 0.5, 0, 1)                             # 0.5 is neutral: colour x (2 x grey), clipped
    # the pattern marks must not ghost through the shading: fill the shading under them from what surrounds them
    dm = np.clip(np.kron(label_dilate(dots > 0.1, 6), np.ones((1, 1))), 0, 1)
    w_ok = 1 - dm; fill = np.zeros_like(shade); got = np.zeros_like(shade)
    for sg in (14, 40, 110):
        num = smooth1d(smooth1d(shade * w_ok, sg, 0), sg, 1); den = smooth1d(smooth1d(w_ok, sg, 0), sg, 1)
        ok = (den > 0.08) & (got == 0); fill = np.where(ok, num / np.maximum(den, 1e-6), fill); got = np.where(ok, 1, got)
    shade = shade * (1 - dm) + fill * dm
    # the crack on the cap is its own layer, so a sealed shell is smooth: find the dark thin line, grow it, fill the shading under it
    blur = smooth1d(smooth1d(shade, 7, 0), 7, 1); cr = np.clip((blur - shade) - 0.02, 0, 1) * sil; cr[380:] = 0; cr[:, :int(bw * 0.45)] = 0
    cm = label_dilate(cr > 0.02, 7); w_ok = 1 - cm; fill = np.zeros_like(shade); got = np.zeros_like(shade)
    for sg in (10, 30):
        num = smooth1d(smooth1d(shade * w_ok, sg, 0), sg, 1); den = smooth1d(smooth1d(w_ok, sg, 0), sg, 1)
        ok = (den > 0.1) & (got == 0); fill = np.where(ok, num / np.maximum(den, 1e-6), fill); got = np.where(ok, 1, got)
    shade = shade * (1 - cm) + fill * cm
    crack = np.dstack([np.full(cr.shape, 26.0), np.full(cr.shape, 20.0), np.full(cr.shape, 18.0), np.clip(cr * 5, 0, 1) * 255])
    h_, w_ = sil.shape
    cap_rows = None
    masks = {"crack": crack, "shade": np.dstack([np.repeat(shade[..., None] * 255, 3, 2), sil * 255]),
             "mask-body": None, "mask-accent": None, "pattern-dots": None, "pattern-stripes": None, "pattern-bands": None}
    wh = lambda m: np.dstack([np.full(m.shape + (3,), 255.0), m * 255])
    masks["mask-body"] = wh(body); masks["mask-accent"] = wh(structure); masks["pattern-dots"] = wh(dots)
    inner = body * (1 - np.clip(np.zeros_like(body), 0, 1))
    masks["pattern-stripes"] = wh(stripes_mask(w_, h_) * body * (1 - structure)); masks["pattern-bands"] = wh(bands_mask(w_, h_) * body * (1 - structure))
    # the sealing band, as before
    db = np.clip((lum(I) - lum(B) - 30) / 50, 0, 1); db[:BB[1] + 150] = 0; db[BB[1] + 520:] = 0
    Bd = B.copy(); Bd[..., 3] = db * 255
    flat = {"identified": crop(L), "sealed": crop(B), "band": crop(Bd)}
    for cls, (w, h) in POD_BOX.items():
        f = min(w / bw, h / bh); pw, ph = max(1, round(bw * f)), max(1, round(bh * f)); ox, oy = (w - pw) // 2, h - ph
        def put(arr, extra=None):
            im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").resize((pw, ph), Image.LANCZOS)
            c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); c.alpha_composite(im, (ox, oy)); return c
        r = {"large": [632, 208, 160, 192], "medium": [644, 232, 136, 168], "small": [656, 256, 112, 144]}.get(cls, [None, None, w, h])
        for nm, arr in masks.items(): save(f"pod-{cls}-{nm}", put(arr), r, "systematic pod layer: " + nm + ", uniform scale, foot on the last row, centred", "pod-identified")
        if cls == "well":
            # legible at 32x40: darken and thicken the band before the downscale, and rebuild the sealed sprite from it
            bd = flat["band"].copy(); al = label_dilate(bd[..., 3] > 40, 14) * 255; bd[..., :3] = np.minimum(bd[..., :3], 40); bd[..., 3] = np.maximum(bd[..., 3] * 1.6, al * 0.9); flat = dict(flat, band=bd)
            sealed = flat["sealed"].copy(); m = bd[..., 3:4] / 255.0; sealed[..., :3] = sealed[..., :3] * (1 - m) + bd[..., :3] * m; flat["sealed"] = sealed
        for nm, arr in flat.items(): save(f"pod-{cls}-{nm}", put(arr), r, "the Loika reference sprite" if nm != "band" else "the sealing band as a layer", "pod-loika" if nm == "identified" else "pod-band")
        sw, sh_ = w + 16, 14; yy, xx = np.mgrid[0:sh_, 0:sw].astype(float)
        a = np.clip(1 - (((xx - sw / 2) / (sw / 2)) ** 2 + ((yy - sh_ / 2) / (sh_ / 2)) ** 2), 0, 1) ** 1.2 * 0.6
        sdw = np.dstack([np.full((sh_, sw), 6.0), np.full((sh_, sw), 12.0), np.full((sh_, sw), 18.0), a * 255]).astype(np.uint8)
        save(f"pod-{cls}-shadow", Image.fromarray(sdw, "RGBA"), [712 - sw // 2, 393, sw, sh_], "contact shadow: centred on x 712 with its middle on the foot line y 400", "procedural ramp")

if __name__ == "__main__":
    which = sys.argv[1:] or ["bench", "cradle", "listcol", "tabs", "pages", "frames", "plates", "bars"]
    for w in which: globals()[w]()
    old = json.load(open("slices/manifest.json")) if os.path.exists("slices/manifest.json") else {}
    old.update(MAN); json.dump(old, open("slices/manifest.json", "w"), indent=1)
    print(len(MAN), "slices")
