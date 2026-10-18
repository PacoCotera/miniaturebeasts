import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os; S=os.path.dirname(os.path.abspath(__file__))+'/'; L=S+'../T-20261016-200/layers/'   # base.png and crest.png: the anchor base key and crest overlay from masters-pods floor/S01
base=Image.open(S+'base.png').convert('RGBA'); crest=Image.open(S+'crest.png').convert('RGBA')
fur=np.asarray(Image.open(L+'mibi-adult-S01-anchor-fur-mask-304x312.png').convert('L')).astype(float)/255
def comp(layer):
    im=base.copy(); im.alpha_composite(layer); im.alpha_composite(crest); return im
stripes=Image.open(L+'mibi-adult-S01-anchor-stripes-304x312.png').convert('RGBA')
patches=Image.open(L+'mibi-adult-S01-anchor-patches-304x312.png').convert('RGBA')
# the patch colour and its shading, from the signed patch layer
pa=np.asarray(patches).astype(float); m=pa[...,3]>200; col=pa[m][:,:3].mean(0)
b=np.asarray(base).astype(float); lum=(b[...,:3]@[.3,.59,.11]); ref=lum[(fur>.5)].mean()
def blobs(shapes):
    mk=Image.new('L',(304,312),0); d=ImageDraw.Draw(mk)
    for e in shapes: d.ellipse(e,fill=255)
    mk=mk.filter(ImageFilter.GaussianBlur(1.2)); a=np.asarray(mk).astype(float)/255*fur
    shade=np.clip(0.75+0.5*(lum-ref)/255*2,0.55,1.1)[...,None]
    rgb=np.clip(col*shade,0,255); out=np.dstack([rgb,a*255]).astype(np.uint8); return Image.fromarray(out,'RGBA')
# proposal: two large rounded patches, apart: a saddle on the shoulder-back, one on the haunch
prop=blobs([(118,128,178,176),(196,150,246,206)])
ims=[comp(stripes),comp(patches),comp(prop)]
bb=base.getbbox(); h=bb[3]-bb[1]; k=54/h
out=Image.new('RGB',(3*80,80),(80,96,60)); big=Image.new('RGB',(3*320,320),(80,96,60))
for i,im in enumerate(ims):
    s=im.crop(bb).resize((round((bb[2]-bb[0])*k),54),Image.LANCZOS)
    t=Image.new('RGBA',(80,80),(80,96,60,255)); t.alpha_composite(s,((80-s.width)//2,80-s.height-6)); out.paste(t.convert('RGB'),(i*80,0))
big=out.resize((out.width*4,out.height*4),Image.NEAREST); big.save(S+'marks-test-54-4x.png'); out.save(S+'marks-test-54-1x.png')

print(col.round(), k)
