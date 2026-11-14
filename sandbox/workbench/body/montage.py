"""Side-by-side PNG montage (no PIL): python montage.py out.png a.png b.png ... (same heights)."""
import sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bpyio as B
def load(p):
    im = bpy.data.images.load(p)
    a = np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4)[::-1, :, :3]
    bpy.data.images.remove(im)
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)
if __name__ == "__main__":
    ims = [load(p) for p in sys.argv[2:]]
    h = max(i.shape[0] for i in ims)
    ims = [np.pad(i, ((0, h - i.shape[0]), (0, 0), (0, 0))) for i in ims]
    B.write_png(sys.argv[1], np.concatenate(ims, 1))
