# Top-down diagrams of what a place holds (code-drawn schematics, rule 18: diagrams may be code; nothing here is a game picture). One image a place: today's props and finds on the left, the greybox on the right,
# with the ways in, the spine (the paths the player will walk) and the set pieces' cells drawn.
# usage: python3 gen7-places-diagram.py <dump.json> <out dir>
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

places, outdir = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(outdir, exist_ok=True)
F, FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f_head, f_txt, f_small, f_tiny = ImageFont.truetype(FB, 20), ImageFont.truetype(F, 14), ImageFont.truetype(F, 12), ImageFont.truetype(FB, 10)
S = 18
LOW, PATH, RAISED, APRON, FACE, INK = (231, 233, 214), (214, 192, 152), (176, 200, 140), (200, 200, 200), (110, 80, 50), (40, 40, 40)
WATER, THICKET, SAND = (150, 190, 215), (70, 110, 70), (232, 220, 170)
SWEEP, TREE, ROCK, BUSH = (150, 190, 110), (40, 110, 60), (130, 130, 130), (90, 160, 90)
SPINE, SIGHT, WAYIN, WAYUP = (200, 120, 40), (40, 120, 220), (230, 60, 60), (230, 140, 30)
CELL = {'R': (122, 90, 58), 'S': (68, 74, 102), 'L': (176, 48, 106), 'O': (90, 58, 26), 'h': (74, 134, 200), 'p': (138, 63, 176), 'm': (47, 157, 90), 'k': (58, 111, 208), 'c': (58, 111, 208), 'x': (17, 17, 17)}
FIND = {'pod': (140, 70, 170), 'fruit': (220, 90, 60), 'dew': (60, 160, 210), 'stone': (70, 110, 170), 'material': (200, 170, 60)}
NAME = {'R': 'wall', 'S': 'slab', 'L': 'stone', 'O': 'roof', 'h': 'shelter', 'p': 'pod slot', 'm': 'find slot', 'k': 'stone slot', 'c': 'stone slot (last)', 'x': 'bare'}

def draw_one(p):
    W, H, T = p['w'], p['h'], p['terrain']
    PW, PH = W * S, H * S
    img = Image.new('RGB', (2 * PW + 60 + 330, PH + 150), (250, 248, 242))
    g = ImageDraw.Draw(img)
    g.text((20, 14), f"seed {p['seed']}, place {p['X']},{p['Y']} ({p['land']}): today, and with the set pieces in plain blocks", font=f_head, fill=INK)
    Y0 = 56
    lvl = lambda x, y: 1 if T[y * W + x] == 8 else 0
    inb = lambda x, y: 0 <= x < W and 0 <= y < H
    def ground(ox):
        for y in range(H):
            for x in range(W):
                t = T[y * W + x]
                c = RAISED if t == 8 else PATH if t == 5 else WATER if t in (1, 2) else THICKET if t == 9 else SAND if t == 3 else LOW
                px, py = ox + x * S, Y0 + y * S
                g.rectangle([px, py, px + S - 1, py + S - 1], fill=c)
        for y in range(H):
            for x in range(W):
                if lvl(x, y) != 1: continue
                px, py = ox + x * S, Y0 + y * S
                if inb(x, y + 1) and lvl(x, y + 1) == 0: g.rectangle([px, py + S - 4, px + S - 1, py + S - 1], fill=FACE)
                if inb(x + 1, y) and lvl(x + 1, y) == 0: g.line([px + S - 1, py, px + S - 1, py + S - 1], fill=FACE, width=2)
                if inb(x - 1, y) and lvl(x - 1, y) == 0: g.line([px, py, px, py + S - 1], fill=FACE, width=2)
                if inb(x, y - 1) and lvl(x, y - 1) == 0: g.line([px, py, px + S - 1, py], fill=FACE, width=2)
        for y in range(H):
            for x in range(W):
                if 1 <= x <= W - 2 and 1 <= y <= H - 2: continue
                px, py = ox + x * S, Y0 + y * S
                g.rectangle([px, py, px + S - 1, py + S - 1], fill=APRON)
        g.rectangle([ox + S, Y0 + S, ox + (W - 1) * S - 1, Y0 + (H - 1) * S - 1], outline=INK, width=2)
        for a in p['wayups']:
            px, py = ox + a['x'] * S, Y0 + a['y'] * S
            g.rectangle([px, py + 2, px + a['w'] * S - 1, py + 2 * S - 3], fill=WAYUP, outline=INK)
            g.text((px + 3, py + 4), 'UP', font=f_tiny, fill=INK)
    def ctr(ox, x, y): return ox + x * S + S // 2, Y0 + y * S + S // 2
    def props(ox, v):
        for x, y, fam, kind in v['props']:
            if not (0 <= x < W and 0 <= y < H): continue
            cx, cy = ctr(ox, x, y)
            if fam == 'sweeps': g.line([cx - 5, cy - 4, cx - 1, cy + 4, cx + 4, cy - 5], fill=SWEEP, width=2)
            elif fam == 'trees': g.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=TREE)
            elif fam in ('rocks', 'ground') or kind == 'split-stone': g.ellipse([cx - 6, cy - 5, cx + 6, cy + 5], fill=ROCK, outline=INK)
            elif fam == 'bushes': g.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=BUSH)
            else: g.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=(150, 110, 70))
        for x, y, k in v['finds']:
            cx, cy = ctr(ox, x, y); g.polygon([(cx, cy - 7), (cx + 7, cy), (cx, cy + 7), (cx - 7, cy)], fill=FIND.get(k, (0, 0, 0)), outline=INK)
    ox1, ox2 = 20, 20 + PW + 40
    ground(ox1); props(ox1, p['before'])
    ground(ox2)
    z, zw = p['zone']['data'], p['zone']['zw']
    for y in range(-4, H + 4):
        for x in range(-4, W + 4):
            v = z[(y + 4) * zw + x + 4]
            if v and 0 <= x < W and 0 <= y < H:
                px, py = ox2 + x * S, Y0 + y * S
                ov = Image.new('RGBA', (S, S), (240, 180, 60, 70 if v == 1 else 40)); img.paste(ov, (px, py), ov)
    props(ox2, p['after'])
    for x, y in p['spine']:
        cx, cy = ctr(ox2, x, y); g.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=SPINE)
    for s in p['spots']:
        g.rectangle([ox2 + s['x'] * S, Y0 + s['y'] * S, ox2 + (s['x'] + s['w']) * S - 1, Y0 + (s['y'] + s['h']) * S - 1], outline=(224, 64, 122), width=2)
        for x, y, k in s['cells']:
            px, py = ox2 + x * S, Y0 + y * S
            g.rectangle([px + 2, py + 2, px + S - 3, py + S - 3], outline=CELL.get(k, (90, 90, 90)), width=2)
        g.text((ox2 + s['x'] * S + 2, Y0 + s['y'] * S - 13), s['id'] + (' (heart)' if s['role'] == 'heart' else ''), font=f_tiny, fill=(224, 64, 122))
        if s['role'] == 'heart' and s['seenFrom']:
            sx, sy = s['seenFrom']; cx, cy = ctr(ox2, sx, sy); hx, hy = ctr(ox2, s['x'] + s['w'] // 2, s['y'] + s['h'] // 2)
            g.line([cx, cy, hx, hy], fill=SIGHT, width=2)
    for e in p['entries']:
        cx, cy = ctr(ox2, e['at'][0], e['at'][1]); g.rectangle([cx - 6, cy - 6, cx + 6, cy + 6], fill=WAYIN, outline=INK)
    g.text((ox1, Y0 + PH + 6), 'today: trees, rocks, bushes, tall grass; finds as diamonds', font=f_small, fill=INK)
    g.text((ox2, Y0 + PH + 6), 'with the set pieces: spine (orange dots), ways in (red), sight line to the heart (blue), quiet ground (shaded)', font=f_small, fill=INK)
    kx = ox2 + PW + 30; ky = Y0
    g.text((kx, ky), 'Key', font=f_head, fill=INK); ky += 30
    for lab, col in [('way in', WAYIN), ('spine', SPINE), ('sight line', SIGHT), ('way up', WAYUP)]:
        g.rectangle([kx, ky, kx + 14, ky + 14], fill=col, outline=INK); g.text((kx + 22, ky), lab, font=f_txt, fill=INK); ky += 22
    ky += 8
    for k in ['R', 'S', 'L', 'O', 'h', 'p', 'm', 'k', 'c', 'x']:
        g.rectangle([kx + 2, ky + 2, kx + 12, ky + 12], outline=CELL[k], width=2); g.text((kx + 22, ky), NAME[k], font=f_txt, fill=INK); ky += 20
    ky += 8
    for k, col in FIND.items():
        g.polygon([(kx + 7, ky), (kx + 14, ky + 7), (kx + 7, ky + 14), (kx, ky + 7)], fill=col, outline=INK); g.text((kx + 22, ky), 'find: ' + k, font=f_txt, fill=INK); ky += 20
    return img

for i, p in enumerate(places, 1):
    name = f"diagram-{p['seed']}-{p['X']}-{p['Y']}-{p['land']}.png"
    draw_one(p).save(os.path.join(outdir, name)); print(name)
