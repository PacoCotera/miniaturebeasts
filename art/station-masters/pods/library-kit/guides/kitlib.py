"""Shared helpers for the Library kit masters (0 MXN, no paid call).
Station-gate files are read from git history: set SG to a station-gate clone (REV defaults to c4be3673).
The internal work-queue clone is IWQ, the public one WQ; both are read only."""
import hashlib, json, os, subprocess
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
SLICES = os.path.join(KIT, "slices")
PROOF = os.path.join(KIT, "proof")
SG = os.environ.get("SG", "../station-gate")
REV = os.environ.get("REV", "c4be3673")
IWQ = os.environ.get("IWQ", "../iwq")
WQ = os.environ.get("WQ", "../wq")

def sg_bytes(path):
    return subprocess.run(["git", "-C", SG, "show", f"{REV}:{path}"], check=True, capture_output=True).stdout

def sha(b):
    return hashlib.sha256(b).hexdigest()

def file_sha(p):
    return sha(open(p, "rb").read())

def sg_image(path):
    import io
    b = sg_bytes(path)
    return Image.open(io.BytesIO(b)), sha(b)

_PAL = None
def pal():
    global _PAL
    if _PAL is None:
        d = json.loads(sg_bytes("prototypes/ui/palettes/station.json"))
        _PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in d["colours"]}
        _PAL.update({"libGround": (0x21, 0x1b, 0x1a), "libPanel": (0x34, 0x2c, 0x29), "libHead": (0x3a, 0x31, 0x2c),
                     "libQuiet": (0x2a, 0x23, 0x20), "libWell": (0x1a, 0x15, 0x14), "libLine": (0x4a, 0x41, 0x3c),
                     "seedEdge": (0x63, 0x5e, 0x59)})
    return _PAL

def save(img, name):
    p = os.path.join(SLICES, name + ".png")
    img.save(p, optimize=True)
    return p

def iou(a, b):
    a = np.asarray(a, bool); b = np.asarray(b, bool)
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 1.0

def ink_mask(img):
    """the brief's one IoU method: the master at its own size, alpha > 128 (opaque masters pass their own mask)."""
    a = np.asarray(img.convert("RGBA"))
    return a[..., 3] > 128

def values(img):
    a = np.asarray(img.convert("RGBA")).reshape(-1, 4)
    return {tuple(int(v) for v in r) for r in np.unique(a, axis=0)}

def clear_ok(img):
    """1-bit clear: alpha only 0 or 255, every clear pixel RGB 0,0,0."""
    a = np.asarray(img.convert("RGBA"))
    al = a[..., 3]
    return bool(np.isin(al, [0, 255]).all() and (a[al == 0][:, :3] == 0).all())

def measures_update(key, value):
    p = os.path.join(HERE, "measures.json")
    d = json.load(open(p)) if os.path.exists(p) else {}
    d[key] = value
    json.dump(d, open(p, "w"), indent=1)
