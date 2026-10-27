"""0 MXN: the retired words wiped by hand from the website's Station concept shots ("Hopper", a name from another franchise;
the key words, since keys carry no words, ruling of 10-10, HABITAT a retired room), and the Caddy shots cut from the new kit.
usage: python3 -I tools/website-words.py -> source/website/*.png"""
from PIL import Image
import numpy as np, os
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'; A = '/home/user/docs1/art/concept-homepage/'; W = '/home/user/docs1/website/assets/'
def clear(img, x0, x1, top, h):
    a = np.array(img.convert('RGB')).astype(np.float32)
    for x in range(x0, x1):
        t = int(round(top(x))); up = a[t-3:t, x].mean(axis=0); dn = a[t+h:t+h+3, x].mean(axis=0)
        for i, y in enumerate(range(t, t + h)):
            f = (i + 0.5) / h; a[y, x] = up * (1 - f) + dn * f
    return Image.fromarray(a.astype(np.uint8))
def clear_h(img, x0, x1, top, h, guard=False):
    # on a screen's flat ground: each row of the band blended between the ground just left and right of the word;
    # guard: a side sample that is not ground (it caught the line of text below, which left a faint light line over
    # "Needs 2 more Essence") is replaced by the ground just above the band on that side
    a = np.array(img.convert('RGB')).astype(np.float32)
    lum = lambda c: c @ np.array([.299, .587, .114], np.float32)
    gl = a[int(round(top(x0)))-4:int(round(top(x0)))-1, x0-4:x0-1].reshape(-1, 3).mean(axis=0)
    gr = a[int(round(top(x1)))-4:int(round(top(x1)))-1, x1+1:x1+4].reshape(-1, 3).mean(axis=0)
    for x in range(x0, x1):
        t = int(round(top(x)))
        for y in range(t, t + h):
            l = a[y, x0-4:x0-1].mean(axis=0); r = a[y, x1+1:x1+4].mean(axis=0); f = (x - x0 + 0.5) / (x1 - x0)
            if guard and abs(lum(l) - lum(gl)) > 2: l = gl
            if guard and abs(lum(r) - lum(gr)) > 2: r = gr
            a[y, x] = l * (1 - f) + r * f
    return Image.fromarray(a.astype(np.uint8))
src = A + 'station-research-hands.png' if os.path.exists(A + 'station-research-hands.png') else W + 'station-research-hands.webp'
im = Image.open(src).convert('RGB'); assert im.size == (1536, 1024), im.size
im = clear_h(im, 524, 718, lambda x: 518 + 0.08 * (x - 524), 40, guard=True)  # Hopper pod
im = clear_h(im, 882, 1052, lambda x: 551 + 0.1 * (x - 882), 34)          # Hopper · known
im = clear(im, 495, 900, lambda x: 771 + 0.105 * (x - 500), 32)          # the key words
im.save(P + 'source/website/station-research-hands-2026-10.png')
im = Image.open(W + 'strip-station.webp').convert('RGB')
im = clear_h(im, 198, 352, lambda x: 406 + 0.03 * (x - 198), 34, guard=True)   # Hopper pod, from row 406 so the H's top row goes too
im = clear_h(im, 478, 614, lambda x: 430 + 0.08 * (x - 478), 30)
im = clear(im, 180, 488, lambda x: 602 + 0.11 * (x - 180), 24)
im.save(P + 'source/website/strip-station-2026-10.png')
kit = Image.open(P + 'source/website/hero-kit-2026-10-1536x1024.png').convert('RGB')
kit.crop((940, 620, 1344, 1024)).save(P + 'source/website/strip-caddy-2026-10.png')        # the print and its buttons
kit.crop((700, 520, 1440, 1013)).save(P + 'source/website/caddy-print-2026-10.png')        # 740x493, 3:2
kit.crop((356, 686, 930, 858)).save(P + 'source/website/caddy-summary-epaper-2026-10.png') # the e-ink panel
print('ok', src)
