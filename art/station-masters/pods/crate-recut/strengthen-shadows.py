"""Fix 5 AR3 follow-up (QA, 10-15): the crates' contact shadows read too faint on the sage shelf (about 10 levels). Their alpha
is multiplied by 1.6 and capped at 170 (67 %); colour and shape unchanged. usage: strengthen-shadows.py SLICES_DIR"""
import sys, os, numpy as np
from PIL import Image
for n in ('crate-shadow-432x24', 'crate-shadow-256x24'):
    p = os.path.join(sys.argv[1], n + '.png'); a = np.asarray(Image.open(p).convert('RGBA')).astype(float)
    a[..., 3] = np.minimum(170, np.round(a[..., 3] * 1.6)); Image.fromarray(a.astype(np.uint8), 'RGBA').save(p)
    print(n, 'alpha max', int(a[..., 3].max()))
