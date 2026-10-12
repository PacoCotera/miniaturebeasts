# Idle full-screen band (QA 2f1da9f; programme lead's go 18:28, 0 MXN): the side fixtures (wall panels, feed line, mister
# pipe) started on a cut line at rows 114-118 under the canopy band. They now run up to the top edge, carried from their own
# row 120 (continuous with the protected rows) and softened as they rise into the band, the way the band itself is out of focus: the blur grows
# from 0 at row 119 to sigma 5 px at row 60 and above. Side bands x < 104 and x >= 856, feathered into the canopy over
# 24 px; the grain of rows 120-135 is mirrored across the join and fades over 16 rows. Rows 120-567 are byte-identical. usage: edges.py IN_DIR OUT_DIR
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
I, O = sys.argv[1:3]; B, S = 120, 120
for l in ['dawn', 'day', 'dusk', 'night']:
    a0 = np.asarray(Image.open(f'{I}/{l}.png').convert('RGB')); a = a0.astype(float); out = a.copy()
    ext = np.repeat(a[S:S + 1], B, 0)                                       # the fixtures run straight up
    stack = [nd.gaussian_filter(ext, (s, s, 0)) for s in (0, 1, 2, 3.5, 5)]
    t = np.clip((B - 1 - np.arange(B)) / 59, 0, 1) * 4                      # 0 at row 119, 4 at row 60 and above
    lo = np.floor(t).astype(int); hi = np.minimum(lo + 1, 4); f = (t - lo)[:, None, None]
    soft = np.stack(stack)[lo, np.arange(B)] * (1 - f) + np.stack(stack)[hi, np.arange(B)] * f
    # the wall's own grain carried across the join: the high-pass of rows 120..135 mirrored upward, fading out over 16 rows
    hp = np.clip(a[B:B + 16] - nd.gaussian_filter(a[B:B + 16], (0, 2, 0)), -6, 6)   # grain only: the collar's and the fitting's edges are not mirrored (pass 2, QA 10e0343)
    fade = np.clip(1 - np.arange(16) / 16, 0, 1)[:, None, None]
    soft[B - 16:B] += (hp * fade)[::-1]
    x = np.arange(a.shape[1]); m = (np.clip((104 - x) / 24, 0, 1) + np.clip((x - 856) / 24, 0, 1))[None, :, None]
    out[:B] = soft * m + a[:B] * (1 - m)
    o = np.clip(out.round(), 0, 255).astype(np.uint8)
    assert (o[B:] == a0[B:]).all(), 'rows 120+ byte-identical'
    Image.fromarray(o).save(f'{O}/idle-vivarium-{l}-1024x568.png')
print('ok')
