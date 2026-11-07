"""Silhouettes without Blender (numpy z-buffer of nview): the house three-quarter view at 304 / 96 / 48 and the IoU of two meshes."""
import numpy as np
import nview

AZ_HOUSE = 32.0
SIZES = {304: (304, 312, 95.0), 96: (96, 88, 30.0), 48: (48, 48, 15.0)}


def silhouette(V, F, size=304, az=32.0, el=10.0, centre=(-0.35, 0.0, 1.3)):
    w, h, ppH = SIZES[size]
    img, zb, px, dep = nview.render(V, F, None, az, el, centre, ppH, w, h)
    return zb < 1e8


def iou(a, b):
    return float((a & b).sum() / max((a | b).sum(), 1))
