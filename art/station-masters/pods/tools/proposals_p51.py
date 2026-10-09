"""Proofs only (no slice changes): (1) compare-mark-differs-12x12 alternatives with an unmistakable offset, 1x beside "Markings" and "Tail" (and 4x); (2) ways to anchor the S09 Tail and Crown crops: a faint body edge left in
at the root, or a ground shadow. python3 -I tools/proposals_p51.py  -> proposals/*.png"""
import os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(ROOT, "..", "..", "..", "prototypes/ui/palettes/station.json")))["colours"]}
INK, AQ, MINT = PAL["ink"], PAL["aqua"], PAL["mint"]; GROUND = (21, 36, 46)
def build(rows):
    im = Image.new("RGBA", (12, 12), (0, 0, 0, 0)); pc = {"i": INK, "a": AQ, "m": MINT}
    for y, r in enumerate(rows):
        assert len(r) == 12, r
        for x, ch in enumerate(r):
            if ch in pc: im.putpixel((x, y), pc[ch] + (255,))
    return im
SIGNED = Image.open("slices/compare-mark-differs-12x12.png").convert("RGBA")
# A: the same strokes, the lower shifted 5 px right (the strokes overlap by 2 px only at the ends)
A = build(["............", "iiiiiii.....", "immmmmi.....", "iaaaaai.....", "iiiiiii.....", "............", "............", ".....iiiiiii", ".....immmmmi", ".....iaaaaai", ".....iiiiiii", "............"][0:12])
# B: slanted strokes: each a 2-step stair (rising to the right), the lower shifted right: reads as an offset pair of dashes tilted like a "not equal"
B = build(["............", "....iiiiii..", "...immmmmi..", "..iaaaaaai..", "..iiiiiii...", "............", "............", "..iiiiii....", ".immmmmmi...", ".iaaaaaai...", "..iiiiiii...", "............"][0:12]) if False else None
# C: a "not equal" proper: two strokes with a slash through them (the slash in aqua over ink)
rowsC = ["...........i", "..........ia", "iiiiiiiiiia.", "immmmmmmiaii", "iaaaaaaaiaai", "iiiiiiiiiai.", "iiiiiiiiaii.", "immmmmmia.i.", "iaaaaaaaiaii", "iiiiiiiiaii.", ".........i..", "............"]
# D: lower stroke shifted right by 4 and both strokes 6 long with a visible gap column: a stepped pair
D = build(["............", "iiiiiii.....", "immmmmi.....", "iaaaaai.....", "iiiiiii.....", "............", ".....iiiiiii", ".....immmmmi", ".....iaaaaai", ".....iiiiiii", "............", "............"])
# the slant variant by shearing the signed mark: each row of the upper stroke shifted by 1 px (a parallelogram), the lower likewise
def shear(im):
    out = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
    for y in range(12):
        for x in range(12):
            p = im.getpixel((x, y))
            if p[3]: 
                nx = x + (2 - (y % 6) // 2) if False else x
    return out
cands = {"signed": SIGNED, "A offset 5 px": build(["............", "iiiiiii.....", "immmmmi.....", "iaaaaai.....", "iiiiiii.....", "............", "............", ".....iiiiiii", ".....immmmmi", ".....iaaaaai", ".....iiiiiii", "............"])}
# E: slanted parallelograms: the upper stroke leans / (each row shifted one px left going down), the lower likewise, the lower shifted right
def slanted(x0u, x0l):
    im = Image.new("RGBA", (12, 12), (0, 0, 0, 0)); pcs = {"i": INK, "a": AQ, "m": MINT}
    def stroke(x0, y0):
        for j in range(4):                    # four rows: ink, mint, aqua, ink; each row shifted left by 1 px going down (a "/" lean)
            sh = -j
            for k in range(7): 
                ch = "i" if j in (0, 3) else ("m" if j == 1 else "a")
                im.putpixel((x0 + sh + k + 2, y0 + j), pcs[ch] + (255,))
    stroke(x0u, 1); stroke(x0l, 6); return im
cands["E slanted, lower shifted 3"] = slanted(0, 3)
# F: the strokes are three pixels shorter and the offset is a full stroke: a clear step
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); f11 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 11)
names = list(cands); W = 220; sheet = Image.new("RGB", (W, 26 * len(names) * 2 + 8), GROUND); d = ImageDraw.Draw(sheet)
for r, nm in enumerate(names):
    for c, word in enumerate(("Markings", "Tail")):
        y = 4 + (r * 2 + c) * 26; d.text((8, y + 13), word, font=f16, fill=PAL["bone"], anchor="lm"); x = 8 + int(d.textlength(word, font=f16)) + 4
        sheet.paste(cands[nm], (x, y + 7), cands[nm])
        if c == 0: d.text((130, y + 13), nm, font=f11, fill=(110, 124, 142), anchor="lm")
sheet.save("proposals/differs-mark-1x.png"); sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save("proposals/differs-mark-4x.png")
for nm, im in cands.items(): im.save(f"proposals/differs-{nm.split()[0].lower()}-12x12.png")
