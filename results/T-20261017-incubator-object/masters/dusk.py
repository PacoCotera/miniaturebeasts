# The dusk grade and the seal ring, in closed's frame:
#   room-dusk, interior-dusk, shell-dusk: each day layer colour-matched (per channel mean and spread) to the same
#   region of the incubate still, registered into closed's frame for the measurement only (nothing is cut from it)
#   seal-ring: a mint stroke with a soft glow drawn along the window's rim, its colour and width measured on incubate
import sys, numpy as np
from PIL import Image, ImageFilter
CUT, INC = sys.argv[1:3]
ld = lambda n: np.asarray(Image.open(f'{CUT}/{n}-1024x600.png')).astype(float)
room, inter, shell = ld('capsule-room-day'), ld('capsule-interior-day'), ld('capsule-shell')
win = np.asarray(Image.open(f'{CUT}/window-mask-1024x600.png')).astype(float) / 255 > 0.5
inc = Image.open(INC).convert('RGB')
s = (686 - 320) / (698 - 341); ax, ay = 320 - 341 * s, 599 - 591 * s     # incubate = s * closed + (ax, ay)
R = np.asarray(inc.transform((1024, 600), Image.AFFINE, (s, 0, ax, 0, s, ay), Image.BICUBIC)).astype(float)
yy, xx = np.mgrid[0:600, 0:1024]
mint = (R[..., 1] > R[..., 0] + 30) & (R[..., 1] > 150)
pod = ((xx - 512) / 100) ** 2 + ((yy - 330) / 110) ** 2 < 1
def match(layer, region_day, region_inc):          # a per-channel gain toward incubate's mean (no stretch, so no noise)
    d, t = layer[..., :3][region_day].mean(0), R[region_inc].mean(0)
    out = layer.copy(); out[..., :3] = np.clip(layer[..., :3] * (t / (d + 1e-3)), 0, 255)
    return out
sh_a = shell[..., 3] > 200
side = (xx < 300) | (xx > 720)
room_d = room.copy()
for band in ((yy < 480), (yy >= 495)):              # the wall and the table, each to its own dusk
    room_d = np.where((band)[..., None], match(room, side & band, side & band & ~mint), room_d)
edge = (yy >= 480) & (yy < 495)
room_d = np.where(edge[..., None], (match(room, side & (yy < 480), side & (yy < 480)) + match(room, side & (yy >= 495), side & (yy >= 495))) / 2, room_d)
inter_d = match(inter, win & (inter[..., 3] > 200), win & ~mint & ~pod)
shell_d = match(shell, sh_a, sh_a & ~mint)
for n, a in (('capsule-room-dusk', room_d), ('capsule-interior-dusk', inter_d), ('capsule-shell-dusk', shell_d)):
    Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA' if a.shape[2] == 4 else 'RGB').save(f'{CUT}/{n}-1024x600.png')
# the seal ring: the window's rim, a few px inside the shell
wm = Image.fromarray((win * 255).astype(np.uint8))
outer = np.asarray(wm.filter(ImageFilter.MaxFilter(9))) > 127
inner = win
ring = outer & ~inner
col = R[mint].mean(0)
core = np.asarray(Image.fromarray((ring * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
glow = np.asarray(Image.fromarray((ring * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))).astype(float) / 255
a = np.clip(core + glow * 0.9, 0, 1)
rgb = np.ones((600, 1024, 3)) * col
rgb = rgb * (1 - core[..., None] * 0.35) + 255 * core[..., None] * 0.35          # the stroke's hot centre
Image.fromarray(np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8), 'RGBA').save(f'{CUT}/capsule-seal-ring-1024x600.png')
print('ring colour', col.round())
