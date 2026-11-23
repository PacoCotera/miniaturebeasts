"""day-bar-1: lay the clip frames into one picture. a-NN: one frame at rest after each of 30 Waits (light 140 -> 170); b-N: one Wait caught about every 100 ms.
   python3 -I day-bar-strip.py <framesDir> <outDir>"""
import sys, glob, os
from PIL import Image

frames, out = sys.argv[1], sys.argv[2]


def sheet(files, cols, path):
    ims = [Image.open(f).convert("RGB") for f in files]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    s = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (40, 40, 40))
    for i, im in enumerate(ims):
        s.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
    s.save(path)
    print(path, s.size)


sheet(sorted(glob.glob(os.path.join(frames, "a-*.png"))), 2, os.path.join(out, "390-clip-30-actions-dusk.png"))
sheet(sorted(glob.glob(os.path.join(frames, "b-*.png"))), 1, os.path.join(out, "390-clip-one-wait-glide.png"))
