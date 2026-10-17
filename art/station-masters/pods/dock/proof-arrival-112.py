"""T-20261016-120: the arrival in place at 1x, redone for the spec's Amendment (T-20261016-112): who came home stands big on the bay's apron.
- arrival-in-place-1x.png, t = 2.2 s: the open bay (16, 48) and cargo-bay-apron-992x180 (16, 368) in place of the rack; the link light full;
  two crates in place (224 and 544, y 120), one with its glint; two coming home at the one-mibi-up-close size, 304 x 312, 1:1, at
  (192, 216) and (528, 216), feet 528, in front of the crates: the first stands (in at 1.6-1.9, its hop done by 2.075), the second is
  a third of the way through its 16-level dither (in at 2.1-2.4); the Probe group in the top-left corner (shields at (40, 68), pitch 20,
  "{n} mended, free"), the leaving group right-aligned to 984 at y 64; the ribbon.
- arrival-end-1x.png: the show's end (one cut): the mibis gone, the apron given way to the rack, the choice strip (92, 376, 840 x 160) over
  it, its two cards (Open the bay, focused; Later).
- arrival-before-after-1x.png: the old proof (T-20261016-105), then the two new frames, side by side at 1x.
Stand-ins (the build's): the ribbon, the corners' and the cards' words (typed in Inter), which mibis came and went (S01 and S03 home, S02
leaving), the cards' pictures (crate-open and crate-sealed cut at 96), the focus ring, the bottom line (the golden's).
usage: python3 -I dock/proof-arrival-112.py SLICES_DIR GOLDEN_CARGO_DIR SHIELD_16.png FONTS_DIR OLD_PROOF.png OUT_DIR"""
import sys, os, importlib.util, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, gold, shield_png, fonts, old_png, out = sys.argv[1:7]
L = lambda p: Image.open(p).convert("RGBA"); S = lambda n: L(os.path.join(sl, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
sp_ = importlib.util.spec_from_file_location("kit", "device-plate/make-device-plate.py"); kit = importlib.util.module_from_spec(sp_); sp_.loader.exec_module(kit)
op = np.asarray(Image.open(os.path.join(gold, "cargo-opening-500.png")).convert("RGB"))
FILL, EDGE = tuple(int(v) for v in op[76, 430]), tuple(int(v) for v in op[56, 512])
BONE, MIST, FOCUS = (0xf1, 0xeb, 0xdf), (0x8d, 0x8a, 0xa6), (0xff, 0xb4, 0x4a)
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16
def dither(im, level):                                                     # the frame's 16-level dither, in place: level/16 of the pixels
    a = np.asarray(im).copy(); h, w = a.shape[:2]; m = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] < level / 16
    a[..., 3] = np.where(m, a[..., 3], 0); return Image.fromarray(a, "RGBA")
def base(show=True):
    f = L(os.path.join(gold, "cargo-bay.png")); f.alpha_composite(S("cargo-bay-992x320"), (16, 48))
    if show: f.alpha_composite(S("cargo-bay-apron-992x180"), (16, 368)); f.alpha_composite(S("cargo-link-light-976x48"), (24, 264))
    else: f.alpha_composite(S("cargo-rack-992x168"), (16, 384))
    for x in (224, 544): f.alpha_composite(S("crate-sealed-256x176"), (x, 120))
    return f
def show_frame():
    f = base(True); f.alpha_composite(S("glint-star-12x12"), (544 + 232, 128))
    f.alpha_composite(S("mibi-adult-S01-304x312"), (192, 216)); f.alpha_composite(dither(S("mibi-adult-S03-304x312"), 5), (528, 216))
    dr = ImageDraw.Draw(f)
    t = "The Companion is home"; fz = F("Medium", 20); w = max(160, -(-int(dr.textlength(t, font=fz) + 32) // 8) * 8); x = 512 - w // 2
    dr.rectangle([x, 56, x + w - 1, 95], fill=FILL, outline=EDGE); dr.text((512, 56 + 27), t, font=fz, fill=BONE, anchor="ms")
    sh = L(shield_png)
    for i in range(3): f.alpha_composite(sh, (40 + 20 * i, 68))
    dr = ImageDraw.Draw(f); dr.text((40 + 60 + 4, 64), "one mended, free", font=F("Regular", 16), fill=MIST)
    face = S("face-S02-24"); mo = S("mark-out-16"); xr = 984 - 24; f.alpha_composite(face, (xr, 64)); f.alpha_composite(mo, (xr - 8 - 16, 68))
    return f
def end_frame():
    f = base(False); f.alpha_composite(kit.plate(840, 160, bezel=6, radius=12), (92, 376)); dr = ImageDraw.Draw(f)
    pics = {"open": S("crate-open-432x272").crop((80, 0, 352, 272)).resize((96, 96), Image.LANCZOS),
            "sealed": S("crate-sealed-256x176").crop((40, 0, 216, 176)).resize((96, 96), Image.LANCZOS)}
    for i, (pic, name, line) in enumerate((("open", "Open the bay", "two crates to the rack"), ("sealed", "Later", "they wait while docked"))):
        x, y = 108 + i * (396 + 16), 392
        f.alpha_composite(kit.plate(396, 128, well=True, shown=(i == 0), radius=10), (x, y)); f.alpha_composite(pics[pic], (x + 16, y + 16))
        dr = ImageDraw.Draw(f); dr.text((x + 128, y + 16), name, font=F("Medium", 20), fill=BONE); dr.text((x + 128, y + 80), line, font=F("Regular", 16), fill=MIST)
        if i == 0: dr.rounded_rectangle([x - 4, y - 4, x + 396 + 3, y + 128 + 3], radius=14, outline=FOCUS, width=2)
    return f
def label(f, s, y=372):
    dr = ImageDraw.Draw(f); lb = F("Medium", 16); dr.rectangle([8, y, 16 + dr.textlength(s, font=lb), y + 24], fill=(0, 0, 0)); dr.text((12, y + 3), s, font=lb, fill=(255, 255, 255)); return f
os.makedirs(out, exist_ok=True)
a = label(show_frame(), "PROOF T-20261016-120: the arrival at t 2.2 s (who came home stands big on the apron), 1x. Words: stand-ins", 544).convert("RGB")
b = label(end_frame(), "PROOF T-20261016-120: the show's end (the rack, the choice strip), 1x. Words, pictures, ring: stand-ins", 544).convert("RGB")
a.save(os.path.join(out, "arrival-in-place-1x.png")); b.save(os.path.join(out, "arrival-end-1x.png"))
old = Image.open(old_png).convert("RGB"); sh = Image.new("RGB", (3 * 1024 + 16, 600), (0, 0, 0))
for i, im in enumerate((old, a, b)): sh.paste(im, (i * (1024 + 8), 0))
sh.save(os.path.join(out, "arrival-before-after-1x.png")); print("written")
