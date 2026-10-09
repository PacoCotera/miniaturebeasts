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
def bench_grade(im):
    """Darken to the candidate's values: a tone curve that tames the cone, and a vignette that darkens the corners (centred on the pod's axis)."""
    a = np.asarray(im).astype(float) / 255; a = 0.82 * a ** 1.55
    yy, xx = np.mgrid[0:522, 0:1024]; r = np.sqrt(((xx - 632) / 620.0) ** 2 + ((yy - 250) / 420.0) ** 2)
    v = np.clip(1 - 0.62 * np.clip(r - 0.25, 0, 1.2) ** 1.4, 0.18, 1)
    return Image.fromarray(np.clip(a * v[..., None] * 255, 0, 255).astype(np.uint8))
def bench():
    save("room-bench-stage", bench_grade(bench_window("bench-e2.jpg", 1374, 1244, 0.31, target=(632, 384))), [0, 40, 1024, 522], "the generated glass wall: horizon flattened, sides and bottom extended from the wall's own strips, window on the pool (632, 424)", "bench-e2")
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
    save("room-cradle", c, [520, 328, 224, 96], "the deep frosted bowl with its dark dust bed and the cool glow through its wall: opaque cut, scaled evenly into 224x96 (the bowl is %d px wide), bottom on the last row" % d.width, "dish-lowa")
    x = np.asarray(c).astype(float).copy(); H, W = 96, 224
    # the near rim's own contour, read off the bowl's lit rim edge: both near side walls from their top edge (row ~19), the dip's U
    pts = [(11, 19), (25, 24), (40, 27), (52, 30), (58, 34), (63, 41), (70, 52), (80, 62), (95, 69), (112, 72), (130, 69), (142, 62), (150, 52), (155, 41), (160, 34), (166, 30), (178, 27), (195, 23), (210, 19), (224, 19)]
    px = np.array([p[0] for p in pts], float); py = np.array([p[1] for p in pts], float)
    yc = smooth1d(np.interp(np.arange(W), px, py), 1.2, 0)
    rows = np.arange(H)[:, None].astype(float)
    below = np.clip(rows - yc[None, :] + 0.5, 0, 1)                      # 1 below the contour, antialiased over a pixel
    # the dip's bed in front of the pod's round foot: uneven grit tufts lapping it, their tops ragged, the rim's curve visible below them
    rng = np.random.RandomState(7); tuft = np.zeros((H, W))
    for cx, hw, hh in ((88, 8, 5), (99, 7, 8), (112, 9, 6), (124, 7, 9), (136, 8, 5)):
        xs = np.arange(W); prof = np.clip(1 - ((xs - cx) / hw) ** 2, 0, 1) ** 0.6
        top = 66 - hh * prof + rng.uniform(-0.6, 0.6, W) * (prof > 0)
        tuft = np.maximum(tuft, np.clip(rows - top[None, :] + 0.5, 0, 1) * (prof[None, :] > 0))
    inside = np.clip(yc[None, :] - 0.0 - (rows - 0), 0, 1)                # above the contour: the dip's interior
    mask = np.maximum(below, tuft * (rows < yc[None, :] + 0.5))
    x[..., 3] = x[..., 3] * np.clip(mask, 0, 1); x = x.astype(np.uint8)
    save("room-cradle-front", Image.fromarray(x, "RGBA"), [520, 328, 224, 96], "the bowl's near wall cut along its own near-rim contour (both side walls from row ~19 and the dip's U), plus five uneven grit tufts lapping the pod's foot inside the dip", "dish-lowa")
    SH = (488, 368, 288, 72)
    im = load("slab4b.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05); k = k.crop(bbox_alpha(k, 60))
    f = min(SH[2] / k.width, SH[3] / k.height); k = k.resize((round(k.width * f), round(k.height * f)), Image.LANCZOS); k = dim(k, 0.9)
    c = Image.new("RGBA", SH[2:], (0, 0, 0, 0)); c.alpha_composite(k, ((SH[2] - k.width) // 2, SH[3] - k.height))
    # the bowl's contact shadow on the top face: a soft dark ellipse under the bowl's footprint (the bowl is 201 wide, centred on x 712, its front lip at y 424)
    yy, xx = np.mgrid[0:SH[3], 0:SH[2]].astype(float); cx = 632 - SH[0]; cy = 424 - SH[1] - 14
    e = np.clip(1 - (((xx - cx) / 112.0) ** 2 + ((yy - cy) / 16.0) ** 2), 0, 1) ** 1.3 * 0.55
    a = np.asarray(c).astype(float); a[..., :3] = a[..., :3] * (1 - e[..., None]) + np.array([4, 10, 14.0]) * e[..., None]; a[..., 3] = np.maximum(a[..., 3], e * 255 * (a[..., 3] > 0))
    save("room-shelf", Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA"), list(SH), "the concept's slab, a trapezoid in perspective with a deep top face and a lit front edge, with the bowl's contact shadow on it; colour-to-alpha, scaled evenly", "slab4b")
# ---- list column
def listcol():
    im = load("list-column.jpg"); im = im.crop((1536 - 735, 0, 1536, 2400)).resize((160, 522), Image.LANCZOS)
    save("ring-column", im, [0, 40, 160, 522], "cut: right part of list-column, bottom leak cropped", "list-column")
    im2 = load("list-column.jpg"); im2 = im2.crop((1536 - 515, 0, 1536, 2400)).resize((112, 522), Image.LANCZOS)
    save("ring-column-112x522", im2, [0, 40, 112, 522], "the list column at the concept's 112 px: the right part of list-column (its lit hairline on the right edge), bottom leak cropped", "list-column")
    im = load("well-rings2.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.06)
    for nm, box in (("ring-well-empty", (0, 0, 1024, 2048)),):
        sk = k.crop(box); bb = bbox_alpha(sk, 90); cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2; side = int(max(bb[2] - bb[0], bb[3] - bb[1]) * (1.0 if "empty" in nm else 1.12))
        c = sk.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((64, 64), Image.LANCZOS)
        save(nm, c, [40, 52, 64, 64], "colour-to-alpha on the flat ground, the ring cut square, 64x64 (hollow)", "well-rings2")
        c80 = Image.new("RGBA", (80, 80), (0, 0, 0, 0)); c80.alpha_composite(c, (8, 8)); save("ring-well-empty-80x80", c80, [16, 44, 80, 80], "the signed ring-well-empty re-exported only: padded to 80x80, centred on (40,40) so every well slice shares one origin", "well-rings2")
    im = load("hatch-leaf.jpg"); bg = border_median(im); h = color_to_alpha(im, bg, 0.05); bb = bbox_alpha(h, 60)
    pad = 10; lf = h.crop((bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)); sc = 28 / lf.height; lf = lf.resize((max(1, round(lf.width * sc)), 28), Image.LANCZOS)
    cv = Image.new("RGBA", (112, 56), (0, 0, 0, 0)); cv.alpha_composite(lf, ((112 - lf.width) // 2, 14)); save("ring-hatch", cv, [0, 488, 112, 56], "a leaf etched into the column glass (colour-to-alpha), 24 px leaf centred, no box", "hatch-leaf")
    cv = Image.new("RGBA", (80, 56), (0, 0, 0, 0)); cv.alpha_composite(lf, ((80 - lf.width) // 2, 14)); save("ring-hatch-80x56", cv, [16, 488, 80, 56], "the hatch at the 112 px column's width: the same etched leaf centred in 80x56", "hatch-leaf")
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

def tabfills():
    """The rail's tabs under the rule of design-pods-relayout 29b6dc9: one fill per state (unread and read share the panel, the open tab is one step lighter
    in the hairline role, the sealed tab is the panel with horizontal slats in the bar role), no lit rim, no teal, no notch; every edge, the shared slants
    too, is one pixel of bevel. The slants lean 16 px over the 40 px height; the slice is the tab's width plus the slant. Chrome geometry, set by the tool."""
    H = 40; SS = 4
    cols = {"panel": (0x2a, 0x2e, 0x38), "hairline": (0x3c, 0x4b, 0x57), "bar": (0x34, 0x38, 0x3f), "bevel": (0x5a, 0x66, 0x72)}
    for w, form in ((136, "full-152x40"), (56, "compact-72x40")):
        W = w + 16
        yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(float); x = (xx + 0.5) / SS; y = (yy + 0.5) / SS
        left = 16 * y / H; right = w + 16 * y / H
        inside = (x >= left) & (x <= right) & (y <= H)
        edge = inside & ((x < left + 1.0) | (x > right - 1.0) | (y > H - 1.0) | (y < 1.0 * 0))   # a 1 px bevel on the slants and the bottom; the top meets the bar's rule
        for state, fillname in (("unread", "panel"), ("read", "panel"), ("open", "hairline"), ("sealed", "panel")):
            img = np.zeros((H * SS, W * SS, 4)); img[..., 3] = inside * 255
            for c in range(3): img[..., c] = cols[fillname][c]
            if state == "sealed":                                              # horizontal slats in the bar role, 2 px on a 4 px pitch
                slat = (np.floor(y) % 4 < 2) & (y > 3) & (y < H - 4)
                for c in range(3): img[..., c] = np.where(slat, cols["bar"][c], img[..., c])
            for c in range(3): img[..., c] = np.where(edge, cols["bevel"][c], img[..., c])
            a_ = img.reshape(H, SS, W, SS, 4).mean((1, 3)); col = (img[..., :3] * img[..., 3:4]).reshape(H, SS, W, SS, 3).sum((1, 3)) / np.maximum(img[..., 3].reshape(H, SS, W, SS).sum((1, 3)), 1)[..., None]
            out = np.dstack([col, a_[..., 3]])
            save(f"rail-tab-fill-{state}-{form}", Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"), [None, 40, W, H], f"one fill per state ({fillname}{', slats in bar' if state == 'sealed' else ''}), a 1 px bevel on its edges, no lit rim; slant 16 baked", "chrome geometry, supersampled 4x")
# ---- page panes
def pages():
    im = load("page-pane.jpg"); W, H = im.size
    a = np.asarray(im.convert("L")).astype(float)
    pane = im.crop((70, 62, 2331, 1733)); s = 480 / pane.width
    for nm, w, px in (("page-pane-408x440", 408, 176), ("page-pane-256x440", 256, 152)):
        p = nine(pane.convert("RGBA"), w, 440, 70, 70, 70, 70, ls=s); arr = np.asarray(p).astype(float).copy()
        yy, xx = np.mgrid[0:440, 0:w]; dist = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, 439 - yy)).astype(float)
        k = np.clip((dist - 2.0) / 4.0, 0, 1)                      # 0 on the lit hairline edge, 1 inside
        arr[..., :3] = arr[..., :3] * (1 - k[..., None]) + (arr[..., :3] * 0.30 + np.array([4.0, 10.0, 14.0]) * 0.8) * k[..., None]
        save(nm, Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA"), [px, 112, w, 440], "9-slice of the generated pane, brought to the stage wall's values inside a lit hairline edge", "page-pane")
# ---- picture frames
def panenine():
    """page-pane-256x440 as a clean nine-slice with the house's light kept (pods.json: the pane shortens to its content, 264 / 248 / 440 high). The painted pane's edges varied
    along their length and its corners did not match them, so tiling would have shown. Insets left 64, top 64, right 16, bottom 16: each edge is its median profile (the lit hairline),
    constant along its length; the other three corners are mitres of their two edge profiles; the fill is one flat value at luma 21 (the old body was a step lighter); the top-left
    piece is 64x64 and carries the painted pane's soft top-left falloff (about 43 at the top left against about 20 across the body), fading to the plain edge and fill at its right and
    bottom seams, so corners never stretch and it holds at every height. Run after `pages` (it reads the painted pane)."""
    m = np.asarray(Image.open(OUT + "page-pane-256x440.png").convert("RGBA")).astype(float); H, W = m.shape[:2]; I = 16; K = 64
    luma = lambda a: a[..., :3] @ np.array([0.299, 0.587, 0.114])
    top = np.median(m[:I, K:W - I], axis=1); bot = np.median(m[H - I:, K:W - I], axis=1); lef = np.median(m[K:H - I, :I], axis=0); rig = np.median(m[K:H - I, W - I:], axis=0)
    cx, cy = W // 2 - 16, H // 2 - 16; patch = np.median(m[cy:cy + 32, cx:cx + 32].reshape(-1, 4), axis=0)
    fill = patch.copy(); fill[:3] = patch[:3] * 21.0 / luma(patch[None, :])[0]
    new = np.zeros_like(m); new[:] = fill
    new[:I, K:W - I] = top[:, None, :]; new[H - I:, K:W - I] = bot[:, None, :]; new[K:H - I, :I] = lef[None, :, :]; new[K:H - I, W - I:] = rig[None, :, :]
    new[I:K, W - I:] = rig[None, :, :]; new[H - I:, I:K] = bot[:, None, :]                       # the right edge up to the top corner, the bottom edge back to the left corner
    for y in range(I):                                                                          # the other three corners (16x16): mitres of their two edges
        for x in range(I):
            new[y, W - 1 - x] = top[y] if y <= x else rig[I - 1 - x]
            new[H - 1 - y, x] = bot[I - 1 - y] if y <= x else lef[x]; new[H - 1 - y, W - 1 - x] = bot[I - 1 - y] if y <= x else rig[I - 1 - x]
    # the top-left piece (64x64): the hairline bands (mitred at the very corner), fill elsewhere, then the painted falloff added with a weight fading to 0 at the right and bottom seams
    C = np.zeros((K, K, 4)); C[:] = fill; C[:I, :] = top[:, None, :]; C[:, :I] = lef[None, :, :]
    for y in range(I):
        for x in range(I): C[y, x] = top[y] if y <= x else lef[x]
    body = float(np.median(luma(m[cy:cy + 32, cx:cx + 32]))); g = np.exp(-0.5 * (np.arange(-18, 19) / 6.0) ** 2); g /= g.sum()
    lp = np.pad(luma(m)[I:I + K + 24, I:I + K + 24], 18, mode="edge"); lp = np.apply_along_axis(lambda v: np.convolve(v, g, "same"), 0, lp); lp = np.apply_along_axis(lambda v: np.convolve(v, g, "same"), 1, lp)
    idx = np.clip(np.arange(K) - I, 0, None); L = lp[18:, 18:][np.ix_(idx, idx)]; delta = np.clip(L - body, 0, None)           # the glass only (the bright hairline is left out of the blur)
    sm = lambda t: t * t * (3 - 2 * t); fx = sm(np.clip((K - 1 - np.arange(K)) / 24.0, 0, 1))
    wt = np.minimum(fx[None, :], fx[:, None]); band = (np.arange(K)[:, None] < I) | (np.arange(K)[None, :] < I); wt = np.where(band, wt * 0.35, wt)   # on the hairline bands a third of it
    add = delta * wt; d_rgb = fill[:3] / luma(fill[None, :])[0]
    C[..., :3] += add[..., None] * d_rgb[None, None, :]
    new[:K, :K] = C
    save("page-pane-256x440", Image.fromarray(np.clip(new, 0, 255).astype(np.uint8), "RGBA"), [152, 112, 256, 440], "the page pane as a clean nine-slice with the house's top-left light: insets left 64, top 64, right 16, bottom 16; serves 440, 264 and 248 high", "page-pane (painted), regularised")
    MAN["page-pane-256x440"]["nine"] = {"insets": {"left": 64, "top": 64, "right": 16, "bottom": 16}, "edgeTile": 32, "fillTile": [32, 32], "heights": [440, 264, 248], "topLeftPiece": [64, 64]}
def frames():
    k = key_magenta(load("frame-lip.jpg")); k = k.crop(bbox_alpha(k, 10))
    sizes = [(184, 304), (184, 112), (120, 112), (376, 264), (184, 256), (184, 104), (120, 96), (224, 352), (224, 160), (104, 160), (104, 96), (104, 64), (112, 112), (144, 176), (176, 144)]
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
        if (w, h) == (112, 112): continue          # the find picture frame of a sealed chapter is the plain frame only
        # unread: frost over the whole picture
        ft = frost.crop((0, 0, w, h)).convert("RGBA"); ft.putalpha(214); F = ft.copy(); F.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-unread", F, None, "frost texture at 0.9 alpha under the frame", "frost+frame-thin")
        # sealed: translucent glass slats, the stage's teal faintly through them, the top edges lit
        t = slat_tile.resize((w, 6 * pitch), Image.LANCZOS); S0 = Image.new("RGB", (w, h)); y = 0
        while y < h: S0.paste(t, (0, y)); y += t.height
        g = np.asarray(S0).astype(float); lm = g @ np.array([0.3, 0.59, 0.11]); lm = (lm - lm.min()) / max(np.ptp(lm), 1)
        teal = np.array([46.0, 92.0, 108.0]); col = 0.45 * g + 0.55 * teal
        edge = np.clip(np.abs(np.diff(lm, axis=0, prepend=lm[:1])) * 4, 0, 1)
        al = np.clip(0.34 + 0.30 * lm + 0.30 * edge, 0, 0.9)
        S = Image.fromarray(np.dstack([np.clip(col, 0, 255), al * 255]).astype(np.uint8), "RGBA"); S.alpha_composite(L)
        save(f"trait-picture-frame-{w}x{h}-sealed", S, None, "slats texture tiled by whole slats, under the frame", "slats+frame-thin")
def portrait():
    """The Picture state's deep frame 232x312 with the opening 200x280 (16 px inset): the painted frame resampled whole."""
    src = key_magenta(load("frame-deep1.jpg")); a0 = np.asarray(src)[..., 3]; ys, xs = np.where(a0[:, :] < 128); inset = int(np.min(np.where(a0[a0.shape[0] // 2] < 128)[0][:1]))   # the bezel is this many source px thick
    k = nine(src, 232, 312, inset, inset, inset, inset, ls=16 / inset)
    fr = dim(load("frost-dark.jpg").convert("RGBA"), 0.7).convert("RGB"); frost = fr.resize((int(fr.width * 0.25), int(fr.height * 0.25)), Image.LANCZOS)
    hole = np.asarray(k)[..., 3] < 128
    # plain
    save("trait-picture-frame-232x312", k, [264, 160, 232, 312], "the deep portrait frame: key magenta, resampled whole; the opening is 200x280 at 16 px inset", "frame-deep1")
    # unread: darker frost, 0.84 alpha, in the opening only
    ft = frost.crop((0, 0, 232, 312)).convert("RGBA"); ft.putalpha(214); F = Image.new("RGBA", (232, 312), (0, 0, 0, 0)); F.paste(ft, (0, 0), Image.fromarray((hole * 255).astype(np.uint8))); F.alpha_composite(k)
    save("trait-picture-frame-232x312-unread", F, [264, 160, 232, 312], "frost in the opening, under the deep frame", "frost-dark+frame-deep1")
    # sealed: translucent glass slats in the opening
    sl = dim(load("slats-frost.jpg").convert("RGBA"), 0.5, 8).convert("RGB"); sa = np.asarray(sl.convert("L")).astype(float)[:1300, 600:2200].mean(1); sa = sa - sa.mean()
    ac = np.correlate(sa, sa, "full")[len(sa) - 1:]; per = int(np.argmax(ac[100:400])) + 100; t = sl.crop((0, 100, 2752, 100 + per * 6)).resize((232, 90), Image.LANCZOS)
    S0 = Image.new("RGB", (232, 312)); y = 0
    while y < 312: S0.paste(t, (0, y)); y += t.height
    g = np.asarray(S0).astype(float); lm = g @ np.array([0.3, 0.59, 0.11]); lm = (lm - lm.min()) / max(np.ptp(lm), 1)
    col = 0.45 * g + 0.55 * np.array([46.0, 92.0, 108.0]); edge = np.clip(np.abs(np.diff(lm, axis=0, prepend=lm[:1])) * 4, 0, 1); al = np.clip(0.34 + 0.30 * lm + 0.30 * edge, 0, 0.9) * hole
    Sl = Image.fromarray(np.dstack([np.clip(col, 0, 255), al * 255]).astype(np.uint8), "RGBA"); Sl.alpha_composite(k)
    save("trait-picture-frame-232x312-sealed", Sl, [264, 160, 232, 312], "translucent glass slats in the opening, under the deep frame", "slats-frost+frame-deep1")
# ---- plates
def plates():
    im = load("plate-thin2.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05); bb = bbox_alpha(k, 140); pl = k.crop(bb); s = 320 / pl.width
    pln = dim(pl, 0.6)
    tv = round(8 / s)
    for w in range(80, 225, 16):
        save(f"plate-name-{w}x24", round_alpha(nine(pln, w, 24, 60, tv, 60, tv, ls=s), 4), [632 - w // 2, 456, w, 24], "thin frosted label, 9-slice (insets 14 px across, 8 px down) from 80 to 224 wide in steps of 16, 24 tall, centred on x 712", "plate-thin2")
    plo = dim(pl, 0.55)
    for h in (36, 56, 76):
        save(f"plate-message-640x{h}", round_alpha(nine(plo, 640, h, 60, 60, 60, 60, ls=s), 6), [192, 550 - h, 640, h], "thin frosted label: 9-slice, rounded", "plate-thin2")
    lb = load("label-plate.jpg"); m = (np.asarray(lb).astype(int).min(2) < 240); ys, xs = np.where(m); bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    save("stamp-label-120x120", lb.crop(bb).resize((120, 120), Image.LANCZOS), [872, 248, 120, 120], "cut, 120x120", "label-plate")
def wellrings():
    """The list's rings as masters from the concept: the selected well's thick warm ivory band with its soft glow, the idle well's thin dark-glass
    double ring, the progress arcs (a track and one segment per chapter, 4 to 8 chapters) and the glint star. 80x80, centred on the well's centre."""
    def ring(path, d_out, thr, name, made):
        im = load(path); bg = border_median(im); k = color_to_alpha(im, bg, 0.04); a = np.asarray(k)[..., 3]
        ys, xs = np.where(a > thr); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2; dia = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1
        f = d_out / dia; side = 80 / f; box = (round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))
        out = k.crop(box).resize((80, 80), Image.LANCZOS); save(name, out, [16, 44, 80, 80], made, path.replace(".jpg", ""))
    ring("ring-selected.jpg", 66, 170, "ring-well-selected-80x80", "the selected well's thick warm ivory band (7 px, bone to sand, lit top left) with its soft glow about 4 px outward; colour-to-alpha, scaled so the band's outer diameter is 66, centred in 80x80")
    ring("ring-idle.jpg", 66, 120, "ring-well-idle-80x80", "the idle well's thin dark-glass double ring, outer diameter 66, hairlines about 5 px apart; colour-to-alpha, centred in 80x80")
    S = 8; R_ARC = 24.0
    yy, xx = np.mgrid[0:80 * S, 0:80 * S].astype(float); xx = (xx + 0.5) / S - 40; yy = (yy + 0.5) / S - 40
    rr = np.hypot(xx, yy); th = (np.degrees(np.arctan2(xx, -yy)) + 360) % 360            # clockwise from 12 o'clock
    def cover(mask): return mask.reshape(80, S, 80, S).mean((1, 3))
    def rgba(cov, col, alpha): out = np.zeros((80, 80, 4)); out[..., :3] = col; out[..., 3] = np.clip(cov * alpha, 0, 1) * 255; return out
    def over(top, bot):
        a1 = bot[..., 3:4] / 255; a2 = top[..., 3:4] / 255; ao = a2 + a1 * (1 - a2)
        col = np.where(ao > 0, (top[..., :3] * a2 + bot[..., :3] * a1 * (1 - a2)) / np.maximum(ao, 1e-6), 0); return np.concatenate([col, ao * 255], 2)
    def out(arr, name, made): save(name, Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA"), [16, 44, 80, 80], made, "procedural, supersampled 8x")
    for st, line_col, line_alpha, groove_alpha in (("idle", np.array([190.0, 150.0, 108.0]), 0.55, 0.42),):
        groove = rgba(cover((rr >= R_ARC - 1.6) & (rr <= R_ARC + 1.6)), np.array([6.0, 12.0, 18.0]), groove_alpha)
        lip = rgba(cover((rr > R_ARC + 1.6) & (rr <= R_ARC + 2.3) & (xx + yy > 0)), np.array([110.0, 140.0, 156.0]), 0.28)
        track = over(lip, groove)
        for n in range(4, 9):
            out(track, f"ring-arc-{st}-n{n}-track", f"the unlit groove for {n} chapters: a dark 3 px groove at radius 24 with a faint lit lip on its lower-right side")
            gap = np.degrees(2.0 / R_ARC)
            for i in range(n):
                a0 = i * 360.0 / n + gap / 2; a1 = (i + 1) * 360.0 / n - gap / 2
                seg = rgba(cover((rr >= R_ARC - 1.0) & (rr <= R_ARC + 1.0) & (th >= a0) & (th <= a1)), line_col, line_alpha)
                out(seg, f"ring-arc-{st}-n{n}-s{i}", f"chapter {i + 1} of {n}: a 2 px dim warm line on the inner edge at radius 24, clockwise from 12 o'clock, equal segments with 2 px gaps")
    # ---- selected: the concept's band painted twice (solid; with an engraved channel in its outer half), cut by chapter angle, clockwise from 12 o'clock
    sel = np.asarray(Image.open("slices/ring-well-selected-80x80.png").convert("RGBA")).astype(float)
    yy0, xx0 = np.mgrid[0:80, 0:80].astype(float); rx = xx0 + 0.5 - 40; ry = yy0 + 0.5 - 40; r0 = np.hypot(rx, ry); th0 = (np.degrees(np.arctan2(rx, -ry)) + 360) % 360
    def smooth(x, lo, hi): return np.clip((x - lo) / (hi - lo), 0, 1)
    band = smooth(r0, 25.5, 26.5) * (1 - smooth(r0, 32.5, 33.5))                      # the band, 7 px, soft at both edges
    # the channel is painted, never carved: a soft engraved groove in the band's outer half (a smooth radial profile, the band's own painted shading kept under it, a thin lit lip on the
    # lower-right edge and a soft shadow on the upper-left), the ticks soft 1 px strokes, the segments cut by angle with a 1 px feathered edge
    groove = np.exp(-((r0 - 30.9) / 1.35) ** 2)                                                  # 0..1, widest at the middle of the outer half
    shade_in = np.exp(-((r0 - 29.7) / 0.9) ** 2) * ((rx + ry) < 0)                              # a soft shadow on the upper-left wall
    lip_lr = np.exp(-((r0 - 32.1) / 0.7) ** 2) * ((rx + ry) > 0)                                  # a faint lit lip on the lower-right wall
    wall = np.array([84.0, 56.0, 36.0])                                                          # the groove's floor: a warm dark brown, so it sits in the ivory rather than cutting it
    chan = sel.copy()
    for ch in range(3):
        v = sel[..., ch] * (1 - 0.82 * groove) + wall[ch] * 0.82 * groove
        v = v * (1 - 0.25 * shade_in) + 255 * 0.0
        chan[..., ch] = np.clip(v * (1 + 0.10 * lip_lr), 0, 255)
    chan[..., 3] = sel[..., 3]
    def tick_soft(n):          # a soft 1 px dark stroke across the band at every chapter boundary (gaussian across, about 0.6 px sigma)
        t = np.zeros_like(r0)
        for i in range(n):
            d = np.abs((th0 - i * 360.0 / n + 180) % 360 - 180) * np.pi / 180 * r0
            t = np.maximum(t, np.exp(-(d / 0.62) ** 2))
        return t
    def feather(n, i):         # the chapter's sector with a 1 px feathered edge at both boundaries (smooth across the boundary, measured in px at the radius)
        a0 = i * 360.0 / n; d0 = ((th0 - a0 + 180) % 360 - 180) * np.pi / 180 * r0; d1 = ((a0 + 360.0 / n - th0 + 180) % 360 - 180) * np.pi / 180 * r0
        return np.clip(d0 + 0.5, 0, 1) * np.clip(d1 + 0.5, 0, 1)
    for n in range(4, 9):
        tk = tick_soft(n)
        track = chan.copy(); track[..., 3] = sel[..., 3] * band
        for ch in range(3): track[..., ch] = track[..., ch] * (1 - 0.55 * tk) + np.array([70.0, 46.0, 30.0])[ch] * 0.55 * tk
        out(track, f"ring-arc-selected-n{n}-track", f"the painted gauge for {n} chapters: the concept's band with a soft engraved groove in its outer half (warm dark floor, soft upper-left shadow, faint lit lip lower right) and soft 1 px ticks at each chapter boundary; nothing carved by a hard mask")
        for i in range(n):
            seg = sel.copy(); seg[..., 3] = sel[..., 3] * band * feather(n, i)
            out(seg, f"ring-arc-selected-n{n}-s{i}", f"chapter {i + 1} of {n}: the solid painted band cut by angle (clockwise from 12 o'clock) with a 1 px feathered edge; a read chapter shows this over the track")
    im = load("spark.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.04); bb = bbox_alpha(k, 40); c = k.crop(bb); side = max(c.size); sq = Image.new("RGBA", (side, side), (0, 0, 0, 0)); sq.paste(c, ((side - c.width) // 2, (side - c.height) // 2))
    save("glint-star-12x12", sq.resize((12, 12), Image.LANCZOS), [None, None, 12, 12], "the concept's soft four-point spark: colour-to-alpha, cut square, resampled to 12x12 (place at the ring's upper right, about cx + 30, cy - 30)", "spark")

def bead(size, light, dark, rim=(60.0, 50.0, 40.0)):
    S = 8; yy, xx = np.mgrid[0:size * S, 0:size * S].astype(float); c = size / 2; x = (xx + 0.5) / S - c; y = (yy + 0.5) / S - c; r = np.hypot(x, y); R = c - 0.6
    inside = np.clip(R + 0.5 - r, 0, 1); lit = np.clip(0.5 - (x + y) / (size * 0.95), 0, 1)
    col = np.array(dark)[None, None, :] * (1 - lit[..., None]) + np.array(light)[None, None, :] * lit[..., None]
    rm = np.clip(1 - np.abs(r - (R - 0.3)) / 0.7, 0, 1) * 0.3; col = col * (1 - rm[..., None]) + np.array(rim) * rm[..., None]
    return Image.fromarray(np.clip(np.dstack([col, inside * 255]).reshape(size, S, size, S, 4).mean((1, 3)), 0, 255).astype(np.uint8), "RGBA")
def fit(k, w, h, pad=0, thr=40, gain=1.0):
    k = k.crop(bbox_alpha(k, thr)); f = min((w - 2 * pad) / k.width, (h - 2 * pad) / k.height); k = k.resize((max(1, round(k.width * f)), max(1, round(k.height * f))), Image.LANCZOS)
    if gain != 1.0:
        arr = np.asarray(k).astype(float).copy(); arr[..., 3] = np.clip(arr[..., 3] * gain, 0, 255); k = Image.fromarray(arr.astype(np.uint8), "RGBA")
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); c.alpha_composite(k, ((w - k.width) // 2, (h - k.height) // 2)); return c
def framemarks():
    """The Station frame's marks (design-station-frame): the four room marks at 24, the Companion's glyph solid and outline, the lamps, the sun mark and the
    mibi's face on its teal ring, as a painted layer drawn from larger paintings and reduced (never a pixel face scaled up)."""
    im = load("marks-rooms.jpg"); bg = border_median(im); k = color_to_alpha(im, bg, 0.05); W, H = k.size
    for nm, box in (("research", (W // 2, 0, W, H // 2)), ("library", (0, H // 2, W // 2, H)), ("habitat", (W // 2, H // 2, W, H))):
        save(f"frame-room-{nm}-24", fit(k.crop(box), 24, 24, 2, 40, 1.9), [16, 8, 24, 24], f"the {nm} room's mark: a fine engraved line, painted large and reduced to 24x24; at (16,8) in the title zone", "marks-rooms")
    im = load("marks-device2.jpg"); W, H = im.size
    def third(i):
        t = im.crop((i * W // 3, 0, (i + 1) * W // 3, H)); return color_to_alpha(t, border_median(t), 0.05)
    save("frame-companion-solid-16x24", fit(third(0), 16, 24, 0, 200), [816, 8, 16, 24], "the Companion's glyph, solid (docked); painted large and reduced", "marks-device2")
    save("frame-companion-outline-16x24", fit(third(1), 16, 24, 0, 200, 2.2), [816, 8, 16, 24], "the Companion's glyph, outline (away); painted large and reduced", "marks-device2")
    save("frame-sun-16", fit(third(2), 16, 16, 0, 200), [None, 8, 16, 16], "the world turn's sun mark, 16x16 (placed 4 px before its figure, right-aligned to x 1008)", "marks-device2")
    save("frame-lamp-8-mint", bead(8, (236, 255, 246), (60, 190, 160)), [836, 16, 8, 8], "the Companion's lamp, docked: a mint bead", "procedural, supersampled 8x")
    save("frame-lamp-8-stone", bead(8, (138, 134, 160), (68, 64, 88)), [836, 16, 8, 8], "the Companion's lamp, away: a stone bead", "procedural, supersampled 8x")
    save("frame-lamp-12-amber", bead(12, (255, 226, 160), (232, 130, 40)), [None, None, 12, 12], "the notice's 12x12 amber lamp (the same lamp as Home's modules)", "procedural, supersampled 8x")
    # the mibi's face: from the standard painting of the mibi, a circle of the head painted at 2K and reduced to the 20 px disc inside a 2 px teal ring
    f = load("mibi-face.jpg"); Wf, Hf = f.size; cx, cy, side = int(Wf * 0.53), int(Hf * 0.60), int(Wf * 0.92)
    face = f.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).convert("RGBA").resize((20 * 8, 20 * 8), Image.LANCZOS)
    S = 8
    bz = Image.open("source/raw/belatz-portrait-600x620.png").convert("RGBA"); kz = color_to_alpha(bz, border_median(bz), 0.05)            # Belatz: the head and crest of the standard painting, keyed off its cream ground and laid on the same dark ground as Loika's
    gnd = Image.new("RGBA", kz.size, tuple(int(v) for v in border_median(f)) + (255,)); gnd.alpha_composite(kz)
    face_b = gnd.crop((60, 150, 230, 400)).resize((20 * 8, 20 * 8), Image.LANCZOS) if False else gnd.crop((62, 245, 182, 365)).resize((20 * 8, 20 * 8), Image.LANCZOS)
    def ring_img(ringcol, with_face, dim=1.0, face=face):
        yy, xx = np.mgrid[0:24 * S, 0:24 * S].astype(float); x = (xx + 0.5) / S - 12; y = (yy + 0.5) / S - 12; r = np.hypot(x, y)
        out = np.zeros((24 * S, 24 * S, 4)); ring = np.clip(12 - r, 0, 1) * np.clip(r - 10, 0, 1) if False else (np.clip(12.0 - r, 0, 1) * np.clip(r - 10.0, 0, 1))
        lit = np.clip(0.5 - (x + y) / 24.0, 0, 1); rc = np.array(ringcol)[None, None, :] * dim * (0.8 + 0.4 * lit[..., None])
        out[..., :3] = rc; out[..., 3] = ring * 255
        disc = np.clip(10.0 - r, 0, 1)
        if with_face:
            fa = np.zeros((24 * S, 24 * S, 4)); fa[2 * S:22 * S, 2 * S:22 * S] = np.asarray(face).astype(float)
            a = disc[..., None]; out[..., :3] = out[..., :3] * (out[..., 3:4] / 255) * (1 - a) + fa[..., :3] * a; out[..., 3] = np.maximum(out[..., 3], disc * 255)
        else:
            a = disc[..., None] * 0.35; out[..., :3] = out[..., :3] * (1 - a) + np.array([14.0, 22.0, 30.0]) * a; out[..., 3] = np.maximum(out[..., 3], disc * 90)
        return Image.fromarray(np.clip(out.reshape(24, S, 24, S, 4).mean((1, 3)), 0, 255).astype(np.uint8), "RGBA")
    teal = (31, 157, 143)
    save("face-loika-24", ring_img(teal, True), [856, 8, 24, 24], "the mibi with the Companion: the face painted at 2K from the standard painting, reduced to a 20 px disc inside its 2 px teal ring", "mibi-face")
    save("face-loika-24-away", ring_img(teal, True, 0.5), [856, 8, 24, 24], "the Companion away: the mibi out with it, the face full on a dimmed ring", "mibi-face")
    save("face-belatz-24", ring_img(teal, True, 1.0, face_b), [856, 8, 24, 24], "Belatz with the Companion: the head of the Grow service's standard painting (S09/3982a7117cfa0fc3) reduced to a 20 px disc inside its 2 px teal ring", "belatz-portrait")
    save("face-belatz-24-away", ring_img(teal, True, 0.5, face_b), [856, 8, 24, 24], "Belatz, the Companion away: the face full on a dimmed ring", "belatz-portrait")
    save("face-24-empty", ring_img(teal, False), [856, 8, 24, 24], "no mibi with you: an empty teal ring", "procedural, supersampled 8x")
def framecaps():
    """The bottom line's key caps, 16 px discs like the Companion's caps, art layer (station.json colours only). The role names the cap's FACE, not the glyph:
    confirm = orange face, bone tick; confirm-dim = mist face, slate tick; back = stone face, fog arrow. An ink keyline and a 1 px bevel lit edge upper left.
    Glyph pixels typed by hand: x = glyph, . = face."""
    tick = ["............", "............", "..........xx", ".........xx.", "........xx..", "xx.....xx...", ".xx...xx....", "..xx.xx.....", "...xxx......", "....x.......", "............", "............"]
    back = ["............", "............", "....x.......", "...xx.......", "..xxx.......", ".xxxxxxxxxx.", ".xxxxxxxxxx.", "..xxx.......", "...xx.......", "....x.......", "............", "............"]
    INK, BEV = (0x1a, 0x17, 0x25, 255), (0x5a, 0x66, 0x72, 255)
    def inside(x, y): return 0 <= x < 16 and 0 <= y < 16 and (x + .5 - 8) ** 2 + (y + .5 - 8) ** 2 <= 8.0 ** 2
    def cap(glyph, face, ink):
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        edge = lambda x, y: inside(x, y) and not all(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        for y in range(16):
            for x in range(16):
                if not inside(x, y): continue
                if edge(x, y): c = INK
                elif (x + .5 - 8) + (y + .5 - 8) < 0 and any(edge(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = BEV
                else: c = face + (255,)
                im.putpixel((x, y), c)
        for y, r in enumerate(glyph):
            for x, ch in enumerate(r):
                if ch == "x": im.putpixel((x + 2, y + 2), ink + (255,))
        return im
    save("frame-cap-confirm-16", cap(tick, (0xf2, 0x67, 0x1b), (0xf1, 0xeb, 0xdf)), [16, 574, 16, 16], "the bottom line's confirm key cap: a 16 px disc, orange face, bone tick, ink keyline, 1 px bevel", "typed by hand")
    save("frame-cap-confirm-16-dim", cap(tick, (0x8d, 0x8a, 0xa6), (0x3d, 0x39, 0x54)), [16, 574, 16, 16], "the confirm key cap for the unavailable state: mist face, slate tick (its own slice)", "typed by hand")
    save("frame-cap-back-16", cap(back, (0x5d, 0x59, 0x74), (0xc6, 0xc4, 0xd8)), [None, 574, 16, 16], "the bottom line's back key cap: a 16 px disc, stone face, fog arrow", "typed by hand")
def homemark():
    """frame-room-home-24: the living window, typed pixel by pixel (a pictorial mark is drawn by hand; the tool only sets the colour): a square-topped window
    21 wide with a cross mullion (four panes), a sill, and a sprout 5 px tall rising from the sill into the lower-left pane (two leaves on a stem). No arch and no
    horizon line (a horizon made a third row of panes and read as a grid). x = the line (the colour and strength of the other room marks, read from the
    research mark), . = empty."""
    rows = [
        "........................",
        "........................",
        "........................",
        "..xxxxxxxxxxxxxxxxxxxxx.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..xxxxxxxxxxxxxxxxxxxxx.",
        "..x.........x.........x.",
        "..x.........x.........x.",
        "..x..x...x..x.........x.",
        "..x...x.x...x.........x.",
        "..x....x....x.........x.",
        "..x....x....x.........x.",
        "..x....x....x.........x.",
        "..xxxxxxxxxxxxxxxxxxxxx.",
        ".xxxxxxxxxxxxxxxxxxxxxxx",
        "........................",
        "........................",
        "........................"]
    ref = np.asarray(Image.open("slices/frame-room-research-24.png").convert("RGBA")).astype(float); m = ref[..., 3] > 0.8 * ref[..., 3].max()
    col = tuple(int(v) for v in np.median(ref[m][:, :3], axis=0)); amax = int(ref[..., 3].max())
    assert len(rows) == 24 and all(len(r) == 24 and set(r) <= set("xh.") for r in rows)
    im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".": im.putpixel((x, y), col + (amax if ch == "x" else int(amax * 0.55),))
    save("frame-room-home-24", im, [16, 8, 24, 24], "the home room's mark: the living window, typed by hand: a square-topped window with a cross mullion, and a two-leaf sprout 5 px tall rising from the sill into the lower-left pane; at (16,8) in the title zone", "typed by hand")
def places():
    """place-{meadow,pond,rock,wood,cave}-48x48: the collection overview's place pictures. Each is a painted miniature vignette (Gemini, from the Companion's pixel-map tiles as a colour and
    character reference, source/raw/place-*.jpg), reduced to 48x48 with Lanczos (a painting reduced, never pixel art enlarged), muted a little (saturation x0.85) and graded so its mean grey
    sits at 88 (the pods' mean is about 111-115), the brightest pixel capped at 170. No creatures, text or baked frame."""
    for k in ("meadow", "pond", "rock", "wood", "cave"):
        im = load(f"place-{k}.jpg"); side = min(im.size); im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width - side) // 2 + side, (im.height - side) // 2 + side)).resize((48, 48), Image.LANCZOS)
        a = np.asarray(im).astype(float); lum = a @ np.array([0.299, 0.587, 0.114]); g = lum[..., None]; a = g + (a - g) * 0.85
        lum = a @ np.array([0.299, 0.587, 0.114]); a = a * (88.0 / lum.mean()); a = np.minimum(a, a * 0 + 255) ; mx = (a @ np.array([0.299, 0.587, 0.114])).max()
        if mx > 170: a = a * (170.0 / mx) * 0.5 + a * 0.5      # soften the brightest pixels without flattening the picture
        save(f"place-{k}-48x48", Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB"), [None, None, 48, 48], f"the {k} place picture of the collection overview: a painted miniature vignette reduced to 48x48, muted, mean grey 88", f"place-{k}")
def pagemark():
    """page-mark-new-10: the 'new to the field guide' mark as the layout now specifies it (pods.json page.newMark): a flat bone dot 6x6 with a 1 px white lit edge
    top left, no keyline, no specular, art layer (station.json colours only), placed on the trait's name line 4 px after the name. (The id keeps its 10; the art is 6x6.)
    Pixel data typed by hand: b = bone, w = white."""
    rows = [".wwbb.", "wbbbbb", "wbbbbb", "bbbbbb", "bbbbbb", ".bbbb."]
    pal = {"b": (0xf1, 0xeb, 0xdf, 255), "w": (0xff, 0xff, 0xff, 255), ".": (0, 0, 0, 0)}
    assert all(len(r) == 6 for r in rows) and len(rows) == 6
    im = Image.new("RGBA", (6, 6)); [im.putpixel((x, y), pal[ch]) for y, r in enumerate(rows) for x, ch in enumerate(r)]
    save("page-mark-new-10", im, [None, None, 6, 6], "the 'new to the field guide' mark: a flat bone dot 6x6, a 1 px white lit edge top left, no keyline, no specular; on the trait's name line, 4 px after the name", "typed by hand")
def newmark():
    """The 12x12 mark of a trait new to the field guide, at the picture's top centre: a small bone bead, lit upper left, sand lower right (a proposal; the glint star stays the spark)."""
    S = 8; yy, xx = np.mgrid[0:12 * S, 0:12 * S].astype(float); x = (xx + 0.5) / S - 6; y = (yy + 0.5) / S - 6; r = np.hypot(x, y)
    inside = np.clip(5.4 - r, 0, 1) ; lit = np.clip(0.5 - (x + y) / 11.0, 0, 1)
    col = np.array([196.0, 160.0, 112.0])[None, None, :] * (1 - lit[..., None]) + np.array([255.0, 250.0, 236.0])[None, None, :] * lit[..., None]
    rim = np.clip(1 - np.abs(r - 5.0) / 0.7, 0, 1) * 0.35                                  # a faint darker rim so the bead holds on a light page
    col = col * (1 - rim[..., None]) + np.array([80.0, 62.0, 40.0]) * rim[..., None]
    img = np.dstack([col, inside * 255]).reshape(12, S, 12, S, 4).mean((1, 3))
    save("page-new-mark-12x12", Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA"), [None, None, 12, 12], "PROPOSED: the 'new to the field guide' mark, a 12x12 bone bead lit upper left (the page's newMark region of design-pods-relayout 29b6dc9)", "procedural, supersampled 8x")
def stampcase():
    """The stamp's case (848,144,176,328): translucent unlit glass over the wall (the wall's seams show through, one step above it),
    a faint diagonal sheen, dim brushed-metal rails top and bottom, a faint left edge, open at the screen's right edge."""
    im = load("case2.jpg"); W, H = im.size; y0, y1 = int(H * 0.075), int(H * 0.925); x0 = int(W * 0.108); h = y1 - y0; w = round(h * 176 / 328)
    src = np.asarray(im.crop((x0, y0, x0 + w, y1)).resize((176, 328), Image.LANCZOS)).astype(float)
    yy, xx = np.mgrid[0:328, 0:176].astype(float)
    lumv = src @ np.array([0.3, 0.59, 0.11]); var = (lumv - np.median(lumv)) / 40.0                   # the painted glass's own faint variation
    sheen = np.exp(-(((xx * 0.9 + yy * 0.45) - 215) / 34.0) ** 2) * 0.10 + np.exp(-(((xx * 0.9 + yy * 0.45) - 330) / 14.0) ** 2) * 0.05
    alpha = np.clip(0.27 + sheen + 0.02 * var, 0.18, 0.45)
    col = np.array([88.0, 124.0, 138.0]) + sheen[..., None] * 140
    out = np.dstack([np.broadcast_to(col, (328, 176, 3)).copy(), alpha * 255])
    # rails: dim brushed metal, opaque enough to read as metal, never brighter than the wall's glass
    rng = np.random.RandomState(3)
    for r0, r1 in ((0, 7), (321, 328)):
        n = rng.uniform(-6, 6, (r1 - r0, 176)); n = smooth1d(n, 6, 1); base = np.array([58.0, 70.0, 78.0])
        for y in range(r1 - r0):
            k = (y / max(1, r1 - r0 - 1)) if r0 == 0 else 1 - y / max(1, r1 - r0 - 1)
            out[r0 + y, :, :3] = base * (0.75 + 0.45 * (1 - k)) + n[y][:, None]; out[r0 + y, :, 3] = 235
    out[1, :, :3] += 16                                                  # the lit top edge of the upper rail, kept dim
    # the left edge: a faint hairline
    out[7:321, 0, :3] = (96, 126, 138); out[7:321, 0, 3] = 120; out[7:321, 1, 3] = np.maximum(out[7:321, 1, 3], 50)
    save("room-stamp-case", Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"), [848, 144, 176, 328], "the dim unlit glass case: translucent (the wall's seams show through), a faint diagonal sheen, dim brushed-metal rails, open at the right", "case2")

def stampcase152():
    """The stamp's case at its new size (856,232,152,152), closed on all four sides: translucent unlit glass over the wall, a faint diagonal sheen,
    dim brushed-metal rails top and bottom, a faint hairline on the left and the right."""
    W_, H_ = 152, 152; im = load("case2.jpg"); W, H = im.size; y0, y1 = int(H * 0.075), int(H * 0.925); x0 = int(W * 0.108)
    src = np.asarray(im.crop((x0, y0, x0 + (y1 - y0), y1)).resize((W_, H_), Image.LANCZOS)).astype(float)
    yy, xx = np.mgrid[0:H_, 0:W_].astype(float)
    lumv = src @ np.array([0.3, 0.59, 0.11]); var = (lumv - np.median(lumv)) / 40.0
    sheen = np.exp(-(((xx * 0.9 + yy * 0.9) - 120) / 30.0) ** 2) * 0.10 + np.exp(-(((xx * 0.9 + yy * 0.9) - 205) / 12.0) ** 2) * 0.05
    alpha = np.clip(0.27 + sheen + 0.02 * var, 0.18, 0.45); col = np.array([88.0, 124.0, 138.0]) + sheen[..., None] * 140
    out = np.dstack([np.broadcast_to(col, (H_, W_, 3)).copy(), alpha * 255]); rng = np.random.RandomState(3)
    for r0, r1 in ((0, 6), (H_ - 6, H_)):
        n = smooth1d(rng.uniform(-6, 6, (r1 - r0, W_)), 6, 1); base = np.array([58.0, 70.0, 78.0])
        for y in range(r1 - r0):
            k = (y / max(1, r1 - r0 - 1)) if r0 == 0 else 1 - y / max(1, r1 - r0 - 1); out[r0 + y, :, :3] = base * (0.75 + 0.45 * (1 - k)) + n[y][:, None]; out[r0 + y, :, 3] = 235
    out[1, :, :3] += 16
    out[6:H_ - 6, 0, :3] = (96, 126, 138); out[6:H_ - 6, 0, 3] = 120; out[6:H_ - 6, 1, 3] = np.maximum(out[6:H_ - 6, 1, 3], 50)
    out[6:H_ - 6, W_ - 1, :3] = (60, 84, 96); out[6:H_ - 6, W_ - 1, 3] = 110
    save("room-stamp-case-152x152", Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"), [856, 232, 152, 152], "the dim unlit glass case at its new size: translucent, a faint diagonal sheen, dim brushed-metal rails, closed on all four sides", "case2")
def stampfront():
    """The case's front glass (856,232,152,152), drawn over the label: a dark glass tint (alpha 0.41) over the label's 120 px, feathered 3 px, and a faint
    diagonal sheen across the whole pane, so the label no longer outshines the pod while the stamp's cells keep their contrast."""
    H_ = W_ = 152; yy, xx = np.mgrid[0:H_, 0:W_].astype(float)
    inx = np.clip((np.minimum(xx - 16, 16 + 120 - 1 - xx) + 3) / 3.0, 0, 1); iny = np.clip((np.minimum(yy - 16, 16 + 120 - 1 - yy) + 3) / 3.0, 0, 1); box = np.minimum(inx, iny)
    sheen = np.exp(-(((xx * 0.9 + yy * 0.9) - 110) / 14.0) ** 2) * 0.16 + np.exp(-(((xx * 0.9 + yy * 0.9) - 170) / 6.0) ** 2) * 0.10
    alpha = np.clip(0.41 * box + sheen * (1 - 0.88 * box), 0, 1)
    col = np.dstack([np.full((H_, W_), 6.0), np.full((H_, W_), 12.0), np.full((H_, W_), 16.0)]) * (1 - np.clip(sheen * 3 * (1 - 0.88 * box), 0, 1)[..., None]) + np.array([150.0, 190.0, 205.0]) * np.clip(sheen * 3 * (1 - 0.88 * box), 0, 1)[..., None]
    save("room-stamp-case-152x152-front", Image.fromarray(np.clip(np.dstack([col, alpha * 255]), 0, 255).astype(np.uint8), "RGBA"), [856, 232, 152, 152], "the case's front glass over the label: a dark tint (0.41) and a faint diagonal sheen; the label's mean brightness falls to about 114 with the stamp's cells at 4.8:1 (WCAG relative luminance)", "procedural, supersampled")
def bars():
    im = load("bar-top.jpg"); k = key_magenta(im); bb = bbox_alpha(k, 250); b = im.crop(bb).convert("RGBA")
    b = dim(b, 0.62)
    save("frame-top-bar-1024x40", b.resize((1024, 40), Image.LANCZOS), [0, 0, 1024, 40], "key magenta, cut, 1024x40", "bar-top")
    save("frame-bottom-line-1024x38", b.transpose(Image.FLIP_TOP_BOTTOM).resize((1024, 38), Image.LANCZOS), [0, 562, 1024, 38], "the bar flipped (rule on its top edge), 1024x38", "bar-top")

# ---- pods
POD_BOX = {"large": (144, 176), "medium": (120, 152), "small": (104, 128), "well": (40, 48)}
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
    # a crack in the cap is not a hole in the accent: close the cap. `structure_old` is the closing the signed layers
    # (shade, dots, patterns, crack) were built on; `structure` (mask-accent) closes the remaining pinholes too
    cap = label_dilate(structure[:380] > 0.5, 6); capc = ~label_dilate(~cap.astype(bool), 6).astype(bool)
    structure[:380] = np.maximum(structure[:380], capc * sil[:380]); structure_old = structure.copy()
    cap = label_dilate(structure[:380] > 0.5, 14); capc = ~label_dilate(~cap.astype(bool), 14).astype(bool)
    structure[:380] = np.maximum(structure[:380], capc * sil[:380])
    sm = smooth1d(smooth1d(structure[:380], 5, 0), 5, 1); structure[:380] = np.maximum(structure[:380], (sm > 0.55) * sil[:380])
    dots = np.clip(np.maximum(mB, low * mB2) - structure_old, 0, 1)
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
    masks["pattern-stripes"] = wh(stripes_mask(w_, h_) * (sil - structure_old).clip(0, 1) * (1 - structure_old)); masks["pattern-bands"] = wh(bands_mask(w_, h_) * (sil - structure_old).clip(0, 1) * (1 - structure_old))
    # the sealing band, as before
    db = np.clip((lum(I) - lum(B) - 30) / 50, 0, 1); db[:BB[1] + 150] = 0; db[BB[1] + 520:] = 0
    Bd = B.copy(); Bd[..., 3] = db * 255
    flat = {"identified": crop(L), "sealed": crop(B), "band": crop(Bd)}
    for cls, (w, h) in POD_BOX.items():
        f = min(w / bw, h / bh); pw, ph = max(1, round(bw * f)), max(1, round(bh * f)); ox, oy = (w - pw) // 2, ((h - ph) // 2 if cls == "well" else h - ph)
        def put(arr, extra=None):
            im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").resize((pw, ph), Image.LANCZOS)
            c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); c.alpha_composite(im, (ox, oy)); return c
        r = {"large": [560, 216, 144, 176], "medium": [572, 240, 120, 152], "small": [580, 264, 104, 128], "well": [36, 60, 40, 48]}.get(cls, [None, None, w, h])
        for nm, arr in masks.items(): save(f"pod-{cls}-{nm}", put(arr), r, "systematic pod layer: " + nm + ", uniform scale, foot on the last row, centred", "pod-identified")
        if cls == "well":
            # legible at 32x40: darken and thicken the band before the downscale, and rebuild the sealed sprite from it
            bd = flat["band"].copy(); al = label_dilate(bd[..., 3] > 40, 14) * 255; bd[..., :3] = np.minimum(bd[..., :3], 40); bd[..., 3] = np.maximum(bd[..., 3] * 1.6, al * 0.9); flat = dict(flat, band=bd)
            sealed = flat["sealed"].copy(); m = bd[..., 3:4] / 255.0; sealed[..., :3] = sealed[..., :3] * (1 - m) + bd[..., :3] * m; flat["sealed"] = sealed
        for nm, arr in flat.items(): save(f"pod-{cls}-{nm}", put(arr), r, "the Loika reference sprite" if nm != "band" else "the sealing band as a layer", "pod-loika" if nm == "identified" else "pod-band")
        sw, sh_ = w + 16, 14; yy, xx = np.mgrid[0:sh_, 0:sw].astype(float)
        a = np.clip(1 - (((xx - sw / 2) / (sw / 2)) ** 2 + ((yy - sh_ / 2) / (sh_ / 2)) ** 2), 0, 1) ** 1.2 * 0.6
        sdw = np.dstack([np.full((sh_, sw), 6.0), np.full((sh_, sw), 12.0), np.full((sh_, sw), 18.0), a * 255]).astype(np.uint8)
        save(f"pod-{cls}-shadow", Image.fromarray(sdw, "RGBA"), [632 - sw // 2, 385, sw, sh_], "contact shadow: centred on x 632 with its middle on the foot line y 392", "procedural ramp")

def well_pinholes():
    """Fill the enclosed pixels of the well pod's accent mask (between the cap and the rib); hold the body mask with it."""
    A = np.asarray(Image.open("slices/pod-well-mask-accent.png").convert("RGBA")).copy(); Bd = np.asarray(Image.open("slices/pod-well-mask-body.png").convert("RGBA")).copy()
    al = A[..., 3].astype(int); sil = np.asarray(Image.open("slices/pod-well-shade.png").convert("RGBA"))[..., 3] > 128
    enc = np.zeros_like(al, bool)           # pinholes: a silhouette pixel the accent misses, between the cap and the rib, with the accent solid on both sides (left and right, or above and below)
    for py in range(6, 17):
        for px in range(2, al.shape[1] - 2):
            if sil[py, px] and 20 < al[py, px] < 150 and ((al[py, px - 1] > 200 and al[py, px + 1] > 200) or (al[py - 1, px] > 200 and al[py + 1, px] > 200)): enc[py, px] = True
    print("well pinholes filled at", [tuple(map(int, p[::-1])) for p in np.argwhere(enc)])
    A[enc, 3] = 255; Bd[enc, 3] = 0
    save("pod-well-mask-accent", Image.fromarray(A, "RGBA"), [None, None, 40, 48], "systematic pod layer: mask-accent, enclosed pixels filled", "pod-identified")
    save("pod-well-mask-body", Image.fromarray(Bd, "RGBA"), [None, None, 40, 48], "systematic pod layer: mask-body, held with the accent mask", "pod-identified")
if __name__ == "__main__":
    which = sys.argv[1:] or ["bench", "cradle", "listcol", "tabs", "pages", "panenine", "frames", "portrait", "tabfills", "newmark", "pagemark", "framemarks", "homemark", "framecaps", "plates", "bars", "stampcase", "stampcase152", "stampfront", "wellrings", "pods", "well_pinholes"]
    for w in which: globals()[w]()
    old = json.load(open("slices/manifest.json")) if os.path.exists("slices/manifest.json") else {}
    old.update(MAN); json.dump(old, open("slices/manifest.json", "w"), indent=1)
    print(len(MAN), "slices")
