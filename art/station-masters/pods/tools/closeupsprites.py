"""The close-up's code-drawn sprites and derived art (ux-closeup.md section 7; the art director's sign-off ad-bay-closeup.md 2.3, 2.8, 2.9), at no cost:
  * the mibi's own stamp at 96 (2.3): a scalloped (perforated) cream stamp on slate, its genome as 8x8 cells of 7 px on an 8 px pitch (at least 6 px),
    mirrored left to right so it reads as a stamp's device and never as a QR code; drawn at 8x and reduced. `stamp(code)` is the reference drawing the
    build ports; three sample codes are rendered. The stamp row shows the sheet's Stamp icon instead (one drawing per size).
  * the curled sleepers for Tucked away (2.9): the signed 304 curl keys (cut from the kept full-size curl raws, curl/keys/) reduced to the close-up's
    adult scale (the 144 family's x 0.4737; juveniles x 0.4904, the nap family's ratio), feet on the 152 box's row 147, on a code contact shadow.
  * the 9-slice sprites (so no corner is stepped by code): the slate pane (92 %), the plate, the hairline frame; and the soft contact-shadow ellipse.
usage: python3 -I tools/closeupsprites.py   Writes closeup/ (stamp/, curl/, sprites/) and closeup/sprites.json."""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f"{R}/closeup"
for s in ("stamp", "curl", "sprites"): os.makedirs(f"{OUT}/{s}", exist_ok=True)
PANEL, HAIR, BEVEL, BAR, PAPER, SHADOW = (42, 46, 56), (60, 75, 87), (90, 102, 114), (52, 56, 63), (245, 230, 196), (30, 26, 34)
rec = {}
def save(im, name):
    p = f"{OUT}/{name}.png"; im.save(p, optimize=True); rec[name] = {"size": list(im.size), "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
def premul_resize(im, size):
    a = np.asarray(im, np.float32); al = a[..., 3:4] / 255; pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1)
    ch = [np.asarray(Image.fromarray(np.ascontiguousarray(pm[..., i]), "F").resize(size, Image.LANCZOS)) for i in range(4)]
    A = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(A[..., None] / 255, 1e-6); rgb[A < 0.5] = 0
    return Image.fromarray((np.clip(np.concatenate([rgb, A[..., None]], -1), 0, 255) + 0.5).astype(np.uint8), "RGBA")

# ---------- the stamp at 96 ----------
B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
def bits(code):
    v = [B32.index(c) for c in code.upper() if c in B32]; out = []
    for x in v: out += [(x >> k) & 1 for k in range(4, -1, -1)]
    return out
def stamp(code, k=8):
    """96x96 at 1x: cream paper with a scalloped edge (bites of r 3 on a 9.6 px pitch), on slate; 8x8 cells of 7 px (pitch 8) from x, y 16;
    the genome's first 32 bits fill the left four columns, row by row, mirrored to the right four; a set bit is a slate cell (a hole in the paper)."""
    S = 96 * k; im = Image.new("RGBA", (S, S), PANEL + (255,)); d = ImageDraw.Draw(im)
    d.rectangle([6 * k, 6 * k, 90 * k - 1, 90 * k - 1], fill=PAPER + (255,))
    for i in range(10):
        c = (6 + 84 * i / 9) * k
        for (x, y) in ((c, 6 * k), (c, 90 * k), (6 * k, c), (90 * k, c)): d.ellipse([x - 3 * k, y - 3 * k, x + 3 * k, y + 3 * k], fill=PANEL + (255,))
    b = (bits(code) + [0] * 32)[:32]
    for r in range(8):
        for cc in range(4):
            if b[r * 4 + cc]:
                for col in (cc, 7 - cc):
                    x, y = (16 + 8 * col) * k, (16 + 8 * r) * k; d.rectangle([x, y, x + 7 * k - 1, y + 7 * k - 1], fill=PANEL + (255,))
    return im.resize((96, 96), Image.LANCZOS)
for code in ("Y5H47VG18", "0SVEV67ZF", "K3M9QPAT2"): save(stamp(code), f"stamp/closeup-stamp-{code}-96x96")

# ---------- the curls at close-up scale ----------
SH = Image.new("L", (144, 152), 0); ImageDraw.Draw(SH).ellipse([30, 141, 114, 153], fill=110); SH = SH.filter(ImageFilter.GaussianBlur(3))
for f in sorted(os.listdir(f"{R}/curl/keys")):
    stage = f.split("-")[1]; sp = f.split("-")[2]; key = Image.open(f"{R}/curl/keys/{f}").convert("RGBA")
    k = 0.4737 if stage == "adult" else 0.4904
    a = np.asarray(key)[..., 3]; ys, xs = np.where(a > 128); last = ys.max()                       # the last solid row of the key
    small = premul_resize(key, (round(304 * k), round(312 * k)))
    c = Image.new("RGBA", (144, 152), SHADOW + (0,)); c.putalpha(SH)
    lay = Image.new("RGBA", (144, 152), (0, 0, 0, 0)); lay.alpha_composite(small, (round(72 - 152 * k), round(147 - last * k)))
    c.alpha_composite(lay); save(c, f"curl/closeup-curl-{stage}-{sp}-144x152")
    save(lay, f"curl/closeup-curl-{stage}-{sp}-noshadow-144x152")

# ---------- 9-slice sprites ----------
def pane():      # 24x24, slice 2 on every side: 1 px hairline round, 1 px bevel inside at the top and left, panel at 92 %
    im = Image.new("RGBA", (24, 24), PANEL + (235,)); d = ImageDraw.Draw(im); d.rectangle([0, 0, 23, 23], outline=HAIR + (255,))
    d.line([1, 1, 22, 1], fill=BEVEL + (255,)); d.line([1, 1, 1, 22], fill=BEVEL + (255,)); return im
def plate(k=8):  # 32x32, slice 8: radius 4, drawn at 8x and reduced (no stepped corner); hairline round, bevel inside at the top and left
    S = 32 * k; im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], 4 * k, fill=HAIR + (255,))
    d.rounded_rectangle([1 * k, 1 * k, S - 1 - 1 * k, S - 1 - 1 * k], 3 * k, fill=BEVEL + (255,))
    d.rounded_rectangle([2 * k, 2 * k, S - 1 - 1 * k, S - 1 - 1 * k], 3 * k, fill=BAR + (255,))
    return premul_resize(im, (32, 32))
def frame():     # 16x16, slice 2: the 1 px hairline frame (the picture's frame, a free place's outline), clear inside
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); ImageDraw.Draw(im).rectangle([0, 0, 15, 15], outline=HAIR + (255,)); return im
def contact(w=128, h=24, k=8):   # the soft contact shadow under a mibi: an ellipse in the house shadow at 110 alpha, blurred
    S = (w * k, h * k); m = Image.new("L", S, 0); ImageDraw.Draw(m).ellipse([12 * k, 7 * k, (w - 12) * k, (h - 7) * k], fill=110)
    m = m.filter(ImageFilter.GaussianBlur(3 * k)).resize((w, h), Image.LANCZOS); im = Image.new("RGBA", (w, h), SHADOW + (0,)); im.putalpha(m); return im
save(pane(), "sprites/closeup-pane-9slice-24x24"); save(plate(), "sprites/closeup-plate-9slice-32x32"); save(frame(), "sprites/closeup-hairline-9slice-16x16")
save(contact(), "sprites/closeup-contact-shadow-128x24"); save(contact(64, 16), "sprites/closeup-contact-shadow-64x16")
SLICE = {"closeup-pane-9slice-24x24": 2, "closeup-plate-9slice-32x32": 8, "closeup-hairline-9slice-16x16": 2}

# ---------- proof at 1x: the pane over a crop, plates, a stamp, a curl, the icon sheet's Stamp at 24 ----------
def nine(sp, w, h, s):
    out = Image.new("RGBA", (w, h)); W_, H_ = sp.size
    xs = [(0, s, 0, s), (s, W_ - s, s, w - s), (W_ - s, W_, w - s, w)]; ys = [(0, s, 0, s), (s, H_ - s, s, h - s), (H_ - s, H_, h - s, h)]
    for x0, x1, X0, X1 in xs:
        for y0, y1, Y0, Y1 in ys: out.paste(sp.crop((x0, y0, x1, y1)).resize((X1 - X0, Y1 - Y0), Image.NEAREST), (X0, Y0))
    return out
pf = Image.new("RGBA", (1024, 600), (26, 23, 37, 255))
room = Image.open(f"{OUT}/closeup-room-roots-576x424.png").convert("RGBA"); pf.alpha_composite(room, (16, 48)); pf.alpha_composite(nine(frame(), 576, 424, 2), (16, 48))
blur = room.resize((1024, 754)).filter(ImageFilter.GaussianBlur(14)).crop((0, 0, 400, 504)); pf.alpha_composite(blur, (608, 48)); pf.alpha_composite(nine(pane(), 400, 504, 2), (608, 48))
for i in range(3): pf.alpha_composite(nine(plate(), 120, 72, 8), (624 + 124 * i, 472))
pf.alpha_composite(Image.open(f"{OUT}/stamp/closeup-stamp-Y5H47VG18-96x96.png").convert("RGBA"), (624, 344))
pf.alpha_composite(Image.open(f"{OUT}/curl/closeup-curl-adult-S01-144x152.png").convert("RGBA"), (232, 252))
ic = f"{OUT}/icons"
if os.path.isdir(ic):
    for i, n in enumerate(("coat", "face", "movement", "shape", "stamp")): pf.alpha_composite(Image.open(f"{ic}/icon-{n}-24x24.png").convert("RGBA"), (628, 156 + 36 * i))
    for i, n in enumerate(("cross", "portrait", "manage")): pf.alpha_composite(Image.open(f"{ic}/icon-{n}-32x32.png").convert("RGBA"), (624 + 124 * i + 44, 480))
pf.convert("RGB").save(f"{OUT}/proof-closeup-parts-1x.png")
sheet = Image.new("RGBA", (16 + 152 * 8, 2 * 160 + 16), (60, 52, 44, 255))
for i, sp in enumerate([f"S{n:02d}" for n in range(1, 17)]):
    for j, st in enumerate(("adult", "juvenile")):
        p = f"{OUT}/curl/closeup-curl-{st}-{sp}-144x152.png"
        if os.path.exists(p): sheet.alpha_composite(Image.open(p).convert("RGBA"), (8 + 152 * (i % 8), 8 + 160 * (i // 8))) if st == "adult" else None
sheet.convert("RGB").save(f"{OUT}/proof-closeup-curls-adult-1x.png")
json.dump({"sprites": rec, "nine_slice": SLICE}, open(f"{OUT}/sprites.json", "w"), indent=1); print(len(rec))
