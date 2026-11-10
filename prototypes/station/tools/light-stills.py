#!/usr/bin/env python3
"""Stills of the day cycle, for the art director: every room piece at the four lights, @L50 (warm sun) and @L65 (the cloud); and the Vivarium's window at seven times of day.

Reads the steps the Station derives (tools/light-stills-steps.mjs > steps.json) and the signed room paintings in the masters; mixes them with the same arithmetic as mixGrade
(out = round(srgb((lin(a)(1-w) + lin(b)w) * gain)), alpha from a). It draws nothing: the sheets only lay the mixed paintings out, with labels.

Usage: light-stills.py STEPS.json MASTERS_DIR OUT_DIR
"""
import sys, json, os, re, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

STEPS = json.load(open(sys.argv[1])); MASTERS = sys.argv[2]; OUT = sys.argv[3]
os.makedirs(OUT, exist_ok=True)
FONT = ImageFont.load_default(size=18)
COLS = ["dawn", "day", "dusk", "night", "@L50", "@L65"]
COLNAME = {"dawn": "dawn", "day": "day", "dusk": "dusk", "night": "night", "@L50": "@L50 warm sun", "@L65": "@L65 cloud"}

def lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)

def srgb(l):
    l = np.clip(l, 0, 1)
    return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255.0

_cache = {}
def load(path):
    if path not in _cache:
        _cache[path] = np.asarray(Image.open(path).convert("RGBA")).astype(float)
    return _cache[path]

def mix(a, b, w, gain):
    out = a.copy()
    out[..., :3] = np.round(srgb((lin(a[..., :3]) * (1 - w) + lin(b[..., :3]) * w) * np.array(gain)))
    return out.astype(np.uint8)

def grade(m, gain):
    out = m.copy()
    out[..., :3] = np.round(srgb(lin(m[..., :3]) * np.array(gain)))
    return out.astype(np.uint8)

def room_file(room, rest, light, size):
    return os.path.join(MASTERS, "rooms", f"room-{room}-{rest}-{light}-{size}.png")

def picture(room, rest, size, col):
    s = STEPS["rooms"][room][col]
    return mix(load(room_file(room, rest, s["a"], size)), load(room_file(room, rest, s["b"], size)), s["w"], s["gain"])

def sheet(room, items, name):
    """items: [(label, rest, size)]; rows an item, columns the six lights; a flat grey ground so alpha reads."""
    cw = [max(int(it[2].split("x")[0]) for it in items)] * 1
    cellw = max(int(it[2].split("x")[0]) for it in items) + 12
    rows = [(it, int(it[2].split("x")[1]) + 28) for it in items]
    W = 200 + cellw * len(COLS); H = 40 + sum(h for _, h in rows) + 8
    im = Image.new("RGBA", (W, H), (110, 110, 110, 255)); d = ImageDraw.Draw(im)
    for c, col in enumerate(COLS): d.text((200 + c * cellw + 4, 8), COLNAME[col], fill=(255, 255, 255, 255), font=FONT)
    y = 40
    for (label, rest, size), h in rows:
        d.text((8, y + 4), f"{label}", fill=(255, 255, 255, 255), font=FONT); d.text((8, y + 26), size, fill=(220, 220, 220, 255), font=FONT)
        for c, col in enumerate(COLS):
            p = Image.fromarray(picture(room, rest, size, col), "RGBA"); im.alpha_composite(p, (200 + c * cellw + 4, y + 2))
        y += h
    im.convert("RGB").save(os.path.join(OUT, name))

def big(room, rest, size, name):
    w, h = map(int, size.split("x")); cols = 3; lab = 28
    im = Image.new("RGBA", (cols * w, 2 * (h + lab)), (110, 110, 110, 255)); d = ImageDraw.Draw(im)
    for c, col in enumerate(COLS):
        x, y = (c % cols) * w, (c // cols) * (h + lab)
        d.text((x + 6, y + 4), f"{room} {rest} {COLNAME[col]}", fill=(255, 255, 255, 255), font=FONT)
        im.alpha_composite(Image.fromarray(picture(room, rest, size, col), "RGBA"), (x, y + lab))
    im.convert("RGB").save(os.path.join(OUT, name))

# every piece of every room: files room-<room>-<piece>-<light>-<w>x<h>.png (the day file names the set)
for room in STEPS["rooms"]:
    pieces = {}
    for f in sorted(glob.glob(os.path.join(MASTERS, "rooms", f"room-{room}-*-day-*.png"))):
        m = re.match(rf"room-{room}-(.+)-day-(\d+x\d+)\.png$", os.path.basename(f))
        if m: pieces[m.group(1)] = m.group(2)
    for big_piece in ("idle", "near"):
        if big_piece in pieces: big(room, big_piece, pieces[big_piece], f"{room}-{big_piece}.png")
    small = [(k, k, v) for k, v in pieces.items() if k not in ("idle", "near")]
    if small: sheet(room, small, f"{room}-pieces.png")

# the Vivarium's window (rows 120..560 of the idle painting) at seven times of day, three adult residents graded by the step
for t, H in STEPS["hours"].items():
    for room in ("roots", "ferns"):
        s = H["rooms"][room]
        bg = mix(load(room_file(room, "idle", s["a"], "1024x568")), load(room_file(room, "idle", s["b"], "1024x568")), s["w"], s["gain"])
        im = Image.fromarray(bg, "RGBA")
        for i, sp in enumerate(("S01", "S02", "S03")):
            m = load(os.path.join(MASTERS, "pods", f"mibi-adult-{sp}-144x152.png"))
            im.alpha_composite(Image.fromarray(grade(m, H["resident"]), "RGBA"), (120 + i * 300, 568 - 152 - 60))
        im.crop((0, 120, 1024, 560)).convert("RGB").save(os.path.join(OUT, f"vivarium-{room}-{t.replace(':', '')}.png"))
print("done")
