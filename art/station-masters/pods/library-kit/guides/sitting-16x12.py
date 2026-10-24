"""M7: library-sitting-16x12, drawn by hand pixel by pixel from the house matte sitting frame
(station-gate c4be3673 prototypes/ui/assets/masters/pods/home-sitting-32x24.png; the same drawing as sitting-frame-held-48x40).
GRID below is the drawing (typed by hand, never a filter); this script only writes it and checks it.
The parts kept, read off the 32x24 and the 48x40 at 1 px each:
  a bark   the outer line on all four sides
  b sand   the housing: the second ring, the top rim and the window's left rim
  c enamel the light: the top band under the housing (as the 48x40's row 2) and the left band, and the right inner band (both masters' column n-3)
  d clay   the window rim on the right and the foot, and the housing's shade on the right and the bottom (column n-2, row n-2)
  e ground the window, dark (a sitting kept): 8 x 5"""
import io
import numpy as np
from PIL import Image
from kitlib import pal, save, file_sha, values, measures_update, sg_bytes, sha

GRID = [
    "aaaaaaaaaaaaaaaa",
    "abbbbbbbbbbbbbba",
    "abccccccccccccda",
    "abcbbbbbbbbbbcda",
    "abcbeeeeeeeedcda",
    "abcbeeeeeeeedcda",
    "abcbeeeeeeeedcda",
    "abcbeeeeeeeedcda",
    "abcbeeeeeeeedcda",
    "abcbdddddddddcda",
    "abddddddddddddda",
    "aaaaaaaaaaaaaaaa",
]
NAMES = {"a": "bark", "b": "sand", "c": "enamel", "d": "clay", "e": "ground"}

if __name__ == "__main__":
    P = pal()
    a = np.array([[P[NAMES[ch]] for ch in row] for row in GRID], np.uint8)
    assert a.shape == (12, 16, 3)
    p = save(Image.fromarray(a, "RGB"), "library-sitting-16x12")
    im = Image.open(p); arr = np.asarray(im.convert("RGB"))
    allowed = {P[n] for n in NAMES.values()}
    cols = {tuple(int(v) for v in c[:3]) for c in values(im)}
    win = (arr == P["ground"]).all(-1); ys, xs = np.where(win)
    src = "prototypes/ui/assets/masters/pods/home-sitting-32x24.png"; held = "prototypes/ui/assets/masters/pods/sitting-frame-held-48x40.png"
    # the shelf row: nine at a 20 px pitch
    r = {"mode": im.mode, "colours": sorted(n for n, c in P.items() if c in cols and n in NAMES.values()),
         "only_palette_parts": cols <= allowed, "window": [int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)],
         "window_is_rect": bool(win.sum() == (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)),
         "row_of_nine": {"pitch": 20, "gap_px": 20 - 16, "width": 8 * 20 + 16},
         "source": f"station-gate c4be3673 {src}", "source_sha256": sha(sg_bytes(src)),
         "family": f"station-gate c4be3673 {held}", "family_sha256": sha(sg_bytes(held)),
         "sha256": file_sha(p), "script": "guides/sitting-16x12.py (the GRID typed by hand; the script writes and checks it)"}
    r["pass"] = im.mode == "RGB" and r["only_palette_parts"] and r["window"][0] >= 8 and r["window"][1] >= 5 and r["window_is_rect"] and len(cols) == 5
    measures_update("M7_library_sitting_16x12", r)
    print(r)
