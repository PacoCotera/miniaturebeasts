"""T-20261016-47 proofs: the Grow it panel (arrival mode) over Create and the Return panel over the Vivarium up close (Habitat), at 1x,
with the panel kit at the spec's rects (specs/station-decision-panel-spec.md §1.2, §1.3, §1.6), each labelled inside the image.
Stand-ins (the build's): the words (typed here in Inter at the spec's sizes and roles: title 28/600 `bone`, name 20/500 `bone`, costs `focus`,
line 16 `mist`, a loss line `amber`); the 16 px material icons (cropped from the golden's own top bar); the focus ring (the frame's, drawn here
as a 2 px `focus` rounded rect 4 px out). The pictures are placed 1:1 by T-20261016-70's rule: the glow (or, for Return it, the wild
scene) under, the stage, the contact shadow stretched to the feet's span plus 16, the picture with its lowest opaque row on y + 168, then
the pool's light over. The costs sit on panel-chip-40x20, nine-sliced.
usage: python3 -I decision-panel/proof.py NEW_DIR SLICES_DIR CREATE.png HABITAT.png FONTS_DIR OUT_DIR"""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
nd_, sl, create_png, hab_png, fonts, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA")
N = lambda n: Lo(os.path.join(nd_, n + ".png")); SL = lambda n: Lo(os.path.join(sl, n + ".png"))
F = lambda w, s: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), s)
BONE, MIST, FOCUS, AMBER = (0xf1, 0xeb, 0xdf), (0x8d, 0x8a, 0xa6), (0xff, 0xb4, 0x4a), (0xe8, 0xa0, 0x3c)
cap = np.asarray(Image.open(create_png).convert("RGB")).astype(float); bg = np.median(cap[4:36, 600:640].reshape(-1, 3), 0)
def icon(x):
    c = cap[12 - 0:28, x:x + 16]; d = np.abs(c - bg).max(2); a = np.clip((d - 10) / 40, 0, 1)
    return Image.fromarray(np.dstack([c, a * 255]).astype(np.uint8), "RGBA")
ICON = {"energy": icon(443), "data": icon(497), "essence": icon(551)}
def text(dr, xy, s, font, fill, shadow=True):
    if shadow: dr.text((xy[0] + 1, xy[1] + 1), s, font=font, fill=(10, 10, 12))   # text on art gets a 1 px dark shadow
    dr.text(xy, s, font=font, fill=fill)
def panel(screen_png, title, cards, label, focus=0):
    f = Image.open(screen_png).convert("RGBA")
    f.alpha_composite(N("panel-veil-1024x522"), (0, 40)); f.alpha_composite(N("panel-housing-840x440"), (92, 80))
    dr = ImageDraw.Draw(f)
    tf = F("SemiBold", 28); tw = dr.textlength(title, font=tf); text(dr, (512 - tw / 2, 96), title, tf, BONE)
    n = len(cards); w = {1: 776, 2: 380, 3: 248}[n]
    for i, c in enumerate(cards):
        x, y = 124 + i * (w + 16), 152
        f.alpha_composite(N(f"panel-card-{w}x288{'-focused' if i == focus else ''}"), (x, y))
        sw = w - 32; FEET = y + 168                                        # the composite rule (T-20261016-70): feet on the slot's floor
        if c.get("scene"): f.alpha_composite(N(f"panel-scene-wild-{sw}x152"), (x + 16, y + 16))
        else: f.alpha_composite(N(f"panel-glow-{sw}x160"), (x + 16, y + 16))
        f.alpha_composite(N(f"panel-stage-{sw}x48"), (x + 16, y + 136))
        for pic, dx in c["pics"]:                                          # 1:1, centred (+ dx), its lowest opaque row on the feet line
            pa = np.asarray(pic)[..., 3]; rows = np.nonzero((pa >= 128).any(1))[0]; cols = np.nonzero((pa >= 128).any(0))[0]
            px = x + 16 + (sw - pic.width) // 2 + dx; py = FEET - rows.max()
            span = cols.max() - cols.min() + 1 + 16; cs = N("panel-contact-shadow-128x16").resize((span, 16), Image.LANCZOS)
            f.alpha_composite(cs, (px + cols.min() - 8, FEET - 8)); f.alpha_composite(pic, (px, py))
        f.alpha_composite(N(f"panel-light-{sw}x160"), (x + 16, y + 16))
        if c.get("mark"): f.alpha_composite(SL(f"frame-room-{c['mark']}-24"), (x + w - 40, y + 16))
        dr = ImageDraw.Draw(f)
        text(dr, (x + 16, y + 184), c["name"], F("Medium", 20), BONE if not c.get("dim") else MIST)
        cx = x + 16
        for ic, fig, gain in c.get("costs", []):                           # each cost group on its chip (nine-slice: 10 px caps, the middle stretched)
            s = ("+" if gain else "") + fig; gw = 20 + int(dr.textlength(s, font=F("Regular", 16))); chw = gw + 16
            ch = N("panel-chip-40x20"); chip = Image.new("RGBA", (chw, 20)); chip.paste(ch.crop((0, 0, 10, 20)), (0, 0))
            chip.paste(ch.crop((10, 0, 30, 20)).resize((chw - 20, 20)), (10, 0)); chip.paste(ch.crop((30, 0, 40, 20)), (chw - 10, 0))
            f.alpha_composite(chip, (int(cx), y + 216)); f.alpha_composite(ICON[ic], (int(cx) + 8, y + 218)); dr = ImageDraw.Draw(f)
            text(dr, (cx + 28, y + 216), s, F("Regular", 16), BONE if gain else FOCUS); cx += chw + 8
        if c.get("line"): text(dr, (x + 16, y + 244), c["line"], F("Regular", 16), AMBER if c.get("loss") else MIST)
        if i == focus: dr.rounded_rectangle([x - 4, y - 4, x + w + 3, y + 291], radius=14, outline=FOCUS, width=2)
    lb = F("Medium", 16); dr.rectangle([8, 46, 16 + dr.textlength(label, font=lb), 70], fill=(0, 0, 0)); dr.text((12, 49), label, font=lb, fill=(255, 255, 255))
    return f.convert("RGB")
juv = SL("mibi-juvenile-S01-176x128"); adult = SL("mibi-adult-S01-144x152")
grow = panel(create_png, "Grow this founder?", [
    {"pics": [(juv, 0)], "mark": "research", "name": "Grow it", "costs": [("data", "3", False), ("energy", "2", False)], "line": "Stamina stays a surprise"},
    {"pics": [(adult, 0)], "name": "Keep shaping"}],
    "PROOF T-20261016-70: the Grow it panel (arrival mode) over Create, 1x. Words, icons, ring: stand-ins")
grow.save(os.path.join(out, "panel-grow-over-create-1x.png"))
ret = panel(hab_png, "Return Pip?", [
    {"scene": True, "pics": [(adult, 72)], "mark": "habitat", "name": "Return it", "costs": [("essence", "2", True)], "line": "gone for good", "loss": True},
    {"pics": [(adult, 0)], "name": "Keep Pip"}],
    "PROOF T-20261016-70: the Return panel over the Vivarium up close, 1x. Words, icons, ring: stand-ins", focus=1)
ret.save(os.path.join(out, "panel-return-over-vivarium-1x.png"))
print("proofs written")
