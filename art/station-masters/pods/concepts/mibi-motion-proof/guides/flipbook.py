# 1x proof flipbooks (APNG) from the baked keys, every change on the 80 ms tick, timings from motion-spec.md §2:
# breath in every stand hold (juvenile 2.40 s: b0 880, b1 240, b2 800, b1 480; adult 2.88 s: 1040, 320, 960, 560) on one
# clock; hop = crouch 160, air 400 (5 ticks, lift = apex x .36/.86/1/.86/.36 on the grounded air key, travel over the air
# ticks, the shadow on the ground at 100 -> 75 %), crouch 160, stand 480; to sleep: crouch 320, a 16-level ordered dither
# into the curl over 180 ms, asleep (curl / curl-b1 on a 4.8 s breath). Walk (S05, the quick class): pass 80, steps 160.
# usage: flipbook.py keys_dir out_dir
import sys, numpy as np
from PIL import Image
K, O = sys.argv[1:3]
BG = (54, 50, 46); CW, CH = 560, 340; T = 80
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
BREATH = {'juvenile': [(0, 880), (1, 240), (2, 800), (1, 480)], 'adult': [(0, 1040), (1, 320), (2, 960), (1, 560)]}
_c = {}
def key(n):
    if n not in _c: _c[n] = Image.open(f'{K}/{n}-304x312.png').convert('RGBA')
    return _c[n]
def split(im):
    a = np.asarray(im).copy(); al = a[..., 3]
    sh = (al > 0) & (al <= 110) & (np.abs(a[..., :3].astype(int) - [30, 26, 34]).max(-1) <= 10)
    s = a.copy(); s[~sh] = 0; b = a.copy(); b[sh] = 0
    return Image.fromarray(b), Image.fromarray(s)
def frame(im, x, lift=0, shk=1.0):
    c = Image.new('RGBA', (CW, CH), BG + (255,)); b, s = split(im)
    if shk < 1:
        sa = np.asarray(s).copy(); sa[..., 3] = (sa[..., 3] * shk).astype(np.uint8); s = Image.fromarray(sa)
    c.alpha_composite(s, (x, 20)); c.alpha_composite(b, (x, 20 - lift))
    return c
def air(n, x, lift, shk):                                            # the air key: the body alone rises; the ground shadow (the stand's) stays
    c = Image.new('RGBA', (CW, CH), BG + (255,))
    sa = np.asarray(key(f'{n}-air-shadow')).copy(); sa[..., 3] = (sa[..., 3] * shk).astype(np.uint8)
    c.alpha_composite(Image.fromarray(sa), (x, 20)); c.alpha_composite(key(f'{n}-air-body'), (x, 20 - lift))
    return c
def dither(fa, fb, level):                                            # level 1..16 of fb shown over fa
    a, b = np.asarray(fa), np.asarray(fb); h, w = a.shape[:2]
    m = (np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] < level)[..., None]
    return Image.fromarray(np.where(m, b, a))
class Book:
    def __init__(s, n, stage): s.n, s.stage, s.fr, s.t = n, stage, [], 0
    def add(s, im, d): s.fr.append((im, d)); s.t += d
    def breath_step(s, t):
        cyc = BREATH[s.stage]; per = sum(d for _, d in cyc); t %= per
        for b, d in cyc:
            if t < d: return b
            t -= d
    def stand(s, k, x, ms):                                           # a hold that breathes, tick by tick
        for _ in range(ms // T):
            b = s.breath_step(s.t); s.add(frame(key(f'{s.n}-{k}' + (f'-b{b}' if b else '')), x), T)
    def sleep(s, x, ms):
        for i in range(ms // T):
            b = 1 if (s.t % 4800) >= 2400 else 0; s.add(frame(key(f'{s.n}-curl' + ('-b1' if b else '')), x), T)
def hopper(n, stage, crouch, apex, travel, hops=3, x=20):
    bk = Book(n, stage); bk.stand('anchor', x, 1200)
    for _ in range(hops):
        bk.add(frame(key(f'{n}-{crouch}'), x), 160)
        for i, f in enumerate([.36, .86, 1, .86, .36]):
            bk.add(air(n, x + round(travel * (i + 1) / 5), round(apex * f), 1 - .25 * f), T)
        x += travel; bk.add(frame(key(f'{n}-{crouch}'), x), 160); bk.stand('anchor', x, 480)
    bk.stand('anchor', x, 720); bk.add(frame(key(f'{n}-{crouch}'), x), 320)
    fa, fb = frame(key(f'{n}-{crouch}'), x), frame(key(f'{n}-curl'), x)
    for lv in range(1, 17): bk.add(dither(fa, fb, lv), [11, 11, 11, 12][lv % 4])   # 16 levels in 180 ms
    bk.sleep(x, 4800)
    return bk.fr
def walker(n, x=120):
    bk = Book(n, 'juvenile'); bk.stand('pass', x, 960)
    for _ in range(4):
        for c, d in [('stepA', 160), ('pass', 80), ('stepB', 160), ('pass', 80)]: bk.add(frame(key(f'{n}-{c}'), x), d)
    bk.stand('pass', x, 960); bk.add(frame(key(f'{n}-crouch'), x), 320)
    fa, fb = frame(key(f'{n}-crouch'), x), frame(key(f'{n}-curl'), x)
    for lv in range(1, 17): bk.add(dither(fa, fb, lv), [11, 11, 11, 12][lv % 4])
    bk.sleep(x, 4800)
    return bk.fr
def save(fr, name):
    ims = [f.convert('RGB') for f, _ in fr]
    ims[0].save(f'{O}/{name}.png', save_all=True, append_images=ims[1:], duration=[d for _, d in fr], loop=0)
    strip = Image.new('RGB', (CW * 4, CH), BG)
    cr = next((i for i, (f, d) in enumerate(fr) if d == 160), 1)
    air = cr + 3 if fr[cr + 1][1] == T else cr + 1           # the apex tick of the first hop (a walker: its first step)
    for i, p in enumerate([0, cr, air, len(fr) - 1]): strip.paste(ims[min(p, len(ims) - 1)], (i * CW, 0))
    strip.save(f'{O}/{name}-1x-strip.png')
    return sum(d for _, d in fr), len(fr)
for name, fr in [('juv-S01-hop3-curl', hopper('juv-S01', 'juvenile', 'crouch', 16, 36)),
                 ('pip-hop3-curl-crouch-b', hopper('pip', 'adult', 'crouch-b', 22, 48)),
                 ('juv-S05-walk-curl', walker('juv-S05')),
                 ('grow-b2486-hop3-curl', hopper('grow-b2486', 'adult', 'crouch', 22, 48))]:
    print(name, *save(fr, name))
