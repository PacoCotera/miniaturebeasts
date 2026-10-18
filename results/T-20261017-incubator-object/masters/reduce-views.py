# Per-view reductions of the capsule masters (offline, once; never scaled at runtime), from the crowned 1024 x 626
# layers (authority y + 26), with a proof per view.
import sys, os, numpy as np
from PIL import Image
CUT, OUT, KIT = sys.argv[1:4]
sys.path.insert(0, KIT)
from station_kit import pod
LAYERS = ['capsule-shell', 'capsule-shell-dusk', 'capsule-interior-day', 'capsule-interior-dusk', 'capsule-bar-lit',
          'capsule-door-open', 'capsule-seal-ring', 'capsule-glass-closed']
def premul_resize(im, size):
    a = np.asarray(im).astype(float); al = a[..., 3:4] / 255
    pm = Image.fromarray(np.dstack([a[..., :3] * al, a[..., 3:4]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    b = np.asarray(pm).astype(float); al2 = np.maximum(b[..., 3:4] / 255, 1e-3)
    return Image.fromarray(np.dstack([np.clip(b[..., :3] / al2, 0, 255), b[..., 3:4]]).astype(np.uint8), 'RGBA')
def view(name, k, box, layers=LAYERS):
    os.makedirs(f'{OUT}/{name}', exist_ok=True)
    w, h = round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)
    for n in layers:
        premul_resize(Image.open(f'{CUT}/{n}-1024x626.png').convert('RGBA').crop(box), (w, h)).save(f'{OUT}/{name}/{n}-{w}x{h}.png')
    return w, h
LOIKA = pod('large', '#465459', '#ae674d', 'dots')
def podh(h): return LOIKA.resize((round(LOIKA.width * h / LOIKA.height), h), Image.LANCZOS)
def compose(base, folder, w, h, at, g, pod_h, pod_foot, door=False, seal=False, bar=True):
    st = base.copy()
    put = lambda n: st.alpha_composite(Image.open(f'{OUT}/{folder}/{n}-{w}x{h}.png'), at)
    put('capsule-interior-' + g)
    if pod_h: q = podh(pod_h); st.alpha_composite(q, (pod_foot[0] - q.width // 2, pod_foot[1] - q.height + max(2, pod_h // 30)))
    put('capsule-shell' + ('-dusk' if g == 'dusk' else ''))
    if bar: put('capsule-bar-lit')
    if seal: put('capsule-seal-ring')
    if door: put('capsule-door-open')
    return st
rep = {}
# A. the room, x0.85 (with the door's box): y = 26 + 0.85 * y_ext (the crown runs under the top bar), x = 512 + 0.85 (x - 514)
k = 0.85; rw, rh = view('room', k, (316, 0, 940, 626)); rx, ry = round(512 + k * (316 - 514)), round(48 - k * 26)
for g in ('day', 'dusk'):
    Image.open(f'{CUT}/capsule-room-{g}-1024x600.png').convert('RGB').crop((0, 65, 1024, 587)).save(f'{OUT}/room/capsule-room-{g}-1024x522.png')
def stage(g):
    st = Image.new('RGBA', (1024, 600), (29, 35, 43, 255)); st.paste(Image.open(f'{OUT}/room/capsule-room-{g}-1024x522.png'), (0, 40)); return st
moss = round(ry + k * (432 + 26))
a = compose(stage('day'), 'room', rw, rh, (rx, ry), 'day', 170, (512, moss))
b = compose(stage('dusk'), 'room', rw, rh, (rx, ry), 'dusk', 170, (512, moss), seal=True, bar=False)
for im in (a, b): im.paste((35, 41, 47, 255), (0, 0, 1024, 40)); im.paste((35, 41, 47, 255), (0, 562, 1024, 600))
W = Image.new('RGB', (2058, 600)); W.paste(a.convert('RGB'), (0, 0)); W.paste(b.convert('RGB'), (1034, 0)); W.save(f'{OUT}/proof-room.png')
rep['room'] = dict(scale=k, size=(rw, rh), at=(rx, ry), moss_y=moss, bar_centre=(512, round(ry + k * (520 + 26))), pod_h=170, juvenile_h=146,
                   room_crop='rows 65-587 of capsule-room-{day,dusk}, on the stage at y 40')
CAP = (316, 0, 720, 626)
# B. Create's chamber 776,104, 176x224: the whole crowned capsule fits 224 tall
k = 224 / 626; cw, ch = view('create', k, CAP); cx = 864 - round(k * (514 - 316)); rep['create'] = dict(scale=round(k, 4), size=(cw, ch), at=(cx, 104), moss_y=round(104 + k * 458), pod_h=round(k * 200))
# C. Home's station box 56x86 at (432, 488)
k = 86 / 626; hw, hh = view('home', k, CAP, ['capsule-shell', 'capsule-interior-day', 'capsule-bar-lit', 'capsule-door-open', 'capsule-glass-closed'])
rep['home'] = dict(scale=round(k, 4), size=(hw, hh), at=(432, 488), moss_y=round(488 + k * 458), pod_h=round(k * 200))
# D. the Incubate panel's left window 24,76, 474x468: x0.733, axis x 261, crown top at y 80
k = 0.733; pw, ph = view('panel', k, CAP, ['capsule-shell-dusk', 'capsule-interior-dusk', 'capsule-seal-ring', 'capsule-glass-closed',
                                'capsule-shell', 'capsule-interior-day', 'capsule-bar-lit'])
pw2, ph2 = view('panel', k, (316, 0, 940, 626), ['capsule-door-open'])   # the open door needs its own wider box
px, py = round(261 - k * (514 - 316)), 80
foot = py + k * (589 + 26); table = py + k * (489 + 26); r0 = round(489 - (table - 76))
for g in ('day', 'dusk'):
    Image.open(f'{CUT}/capsule-room-{g}-1024x600.png').convert('RGB').crop((275, r0, 749, r0 + 468)).save(f'{OUT}/panel/capsule-room-{g}-474x468.png')
win = Image.open(f'{OUT}/panel/capsule-room-dusk-474x468.png').convert('RGBA')
d = compose(win, 'panel', pw, ph, (px - 24, py - 76), 'dusk', round(k * 200), (261 - 24, round(py + k * 458) - 76), seal=True, bar=False)
d.convert('RGB').save(f'{OUT}/proof-panel-incubate-474x468.png')
rep['panel'] = dict(scale=k, size=(pw, ph), at=(px, py), door_size=(pw2, ph2), door_at=(px, py), juvenile_h=round(k * 172), moss_y=round(py + k * 458), pod_h=round(k * 200), room_crop=f'capsule-room-dusk cols 275-749, rows {r0}-{r0 + 468}')
# E. the pod in the price header: the renderer's collection pod reduced to 16 x 20
pod('collection', '#465459', '#ae674d', 'dots').resize((16, 20), Image.LANCZOS).save(f'{OUT}/proof-pod-price-16x20.png')
import json; json.dump(rep, open(f'{OUT}/views.json', 'w'), indent=1); print(json.dumps(rep, indent=1))
