# Cap masters and the final signed sheet for every button on the three devices.
import sys, os, json, hashlib
OUTDIR = sys.argv[1]
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drawings.py')).read()
ns = {'__name__': 'lib'}; exec(src, ns)
icon, cap = ns['icon'], ns['cap']
from PIL import Image, ImageDraw, ImageFont
BONE = '#f1ebdf'
# name, drawing, cap colour, fill: 'cut' (tone on tone) or 'bone' (paint-filled cut)
BUTTONS = [
 ('station-home','home','#dba53a','cut'), ('station-vivarium','viv-dome','#63a046','cut'),
 ('station-research','res-lens2','#2a9f90','cut'), ('station-library','library','#8460cd','cut'),
 ('back','back','#454950','bone'), ('confirm','confirm','#f0661a','cut'), ('pad','pad','#2e3136','bone'),  # its own 20 mm slot, below
 ('companion-call','call','#2a9f90','cut'),
 ('caddy-left','left','#33363b','bone'), ('caddy-ok','confirm','#33363b','bone'), ('caddy-right','right','#33363b','bone'),
 ('caddy-print','print','#33363b','bone'), ('caddy-feed','feed2','#33363b','bone'),
]
PXMM = 100; SLOT = 10 * PXMM
os.makedirs(os.path.join(OUTDIR, 'caps'), exist_ok=True)
manifest = []
for name, draw, col, fill in BUTTONS:
    if name == 'pad': continue
    m = icon(draw, 400)                          # 400*8 px mask on the 100-unit grid
    # one scale for every cap: the drawing grid's units 14..86 fill the 10 mm slot, so caps keep their relative sizes
    G = m.size[0]; a, b = round(G * 0.14), round(G * 0.86)
    if m.getbbox() and (m.getbbox()[0] < a or m.getbbox()[1] < a or m.getbbox()[2] > b or m.getbbox()[3] > b):
        raise SystemExit(f'{name}: drawing leaves the slot {m.getbbox()} vs {a}..{b}')
    slot = m.crop((a, a, b, b)).resize((SLOT, SLOT), Image.LANCZOS).point(lambda v: 255 if v >= 128 else 0).convert('1')
    p = os.path.join(OUTDIR, 'caps', f'cap-{name}-10mm.png'); slot.save(p, dpi=(PXMM * 25.4, PXMM * 25.4))
    manifest.append({'id': f'cap-{name}-10mm', 'file': f'caps/cap-{name}-10mm.png', 'slot_mm': [10, 10],
                     'px_per_mm': PXMM, 'cap_colour': col, 'engraving': ('paint-filled cut, ' + BONE) if fill == 'bone' else 'cut, tone on tone',
                     'drawing': draw, 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest(), 'status': 'signed'})
# The pad: a 26 mm rocker face; a 20 x 20 mm slot centred on it, master pixel (1000,1000) the pad's centre.
# Four solid arrows on the axes, each the Caddy's triangle (base 5.0 mm, depth 4.2 mm), tip 9.5 mm from the centre.
PAD = Image.new('1', (2000, 2000), 0); pd = ImageDraw.Draw(PAD)
for tri in ([(1000, 50), (750, 470), (1250, 470)], [(1000, 1950), (750, 1530), (1250, 1530)],
            [(50, 1000), (470, 750), (470, 1250)], [(1950, 1000), (1530, 750), (1530, 1250)]):
    pd.polygon(tri, fill=1)
p = os.path.join(OUTDIR, 'caps', 'cap-pad-20mm.png'); PAD.save(p, dpi=(PXMM * 25.4, PXMM * 25.4))
manifest.insert(6, {'id': 'cap-pad-20mm', 'file': 'caps/cap-pad-20mm.png', 'slot_mm': [20, 20], 'px_per_mm': PXMM,
                    'cap_colour': '#2e3136', 'engraving': 'paint-filled cut, ' + BONE, 'drawing': 'pad',
                    'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest(), 'status': 'signed'})
json.dump(manifest, open(os.path.join(OUTDIR, 'caps', 'manifest.json'), 'w'), indent=1)
# the final sheet
W, H = 1440, 900; sheet = Image.new('RGB', (W, H), (0xa9, 0x9f, 0x8a)); d = ImageDraw.Draw(sheet)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
d.text((40, 24), 'Every button on the three devices: final icons, signed.', fill=(30, 32, 36), font=f)
d.text((40, 56), 'Engraved into the cap, no text; the branding on top is the only text on a front face. Hand-drawn, not generated.', fill=(40, 42, 46), font=fs)
B = {n: (dr, c) for n, dr, c, _ in BUTTONS}
rows = [('Station', [('Pad', 'pad'), ('Home', 'station-home'), ('Vivarium', 'station-vivarium'), ('Research', 'station-research'), ('Library', 'station-library'), ('Back', 'back'), ('Confirm', 'confirm')]),
        ('Companion', [('Pad', 'pad'), ('Call', 'companion-call'), ('Back', 'back'), ('Confirm', 'confirm')]),
        ('Caddy', [('Left', 'caddy-left'), ('OK', 'caddy-ok'), ('Right', 'caddy-right'), ('Print', 'caddy-print'), ('Feed', 'caddy-feed')])]
y = 100
for dev, keys in rows:
    d.text((40, y + 45), dev, fill=(30, 32, 36), font=f); x = 200
    for lab, n in keys:
        dr, c = B[n]; sz = 140 if n == 'pad' else 112; k = cap(c, dr, sz)
        sheet.paste(k, (x, y + (112 - sz) // 2 + 4), k); d.text((x + sz // 2 - len(lab) * 4, y + 128), lab, fill=(40, 42, 46), font=fs); x += sz + 44
    y += 175
d.text((40, y + 5), 'Near real size', fill=(30, 32, 36), font=fs)
d.rounded_rectangle([40, y + 30, 1400, y + 120], radius=16, fill=(0xd6, 0xd3, 0xc2)); x = 60
for dev, keys in rows:
    for lab, n in keys:
        dr, c = B[n]; sz = 68 if n == 'pad' else 56; k = cap(c, dr, sz); sheet.paste(k, (x, y + 75 - sz // 2), k); x += sz + 6
    x += 40
d.text((40, y + 140), 'Signed, Station art director. Masters: one 10 x 10 mm slot per cap, one colour, in caps/ with manifest.json.', fill=(30, 32, 36), font=fs)
sheet.save(os.path.join(OUTDIR, 'device-buttons-final.png')); print('ok', len(manifest))
