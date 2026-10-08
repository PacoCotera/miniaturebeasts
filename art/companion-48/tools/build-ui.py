"""HUD icons, key caps, condition bolts, 9-slices and the warned-strike outline, scripted on the ramps.
usage: python3 -I build-ui.py OUT_DIR [PROPS_DIR]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pb import PB, C, rounded_panel
import font, quant

out = sys.argv[1]; props = sys.argv[2] if len(sys.argv) > 2 else out
os.makedirs(out, exist_ok=True); os.makedirs(props, exist_ok=True)
pieces = {}

def icon(name, w, h, draw, outline=True):
    pb = PB(w, h); draw(pb)
    if outline: pb.outline()
    pieces[name] = pb

# Energy: a cut gem, amber with a yellow upper facet and an orange lower one
icon("icon-energy", 16, 16, lambda pb: (pb.poly([[8, 0], [15.5, 8], [8, 16], [.5, 8]], C["amber"]), pb.poly([[8, 0], [15.5, 8], [8, 8]], C["yellow"]), pb.poly([[.5, 8], [8, 16], [8, 8]], C["orange"])))
# Data: a blue card with two white lines and a river foot
def data(pb):
    pb.rect(1, 1, 14, 14, C["sky"]); pb.rect(0, 2, 16, 12, C["sky"]); pb.rect(2, 0, 12, 16, C["sky"])
    pb.rect(3, 4, 10, 2, C["white"]); pb.rect(3, 8, 6, 2, C["white"]); pb.rect(2, 13, 12, 2, C["river"])
icon("icon-data", 16, 16, data)
# Essence: a green drop with a white glint
def essence(pb):
    pb.poly([[8, 0], [14.5, 10], [8, 16], [1.5, 10]], C["grass"]); pb.ell(8, 10.5, 6.2, 5.2, C["grass"], sh=[C["lime"], C["leaf"]]); pb.poly([[8, 0], [11, 6], [8, 7], [5, 6]], C["grass"]); pb.rect(5, 7, 2, 2, C["white"])
icon("icon-essence", 16, 16, essence)
# Shield: a plate, bone with a fog foot; gone: a stone rim around ink
icon("icon-shield", 16, 16, lambda pb: (pb.poly([[1, 1], [15, 1], [15, 8], [8, 15.5], [1, 8]], C["bone"]), pb.poly([[2, 9], [14, 9], [8, 14.5]], C["fog"])))
def shield_gone(pb):
    pb.poly([[1, 1], [15, 1], [15, 8], [8, 15.5], [1, 8]], C["stone"]); pb.poly([[3, 3], [13, 3], [13, 7.5], [8, 12.5], [3, 7.5]], C["ink"])
icon("icon-shield-gone", 16, 16, shield_gone)
# Pod: the shell, bone, shaded slate, a mint glint; free slot: a dotted ring in mist
icon("icon-pod", 16, 16, lambda pb: (pb.ell(8, 8.5, 5.5, 7.2, C["bone"], sh=[C["white"], C["fog"]]), pb.rect(6, 4, 1, 2, C["white"])))
def free_slot(pb):
    for a in np.arange(0, 6.28, .42): pb.set(8 + np.cos(a) * 5, 8.5 + np.sin(a) * 6.5, C["mist"])
icon("icon-free-slot", 16, 16, free_slot, outline=False)
# World turn: a small sun
def sun(pb):
    pb.ell(8, 8, 3.6, 3.6, C["amber"])
    for x, y in [[7.5, 1], [7.5, 14], [1, 7.5], [14, 7.5], [2.5, 2.5], [12.5, 2.5], [2.5, 12.5], [12.5, 12.5]]: pb.rect(int(x), int(y), 1 if x in (7.5, 1, 14) or y in (7.5,) else 1, 1, C["yellow"])
    for x, y in [[7, 0], [8, 0], [7, 15], [8, 15], [0, 7], [0, 8], [15, 7], [15, 8]]: pb.set(x, y, C["yellow"])
icon("icon-world-turn", 16, 16, sun, outline=False)
# Call: three arcs from a source at the left
def call(pb):
    pb.rect(0, 7, 2, 2, C["yellow"])
    for r in [4.5, 8.5, 12.5]:
        for a in np.arange(-.85, .86, .04): pb.set(1 + np.cos(a) * r, 8 + np.sin(a) * r * .9, C["yellow"])
icon("icon-call", 16, 16, call, outline=False)
# Storm: the bolt, yellow (frame 1) and cream (the peak's flicker), hollow bolt: a found warm stone
def bolt(col):
    return lambda pb: pb.poly([[8, 0], [1, 9], [6, 9], [3, 16], [11, 6], [6, 6], [9, 0]], C[col])
icon("icon-storm", 12, 16, bolt("yellow")); icon("icon-storm-peak", 12, 16, bolt("cream"))
def hollow(pb):
    a = PB(14, 17); a.poly([[9, 0], [0, 10], [6, 10], [3, 17], [14, 6], [8, 6], [12, 0]], C["yellow"])
    for y in range(17):
        for x in range(14):
            if a.get(x, y) >= 0:
                inside = all(a.get(x + dx, y + dy) >= 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                pb.set(x, y, C["ink"] if inside else C["yellow"])
icon("icon-hollow-bolt", 14, 17, hollow)
# Fog bank: a Bayer square of fog over ink
def fogbank(pb):
    B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for y in range(12):
        for x in range(12): pb.set(x + 2, y + 2, C["fog"] if B[y % 4][x % 4] < 8 else C["bone"])
icon("icon-fog-bank", 16, 16, fogbank, outline=False)
# Pin, battery, radio as the page draws them
icon("icon-pin", 16, 22, lambda pb: (pb.rect(2, 1, 2, 20, C["bone"]), pb.poly([[4, 1], [15, 5.5], [4, 10]], C["orange"]), pb.poly([[4, 6], [15, 5.5], [4, 10]], C["rust"]), pb.ell(3, 20, 3, 1.5, C["slate"])))
icon("icon-battery", 16, 10, lambda pb: (pb.rect(0, 0, 14, 10, C["mist"]), pb.rect(1, 1, 12, 8, C["ink"]), pb.rect(14, 3, 2, 4, C["mist"]), pb.rect(2, 2, 4, 6, C["mint"]), pb.rect(7, 2, 4, 6, C["mint"])), outline=False)
icon("icon-radio", 10, 10, lambda pb: [pb.rect(i * 3 + (0 if i < 3 else 0), 10 - h, 2, h, C["mist"] if i < 2 else C["stone"]) for i, h in enumerate([3, 6, 10])], outline=False)
# Bond: two linked rings in amber; crate: a sealed box
def bond(pb):
    for cx in (5, 11):
        for a in np.arange(0, 6.3, .12): pb.set(cx + np.cos(a) * 4.2, 8 + np.sin(a) * 4.2, C["amber"])
icon("icon-bond", 16, 16, bond, outline=False)
def crate(pb):
    pb.rect(1, 3, 14, 12, C["bark"]); pb.rect(1, 3, 14, 3, C["clay"]); pb.rect(7, 3, 2, 12, C["soil"]); pb.rect(4, 8, 8, 5, C["paper"]); pb.rect(5, 10, 6, 1, C["slate"])
icon("icon-crate", 16, 16, crate)

# Key caps: rounded night caps with a slate rim; the glyph at 2x in the page's colour
def cap(name, text, col):
    s = 2; tw = font.width(text, s); w, h = tw + 12, 24
    pb = rounded_panel(w, h, C["night"], C["slate"]); font.draw(pb.p, text, 6, 3, C[col], s); pieces[name] = pb
cap("cap-confirm", "✓", "orange"); cap("cap-back", "←", "fog"); cap("cap-call", "Call", "bone")
# Condition bolts: the drift arrows at 2x, yellow for the storm, fog for the fog bank
for nm, ch, col in [("cond-storm-left", "◀", "yellow"), ("cond-storm-right", "▶", "yellow"), ("cond-fog-left", "◀", "fog"), ("cond-fog-right", "▶", "fog")]:
    pb = PB(font.width(ch, 2), 18); font.draw(pb.p, ch, 0, 0, C[col], 2); pieces[nm] = pb
# 9-slices, radius 4: corner cells of 5 px, a 6 px middle (16x16)
pieces["slice-message-box"] = rounded_panel(16, 16, C["ink"], C["slate"])
pieces["slice-message-box-danger"] = rounded_panel(16, 16, C["ink"], C["coral"])
pieces["slice-name-tag"] = rounded_panel(16, 16, C["ink"], C["amber"])
pieces["slice-paper"] = rounded_panel(16, 16, C["paper"], C["clay"])

for name, pb in pieces.items():
    pb.save(os.path.join(out, name + ".png"))
# The warned strike: a dashed yellow ring on the tile about to be struck, two dash phases, rust rim
for fr in (1, 2):
    pb = PB(48, 48)
    pts = []
    for a in np.arange(0, 6.2832, .03): pts.append((24 + np.cos(a) * 20, 24 + np.sin(a) * 20))
    for i, (x, y) in enumerate(pts):
        if (i // 7 + fr) % 2: pb.set(x, y, C["yellow"]); pb.set(x + (1 if x > 24 else -1), y, C["yellow"]) if abs(x - 24) > 14 else pb.set(x, y + (1 if y > 24 else -1), C["yellow"])
    pb.outline(C["rust"]) if False else None
    # a 1 px rust rim on every dash
    src = pb.p.copy()
    for y in range(48):
        for x in range(48):
            if src[y, x] < 0 and any(src[y2, x2] >= 0 for y2, x2 in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= y2 < 48 and 0 <= x2 < 48): pb.p[y, x] = C["rust"]
    pb.save(os.path.join(props, f"strike-warn{fr}.png"))
print("ui pieces", len(pieces), "+ strike 2")
