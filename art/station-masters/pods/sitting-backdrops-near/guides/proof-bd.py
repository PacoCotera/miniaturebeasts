"""Sitting backdrops, near treatment: the 1x proofs (studio brief 2026-10-23 22:00, proofs 8-10). 0 MXN.
Rows, top to bottom: meadow, pond-a (cut from its raw, not in slices/), pond-b (slices/), rock, wood, cave.
beside-near-1x.png  near-Vivarium day | the repaint with the adult anchor in Dot's look | the same with the zones of checks 11 (figure, x 192-352 y 164-324) and 13 (tag rows, x 160-384 y 348-380) outlined
                    Dot's look = station-gate prototypes/ui/assets/stands S01-adult-304x312 base-charcoal-and-ash + patches + stripes + crest (the built anchor layers), fitted with LANCZOS
                    once to the Habitat factor (figure 136x149), its last solid row on glass y 324, figure axis on x 272
feet-x3.png         x 160-384, y 270-372 of each, with the mibi, x3 nearest
cards-pair-1x.png   each repaint beside its 96 card, on #1d232b
usage (from art/station-masters/pods): python3 -I sitting-backdrops-near/guides/proof-bd.py /home/user/sg"""
import sys, numpy as np
from PIL import Image, ImageDraw
SG = sys.argv[1] + '/prototypes/ui/assets/stands/S01-adult-304x312-'
def rgba(p): return Image.open(p).convert('RGBA')
dot = rgba(SG + 'base-charcoal-and-ash.png')
for part in ('patches', 'stripes', 'crest'): dot.alpha_composite(rgba(SG + part + '.png'))
box = dot.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
sc = 149 / (box[3] - box[1]); fw, fh = round(dot.width * sc), round(dot.height * sc)
mibi = dot.resize((fw, fh), Image.LANCZOS)
mb = mibi.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
at = (round(272 - (mb[0] + mb[2]) / 2), 324 - (mb[3] - 1))
def cut_raw(job):
    im = Image.open(f'source/raw/{job}.jpg').convert('RGB'); w, h = im.size; x0 = (w - 1195) // 2
    return im.crop((x0, 0, x0 + 1195, 896)).resize((544, 408), Image.LANCZOS)
S = lambda p: Image.open(f'sitting-backdrops-near/slices/sitting-backdrop-{p}-544x408.png').convert('RGB')
ROWS = [('meadow', S('meadow')), ('pond', cut_raw('sitting-backdrop-pond-near-a')), ('pond', S('pond')), ('rock', S('rock')), ('wood', S('wood')), ('cave', S('cave'))]
near = Image.open('slices/vivarium-near-day-544x408.png').convert('RGB'); G = 8
def with_mibi(bd):
    c = bd.convert('RGBA'); c.alpha_composite(mibi, at); return c.convert('RGB')
A = Image.new('RGB', (3 * 544 + 4 * G, len(ROWS) * (408 + G) + G), '#D6CEBE')
F = Image.new('RGB', (224 * 3 + 2 * G, len(ROWS) * (102 * 3 + G) + G), '#D6CEBE')
C = Image.new('RGB', (544 + 96 + 3 * G, len(ROWS) * (408 + G) + G), '#1d232b')
for i, (pl, bd) in enumerate(ROWS):
    y = G + i * (408 + G); m = with_mibi(bd); z = m.copy(); d = ImageDraw.Draw(z)
    d.rectangle((192, 164, 351, 323), outline='#00e5ff'); d.rectangle((160, 348, 383, 380), outline='#ffe600'); d.line((0, 324, 543, 324), fill='#ff3b3b')
    for j, im in enumerate((near, m, z)): A.paste(im, (G + j * (544 + G), y))
    F.paste(m.crop((160, 270, 384, 372)).resize((224 * 3, 102 * 3), Image.NEAREST), (G, G + i * (102 * 3 + G)))
    C.paste(bd, (G, y)); C.paste(Image.open(f'slices/place-{pl}-96x96.png').convert('RGB'), (2 * G + 544, y))
A.save('sitting-backdrops-near/proof/beside-near-1x.png'); F.save('sitting-backdrops-near/proof/feet-x3.png'); C.save('sitting-backdrops-near/proof/cards-pair-1x.png')
print('mibi', (fw, fh), 'figure', (mb[2] - mb[0], mb[3] - mb[1]), 'at', at)
