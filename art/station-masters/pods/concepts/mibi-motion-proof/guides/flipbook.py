# 1x proof flipbooks (APNG) from the cut keys, every change on the 80 ms tick, timings from motion-spec.md §2.
# Hop: crouch 160, air 400 (5 ticks, lift = apex x 0.36/0.86/1/0.86/0.36, travel spread over the air ticks,
# shadow on the ground at 100 -> 75 % at the apex), crouch 160, stand 480. Curl: stand, crouch 320, curl.
# Walk (S05): pass, stepA, pass, stepB at 160 ms, in place. usage: flipbook.py keys_dir out_dir
import sys, numpy as np
from PIL import Image
K, O = sys.argv[1:3]
BG = (54, 50, 46); CW, CH = 560, 340; T = 80
def key(n): return Image.open(f'{K}/{n}-304x312.png').convert('RGBA')
def split(im):
    a = np.asarray(im).copy(); body = a[..., 3] == 255
    low = np.where(body.any(1))[0].max()
    sh = (a[..., 3] > 0) & (a[..., 3] <= 110) & (np.arange(a.shape[0])[:, None] > low)
    s = a.copy(); s[~sh] = 0; b = a.copy(); b[sh] = 0
    return Image.fromarray(b), Image.fromarray(s)
def frame(im, x, lift=0, shk=1.0, flip=False):
    c = Image.new('RGBA', (CW, CH), BG + (255,))
    b, s = split(im)
    if flip: b, s = b.transpose(Image.FLIP_LEFT_RIGHT), s.transpose(Image.FLIP_LEFT_RIGHT)
    if shk < 1:
        sa = np.asarray(s).copy(); sa[..., 3] = (sa[..., 3] * shk).astype(np.uint8); s = Image.fromarray(sa)
    c.alpha_composite(s, (x, 20)); c.alpha_composite(b, (x, 20 - lift))
    return c
def hopper(n, crouch, apex, travel, hops=3, x0=20):
    fr = []; x = x0
    fr.append((frame(key(f'{n}-anchor'), x), 640))
    for h in range(hops):
        fr.append((frame(key(f'{n}-{crouch}'), x), 160))
        for i, f in enumerate([.36, .86, 1, .86, .36]):
            x_i = x + round(travel * (i + 1) / 5)
            fr.append((frame(key(f'{n}-air'), x_i, round(apex * f), 1 - .25 * f), T))
        x += travel
        fr.append((frame(key(f'{n}-{crouch}'), x), 160))
        fr.append((frame(key(f'{n}-anchor'), x), 480))
    fr.append((frame(key(f'{n}-{crouch}'), x), 320)); fr.append((frame(key(f'{n}-curl'), x), 1600))
    return fr
def walker(n, x0=120):
    fr = []
    for _ in range(4):
        for c in ['pass', 'stepA', 'pass', 'stepB']: fr.append((frame(key(f'{n}-{c}'), x0), 160))
    fr.append((frame(key(f'{n}-crouch'), x0), 320)); fr.append((frame(key(f'{n}-curl'), x0), 1600))
    return fr
def save(fr, name):
    ims = [f.convert('RGB') for f, _ in fr]
    ims[0].save(f'{O}/{name}.png', save_all=True, append_images=ims[1:], duration=[d for _, d in fr], loop=0)
    strip = Image.new('RGB', (CW * 4, CH), BG)
    picks = [0, 1, 4, len(fr) - 1]
    for i, p in enumerate(picks): strip.paste(ims[p], (i * CW, 0))
    strip.save(f'{O}/{name}-1x-strip.png')
save(hopper('juv-S01', 'crouch', 16, 36), 'juv-S01-hop3-curl')
save(hopper('pip', 'crouch', 22, 48), 'pip-hop3-curl-crouch-a')
save(hopper('pip', 'crouch-b', 22, 48), 'pip-hop3-curl-crouch-b')
save(hopper('grow-b2486', 'crouch', 22, 48), 'grow-b2486-hop3-curl')
save(walker('juv-S05'), 'juv-S05-walk-curl')
