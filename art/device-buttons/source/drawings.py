import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
SS=8  # supersample
def icon(name, size):
    """Engraving mask on a 100-unit grid, white = cut."""
    S=size*SS; u=S/100; m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m); w=int(5.5*u)
    P=lambda x,y:(x*u,y*u)
    if name=='home':   # home: a roof over a sprout, where the mibis live
        d.line([P(24,50),P(50,27),P(76,50)],fill=255,width=w,joint='curve')
        d.line([P(32,44),P(32,72),P(68,72),P(68,44)],fill=255,width=w,joint='curve')
        d.rounded_rectangle([P(44,56),P(56,72)],radius=5*u,fill=255)
    elif name=='vivarium':  # a leaf pair rising from a mound, a stone beside it
        d.arc([P(22,60),P(78,96)],185,355,fill=255,width=w)
        d.line([P(50,62),P(50,40)],fill=255,width=w)
        d.polygon([P(50,46),P(40,44),P(31,34),P(33,26),P(44,30),P(50,40)],fill=255)
        d.polygon([P(50,42),P(57,34),P(68,28),P(70,36),P(61,44),P(50,48)],fill=255)
        d.ellipse([P(64,61),P(73,68)],fill=255)
    elif name=='research':  # a pod with its tag: what Research opens
        egg=[]
        for t in range(0,360,6):
            a=math.radians(t); yv=math.sin(a)
            y=48+ (22*yv if yv>0 else 26*yv); x=44+(13.5+2.5*yv)*math.cos(a)
            egg.append(P(x,y))
        d.polygon(egg,outline=None,fill=255)
        for (cx,cy) in [(40,40),(48,46),(39,54),(48,60),(44,33)]:
            d.ellipse([P(cx-2.6,cy-2.6),P(cx+2.6,cy+2.6)],fill=0)
        d.line([P(59,58),P(65,61)],fill=255,width=int(3*u))
        tag=[P(64,58),P(78,63),P(74,77),P(60,72)]
        d.polygon(tag,fill=255)
        d.ellipse([P(66,62),P(70,66)],fill=0)
    elif name=='library':  # the field journal, open
        d.line([P(50,36),P(50,70)],fill=255,width=w)
        L=[P(50,36),P(40,32),P(26,34),P(26,68),P(40,66),P(50,70)]
        R=[P(50,36),P(60,32),P(74,34),P(74,68),P(60,66),P(50,70)]
        d.line(L,fill=255,width=w,joint='curve'); d.line(R,fill=255,width=w,joint='curve')
        d.line([P(32,44),P(44,43)],fill=255,width=int(3*u)); d.line([P(32,52),P(44,51)],fill=255,width=int(3*u))
        d.line([P(56,43),P(68,44)],fill=255,width=int(3*u))
    elif name=='viv-dome':   # a tended terrarium: an arched glass over a mound with a sprout
        d.arc([P(22,22),P(78,92)],180,360,fill=255,width=w)
        d.line([P(22,57),P(22,72)],fill=255,width=w); d.line([P(78,57),P(78,72)],fill=255,width=w)
        d.line([P(16,74),P(84,74)],fill=255,width=w)
        d.chord([P(28,58),P(72,86)],180,360,fill=255)
        d.line([P(50,60),P(50,46)],fill=255,width=int(4*u))
        d.polygon([P(50,52),P(42,49),P(39,42),P(46,43),P(50,48)],fill=255)
        d.polygon([P(50,49),P(55,42),P(62,40),P(60,47),P(51,52)],fill=255)
    elif name=='viv-mibi':   # a mibi at rest at home: round body, head forward, broad leaf crest
        d.ellipse([P(22,46),P(70,80)],fill=255)            # body
        d.ellipse([P(48,38),P(78,68)],fill=255)            # head
        d.ellipse([P(62,48),P(69,55)],fill=0)              # eye
        for (x0,y0) in [(29,76),(41,78),(57,78)]:
            d.ellipse([P(x0,y0),P(x0+8,y0+6)],fill=255)    # feet
        d.polygon([P(56,40),P(48,28),P(55,25),P(60,37)],fill=255)
        d.polygon([P(61,38),P(62,23),P(69,24),P(66,38)],fill=255)
        d.polygon([P(66,40),P(76,29),P(80,34),P(71,43)],fill=255)
    elif name=='viv-burrow': # a home in the hill: a burrow under a mound, a leaf on top
        d.arc([P(14,36),P(86,104)],180,360,fill=255,width=w)
        d.line([P(14,70),P(86,70)],fill=255,width=w)
        d.chord([P(38,52),P(62,88)],180,360,fill=255)
        d.line([P(50,37),P(50,26)],fill=255,width=int(4*u))
        d.polygon([P(50,30),P(58,22),P(64,24),P(58,31),P(51,34)],fill=255)
    elif name=='res-lens':   # a naturalist's lens over a leaf: reading
        d.polygon([P(30,62),P(40,46),P(54,40),P(56,52),P(44,62)],fill=255)
        d.ellipse([P(38,26),P(70,58)],outline=255,width=w)
        d.line([P(66,54),P(80,70)],fill=255,width=int(8*u))
    elif name=='res-stamp':  # the genome stamp: the code itself, in cells
        d.rounded_rectangle([P(24,24),P(76,76)],radius=5*u,outline=255,width=w)
        for (cx,cy) in [(0,0),(2,0),(1,1),(3,1),(0,2),(2,2),(3,2),(1,3),(3,3)]:
            x0=31+cx*10; y0=31+cy*10
            d.rectangle([P(x0,y0),P(x0+7,y0+7)],fill=255)
    elif name=='res-pair':   # two pods compared, one patterned, a bracket joining them
        for cx,dots in ((36,False),(64,True)):
            egg=[]
            for t in range(0,360,6):
                a=math.radians(t); yv=math.sin(a)
                egg.append(P(cx+(9+1.5*yv)*math.cos(a),54+(14*yv if yv>0 else 17*yv)))
            d.polygon(egg,fill=255)
            if dots:
                for (dx,dy) in [(-3,-6),(3,0),(-3,6)]: d.ellipse([P(cx+dx-2,54+dy-2),P(cx+dx+2,54+dy+2)],fill=0)
        d.line([P(36,30),P(36,24),P(64,24),P(64,30)],fill=255,width=int(4*u))
    elif name=='res-lens2':   # a naturalist's lens: clean ring, a leaf seen through it, a handle
        d.ellipse([P(26,20),P(66,60)],outline=255,width=int(6.5*u))
        d.polygon([P(39,47),P(39,38),P(46,31),P(54,30),P(54,38),P(47,45)],fill=255)
        d.line([P(36,50),P(41,45)],fill=255,width=int(3*u))
        d.line([P(62,56),P(80,76)],fill=255,width=int(10*u))
    elif name=='res-scope':   # a field microscope in profile: base, curved arm, angled tube, stage
        d.rounded_rectangle([P(26,74),P(70,82)],radius=2*u,fill=255)            # base
        d.arc([P(40,26),P(76,80)],270,90,fill=255,width=int(6*u))                # curved arm
        d.line([P(58,78),P(58,74)],fill=255,width=int(6*u))
        d.polygon([P(30,30),P(38,24),P(58,46),P(50,52)],fill=255)                # tube, angled
        d.rounded_rectangle([P(26,22),P(38,30)],radius=1.5*u,fill=255)           # eyepiece
        d.line([P(36,60),P(64,60)],fill=255,width=int(5*u))                       # stage
        d.ellipse([P(44,64),P(52,72)],outline=255,width=int(3*u))                # mirror
    elif name=='feed2':   # the roll, a thin strip of paper running out and down
        d.ellipse([P(20,18),P(50,48)],outline=255,width=w)
        d.ellipse([P(32,30),P(38,36)],fill=255)
        pts=[P(50,33)]
        for i in range(1,31):
            t=i/30; x=50+8*math.sin(t*math.pi); y=33+t*36
            pts.append(P(x,y))
        d.line(pts,fill=255,width=int(3.5*u),joint='curve')
        d.polygon([P(43,66),P(57,66),P(50,78)],fill=255)
    elif name=='call':   # calling the partner: a dot sending two arcs
        d.ellipse([P(28,44),P(40,56)],fill=255)
        d.arc([P(30,34),P(56,66)],-55,55,fill=255,width=w)
        d.arc([P(30,22),P(70,78)],-55,55,fill=255,width=w)
    elif name=='left':
        d.polygon([P(32,50),P(62,32),P(62,68)],fill=255)
    elif name=='right':
        d.polygon([P(68,50),P(38,32),P(38,68)],fill=255)
    elif name=='print':  # the printed card under the slot, its lower edge torn in teeth
        d.line([P(22,28),P(78,28)],fill=255,width=w)
        pts=[P(34,34),P(66,34),P(66,68)]
        x=66
        while x>34:
            pts+= [P(x-4,74),P(x-8,68)]; x-=8
        pts+=[P(34,34)]
        d.line(pts,fill=255,width=int(4*u),joint='curve')
        d.ellipse([P(44,42),P(56,54)],fill=255)
    elif name=='feed':   # the roll, a band of paper curling out and down
        d.ellipse([P(20,18),P(48,46)],outline=255,width=w)
        d.ellipse([P(31,29),P(37,35)],fill=255)
        L=[];R=[]
        for i in range(0,41):
            t=i/40; x=48+16*math.sin(t*math.pi*1.1); y=30+t*42
            L.append(P(x-4,y)); R.append(P(x+5,y))
        d.polygon(L+R[::-1],fill=255)
        d.polygon([P(48,72),P(68,72),P(58,84)],fill=255)
    elif name=='pad':
        for poly in ([P(50,14),P(41,27),P(59,27)],[P(50,86),P(41,73),P(59,73)],[P(14,50),P(27,41),P(27,59)],[P(86,50),P(73,41),P(73,59)]):
            d.polygon(poly,fill=255)
    elif name=='back':
        d.line([P(30,50),P(70,50)],fill=255,width=int(8*u)); d.line([P(46,34),P(30,50),P(46,66)],fill=255,width=int(8*u),joint='curve')
    elif name=='confirm':
        d.line([P(30,52),P(44,66),P(72,36)],fill=255,width=int(8*u),joint='curve')
    return m

def hexrgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def shade(c,f): return tuple(max(0,min(255,int(v*f))) for v in c)
def cap(colour, name, size):
    S=size*SS; base=hexrgb(colour)
    img=Image.new('RGBA',(S,S),(0,0,0,0))
    # matte cap: soft dome lit from top left
    cmask=Image.new('L',(S,S),0); ImageDraw.Draw(cmask).ellipse([S*0.04,S*0.04,S*0.96,S*0.96],fill=255)
    grad=Image.new('RGB',(S,S))
    gp=grad.load()
    for y in range(0,S,2):
        for x in range(0,S,2):
            dx=(x-S*0.38)/S; dy=(y-S*0.36)/S; r=math.hypot(dx,dy)
            f=1.10-0.55*r
            c=shade(base,f); gp[x,y]=c
            if x+1<S: gp[x+1,y]=c
            if y+1<S: gp[x,y+1]=c; 
            if x+1<S and y+1<S: gp[x+1,y+1]=c
    # matte grain
    noise=Image.effect_noise((S,S),18).convert('L')
    grad=Image.composite(grad,Image.blend(grad,Image.merge('RGB',[noise]*3),0.06),Image.new('L',(S,S),200))
    img.paste(grad,(0,0),cmask)
    # rim: dark outer ring (rubber-moulded edge)
    ImageDraw.Draw(img).ellipse([S*0.04,S*0.04,S*0.96,S*0.96],outline=shade(base,0.55)+(255,),width=int(S*0.025))
    # engraving: recess darker, shadow on the upper-left inner wall, light catching the lower-right wall
    m=icon(name,size); o=max(1,int(S*0.012))
    dark=sum(base)/3<90
    recess=Image.new('RGBA',(S,S),((214,206,186,255) if dark else shade(base,0.62)+(255,)))
    img.paste(recess,(0,0),m)
    wall_hi=ImageChops.subtract(m,ImageChops.offset(m,-o,-o))   # lower-right edge of the cut
    wall_sh=ImageChops.subtract(m,ImageChops.offset(m,o,o))     # upper-left edge of the cut
    img.paste(Image.new('RGBA',(S,S),(shade((214,206,186),0.7) if dark else shade(base,0.40))+(255,)),(0,0),wall_sh)
    img.paste(Image.new('RGBA',(S,S),(shade((214,206,186),1.1) if dark else shade(base,1.22))+(255,)),(0,0),wall_hi)
    return img.resize((size,size),Image.LANCZOS)


