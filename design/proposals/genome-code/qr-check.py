"""Decode the simulated QR photos written by print-test.mjs with a standard
reader (zxing-cpp, the engine behind many phone scanners) and count how many
give back the exact payload. Needs: pip install zxing-cpp pillow

    node design/proposals/genome-code/print-test.mjs --photos /tmp/gc-photos
    python3 design/proposals/genome-code/qr-check.py /tmp/gc-photos
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import zxingcpp
from PIL import Image

folder = Path(sys.argv[1])
cells = defaultdict(lambda: [0, 0, 0])  # ok, wrong, total
for t in json.loads((folder / "manifest.json").read_text()):
    found = zxingcpp.read_barcodes(Image.open(folder / t["name"]), formats=zxingcpp.BarcodeFormat.QRCode)
    c = cells[(t["species"], t["mm"], t["px"], t["version"])]
    c[2] += 1
    if found:
        c[0 if found[0].bytes.hex() == t["hex"] else 1] += 1
for (species, mm, px, version), (ok, wrong, n) in cells.items():
    print(f"species {species} QR v{version} at {mm} mm, {px} px/mm: {ok}/{n} decoded, {wrong} wrong")
