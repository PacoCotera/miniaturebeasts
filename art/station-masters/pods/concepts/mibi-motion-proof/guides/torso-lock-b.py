# Head and torso lock from the true side-on pass (motion-S05-juvenile-pass-b; animator b99b015, motion-spec §0 points 5-6).
# Each step key is aligned to pass by its head and torso (whole-pixel shift, best alpha match), then: above row 236 the step
# IS pass, every pixel and its alpha; between 236 and a least-difference seam (rows 236-274, dynamic programming) the
# head and torso are pass's; below the seam the legs are the step's own. usage: torso-lock-b.py keys_dir
import sys, json, numpy as np
from PIL import Image
K = sys.argv[1]; BELLY = 262; R0, R1 = BELLY - 6, BELLY + 7          # the animator 16:04: head and torso down to the belly line, the seam within +-6 px of it (pass: the belly at row 262)
S = np.asarray(Image.open(f'{K}/juv-S05-pass-304x312.png')).copy(); bs = S[..., 3] == 255
log = {}
for k in ['stepA', 'stepB']:
    T = np.asarray(Image.open(f'{K}/juv-S05-{k}-304x312.png')).copy(); bt = T[..., 3] == 255
    zone0 = np.zeros(bs.shape, bool); zone0[:R0 + 20] = True
    best = None
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            s = np.roll(np.roll(bt, dy, 0), dx, 1); sc = (s & bs & zone0).sum() - (s ^ bs)[zone0].sum()
            if best is None or sc > best[0]: best = (sc, dy, dx)
    _, dy, dx = best; T2 = np.roll(np.roll(T, dy, 0), dx, 1)
    diff = np.abs(S[..., :3].astype(int) - T2[..., :3].astype(int)).sum(-1) + 400 * ((S[..., 3] == 255) != (T2[..., 3] == 255))
    cols = list(range(304)); cost = np.full((R1 - R0, 304), 1e9); back = np.zeros_like(cost, int); cost[:, 0] = diff[R0:R1, 0]
    for j in range(1, 304):
        for i in range(R1 - R0):
            lo, hi = max(0, i - 1), min(R1 - R0, i + 2); m = lo + int(np.argmin(cost[lo:hi, j - 1])); cost[i, j] = cost[m, j - 1] + diff[R0 + i, j]; back[i, j] = m
    i = int(np.argmin(cost[:, -1])); cut = np.zeros(304, int)
    for j in range(303, -1, -1): cut[j] = R0 + i; i = back[i, j]
    zone = np.arange(312)[:, None] < cut[None, :]
    out = T2.copy(); out[zone] = S[zone]                                   # above the seam: pass exactly (every pixel, alpha included)
    Image.fromarray(out).save(f'{K}/juv-S05-{k}-locked-304x312.png')
    log[k] = {'shift': [int(dx), int(dy)], 'px differing from pass above row 256 (belly - 6)': int((out[:R0] != S[:R0]).any(-1).sum()), 'px differing rows 236 to the belly line': int((out[236:BELLY] != S[236:BELLY]).any(-1)[zone[236:BELLY]].sum()), 'px differing above the seam': int((out[zone] != S[zone]).any(-1).sum())}
Image.fromarray(S).save(f'{K}/juv-S05-pass-locked-304x312.png')
json.dump(log, open(f'{K}/torso-lock-b.json', 'w'), indent=1); print(json.dumps(log))
