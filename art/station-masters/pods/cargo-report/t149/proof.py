"""T-20261016-149 proof at 1x, labelled: the report's longest case (h 208 at (232, 104)): three crates (one with 11 pods: 7 icons and
"+4"), their reach (1, 2 and 3 of 4 pips lit mint), the gathered materials, the Probe's mended plates with the price, the goal line and a
read while you wait, on the report door (cargo-bay-shut-report-976x304), per the spec's amendment rects. Stand-ins (the build's): the figures,
the goal words (Inter 16), the material and Probe icons (cropped from the Cargo golden's top bar), the pips and arrow (palette geometry).
usage: python3 -I cargo-report/t149/proof.py SLICES NEW_DIR GOLDEN_DIR ICONS_DIR FONTS OUT"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, nd_, gold, icd, fonts, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA"); S = lambda n: Lo(os.path.join(nd_, n + ".png")) if os.path.exists(os.path.join(nd_, n + ".png")) else Lo(os.path.join(sl, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
BONE, MINT, NIGHT = (0xf1, 0xeb, 0xdf), (0xad, 0xf6, 0xe0), (0x29, 0x25, 0x3a)
g = Lo(os.path.join(gold, "cargo", "cargo-report.png")); cap = np.asarray(g.convert("RGB")).astype(float); bg = np.median(cap[4:36, 300:340].reshape(-1, 3), 0)
def icon(x):
    c = cap[10:26, x:x + 16]; d = np.abs(c - bg).max(2); a = np.clip((d - 10) / 40, 0, 1)
    return Image.fromarray(np.dstack([c, a * 255]).astype(np.uint8), "RGBA")
EN, DA, ES = icon(428), icon(491), icon(555)
pod = Lo(os.path.join(icd, "icon-pod-16.png")); plate = Lo(os.path.join(icd, "icon-shield-16.png"))
f = g.copy(); f.alpha_composite(S("cargo-bay-shut-report-976x304"), (24, 56))
X, Y, H = 232, 104, 208
f.alpha_composite(S("cargo-report-plate-560x208"), (X, Y)); d = ImageDraw.Draw(f)
for k, (npods, reach) in enumerate(((3, 1), (3, 2), (11, 3))):
    tx, ty = X + 16 + 184 * k, Y + 16
    f.alpha_composite(S("cargo-crate-64x64"), (tx, ty))
    shown = npods if npods <= 8 else 7
    for i in range(shown): f.alpha_composite(pod, (tx + 72 + 20 * (i % 4), ty + 8 + 20 * (i // 4)))
    d = ImageDraw.Draw(f)
    if npods > 8: d.text((tx + 72 + 20 * 3, ty + 8 + 20 + 8), f"+{npods - 7}", font=F("Regular", 16), fill=BONE, anchor="lm")
    f.alpha_composite(S("icon-map-14x12"), (tx + 72, ty + 48)); d = ImageDraw.Draw(f)
    for p in range(4): d.rectangle([tx + 92 + 14 * p, ty + 50, tx + 92 + 14 * p + 11, ty + 57], fill=MINT if p < reach else NIGHT)
for m, (ic, fig) in enumerate(((EN, "+15"), (DA, "+18"), (ES, "+24"))):
    f.alpha_composite(ic, (X + 16 + 72 * m, Y + 100)); d = ImageDraw.Draw(f); d.text((X + 16 + 72 * m + 22, Y + 108), fig, font=F("Regular", 16), fill=BONE, anchor="lm")
for i in range(2): f.alpha_composite(plate, (X + 320 + 20 * i, Y + 100))
f.alpha_composite(EN, (X + 320 + 44, Y + 100)); d = ImageDraw.Draw(f); d.text((X + 320 + 64, Y + 108), "2", font=F("Regular", 16), fill=BONE, anchor="lm")
d.text((X + 16, Y + 148), "→", font=F("Regular", 16), fill=BONE, anchor="lm"); d.text((X + 40, Y + 148), "fit the Probe upgrade", font=F("Regular", 16), fill=BONE, anchor="lm")
f.alpha_composite(pod, (X + 40, Y + 176)); f.alpha_composite(S("rail-emblem-face-unread-24x24"), (X + 64, Y + 172)); f.alpha_composite(DA, (X + 96, Y + 176))
d = ImageDraw.Draw(f); d.text((X + 116, Y + 184), "2", font=F("Regular", 16), fill=BONE, anchor="lm")
lb = F("Medium", 16); s = "PROOF T-20261016-149: the Cargo report, picture-led, longest case (h 208), 1x. Figures, goal words, icons: stand-ins"
d.rectangle([8, 540, 16 + d.textlength(s, font=lb), 564], fill=(0, 0, 0)); d.text((12, 543), s, font=lb, fill=(255, 255, 255))
f.convert("RGB").save(os.path.join(out, "cargo-report-picture-led-1x.png"))
c = f.crop((X, Y, X + 560, Y + 96)); c.resize((c.width * 2, c.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(out, "cargo-report-crates-2x.png"))
print("written")
