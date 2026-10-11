# Head and torso lock on S05's walk cycle (motion-spec §0 points 5-6; tier 2 phase A'). The sheet's `pass` is the
# three-quarter stand, not a side-on walk pass, so it cannot lend its torso to the step keys (a different body). The lock
# is therefore taken from stepA: stepB is aligned to stepA by its head and torso (whole-pixel shift, best alpha match), then
# stepA's head and torso (rows above the leg roots, the tail excluded) replace stepB's. Both step keys then carry identical
# head and torso pixels; only legs and tail differ. usage: torso-lock.py keys_dir
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
K = sys.argv[1]
A = np.asarray(Image.open(f'{K}/juv-S05-stepA-304x312.png')).copy(); B = np.asarray(Image.open(f'{K}/juv-S05-stepB-304x312.png')).copy()
ba, bb = A[..., 3] == 255, B[..., 3] == 255
ROOT, TAILX = 257, 120                                                    # leg roots (row) and the rump (tail to its left), from the row extents
zone = np.zeros(ba.shape, bool); zone[:ROOT, TAILX:] = True
best = None
for dy in range(-5, 6):
    for dx in range(-5, 6):
        s = np.roll(np.roll(bb, dy, 0), dx, 1)
        score = (s & ba & zone).sum() - (s ^ ba)[zone].sum()
        if best is None or score > best[0]: best = (score, dy, dx)
_, dy, dx = best
B2 = np.roll(np.roll(B, dy, 0), dx, 1)
# the seam: per column, the cut row between the head-and-torso (above, from stepA) and the legs (below, from stepB) is the
# path of least difference between the two pictures in rows 236-274 (dynamic programming, at most 1 row step per column),
# so the join falls where they already agree and no straight cut shows.
R0, R1 = 236, 275
diff = np.abs(A[..., :3].astype(int) - B2[..., :3].astype(int)).sum(-1) + 400 * ((A[..., 3] == 255) != (B2[..., 3] == 255))
cols = list(range(TAILX, 304)); cost = np.full((R1 - R0, len(cols)), 1e9); back = np.zeros_like(cost, int)
cost[:, 0] = diff[R0:R1, cols[0]]
for j in range(1, len(cols)):
    for i in range(R1 - R0):
        lo, hi = max(0, i - 1), min(R1 - R0, i + 2); k = lo + int(np.argmin(cost[lo:hi, j - 1]))
        cost[i, j] = cost[k, j - 1] + diff[R0 + i, cols[j]]; back[i, j] = k
i = int(np.argmin(cost[:, -1])); cut = np.zeros(304, int); cut[:TAILX] = ROOT
for j in range(len(cols) - 1, -1, -1): cut[cols[j]] = R0 + i; i = back[i, j]
yy = np.arange(312)[:, None]
zone = (yy < cut[None, :]) & (np.arange(304)[None, :] >= TAILX)
lock = ba & zone
out = B2.copy()
out[zone] = 0
out[lock] = A[lock]
Image.fromarray(out).save(f'{K}/juv-S05-stepB-locked-304x312.png'); Image.fromarray(A).save(f'{K}/juv-S05-stepA-locked-304x312.png')
same = int(((out[..., :4] != A[..., :4]).any(-1) & zone).sum())
Image.fromarray(((zone & (yy >= cut[None, :] - 1)) * 255).astype(np.uint8)).save(f'{K}/../guides/torso-lock-seam.png')
json.dump({'stepB shift': [int(dx), int(dy)], 'locked px': int(lock.sum()), 'zone px differing stepA vs stepB-locked': same}, open(f'{K}/../guides/torso-lock.json', 'w'), indent=1)
print('shift', dx, dy, 'locked', int(lock.sum()), 'differing in zone', same)
