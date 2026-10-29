"""The reading instrument's layers at 1x, cut and derived from the painted pick (source/raw/reading-instrument/) and the Loika stand layers.
usage: python3 -I tools/readinstrumentlayers.py   -> source/work/reading-instrument/layers/*.png (and a proof sheet of each on the ground).
  ground-1x.png       1024x600  the instrument: housing, amber rim, glowing deep glass; its glass interior fitted to the game's glass rect 20,50,984,500
  helix-turn.png      64x(2 lenses)  one full turn of the lit helix, white with alpha = light, crossing to crossing, seamless top to bottom (code tints and stacks it)
  rings-512.png       512x512   the scope ring set, white with alpha = light (code tints it amber or the chapter colour and scales it)
  scan-<sp>.png       the specimen as scan light: contour lines, edge light and scanlines, white with alpha (code tints it and masks it to the unread parts)
  rim-<sp>.png        the inner rim light of the silhouette, white with alpha (code adds it over painted parts in the display colour)
  mask-<sp>-<part>.png  the part masks (body alpha inside a soft window), white with alpha; line-<sp>-<part>.png their outlines
  look-<id>.png       socket pictures (crops of the painted stand layers)."""
import os
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/reading-instrument"); OUT = os.path.join(ROOT, "source/work/reading-instrument/layers"); os.makedirs(OUT, exist_ok=True)
STANDS = "/home/user/miniaturebeasts/prototypes/ui/assets/stands/"
PODS = "/home/user/miniaturebeasts/prototypes/ui/assets/masters/pods/"
def L(p): return Image.open(p).convert("RGBA")
def white(alpha):
    a = np.clip(alpha, 0, 1); out = np.zeros(a.shape + (4,), np.uint8); out[..., :3] = 255; out[..., 3] = (a * 255).round(); return Image.fromarray(out, "RGBA")
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255

# ---- ground: the painted empty instrument, its glass rect fitted to the game's glass (20,50,984,500) ----
g = Image.open(os.path.join(RAW, "layer-ground-open.jpg")).convert("RGB"); W, H = g.size
gx0, gy0, gx1, gy1 = 0.047 * W, 0.058 * H, 0.952 * W, 0.942 * H                 # the painted amber rim, measured on the raw
sx, sy = 984 / (gx1 - gx0), 500 / (gy1 - gy0)
big = g.resize((round(W * sx), round(H * sy)), Image.LANCZOS)
ox, oy = round(gx0 * sx) - 20, round(gy0 * sy) - 50
ground = big.crop((ox, oy, ox + 1024, oy + 600))
ga = np.asarray(ground).astype(float) / 255
ga = ga * 0.86                                                                   # a touch deeper so 13 px cream words hold on any part of the glass
Image.fromarray((np.clip(ga, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, "ground-1x.png"))

# ---- helix: one lens (crossing to crossing) straightened, then the lens and its mirror = one seamless turn ----
hx = np.asarray(Image.open(os.path.join(RAW, "layer-helix.jpg")).convert("L")).astype(float) / 255
y0, y1, c0, c1 = 719, 1889, 687.0, 830.5; C = 766
lens = np.zeros((y1 - y0, hx.shape[1]))
for j, y in enumerate(range(y0, y1)):
    sh = int(round(C - (c0 + (c1 - c0) * j / (y1 - y0)))); lens[j] = np.roll(hx[y], sh)
lens = lens[:, C - 560:C + 560]                                                  # the ribbons' full width plus bloom
lens = np.clip((lens - 0.02) / 0.98, 0, 1)                                       # the black ground to zero
turn = np.vstack([lens, lens[:, ::-1]])
tw = 64; th = round(turn.shape[0] * tw / turn.shape[1])
t = Image.fromarray((turn * 255).astype(np.uint8)).resize((tw, th), Image.LANCZOS)
white(np.asarray(t).astype(float) / 255).save(os.path.join(OUT, "helix-turn.png"))
t2 = Image.fromarray((turn * 255).astype(np.uint8)).resize((tw * 2, th * 2), Image.LANCZOS)
white(np.asarray(t2).astype(float) / 255).save(os.path.join(OUT, "helix-turn@2x.png"))
print("helix turn", tw, th)

# ---- rings ----
r = Image.open(os.path.join(RAW, "layer-rings.jpg")).convert("L"); rw = r.size[0]
cut = r.crop((int(rw * 0.07), int(rw * 0.07), int(rw * 0.93), int(rw * 0.93))).resize((512, 512), Image.LANCZOS)
ra = np.clip((np.asarray(cut).astype(float) / 255 - 0.03) / 0.97, 0, 1)
white(ra).save(os.path.join(OUT, "rings-512.png"))

# ---- the specimen: scan light, rim light, part masks ----
def scan_layers(img, name, contour=11):
    a = np.asarray(img).astype(float) / 255; A = a[..., 3]; lum = (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2])
    h, w = A.shape
    lum_s = blur(lum * (A > 0.5), 1.2)
    band = (lum_s * contour) % 1.0; iso = np.clip(1 - np.abs(band - 0.5) * 12, 0, 1) * (A > 0.6) * 0.6  # isolines of the form's own shading
    gy, gx = np.gradient(blur(lum, 0.7)); feat = np.clip(np.hypot(gx, gy) * 9 - 0.15, 0, 1) * (A > 0.6)   # the features: eyes, muzzle, toes, patches
    iso = np.maximum(iso, feat)
    edge = np.clip(A - blur(A, 2.2), 0, 1) * 2.6                                                    # the silhouette edge, inside
    halo = blur(A, 5) * (1 - A) * 0.5                                                               # light just outside the edge
    lines = np.array([[0.6 if (j % 3) else 1.0 for _ in range(w)] for j in range(h)])               # the display's scanlines
    fill = A * (0.05 + 0.14 * lum_s)
    scan = np.clip((fill + iso * 0.62 + edge) * lines + halo, 0, 1)
    white(scan).save(os.path.join(OUT, f"scan-{name}.png"))
    rim = np.clip(A - blur(A, 3.5), 0, 1) * 2.0 * A
    white(rim).save(os.path.join(OUT, f"rim-{name}.png"))
    return A
paint = L(STANDS + "S01-adult-304x312-base-charcoal-and-russet.png")
for n in ["patches", "crest"]: paint = Image.alpha_composite(paint, L(STANDS + f"S01-adult-304x312-{n}.png"))
plain = L(STANDS + "S01-adult-304x312-base-charcoal-and-russet.png")
paint.save(os.path.join(OUT, "loika-paint.png")); plain.save(os.path.join(OUT, "loika-plain.png"))
scan_layers(plain, "loika")
A_paint = np.asarray(paint).astype(float)[..., 3] / 255
jj, ii = np.mgrid[0:312, 0:304]
face_win = 1 - np.clip((np.hypot((ii - 118) / 104, (jj - 112) / 98) - 0.96) / 0.08, 0, 1)
white(A_paint * face_win).save(os.path.join(OUT, "mask-loika-face.png"))
white(A_paint * (1 - face_win)).save(os.path.join(OUT, "mask-loika-coat.png"))
A_plain = np.asarray(plain).astype(float)[..., 3] / 255
white(A_plain * face_win).save(os.path.join(OUT, "mask-loika-head.png"))          # the head before its read: bare (the crest is not known yet)
white(face_win).save(os.path.join(OUT, "win-loika-face.png"))
# the Tuikis: no stand yet, the bud silhouette at 2.6x
bud = L(PODS + "bud-shape-S03-112x112.png").resize((291, 291), Image.LANCZOS)
bud_a = np.asarray(bud).astype(float)[..., 3] / 255
sil = np.zeros((291, 291, 4), np.uint8); sil[..., 0] = 120; sil[..., 1] = 100; sil[..., 2] = 90; sil[..., 3] = (bud_a * 255).astype(np.uint8)
scan_layers(Image.fromarray(sil, "RGBA"), "tuikis", contour=4)
tj, ti = np.mgrid[0:291, 0:291]
shape_win = 1 - np.clip((np.hypot((ti - 160) / 100, (tj - 125) / 80) - 0.96) / 0.08, 0, 1)
white((bud_a > 0.5) * shape_win).save(os.path.join(OUT, "mask-tuikis-shape.png"))
white((bud_a > 0.5) * (tj < 120) * (ti < 150)).save(os.path.join(OUT, "mask-tuikis-face.png"))
white((bud_a > 0.5) * (tj >= 120) * (tj < 230) * (ti < 220)).save(os.path.join(OUT, "mask-tuikis-coat.png"))

# ---- part outlines: the gradient of each part mask, a line of about 1.5 px (code tints it with the chapter colour and adds a soft glow) ----
for n in os.listdir(OUT):
    if n.startswith("mask-"):
        m = np.asarray(Image.open(os.path.join(OUT, n))).astype(float)[..., 3] / 255; m = blur(m, 0.8)
        gy, gx = np.gradient(m); white(np.clip(np.hypot(gx, gy) * 3.2, 0, 1)).save(os.path.join(OUT, n.replace("mask-", "line-")))

# ---- socket pictures: crops of the stand layers (as round six) ----
ash = L(STANDS + "S01-adult-304x312-base-ash.png"); ash = Image.alpha_composite(ash, L(STANDS + "S01-adult-304x312-patches.png"))
stripes = Image.alpha_composite(plain.copy(), L(STANDS + "S01-adult-304x312-stripes.png"))
LOOKS = {"colour": (paint, (135, 165, 100, 100)), "markings": (paint, (190, 135, 95, 95)), "crown": (paint, (52, 12, 150, 100)), "eyes": (paint, (60, 108, 110, 90)),
         "ash": (ash, (135, 165, 100, 100)), "stripes": (stripes, (190, 125, 95, 95)), "bare": (plain, (52, 42, 150, 100))}
for k, (img, (x, y, w, h)) in LOOKS.items():
    s = min(w, h); cx, cy = x + w / 2, y + h / 2
    img.crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2))).resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, f"look-{k}.png"))
print("layers in", OUT)
