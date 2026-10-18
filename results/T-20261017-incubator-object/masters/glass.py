# capsule-glass-closed: the closed still's glass carries no separable reflections (closed minus the empty interior is
# only moss noise; the glass reads by the rim's inner shadow). The studio did paint the glass's highlights on the open
# door (house hand), so those strokes are lifted from capsule-door-open (bright, low-chroma pixels inside the door's
# frame, the frame itself excluded), mirrored (the door is seen from its inside edge) and mapped box-to-box onto the
# closed window, then kept inside the window mask. Output: a white highlight layer, alpha only where the strokes are.
import sys, numpy as np
from PIL import Image, ImageFilter
CUT = sys.argv[1]
door = np.asarray(Image.open(f'{CUT}/capsule-door-open-1024x600.png').convert('RGBA')).astype(float)
win = np.asarray(Image.open(f'{CUT}/window-mask-1024x600.png')) > 127
a = door[..., 3] / 255; rgb = door[..., :3]
L = rgb @ np.array([0.3, 0.59, 0.11]); ch = rgb.max(2) - rgb.min(2)
frame = (L < 110) & (a > 0.5)
frame = np.asarray(Image.fromarray((frame * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 127
# the door's glass area, inside its frame
ys, xs = np.nonzero(a > 0.3); X0, X1, Y0, Y1 = xs.min(), xs.max(), ys.min(), ys.max()
bg = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.BoxBlur(12))).astype(float)
hi = np.clip((L - bg - 6) / 30, 0, 1) * (ch < 40) * (a > 0.2) * ~frame
hi = np.asarray(Image.fromarray((hi * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255
crop = Image.fromarray((hi[Y0:Y1 + 1, X0:X1 + 1] * 255).astype(np.uint8)).transpose(Image.FLIP_LEFT_RIGHT)
wy, wx = np.nonzero(win); WX0, WX1, WY0, WY1 = wx.min(), wx.max(), wy.min(), wy.max()
m = crop.resize((WX1 - WX0 + 1, WY1 - WY0 + 1), Image.LANCZOS)
al = np.zeros((600, 1024)); al[WY0:WY1 + 1, WX0:WX1 + 1] = np.asarray(m).astype(float) / 255
inner = np.asarray(Image.fromarray((win * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 127
al *= inner
al = np.clip(al * 0.55, 0, 0.6)                                      # a glass sheen, never a white paint stroke
out = np.dstack([np.full((600, 1024, 3), 250.0), al * 255]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(f'{CUT}/capsule-glass-closed-1024x600.png')
print('door box', (X0, Y0, X1, Y1), 'window box', (WX0, WY0, WX1, WY1), 'max alpha', round(al.max(), 2), 'coverage', round((al > 0.05).mean() * 100, 2))
