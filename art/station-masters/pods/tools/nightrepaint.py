"""Pass 119: the night repaints cut and graded by hand within the art director's targets (the owner-approved Pro repaints: source/raw/idle-night-repaint.jpg from the signed Idle day, source/raw/glass-night-repaint.jpg from the signed glass day; 2 requests, no retry). No paid call here.
Each picture is centre-cut to its size (1024x568; 640x488) and Lanczos-reduced, then given a final regrade by tools/nightdist.py within the targets: mean L* 24 to 28, background 12 to 18, ground 30 to 36 lit evenly, at most 3 percent of pixels above L* 70, R above B, sat 45 to 65 (the background held near 17, the ground set to 35, the highlights capped by a soft curve; no moon rim is present to scale). home-bed-night is re-cut from the new Idle night by tools/homefix.py (run after this).
python3 -I tools/nightrepaint.py -> slices/idle-vivarium-night-1024x568.png, slices/home-glass-night-640x488.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
def cut(path, w, h):
    im = Image.open(path).convert("RGB"); W, H = im.size; ch = round(W * h / w)
    if ch <= H: y0 = (H - ch) // 2; im = im.crop((0, y0, W, y0 + ch))
    else: cw = round(H * w / h); x0 = (W - cw) // 2; im = im.crop((x0, 0, x0 + cw, H))
    return im.resize((w, h), Image.LANCZOS)
man = json.load(open("slices/manifest.json")); rep = {}
for n, src, w, h, gm, ramp, what in (("idle-vivarium-night-1024x568", "idle-night-repaint", 1024, 568, 330, 90, "Idle's Vivarium by night: a Pro repaint of the signed Idle day under the device's grow lamp dimmed to a low warm glow (the owner-approved repaint of Oct 10; the first night, vivarium-night-r2, is withdrawn)"), ("home-glass-night-640x488", "glass-night-repaint", 640, 488, 268, 88, "Home's glass by night: a Pro repaint of the signed glass day under the dimmed grow lamp (the owner-approved repaint of Oct 10)")):
    im, d = night_dist(cut(f"source/raw/{src}.jpg", w, h), gm, ramp, 0, bg_target=17.0, pool_cap=True, rim_scale=1.0, ground_exact=35.0, bloom=(70.0, 0.0), knee_p=(58.0, 11.5, 8.0)); rep[n] = d
    if n.startswith("idle"):
        # the art director's return on pass 119 (the repaint adds a grow-lamp hood at the top left that the day, dawn and dusk do not have): the hood and its lit rim are painted out into the background by hand: the box x 74-365, y 0-64 (the cord at the left edge, x under 75, is kept) is rebuilt from the clean background around it (a normalised multi-scale blur of the pixels under and beside it, sigma 4, 10, 24, plus the picture's own grain), feathered 5 px; the warm light the lamp casts below it is kept
        a_ = np.asarray(im).astype(float); H_, W_, _ = a_.shape; hole = np.zeros((H_, W_), bool); hole[0:64, 74:366] = True
        def gb(x, sg):
            fy = np.fft.fftfreq(x.shape[0])[:, None]; fx = np.fft.rfftfreq(x.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(x) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), x.shape)
        fill = a_.copy(); fill[0:64] = a_[127:63:-1]                      # the rows 64-127 of the picture just below, mirrored about y 63.5: the background's own foliage and tone continue upward (the cord, x under 74, and the wall are kept)
        # the mirrored rows are matched to the rows under the hole's lower edge: a per-column offset, smoothed, taken out so there is no step
        edge = a_[64:70, :].mean(0) - fill[58:64, :].mean(0); edge = np.stack([gb(np.repeat(edge[None, :, c], 8, 0), 6.0)[0] for c in range(3)], -1); fill[0:64] = fill[0:64] + edge[None, :, :] * np.linspace(0.2, 1.0, 64)[:, None, None]
        rng = np.random.default_rng(31); grain = np.zeros_like(a_); fm = np.clip(gb(hole.astype(float), 6.0) * 1.8, 0, 1)[..., None]; fm[:, :70] = 0
        a_ = a_ * (1 - fm) + (fill + grain) * fm; im = Image.fromarray(a_.clip(0, 255).astype(np.uint8))
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": [w, h], "rect": None, "src": f"source/raw/{src}.jpg (gemini-3-pro-image)", "made": what + ", centre-cut and reduced with Lanczos, then regraded by hand within the night targets (background about 17, ground 35, at most 3 percent above L* 70) (pass 119)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
