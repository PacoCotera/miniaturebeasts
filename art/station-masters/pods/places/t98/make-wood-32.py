"""T-20261016-98: place-wood-32x32 re-made so it reads as wood at 1x (results/review-art-2026-10-16c.md §5: the canopy cut read as pebbles).
Both wood place paintings (place-wood, place2-wood) are top-down canopies, with no trunk or root in them. The wood place's sitting
backdrop (source/raw/sitting-backdrop-wood.jpg) has trunks and roots: the cut is its left trunk's base fanning into roots, lit on their
edges, (10, 450, 170, 610), 160 px square (chosen at 1x on pods-collection over four other trunk and root cuts from both backdrops). It goes through the badges' own recipe (places/t35/make-places-32.py: reduced with Lanczos, saturation x0.85,
highlights above 140 compressed x0.30), with the mean grey graded to 70 (the recipe's wood 60 left the roots too dark to read at 32).
usage: python3 -I places/t98/make-wood-32.py   (run in art/station-masters/pods)"""
import numpy as np
from PIL import Image
im = Image.open("source/raw/sitting-backdrop-wood.jpg").convert("RGB").crop((10, 450, 170, 610)).resize((32, 32), Image.LANCZOS)
a = np.asarray(im).astype(float); W = np.array([0.299, 0.587, 0.114]); g = (a @ W)[..., None]; a = g + (a - g) * 0.85
lum = a @ W; a = a * (70.0 / lum.mean()); lum = a @ W
l2 = np.where(lum > 140, 140 + (lum - 140) * 0.30, lum); a = a * (l2 / np.maximum(lum, 1e-6))[..., None]
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").save("slices/place-wood-32x32.png"); print("place-wood-32x32 written")
