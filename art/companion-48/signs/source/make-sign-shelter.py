# The shelter sign picture: 32x32 on the core 48, from meadow/face/wall-1x2-h14 rect (8,0,32,32), hand-remapped; underside and open space added.
# usage: python3 -I make-sign-shelter.py MEADOW_WALLS_PNG PALETTE_JSON OUT_DIR
import sys, json
from PIL import Image
walls, palf, out = sys.argv[1:4]
pal = json.load(open(palf))['colours']; IDX = {c['name']: c['index'] for c in pal}; RGB = [tuple(c['rgb']) for c in pal]
piece = Image.open(walls).convert('RGBA').crop((392 + 8, 0, 392 + 40, 96))
# rows: the top lawn (piece rows 0-2), the hanging grass fringe (9-14), the face (15-26): the lip kept thin so the face reads
ROWS = list(range(0, 3)) + list(range(9, 15)) + list(range(15, 27))
src = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
for y, r in enumerate(ROWS): src.paste(piece.crop((0, r, 32, r + 1)), (0, y))
sp = src.load()
MAP = {(108,168,56):'sprout', (97,157,59):'grass', (92,187,76):'grass', (79,145,58):'leaf', (65,131,56):'leaf', (50,146,69):'leaf', (114,127,61):'leaf',
       (23,59,45):'pine', (43,59,52):'pine', (36,62,35):'pine',
       (73,65,77):'stone', (99,89,103):'rock', (61,57,84):'slate', (41,37,58):'night', (65,50,45):'soil', (122,88,61):'bark', (95,70,49):'soil'}
T = -1; g = [[T] * 32 for _ in range(32)]
for y in range(32):
    for x in range(32):
        r, gg, b, a = sp[x, y]
        if a == 0: g[y][x] = IDX['grass'] if y < 3 else T          # the apron notches: the upper lawn closes over them
        else: g[y][x] = IDX[MAP[(r, gg, b)]]
for x in range(32): g[0][x] = IDX['sprout'] if g[0][x] != T else T  # the lit top edge, daylight from above
for x in range(0, 14): g[1][x] = IDX['sprout']                     # brighter toward the top left
# the overhang's belly: face to row 20, then the underside undercut and darker, then open space
for y in range(21, 32):  # below the face
    for x in range(32): g[y][x] = T
inset = {21: 0, 22: 1, 23: 3}
for y, k in inset.items():
    for x in range(k, 32 - k): g[y][x] = IDX['soil']
for x in range(1, 31): g[20][x] = IDX['slate'] if g[20][x] in (IDX['stone'], IDX['rock']) else g[20][x]   # the face turns under
for x, n in ((7, 3), (15, 4), (16, 2), (24, 3)):                    # root drips from the underside into the open space
    for y in range(24, 24 + n): g[y][x] = IDX['soil'] if y == 24 else IDX['bark']
pic = Image.new('P', (32, 32)); flat = []
for c in RGB: flat += list(c)
pic.putpalette(flat)   # exactly the core 48 in PLTE, no padding
TR = IDX['magenta']   # the transparent slot: magenta (unused in the art), declared transparent in tRNS
pic.putdata([TR if v == T else v for row in g for v in row]); pic.info['transparency'] = TR
pic.save(out + '/sign-shelter-32.png', transparency=TR)
