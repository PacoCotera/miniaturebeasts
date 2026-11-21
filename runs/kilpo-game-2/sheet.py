from PIL import Image
R = "/home/mb/mb/pool/kilpo-game-2/"
OLD = R + "runs/kilpo-game-2/old/"
NEW = R + "prototypes/ui/assets/masters/pods/"
V = R + "prototypes/ui/assets/masters/vivarium/"
NAMES = ["mibi-adult-S11-48x48", "mibi-adult-S11-96x88", "mibi-adult-S11-304x312", "mibi-juvenile-S11-48x48",
         "mibi-juvenile-S11-96x88", "mibi-juvenile-S11-304x312", "mibi-adult-S11-curl-304x312", "mibi-juvenile-S11-curl-304x312"]
BG = (226, 220, 206, 255)
pad = 10
cells = []
for n in NAMES:
    o = Image.open(OLD + n + ".png").convert("RGBA")
    w = Image.open(NEW + n + ".png").convert("RGBA")
    cells.append((o, w))
# row 1: the four 304 cells (old over new); row 2: the small cells
W = 4 * (304 + pad) + pad
big = [c for c in cells if c[0].width == 304]
small = [c for c in cells if c[0].width != 304]
H1 = 2 * (312 + pad) + pad
H2 = 2 * (96 + pad) + pad
room_d = Image.open(V + "vivarium-near-day-544x408.png").convert("RGBA")
room_n = Image.open(V + "vivarium-near-night-544x408.png").convert("RGBA")
H3 = 408 + pad
sheet = Image.new("RGBA", (max(W, 2 * 544 + 3 * pad), H1 + H2 + H3 + pad), BG)
for i, (o, w) in enumerate(big):
    x = pad + i * (304 + pad)
    sheet.alpha_composite(o, (x, pad))
    sheet.alpha_composite(w, (x, pad + 312 + pad))
x = pad
for (o, w) in small:
    sheet.alpha_composite(o, (x, H1 + pad))
    sheet.alpha_composite(w, (x, H1 + pad + 96 + pad))
    x += max(o.width, 48) + pad
y3 = H1 + H2
for k, room in enumerate((room_d, room_n)):
    r = room.copy()
    for cell, pos in (("mibi-adult-S11-96x88", (140, 270)), ("mibi-juvenile-S11-96x88", (300, 285))):
        r.alpha_composite(Image.open(NEW + cell + ".png").convert("RGBA"), pos)
    sheet.alpha_composite(r, (pad + k * (544 + pad), y3))
sheet.convert("RGB").save(R + "runs/kilpo-game-2/sheet-shadow.png")
print(sheet.size)
