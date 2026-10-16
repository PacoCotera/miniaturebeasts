# Ground the air keys (animator's review 14:21, motion-spec §5): the sheet painted the body 30-38 px above its shadow,
# and the arc's lift is added on top, so the take-off jumped. The body moves down until its lowest pixel sits on the
# feet row (305 at 304x312); the shadow stays. Then the walk sizes are re-derived. usage: ground.py keys_dir (once)
import sys, numpy as np
from PIL import Image
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0]); K = sys.argv[1]
import importlib.util
spec = importlib.util.spec_from_file_location('bake_place', sys.argv[0].rsplit('/', 1)[0] + '/bake.py')
src = open(spec.origin).read(); place_src = src[src.index('def place'):src.index('log = []')]
exec(place_src)
for n, ws, wf, wsc in [('juv-S01', (104, 112), 105, 0.36), ('pip', (144, 152), 145, 0.47), ('grow-b2486', (144, 152), 145, 0.47)]:
    f = f'{K}/{n}-air-304x312.png'; a = np.asarray(Image.open(f).convert('RGBA')).copy()
    body = a[..., 3] == 255; low = np.where(body.any(1))[0].max()
    sh = (a[..., 3] > 0) & (a[..., 3] <= 110) & (np.arange(a.shape[0])[:, None] > low)
    d = 305 - low; out = np.zeros_like(a); keep = a.copy(); keep[sh] = 0
    out[d:] = keep[:-d] if d > 0 else keep
    m = out[..., 3] == 0; out[m & sh] = a[m & sh]                    # the shadow, where the body does not cover it
    Image.fromarray(out).save(f)
    place(Image.fromarray(out), ws, wf, wsc).save(f'{K}/{n}-air-{ws[0]}x{ws[1]}.png')
    print(n, 'air grounded by', d, 'px')
