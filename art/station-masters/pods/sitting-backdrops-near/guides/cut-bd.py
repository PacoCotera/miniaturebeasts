"""Sitting backdrops, near treatment: the 0 MXN cut (studio brief 2026-10-23 22:00). Centre-crop the raw to 1195x896 (exact 4:3), LANCZOS once to 544x408.
No grading, sharpening or paint. usage (from art/station-masters/pods): python3 -I sitting-backdrops-near/guides/cut-bd.py <place> <job>"""
import sys
from PIL import Image
place, job = sys.argv[1:3]
im = Image.open(f'source/raw/{job}.jpg').convert('RGB'); w, h = im.size
cw, ch = (1195, 896) if (w, h) == (1200, 896) else (min(w, round(h * 4 / 3)), min(h, round(w * 3 / 4)))
x0, y0 = (w - cw) // 2, (h - ch) // 2
out = f'sitting-backdrops-near/slices/sitting-backdrop-{place}-544x408.png'
im.crop((x0, y0, x0 + cw, y0 + ch)).resize((544, 408), Image.LANCZOS).save(out); print(out, (w, h), 'crop', (x0, y0, cw, ch))
