"""Vivarium rooms: the 0 MXN hand grade of a light edit against the showpiece light gate G3 (ad-rooms-showpiece.md §5): the night floor brighter than the night back,
the night whole L* at least 24. Two feathered gains (back rows above the floor's feather, floor rows below it) and, if the whole is still under 24, one gamma lift.
Rows: Idle back 120-299, floor 376-551, feather 330-376; near back 0-199, floor 260-407, feather 210-260. The gains move value only (one RGB gain each), so the light's colour stays.
python3 -I tools/roomgrade.py SRC OUT idle|near [BACK_MAX_DROP] -> OUT and a JSON line (gains, measures)"""
import sys, json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
R = {"idle": dict(back=(120, 300), floor=(376, 552), whole=(120, 561), fe=(330, 376)), "near": dict(back=(0, 200), floor=(260, 408), whole=(0, 408), fe=(210, 260))}
def meas(a, k):
    r = R[k]; f = lambda y: round(float(lstar(a[y[0]:y[1]]).mean()), 2); return {"whole": f(r["whole"]), "floor": f(r["floor"]), "back": f(r["back"]), "R-B whole": round(float((a[r["whole"][0]:r["whole"][1], ..., 0] - a[r["whole"][0]:r["whole"][1], ..., 2]).mean()), 1)}
def apply(a, k, gb, gf, gam):
    r = R[k]; y = np.arange(a.shape[0]); w = np.clip((y - r["fe"][0]) / (r["fe"][1] - r["fe"][0]), 0, 1)[:, None, None]; g = gb * (1 - w) + gf * w
    b = (a * g).clip(0, 255); return (255 * (b / 255) ** gam).clip(0, 255)
def solve(a, k, drop=0.82):
    m0 = meas(a, k); gb = 1.0; gf = 1.0; gam = 1.0
    if m0["floor"] < m0["back"] + 3:
        gb = max(drop, 1.0)
        for _ in range(12):     # darken the back toward the floor (at most to `drop`), then lift the floor to back + 3
            b = apply(a, k, gb, gf, gam); m = meas(b, k)
            if m["floor"] >= m["back"] + 3: break
            if gb > drop: gb = max(drop, gb - 0.04)
            else: gf *= ((m["back"] + 3.2) / max(m["floor"], 1)) ** 1.5
    for _ in range(12):
        b = apply(a, k, gb, gf, gam); m = meas(b, k)
        if m["whole"] >= 24.3: break
        gam *= 0.97
    return b, {"gain_back": round(gb, 3), "gain_floor": round(gf, 3), "gamma": round(gam, 3), "before": m0, "after": m}
if __name__ == "__main__":
    src, out, k = sys.argv[1:4]; drop = float(sys.argv[4]) if len(sys.argv) > 4 else 0.82
    a = np.asarray(Image.open(src).convert("RGB")).astype(float); b, info = solve(a, k, drop)
    Image.fromarray(b.round().astype(np.uint8)).save(out); print(json.dumps({"src": src, "out": out, **info}))
# Dusk and dawn (art director's ruling at this pass): the gate's order (day > dawn and dusk > night, whole L*) is met by one value gain to a target whole L*;
# "dusk warmer than day" is measured as (R-B)/mean(RGB) over the whole, since raw R-B falls with value in a darker light; met by one warm channel balance (R up, B down).
def warmth(a, k): r = R[k]; s = a[r["whole"][0]:r["whole"][1]]; return float((s[..., 0] - s[..., 2]).mean() / s.mean())
def tone(a, k, whole=None, warm=None):
    b = a.copy(); g = 1.0; w = 1.0
    for _ in range(25):
        b = (a * g).clip(0, 255); b[..., 0] = (b[..., 0] * w).clip(0, 255); b[..., 2] = (b[..., 2] / w).clip(0, 255); m = meas(b, k); done = True
        if whole is not None and abs(m["whole"] - whole) > 0.3: g *= (whole / max(m["whole"], 1)) ** 1.3; done = False
        if warm is not None and warmth(b, k) < warm: w *= 1.01; done = False
        if done: break
    return b, {"gain": round(g, 3), "warm_balance": round(w, 3), "after": meas(b, k), "warmth": round(warmth(b, k), 3)}
