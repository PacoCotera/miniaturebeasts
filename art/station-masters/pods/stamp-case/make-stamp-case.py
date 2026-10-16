# Fix 4 of the Station global fix plan: the stampCase look (the art director's hook, frame.json regions.stampSlot.look), cut by hand.
# The real stamp is placed as it is (never regenerated): its geometry, ink and plate stay. The look is how the label sits on the device:
#   UNLIT  the label is in the device's shade, never lit: the whole label (plate and ink) multiplied in linear light by K_OPEN = 0.20
#          on every screen without a case (Create, Incubator, one mibi up close); a 1 px EDGE hairline #3d434b all round; no fill of its own
#          beyond the stamp's plate, no glow, beam, frame or pane.
#   CASE   Pods only: the label in its dim case (788, 384, 152, 152): the back a recessed well in a moulded sage rim with rubber corners, the label at K_CASE = 0.75, and the
#          front glass = ground #1d232b at 48 % over all of it (pods.json stampCaseFront), so the case reads dim and unlit.
#   CODE   the code's line (776, 525, 176, 25): ink mist #8d8aa6 at 16 px, rule 1 px hairline #3d434b.
# Writes the two case slices and a 1x proof on each screen's golden with the luminance rule measured (station-layouts.md, The stamp label).
# usage: python3 -I make-stamp-case.py GOLDEN_DIR OUT_DIR   (GOLDEN_DIR holds create-shape.png, incubator-growing.png, pods.png, habitat.png)
import sys, os, json, numpy as np
from PIL import Image
gd, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
H = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
GROUND, HAIR, BEVEL, BAR, PANEL, DEEP = H('#1d232b'), H('#3d434b'), H('#565c63'), H('#23292f'), H('#2b3038'), H('#2a2a2d')
SAGE, SAGED = H('#84ae78'), H('#5d7a5f')
WARM = np.array([1.0, 0.93, 0.80])   # the shade is the device's warm daylight, not grey: the paper reads aged, in shadow
K_OPEN, K_CASE, GLASS = 0.20, 0.75, 0.48
lin = lambda c: np.where(c / 255 <= .04045, c / 255 / 12.92, ((c / 255 + .055) / 1.055) ** 2.4)
srgb = lambda l: np.clip(np.where(l <= .0031308, l * 12.92, 1.055 * np.clip(l, 0, None) ** (1 / 2.4) - .055) * 255, 0, 255)
lum = lambda c: lin(c) @ [.2126, .7152, .0722]
def label(golden_create):                       # the real stamp on its label, as the build draws it today (Create's slot, 804, 400)
    return np.asarray(Image.open(golden_create).convert('RGB')).astype(float)[400:520, 804:924]
def unlit(lab, k):
    l = srgb(lin(lab) * k * WARM); l[0, :] = l[-1, :] = l[:, 0] = l[:, -1] = HAIR; return l
def case_back():                                 # 152x152: the field case moulded into the sage housing, a dim recessed well, light from the top left
    a = np.zeros((152, 152, 3)) + SAGED
    a[0, :] = a[:, 0] = SAGE; a[1, 1:] = a[1:, 1] = SAGE * .5 + SAGED * .5            # the moulded rim's lit top-left
    a[-1, :] = a[:, -1] = BAR; a[-2, 1:-1] = a[1:-1, -2] = SAGED * .7 + BAR * .3          # its shade lower right
    a[6:146, 6:146] = PANEL                                                               # the well
    for i in range(3): a[6 + i, 6:146] = BAR * (1 - i * .3) + PANEL * (i * .3); a[6:146, 6 + i] = a[6 + i, 6]   # the rim's shadow inside, top and left
    a[145, 6:146] = a[6:146, 145] = HAIR                                                  # the lower-right inner lip catching the light
    for (y, x) in ((0, 0), (0, 146), (146, 0), (146, 146)):                               # dark rubber corner bumpers, as on the crates
        a[y:y + 6, x:x + 6] = DEEP
    return a
def front(a):                                    # the glass: ground at 48 %, nothing else (no sheen, no gloss)
    return a * (1 - GLASS) + GROUND * GLASS
lab = label(os.path.join(gd, 'create-shape.png'))
SCREENS = {  # name: golden, label rect (x, y), main object rect (x, y, w, h), case
    'pods':      ('pods.png', (804, 400), (184, 216, 144, 176), True),
    'create':    ('create-shape.png', (804, 400), (360, 240, 304, 312), False),
    'incubator': ('incubator-growing.png', (804, 256), (448, 264, 128, 160), False),
    'habitat':   ('habitat.png', (872, 64), (144, 80, 304, 312), False),
}
report = {}
back = case_back()
caseimg = back.copy(); caseimg[16:136, 16:136] = unlit(lab, K_CASE); caseimg = front(caseimg)
Image.fromarray(back.astype(np.uint8)).save(os.path.join(out, 'room-stamp-case-152x152.png'))
fr = np.zeros((152, 152, 4), np.uint8); fr[..., :3] = GROUND.astype(np.uint8); fr[..., 3] = round(GLASS * 255)
Image.fromarray(fr, 'RGBA').save(os.path.join(out, 'room-stamp-case-152x152-front.png'))
for name, (g, (lx, ly), (mx, my, mw, mh), case) in SCREENS.items():
    p = os.path.join(gd, g)
    if not os.path.exists(p): continue
    s = np.asarray(Image.open(p).convert('RGB')).astype(float).copy()
    if case: s[ly - 16:ly + 136, lx - 16:lx + 136] = caseimg; L = caseimg[16:136, 16:136]
    else: L = unlit(lab, K_OPEN); s[ly:ly + 120, lx:lx + 120] = L
    Image.fromarray(s.astype(np.uint8)).save(os.path.join(out, f'proof-{name}-1x.png'))
    ll, lm = lum(L), lum(s[my:my + mh, mx:mx + mw])
    inner = L[8:112, 8:112]; li = lum(inner)
    report[name] = {'label_mean': round(float(ll.mean()), 3), 'label_p95': round(float(np.percentile(ll, 95)), 3),
                    'main_mean': round(float(lm.mean()), 3), 'main_p95': round(float(np.percentile(lm, 95)), 3),
                    'label_srgb_mean': round(float(L.mean()), 1),
                    'cell_contrast': round(float((np.percentile(li, 95) + .05) / (np.percentile(li, 5) + .05)), 2)}
    report[name]['pass'] = report[name]['label_mean'] < report[name]['main_mean'] and report[name]['label_p95'] < report[name]['main_p95'] and report[name]['cell_contrast'] >= 4
json.dump(report, open(os.path.join(out, 'proof-luminance.json'), 'w'), indent=1); print(json.dumps(report, indent=1))
