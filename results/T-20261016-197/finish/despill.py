# Clean a studio element's cut edge of the magenta ground it was keyed from. Every pixel with alpha < 255 takes the
# colour of its nearest opaque neighbours (grown outward ring by ring); alpha is kept as cut. Opaque pixels untouched.
import sys, numpy as np
from PIL import Image
def decontaminate(src, dst):
    a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
    rgb, known = a[..., :3].copy(), a[..., 3] == 255
    while not known.all():
        acc = np.zeros_like(rgb); n = np.zeros(known.shape, np.float32)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            k = np.roll(known, (dy, dx), (0, 1)); c = np.roll(rgb, (dy, dx), (0, 1))
            acc += c * k[..., None]; n += k
        grow = (~known) & (n > 0)
        if not grow.any(): break
        rgb[grow] = acc[grow] / n[grow][:, None]; known = known | grow
    a[..., :3] = rgb
    Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA').save(dst)
if __name__ == '__main__':
    decontaminate(sys.argv[1], sys.argv[2])
