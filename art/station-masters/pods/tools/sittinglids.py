"""Pass 90: pose-S01-sleep-curled with its eyes closed (art director, a079009f: eyes closed, with curved lids in the body's dark grey). The painting (source/raw/pose-S01-sleep-curled.jpg) has two half-open eyes (a cream oval with a thin lid arc). By hand-set boxes round each eye:
the whole oval of each eye (the box grown 8 px) is refilled from the painting round it (a harmonic fill with a fine grain, feathered 2 px) and a closed lid is drawn as a curved arc (a smile-shaped curve, 7 px wide at 1024) in the body's dark grey (the mean of the darkest fifth of the face ring), supersampled 4x.
python3 -I tools/sittinglids.py -> source/raw/pose-S01-sleep-curled-r2.png (then tools/sittingposes.py cuts it)"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
im = Image.open("source/raw/pose-S01-sleep-curled.jpg").convert("RGB"); a = np.asarray(im).astype(float).copy(); H, W = a.shape[:2]
EYES = [(379, 546, 440, 632), (518, 474, 570, 556)]      # x0, y0, x1, y1 on the 1024 painting: the left (nearer) eye and the right eye, each box a little larger than the oval
lid = Image.new("L", (W * 4, H * 4), 0); d = ImageDraw.Draw(lid)
rng = np.random.default_rng(90)
for (x0, y0, x1, y1) in EYES:
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; rx, ry = (x1 - x0) / 2 + 8, (y1 - y0) / 2 + 8            # the whole oval of the eye, with its rim, grown 8 px
    yy, xx = np.mgrid[y0 - 14:y1 + 14, x0 - 14:x1 + 14]; m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
    sub = a[y0 - 14:y1 + 14, x0 - 14:x1 + 14].copy(); ring = ~m; known = ring.copy()
    fill = sub.copy(); fill[m] = sub[ring].mean(0)
    for _ in range(600):                                                                              # a harmonic fill: the hole takes the average of its neighbours, the painting round it fixed
        n = (np.roll(fill, 1, 0) + np.roll(fill, -1, 0) + np.roll(fill, 1, 1) + np.roll(fill, -1, 1)) / 4; fill[m] = n[m]
    grain = rng.normal(0, 3.2, fill.shape[:2])[..., None]; fill[m] = fill[m] + grain[m]
    edge = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.0))).astype(float)[..., None] / 255
    sub = sub * (1 - edge) + fill * edge; a[y0 - 14:y1 + 14, x0 - 14:x1 + 14] = sub
    ringpix = sub[(~m) & (np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(25))) > 0)]; dark = ringpix[np.argsort(ringpix.sum(1))[: max(1, len(ringpix) // 5)]].mean(0)
    cy2 = cy + 2; wd = (x1 - x0) * 0.50; dp = (y1 - y0) * 0.14
    pts = [(cx - wd + 2 * wd * t / 40, cy2 + dp * (1 - ((2 * t / 40 - 1) ** 2)) - dp * 0.3) for t in range(41)]                      # a smile-shaped curve, lowest at its middle
    d.line([(x * 4, y * 4) for x, y in pts], fill=255, width=28, joint="curve")
lidm = np.asarray(lid.resize((W, H), Image.LANCZOS)).astype(float)[..., None] / 255
out = a * (1 - lidm) + dark * lidm
Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)).save("source/raw/pose-S01-sleep-curled-r2.png"); print("dark", dark.round(0))
