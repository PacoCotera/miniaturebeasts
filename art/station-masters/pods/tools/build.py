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
    im = load("bench-d2.jpg"); W, H = im.size
    s = 0.39; x0 = 42; top = 543; h = int(522 / s) + 1; w = int(1024 / s) + 1
    arr = np.asarray(im).astype(float); need = top + h - H
    row = smooth1d(arr[-40:].mean(0), 25, 0); padv = np.repeat(row[None], need, 0) * np.linspace(1, 0.82, need)[:, None, None]
    pad = np.concatenate([arr, padv], 0)
    win = Image.fromarray(np.clip(pad, 0, 255).astype(np.uint8)).crop((x0, top, x0 + w, top + h)).resize((1024, 522), Image.LANCZOS)
    save("room-bench-stage", win, [0, 40, 1024, 522], "cut: bench-d2 window, bottom extended", "bench-d2")
# ---- cradle 224x40 (+ front rim), shelf
def cradle():
    im = load("cradle3.jpg"); bg = border_median(im); k = color_to_alpha(im, bg)
    bb = bbox_alpha(k, 30); k = k.crop(bb)
    c = k.resize((224, 40), Image.LANCZOS); save("room-cradle", c, [232, 296, 224, 40], "color-to-alpha on flat ground, cut, resampled 224x40", "cradle3")
    a = np.asarray(c).copy(); yy = np.arange(40)[:, None]
    # near rim: the lower part of the ring, below the pod's foot line (y 312 -> row 16 of the cradle)
    fade = np.clip((yy - 15) / 4.0, 0, 1); a[..., 3] = (a[..., 3] * fade).astype(np.uint8)
    save("room-cradle-front", Image.fromarray(a, "RGBA"), [232, 296, 224, 40], "the cradle's near rim only (rows 16 to 39), drawn over the pod's foot", "cradle3")
    im = load("cradle-shelf.jpg"); bg = border_median(im); k = color_to_alpha(im, bg); k = k.crop(bbox_alpha(k, 30))
    save("room-shelf", k.resize((288, 48), Image.LANCZOS), [200, 304, 288, 48], "PROPOSED: the glass shelf under the cradle; color-to-alpha, cut, 288x48", "cradle-shelf")
# ---- list column
def listcol():
    im = load("list-column.jpg"); im = im.crop((1536 - 735, 0, 1536, 2400)).resize((160, 522), Image.LANCZOS)
    save("ring-column", im, [0, 40, 160, 522], "cut: right part of list-column, bottom leak cropped", "list-column")
    k = key_magenta(load("well.jpg").crop((0, 0, 2048, 1620)).resize((2048, 1620)));
    for nm, box in (("ring-well-empty", (0, 0, 1024, 1620)), ("ring-well-current", (1024, 0, 2048, 1620))):
        sk = k.crop(box); bb = bbox_alpha(sk, 128); c = sk.crop(bb)
        side = max(c.size); canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0)); canvas.paste(c, ((side - c.width) // 2, (side - c.height) // 2))
        save(nm, canvas.resize((64, 64), Image.LANCZOS), [40, 52, 64, 64], "key magenta, cut, 64x64", "well")
    h = key_magenta(load("hatch.jpg")); h = h.crop(bbox_alpha(h, 128)); save("ring-hatch", h.resize((112, 56), Image.LANCZOS), [24, 488, 112, 56], "key magenta, cut, 112x56", "hatch")
# ---- rail tab plates
def tabs():
    k = key_magenta(load("tab-sheet.jpg")); a = np.asarray(k)[..., 3]
    boxes = comp_bboxes(a, 128, 30000); boxes = [b for b in boxes if b[1] < 1300 and (b[2]-b[0]) > 400]
    boxes.sort(key=lambda b: (round(b[1] / 400), b[0]))
    names = ["unread", "read", "focused", "sealed"]
    cs = {nm: k.crop(bb) for nm, bb in zip(names, boxes)}
    # focused: the read plate with a lit face and a bright rim, so cream words keep their contrast
    r = np.asarray(cs["read"].resize((112, 56), Image.LANCZOS)).astype(float).copy(); yy = np.linspace(1, 0, 56)[:, None]
    r[..., :3] = np.clip(r[..., :3] * 1.18 + 14 * yy[..., None] + 10, 0, 255)
    cs["focused"] = Image.fromarray(r.astype(np.uint8), "RGBA").resize(cs["read"].size, Image.LANCZOS)
    for nm in names:
        c = cs[nm]
        p112 = c.resize((112, 56), Image.LANCZOS)
        save(f"rail-tab-{nm}-112x56", p112, [None, 48, 112, 56], "key magenta, cut, 112x56", "tab-sheet")
        save(f"rail-tab-{nm}-96x56", nine(p112, 96, 56, 14, 14, 14, 14), [None, 48, 96, 56], "9-slice of the 112 plate (corners kept)", "tab-sheet")
        save(f"rail-tab-{nm}-56x56", nine(p112, 56, 56, 14, 14, 14, 14), [None, 48, 56, 56], "9-slice of the 112 plate (corners kept)", "tab-sheet")
# ---- page panes
def pages():
    im = load("page-pane.jpg"); W, H = im.size
    a = np.asarray(im.convert("L")).astype(float)
    pane = im.crop((70, 62, 2331, 1733)); s = 480 / pane.width
    for nm, w in (("page-pane-480x440", 480), ("page-pane-408x440", 408)):
        save(nm, nine(pane.convert("RGBA"), w, 440, 70, 70, 70, 70, ls=s), [528 if w == 480 else None, 112, w, 440], "9-slice of the generated pane, corners kept at 1x", "page-pane")
# ---- picture frames
def frames():
    k = key_magenta(load("frame-thin.jpg")); k = k.crop(bbox_alpha(k, 10))
    sizes = [(448, 312), (216, 304), (216, 112), (144, 112), (376, 264), (184, 256), (184, 104), (120, 96)]
    s = 1536 / k.width * 0 + 0.19
    fr = load("frost.jpg"); sl = load("slats.jpg")
    frost = fr.resize((int(fr.width * 0.25), int(fr.height * 0.25)), Image.LANCZOS)
    # slats: find the vertical period of the lit lower edges and tile whole slats
    sa = np.asarray(sl.convert("L")).astype(float)[:1300, 600:2200].mean(1)
    sa = sa - sa.mean(); ac = np.correlate(sa, sa, "full")[len(sa) - 1:]; per = int(np.argmax(ac[100:400])) + 100
    slat_tile = sl.crop((0, 100, 2752, 100 + per * 6)); pitch = 15
    for (w, h) in sizes:
        lip = nine(k, w, h, 24, 24, 24, 24, ls=0.19)
        # inner shade, a soft ramp from the lip inwards so the picture sits in the glass
        yy, xx = np.mgrid[0:h, 0:w]; d = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)).astype(float)
        shade = np.clip(1 - d / 10.0, 0, 1) ** 2 * 0.45
        base = np.zeros((h, w, 4), np.uint8); base[..., 0] = 6; base[..., 1] = 14; base[..., 2] = 22; base[..., 3] = (shade * 255).astype(np.uint8)
        L = Image.fromarray(base, "RGBA"); L.alpha_composite(lip)
        save(f"trait-picture-frame-{w}x{h}", L, None, "key magenta lip, 9-slice, with a painted-ramp inner shade", "frame-thin")
        # unread: frost over the whole picture
        ft = frost.crop((0, 0, w, h)).convert("RGBA"); ft.putalpha(236); F = ft.copy(); F.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-unread", F, None, "frost texture at 0.9 alpha under the frame", "frost+frame-thin")
        # sealed: slats
        t = slat_tile.resize((w, per * 6 * pitch // per), Image.LANCZOS) if False else slat_tile.resize((w, 6 * pitch), Image.LANCZOS)
        S = Image.new("RGB", (w, h)); y = 0
        while y < h: S.paste(t, (0, y)); y += t.height
        S = S.convert("RGBA"); S.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-sealed", S, None, "slats texture tiled by whole slats, under the frame", "slats+frame-thin")
# ---- plates
def plates():
    im = load("name-plate2.jpg"); a = np.asarray(im.convert("L")); 
    # crop the white border outside the plate
    m = (np.asarray(im).astype(int).min(2) < 235); ys, xs = np.where(m); bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    pl = im.crop(bb).convert("RGBA"); s = 320 / pl.width
    pl = dim(pl, 0.55)
    save("plate-name-320x32", round_alpha(nine(pl, 320, 32, 90, 90, 90, 90, ls=s), 7), [184, 344, 320, 32], "9-slice, rounded alpha", "name-plate2")
    o = round_alpha(nine(pl, 320, 40, 90, 90, 90, 90, ls=s), 7)
    save("plate-origin-320x40", o, [184, 384, 320, 40], "9-slice, rounded alpha (same glass as the name plate)", "name-plate2")
    for h in (36, 56, 76):
        save(f"plate-message-640x{h}", round_alpha(nine(pl, 640, h, 90, 90, 90, 90, ls=s), 8), [192, None, 640, h], "9-slice, rounded alpha", "name-plate2")
    lb = load("label-plate.jpg"); m = (np.asarray(lb).astype(int).min(2) < 240); ys, xs = np.where(m); bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    save("stamp-label-120x120", lb.crop(bb).resize((120, 120), Image.LANCZOS), [176, 432, 120, 120], "cut, 120x120", "label-plate")
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
def pods():
    BB = (376, 288, 1704, 1760)
    L, I, B = pod_src("pod-loika"), pod_src("pod-identified"), pod_src("pod-band")
    lum = lambda a: a[..., :3] @ np.array([0.3, 0.59, 0.11])
    # glyph: what the lit glyph adds to the blank cap, with its glow
    dg = np.clip((lum(L) - lum(I) - 14) / 40, 0, 1); dg[:BB[1] + 40] = 0; dg[BB[1] + 330:] = 0
    # the crack differs a little between the two draws: keep only the glyph's blob (left of the crack)
    G = L.copy(); G[..., 3] = dg * 255
    # band: what the sealing band darkens
    db = np.clip((lum(I) - lum(B) - 30) / 50, 0, 1); db[:BB[1] + 150] = 0; db[BB[1] + 520:] = 0
    Bd = B.copy(); Bd[..., 3] = db * 255
    for cls, (w, h) in POD_BOX.items():
        def cut(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").crop(BB).resize((w, h), Image.LANCZOS)
        r = [None, None, w, h]
        save(f"pod-{cls}-identified", cut(L), r, "key magenta, shell cut, fitted to the class box", "pod-loika")
        save(f"pod-{cls}-sealed", cut(B), r, "key magenta, shell cut, fitted to the class box", "pod-band")
        save(f"pod-{cls}-body", cut(I), r, "the identified shell without glyph or band", "pod-identified")
        save(f"pod-{cls}-glyph", cut(G), r, "the lit glyph and its glow as a layer (difference of two draws)", "pod-loika-pod-identified")
        save(f"pod-{cls}-band", cut(Bd), r, "the sealing band as a layer (difference of two draws)", "pod-band-pod-identified")
if __name__ == "__main__":
    which = sys.argv[1:] or ["bench", "cradle", "listcol", "tabs", "pages", "frames", "plates", "bars"]
    for w in which: globals()[w]()
    old = json.load(open("slices/manifest.json")) if os.path.exists("slices/manifest.json") else {}
    old.update(MAN); json.dump(old, open("slices/manifest.json", "w"), indent=1)
    print(len(MAN), "slices")
