"""Sitting S01 keys: the sheet checks every key sheet gets (0 MXN). Check 3, the border: the median of the 8 px border, as a sum of |RGB| differences from
#FF00FF. Check 5 (Round 2 limit), cell 1 against its input with both put through the same key-out: p95 <= 4.0, max <= 6, centroid move <= 1 px, mean RGB <= 8.
Each filled cell's figure clear of the 12 px seam bands. Appends to floor/S01/sitting/guides/sheet-checks.json.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/sheet-check.py <stage> <raw sheet> <composed input>"""
import json, os, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
_cs = open('floor/S01/sitting/guides/cut-sit.py').read(); exec(_cs[_cs.index('_src = open'):_cs.index("if __name__ == '__main__':")])
stage, sheet, inp = sys.argv[1:4]; M = J['maps'][stage]
A = np.asarray(Image.open(sheet).convert('RGB')).astype(float); B = np.asarray(Image.open(inp).convert('RGB')).astype(float)
bd = np.vstack([A[:8].reshape(-1, 3), A[-8:].reshape(-1, 3), A[:, :8].reshape(-1, 3), A[:, -8:].reshape(-1, 3)])
def c1(X):
    im = cut(X[I:CH - I, I:CW - I])[0]; c = np.asarray(to_canvas(im, M, 'RGBA')).copy(); c[..., 3] = quant(c[..., 3]); return c
a, b = c1(A), c1(B); r = check5(a, b)
r['centroid_move_px_xy'] = [round(float(v), 2) for v in (np.array(np.where(a[..., 3] > 128)).mean(1) - np.array(np.where(b[..., 3] > 128)).mean(1))[::-1]]
f = np.abs(A - [255, 0, 255]).sum(-1) > 90
r.update({'border_median_from_magenta': float(np.abs(np.median(bd, 0) - [255, 0, 255]).sum()), 'seam_px_cols': int(f[:, CW - 6:CW + 7].sum() + f[:, 2 * CW - 6:2 * CW + 7].sum()), 'seam_px_row': int(f[CH - 6:CH + 7].sum())})
r['pass_5'] = bool(r['check5_outline_p95_px'] <= 4.0 and r['check5_outline_max_px'] <= 6 and max(abs(v) for v in r['centroid_move_px_xy']) <= 1 and r['check5_mean_rgb_diff_inside'] <= 8)
r['pass_3'] = r['border_median_from_magenta'] <= 30
jp = 'floor/S01/sitting/guides/sheet-checks.json'; Jc = json.load(open(jp)) if os.path.exists(jp) else {}; Jc[os.path.basename(sheet)] = r; json.dump(Jc, open(jp, 'w'), indent=1); print(json.dumps(r))
