"""R5 parity gate, comparison half: the Blender proxy's silhouettes (parity_refs.py) against the browser's (shots/parity.mjs), per variant and angle, as intersection over union of the filled pixels (alpha over half).
  python parity_iou.py REFS_DIR BROWSER_DIR OUT_JSON [MIN_IOU]
Prints a table and exits 1 when any cell is under MIN_IOU (default 0.98). The sheet for the art desk is made by parity_sheet.py from the same two folders."""
import json
import os
import sys

import numpy as np
from PIL import Image


def fill(path):
    return np.asarray(Image.open(path).convert("RGBA"))[..., 3] > 127


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def main():
    refs, br, out = sys.argv[1:4]
    lo = float(sys.argv[4]) if len(sys.argv) > 4 else 0.98
    meta = json.load(open(os.path.join(refs, "refs.json")))
    res, worst = {}, 1.0
    for name in meta["variants"]:
        res[name] = {}
        for az in (0, 32, 90, 180):
            f = f"{name}-az{az}.png"
            res[name][str(az)] = round(iou(fill(os.path.join(refs, f)), fill(os.path.join(br, f))), 4)
        worst = min(worst, min(res[name].values()))
        print(f"{name:18}", "  ".join(f"{res[name][str(a)]:.4f}" for a in (0, 32, 90, 180)))
    json.dump(dict(iou=res, worst=worst, min=lo), open(out, "w"), indent=1)
    print("worst", worst)
    sys.exit(0 if worst >= lo else 1)


if __name__ == "__main__":
    main()
