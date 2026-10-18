# The hatch placement, proved in the room view: draw order cap -> bowl -> juvenile, all at the room's pod scale (pod-large
# at 160 tall, x0.909). The bowl is centred on the pod's x (512) with its foot on the moss line (415); the cap stands
# behind the bowl's left side, its bottom-right corner 12 px (pod-large units) inside the bowl's left edge, its foot on the
# moss line; the juvenile (146 tall) stands in front, feet at (532, 415).
import sys, numpy as np
from PIL import Image
sys.path.insert(0, sys.argv[3]); exec(open(sys.argv[4]).read().split('W = Image.new')[0])   # proof-opened.py's compose()
OPN, VIEWS, JUV = sys.argv[1], sys.argv[2], sys.argv[5]
D = OPN; K = 160 / 176
sc = lambda im: im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS)
bowl = sc(compose('bowl', '#465459', '#ae674d', 'dots')); cap = sc(compose('cap', '#465459', '#ae674d', 'dots'))
st = Image.new('RGBA', (1024, 600), (29, 35, 43, 255))
st.paste(Image.open(f'{VIEWS}/room/capsule-room-day-1024x522.png'), (0, 40))
put = lambda n: st.alpha_composite(Image.open(f'{VIEWS}/room/{n}-530x532.png'), (344, 26))
put('capsule-interior-day')
bx = 512 - bowl.width // 2; by = 415 - bowl.height + 4
cx = bx + round(12 * K) - cap.width; cy = 415 - cap.height + 4
st.alpha_composite(cap, (cx, cy)); st.alpha_composite(bowl, (bx, by))
j = Image.open(JUV).convert('RGBA'); j = j.crop(j.getbbox()); j = j.resize((round(j.width * 146 / j.height), 146), Image.LANCZOS)
jx = 532 - j.width // 2; st.alpha_composite(j, (jx, 415 - 146 + 3))
put('capsule-shell'); put('capsule-bar-lit'); put('capsule-door-open')
st.paste((35, 41, 47, 255), (0, 0, 1024, 40)); st.paste((35, 41, 47, 255), (0, 562, 1024, 600))
st.convert('RGB').save(f'{OPN}/proof-hatch-room.png')
print('bowl', bowl.size, 'at', (bx, by), '| cap', cap.size, 'at', (cx, cy), '| cap right edge', cx + cap.width, '| juvenile box x', jx, jx + j.width)
