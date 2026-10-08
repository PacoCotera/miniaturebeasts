"""The Companion's 48 colours and tables, read from the page's own PALETTE (prototypes/exploration/index.html).

Shared by every script under art/companion-48/. Nothing here invents a colour: the palette is parsed from the
page at run time (or from palette/palette.json once signed), the DARK/LIGHT tables from DARK_OF/LIGHT_OF, and the
FOG/FADE tables by the page's own mixLUT rule (nearest colour to a mix toward bone at .62 and stone at .5, with the
page's 3/4/2 weighted distance).
"""
import json, os, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PAGE = os.path.join(ROOT, "prototypes", "exploration", "index.html")
SIGNED = os.path.join(HERE, "..", "palette", "palette.json")

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def parse_page():
    src = open(PAGE, encoding="utf-8").read()
    m = re.search(r"const PALETTE = \[(.*?)\];", src, re.S)
    names, hexes = [], []
    for n, h in re.findall(r"\['(\w+)', '(#[0-9a-f]{6})'\]", m.group(1)):
        names.append(n); hexes.append(h)
    def table(key):
        mm = re.search(r"const %s = \{(.*?)\};" % key, src, re.S)
        return dict(re.findall(r"(\w+): '(\w+)'", mm.group(1)))
    return names, hexes, table("DARK_OF"), table("LIGHT_OF")


def hex_rgb(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]


class Palette:
    def __init__(self, names, hexes, dark_of, light_of):
        self.names, self.hexes = list(names), list(hexes)
        self.index = {n: i for i, n in enumerate(names)}
        self.rgb = np.array([hex_rgb(h) for h in hexes], dtype=np.int64)
        self.dark = [self.index[dark_of[n]] for n in names]
        self.light = [self.index[light_of[n]] for n in names]
        self.dark2 = [self.dark[i] for i in self.dark]
        self.fog = self.mix_lut("bone", .62)
        self.fade = self.mix_lut("stone", .5)
        self.storm = self.mix_lut("river", .45)   # round 2: a storm casts the ground and stones toward blue without a DARK step; canopies are exempt (compose-still.py)
        for n in ("sand", "clay", "paper", "bone", "white"):   # the bank and the pale things keep their warmth: storms go blue, never brown-grey
            self.storm[self.index[n]] = self.index[n]

    def nearest(self, r, g, b):
        d = (self.rgb[:, 0] - r) ** 2 * 3 + (self.rgb[:, 1] - g) ** 2 * 4 + (self.rgb[:, 2] - b) ** 2 * 2
        return int(np.argmin(d))

    def mix_lut(self, target, t):
        tr, tg, tb = self.rgb[self.index[target]]
        return [self.nearest(r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t) for r, g, b in self.rgb]

    def nearest_array(self, arr):
        """arr: (..., 3) ints -> (...) palette indices, the page's weighted distance."""
        a = arr.reshape(-1, 3).astype(np.int64)
        d = ((a[:, None, 0] - self.rgb[None, :, 0]) ** 2 * 3 + (a[:, None, 1] - self.rgb[None, :, 1]) ** 2 * 4
             + (a[:, None, 2] - self.rgb[None, :, 2]) ** 2 * 2)
        return np.argmin(d, axis=1).reshape(arr.shape[:-1])

    def to_image(self, idx, alpha=None):
        """idx: (h, w) indices, -1 transparent (or alpha mask) -> RGBA image with exact palette colours."""
        h, w = idx.shape
        out = np.zeros((h, w, 4), dtype=np.uint8)
        valid = idx >= 0
        out[valid, :3] = self.rgb[idx[valid]]
        out[valid, 3] = 255
        if alpha is not None:
            out[..., 3] = np.where(valid, alpha, 0)
        return Image.fromarray(out, "RGBA")

    def off_palette(self, img):
        """Count pixels (alpha > 0) whose colour is not one of the 48; alpha must be 0 or 255."""
        a = np.asarray(img.convert("RGBA")).astype(np.int64)
        opaque = a[..., 3] > 0
        semi = int(((a[..., 3] > 0) & (a[..., 3] < 255)).sum())
        rgb = a[..., :3][opaque]
        if len(rgb) == 0:
            return 0, semi
        matches = (rgb[:, None, :] == self.rgb[None, :, :]).all(axis=2).any(axis=1)
        return int((~matches).sum()), semi


def load(signed=True):
    if signed and os.path.exists(SIGNED):
        d = json.load(open(SIGNED))
        return Palette([c["name"] for c in d["colours"]], [c["hex"] for c in d["colours"]], d["darkOf"], d["lightOf"])
    names, hexes, dark_of, light_of = parse_page()
    return Palette(names, hexes, dark_of, light_of)


# Ramps by name, dark to light, as ui-kit §2 groups them; the outline rule uses a part's own ramp.
RAMPS = {
    "N": ["void", "ink", "night", "slate", "stone", "mist", "fog", "bone", "white"],
    "W": ["soil", "bark", "clay", "sand", "paper"],
    "G": ["pine", "forest", "leaf", "grass", "sprout", "lime"],
    "B": ["deep", "sea", "river", "sky", "ice"],
    "T": ["tealD", "teal", "aqua", "mint"],
    "V": ["plumD", "plum", "lilac", "lavender"],
    "R": ["wine", "red", "coral", "peach", "blush"],
    "O": ["rust", "orange", "amber"],
    "Y": ["gold", "yellow", "cream"],
    "P": ["magenta", "pink"],
    "K": ["rock", "rockL"],
}
RAMP_OF = {n: r for r, ns in RAMPS.items() for n in ns}


def ramp_indices(P, ramps):
    """Palette indices of the named ramps (a string of ramp letters), for restricted quantisation."""
    out = []
    for r in ramps:
        out += [P.index[n] for n in RAMPS[r]]
    return out
