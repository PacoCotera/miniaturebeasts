"""Round 1 proof: each emblem at 1x on the signed rail-tab plates (compact and full), and one eight-chapter compact rail. python3 -I proof.py (from emblems/)"""
import json, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(HERE, "..", "slices"); R = os.path.join(HERE, "round2")
atlas = json.load(open(os.path.join(R, "emblems-atlas.json"))); sheet = Image.open(os.path.join(R, "emblems-sheet.png")).convert("RGBA")
def emb(cid, opt, st): x, y, w, h = atlas["sprites"][f"rail-emblem-{cid}-{st}-24x24"]["rect"]; return sheet.crop((x, y, x + w, y + h))
def plate(st, form): return Image.open(os.path.join(P, f"rail-tab-{st}-{form}.png")).convert("RGBA")
CH = [("coat", "Coat"), ("face", "Face"), ("shape", "Shape"), ("legs-tail", "Legs & tail"), ("movement", "Movement"), ("stamina", "Stamina"), ("character", "Character"), ("glow", "Glow"), ("charge", "Charge")]
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16)
BG = (30, 52, 64, 255)
def block(opt):
    W = 9 * 76 + 16; im = Image.new("RGBA", (W, 4 * 46 + 60), BG); d = ImageDraw.Draw(im)
    for r, st in enumerate(("unread", "read", "sealed")):
        for i, (cid, word) in enumerate(CH):
            x = 8 + i * 76; y = 8 + r * 46; im.alpha_composite(plate(st, "compact-72x40"), (x, y)); im.alpha_composite(emb(cid, opt, st), (x + 34 - 12 + 0, y + 4))
            for p in range(3): d.rectangle([x + 42 - 12 + 8 * p, y + 32, x + 42 - 12 + 8 * p + 5, y + 37], outline=(160, 175, 190, 255) if st != "read" else (241, 235, 223, 255))
    # full tabs, read, with the word, for four chapters
    y = 8 + 3 * 46 + 4
    for i, (cid, word) in enumerate(CH[:4]):
        x = 8 + i * 152 - (i * 0); im.alpha_composite(plate("read", "full-152x40"), (x, y)); tw = d.textlength(word, font=f16); bx = x + 76 - (32 + tw) / 2
        im.alpha_composite(emb(cid, opt, "read"), (int(bx), y + 8)); d.text((bx + 32, y + 14), word, font=f16, fill=(241, 235, 223, 255), anchor="lm")
    # an eight-chapter compact rail (open chapter Shape, full)
    y2 = y + 50; x = 8; ids = CH[:8]
    for i, (cid, word) in enumerate(ids):
        full = i == 2; st = "focused" if full else ("read" if i < 2 else "unread"); em = "read" if st != "unread" else "unread"
        if i == 7: st = "sealed"; em = "sealed"
        im.alpha_composite(plate(st, "full-152x40" if full else "compact-72x40"), (x, y2))
        if full:
            tw = d.textlength(word, font=f16); bx = x + 76 - (32 + tw) / 2; im.alpha_composite(emb(cid, opt, "read"), (int(bx), y2 + 8)); d.text((bx + 32, y2 + 14), word, font=f16, fill=(241, 235, 223, 255), anchor="lm"); x += 136
        else: im.alpha_composite(emb(cid, opt, em), (x + 34 - 12, y2 + 4)); x += 56
    return im.convert("RGB")
for opt in "A":
    b = block(opt); b.save(os.path.join(R, f"proof-1x.png")); b.resize((b.width * 2, b.height * 2), Image.NEAREST).save(os.path.join(R, f"proof-2x.png"))
print("ok")
# the labelled contact sheet at 1x and 2x, on the bench ground
cols = [("A", s) for s in ("unread", "read", "sealed")]; lw = 96; pitch = 30
W = lw + len(cols) * pitch + 8; H = 24 + len(CH) * pitch + 8; cs = Image.new("RGBA", (W, H), (22, 38, 50, 255)); d = ImageDraw.Draw(cs); f12 = f16
for k, (o, s) in enumerate(cols): d.text((lw + k * pitch + 3, 4), f"{s[:3]}", font=ImageFont.load_default(), fill=(180, 190, 200, 255))
for r, (cid, word) in enumerate(CH):
    d.text((6, 24 + r * pitch + 6), word, font=ImageFont.load_default(), fill=(200, 210, 220, 255))
    for k, (o, s) in enumerate(cols): cs.alpha_composite(emb(cid, o, s), (lw + k * pitch + 3, 24 + r * pitch + 3))
cs = cs.convert("RGB"); cs.save(os.path.join(R, "contact-labelled-1x.png")); cs.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(R, "contact-labelled-2x.png"))
