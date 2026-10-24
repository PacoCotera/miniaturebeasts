"""M1: library-ground-1024x522, the approved renders' own paper re-based on libGround (the brief's recipe, steps 1-6).
The paper is specimen3.js finish (public work-queue results/T-20261019-home/specimen-generator/specimen3.js), seed 7, grain 4.
One LCG stream, in the generator's own order: the fibre field's 256 x 131 values first, then the tooth, two draws per pixel, row by row."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
from kitlib import save, file_sha, measures_update, WQ, sha

W, H = 1024, 522
BASE = np.array([33, 27, 26])

def lcg(seed, n):
    out = np.empty(n, np.float64); s = seed & 0xFFFFFFFF
    for i in range(n):
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        out[i] = s / 4294967296.0
    return out

def vignette():
    y, x = np.mgrid[0:H, 0:W]
    dx = (x + 0.5) / W - 0.5; dy = (y + 0.5) / H - 0.5
    return 3 - 4 * np.sqrt(2 * (dx * dx + dy * dy))

def fields():
    fw, fh = 256, 131
    u = lcg(7, fw * fh + 2 * W * H)
    fib = (u[:fw * fh] - 0.5) * 120                                     # step 2: quarter-resolution uniform noise, +-60
    t = u[fw * fh:].reshape(H, W, 2)
    tooth = (t[..., 0] + t[..., 1] - 1) * 4                               # step 1: (u1 + u2 - 1) * 4
    up = np.asarray(Image.fromarray(fib.reshape(fh, fw).astype(np.float32), "F").resize((W, H), Image.BILINEAR), np.float64)
    fibre = ndimage.gaussian_filter(up, 3, mode="reflect") * 0.09         # blur sigma 3 px, times 0.09
    return tooth, fibre

if __name__ == "__main__":
    tooth, fibre = fields()
    N = tooth + fibre
    N = (N - N.mean()) / N.std() * 2.0                                   # step 3: standard deviation 2.0 (mean 0)
    V = vignette()                                                       # step 4
    raw = V + N
    o = np.clip(np.round(raw), -8, 8).astype(int)                        # step 5
    img = (BASE[None, None, :] + o[..., None]).astype(np.uint8)          # all three channels of libGround
    p = save(Image.fromarray(img, "RGB"), "library-ground-1024x522")     # step 6: RGB, opaque, nothing else
    a = np.asarray(Image.open(p)).astype(int)
    d = a - BASE[None, None, :]
    R = d[..., 0]
    cy, cx = H // 2, W // 2
    corners = {"tl": R[:32, :32].mean(), "tr": R[:32, -32:].mean(), "bl": R[-32:, :32].mean(), "br": R[-32:, -32:].mean()}
    src = os.path.join(WQ, "results/T-20261019-home/specimen-generator/specimen3.js")
    r = {"mode": Image.open(p).mode, "size": list(Image.open(p).size),
         "mean_per_channel": [round(float(a[..., c].mean()), 3) for c in range(3)], "mean_offset": round(float(R.mean()), 3),
         "centre_64_mean": round(float(R[cy - 32:cy + 32, cx - 32:cx + 32].mean()), 3),
         "corner_32_means": {k: round(float(v), 3) for k, v in corners.items()},
         "sigma_R_minus_33_minus_roundV": round(float((R - np.round(V)).std()), 3),
         "max_abs_offset": int(np.abs(d).max()), "clamped_pct": round(float((np.abs(raw) > 8.5).mean() * 100), 4),
         "max_abs_V_plus_N_before_clamp": round(float(np.abs(raw).max()), 2),
         "channels_locked": bool((d[..., 0] == d[..., 1]).all() and (d[..., 1] == d[..., 2]).all()),
         "raw_sigma_tooth": round(float(tooth.std()), 3), "raw_sigma_fibre": round(float(fibre.std()), 3),
         "V_mean": round(float(V.mean()), 3),
         "source": "public work-queue results/T-20261019-home/specimen-generator/specimen3.js finish (seed 7, grain 4)",
         "source_sha256": sha(open(src, "rb").read()), "sha256": file_sha(p), "script": "guides/make-ground.py"}
    mc = r["mean_per_channel"]
    r["pass"] = (r["mode"] == "RGB" and all(abs(mc[c] - BASE[c]) <= 1 for c in range(3)) and abs(r["centre_64_mean"] - 3) <= 1
                 and all(abs(v + 1) <= 1 for v in r["corner_32_means"].values()) and 1.9 <= r["sigma_R_minus_33_minus_roundV"] <= 2.1
                 and r["max_abs_offset"] <= 8 and r["clamped_pct"] <= 0.05 and r["channels_locked"])
    measures_update("M1_library_ground_1024x522", r)
    print(r)
