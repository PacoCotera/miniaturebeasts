"""T-20261016-146 proof at 1x, labelled: the Fit the upgrade? panel over the bench, with the T-47/T-70 kit and composite rule (glow, stage,
contact shadow, the picture's feet on y + 168, the pool's light over it): Fit it (focused) shows the re-cut bench-part-t2-fitted-128, Not now
shows bench-part-t2-dim-128. Stand-ins: the words, the cost icons (cropped from the Create golden's top bar), the ring; and the old fitted
master beside it for comparison.
usage: python3 -I bench/t146/proof.py SLICES BENCH_SLICES GOLDEN_DIR FONTS OLD_FITTED OUT"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, bsl, gold, fonts, oldp, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA"); S = lambda n: Lo(os.path.join(sl, n + ".png")); B = lambda n: Lo(os.path.join(bsl, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
BONE, MIST, FOCUS = (0xf1, 0xeb, 0xdf), (0x8d, 0x8a, 0xa6), (0xff, 0xb4, 0x4a)
cap = np.asarray(Image.open(os.path.join(gold, "create", "create-shape.png")).convert("RGB")).astype(float); bg = np.median(cap[4:36, 600:640].reshape(-1, 3), 0)
def icon(x):
    c = cap[12:28, x:x + 16]; d = np.abs(c - bg).max(2); a = np.clip((d - 10) / 40, 0, 1)
    return Image.fromarray(np.dstack([c, a * 255]).astype(np.uint8), "RGBA")
ENERGY, DATA = icon(443), icon(497)
def panel(fitted):
    f = Lo(os.path.join(gold, "bench", "bench.png")); f.alpha_composite(S("panel-veil-1024x522"), (0, 40)); f.alpha_composite(S("panel-housing-840x440"), (92, 80))
    d = ImageDraw.Draw(f); t = "Fit the upgrade?"; d.text((512 - d.textlength(t, font=F("SemiBold", 28)) / 2, 96), t, font=F("SemiBold", 28), fill=BONE)
    for i, (pic, name, costs, line) in enumerate(((fitted, "Fit it", True, "reaches further"), (B("bench-part-t2-dim-128"), "Not now", False, None))):
        x, y, w = 124 + i * 396, 152, 380
        f.alpha_composite(S(f"panel-card-{w}x288{'-focused' if i == 0 else ''}"), (x, y)); f.alpha_composite(S("panel-glow-348x160"), (x + 16, y + 16))
        f.alpha_composite(S("panel-stage-348x48"), (x + 16, y + 136))
        pa = np.asarray(pic)[..., 3]; rows = np.nonzero((pa >= 128).any(1))[0]; cols = np.nonzero((pa >= 128).any(0))[0]
        px = x + 16 + (348 - pic.width) // 2; py = y + 168 - rows.max()
        cs = S("panel-contact-shadow-128x16").resize((cols.max() - cols.min() + 17, 16), Image.LANCZOS); f.alpha_composite(cs, (px + cols.min() - 8, y + 160))
        f.alpha_composite(pic, (px, py)); f.alpha_composite(S("panel-light-348x160"), (x + 16, y + 16))
        d = ImageDraw.Draw(f); d.text((x + 16, y + 184), name, font=F("Medium", 20), fill=BONE)
        if costs:
            cx = x + 16
            for ic, fig in ((ENERGY, "12"), (DATA, "4")):
                gw = 20 + int(d.textlength(fig, font=F("Regular", 16))); chw = gw + 16; ch = S("panel-chip-40x20"); chip = Image.new("RGBA", (chw, 20))
                chip.paste(ch.crop((0, 0, 10, 20)), (0, 0)); chip.paste(ch.crop((10, 0, 30, 20)).resize((chw - 20, 20)), (10, 0)); chip.paste(ch.crop((30, 0, 40, 20)), (chw - 10, 0))
                f.alpha_composite(chip, (cx, y + 216)); f.alpha_composite(ic, (cx + 8, y + 218)); d = ImageDraw.Draw(f); d.text((cx + 28, y + 216), fig, font=F("Regular", 16), fill=FOCUS); cx += chw + 8
        if line: d.text((x + 16, y + 244), line, font=F("Regular", 16), fill=MIST)
        if i == 0: d.rounded_rectangle([x - 4, y - 4, x + w + 3, y + 291], radius=14, outline=FOCUS, width=2)
    return f
def label(f, s, y=540):
    d = ImageDraw.Draw(f); lb = F("Medium", 16); d.rectangle([8, y, 16 + d.textlength(s, font=lb), y + 24], fill=(0, 0, 0)); d.text((12, y + 3), s, font=lb, fill=(255, 255, 255))
a = panel(B("bench-part-t2-fitted-128")); label(a, "PROOF T-20261016-146: Fit the upgrade?, the fitted part re-cut (left) beside the dim part, 1x. Words, icons, ring: stand-ins")
a.convert("RGB").save(os.path.join(out, "bench-panel-upgrade-1x.png"))
b = panel(Lo(oldp)); label(b, "BEFORE (T-20261016-53): the fitted part in its dark socket box on a slab")
sh = Image.new("RGB", (2 * 1024 + 8, 600)); sh.paste(b.convert("RGB"), (0, 0)); sh.paste(a.convert("RGB"), (1032, 0)); sh.save(os.path.join(out, "bench-panel-upgrade-before-after-1x.png"))
print("written")
