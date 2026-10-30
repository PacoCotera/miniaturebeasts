from PIL import Image, ImageDraw, ImageFont
import os
P='art/station-masters/pods/'; import sys; O=(sys.argv[1] if len(sys.argv) > 1 else 'out') + '/'  # output folder
F=lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
NEW={'A':'Wickle','B':'Drapet','C':'Stiltuft','D':'Hooplet','E':'Curlop'}
def ex(s,sz): return Image.open(f'{P}adult/mibi-adult-S{s:02d}-{sz}.png').convert('RGBA')
def nw(k,sz): return Image.open(f'{P}fluffy/cut/fluffy-{k}-{sz}.png').convert('RGBA')
# concepts
raws=[['A1','A2','A3'],['B1','B2','B3'],['C1','C2','C3'],['x1','x2','x3']]
desc={'A1':'plume + amber tip (PICK)','A2':'neck ruff + tuft','A3':'drooping plume + bead','B1':'face + brow tassels (PICK)','B2':'tiny feet, short skirt','B3':'back ridge, face hidden',
 'C1':'tripod, 4 legs seen','C2':'tripod, long tendrils (PICK)','C3':'low shaggy, long feet','x1':'rejected: squirrel','x2':'rejected: squirrel','x3':'rejected: squirrel'}
S=360; W=Image.new('RGB',(3*S+40,4*(S+30)+60),(30,33,40)); d=ImageDraw.Draw(W)
d.text((20,14),'Fluffy species: concept variants (3 shapes x 3 variants; bottom row = first try of C, thrown out, all squirrel)',font=F(15),fill=(230,230,230))
for r,row in enumerate(raws):
    for c,n in enumerate(row):
        f=f'{P}fluffy/raw/{"rejected/fl-C"+n[1] if n[0]=="x" else "fl-"+n}.jpg'
        W.paste(Image.open(f).convert('RGB').resize((S,S),Image.LANCZOS),(20+c*(S),50+r*(S+30)))
        d.text((24+c*S,54+r*(S+30)+S+2) if False else (24+c*S,50+r*(S+30)+S+4),f'{n}  {desc[n]}',font=F(14),fill=(230,230,230))
W.save(O+'concepts.png')
# stands 1x
cells=[('Loika S01',ex(1,'304x312')),('Azkon S07',ex(7,'304x312'))]+[(f'{k} {NEW[k]}',nw(k,'304x312')) for k in 'ABE']
W=Image.new('RGB',(5*320+20,312+50),(214,206,190)); d=ImageDraw.Draw(W)
for i,(n,im) in enumerate(cells):
    W.paste(im,(20+i*320,10),im); d.text((30+i*320,330),n+('  (existing)' if i<2 else '  (new)'),font=F(14),fill=(40,36,30))
W.save(O+'stands-1x.png')
# wall
BG=(28,33,40)
ids=[1,2,3,4,5,6,8,9]  # 8 existing (S01 Loika,S02,S03,S04,S05,S06,S08,S09)
items=[('S%02d'%s,'e',s) for s in ids]; order=[]
new=[(k,'n',k) for k in 'ABE']
# interleave: new species spread among existing
seq=[items[0],new[0],items[1],items[2],new[1],items[3],items[4],new[2],items[5],items[6],items[7]]
cw,ch=112,128
Wd=Image.new('RGB',(len(seq)*cw+24,2*ch+75),BG); d=ImageDraw.Draw(Wd)
d.text((12,8),'96 px wall size (top)  and  48 px small (bottom); new species marked *',font=F(14),fill=(200,205,212))
for i,(n,t,k) in enumerate(seq):
    x=12+i*cw
    a=(ex(k,'96x88') if t=='e' else nw(k,'96x88')); b=(ex(k,'48x48') if t=='e' else nw(k,'48x48'))
    Wd.paste(a,(x+8,40+(ch-88)//2),a)
    Wd.paste(b,(x+32,40+ch+10),b)
    d.text((x+8,40+ch*2-10),('*'+NEW[k]) if t=='n' else n,font=F(12),fill=(240,200,120) if t=='n' else (150,156,166))
# 2x zoom row for judging legibility
Wd.save(O+'wall-96.png')
for k in 'ABCDE':
    nw(k,'304x312').save(O+f'stand-{k}-{NEW[k].lower()}-304x312.png'); nw(k,'96x88').save(O+f'stand-{k}-{NEW[k].lower()}-96x88.png'); nw(k,'48x48').save(O+f'stand-{k}-{NEW[k].lower()}-48x48.png')

S=500; W=Image.new('RGB',(3*S,S+70),(30,33,40)); d=ImageDraw.Draw(W)
d.text((16,10),'Third species with hands: three variants (E1 is the pick, cut as the stand)',font=F(15),fill=(230,230,230))
for c,(f,t) in enumerate([('fl-E1','E1 hands together at the chest (PICK)'),('fl-E2','E2 hands held out in front'),('fl-E3','E3 hands on the belly')]):
    W.paste(Image.open(f'{P}fluffy/raw/{f}.jpg').convert('RGB').resize((S-10,S-10),Image.LANCZOS),(c*S+5,40)); d.text((c*S+10,40+S-4),t,font=F(14),fill=(230,230,230))
W.save(O+'concepts-c3.png')
