"""T-20261016-47 proofs: the Grow it panel (arrival mode) over Create and the Return panel over the Vivarium up close (Habitat), at 1x,
with the panel kit at the spec's rects (specs/station-decision-panel-spec.md §1.2, §1.3, §1.6), each labelled inside the image.
Stand-ins (the build's): the words (typed here in Inter at the spec's sizes and roles: title 28/600 `bone`, name 20/500 `bone`, costs `focus`,
line 16 `mist`, a loss line `amber`); the 16 px material icons (cropped from the golden's own top bar); the focus ring (the frame's, drawn here
as a 2 px `focus` rounded rect 4 px out); the pictures, the signed masters named in §1.6, placed 1:1.
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
        f.alpha_composite(N(f"panel-stage-{w - 32}x48"), (x + 16, y + 136))
        for pic, dx, dy in c["pics"]:                                       # bottom-centred on the slot's floor (y + 168), 1:1
            px = x + 16 + (w - 32 - pic.width) // 2 + dx; py = y + 168 - pic.height + dy
            f.alpha_composite(pic, (px, py))
        if c.get("mark"): f.alpha_composite(SL(f"frame-room-{c['mark']}-24"), (x + w - 40, y + 16))
        dr = ImageDraw.Draw(f)
        text(dr, (x + 16, y + 184), c["name"], F("Medium", 20), BONE if not c.get("dim") else MIST)
        cx = x + 16
        for ic, fig, gain in c.get("costs", []):
            f.alpha_composite(ICON[ic], (int(cx), y + 218)); dr = ImageDraw.Draw(f)
            s = ("+" if gain else "") + fig; text(dr, (cx + 20, y + 216), s, F("Regular", 16), BONE if gain else FOCUS); cx += 20 + dr.textlength(s, font=F("Regular", 16)) + 14
        if c.get("line"): text(dr, (x + 16, y + 244), c["line"], F("Regular", 16), AMBER if c.get("loss") else MIST)
        if i == focus: dr.rounded_rectangle([x - 4, y - 4, x + w + 3, y + 291], radius=14, outline=FOCUS, width=2)
    lb = F("Medium", 16); dr.rectangle([8, 46, 16 + dr.textlength(label, font=lb), 70], fill=(0, 0, 0)); dr.text((12, 49), label, font=lb, fill=(255, 255, 255))
    return f.convert("RGB")
juv = SL("mibi-juvenile-S01-104x112"); adult = SL("mibi-adult-S01-144x152")
grow = panel(create_png, "Grow this founder?", [
    {"pics": [(juv, 0, -8)], "mark": "research", "name": "Grow it", "costs": [("data", "3", False), ("energy", "2", False)], "line": "Stamina stays a surprise"},
    {"pics": [(adult, 0, -6)], "name": "Keep shaping"}],
    "PROOF T-20261016-47: the Grow it panel (arrival mode) over Create, 1x. Words, icons, ring: stand-ins")
grow.save(os.path.join(out, "panel-grow-over-create-1x.png"))
place = SL("place-meadow-64x64"); mibi = SL("mibi-adult-S01-96x88") if os.path.exists(os.path.join(sl, "mibi-adult-S01-96x88.png")) else juv
ret = panel(hab_png, "Return Pip?", [
    {"pics": [(place, -36, -40), (juv, 24, -8)], "mark": "habitat", "name": "Return it", "costs": [("essence", "2", True)], "line": "gone for good", "loss": True},
    {"pics": [(juv, 0, -8)], "name": "Keep Pip"}],
    "PROOF T-20261016-47: the Return panel over the Vivarium up close, 1x. Words, icons, ring: stand-ins", focus=1)
ret.save(os.path.join(out, "panel-return-over-vivarium-1x.png"))
print("proofs written")
