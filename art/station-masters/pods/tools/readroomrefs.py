"""References for the reading-room v2 concepts (readroom-v2.md sections 2, 5 and 7).
Flat wireframes of the 1024x600 screen at the spec's rects, drawn on a 16:9 canvas (1067x600, the screen centred, 21 px of plain
backdrop either side) and doubled, with no words; plus crops of signed masters as material references. 0 MXN.
usage: python3 -I tools/readroomrefs.py"""
import os
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "source/work/concepts-readroom"); os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(ROOT, "source/raw/concepts-readroom"), exist_ok=True)
BUILD = "/home/user/iwq/results/T-20261026-vivarium/pods-build/pods-room-a-read-page.png"
LOIKA = os.path.join(ROOT, "adult/mibi-adult-S01-304x312.png")
OX = 21; S = 2
WALL, TABLE, BAR = (196, 178, 156), (104, 70, 48), (29, 35, 43)
KRAFT, PLATE, GLOW = (196, 160, 112), (78, 52, 36), (255, 214, 140)

def R(x, y, w, h): return [(x + OX) * S, y * S, (x + OX + w) * S, (y + h) * S]

def silhouette(size, colour, alpha=255):
    im = Image.open(LOIKA).convert("RGBA").resize(size, Image.LANCZOS)
    a = im.getchannel("A").point(lambda v: v * alpha // 255)
    flat = Image.new("RGBA", size, colour + (255,)); flat.putalpha(a); return flat

def frame(state):
    im = Image.new("RGB", (1067 * S, 600 * S), WALL); d = ImageDraw.Draw(im, "RGBA")
    d.rectangle([0, 340 * S, im.width, 600 * S], fill=TABLE)                       # table top from y 340 down
    d.rectangle([0, 0, im.width, 40 * S], fill=BAR); d.rectangle([0, 562 * S, im.width, 600 * S], fill=BAR)
    # the lamp over the pod and its pool
    d.line([(400 + OX) * S, 40 * S, (400 + OX) * S, 70 * S], fill=(150, 120, 60), width=3 * S)
    d.polygon([((372 + OX) * S, 100 * S), ((428 + OX) * S, 100 * S), ((414 + OX) * S, 70 * S), ((386 + OX) * S, 70 * S)], fill=(170, 135, 70))
    pool = Image.new("L", im.size, 0); ImageDraw.Draw(pool).ellipse(R(240, 300, 320, 110), fill=120)
    im.paste(Image.new("RGB", im.size, (240, 200, 130)), (0, 0), pool.filter(ImageFilter.GaussianBlur(30 * S)))
    d = ImageDraw.Draw(im, "RGBA")
    return im, d

def pod(d, x, y, w, h, motes, clear=False):
    d.ellipse(R(x, y + h * 0.12, w, h * 0.88), fill=(62, 84, 104))                  # body
    d.ellipse(R(x + w * 0.2, y, w * 0.6, h * 0.2), fill=(190, 104, 84))             # cap
    gx, gy, gw, gh = x + w / 6, y + h * 0.15, w * 2 / 3, h * 0.7
    d.ellipse(R(gx, gy, gw, gh), fill=(255, 236, 190, 200) if clear else GLOW + (220,))
    for i, (mx, my) in enumerate(motes):
        r = 18 if i == 0 else 13
        d.ellipse(R(gx + mx * gw - r, gy + my * gh - r, 2 * r, 2 * r), fill=(255, 250, 225, 255 if i == 0 else 170))
    if motes:                                                                        # the glint on the front mote
        cx, cy = gx + motes[0][0] * gw + 14, gy + motes[0][1] * gh - 14
        d.polygon([R(cx, cy - 8, 0, 0)[:2], R(cx + 3, cy, 0, 0)[:2], R(cx, cy + 8, 0, 0)[:2], R(cx - 3, cy, 0, 0)[:2]], fill=(255, 255, 255))

def tags(d, goal=True):
    d.rectangle(R(48, 64, 176, 132), fill=KRAFT); d.rectangle(R(56, 70, 160, 96), fill=(110, 140, 90))   # origin photo
    d.rectangle(R(48, 212, 176, 56), fill=KRAFT); d.ellipse(R(58, 220, 34, 40), fill=(62, 84, 104))      # kin slip
    if goal: d.rectangle(R(840, 60, 160, 108), fill=(226, 208, 176))                                      # goal card
    for x, y in ((136, 64), (136, 212), (920, 60)): d.ellipse(R(x - 4, y - 2, 8, 8), fill=(170, 135, 70))  # pins

def plates(d, read_label=True):
    d.rectangle(R(272, 478, 256, 38), fill=PLATE, outline=(170, 135, 70), width=S)
    for x, w in ((40, 128), (176, 104), (656, 240)): d.rectangle(R(x, 522, w, 34), fill=PLATE, outline=(170, 135, 70), width=S)

def creature(im, state):
    w, h = 224, 212
    if state == "full": c = Image.open(LOIKA).convert("RGBA").resize((w * S, h * S), Image.LANCZOS)
    else: c = silhouette((w * S, h * S), (150, 150, 156), 200)
    im.paste(c, R(600, 168, 0, 0)[:2], c)

def dish(d, x=292, y=344, w=216, h=32): d.ellipse(R(x, y, w, h), fill=(120, 80, 50), outline=(190, 150, 80), width=2 * S)

def screen(state):
    im, d = frame(state); tags(d); dish(d)
    if state == "unread": pod(d, 328, 176, 144, 176, [(.55, .62), (.3, .3), (.7, .28), (.25, .7), (.5, .12)])
    elif state == "read":  pod(d, 328, 176, 144, 176, [(.55, .62), (.3, .3), (.7, .3)])
    else:                  pod(d, 328, 176, 144, 176, [], clear=True)
    creature(im, state); d = ImageDraw.Draw(im, "RGBA")
    if state == "read":
        c = Image.open(LOIKA).convert("RGBA").resize((224 * S, 212 * S), Image.LANCZOS)   # the coat painted in: the back half in colour
        m = Image.new("L", c.size, 0); ImageDraw.Draw(m).rectangle([c.width // 2, 0, c.width, c.height], fill=255)
        m = Image.composite(c.getchannel("A"), Image.new("L", c.size, 0), m); im.paste(c, R(600, 168, 0, 0)[:2], m)
        pts = [(400 + 40 * t + 300 * t * t, 250 - 160 * t + 120 * t * t) for t in [i / 12 for i in range(13)]]
        d.line([((x + OX) * S, y * S) for x, y in pts], fill=(255, 236, 170, 220), width=4 * S)
        d.rectangle(R(600, 408, 28, 28), fill=(170, 90, 60)); d.rectangle(R(618, 426, 18, 18), fill=(140, 140, 136), outline=(255, 250, 230), width=S)
        d.rectangle(R(600, 442, 28, 28), fill=(170, 90, 60)); d.rectangle(R(618, 460, 18, 18), fill=(90, 70, 60))
    if state == "full":
        d.ellipse(R(376, 352, 48, 48), fill=(196, 140, 60), outline=(150, 100, 40), width=S)                   # the stamp on the dish's front
    return im

def compare():
    im, d = frame("compare")
    pool = Image.new("L", im.size, 0); ImageDraw.Draw(pool).ellipse(R(60, 150, 900, 140), fill=90)
    im.paste(Image.new("RGB", im.size, (240, 200, 130)), (0, 0), pool.filter(ImageFilter.GaussianBlur(30 * S))); d = ImageDraw.Draw(im, "RGBA")
    d.rectangle([0, 214 * S, im.width, 562 * S], fill=TABLE)                         # the table top higher, for the shared sheet
    for px, dx, cx in ((128, 96, 232), (640, 608, 744)):
        dish(d, dx, 206, 160, 28); pod(d, px, 96, 96, 118, [(.5, .6), (.3, .3)])
        c = Image.open(LOIKA).convert("RGBA").resize((144 * S, 118 * S), Image.LANCZOS); im.paste(c, R(cx, 96, 0, 0)[:2], c)
    d.rectangle(R(96, 264, 832, 236), fill=(232, 216, 186))                          # the one paper of rows
    for i in range(6):
        y = 298 + 34 * i
        if i in (1, 3): d.rectangle(R(104, y, 816, 32), fill=(244, 232, 206), outline=(196, 170, 120), width=S)
        d.rectangle(R(112, y + 5, 24, 24), fill=(170, 90, 60)); d.rectangle(R(612, y + 5, 24, 24), fill=(120, 110, 100))
    return im

if __name__ == "__main__":
    for s in ("unread", "read", "full"): screen(s).save(os.path.join(OUT, f"ref-layout-{s}-16x9.png"))
    compare().save(os.path.join(OUT, "ref-layout-compare-16x9.png"))
    Image.open(os.path.join(ROOT, "shelf/reading-bench-2048x1200.png")).convert("RGB").save(os.path.join(OUT, "ref-bench.jpg"), quality=92)
    p = Image.open(BUILD).convert("RGB").crop((70, 136, 212, 282)); p.resize((p.width * 4, p.height * 4), Image.LANCZOS).save(os.path.join(OUT, "ref-pod-loika.png"))
    c = Image.open(LOIKA).convert("RGBA"); bg = Image.new("RGBA", c.size, (236, 228, 214, 255)); bg.alpha_composite(c)
    bg.convert("RGB").resize((c.width * 2, c.height * 2), Image.LANCZOS).save(os.path.join(OUT, "ref-loika.png"))
    Image.open(os.path.join(ROOT, "shelf/reading-dish-5132x1057.png")).convert("RGBA").resize((1283, 264), Image.LANCZOS).save(os.path.join(OUT, "ref-dish.png"))
    print("refs in", OUT)
