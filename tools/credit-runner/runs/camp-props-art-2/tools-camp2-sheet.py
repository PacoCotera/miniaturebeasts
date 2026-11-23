import sys
from PIL import Image
D = sys.argv[1]
GRASS = (92, 187, 76, 255)
SAND = (230, 201, 140, 255)
names = ['camp-a-unlit', 'camp-b-lit', 'camp-c-lit']
K = 5
FW, FH = 77, 28
sheet = Image.new('RGBA', (FW * K * 2 + 30, FH * K * 2 + 30), GRASS)
for i, n in enumerate(names):
    im = Image.open('%s/frames/%s.png' % (D, n)).convert('RGBA')
    big = im.resize((im.width * K, im.height * K), Image.NEAREST)
    sheet.alpha_composite(big, (10 + (i % 2) * (FW * K + 10), 10 + (i // 2) * (FH * K + 10)))
bed = Image.open(D + '/frames/bedroll.png').convert('RGBA')
big = bed.resize((bed.width * K, bed.height * K), Image.NEAREST)
sd = Image.new('RGBA', (FW * K, FH * K), SAND)
sd.alpha_composite(big, (20, 0))
sheet.alpha_composite(sd, (10 + (FW * K + 10), 10 + (FH * K + 10)))
sheet.save(D + '/sheet.png')
