"""Round 1 proof of the trait pictures: the S09 Coat (six traits) and Legs & tail (two) chapters on the chapter page at 1x beside the pod (the chapter page of design-station-frame: pod 144,216; dish 104,328;
slab 72,368; the pane 424,112,584 wide, 440 tall for five or more traits and 248 for one to four; four columns of 128 at x 448, 584, 720, 856, cells at y 160 and 360). python3 -I tools/traitpics_proof.py"""
import os, json, re
import numpy as np
from PIL import Image, ImageDraw, ImageFont
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open("tools/compose.py").read(); ns = {}; exec(src[:src.index("def compose(")], ns); recol = ns["recol"]
FD = "/usr/share/fonts/opentype/inter/"; f16 = ImageFont.truetype(FD + "Inter-Regular.otf", 16); f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20)
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
doc = json.load(open("traitpics/trait-regions-S09.json"))
def nineslice(w, h):
    m = S("page-pane-256x440"); W, H = m.size; L, T, R_, B = 64, 64, 16, 16; o = Image.new("RGBA", (w, h))
    o.paste(m.crop((0, 0, L, T)), (0, 0)); o.paste(m.crop((W - R_, 0, W, T)), (w - R_, 0)); o.paste(m.crop((0, H - B, L, H)), (0, h - B)); o.paste(m.crop((W - R_, H - B, W, H)), (w - R_, h - B))
    def fill(box, dbox):
        t = m.crop(box); x0, y0, x1, y1 = dbox
        for y in range(y0, y1, t.height):
            for x in range(x0, x1, t.width): o.paste(t.crop((0, 0, min(t.width, x1 - x), min(t.height, y1 - y))), (x, y))
    cx, cy = W // 2 - 16, H // 2 - 16
    fill((cx, 0, cx + 32, T), (L, 0, w - R_, T)); fill((cx, H - B, cx + 32, H), (L, h - B, w - R_, h)); fill((0, cy, L, cy + 32), (0, T, L, h - B)); fill((W - R_, cy, W, cy + 32), (w - R_, T, w, h - B)); fill((cx, cy, cx + 32, cy + 32), (L, T, w - R_, h - B)); return o
def page(chapter, word, emblem):
    cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255)); d = ImageDraw.Draw(cv); cv.alpha_composite(S("room-bench-stage-chapter"), (0, 40))
    cv.alpha_composite(S("room-shelf"), (72, 368)); cv.alpha_composite(S("room-cradle"), (104, 328)); cv.alpha_composite(S("pod-large-shadow"), (216 - 80, 385))
    cv.alpha_composite(recol("large", (0x4d, 0x7e, 0xd4), (0x26, 0x9f, 0xa5), "ribs", tint=(0, 0, 0)), (144, 216)); cv.alpha_composite(S("room-cradle-front"), (104, 328))
    tr = [(k, e) for k, e in doc["traits"].items() if e["chapter"] == chapter]; n = len(tr); ph = 440 if n >= 5 else 248
    cv.alpha_composite(nineslice(584, ph), (424, 112)); cv.alpha_composite(S(f"rail-emblem-{emblem}-read-24x24"), (440, 120)); d.text((472, 132), word, font=f20, fill=(241, 235, 223, 255), anchor="lm")
    for i, (k, e) in enumerate(tr):
        c, r = i % 4, i // 4; x = 448 + 136 * c; y = 160 + 200 * r
        pic = S(e["crops"]["128x160"]["slice"]); cv.alpha_composite(pic, (x, y)); cv.alpha_composite(S("trait-picture-frame-128x160"), (x, y)); d.text((x + 64, y + 178), e["trait"], font=f16, fill=(241, 235, 223, 255), anchor="mm")
    return cv.convert("RGB")
a = page("coat", "Coat", "coat"); b = page("legs-tail", "Legs & Tail", "legs-tail")
a.save("traitpics/chapter-coat-S09-1x.png"); b.save("traitpics/chapter-legs-tail-S09-1x.png")
