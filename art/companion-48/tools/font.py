"""The page's bitmap font (Mibi 7x9 as the Companion page defines it in GLYPHS), for the composed still's chrome.

usage (module): import font; font.draw(idx_array, "text", x, y, colour_index, scale)
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pal

_src = open(pal.PAGE, encoding="utf-8").read()
_m = re.search(r"const GLYPHS = \{(.*?)\n\};", _src, re.S)
GLYPHS = {}
for key, rows in re.findall(r"(?:'([^']+)'|(\w)): '([^']+)'", _m.group(1)) and [(a or b, r) for a, b, r in re.findall(r"(?:'([^']+)'|(\w)): '([^']+)'", _m.group(1))]:
    GLYPHS[key] = rows.split("|")
_a = re.search(r"const GLYPH_ALIAS = \{(.*?)\};", _src, re.S)
ALIAS = dict(re.findall(r"'([^']+)': '([^']+)'", _a.group(1))) if _a else {}


def glyph(ch):
    return GLYPHS.get(ch) or GLYPHS.get(ALIAS.get(ch, ""), None) or GLYPHS.get("?")


def width(text, s=2, tight=False):
    w = 0
    for ch in text:
        g = glyph(ch); w += (len(g[0]) + (0 if tight else 1)) * s + (1 if tight else 0)
    return max(0, w - (s if not tight else 1))


def draw(idx, text, x, y, col, s=2, shadow=None):
    """Draw text into an index array at scale s; optional 1-font-px drop shadow colour."""
    h, w = idx.shape
    for ch in text:
        g = glyph(ch)
        if ch != " ":
            for ry, row in enumerate(g):
                for rx, c in enumerate(row):
                    if c == "#":
                        for dy in range(s):
                            for dx in range(s):
                                px, py = x + rx * s + dx, y + ry * s + dy
                                if shadow is not None and 0 <= px + s < w and 0 <= py + s < h:
                                    idx[py + s, px + s] = shadow
                                if 0 <= px < w and 0 <= py < h:
                                    idx[py, px] = col
        x += (len(g[0]) + 1) * s
    return x
