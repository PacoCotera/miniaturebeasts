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
    save("room-bench-stage", bench_window("bench-e2.jpg", 1374, 1244, 0.31), [0, 40, 1024, 522], "the generated glass wall: horizon flattened, sides and bottom extended from the wall's own strips, window on the pool (712, 424)", "bench-e2")
def cradle():
    im = load("dish-moss1.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05)
    # the faint ring at the top of the generated image is a halo, not part of the dish: keep the lower component
    a = np.asarray(k).copy(); a[:int(0.3 * a.shape[0]), :, 3] = 0; k = Image.fromarray(a, "RGBA"); bb = bbox_alpha(k, 40); d = k.crop(bb)
    f = min(224 / d.width, 72 / d.height); d = d.resize((round(d.width * f), round(d.height * f)), Image.LANCZOS)
    c = Image.new("RGBA", (224, 72), (0, 0, 0, 0)); c.alpha_composite(d, ((224 - d.width) // 2, 72 - d.height))
    save("room-cradle", c, [600, 352, 224, 72], "the frosted dish with its moss bed: colour-to-alpha, cut, scaled evenly into 224x72 (the dish is %d px wide), bottom on the last row" % d.width, "dish-moss1")
    x = np.asarray(c).copy(); yy = np.arange(72)[:, None]; fade = np.clip((yy - 44) / 6.0, 0, 1); x[..., 3] = (x[..., 3] * fade).astype(np.uint8)
    save("room-cradle-front", Image.fromarray(x, "RGBA"), [600, 352, 224, 72], "the dish's near lip only (rows 44 to 71), drawn over the pod's foot at the foot line y 400", "dish-moss1")
    im = load("cradle-shelf.jpg"); bg = border_median(im); k = color_to_alpha(im, bg); k = k.crop(bbox_alpha(k, 30))
    save("room-shelf", k.resize((272, 40), Image.LANCZOS), [576, 392, 272, 40], "PROPOSED: the glass shelf under the dish and the name; colour-to-alpha, cut, 272x40", "cradle-shelf")
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
    k = key_magenta(load("tabs2.jpg")); a = np.asarray(k)[..., 3]
    boxes = comp_bboxes(a, 128, 30000); boxes = [b for b in boxes if (b[2]-b[0]) > 400]
    boxes.sort(key=lambda b: (round(b[1] / 500), b[0]))
    names = ["unread", "read", "focused", "sealed"]
    for nm, bb in zip(names, boxes):
        c = k.crop(bb); p112 = dim(c.resize((112, 56), Image.LANCZOS), {"unread": 0.8, "focused": 0.88}.get(nm, 1.0))
        save(f"rail-tab-{nm}-112x56", p112, [None, 48, 112, 56], "key magenta, cut, 112x56", "tabs2")
        save(f"rail-tab-{nm}-96x56", nine(p112, 96, 56, 24, 8, 24, 8), [None, 48, 96, 56], "9-slice of the 112 plate (slants kept)", "tabs2")
        save(f"rail-tab-{nm}-56x56", nine(p112, 56, 56, 24, 8, 24, 8), [None, 48, 56, 56], "9-slice of the 112 plate (slants kept)", "tabs2")
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
    fr = load("frost-dark.jpg"); sl = load("slats-light.jpg")
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
        ft = frost.crop((0, 0, w, h)).convert("RGBA"); ft.putalpha(232); F = ft.copy(); F.alpha_composite(L)
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
def stripes_mask(w, h, n=7, curve=0.10, duty=0.5):
    yy, xx = np.mgrid[0:h, 0:w].astype(float); u = (xx / w - 0.5) * 2
    v = yy / h + curve * (1 - u * u)          # bands wrap round the shell: they sag at the middle
    return (np.sin(2 * np.pi * v * n) > np.cos(np.pi * duty)).astype(float)
def bands_mask(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(float); u = (xx / w - 0.5) * 2; v = yy / h + 0.10 * (1 - u * u)
    return (((v > 0.50) & (v < 0.60)) | ((v > 0.68) & (v < 0.74))).astype(float)
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
    structure = np.clip(struct0, 0, 1); dots = np.clip(mB - structure, 0, 1)
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
    # the crack on the cap is its own layer, so a sealed shell is smooth
    blur = smooth1d(smooth1d(shade, 7, 0), 7, 1); cr = np.clip((blur - shade) - 0.03, 0, 1) * sil; cr[360:] = 0; cr[:, :int(bw * 0.45)] = 0
    shade = np.clip(shade + cr, 0, 1)
    crack = np.dstack([np.full(cr.shape, 26.0), np.full(cr.shape, 20.0), np.full(cr.shape, 18.0), np.clip(cr * 5, 0, 1) * 255])
    h_, w_ = sil.shape
    cap_rows = None
    masks = {"crack": crack, "shade": np.dstack([np.repeat(shade[..., None] * 255, 3, 2), sil * 255]),
             "mask-body": None, "mask-accent": None, "pattern-dots": None, "pattern-stripes": None, "pattern-bands": None}
    wh = lambda m: np.dstack([np.full(m.shape + (3,), 255.0), m * 255])
    masks["mask-body"] = wh(body); masks["mask-accent"] = wh(structure); masks["pattern-dots"] = wh(dots)
    inner = body * (1 - np.clip(np.zeros_like(body), 0, 1))
    masks["pattern-stripes"] = wh(stripes_mask(w_, h_) * body); masks["pattern-bands"] = wh(bands_mask(w_, h_) * body)
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
