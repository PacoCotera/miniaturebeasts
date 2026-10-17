"""T-20261016-162 proof at 1x, labelled: Fit the upgrade? over the bench, by the decision panel kit (T-47, T-70). In each card's picture area
(16, 16, w - 32 x 160): the Probe at 128 x 160 at the left, a gap of 16, the reach map at 160 x 160, centred (spec §1.6, T-159). Fit it
(focused): tier 2 and its lit ring; Not now: tier 1 and its unlit ring; neither dimmed. Stand-ins: the words, the cost icons (the golden's top
bar), the deep dial's icon (bench-deep-t2-40), the ring.
usage: python3 -I bench/t162/proof.py SLICES BENCH_SLICES NEW GOLDEN FONTS OUT"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, bsl, nd_, gold, fonts, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA"); S = lambda n: Lo(os.path.join(sl, n + ".png")); B = lambda n: Lo(os.path.join(bsl, n + ".png")); N = lambda n: Lo(os.path.join(nd_, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
BONE, MIST, FOCUS = (0xf1, 0xeb, 0xdf), (0x8d, 0x8a, 0xa6), (0xff, 0xb4, 0x4a)
cap = np.asarray(Image.open(os.path.join(gold, "create", "create-shape.png")).convert("RGB")).astype(float); bg = np.median(cap[4:36, 600:640].reshape(-1, 3), 0)
def icon(x):
    c = cap[12:28, x:x + 16]; d = np.abs(c - bg).max(2); a = np.clip((d - 10) / 40, 0, 1)
    return Image.fromarray(np.dstack([c, a * 255]).astype(np.uint8), "RGBA")
EN, DA = icon(443), icon(497)
f = Lo(os.path.join(gold, "bench", "bench.png")); f.alpha_composite(S("panel-veil-1024x522"), (0, 40)); f.alpha_composite(S("panel-housing-840x440"), (92, 80))
d = ImageDraw.Draw(f); t = "Fit the upgrade?"; d.text((512 - d.textlength(t, font=F("SemiBold", 28)) / 2, 96), t, font=F("SemiBold", 28), fill=BONE)
for i, (probe, reach, name, costs, line) in enumerate((("bench-probe-t2-card-128x160", "bench-reach-t2-160", "Fit it", True, "reaches further"),
                                                         ("bench-probe-t1-card-128x160", "bench-reach-t1-160", "Not now", False, None))):
    x, y, w = 124 + i * 396, 152, 380
    f.alpha_composite(S(f"panel-card-{w}x288{'-focused' if i == 0 else ''}"), (x, y)); f.alpha_composite(S("panel-glow-348x160"), (x + 16, y + 16))
    ox = x + 16 + (348 - 304) // 2
    f.alpha_composite(N(probe), (ox, y + 16)); f.alpha_composite(N(reach), (ox + 128 + 16, y + 16))
    f.alpha_composite(S("panel-light-348x160"), (x + 16, y + 16))
    d = ImageDraw.Draw(f); d.text((x + 16, y + 184), name, font=F("Medium", 20), fill=BONE)
    if costs:
        cx = x + 16
        for ic, fig in ((EN, "12"), (DA, "4")):
            chw = 36 + int(d.textlength(fig, font=F("Regular", 16))); ch = S("panel-chip-40x20"); chip = Image.new("RGBA", (chw, 20))
            chip.paste(ch.crop((0, 0, 10, 20)), (0, 0)); chip.paste(ch.crop((10, 0, 30, 20)).resize((chw - 20, 20)), (10, 0)); chip.paste(ch.crop((30, 0, 40, 20)), (chw - 10, 0))
            f.alpha_composite(chip, (cx, y + 216)); f.alpha_composite(ic, (cx + 8, y + 218)); d = ImageDraw.Draw(f); d.text((cx + 28, y + 216), fig, font=F("Regular", 16), fill=FOCUS); cx += chw + 8
        dd = B("bench-deep-t2-40").resize((20, 20), Image.LANCZOS); f.alpha_composite(dd, (x + w - 16 - 20, y + 216))   # the deep dial's icon (stand-in size)
    if line: d = ImageDraw.Draw(f); d.text((x + 16, y + 244), line, font=F("Regular", 16), fill=MIST)
    if i == 0: d = ImageDraw.Draw(f); d.rounded_rectangle([x - 4, y - 4, x + w + 3, y + 291], radius=14, outline=FOCUS, width=2)
d = ImageDraw.Draw(f); lb = F("Medium", 16); s = "PROOF T-20261016-162: Fit the upgrade?, the Probe at tier 2 against tier 1, with their reach, 1x. Words, icons, ring: stand-ins"
d.rectangle([8, 540, 16 + d.textlength(s, font=lb), 564], fill=(0, 0, 0)); d.text((12, 543), s, font=lb, fill=(255, 255, 255))
f.convert("RGB").save(os.path.join(out, "bench-panel-upgrade-1x.png"))
c = f.crop((124, 152, 900, 340)); c.resize((c.width * 2, c.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(out, "bench-panel-upgrade-cards-2x.png"))
print("written")
