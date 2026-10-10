"""Pass 111: the Incubator's chamber pieces, cut by hand from source/raw/incubator-sheet-a3.jpg (one Pro sheet: the sage chamber with one arched window, the sand base, the moss nest, each in a flat front elevation; the first two sheets, a and a2, were three-quarter and had a second window inside; see the README). Station art director's brief (Oct 10, 25 MXN, 6 Pro at most), sizes from station-layouts.md "Incubator: growing and ready" on main.
 dome-back-304x272, dome-front-304x272, dome-inside-standby-304x272, dome-inside-ready-304x272 (the ready chamber light by hand): the chamber scaled UNIFORMLY to the dome's 272 rows and centred (its ink lies inside the arch of radius 152 on (152, 154), the body down to y 272). The housing's opening is found by flood fill of what is not sage; front = the picture with the opening cleared (alpha 0, a 1 px feather), back = the interior behind it (the opening dilated 5 px so it tucks under the frame), standby = back with a soft warm pool on the bed (about half a growing glow), ready = back graded toward cream (the interior's light up, nothing but the light).
 base-336x96: the sand band scaled to 336 wide, its painted plaque and foot strip painted out, then by hand: the plaque plate 128x32 at (104, 40) (the band's own sand a little darker, a hairline edge, left empty) and the foot light, a sage line at (8, 92, 320, 2).
 nest-208x48 and nest-front-208x48: the moss cushion scaled uniformly to 48 rows; the front is the rim fibres only (the near half of the cushion, its top edge soft), drawn over the bud.
python3 -I tools/incubatorcut.py -> slices/dome-*.png, slices/base-336x96.png, slices/nest-*.png, marks/incubator-pieces-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
def gblur(a_, sg):
    fy = np.fft.fftfreq(a_.shape[0])[:, None]; fx = np.fft.rfftfreq(a_.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a_) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a_.shape)
SRC = "source/raw/incubator-sheet-a3.jpg"; im = Image.open(SRC).convert("RGB"); a = np.asarray(im).astype(float); H, W, _ = a.shape
bg = np.median(np.concatenate([a[:30].reshape(-1, 3), a[-30:].reshape(-1, 3)]), axis=0); dist = np.sqrt(((a - bg) ** 2).sum(2)); keyed = np.clip((dist - 12) / 22.0, 0, 1)
def rgba(box):
    x0, y0, x1, y1 = box; return np.dstack([a[y0:y1, x0:x1], keyed[y0:y1, x0:x1] * 255]).clip(0, 255)
def fit(arr, w, h, align="centre"):
    """arr: RGBA float; scaled uniformly to fit (w, h), premultiplied for the resize; returns an RGBA tile w x h"""
    src = Image.fromarray(arr.astype(np.uint8), "RGBA"); s = min(w / src.width, h / src.height); nw, nh = max(1, round(src.width * s)), max(1, round(src.height * s))
    p = np.asarray(src).astype(float); pm = np.dstack([p[..., :3] * p[..., 3:] / 255.0, p[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255.0; col = np.where(al > 0.01, r[..., :3] / np.maximum(al, 0.01), 0); t = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    t.paste(Image.fromarray(np.dstack([col, r[..., 3:]]).clip(0, 255).astype(np.uint8), "RGBA"), ((w - nw) // 2, (h - nh) // 2 if align == "centre" else h - nh)); return t, s
man = json.load(open("slices/manifest.json")); outs = {}
def save(n, t, made, opt=True):
    t.save(f"slices/{n}.png", optimize=opt); outs[n] = t; man[n] = {"size": list(t.size), "rect": None, "src": SRC + " (gemini-3-pro-image)", "made": made + " (pass 111)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
# --- the chamber, rebuilt at the arch's full width (the art director's return: 184 px was too narrow). The housing is redrawn by hand in sheet a3's material (sage about (130, 144, 119), a flat matte paint a little darker toward the foot, a hairline edge, a shallow hood lip) on the dome's geometry: a half circle of radius 152 on (152, 152), the body straight down to y 272, so 304 wide; ONE arched window 226 wide (x 39 to 265), its top an ellipse of 113 x 105 on (152, 150), its sides straight down to y 236, rounded corners; the window's interior is sheet a3's own lamp and moss bed (scaled uniformly) on a plain lit wall.
sage = np.array([131.0, 144.0, 119.0]); rng = np.random.default_rng(5); Wd, Hd = 304, 272; Yg, Xg = np.mgrid[0:Hd, 0:Wd].astype(float)
def sup(w, h, f):
    im_ = Image.new("L", (w * 4, h * 4), 0); f(ImageDraw.Draw(im_)); return np.asarray(im_.resize((w, h), Image.LANCZOS)).astype(float) / 255.0       # an anti-aliased shape, drawn at 4x
def outer(d): d.pieslice([0, 0, 4 * 304 - 1, 4 * 304 - 1], 180, 360, fill=255); d.rectangle([0, 4 * 152, 4 * 304 - 1, 4 * 272 - 1], fill=255)
def window(d, dx=0, dy=0):
    d.pieslice([4 * (39 - dx), 4 * (45 - dy), 4 * (265 + dx), 4 * (255 - dy)], 180, 360, fill=255); d.rounded_rectangle([4 * (39 - dx), 4 * 148, 4 * (265 + dx), 4 * (236 + dy)], radius=4 * 18, fill=255, corners=(False, False, True, True))
body = sup(Wd, Hd, outer); win = sup(Wd, Hd, window)
SAGEC = np.array([130.0, 144.0, 119.0]); foot = np.clip((Yg - 200) / 72.0, 0, 1)[..., None]; hous = SAGEC * (1 - 0.14 * foot) * (1 + 0.012 * np.clip((152 - Yg) / 152.0, -1, 1))[..., None] * np.ones((Hd, Wd, 3))
low = gblur(rng.standard_normal((Hd, Wd)), 6.0); hous = hous + (low * 40.0)[..., None] * np.array([1.0, 1.0, 0.8]); hous = hous + rng.standard_normal((Hd, Wd, 1)) * 1.2          # a soft painted unevenness and a fine grain
lip_o = sup(Wd, Hd, lambda d: d.pieslice([4 * (39 - 11), 4 * (45 - 11), 4 * (265 + 11), 4 * (255 + 11)], 180, 360, fill=255)) * (Yg < 160)[..., None][..., 0]
lip = np.clip(lip_o - win, 0, 1) * (Yg < 150)
hous = hous * (1 - lip[..., None] * 0.0) + lip[..., None] * np.array([6.0, 6.0, 5.0])                                                  # the hood lip a little lighter, matte
edge = np.clip(body - np.asarray(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255.0, 0, 1)
wedge = np.clip(np.asarray(Image.fromarray((win * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(float) / 255.0 - win, 0, 1); ledge = np.clip(np.asarray(Image.fromarray((lip_o * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255.0 - 0, 0, 1)
ledge = np.clip(lip_o - np.asarray(Image.fromarray((lip_o * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255.0, 0, 1) * (Yg < 150)
hair = np.array([92.0, 106.0, 84.0]); hous = hous * (1 - 0.6 * edge[..., None]) + hair * 0.6 * edge[..., None]; hous = hous * (1 - 0.7 * wedge[..., None]) + hair * 0.7 * wedge[..., None]; hous = hous * (1 - 0.45 * ledge[..., None]) + hair * 0.45 * ledge[..., None]
feet = np.zeros((Hd, Wd)); feet[262:272, 0:6] = 1; feet[262:272, 298:304] = 1; hous = hous * (1 - 0.18 * feet[..., None])
# the stage's rendering (the art director's pass 112 note): light from the upper left, a matte lit edge along the top-left of the housing and of the window's frame, shade at the lower right, four screws on the frame, a hairline seam below the window
dgl = (Xg + Yg) / float(Wd + Hd); hous = hous * (1 + 0.07 - 0.20 * dgl)[..., None]
sh = lambda m, dx, dy: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).transform((Wd, Hd), Image.AFFINE, (1, 0, dx, 0, 1, dy))).astype(float) / 255.0
lit = np.clip(body - sh(body, 3, 3), 0, 1) * (1 - win); dark = np.clip(body - sh(body, -3, -3), 0, 1) * (1 - win)
hous = hous * (1 + 0.11 * lit[..., None]) * (1 - 0.15 * dark[..., None])
wl = np.clip((1 - win) * sh(win, -2, -2) - 0, 0, 1); wd = np.clip((1 - win) * sh(win, 2, 2), 0, 1); hous = hous * (1 - 0.12 * wl[..., None]) * (1 + 0.06 * wd[..., None])
seam = np.zeros((Hd, Wd)); seam[246, :] = 1; hous = hous * (1 - 0.30 * (seam * body)[..., None]) + np.array([255.0, 255.0, 255.0]) * 0.03 * (np.roll(seam, 1, 0) * body)[..., None]
for (sx, sy) in ((19, 172), (285, 172), (19, 258), (285, 258)):
    rr = np.hypot(Xg - sx, Yg - sy); ring = np.clip(1 - np.abs(rr - 4.2) / 1.0, 0, 1) * (rr < 5.4); face = np.clip(4.2 - rr, 0, 1); slot = np.clip(1 - np.abs((Xg - sx) * 0.7 + (Yg - sy) * 0.7) / 0.8, 0, 1) * (rr < 3.0)
    hous = hous * (1 - 0.55 * ring[..., None]) + np.array([86.0, 100.0, 78.0]) * 0.55 * ring[..., None]; hous = hous * (1 - 0.25 * (slot * face)[..., None]); hous = hous + (face * (1 - slot))[..., None] * 0.0
front = Image.fromarray(np.dstack([hous.clip(0, 255), body * (1 - win) * 255]).astype(np.uint8), "RGBA")
# the interior: a plain lit wall (sheet a3's wall colours, a vignette to its edges), the hood's shadow under the lip, sheet a3's lamp and moss bed
wall_top, wall_mid, wall_edge = np.array([214.0, 186.0, 140.0]), np.array([206.0, 183.0, 146.0]), np.array([195.0, 168.0, 131.0])
ty = np.clip((Yg - 45) / 190.0, 0, 1)[..., None]; wall = wall_top * (1 - ty) + wall_mid * ty; vx = np.clip(np.abs(Xg - 152) / 113.0, 0, 1)[..., None] ** 2.2; wall = wall * (1 - vx) + wall_edge * vx
hood_sh = np.clip(1 - (Yg - 45 - 5) / 34.0, 0, 1)[..., None] * 0.20; wall = wall * (1 - hood_sh) + hood_sh * np.array([120.0, 95.0, 66.0])
wall = wall + gblur(rng.standard_normal((Hd, Wd)), 3.0)[..., None] * 5.0
sc = 226.0 / 253.0
def sprite(box, thr_fn):
    x0, y0, x1, y1 = box; reg = a[y0:y1, x0:x1]; m = thr_fn(reg).astype(float); m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(float) / 255.0
    arr = np.dstack([reg, m * 255]); w2, h2 = round((x1 - x0) * sc), round((y1 - y0) * sc); return fit(arr, w2, h2)[0], (x1 - x0, y1 - y0)
back_rgb = wall.copy()
# the moss bed: sheet a3's own moss texture (its bottom rows, x 230 to 440, y 510 to 572), mirrored to cover the window's foot, under an undulating top edge with a soft hollow; the lamp: a small brown shade and a warm bulb, drawn
moss = np.zeros((Hd, Wd, 4))      # pass 114 (the art director): no painted hills or moss in the back: the inside is a plain warm matte wall with the lamp; the bed is the nest slice
back_img = Image.fromarray(back_rgb.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA"); back_img.alpha_composite(Image.fromarray(moss.astype(np.uint8), "RGBA"))
lamp = Image.new("RGBA", (Wd * 4, Hd * 4), (0, 0, 0, 0)); dl = ImageDraw.Draw(lamp)
dl.rectangle([4 * 151, 4 * 45, 4 * 153, 4 * 55], fill=(96, 70, 44, 255)); dl.pieslice([4 * 132, 4 * 52, 4 * 172, 4 * 76], 180, 360, fill=(122, 86, 52, 255)); dl.ellipse([4 * 144, 4 * 63, 4 * 160, 4 * 78], fill=(255, 236, 170, 255))
glw = np.exp(-(((Xg - 152) / 26.0) ** 2 + ((Yg - 72) / 22.0) ** 2))[..., None]; bi = np.asarray(back_img).astype(float); bi[..., :3] = bi[..., :3] * (1 - 0.35 * glw) + np.array([255.0, 224.0, 150.0]) * 0.35 * glw; back_img = Image.fromarray(bi.clip(0, 255).astype(np.uint8), "RGBA")
back_img.alpha_composite(lamp.resize((Wd, Hd), Image.LANCZOS))
win_d = np.asarray(sup(Wd, Hd, lambda d: window(d, 7, -7))).astype(float)                                                                 # the window dilated 7 px: the interior tucks under the frame
back = Image.fromarray(np.dstack([np.asarray(back_img)[..., :3], win_d * 255]).astype(np.uint8), "RGBA")
save("dome-front-304x272", front, "the chamber's housing and window frame (sage metal, one arched window, the opening cleared), cut from the sheet, scaled uniformly to the dome's 272 rows")
back, brep = fit_light(back, warm=True); print("dome-back", brep)
save("dome-back-304x272", back, "the chamber's warm interior (a plain lit wall, a small lamp, the moss bed with its hollow), empty, behind the housing")
def glow(t, strength, cream):
    r = np.asarray(t).astype(float); h, w = r.shape[:2]; lin = to_lin(r[..., :3]); Y, X = np.mgrid[0:h, 0:w]
    bed = np.exp(-(((X - w / 2) / (0.28 * w)) ** 2 + ((Y - 0.72 * h) / (0.13 * h)) ** 2)); lamp = np.exp(-(((X - w / 2) / (0.3 * w)) ** 2 + ((Y - 0.28 * h) / (0.25 * h)) ** 2))
    add = (strength * bed + cream * lamp)[..., None] * np.array([1.0, 0.86, 0.58]); out = 1 - (1 - lin) * (1 - np.clip(add, 0, 0.95)); r[..., :3] = to_srgb(out); return Image.fromarray(r.astype(np.uint8), "RGBA")
bk = np.asarray(back).astype(float); mask_a = bk[..., 3:] / 255.0
st_, srep = fit_light(glow(back, 0.16, 0.0), warm=True); print("standby", srep); st_ = Image.fromarray(np.dstack([np.asarray(st_)[..., :3] * 0.94, np.asarray(st_)[..., 3]]).astype(np.uint8), "RGBA"); save("dome-inside-standby-304x272", st_, "the interior with a soft warm pool on the bed (about half a growing glow), standby")
rd, rrep = fit_light(glow(back, 0.40, 0.30), warm=True, cap=69.9); print("ready", rrep); save("dome-inside-ready-304x272", rd, "the interior with its light up toward cream, ready (by hand: a cream light added on the wall and the bed, nothing else changed)")
# --- the base
bx = (661, 189, 1280, 330); b = a[bx[1]:bx[3], bx[0]:bx[2]]; ba = keyed[bx[1]:bx[3], bx[0]:bx[2]]
body = b[:int(0.88 * b.shape[0])]; sand_rows = np.arange(body.shape[0])
band = np.dstack([body, ba[:body.shape[0]] * 255])
plate_box = (200, 20, 405, 108)                    # the painted plaque, in the band's own pixels
for yy_ in range(plate_box[1], plate_box[3]):
    pass
body = body.copy(); px0, py0, px1, py1 = plate_box
top = body[py0 - 6:py0 - 2, px0:px1].mean(0); bot = body[py1 + 2:py1 + 6, px0:px1].mean(0); tt = np.linspace(0, 1, py1 - py0)[:, None, None]; body[py0:py1, px0:px1] = (1 - tt) * top[None] + tt * bot[None]
band = np.dstack([body, ba[:body.shape[0]] * 255]); tile_b, sb = fit(band, 336, 70)
base = Image.new("RGBA", (336, 96), (0, 0, 0, 0)); base.paste(tile_b, (0, 91 - tile_b.height + 1), tile_b); base, brep2 = fit_light(base); print("base", brep2)
d = ImageDraw.Draw(base); sand = tuple(int(v) for v in np.asarray(base)[50:70, 20:100, :3].reshape(-1, 3).mean(0)); pf = tuple(max(0, int(v * 0.93)) for v in sand); edge = tuple(max(0, int(v * 0.78)) for v in sand)
d.rectangle([104, 40, 231, 71], fill=pf + (255,)); d.rectangle([104, 40, 231, 71], outline=edge + (255,)); d.line([(105, 41), (230, 41)], fill=tuple(min(255, int(v * 1.05)) for v in sand) + (255,))
sg = tuple(int(v) for v in sage); d.rectangle([8, 92, 327, 93], fill=sg + (255,))
TICK = {(219, 72): (169, 154, 130, 255), (219, 73): (169, 154, 131, 255), (219, 74): (169, 155, 131, 255), (219, 75): (170, 155, 131, 255), (219, 76): (169, 154, 131, 255), (219, 77): (168, 154, 130, 255), (219, 78): (168, 152, 128, 255), (220, 72): (170, 155, 131, 255), (220, 73): (170, 155, 131, 255), (220, 74): (170, 155, 131, 255), (220, 75): (170, 155, 131, 255), (220, 76): (170, 155, 131, 255), (220, 77): (169, 154, 130, 255), (220, 78): (167, 153, 129, 255)}      # the art director's hand fix (pass 113 verdict): a 2 px tick at x 219-220, y 72-78 filled in from its neighbours; the pixels are the signed ones, so that a rerun reproduces the signed file
base_a = np.asarray(base).copy()
for (tx, ty), v in TICK.items(): base_a[ty, tx] = v
base = Image.fromarray(base_a, "RGBA")
save("base-336x96", base, opt=False, made="the enamel base, matte lit sand: the sand band cut from the sheet and scaled uniformly to 336 wide (the painted plaque and foot painted out), the plaque plate 128x32 at (104, 40) drawn by hand (panel fill, hairline edge, left empty), the foot light a sage line at (8, 92, 320, 2)")
# --- the nest
nb = (668, 440, 1292, 610); nest = rgba(nb); t_n, sn = fit(nest, 208, 48)
# pass 115 (the art director: when empty the bed read as a closed green log): a shallow, forest-shaded hollow at the top centre, seen into: the moss darkened to a deep forest green in a soft oval (104 x 18 on (104, 13)), its near lip a little lit; the silhouette is unchanged
tn = np.asarray(t_n).astype(float); hh, ww = tn.shape[:2]; Yn, Xn = np.mgrid[0:hh, 0:ww].astype(float)
hol = np.exp(-(((Xn - ww / 2.0) / 58.0) ** 4 + ((Yn - 15.0) / 11.0) ** 2)); lipl = np.exp(-(((Xn - ww / 2.0) / 54.0) ** 4 + ((Yn - 25.0) / 3.0) ** 2))
shade = np.array([20.0, 40.0, 20.0]); tn[..., :3] = tn[..., :3] * (1 - 0.88 * hol[..., None] * (tn[..., 3:] / 255.0)) + shade * 0.88 * hol[..., None] * (tn[..., 3:] / 255.0)
tn[..., :3] = tn[..., :3] * (1 + 0.22 * lipl[..., None]) + np.array([10.0, 14.0, 4.0]) * lipl[..., None]
# pass 116 (the art director: a pale cut fringe runs along the top contour, 332 and 143 pixels with R+G+B over 480): defringed to the moss by hand: every pixel of the nest whose R+G+B is over 440 (the keyed slate's bleed and the pale tips) takes the colour of the nearest dark moss pixel (the pixels under 400 that are almost opaque), found by growing those outward
clean = (tn[..., 3] > 230) & (tn[..., :3].sum(2) < 400); pale = (tn[..., 3] > 0) & (tn[..., :3].sum(2) > 440); fillc = tn[..., :3].copy(); have = clean.copy()
for _ in range(14):
    pad = np.pad(fillc, ((1, 1), (1, 1), (0, 0)), mode="edge"); hp = np.pad(have, 1); acc = np.zeros_like(fillc); cnt = np.zeros(have.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            mm = hp[1 + dy:1 + dy + have.shape[0], 1 + dx:1 + dx + have.shape[1]]; acc += pad[1 + dy:1 + dy + have.shape[0], 1 + dx:1 + dx + have.shape[1]] * mm[..., None]; cnt += mm
    new_ = (~have) & (cnt > 0); fillc[new_] = acc[new_] / cnt[new_][:, None]; have = have | new_
tn[..., :3][pale] = fillc[pale]
t_n = Image.fromarray(tn.clip(0, 255).astype(np.uint8), "RGBA")
save("nest-208x48", t_n, "the moss nest, plump with its hollow visible and no twigs, scaled uniformly to 48 rows")
f = np.asarray(t_n).astype(float); h_ = f.shape[0]; ramp = np.clip((np.arange(h_) - 0.50 * h_) / (0.14 * h_), 0, 1)[:, None]; f[..., 3] = f[..., 3] * ramp
save("nest-front-208x48", Image.fromarray(f.astype(np.uint8), "RGBA"), "the nest's rim fibres only, the near half of the cushion with its top edge soft, drawn over the bud")
# --- proof on the stage floor (the Pods overview floor) at 1x
stage = Image.open("slices/room-bench-stage.png").convert("RGBA"); P = Image.new("RGBA", (1024, 522), (0, 0, 0, 0)); P.alpha_composite(stage)
P.alpha_composite(outs["dome-back-304x272"], (360, 160)); P.alpha_composite(outs["nest-208x48"], (408, 360)); P.alpha_composite(outs["nest-front-208x48"], (408, 360)); P.alpha_composite(outs["dome-front-304x272"], (360, 160)); P.alpha_composite(outs["base-336x96"], (344, 416))
row = Image.new("RGB", (1024, 522 + 8 + 304), (10, 14, 18)); row.paste(P.convert("RGB"), (0, 0))
x = 8
for n in ("dome-back-304x272", "dome-front-304x272", "dome-inside-standby-304x272", "dome-inside-ready-304x272"):
    t = Image.new("RGB", (304, 272), (60, 66, 76)); t.paste(outs[n].convert("RGB"), (0, 0), outs[n]); row.paste(t, (x, 530)); x += 312
row.save("marks/incubator-pieces-proof-1x.png")
json.dump(man, open("slices/manifest.json", "w"), indent=1); print("ok", {n: man[n]["sha256"][:12] for n in outs})
