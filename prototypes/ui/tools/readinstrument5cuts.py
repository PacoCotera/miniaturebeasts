"""The reading screen v2's cuts for the face (ux-reading-v2.md section 3, "To cut for the face"): every static piece that is soft, glowing or blended, baked here at 1x from the
painted layers of the reading instrument (the masters folder's source/work/reading-instrument: layers/, layers-p2/, layers-p4/) and the pass-five mockup's own recipes, so the face
only places pictures 1:1. 0 paid images: everything is derived from the existing paint.
usage: python3 -I prototypes/ui/tools/readinstrument5cuts.py <reading-instrument work folder> [out folder]
  -> <out>/*.png (default prototypes/ui/assets/masters/pods/reading) and their entries in prototypes/ui/assets/masters/index.json (file, size, sha256, signed)
The pieces (ids as the face takes them):
  reading-ground-1024x522          the chassis, both moulded frames, both glasses with their scanlines, edge shade and top reflections, the shelf with its rule and dots, both lamps unlit, the wave. No label
  reading-chamber-{overview,close}-548x356   the chamber at 30,70, glass included: the low back light, the amber floor pool, the floor grid, the ruler (overview only) and the three corner marks
  reading-lamp-lit-36x26           the read lamp lit, opaque, for 536,530
  reading-plate-lit-40x40          the trait plate, a nine-slice with 12 px corners; reading-plate-glow-<chapter>-200x120 the chapter glow behind a plate (8)
  reading-key-{lit,dim,pressed}-104x49   the price key with its shadow; reading-chip-86x32 the reward chip's plate and glint
  reading-sweep-28x356, reading-shine-40x63, reading-veil-548x462   the read's warm bar, the lane's shine, the stamp moment's void veil
  reading-{glint,star,diamond}-{11,13,16}, reading-sprout-20x18, reading-lock-14x16, reading-moon-8x8, reading-tick-<chapter>-20x20, reading-wave-14x10, reading-podline-{26x32,23x29}
  reading-{scan,rim}-<species>, reading-{mask,line}-<species>-<part>   the specimen's derived layers for the logic process (white with alpha): the scan cut to the plain stand's alpha > 0
                                   (no light outside the body), the legs cut hard at stand row 220 of 312 with the line traced on the cut mask (closed)."""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); UI = os.path.dirname(HERE)
WORK = sys.argv[1] if len(sys.argv) > 1 else None
if not WORK: sys.exit("usage: readinstrument5cuts.py <reading-instrument work folder> [out folder]")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(UI, "assets/masters/pods/reading"); os.makedirs(OUT, exist_ok=True)
L1, L2, L4 = (os.path.join(WORK, d) for d in ("layers", "layers-p2", "layers-p4"))
SIGNED = "UX and art, ux-reading-v2.md joint sign-off (2026-10-29): cut by prototypes/ui/tools/readinstrument5cuts.py from the reading-instrument layers"
CH = {"coat": "#f08a6a", "face": "#7ec8f0", "movement": "#9ad27a", "stamina": "#c9a4f2", "shape": "#f2a0c0", "legs": "#6fe0d0", "character": "#b8a0b0", "glow": "#f2e68a"}
AMBER, CREAM = (240, 180, 90), (239, 233, 220)
def hexrgb(h): n = int(h[1:], 16); return (n >> 16, (n >> 8) & 255, n & 255)
def F(img): return np.asarray(img.convert("RGBA")).astype(float) / 255
def save(name, a, slice_=None):
    a = np.clip(a, 0, 1); im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), "RGBA" if a.shape[2] == 4 else "RGB")
    if im.mode == "RGBA" and a[..., 3].min() >= 1: im = im.convert("RGB")
    path = os.path.join(OUT, name + ".png"); im.save(path, optimize=True); MADE.append((name, path, im.size, slice_))
MADE = []
def over(dst, rgb, alpha):            # src-over of a colour (or picture) at alpha onto an opaque RGB float picture
    a = alpha[..., None] if np.ndim(alpha) == 2 else alpha
    return dst * (1 - a) + np.asarray(rgb, float).reshape((1, 1, 3) if np.ndim(rgb) == 1 else rgb.shape) / (255 if np.max(rgb) > 1 else 1) * a
def screen(dst, rgb, alpha):
    c = np.asarray(rgb, float) / 255; a = alpha[..., None] if np.ndim(alpha) == 2 else alpha
    return dst * (1 - a) + (1 - (1 - dst) * (1 - c)) * a
def multiply(dst, k, alpha):
    a = alpha[..., None] if np.ndim(alpha) == 2 else alpha
    return dst * (1 - a) + dst * k * a
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def rrect_mask(w, h, r, ss=4, inset=0):
    m = Image.new("L", (w * ss, h * ss), 0); ImageDraw.Draw(m).rounded_rectangle((inset * ss, inset * ss, (w - inset) * ss - 1, (h - inset) * ss - 1), r * ss, fill=255)
    return np.asarray(m.resize((w, h), Image.LANCZOS)).astype(float) / 255
def ss_draw(w, h, draw, ss=8):         # a glyph drawn at ss x and reduced: (alpha) in 0..1
    m = Image.new("L", (w * ss, h * ss), 0); draw(ImageDraw.Draw(m), ss); return np.asarray(m.resize((w, h), Image.LANCZOS)).astype(float) / 255
def rgba_of(rgb, alpha): out = np.zeros(alpha.shape + (4,)); out[..., :3] = np.asarray(rgb, float) / 255; out[..., 3] = alpha; return out

# ---------------- the ground: pass four's two frames, the glass finish, the shelf, the lamps unlit ----------------
G = F(Image.open(os.path.join(L4, "ground-2f-1x.png")))[..., :3].copy()       # 1024 x 600
GLASS = {"left": (30, 70, 578, 532), "right": (634, 70, 994, 532)}
yy, xx = np.mgrid[0:600, 0:1024].astype(float)
def glass_finish(img, which):
    x0, y0, x1, y1 = GLASS[which]; W, H = x1 - x0, y1 - y0; m = np.zeros((600, 1024)); m[y0:y1, x0:x1] = rrect_mask(W, H, 10)
    rows = ((yy - y0) % 3 >= 2) * m; img = multiply(img, 0.96, rows)                                                   # the scanlines: a 4 % line every third row
    if which == "left":                                                                                                  # the glare, two thirds of pass three's, over the left glass only
        t = ((xx - x0) * np.cos(np.radians(26)) + (yy - y0) * np.sin(np.radians(26))) / (W * np.cos(np.radians(26)) + H * np.sin(np.radians(26)))
        g = np.where(t < 0.333, 0.033 + (0.012 - 0.033) * t / 0.333, 0) * m; img = screen(img, (255, 255, 255), g)
    top = np.zeros((600, 1024)); f = (xx[y0, x0 + 8:x1 - 8] - (x0 + 8)) / (W - 16); peak = 0.2 if which == "left" else 0.14
    top[y0, x0 + 8:x1 - 8] = np.interp(f, [0, 0.2, 0.7, 1], [0, peak, 0.06, 0]); img = over(img, (255, 255, 255), top)   # the thin top edge reflection
    # the glass edge shade: inset 0 2px 7px rgba(0,0,0,.6) and inset 0 0 1px rgba(0,0,0,.85)
    inner = np.zeros((600, 1024)); inner[y0:y1, x0:x1] = rrect_mask(W, H, 10)
    shifted = np.zeros_like(inner); shifted[2:, :] = inner[:-2, :]
    sh = (1 - blur(shifted, 3.5)) * 0.6 * m; edge = (1 - blur(inner, 0.6)) * 0.85 * m
    img = over(img, (0, 0, 0), np.clip(sh, 0, 1)); img = over(img, (0, 0, 0), np.clip(edge, 0, 1))
    return img
def shelf(img):
    x0, _, x1, y1 = GLASS["left"]; t = 426; m = np.zeros((600, 1024)); m[t:y1, x0:x1] = rrect_mask(x1 - x0, 532 - 70, 10)[t - 70:, :]
    a = np.interp(yy, [t, y1], [0.42, 0.3]) * m; img = over(img, (2, 10, 12), a)                                          # the shelf: a slightly darker band of the same glass
    lip = np.zeros((600, 1024)); f = (xx[t, x0:x1] - x0) / (x1 - x0); lip[t, x0:x1] = np.interp(f, [0, 0.12, 0.88, 1], [0, 0.12, 0.12, 0]); img = over(img, CREAM, lip)
    rule = np.zeros((600, 1024)); rule[522, 36:571] = 0.15; img = over(img, CREAM, rule)                                 # the shelf rule at y 522, 36 to 570
    for px in range(40, 567, 8):                                                                                           # 2 px dots every 8 px at y 526
        d = ss_draw(2, 2, lambda dr, s: dr.ellipse((0, 0, 2 * s - 1, 2 * s - 1), fill=255)); img[526:528, px - 1:px + 1] = over(img[526:528, px - 1:px + 1], CREAM, d * 0.2)
    return img
LAMPS = {"read": (554, 542.6), "spare": (972, 542.6)}
clear2 = F(Image.open(os.path.join(L2, "lamp-clear@2x.png"))); lens2 = F(Image.open(os.path.join(L2, "lamp-lens@2x.png")))
def lamp(img, cx, cy, on, s=15):
    x, y = cx - s / 2, cy - s / 2; S = 4
    big = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((1024 * S, 600 * S), Image.NEAREST)   # draw the lamp at 4x over the ground, then reduce the lamp's box
    bx0, by0, bx1, by1 = int(x - 30), int(y - 20), int(x + s + 30), int(y + s + 20)
    box = np.asarray(big.crop((bx0 * S, by0 * S, bx1 * S, by1 * S))).astype(float) / 255; Hh, Ww = box.shape[:2]
    Y, X = np.mgrid[0:Hh, 0:Ww].astype(float); X = X / S + bx0 + 0.5 / S; Y = Y / S + by0 + 0.5 / S
    r = (s + 3) / 2; d = np.hypot(X - cx, Y - cy); bez = np.clip(r - d + 0.5, 0, 1)                                       # the bezel: a dark radial well with a 1 px light below
    hl = np.clip(r - np.hypot(X - cx, Y - cy - 1) + 0.5, 0, 1) * (1 - bez); box = over(box, (255, 240, 220), hl * 0.12)
    t = np.clip(np.hypot(X - cx, Y - (cy - 0.1 * (s + 3))) / r, 0, 1)[..., None]; well = np.array([18, 17, 16]) / 255 * (1 - t) + np.array([42, 39, 36]) / 255 * t
    box = box * (1 - bez[..., None]) + well * bez[..., None]
    ln = np.asarray(Image.fromarray((clear2 * 255).astype(np.uint8)).resize((s * S, s * S), Image.LANCZOS)).astype(float) / 255
    lm = np.asarray(Image.fromarray((lens2 * 255).astype(np.uint8)).resize((s * S, s * S), Image.LANCZOS)).astype(float) / 255
    ox, oy = int(round((x - bx0) * S)), int(round((y - by0) * S)); reg = box[oy:oy + s * S, ox:ox + s * S]
    circ = np.clip(s / 2 * S - np.hypot(*np.mgrid[0:s * S, 0:s * S][::-1] - (s * S - 1) / 2) + 0.5, 0, 1)
    lens_rgb = ln[..., :3] * (1 if on else 0.5); reg[:] = reg * (1 - circ[..., None]) + lens_rgb * circ[..., None]
    if on:
        g = np.clip(1 - np.hypot((X - cx) / (1.2 * s), (Y - cy) / (0.85 * s)) / 0.7, 0, 1) * 0.42; box = screen(box, AMBER, g)
        reg = box[oy:oy + s * S, ox:ox + s * S]; la = lm[..., 3] * circ
        reg[:] = reg * (1 - la[..., None]) + reg * (np.array(AMBER) / 255) * la[..., None]
        Yl, Xl = np.mgrid[0:s * S, 0:s * S].astype(float) / (s * S); dd = np.hypot(Xl - 0.44, Yl - 0.40) / 0.7071
        c = np.where(dd[..., None] < 0.12, np.array([1, 1, 1, 0.95]), np.where(dd[..., None] < 0.34, np.r_[np.array(AMBER) / 255, 0.9], np.r_[np.array(AMBER) / 255, 0.35]))
        a = c[..., 3] * la; reg[:] = reg * (1 - a[..., None]) + (1 - (1 - reg) * (1 - c[..., :3])) * a[..., None]
    small = np.asarray(Image.fromarray((np.clip(box, 0, 1) * 255).astype(np.uint8)).resize((bx1 - bx0, by1 - by0), Image.LANCZOS)).astype(float) / 255
    img = img.copy(); img[by0:by1, bx0:bx1] = small; return img
def wave(img):                                                                                                                  # the printed wave beside the read lamp: 14 x 10 at 527,538
    S = 8; m1 = Image.new("L", (14 * S, 10 * S), 0); m2 = Image.new("L", (14 * S, 10 * S), 0)
    def path(dy): return [(S * (1 + k * 0.25), S * (5 + dy - 4.5 * np.sin(np.pi * (k * 0.25) / 3.5 * 1.0) * (1 if (k * 0.25) % 7 < 3.5 else -1))) for k in range(49)]
    pts = [(S * (1 + t), S * (5 - 2.2 * np.sin(np.pi * t / 3.5))) for t in np.linspace(0, 12, 97)]
    ImageDraw.Draw(m1).line(pts, fill=255, width=int(1.9 * S)); ImageDraw.Draw(m2).line([(p[0], p[1] + 0.8 * S) for p in pts], fill=255, width=S)
    a1 = np.asarray(m1.resize((14, 10), Image.LANCZOS)).astype(float) / 255; a2 = np.asarray(m2.resize((14, 10), Image.LANCZOS)).astype(float) / 255
    img[538:548, 527:541] = over(img[538:548, 527:541], (20, 17, 15), a1 * 0.95); img[538:548, 527:541] = over(img[538:548, 527:541], CREAM, a2 * 0.22); return img
G = glass_finish(G, "left"); G = glass_finish(G, "right")
G_noshelf = G.copy()
G = shelf(G); G = wave(G); G_unlit = lamp(lamp(G, *LAMPS["read"], False), *LAMPS["spare"], False)
save("reading-ground-1024x522", G_unlit[40:562])
lit = lamp(G_unlit, *LAMPS["read"], True); save("reading-lamp-lit-36x26", lit[530:556, 536:572])

# ---------------- the chamber: two lights, opaque, 548 x 356 at 30,70 (the glass finish included) ----------------
CX0, CY0, CW, CHH = 30, 70, 548, 356
def chamber(floorY, floorW, warm, ruler):
    c = G_noshelf[CY0:CY0 + CHH, CX0:CX0 + CW].copy(); Y, X = np.mgrid[0:CHH, 0:CW].astype(float) + 0.5; cx = 304 - CX0; fy = floorY - CY0
    e = np.hypot((X - CW * 0.5) / (CW * 0.62), (Y - CHH * 0.92) / (CHH * 0.46)); c = screen(c, (120, 200, 190), np.clip(1 - e, 0, 1) * 0.10 * warm)   # the low back light
    e = np.hypot((X - cx) / (floorW * 0.9), (Y - fy) / 50); c = screen(c, (240, 170, 90), np.interp(e, [0, 0.45, 0.72, 10], [0.18, 0.05, 0, 0]) * warm)   # the amber floor pool
    # the floor grid: a 22 px grid on the floor plane, rotateX(68deg) under a 240 px perspective, masked by an ellipse (opaque to 25 %, clear by 70 %)
    th, d = np.radians(68), 240.0; bw, bh = floorW * 2, 88; bx, by = cx - floorW, fy - 44; S = 4
    Yg, Xg = np.mgrid[0:int(bh) * S, 0:int(bw) * S].astype(float) / S; u = Xg - bw / 2; v = Yg - bh / 2
    ye = v * d / (d * np.cos(th) + v * np.sin(th)); ze = ye * np.sin(th); xe = u * (d - ze) / d
    ex, ey = xe + bw / 2 + 40, ye + bh / 2; lines = (((ex % 22) < 1) | ((ey % 22) < 1)) & (np.abs(ye) < bh / 2) & (ex >= 0) & (ex <= bw + 80)
    g = lines.reshape(int(bh), S, int(bw), S).mean((1, 3)) * 0.5 * 0.2
    em = np.hypot((np.arange(int(bw))[None, :] + 0.5 - bw / 2) / (bw / 2), (np.arange(int(bh))[:, None] + 0.5 - bh / 2) / (bh / 2)); g = g * np.interp(em, [0, 0.25, 0.70, 10], [1, 1, 0, 0])
    gx0, gy0 = int(round(bx)), int(round(by)); sub = c[gy0:gy0 + int(bh), gx0:gx0 + int(bw)]; sub[:] = over(sub, (240, 180, 90), g[:sub.shape[0], :sub.shape[1]] * warm if warm < 1 else g[:sub.shape[0], :sub.shape[1]])
    if ruler:                                                                                                              # the ruler: y 400, 94 to 514, a tick every 10, longer every 50, the amber centre at 304
        half, ry = 210, 400 - CY0; fade = lambda x: np.interp(x, [0, 0.18 * 2 * half, 0.82 * 2 * half, 2 * half], [0, 1, 1, 0])
        for i in range(0, 2 * half + 1, 1):
            if i < 2 * half: c[ry, cx - half + i] = over(c[ry:ry + 1, cx - half + i:cx - half + i + 1], CREAM, np.array([[0.22 * fade(i + 0.5)]]))[0, 0]
        for i in range(0, 2 * half + 1, 10):
            major, cen = (i - half) % 50 == 0, i == half; h = 8 if cen else 5 if major else 3; a = (0.7 if cen else 0.32 if major else 0.2) * fade(i)
            col = AMBER if cen else CREAM; x = cx - half + i
            if 0 <= x < CW: c[ry:ry + h, x] = over(c[ry:ry + h, x:x + 1], col, np.full((h, 1), a))[:, 0]
    for (x, y, sx, sy) in [(578 - 14, 70 + 14, -1, 1), (30 + 14, 426 - 14 - 6, 1, -1), (578 - 14, 426 - 14 - 6, -1, -1)]:   # the three corner marks: a short L and a fine cross
        x -= CX0; y -= CY0; pts = [(x + sx * k, y) for k in range(11)] + [(x, y + sy * k) for k in range(1, 11)] + [(x + sx * 18 - 3 + k, y + sy * 18) for k in range(7)] + [(x + sx * 18, y + sy * 18 - 3 + k) for k in range(7)]
        for (px, py) in pts:
            if 0 <= px < CW and 0 <= py < CHH: c[py, px] = over(c[py:py + 1, px:px + 1], CREAM, np.array([[0.26]]))[0, 0]
    return c
save("reading-chamber-overview-548x356", chamber(394, 170, 1.0, True))
save("reading-chamber-close-548x356", chamber(410, 200, 0.8, False))

# ---------------- the right frame's pieces ----------------
def plate_lit():                                                                                                            # the soft lit plate (12 px corners): a 7.5 % to 3 % teal-white wash, a 1 px rim, a top light
    w = h = 40; m = rrect_mask(w, h, 12); a = np.zeros((h, w, 4)); a[..., :3] = np.array([170, 225, 215]) / 255; a[..., 3] = 0.052 * m
    rim = np.clip(m - rrect_mask(w, h, 11, inset=1), 0, 1); a = comp(a, rgba_of(CREAM, rim * 0.08)); top = np.zeros((h, w)); top[1, 6:34] = 0.07 * m[1, 6:34]; a = comp(a, rgba_of((255, 255, 255), top)); return a
def comp(dst, src):                                                                                                         # src over dst, both straight RGBA float
    sa = src[..., 3:4]; da = dst[..., 3:4]; oa = sa + da * (1 - sa); rgb = np.where(oa > 0, (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-9), 0)
    return np.concatenate([rgb, oa], 2)
save("reading-plate-lit-40x40", plate_lit(), slice_=[12, 12, 12, 12])
for ch, col in CH.items():                                                                                                  # the chapter glow: radial-gradient(ellipse 70% 120% at 30% 40%, col .10, col .03 at 70%), fading to clear at the sprite's edges
    w, h = 200, 120; Y, X = np.mgrid[0:h, 0:w].astype(float) + 0.5; e = np.hypot((X - 0.3 * w) / (0.7 * w), (Y - 0.4 * h) / (1.2 * h)) * np.sqrt(2)
    a = np.interp(e, [0, 0.7 * np.sqrt(2), 10], [0.10, 0.03, 0.03]); win = np.clip(np.minimum(X, w - X) / 40, 0, 1) * np.clip(np.minimum(Y, h - Y) / 14, 0, 1); save(f"reading-plate-glow-{ch}-200x120", rgba_of(hexrgb(col), a * win * rrect_mask(w, h, 12)))
def key(state):                                                                                                             # the price key: a moulded amber key with its shadow, lit, dim (held) or pressed
    w, h = 104, 49; kh = 46; out = np.zeros((h, w, 4)); dy = 2 if state == "pressed" else 0
    if state != "pressed": sh = np.zeros((h, w)); sh[3:3 + kh, :] = rrect_mask(w, kh, 10); out = comp(out, rgba_of((0, 0, 0), blur(sh, 2) * 0.45))
    m = np.zeros((h, w)); m[dy:dy + kh] = rrect_mask(w, kh, 10); t = np.clip((np.arange(h)[:, None] - dy) / kh, 0, 1)
    top, bot = (np.array([74, 58, 36]), np.array([51, 40, 26])) if state != "dim" else (np.array([48, 42, 34]), np.array([36, 32, 26]))
    if state == "pressed": top, bot = top * 0.85, bot * 0.85
    fill = np.zeros((h, w, 4)); fill[..., :3] = ((1 - t) * top + t * bot)[..., None, :].repeat(w, 1)[:, :, :] / 255 if False else (((1 - t)[..., None] * top + t[..., None] * bot) / 255).repeat(w, 1); fill[..., 3] = m
    out = comp(out, fill); rim = np.zeros((h, w)); rim[dy:dy + kh] = np.clip(rrect_mask(w, kh, 10) - rrect_mask(w, kh, 9, inset=1), 0, 1)
    out = comp(out, rgba_of(AMBER, rim * (0.55 if state == "lit" else 0.25 if state == "dim" else 0.45)))
    hi = np.zeros((h, w)); hi[dy + 1, 6:w - 6] = 0.22 if state != "dim" else 0.1; out = comp(out, rgba_of((255, 230, 190), hi * m))
    lo = np.zeros((h, w)); lo[dy + kh - 3:dy + kh - 1, 6:w - 6] = 0.35; out = comp(out, rgba_of((0, 0, 0), lo * m)); return out
for k in ("lit", "dim", "pressed"): save(f"reading-key-{k}-104x49", key(k))
def glint_a(s, ss=8):                                                                                                       # the glint: a four-point curved star, cream
    def dr(d, S):
        r = s / 2 * S; c = (r, r); pts = []
        for q in range(4):
            a0 = q * np.pi / 2
            for t in np.linspace(0, 1, 12): ang = a0 + t * np.pi / 2; rr = r * (1 - np.sin(t * np.pi) * 0.78); pts.append((c[0] + rr * np.sin(ang), c[1] - rr * np.cos(ang)))
        d.polygon(pts, fill=255)
    return ss_draw(s, s, dr, ss)
def star_a(s, ss=8):
    def dr(d, S):
        r = s / 2 * S; pts = [(r + (r if i % 2 == 0 else r * 0.45) * np.cos(-np.pi / 2 + i * np.pi / 5), r + (r if i % 2 == 0 else r * 0.45) * np.sin(-np.pi / 2 + i * np.pi / 5)) for i in range(10)]; d.polygon(pts, fill=255)
    return ss_draw(s, s, dr, ss)
def diamond_a(s, ss=8): return ss_draw(s, s, lambda d, S: d.polygon([(s / 2 * S, 0.5 * S), ((s - 0.5) * S, s / 2 * S), (s / 2 * S, (s - 0.5) * S), (0.5 * S, s / 2 * S)], fill=255), ss)
def edge_of(a, px=1.0): return np.clip(blur(a, px * 0.8) * 1.0 - a * 0, 0, 1)
for s in (11, 12, 13, 16):
    save(f"reading-glint-{s}x{s}", rgba_of(CREAM, glint_a(s)))
    st = star_a(s); ring = np.clip(blur(st, 0.7) * 1.6, 0, 1); out = comp(rgba_of((6, 16, 18), ring * 0.8), rgba_of(AMBER, st)); save(f"reading-star-{s}x{s}", out)
    save(f"reading-diamond-{s}x{s}", rgba_of(AMBER, diamond_a(s)))
for kind, ring_col, ring_a, glyph in (("glint", CREAM, 0.5, lambda: rgba_of(CREAM, glint_a(13))), ("star", AMBER, 0.6, None)):   # the badges: 20 px, a dark disc with a hairline ring, the glyph at 13
    disc = ss_draw(20, 20, lambda d, S: d.ellipse((0, 0, 20 * S - 1, 20 * S - 1), fill=255)); inner = ss_draw(20, 20, lambda d, S: d.ellipse((S, S, 19 * S - 1, 19 * S - 1), fill=255))
    b = comp(rgba_of((8, 20, 24), disc * 0.9), rgba_of(ring_col, np.clip(disc - inner, 0, 1) * ring_a))
    if kind == "glint": g = glyph()
    else: st = star_a(13); g = comp(rgba_of((6, 16, 18), np.clip(blur(st, 0.7) * 1.6, 0, 1) * 0.8), rgba_of(AMBER, st))
    b[3:16, 3:16] = comp(b[3:16, 3:16], g); save(f"reading-badge-{kind}-20x20", b)
chip = np.zeros((32, 86, 4)); m = rrect_mask(86, 32, 8); chip = comp(chip, rgba_of(AMBER, m * 0.14)); chip = comp(chip, rgba_of(AMBER, np.clip(m - rrect_mask(86, 32, 7, inset=1), 0, 1) * 0.4))
g = glint_a(14); chip[9:23, 10:24] = comp(chip[9:23, 10:24], rgba_of(CREAM, g)); save("reading-chip-86x32", chip)
X = np.arange(28)[None, :] + 0.5; prof = np.exp(-((X - 14) / 6.5) ** 2); core = np.exp(-((X - 14) / 2.2) ** 2)                 # the sweep: a warm bar, an amber glow round a pale core
sweep = comp(rgba_of(AMBER, np.repeat(prof * 0.42, 356, 0)), rgba_of((255, 236, 200), np.repeat(core * 0.35, 356, 0))); save("reading-sweep-28x356", sweep)
X = (np.arange(40)[None, :] + 0.5) / 40; save("reading-shine-40x63", rgba_of((255, 255, 255), np.repeat(np.interp(X, [0, 0.4, 0.92, 1], [0, 0, 0.22, 0]), 63, 0)))
inset = comp(rgba_of((4, 14, 17), rrect_mask(24, 24, 6) * 0.92), rgba_of((239, 233, 220), np.clip(rrect_mask(24, 24, 6) - rrect_mask(24, 24, 5, inset=1), 0, 1) * 0.10))   # Compare's dark glass inset behind a paper's rail (§4): the glass, a hairline rim
top = np.zeros((24, 24)); top[1, 6:18] = 0.06; inset = comp(inset, rgba_of((255, 255, 255), top)); save("reading-inset-24x24", inset, slice_=[6, 6, 6, 6])
dm = ss_draw(12, 12, lambda d, S: d.polygon([(6 * S, 0.5 * S), (11.5 * S, 6 * S), (6 * S, 11.5 * S), (0.5 * S, 6 * S)], fill=255)); dmi = ss_draw(12, 12, lambda d, S: d.polygon([(6 * S, 2 * S), (10 * S, 6 * S), (6 * S, 10 * S), (2 * S, 6 * S)], fill=255))
save("reading-differs-12x12", comp(rgba_of((26, 23, 37), dm), rgba_of((69, 216, 190), dmi)))   # the differs mark over a lane where the two pods differ: aqua on a 1 px ink keyline (colours.diff), never amber
save("reading-veil-548x462", rgba_of((3, 10, 12), rrect_mask(548, 462, 10)))
save("reading-sprout-20x18", rgba_of(hexrgb(CH["movement"]), ss_draw(20, 18, lambda d, S: [d.line([(10 * S, 16 * S), (10 * S, 8 * S)], fill=255, width=int(1.8 * S)), d.polygon([(10 * S, 9 * S), (8 * S, 3 * S), (3 * S, 2.5 * S), (4 * S, 7 * S)], fill=230), d.polygon([(10 * S, 8 * S), (12 * S, 3 * S), (17 * S, 3.5 * S), (16 * S, 8 * S)], fill=230)])))
save("reading-lock-14x16", rgba_of(CREAM, 0.8 * ss_draw(14, 16, lambda d, S: [d.rounded_rectangle((2 * S, 7 * S, 12 * S, 15 * S), 2 * S, fill=255), d.arc((4 * S, 2 * S, 10 * S, 11 * S), 180, 360, fill=255, width=int(1.6 * S)), d.line([(4.6 * S, 6.5 * S), (4.6 * S, 8 * S)], fill=255, width=int(1.6 * S)), d.line([(9.4 * S, 6.5 * S), (9.4 * S, 8 * S)], fill=255, width=int(1.6 * S))])))
save("reading-moon-8x8", rgba_of(CREAM, 0.55 * ss_draw(8, 8, lambda d, S: [d.arc((0.6 * S, 0.6 * S, 7.4 * S, 7.4 * S), 300, 150, fill=255, width=int(1.2 * S)), d.arc((2.6 * S, -1.5 * S, 9.5 * S, 5.4 * S), 95, 205, fill=255, width=int(1.2 * S))])))
for ch, col in CH.items(): save(f"reading-tick-{ch}-20x20", rgba_of(hexrgb(col), ss_draw(20, 20, lambda d, S: d.line([(3 * S, 10.4 * S), (8 * S, 15.2 * S), (17.2 * S, 4.8 * S)], fill=255, width=2 * S, joint="curve"))))
wv = np.zeros((10, 14, 3)) + 0.5; save("reading-wave-14x10", rgba_of(CREAM, 0.5 * ss_draw(14, 10, lambda d, S: d.line([(S * (1 + t), S * (5 - 2.2 * np.sin(np.pi * t / 3.5))) for t in np.linspace(0, 12, 97)], fill=255, width=int(1.4 * S)))))
def podline(w, h, k):                                                                                                       # the pod glyph, outlined only, never filled: an ellipse and four dots
    return rgba_of(CREAM, ss_draw(w, h, lambda d, S: [d.ellipse(((13 - 10.5) * k * S, (16 - 13.5) * k * S, (13 + 10.5) * k * S, (16 + 13.5) * k * S), outline=int(255 * 0.6), width=max(1, int(1.3 * k * S)))] + [d.ellipse(((13 + dx - 1.6) * k * S, (16 + dy - 1.6) * k * S, (13 + dx + 1.6) * k * S, (16 + dy + 1.6) * k * S), fill=int(255 * 0.48)) for dx, dy in [(-4, -5), (4, -2), (-2, 5), (5, 6)]]))
save("reading-podline-26x32", podline(26, 32, 1.0)); save("reading-podline-23x29", podline(23, 29, 0.9))

# ---------------- the specimen's derived layers (for the logic process) ----------------
def A(name): return F(Image.open(os.path.join(L1, name)))[..., 3]
def white(a): return rgba_of((255, 255, 255), a)
def line_of(m): m = blur(m, 0.8); gy, gx = np.gradient(m); return np.clip(np.hypot(gx, gy) * 3.2, 0, 1)
SP = {"S01": ("loika", "loika-plain.png", 304, 312), "S03": ("tuikis", None, 291, 291)}
for sid, (nm, plain, w, h) in SP.items():
    body = A(plain) if plain else (A(f"mask-{nm}-coat.png") + A(f"mask-{nm}-face.png") + A(f"mask-{nm}-shape.png") > 0).astype(float)
    if not plain:   # the Tuikis: its signed scan silhouette is the bud's shape at 2.6x (readinstrumentlayers.py), so its body is that shape's alpha over a half
        bud = np.asarray(Image.open(os.path.join(UI, "assets/masters/pods/bud-shape-S03-112x112.png")).convert("RGBA").resize((w, h), Image.LANCZOS)).astype(float)[..., 3] / 255; body = (bud > 0.5).astype(float)
    inside = body > 0
    save(f"reading-body-{sid}-{w}x{h}", white(A(plain) if plain else inside.astype(float)))                                   # the plain body (the stand with no look layer), the specimen's silhouette
    save(f"reading-scan-{sid}-{w}x{h}", white(A(f"scan-{nm}.png") * inside))                                                 # scan clean: no light outside the body
    save(f"reading-rim-{sid}-{w}x{h}", white(A(f"rim-{nm}.png")))
    parts = ["coat", "face", "head"] if sid == "S01" else ["coat", "face", "shape"]
    for p in parts: save(f"reading-mask-{sid}-{p}-{w}x{h}", white(A(f"mask-{nm}-{p}.png"))); save(f"reading-line-{sid}-{p}-{w}x{h}", white(A(f"line-{nm}-{p}.png")))
    cut = round(220 * h / 312); legs = (A(plain) if plain else inside.astype(float)) * (np.arange(h)[:, None] >= cut)             # the legs: the stand's alpha cut hard at row 220 of 312, the line traced on the cut mask, so it closes
    save(f"reading-mask-{sid}-legs-{w}x{h}", white(legs)); save(f"reading-line-{sid}-legs-{w}x{h}", white(line_of(legs)))
if sid := "S01":
    save("reading-face-window-S01-304x312", white(A("win-loika-face.png")))

# ---------------- the index entries ----------------
if os.path.abspath(OUT) != os.path.abspath(os.path.join(UI, "assets/masters/pods/reading")): print(f"{len(MADE)} cuts in {OUT} (a proof folder: the index is left as it is)"); sys.exit(0)
idx_path = os.path.join(UI, "assets/masters/index.json"); idx = json.load(open(idx_path))
masters = idx.get("masters", idx)
for name, path, (w, h), sl in MADE:
    rel = os.path.relpath(path, os.path.join(UI, "assets/masters")); e = {"file": rel, "w": w, "h": h, "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(), "signed": SIGNED}
    if sl: e["slice"] = sl
    masters[name] = e
json.dump(idx, open(idx_path, "w"), indent=1, ensure_ascii=False); open(idx_path, "a").write("\n")
print(f"{len(MADE)} cuts in {OUT}")
