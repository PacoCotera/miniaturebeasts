"""T-20261016-97: the arrival in place at 1x (specs/station-dock-arrival-spec.md §1), labelled inside the image.
The moment: t = 1.5 s. The link light is full (revealed 0.5-0.9; it holds), both crates are in their places (2: x 224 and 544, y 120), and
the home band comes in. The band shows only from 1.5, so this is the first moment the light and the band are on screen together.
Over the Cargo golden (its top bar, rack and bottom line, station-gate): the open bay cargo-bay-992x320 at (16, 48); cargo-link-light-976x48
at (24, 264); the crates (crate-sealed-256x176); the ribbon; the home band (40, 312, 944, 40): the Probe's shields at x 48, pitch 20, y 324,
with "one mended, free"; mark-home-16 at (512, 324) and the faces at y 320, pitch 32; then, 24 on, mark-out-16 and its face.
Stand-ins (the build's): the ribbon (Cargo's ribbon style, sampled from the cargo-opening-500 golden; the words typed in Inter 20), the band's
words, which mibis came and went, the bottom line (the golden's). Also written: the light alone on the empty open bay, and a 2x crop.
usage: python3 -I dock/proof-arrival.py SLICES_DIR GOLDEN_CARGO_DIR SHIELD_16.png FONTS_DIR OUT_DIR"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, gold, shield_png, fonts, out = sys.argv[1:6]
L = lambda p: Image.open(p).convert("RGBA"); S = lambda n: L(os.path.join(sl, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
op = np.asarray(Image.open(os.path.join(gold, "cargo-opening-500.png")).convert("RGB"))
FILL, EDGE = tuple(int(v) for v in op[76, 430]), tuple(int(v) for v in op[56, 512])
BONE, MIST = (0xf1, 0xeb, 0xdf), (0x8d, 0x8a, 0xa6)
def frame(crates=True, band=True, ribbon=True):
    f = L(os.path.join(gold, "cargo-bay.png")); f.alpha_composite(S("cargo-bay-992x320"), (16, 48))
    f.alpha_composite(S("cargo-link-light-976x48"), (24, 264))
    if crates:
        for x in (224, 544): f.alpha_composite(S("crate-sealed-256x176"), (x, 120))
    dr = ImageDraw.Draw(f)
    if ribbon:
        t = "The Companion is home"; fz = F("Medium", 20); w = max(160, -(-int(dr.textlength(t, font=fz) + 32) // 8) * 8); x = 512 - w // 2
        dr.rectangle([x, 56, x + w - 1, 95], fill=FILL, outline=EDGE); dr.text((512, 56 + 27), t, font=fz, fill=BONE, anchor="ms")
    if band:
        sh = L(shield_png)
        for i in range(3): f.alpha_composite(sh, (48 + 20 * i, 324))
        dr = ImageDraw.Draw(f); dr.text((48 + 60 + 4, 320), "one mended, free", font=F("Regular", 16), fill=MIST)
        x = 512; f.alpha_composite(S("mark-home-16"), (x, 324)); x += 24
        for sp in ("S01", "S03"): f.alpha_composite(S(f"face-{sp}-24"), (x, 320)); x += 32
        x += 24 - 8; f.alpha_composite(S("mark-out-16"), (x, 324)); x += 24
        f.alpha_composite(S("face-S02-24"), (x, 320))
    return f
def label(f, s):
    dr = ImageDraw.Draw(f); lb = F("Medium", 16); dr.rectangle([8, 372, 16 + dr.textlength(s, font=lb), 396], fill=(0, 0, 0)); dr.text((12, 375), s, font=lb, fill=(255, 255, 255)); return f
os.makedirs(out, exist_ok=True)
a = frame(); a2 = a.crop((16, 232, 1008, 360)); a2.resize((a2.width * 2, a2.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(out, "arrival-floor-2x.png"))
label(a, "PROOF T-20261016-105: the arrival in place at t 1.5 s (light full, on the floor only; crates in; home band), 1x. Ribbon, words: stand-ins").convert("RGB").save(os.path.join(out, "arrival-in-place-1x.png"))
label(frame(crates=False, band=False, ribbon=False), "PROOF T-20261016-105: the link light alone on the open bay, clipped to the floor, 1x").convert("RGB").save(os.path.join(out, "link-light-on-open-bay-1x.png"))
print("written; ribbon fill", FILL, "edge", EDGE)
