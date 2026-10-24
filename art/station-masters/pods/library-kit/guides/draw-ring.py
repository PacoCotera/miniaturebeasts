"""M6: look-disc-open-16, typed by rule, no hand change.
Pixel (i, j) is ink when |dist((i + 0.5, j + 0.5), (7.5, 7.5)) - 5| <= 0.5; ink frostS at alpha 255, every other pixel clear."""
import numpy as np
from PIL import Image
from kitlib import pal, save, file_sha, iou, ink_mask, values, clear_ok, measures_update

def rule():
    j, i = np.mgrid[0:16, 0:16]
    d = np.hypot(i + 0.5 - 7.5, j + 0.5 - 7.5)
    return np.abs(d - 5) <= 0.5

if __name__ == "__main__":
    FS = pal()["frostS"]
    m = rule()
    a = np.zeros((16, 16, 4), np.uint8); a[m] = FS + (255,)
    p = save(Image.fromarray(a, "RGBA"), "look-disc-open-16")
    im = Image.open(p); mk = ink_mask(im)
    cols = np.where(mk.any(0))[0]; rows = np.where(mk.any(1))[0]
    r = {"ink": int(mk.sum()), "values": len(values(im)), "clear_ok": clear_ok(im),
         "only_frostS_and_clear": values(im) <= {FS + (255,), (0, 0, 0, 0)},
         "columns": [int(cols.min()), int(cols.max())], "rows": [int(rows.min()), int(rows.max())],
         "iou_vs_rule": round(iou(mk, m), 3), "sha256": file_sha(p), "script": "guides/draw-ring.py"}
    r["pass"] = r["ink"] == 28 and r["values"] == 2 and r["clear_ok"] and r["only_frostS_and_clear"] and r["iou_vs_rule"] == 1.0 and r["columns"] == [2, 12] and r["rows"] == [2, 12]
    measures_update("M6_look_disc_open_16", r)
    print(r)
    for row in mk: print("".join("#" if v else "." for v in row))
