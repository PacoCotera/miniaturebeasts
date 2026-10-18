# Cargo with a portrait crate in: four berths of 188, every crate a reduction of its signed 256 master to 176 (no painting).
# The fourth berth carries the sitting frame's gilt edge; the portrait crate is the signed sitting crate.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make-cargo-finish.py')).read().split('def bay_light')[0])
def red(im, w=176):
    h = round(im.height * w / im.width); return im.resize((w, h), Image.LANCZOS)
CR, SIT, SH = red(CRATE), red(master('pods/crate-sitting-256x176.png')), red(SHADOW)
LIFT = red(Image.open(RAW + 'crate-lifting-256x200.png').convert('RGBA'))
for n, im in [('crate-sealed', CR), ('crate-sitting', SIT), ('crate-lifting', LIFT), ('crate-shadow', SH)]:
    im.save(SCR + f'out/{n}-{im.width}x{im.height}.png')
B4 = [w2s(200 + i * 204, 252) + (188, 292) for i in range(4)]
def berth4(c, x, y, w, h, crate, lit=1.0, gilt=False, lift=False):
    berth(c, x, y, w, h)
    cy = y + h - crate.height - 14 - (8 if lift else 0); place(c, SH, (x + 6, y + h - 26))
    place(c, crate if lit == 1.0 else dim(crate, lit), (x + 6, cy))
    if gilt:
        d = ImageDraw.Draw(c); g = PAL['gold']
        d.rounded_rectangle((x - 3, y - 3, x + w + 2, y + h + 2), 9, outline=g, width=2)
        d.rounded_rectangle((x - 5, y - 5, x + w + 4, y + h + 4), 10, outline=(90, 64, 12))
c = bay_base(); soft_glow(c, 300, 20, 520, 200, (255, 226, 180), 0.10, 1.6)
berth4(c, *B4[0], LIFT, lift=True); berth4(c, *B4[1], CR); berth4(c, *B4[2], CR); berth4(c, *B4[3], SIT, gilt=True)
hatch(c, 'shut'); waiting(c, [])
still('cargo-portrait-in.png', c, 'Skip', None, (12, 30, 3))
print([ (n, i.size) for n, i in [('sealed', CR), ('sitting', SIT), ('lifting', LIFT), ('shadow', SH)]])
