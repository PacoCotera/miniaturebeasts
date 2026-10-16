# Fix 6 A3: icon-wait-16, the bud's wait on Create's Grow line: a 16x16 hourglass in sand and bark, typed by hand, 0 MXN.
# Light from the top left: the caps' lit edge in clay, a paper glint on the glass's left; the sand runs top to bottom.
# usage: python3 -I make-icon-wait.py OUT_DIR
import sys, os
from PIL import Image
P = dict(B='#7d5435', L='#bf9157', S='#e6c98c', C='#bf9157', P='#f5e6c4')
G = ["................",
     "..LLLLLLLLLLLL..",
     "..BBBBBBBBBBBB..",
     "...BPSSSSSSSB...",
     "...BPSSSSSSSB...",
     "....BPSSSSSB....",
     ".....BSSSSB.....",
     "......BSSB......",
     "......B.SB......",
     ".....B..S.B.....",
     "....B...S..B....",
     "...BP...S...B...",
     "...BP..CSC..B...",
     "...BCSSSSSSCB...",
     "..BBBBBBBBBBBB..",
     "................"]
assert all(len(r) == 16 for r in G) and len(G) == 16
im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
for y, r in enumerate(G):
    for x, ch in enumerate(r):
        if ch != '.': h = P[ch]; im.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
os.makedirs(sys.argv[1], exist_ok=True); im.save(os.path.join(sys.argv[1], 'icon-wait-16.png'))
