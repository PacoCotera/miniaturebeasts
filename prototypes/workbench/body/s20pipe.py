"""The shipped S20 asset from one body and its coat genome: the baked atlas (padded colour, emission, roughness and the blink's eye patches), the level-L render mesh, the glb. Under the bpy venv (the clay renders need Blender; this file does not)."""
import numpy as np
import s20tex as TX


def make_tex(b, genome, size=TX.SIZE, pad_px=12, frames=("open", "half", "closed")):
    out = TX.bake(b, genome, level=3, frames=frames, size=size)
    cov = out["cov"]
    col, _ = TX.pad(out["col"]["open"], cov, pad_px)
    em, _ = TX.pad(out["emit"], cov, pad_px)
    ro, _ = TX.pad(out["rough"][..., None], cov, pad_px)
    tex = dict(col=col, emit=em, rough=ro[..., 0], cov=cov, bake=out)
    fr = {}
    base = out["col"]["open"]
    for name in frames[1:]:
        d = np.abs(out["col"][name] - base).max(2) > 0.5
        ys, xs = np.where(d)
        if len(xs):
            x0, x1, y0, y1 = max(xs.min() - 4, 0), min(xs.max() + 5, size), max(ys.min() - 4, 0), min(ys.max() + 5, size)
            patch = out["col"][name][y0:y1, x0:x1]
            # the pad of the open atlas under the patch's empty corners
            patch = np.where(cov[y0:y1, x0:x1, None], patch, col[y0:y1, x0:x1])
            fr[name] = ((x0, y0, x1 - x0, y1 - y0), patch)
    tex["frames"] = fr
    return tex
