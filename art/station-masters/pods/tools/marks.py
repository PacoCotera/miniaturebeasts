"""Who-it-is marks (Brief 1): mark-species-<SNN>-24x24 (16), mark-species-frost-24x24, mark-clan-<CNN>-24x24 (16), mark-first-16x16, at their overview positions
(glyph (200, 488, 24, 24), clan (232, 488, 24, 24), first of its kind (268, 492, 16, 16)). python3 -I tools/marks.py
- species mark: the species' signed 5x5 abstract glyph (prototypes/workbench/frames/species-S<NN>.json "glyph"), each lit cell placed at 4 px per cell as a 3x3 bone square with a 1 px gap, the lit
  edge (top row and left column of each square) white; the grid is 19 px wide, at x 2 and y 2 of the 24x24. Station palette colours only (bone, white); no species colour.
- frost mark: a generic frosted disc, 22 px across, frost body, a lit rim upper left, a deeper rim lower right (palette: frost, frostD, frostS); no glyph.
- clan mark: a 24 px roundel in the clan's anchor pigment (the species frame's signature.anchor of the clan's first member, the Library's clan ink): a 2 px ring and a solid 8 px centre, no symbol.
- first-of-its-kind mark: the Library's gilt corner, a 16x16 right-angle ornament, typed rows in quiet gilt (bark with a clay lit edge and a soil shade: palette colours, dimmer than the pod's mean).
The pixels are placed from data and geometry (the species cells, the circle's mask); the gilt corner is typed by hand."""
import json, os, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
PIG = {"charcoal": "#465459", "coral": "#e98268", "lagoon": "#269fa5", "russet": "#ae674d", "marigold": "#e8b83f", "cobalt": "#4d7ed4", "jade": "#38a878", "plum": "#a967b8", "periwinkle": "#8b7dd8"}
man = json.load(open("slices/manifest.json"))
def save(name, im, rect, made, src):
    im = im.convert("RGBA"); im.save(f"slices/{name}.png", optimize=True)
    man[name] = {"size": list(im.size), "rect": rect, "src": src, "made": made, "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
frames = {f"S{i:02d}": json.load(open(os.path.join(REPO, f"prototypes/workbench/frames/species-S{i:02d}.json"))) for i in range(1, 17)}
# species marks
for sp, d in frames.items():
    rows = d["glyph"]; im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != "#": continue
            for dy in range(3):
                for dx in range(3):
                    im.putpixel((2 + 4 * c + dx, 2 + 4 * r + dy), PAL["white" if (dx == 0 or dy == 0) else "bone"] + (255,))
    save(f"mark-species-{sp}-24x24", im, [200, 488, 24, 24], f"the {d['species']['name']} mark: its signed 5x5 abstract glyph at 4 px per cell, each lit cell a 3x3 bone square with a 1 px gap, the lit edge (top and left) white", f"species-{sp}.json glyph")
# the frost disc
im = Image.new("RGBA", (24, 24), (0, 0, 0, 0)); yy, xx = np.mgrid[0:24, 0:24]; cx = cy = 11.5; rr = np.hypot(xx - cx, yy - cy)
for y in range(24):
    for x in range(24):
        rad = rr[y, x]
        if rad <= 11.0:
            t = (x - cx) + (y - cy)
            col = "frost" if (rad > 9.2 and t < -3) else "frostS" if (rad > 9.2 and t > 3) else "frostD"
            im.putpixel((x, y), PAL[col] + (255,))
save("mark-species-frost-24x24", im, [200, 488, 24, 24], "the unidentified pod's mark: a generic frosted disc 22 px across (frostD body, a frost lit rim upper left, a frostS rim lower right), no glyph", "geometry")
# clan marks
for sp, d in frames.items():
    cn = d["taxonomy"]["clan"]; a = d["signature"]["anchor"]; col = tuple(int(PIG[a][i:i + 2], 16) for i in (1, 3, 5))
    im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for y in range(24):
        for x in range(24):
            rad = np.hypot(x - 11.5, y - 11.5)
            if (rad <= 11.9 and rad > 9.6) or rad <= 4.0: im.putpixel((x, y), col + (255,))
    save(f"mark-clan-{cn}-24x24", im, [232, 488, 24, 24], f"clan {cn} ({d['taxonomy']['clanName']}): a 24 px roundel, a 2 px ring and a solid 8 px centre in the clan's anchor pigment {a} {PIG[a]}, no symbol", f"species-{sp}.json signature.anchor")
# the gilt corner, typed: c = clay, s = sand (lit), b = bark (shade), . = empty
rows = ["sssssssssssssss.", "sccccccccccccbb.", "sccccccccccbb...", "scc.............", "scc.............", "scc.............", "scc.............", "scc.............", "scc.............", "scc.............", "scc.............", "sc..............", "sbb.............", "sb..............", "sb..............", "................"]
rows[0] = "ssssssssssssssss"; rows[1] = "scccccccccccccbb"; rows[2] = "sccccccccccbbbb."; rows[3] = "scc.cccc........"; rows[4] = "scc.c..........."
rows[3] = "scc....s........"; rows[4] = "scc...sc........"; rows[5] = "scc..sccb......."; rows[6] = "scc...cb........"; rows[7] = "scc....b........"
im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); pm = {"s": PAL["clay"], "c": PAL["bark"], "b": PAL["soil"]}
for y, r in enumerate(rows):
    assert len(r) == 16, (y, len(r))
    for x, ch in enumerate(r):
        if ch in pm: im.putpixel((x, y), pm[ch] + (255,))
# mirror the vertical arm from the horizontal one so the corner is a true right angle (the arm down the left edge, the arm along the top), with the diamond at the junction
save("mark-first-16x16", im, [268, 492, 16, 16], "the Library's gilt corner as a 16 px right-angle ornament in quiet gilt (bark with a clay lit edge and a soil shade), typed by hand", "typed by hand")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# the round 1 sheet: 16 places under a name plate at the overview's positions (glyph x - 56, clan x - 24, first x + 12 from the label's centre)
FD = "/usr/share/fonts/opentype/inter/"; f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20); f14 = ImageFont.truetype(FD + "Inter-Regular.otf", 12)
cw, ch_ = 168, 96; sheet = Image.new("RGBA", (8 * cw, 2 * ch_ + 56), (16, 26, 36, 255)); d = ImageDraw.Draw(sheet)
items = [(sp, frames[sp]["species"]["name"], f"mark-species-{sp}-24x24", f"mark-clan-{frames[sp]['taxonomy']['clan']}-24x24") for sp in frames]
for k, (sp, name, gm, cm) in enumerate(items):
    x0 = (k % 8) * cw; y0 = (k // 8) * ch_; mid = x0 + cw // 2
    d.rounded_rectangle([mid - 40, y0 + 8, mid + 40, y0 + 32], 6, fill=(52, 56, 63, 255)); d.text((mid, y0 + 20), name[:8], font=f20 if len(name) < 7 else ImageFont.truetype(FD + "Inter-Medium.otf", 15), fill=PAL["bone"] + (255,), anchor="mm")
    sheet.alpha_composite(Image.open(f"slices/{gm}.png").convert("RGBA"), (mid - 56, y0 + 40)); sheet.alpha_composite(Image.open(f"slices/{cm}.png").convert("RGBA"), (mid - 24, y0 + 40)); sheet.alpha_composite(Image.open("slices/mark-first-16x16.png").convert("RGBA"), (mid + 12, y0 + 44))
    d.text((x0 + 6, y0 + ch_ - 14), sp, font=f14, fill=(110, 124, 142, 255))
yb = 2 * ch_ + 4; d.text((6, yb + 4), "unidentified pod:", font=f14, fill=(110, 124, 142, 255)); d.rounded_rectangle([200, yb, 280, yb + 24], 6, fill=(52, 56, 63, 255)); d.text((240, yb + 12), "Unknown", font=ImageFont.truetype(FD + "Inter-Medium.otf", 15), fill=PAL["bone"] + (255,), anchor="mm")
sheet.alpha_composite(Image.open("slices/mark-species-frost-24x24.png").convert("RGBA"), (240 - 56, yb + 28)); sheet.alpha_composite(Image.open("slices/mark-first-16x16.png").convert("RGBA"), (240 + 12, yb + 32))
os.makedirs("marks", exist_ok=True); sheet.convert("RGB").save("marks/marks-round1-1x.png"); sheet.resize((sheet.width * 3 // 2, sheet.height * 3 // 2), Image.NEAREST).convert("RGB").save("marks/marks-round1-1.5x-proof.png")
