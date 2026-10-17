"""T-20261016-128 proofs at 1x, labelled inside: pods-overview and a chapter page with the stages re-cut (the paper tag gone), and the
Cargo report with the title on the new device plate. Each is the station-gate golden with only the changed pixels replaced: on the Pods
screens, a stage pixel is swapped where the golden still shows the old stage there (nothing is drawn over it); on the report, the plate.
Stand-in: the report's title typed in Inter 20 (500), ink, at +12 inside the plate, centred on its height.
usage: python3 -I stage-recut/t128/proof.py OLD_STAGES_DIR SLICES_DIR GOLDEN_DIR FONTS OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
old, sl, gold, fonts, out = sys.argv[1:6]; os.makedirs(out, exist_ok=True)
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
def label(f, s, y=540):
    d = ImageDraw.Draw(f); lb = F("Medium", 16); d.rectangle([8, y, 16 + d.textlength(s, font=lb), y + 24], fill=(0, 0, 0)); d.text((12, y + 3), s, font=lb, fill=(255, 255, 255))
for stage, gname, outname in (("room-bench-stage-overview", "pods-overview-identified-pod-focused", "pods-overview-tag-cut-1x.png"),
                              ("room-bench-stage-chapter", "pods-chapter-page", "pods-chapter-page-tag-cut-1x.png")):
    g = np.asarray(Image.open(os.path.join(gold, "pods", gname + ".png")).convert("RGB")).copy()
    o = np.asarray(Image.open(os.path.join(old, stage + ".png")).convert("RGB")); n = np.asarray(Image.open(os.path.join(sl, stage + ".png")).convert("RGB"))
    win = g[40:562]; same = (np.abs(win.astype(int) - o.astype(int)).max(2) <= 2) & (np.abs(n.astype(int) - o.astype(int)).max(2) > 0)
    win[same] = n[same]; g[40:562] = win
    f = Image.fromarray(g); label(f, f"PROOF T-20261016-128: {gname}, the stage's paper tag cut, 1x ({int(same.sum())} px changed)"); f.save(os.path.join(out, outname))
g = Image.open(os.path.join(gold, "cargo", "cargo-report.png")).convert("RGBA")
d = ImageDraw.Draw(g); bg = g.getpixel((240, 70)); d.rectangle([244, 76, 244 + 215, 76 + 31], fill=bg)
g.alpha_composite(Image.open(os.path.join(sl, "label-plate-cream-216x32.png")).convert("RGBA"), (244, 76))
d = ImageDraw.Draw(g); d.text((244 + 12, 76 + 16), "Home from the field", font=F("Medium", 20), fill=(0x1a, 0x17, 0x25), anchor="lm")
label(g, "PROOF T-20261016-128: the Cargo report, its title on the device plate (label-plate-cream-216x32 re-cut), 1x. Title: stand-in")
g.convert("RGB").save(os.path.join(out, "cargo-report-device-plate-1x.png"))
c = g.crop((232, 64, 480, 120)); c.resize((c.width * 3, c.height * 3), Image.NEAREST).convert("RGB").save(os.path.join(out, "cargo-report-device-plate-3x.png"))
print("proofs written")
