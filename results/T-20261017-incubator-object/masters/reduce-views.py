# Per-view reductions of the capsule masters (offline, once; never scaled at runtime) and a proof per view.
#   room   x0.85: shell, interior, glass layers, bar, door, seal ring placed by y = 48 + 0.85 y, x = 512 + 0.85 (x - 514);
#                 the room 1:1, rows 65-587 (1024 x 522), on the stage at y 40
#   create x0.373 and home x0.143: the capsule only (no room), each cut to its box
import sys, os, numpy as np
from PIL import Image
CUT, OUT, KIT = sys.argv[1:4]
sys.path.insert(0, KIT)
LAYERS = ['capsule-shell', 'capsule-shell-dusk', 'capsule-interior-day', 'capsule-interior-dusk', 'capsule-bar-lit',
          'capsule-door-open', 'capsule-seal-ring']
def premul_resize(im, size):                     # premultiplied reduction, so edges keep no dark or light fringe
    a = np.asarray(im).astype(float); al = a[..., 3:4] / 255
    pm = Image.fromarray(np.dstack([a[..., :3] * al, a[..., 3:4]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    b = np.asarray(pm).astype(float); al2 = np.maximum(b[..., 3:4] / 255, 1e-3)
    return Image.fromarray(np.dstack([np.clip(b[..., :3] / al2, 0, 255), b[..., 3:4]]).astype(np.uint8), 'RGBA')
def view(name, k, box):                          # box: the capsule's authority crop (x0, y0, x1, y1)
    os.makedirs(f'{OUT}/{name}', exist_ok=True)
    w, h = round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)
    for n in LAYERS:
        im = Image.open(f'{CUT}/{n}-1024x600.png').convert('RGBA').crop(box)
        premul_resize(im, (w, h)).save(f'{OUT}/{name}/{n}-{w}x{h}.png')
    return w, h
# the room view: the capsule's authority box includes the open door
ROOM_BOX = (316, 0, 940, 600)
rw, rh = view('room', 0.85, ROOM_BOX)
room_x, room_y = round(512 + 0.85 * (316 - 514)), 48
for g in ('day', 'dusk'):
    Image.open(f'{CUT}/capsule-room-{g}-1024x600.png').convert('RGB').crop((0, 65, 1024, 587)).save(f'{OUT}/room/capsule-room-{g}-1024x522.png')
CAP_BOX = (316, 0, 720, 600)                     # the closed capsule alone, for create and home
cw, ch = view('create', 0.373, CAP_BOX)
hw, hh = view('home', 0.143, CAP_BOX)
# proof: the room view, growing (day) and sealed (dusk), with a Loika pod from the renderer at about 170 tall
from station_kit import pod
p = pod('large', '#465459', '#ae674d', 'dots'); k = 170 / p.height; p = p.resize((round(p.width * k), 170), Image.LANCZOS)
def frame(g, door=False, seal=False, bar=True):
    st = Image.new('RGBA', (1024, 600), (29, 35, 43, 255))
    st.paste(Image.open(f'{OUT}/room/capsule-room-{g}-1024x522.png'), (0, 40))
    def put(n):
        st.alpha_composite(Image.open(f'{OUT}/room/{n}-{rw}x{rh}.png'), (room_x, room_y))
    put('capsule-interior-' + g)
    st.alpha_composite(p, (512 - p.width // 2, 415 - p.height + 6))
    put('capsule-shell' + ('-dusk' if g == 'dusk' else ''))
    if bar: put('capsule-bar-lit')
    if seal: put('capsule-seal-ring')
    if door: put('capsule-door-open')
    return st.convert('RGB')
W = Image.new('RGB', (2058, 600), (0, 0, 0))
W.paste(frame('day'), (0, 0)); W.paste(frame('dusk', seal=True, bar=False), (1034, 0))
W.save(f'{OUT}/proof-room-growing-and-sealed.png')
print('room', rw, rh, 'at', room_x, room_y, '| create', cw, ch, '| home', hw, hh)
