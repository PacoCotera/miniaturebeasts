"""Pass 83: the rail-tab seam (art director's spec, 14:06 Oct 9): where two tabs share a slant the left piece's right-end edge alphas (15 to 207) and the right piece's left-end edge alphas add to 254 but are drawn one over the other, so up to 24 percent of the background shows through the shared hairline (48 px per seam below alpha 255, the lowest at 195).
Fix, in all 8 rail-tab-fill-* pieces: the right end's outer edge pixels (x = w + slantAt(row), and the next pixel in, wherever the alpha is under 255) are set to alpha 255 `bevel` #5a6672 (90, 102, 114). The left ends are left unchanged; nothing else is touched.
Acceptance (checked by this tool, before and after): any two pieces, at either pitch and in any state pair, placed so the right slant of the first is the left slant of the second (second at x + w: 136 for the full tabs, 56 for the compact ones), composite to alpha 255 at every pixel from the first's right-end edge to the second's left-end edge,
in both drawing orders, with zero magenta when composited on magenta. python3 -I tools/railtabs_seam.py -> slices/rail-tab-fill-*.png, marks/railtabs-seam-proof-1x.png"""
import os, json, hashlib, itertools
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
STATES = ("unread", "read", "open", "sealed"); FORMS = {"full-152x40": 136, "compact-72x40": 56}; BEVEL = (90, 102, 114, 255)
load = lambda s, f: np.asarray(Image.open(f"slices/rail-tab-fill-{s}-{f}.png").convert("RGBA")).copy()
def seam_report(label):
    worst = {"below255": 0, "lowest": 255, "magenta": 0, "pairs": 0}
    for f, w in FORMS.items():
        for sa, sb in itertools.product(STATES, STATES):
            A, B = load(sa, f), load(sb, f); Wd = A.shape[1]; width = w + Wd
            for order in ("A under B", "B under A"):
                alpha = np.zeros((40, width)); mag = np.zeros((40, width, 3)); mag[:] = (255, 0, 255)
                layers = [(A, 0), (B, w)] if order == "A under B" else [(B, w), (A, 0)]
                canvas = np.zeros((40, width, 4)); bg = mag.copy()
                for img, x0 in layers:
                    a = img[..., 3:4] / 255.0; sl = canvas[:, x0:x0 + Wd]; sa_ = sl[..., 3:4]
                    out_a = a + sa_ * (1 - a); sl[..., :3] = np.where(out_a > 0, (img[..., :3] * a + sl[..., :3] * sa_ * (1 - a)) / np.maximum(out_a, 1e-9), 0); sl[..., 3:4] = out_a
                    b = bg[:, x0:x0 + Wd]; b[:] = img[..., :3] * a + b * (1 - a)
                for y in range(40):
                    g = w + int(np.floor(16 * y / 40))                            # the shared slant at this row: B's left edge starts here and A's right edge ends here (x = w + slantAt(row))
                    for x in range(g - 1, g + 3):
                        if not (w <= x < Wd): continue                            # inside both pieces' extent
                        al = canvas[y, x, 3] * 255; worst["lowest"] = round(min(worst["lowest"], al), 1); worst["below255"] += int(al < 254.5)
                        worst["magenta"] += int(np.abs(bg[y, x] - (255, 0, 255)).max() > 1 and al < 254.5 and bg[y, x, 0] > 200 and bg[y, x, 1] < 120)
            worst["pairs"] += 1
    print(label, worst); return worst
before = seam_report("before")
for f in FORMS:
    for s in STATES:
        a = load(s, f); w = FORMS[f]; H, Wd = a.shape[:2]
        for y in range(H):
            xs = np.where(a[y, :, 3] > 0)[0]; xr = xs.max()
            for x in (xr - 1, xr):
                if 0 < a[y, x, 3] < 255 and x > w / 2: a[y, x] = BEVEL
        Image.fromarray(a, "RGBA").save(f"slices/rail-tab-fill-{s}-{f}.png", optimize=True)
after = seam_report("after")
man = json.load(open("slices/manifest.json"))
for f in FORMS:
    for s in STATES:
        n = f"rail-tab-fill-{s}-{f}"; man[n]["made"] = man[n]["made"].split(" (pass 83")[0] + " (pass 83: the right end's outer edge pixels set to alpha 255 bevel so a shared slant composites opaque; the left ends unchanged)"
        man[n]["sha256"] = hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()
json.dump(man, open("slices/manifest.json", "w"), indent=1)
