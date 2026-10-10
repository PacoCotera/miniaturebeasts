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
def save(n, t, made):
    t.save(f"slices/{n}.png", optimize=True); outs[n] = t; man[n] = {"size": list(t.size), "rect": None, "src": SRC + " (gemini-3-pro-image)", "made": made + " (pass 111)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
# --- the chamber: the opening by flood fill of what is not sage
cb = (98, 40, 567, 727); ch = a[cb[1]:cb[3], cb[0]:cb[2]]; sage = np.array([131.0, 144.0, 119.0]); notsage = np.sqrt(((ch - sage) ** 2).sum(2)) > 40
# the opening: the arch drawn on the picture (an ellipse on top, a rect with rounded corners below), cut by colour (what is not sage), so the hood lip stays frame; the largest piece, holes closed
G = Image.new("L", (ch.shape[1], ch.shape[0]), 0); dg = ImageDraw.Draw(G); dg.ellipse([108 - 98 + 98 - 98 + 0, 150, 108 - 98 + 98 - 98 + 0 + 256, 150 + 280], fill=255) if False else None
dg.ellipse([100, 135, 376, 430], fill=255); dg.rounded_rectangle([100, 290, 376, 548], radius=22, fill=255); geom = np.asarray(G) > 0
op = notsage & geom      # every non-sage pixel inside the arch (the hood's shaded underside included), not only the connected piece
opi = Image.fromarray((op * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)); op = np.asarray(opi) > 0
chal = keyed[cb[1]:cb[3], cb[0]:cb[2]]
def tile(mask_img, source_alpha):
    arr = np.dstack([ch, source_alpha * 255]); return fit(arr, 304, 272)
op_f = np.asarray(opi.filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255.0
front_a = chal * (1 - op_f); front, s_ch = tile(None, front_a)
opd = np.asarray(opi.filter(ImageFilter.MaxFilter(11))).astype(float) / 255.0; back = None
# the back is the interior: its pixels are the picture's, the part under the frame is the interior's own edge, repeated outward (the nearest opening pixel)
from PIL import ImageOps
inner = ch.copy(); idx = np.where(op)
yy, xx = np.mgrid[0:op.shape[0], 0:op.shape[1]]
def nearest_fill(img, mask):
    out = img.copy(); m = mask.copy(); need = ~m
    for _ in range(8):
        pad = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode="edge"); mp = np.pad(m, 1)
        acc = np.zeros_like(out); cnt = np.zeros(m.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                mm = mp[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]; acc += pad[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]] * mm[..., None]; cnt += mm
        new = need & ~m & (cnt > 0); out[new] = acc[new] / cnt[new][:, None]; m = m | new
    return out
inner = nearest_fill(ch, op)
back_arr = np.dstack([inner, opd * 255]); back, _ = fit(back_arr, 304, 272)
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
save("base-336x96", base, "the enamel base, matte lit sand: the sand band cut from the sheet and scaled uniformly to 336 wide (the painted plaque and foot painted out), the plaque plate 128x32 at (104, 40) drawn by hand (panel fill, hairline edge, left empty), the foot light a sage line at (8, 92, 320, 2)")
# --- the nest
nb = (668, 440, 1292, 610); nest = rgba(nb); t_n, sn = fit(nest, 208, 48); save("nest-208x48", t_n, "the moss nest, plump with its hollow visible and no twigs, scaled uniformly to 48 rows")
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
