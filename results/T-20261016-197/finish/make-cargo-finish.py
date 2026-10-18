# T-197 Cargo, the art director's finish pass on UI/UX's stills (cargo.py): the same structure, with the berths as recesses,
# one pod scale for everything stored, the counts made consistent, and done crates dimmed by value only.
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # UI/UX's station_kit.py beside it
from station_kit import *
from PIL import Image, ImageDraw
OUT = SCR + 'out/'
RAW = SCR + 'raw/'
BX, BY, BW, BH = 16, 46, 992, 506           # the bay window (screen)
def w2s(x, y): return x - BX, y - BY        # screen -> window coords
HATCH = w2s(24, 150) + (160, 260); WAIT = w2s(24, 424) + (160, 80); DISPLAY = w2s(200, 60) + (800, 180)
BERTHS = [w2s(200 + i * 272, 252) + (256, 292) for i in range(3)]
POD_L = pod('collection', '#465459', '#ae674d', 'dots'); POD_T = pod('collection', '#269fa5', '#e8b83f', 'plates')
WELL_L = pod('well', '#465459', '#ae674d', 'dots'); WELL_T = pod('well', '#269fa5', '#e8b83f', 'plates')
CRATE = master('pods/crate-sealed-256x176.png'); SHADOW = master('pods/crate-shadow-256x24.png')

def bay_base():
    c = Image.new('RGBA', (BW, BH), (0, 0, 0, 255)); bay = master('pods/cargo-bay-992x320.png'); place(c, bay, (0, 0))
    floor = np.asarray(bay)[296:316].mean(axis=(0, 1))[:3]
    d = ImageDraw.Draw(c); d.rectangle((0, 320, BW, BH), fill=tuple(int(v * 0.86) for v in floor))
    d.line((0, 320, BW, 320), fill=tuple(int(min(255, v * 1.12)) for v in floor))
    return c
def berth(c, x, y, w, h, crate=None, lit=1.0):
    d = ImageDraw.Draw(c)
    # a walk berth: a recess in the bay wall. Its back wall is shaded under the lip, its floor catches the light,
    # and the bay's light falls in from the top left; framed in the bay's sage
    fl = 44                                                   # the berth floor, seen from just above
    g = np.linspace(0, 1, h - fl)[:, None, None]; back = np.array([46, 40, 35]) * (1 - g) + np.array([84, 74, 64]) * g
    floor = np.linspace(0, 1, fl)[:, None, None]; fcol = np.array([112, 100, 86]) * (1 - floor) + np.array([92, 82, 71]) * floor
    col = np.concatenate([np.broadcast_to(back, (h - fl, w, 3)), np.broadcast_to(fcol, (fl, w, 3))])
    xs = np.linspace(0, 1, w)[None, :, None]; col = col * (1.06 - 0.12 * xs)            # lighter at the left, toward the light
    yy = np.arange(h)[:, None, None]; col = col * (1 - 0.45 * np.clip(1 - yy / 22, 0, 1) ** 2)   # the shadow under the top lip
    rec = Image.fromarray(np.dstack([col.clip(0, 255), np.full((h, w, 1), 255)]).astype(np.uint8), 'RGBA'); m = rrect_mask(w, h, 6)
    c.paste(rec, (x, y), m)
    d.line((x + 4, y + h - fl, x + w - 5, y + h - fl), fill=(70, 62, 54))                  # where the back wall meets the floor
    d.rounded_rectangle((x - 1, y - 1, x + w, y + h), 7, outline=(118, 136, 112)); d.line((x + 6, y + h - 2, x + w - 7, y + h - 2), fill=(136, 150, 128))
    d.line((x + 6, y + 1, x + w - 7, y + 1), fill=(30, 27, 24)); d.line((x + 1, y + 6, x + 1, y + h - 7), fill=(40, 36, 32))
    if crate is None: return
    cy = y + h - 176 - 14
    place(c, SHADOW, (x, y + h - 32))
    if crate == 'lifting': lifting_crate(c, x, cy)
    else: place(c, crate if lit == 1.0 else dim(crate, lit), (x, cy))
def lifting_crate(c, x, y):
    raw = RAW + 'crate-lifting-256x200.png'
    if os.path.exists(raw): place(c, Image.open(raw).convert('RGBA'), (x, y - 11)); return   # the studio crate: bottom 13 px above its canvas foot
    seam = 101; lid, body = CRATE.crop((0, 0, 256, seam)), CRATE.crop((0, seam, 256, 176))
    place(c, body, (x, y + seam)); soft_glow(c, x + 128, y + seam - 6, 170, 60, (255, 214, 140), 0.55, 1.5)
    ImageDraw.Draw(c).rectangle((x + 18, y + seam - 9, x + 238, y + seam), fill=(255, 236, 190))
    place(c, lid, (x, y - 9))
def hatch(c, state, wells=()):
    x, y, w, h = HATCH; d = ImageDraw.Draw(c)
    d.rounded_rectangle((x - 3, y - 3, x + w + 2, y + h + 2), 8, fill=(70, 84, 70), outline=(40, 46, 40))
    if state == 'shut':
        door = master('pods/cargo-bay-shut-976x304.png').crop((40, 20, 40 + w, 20 + h)); place(c, door, (x, y))
        place(c, master('pods/ring-hatch-80x56.png'), (x + 40, y + 16)); return
    raw = RAW + 'pods-hatch-open-160x260.png'
    if os.path.exists(raw): place(c, Image.open(raw).convert('RGBA'), (x, y))
    else:
        d.rounded_rectangle((x, y, x + w - 1, y + h - 1), 6, fill=(36, 34, 33))
        for i in range(6):
            wx, wy = x + 10 + (i % 2) * 74, y + 10 + (i // 2) * 74
            d.rounded_rectangle((wx, wy, wx + 65, wy + 65), 8, fill=(26, 24, 23), outline=(58, 64, 58))
            d.line((wx + 8, wy + 1, wx + 57, wy + 1), fill=(14, 12, 12))
        d.rectangle((x + 8, y + h - 28, x + w - 9, y + h - 9), fill=(28, 26, 25), outline=(58, 64, 58))   # the find strip
    use_raw = os.path.exists(raw)
    RAWWELLS = [(49, 60), (103, 58), (49, 120), (103, 119), (50, 180), (104, 182)]   # well centres measured on the studio's open hatch
    for i, (p, lit) in enumerate(wells):
        if p is None: continue
        if use_raw: wcx, wcy = x + RAWWELLS[i][0], y + RAWWELLS[i][1]
        else: wcx, wcy = x + 10 + (i % 2) * 74 + 33, y + 10 + (i // 2) * 74 + 33
        if lit:   # the well lights mint
            soft_glow(c, wcx, wcy, 40, 40, PAL['mint'], 0.4, 1.5)
            ImageDraw.Draw(c).ellipse((wcx - 25, wcy - 25, wcx + 25, wcy + 25), outline=PAL['mint'], width=2)
        if p != 'free': place(c, p, (wcx - 20, wcy - 26))
def waiting(c, pods):
    x, y, w, h = WAIT; d = ImageDraw.Draw(c)
    d.rounded_rectangle((x, y, x + w - 1, y + h - 1), 8, fill=(56, 62, 54), outline=(84, 96, 82))   # a plain mat on the floor
    d.line((x + 8, y + 1, x + w - 9, y + 1), fill=(40, 44, 38))
    pw, ph = pods[0].size if pods else (0, 0); gap = 8; n = len(pods)
    for i, p in enumerate(pods):                                  # stored pods keep the wells' size, oldest at the left
        px = x + (w - (3 * pw + 2 * gap)) // 2 + i * (pw + gap)   # three fixed places; a newcomer settles at the right
        place(c, master('pods/cargo-store-shadow-48x14.png'), (px + (pw - 48) // 2, y + h - 22)); place(c, p, (px, y + h - ph - 14))
def display(c, items):
    x, y, w, h = DISPLAY; d = ImageDraw.Draw(c)
    for kind, obj, px, extra in items:
        if kind == 'pod':
            place(c, obj, (x + px, y + h - 112 - 20))
            if extra == 'new': place(c, master('pods/glint-star-12x12.png'), (x + px + 78, y + h - 112 - 24))
        elif kind == 'mat':
            place(c, master('pods/cargo-store-shadow-72x21.png'), (x + px, y + h - 30)); place(c, obj, (x + px, y + h - 96 - 20))
        elif kind == 'count':
            d.text((x + px, y + h - 60), obj, font=font(500, 22), fill=PAL['bone'], anchor='lm')

def counters(vals):
    def draw(d, xr):
        im = d._image; x = xr
        for fn, n in reversed(list(zip([icon_bolt, icon_flower, icon_diamond], vals))):
            t = str(n); tw = d.textlength(t, font=font(500, 14)); d.text((x, 20), t, font=font(500, 14), fill=PAL['bone'], anchor='rm'); x -= tw + 4
            fn(im, int(x - 16), 12); x -= 16 + 14
    return draw
def still(name, content, verb, middle, vals):
    im = Image.new('RGBA', (1024, 600), (*PAL['ground'], 255))
    frame(im, 'Bay', counters(vals))
    window(im, BX, BY, BW, BH, content)
    bottom(im, verb, 'Home', middle)
    im.convert('RGB').save(OUT + name)

ENERGY, DATA, ESSENCE = master('pods/cargo-energy-72x96.png'), master('pods/cargo-data-72x96.png'), master('pods/cargo-essence-72x96.png')
OLD = [(WELL_L, False), (WELL_L, False), (WELL_T, False), (WELL_L, False)]

def bay_light(c):   # the bay's one light, from the top left, over the back wall
    soft_glow(c, 300, 20, 520, 200, (255, 226, 180), 0.10, 1.6)

# 1. at rest: three crates in their berths, the hatch shut, one older pod waiting for a well (at the wells' size)
c = bay_base(); bay_light(c); [berth(c, *b, crate=CRATE) for b in BERTHS]; hatch(c, 'shut'); waiting(c, [WELL_L])
still('cargo-rest.png', c, 'Open them all', 'a pod waits for a well', (12, 30, 3))

# 2. a crate open: the lid lifts in its berth, contents risen in the display. The hatch is open: the waiting pod took the
#    first free well (oldest first, its well lit), and the crate's Loika pod is mid-arc to the last free well, whole and
#    at the display's size; it swaps to the well's size by the house dither as it lands. The Tuikis pod has no well left.
c = bay_base(); bay_light(c); berth(c, *BERTHS[0], crate='lifting'); berth(c, *BERTHS[1], crate=CRATE); berth(c, *BERTHS[2], crate=CRATE)
hatch(c, 'open', OLD + [(WELL_L, True), ('free', True)]); waiting(c, [])
display(c, [('pod', POD_T, 176, 'new'), ('mat', ENERGY, 336, None), ('mat', ENERGY, 420, None), ('count', '2', 504, None), ('mat', ESSENCE, 568, None), ('count', '1', 652, None)])
place(c, POD_L, (150, 4))                      # mid-arc, between the display and the hatch, above the hatch's free well
still('cargo-crate-open.png', c, 'Skip', None, (12, 30, 3))

# 3. the end: every crate closed and dimmed (by value only, so they stay the crates' yellow); the hatch stays open with
#    the two new arrivals lit; the Tuikis pod waits for a well
c = bay_base(); bay_light(c); [berth(c, *b, crate=CRATE, lit=0.72) for b in BERTHS]
hatch(c, 'open', OLD + [(WELL_L, True), (WELL_L, True)]); waiting(c, [WELL_T])
still('cargo-end.png', c, 'Look at the pods', 'a pod waits for a well', (14, 30, 4))
print('ok')
