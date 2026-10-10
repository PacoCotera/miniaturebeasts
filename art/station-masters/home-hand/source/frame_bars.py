# The Station frame's two bars, hand-set in the Station palette (flat chrome: one fill, one lit edge, one rule).
import sys, os
from PIL import Image
C = dict(bar=(0x23, 0x29, 0x2f), hairline=(0x3d, 0x43, 0x4b), bevel=(0x56, 0x5c, 0x63), void=(0x0c, 0x0a, 0x12))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
# Top bar 1024×40: row 0 the lit edge (bevel), rows 1–38 the bar, row 39 the rule the stage hangs from (hairline).
top = Image.new('RGB', (1024, 40), C['bar'])
for x in range(1024): top.putpixel((x, 0), C['bevel']); top.putpixel((x, 39), C['hairline'])
top.save(os.path.join(OUT, 'frame-top-bar-1024x40.png'))
# Bottom line 1024×38: row 0 the rule under the stage (hairline), row 1 the lit edge (bevel), rows 2–37 the bar.
bot = Image.new('RGB', (1024, 38), C['bar'])
for x in range(1024): bot.putpixel((x, 0), C['hairline']); bot.putpixel((x, 1), C['bevel'])
bot.save(os.path.join(OUT, 'frame-bottom-line-1024x38.png'))
print('ok')
