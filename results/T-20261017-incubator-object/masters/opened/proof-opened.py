# Proof: the opened pod composed per species exactly as the closed pod is (station_kit.pod's formula), Loika and Tuikis.
import sys, numpy as np
from PIL import Image
D = sys.argv[1]
def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
def compose(piece, A, B, pattern):
    L = lambda n: np.asarray(Image.open(f'{D}/pod-opened-{piece}-{n}.png').convert('RGBA')).astype(np.float32) / 255
    sh, bd, ac = L('shade'), L('mask-body'), L('mask-accent')
    try: pt = L(f'pattern-{pattern}')[..., 3]
    except FileNotFoundError: pt = np.zeros(sh.shape[:2], np.float32)
    a, b = hexrgb(A), hexrgb(B); mix = np.minimum(1, ac[..., 3] + pt)
    col = np.minimum(1, (a * (bd[..., 3] * (1 - pt))[..., None] + b * mix[..., None]) * (sh[..., :1] * 2))
    return Image.fromarray((np.dstack([col, sh[..., 3:4]]) * 255).clip(0, 255).astype(np.uint8), 'RGBA')
W = Image.new('RGBA', (2 * 300, 200), (60, 70, 50, 255))
for i, (A, B, p) in enumerate((('#465459', '#ae674d', 'dots'), ('#269fa5', '#e8b83f', 'plates'))):
    bowl, cap = compose('bowl', A, B, p), compose('cap', A, B, p)
    W.alpha_composite(bowl, (i * 300 + 20, 30)); W.alpha_composite(cap, (i * 300 + 170, 50))
W.convert('RGB').resize((1200, 400), Image.NEAREST).save(f'{D}/proof-opened-loika-tuikis.png')
