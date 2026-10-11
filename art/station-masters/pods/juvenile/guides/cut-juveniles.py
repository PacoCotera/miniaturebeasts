import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
S, src, s, out = sys.argv[1:5]
def adult_box(s):
    a=np.asarray(Image.open(S+f'mainsrc/adult-{s}-304x312.png'))[...,3]>0; ys=np.where(a.any(1))[0]; xs=np.where(a.any(0))[0]
    return xs.max()-xs.min()+1, ys.max()-ys.min()+1
a=np.asarray(Image.open(src).convert('RGB')).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
bdr=np.vstack([a[:8].reshape(-1,3),a[-8:].reshape(-1,3),a[:,:8].reshape(-1,3),a[:,-8:].reshape(-1,3)]); bg=np.median(bdr,0)
mag=(np.abs(a-bg).sum(-1)<70)                                    # the ground: this picture's own magenta
mx=a.max(-1); mn=a.min(-1)
# the painted shadow: a darker magenta than the ground (red and blue alike, green under both), or a neutral grey
cand=(~mag)&(((np.abs(r-b)<55)&(g<0.75*np.minimum(r,b))&(mx<bg.max()-15))|((mx-mn<22)&(mx<165)&(s == "S03")))   # a grey shadow only on S03 (S06 and S13 are grey themselves)
lab,n=nd.label(cand); sz=nd.sum(cand,lab,range(1,n+1)); cand=np.isin(lab,1+np.where(sz>300)[0])
body0=~(mag|cand); lab,n=nd.label(body0); sz=nd.sum(body0,lab,range(1,n+1)); body=np.isin(lab,1+np.where(sz>2000)[0])
body=nd.binary_fill_holes(body)&~nd.binary_dilation(mag,iterations=1)&~cand
ys=np.where(body.any(1))[0]; foot=ys.max(); top=ys.min()
sh=cand&(np.arange(a.shape[0])[:,None]>top+0.55*(foot-top))           # the shadow lies under the figure: its lower part only
body=nd.binary_erosion(body,iterations=1)
# magenta specks: body pixels with a magenta cast (the ground's fringe) are removed on the edge, repainted from neighbours inside
cast=body&((g<0.75*np.minimum(r,b))&(np.abs(r-b)<70)&(np.minimum(r,b)>110))
edge=body&~nd.binary_erosion(body,iterations=2)
body=body&~(cast&edge)
inner=cast&~edge
if inner.any():
    for c in range(3):
        ch=a[...,c].copy(); ch[inner]=np.nan; filled=nd.generic_filter(ch,np.nanmedian,size=5)
        a[...,c]=np.where(inner,filled,a[...,c])
a=np.nan_to_num(a)
alpha=np.where(body,255,np.where(sh,110,0)).astype(np.uint8)
rgb=np.where(body[...,None],a,np.where(sh[...,None],np.array([30,26,34]),0)).astype(np.uint8)
im=Image.fromarray(np.dstack([rgb,alpha]),'RGBA'); im=im.crop(im.getbbox())
aw,ah=adult_box(s)
for (W,H) in [(304,312),(104,112),(96,88),(48,48)]:
    sc=min(44/im.height,44/im.width) if W==48 else min(0.66*ah*(H/312)/im.height, 0.9*W/im.width)
    p=im.resize((max(1,round(im.width*sc)),max(1,round(im.height*sc))),Image.LANCZOS)
    pa=np.asarray(p).copy()
    if W==48: pa[...,3]=np.where(pa[...,3]>=128,np.where(pa[...,3]>200,255,110),0)
    else: pa[...,3]=np.where(pa[...,3]>=200,255,np.where(pa[...,3]>=60,np.where(pa[...,3]>=150,pa[...,3],np.minimum(pa[...,3],110)),0))
    p=Image.fromarray(pa)
    c=Image.new('RGBA',(W,H),(0,0,0,0)); c.alpha_composite(p,((W-p.width)//2, H-p.height-(6 if H>100 else 2))); c.save(f'{out}/mibi-juvenile-{s}-{W}x{H}.png')
print(s,'shadow px',int(sh.sum()),'cast removed',int((cast&edge).sum()),'repainted',int(inner.sum()))
