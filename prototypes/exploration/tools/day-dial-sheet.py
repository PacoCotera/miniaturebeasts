import sys
from PIL import Image
d, size = sys.argv[1], sys.argv[2]
names = ["1-dawn", "2-morning", "3-midday", "4-afternoon", "5-dusk", "6-night"]
ims = [Image.open(f"{d}/{size}-{n}-bar.png") for n in names]
w, h = ims[0].size
# crop the right third (the clock) and stack the six
cw = w // 2
out = Image.new("RGB", (cw, h * 6))
for i, im in enumerate(ims):
    out.paste(im.crop((w - cw, 0, w, h)), (0, i * h))
out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
out.save(f"{d}/{size}-sheet.png")
