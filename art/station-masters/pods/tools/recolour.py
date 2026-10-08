"""Proof that one painted pod is every species: recolour the layers. python3 -I tools/recolour.py OUT.png [class]"""
import sys, numpy as np
from PIL import Image
cls = sys.argv[2] if len(sys.argv) > 2 else "large"
L = lambda n: np.asarray(Image.open(f"slices/pod-{cls}-{n}.png").convert("RGBA")).astype(float) / 255
def pod(A, B, pattern):
    sh = L("shade")[..., 0:1]; body = L("mask-body")[..., 3:4]; acc = L("mask-accent")[..., 3:4]
    pat = L("pattern-" + pattern)[..., 3:4] if pattern else 0 * body
    A = np.array(A) / 255; B = np.array(B) / 255
    col = A * body * (1 - pat) + B * np.clip(acc + pat, 0, 1)
    col = np.clip(col * sh * 2, 0, 1); alpha = L("shade")[..., 3:4]
    return np.concatenate([col, alpha], 2)
specs = [((74, 82, 92), (226, 214, 190), "dots"), ((38, 150, 160), (240, 244, 240), "stripes"), ((214, 96, 72), (245, 222, 190), "bands"), ((96, 120, 70), (230, 196, 110), None), ((120, 84, 150), (230, 220, 240), "dots")]
w, h = L("shade").shape[1], L("shade").shape[0]
bg = np.array([27, 44, 58]) / 255
sheet = np.ones((h + 16, (w + 12) * len(specs) + 12, 3)) * bg
for i, (A, B, p) in enumerate(specs):
    px = pod(A, B, p); x = 12 + i * (w + 12)
    sheet[8:8 + h, x:x + w] = px[..., :3] * px[..., 3:4] + sheet[8:8 + h, x:x + w] * (1 - px[..., 3:4])
im = Image.fromarray((sheet * 255).astype(np.uint8)); im = im.resize((im.width * 3, im.height * 3), Image.NEAREST); im.save(sys.argv[1])
